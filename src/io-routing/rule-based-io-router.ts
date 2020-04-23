/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { IoActor, IoNode, IoSource, Uuid } from "..";
import { IoContext } from "../model/io-context";
import { IoRouter } from "./io-router";

/**
 * Supports rule-based routing of data from IO sources to IO actors based on an
 * associated IO context.
 *
 * Define rules that determine whether a given pair if IO source and IO actor
 * should be associated or not. A rule is only applied if the value type of IO
 * source and IO actor are compatible. If no rules are defined or no rule
 * matches no associations between IO sources and IO actors are established.
 *
 * You can define global rules that match IO sources and actors of any
 * compatible value type or value-type specific rules that are only applied to
 * IO sources and IO actors with a given value type.
 *
 * By default, an IO source and an IO actor are compatible if both define equal
 * value types in equal data formats. You can define your own custom
 * compatibility check on value types in a subclass by overriding the
 * `areValueTypesCompatible` method.
 *
 * Note that this router makes its IO context available by advertising and for
 * discovery (by core type, object type, or object Id) and listens for
 * Update-Complete events on its IO context, triggering `onIoContextChanged`
 * automatically.
 *
 * This router requires the following controller options:
 * - `ioContext`: the IO context for which this router is managing routes
 *   (mandatory)
 * - `rules`: an array of rule definitions for this router. The rules listed
 *   here override any rules defined in the `onInit` method.
 */
export class RuleBasedIoRouter extends IoRouter {

    // An array of current association items
    private _currentAssociations: Array<[IoSource, IoActor, number]>;

    // Defined rules hashed by value type
    private _rules: Map<string, IoAssociationRule[]>;

    onInit() {
        super.onInit();
        this._currentAssociations = [];
        this._rules = new Map<string, IoAssociationRule[]>();
    }

    /**
     * Invoked when the IO context of this router has changed.
     * 
     * Triggers reevaluation of all defined rules.
     */
    onIoContextChanged() {
        super.onIoContextChanged();
        this._evaluateRules();
    }

    /**
     * Define all association rules for routing.
     *
     * Note that any previously defined rules are discarded.
     *
     * Rules with undefined condition function are ignored.
     *
     * @param rules association rules for this IO router
     */
    defineRules(...rules: IoAssociationRule[]) {
        this._rules.clear();

        rules.forEach(rule => {
            if (!rule.condition) {
                console.log(`RuleBasedIoRouter: undefined condition in rule ${rule.name}`);
                return;
            }

            const valueType = rule.valueType || "";
            let vRules = this._rules.get(valueType);
            if (!vRules) {
                vRules = [];
                this._rules.set(valueType, vRules);
            }
            vRules.push(rule);
        });

        this._evaluateRules();
    }

    protected onStarted() {
        const rules = this.options.rules as IoAssociationRule[];
        if (rules) {
            this.defineRules(...rules);
        }

        super.onStarted();
    }

    protected onStopped() {
        // Disassociate all associations
        this._currentAssociations.forEach(([source, actor]) =>
            this.disassociate(source, actor));

        this._currentAssociations = [];

        super.onStopped();
    }

    /**
     * The default function used to compute the recommended update rate of an
     * individual IO source - IO actor association.
     *
     * This function takes into account the maximum possible update rate of the
     * source and the desired update rate of the actor and returns a value that
     * satisfies both rates.
     *
     * Override this method in a subclass to implement a custom rate function.
     *
     * @param source the IoSource object
     * @param actor the IoActor object
     * @param sourceNode the IO source's node
     * @param sourceNode the IO actor's node
     */
    protected computeDefaultUpdateRate(
        source: IoSource,
        actor: IoActor,
        sourceNode: IoNode,
        actorNode: IoNode): number {
        if (source.updateRate === undefined) {
            return actor.updateRate;
        }
        if (actor.updateRate === undefined) {
            return source.updateRate;
        }
        return Math.max(source.updateRate, actor.updateRate);
    }

    protected onIoNodeManaged(node: IoNode) {
        this._evaluateRules();
    }

    protected onIoNodesUnmanaged(nodes: IoNode[]) {
        this._evaluateRules();
    }

    private _evaluateRules() {
        this._act(this._resolve(this._match(this._getCompatibleAssociations())));
    }

    private _getCompatibleAssociations(): IoCompatibleAssociations {
        const compatibleAssociations: IoCompatibleAssociations = [];
        const sources = new Map<Uuid, [IoSource, IoNode]>();
        const actors = new Map<Uuid, [IoActor, IoNode]>();

        this.managedIoNodes.forEach(node => {
            node.ioSources.forEach(src => {
                sources.set(src.objectId, [src, node]);
            });
            node.ioActors.forEach(actor => {
                actors.set(actor.objectId, [actor, node]);
            });
        });

        sources.forEach(([source, sourceNode]) => {
            actors.forEach(([actor, actorNode]) => {
                if (this.areValueTypesCompatible(source, actor)) {
                    compatibleAssociations.push([source, sourceNode, actor, actorNode]);
                }
            });
        });

        return compatibleAssociations;
    }

    private _match(compatibleAssociations: IoCompatibleAssociations): IoAssociationPairs {
        const associationMap: IoAssociationPairs = new Map();

        compatibleAssociations.forEach(([source, sourceNode, actor, actorNode]) => {
            let valueType = source.valueType;
            let rules = this._rules.get(valueType);
            if (!rules) {
                // Apply global rules
                valueType = "";
                rules = this._rules.get(valueType);
            }
            if (rules) {
                const len = rules.length;
                for (let i = 0; i < len; i++) {
                    const rule = rules[i];
                    let isMatch = false;

                    try {
                        isMatch = rule.condition(source, sourceNode, actor, actorNode, this.ioContext, this);
                    } catch (error) {
                        console.log(`RuleBasedIoRouter: failed invoking condition of rule '${rule.name}': ${error}`);
                    }

                    if (isMatch) {
                        let actors = associationMap.get(source.objectId);
                        if (!actors) {
                            actors = new Map<Uuid, IoAssociationInfo>();
                            associationMap.set(source.objectId, actors);
                        }
                        actors.set(
                            actor.objectId,
                            [
                                source,
                                actor,
                                this._computeCumulatedUpdateRate(source.updateRate, actor.updateRate),
                            ]);

                        // No need to check remaining rules after the first match
                        break;
                    }
                }
            }
        });

        return associationMap;
    }

    private _resolve(associationMap: IoAssociationPairs): IoAssociationPairs {
        // Compute cumulated update rates for each resolved IO source.
        associationMap.forEach(actors => {
            let cumulatedRate: number;
            actors.forEach(([, , rate]) => {
                cumulatedRate = this._computeCumulatedUpdateRate(rate, cumulatedRate);
            });
            actors.forEach(info => {
                info[2] = cumulatedRate;
            });
        });

        return associationMap;
    }

    private _act(resolvedPairs: IoAssociationPairs) {
        const newAssociations: IoAssociationInfo[] = [];

        this._currentAssociations.forEach(([source, actor, rate]) => {
            const resolvedActors = resolvedPairs.get(source.objectId);
            if (!resolvedActors) {
                this.disassociate(source, actor);
            } else {
                const resolvedInfo = resolvedActors.get(actor.objectId);
                if (!resolvedInfo) {
                    this.disassociate(source, actor);
                } else {
                    const [resolvedSrc, resolvedAct, resolvedRate] = resolvedInfo;
                    if (resolvedRate !== rate) {
                        // Keep the current association but with the new update rate
                        this.associate(resolvedSrc, resolvedAct, resolvedRate);
                    }
                    newAssociations.push([resolvedSrc, resolvedAct, resolvedRate]);

                    // Remove the resolved pair so that remaining
                    // pairs can be identified as being new associations.
                    resolvedActors.delete(actor.objectId);
                    if (resolvedActors.size === 0) {
                        resolvedPairs.delete(source.objectId);
                    }
                }
            }
        });

        // Add the remaining resolved pairs as new associations
        resolvedPairs.forEach(newActors => {
            newActors.forEach(([src, act, rate]) => {
                this.associate(src, act, rate);
                newAssociations.push([src, act, rate]);
            });
        });

        this._currentAssociations = newAssociations;
    }

    private _computeCumulatedUpdateRate(rate1, rate2): number {
        if (rate1 !== undefined) {
            if (rate2 !== undefined) {
                return Math.max(rate2, rate1);
            } else {
                return rate1;
            }
        }
        return rate2;
    }

}

/**
 * Condition function type for IO routing rules.
 */
export type IoRoutingRuleConditionFunc = (
    source: IoSource,
    sourceNode: IoNode,
    actor: IoActor,
    actorNode: IoNode,
    context: IoContext,
    router: RuleBasedIoRouter) => boolean;

/**
 * Defines a rule for associating IO sources with IO actors.
 */
export interface IoAssociationRule {

    /**
     * The name of the rule. Used for display purposes only.
     */
    name: string;

    /**
     * The value type for which the rule is applicable. The rule is applied to
     * all IO source - IO actor pairs whose value type matches this value type.
     *
     * If the value type is undefined or an empty string, the rule acts as a
     * global rule. It applies to all IO source - IO actor pairs that have
     * compatible value types. Non-global rules have precedence over global
     * rules. Global rules only apply if there are no non-global rules whose
     * value type matches the value type of the corresponding IO source - IO
     * actor pair.
     */
    valueType: string;

    /**
     * The rule condition function.
     * 
     * When applied, the condition function is passed a pair of value-compatible
     * IO source and actor that are eligible for association.
     *
     * The condition function should return true if the passed-in association
     * pair should be associated; false or undefined otherwise.
     * 
     * Eventually, an association pair is associated if there is at least one
     * applicable rule that returns true; otherwise the association pair
     * is not associated, i.e. it is actively disassociated if currently
     * associated.
     */
    condition: IoRoutingRuleConditionFunc;
}

/**
 * Maps value types to an array of compatible IO source - IO source node - IO
 * actor - IO actor node pairs.
 */
type IoCompatibleAssociations = Array<[IoSource, IoNode, IoActor, IoNode]>;

/**
 * A tuple describing an association pair with its update rate
 */
type IoAssociationInfo = [IoSource, IoActor, number];

/**
 * Maps source IDs to a map of actor IDs with IoAssociationInfo tuples
 */
type IoAssociationPairs = Map<Uuid, Map<Uuid, IoAssociationInfo>>;

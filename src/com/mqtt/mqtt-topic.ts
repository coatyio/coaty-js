/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CommunicationEventType, Uuid } from "../..";

/**
 * Represents MQTT publication and subscription topics for Coaty communication
 * events (except Raw and external IoValue).
 */
export class MqttTopic {

    get eventType() {
        return this._eventType;
    }

    get eventTypeFilter() {
        return this._eventTypeFilter;
    }

    get sourceId() {
        return this._sourceId;
    }

    get correlationId() {
        return this._correlationId;
    }

    get version() {
        return this._version;
    }

    get namespace() {
        return this._namespace;
    }

    private static readonly PROTOCOL_NAME = "coaty";
    private static readonly PROTOCOL_NAME_PREFIX = MqttTopic.PROTOCOL_NAME + "/";
    private static readonly EVENT_TYPE_FILTER_SEPARATOR = ":";
    private static readonly ILLEGAL_TOPIC_CHARS_REGEX = new RegExp(/[\u0000+#]/);

    private static EVENT_TYPE_TOPIC_LEVELS: { [level: string]: CommunicationEventType };
    private static TOPIC_LEVELS_BY_EVENT_TYPE: string[];

    private _version: number;
    private _namespace: string;
    private _eventType: CommunicationEventType;
    private _eventTypeFilter: string;
    private _sourceId: Uuid;
    private _correlationId: Uuid;

    private constructor() {
        /* tslint:disable:empty-block */
        /* tslint:enable:empty-block */
    }

    /**
     * Create a new topic instance from the given publication topic name.
     *
     * @param topicName the structured name of a Coaty publication topic
     * @returns a Coaty communication topic instance or undefined if the topic
     * name represents a Raw or external IO value event.
     */
    static createByName(topicName: string): MqttTopic {
        if (!MqttTopic.isCoatyTopicLike(topicName)) {
            return undefined;
        }

        const topic = new MqttTopic();
        const [, version, namespace, event, sourceId, corrId] = topicName.split("/");
        const v = parseInt(version, 10);
        const [eventType, eventTypeFilter] = this._parseEvent(event);

        topic._version = v;
        topic._namespace = namespace;
        topic._eventType = eventType;
        topic._eventTypeFilter = eventTypeFilter;
        topic._sourceId = sourceId;
        topic._correlationId = corrId === "" ? undefined : corrId;

        return topic;
    }

    /**
     * Gets the topic name for the given topic levels.
     *
     * @param version the protocol version
     * @param namepace the messaging namespace
     * @param eventType an event type
     * @param eventTypeFilter a filter for an event type, or undefined
     * @param sourceId ID from which this event originates
     * @param correlationId correlation ID for two-way message or undefined
     */
    static getTopicName(
        version: number,
        namespace: string,
        eventType: CommunicationEventType,
        eventTypeFilter: string,
        sourceId: Uuid,
        correlationId: Uuid,
    ): string {
        let eventLevel = MqttTopic._getEventTopicLevelPrefix(eventType);
        if (eventTypeFilter) {
            eventLevel += MqttTopic.EVENT_TYPE_FILTER_SEPARATOR + eventTypeFilter;
        }
        let topic = `${MqttTopic.PROTOCOL_NAME}/${version}/${namespace}/${eventLevel}/${sourceId}`;
        if (!MqttTopic._isOneWayEvent(eventType)) {
            topic += `/${correlationId}`;
        }
        return topic;
    }

    /**
     * Gets a topic filter for subscription.
     *
     * @param version the protocol version
     * @param namepace the messaging namespace or undefined
     * @param eventType the event type
     * @param eventTypeFilter the event filter or undefined
     * @param correlationId correlation ID for response message, or undefined
     * for request message
     */
    static getTopicFilter(
        version: number,
        namespace: string,
        eventType: CommunicationEventType,
        eventTypeFilter: string,
        correlationId: Uuid): string {
        let eventLevel = MqttTopic._getEventTopicLevelPrefix(eventType);
        if (eventTypeFilter) {
            eventLevel += MqttTopic.EVENT_TYPE_FILTER_SEPARATOR + eventTypeFilter;
        }
        let levels = `${this.PROTOCOL_NAME}/${version}/${namespace || "+"}/${eventLevel}/+`;
        if (!this._isOneWayEvent(eventType)) {
            levels += correlationId ? `/${correlationId}` : "/+";
        }

        return levels;
    }

    /**
     * Determines whether the given topic name starts with the same topic level
     * as a Coaty topic.
     *
     * @param topicName a topic name
     * @returns true if the given topic name is a potential Coaty topic; false
     * otherwise
     */
    static isCoatyTopicLike(topicName: string) {
        return topicName.startsWith(this.PROTOCOL_NAME_PREFIX);
    }

    /**
     * Determines whether the given name is a valid MQTT topic for publication
     * or subscription. 
     *
     * @param topicName a topic name
     * @param forSubscription indicates whether the name is used for
     * subscription (true) or publication (false)
     * @returns true if the given topic name can be used for publication or
     * subscription; false otherwise
     */
    static isValidTopic(topic: string, forSubscription = false): boolean {
        if (!topic) {
            return false;
        }
        if (topic.length * 4 > 65535 && this._getUtf8BytesCount(topic) > 65535) {
            return false;
        }
        if (forSubscription) {
            return topic.indexOf("\u0000") === -1;
        }
        return !MqttTopic.ILLEGAL_TOPIC_CHARS_REGEX.test(topic);
    }

    /**
     * Determines whether the given MQTT topic matches the given MQTT topic filter.
     *
     * @remarks Matching assumes that both topic and filter are valid according
     * to the MQTT 3.1.1 specification. Otherwise, the result is not defined.
     *
     * @param topic a valid MQTT topic name
     * @param filter a valid MQTT topic filter
     * @returns true if topic matches filter; otherwise false
     */
    static matches(topic: string, filter: string) {
        if (!topic || !filter) {
            return false;
        }

        const SEPARATOR = "/";
        const SINGLE_WILDCARD = "+";
        const MULTI_WILDCARD = "#";

        const patternLevels = filter.split(SEPARATOR);
        const topicLevels = topic.split(SEPARATOR);

        const patternLength = patternLevels.length;
        const topicLength = topicLevels.length;
        const lastIndex = patternLength - 1;

        for (let i = 0; i <= lastIndex; i++) {
            const currentPatternLevel = patternLevels[i];
            const currentLevel = topicLevels[i];

            if (!currentLevel && !currentPatternLevel) {
                continue;
            }

            if (!currentLevel && currentPatternLevel === SINGLE_WILDCARD) {
                continue;
            }

            if (!currentLevel && currentPatternLevel !== MULTI_WILDCARD) {
                return false;
            }

            if (currentPatternLevel === MULTI_WILDCARD) {
                return i === lastIndex;
            }

            if (currentPatternLevel !== SINGLE_WILDCARD && currentPatternLevel !== currentLevel) {
                return false;
            }
        }

        return patternLength === topicLength;
    }

    private static _isOneWayEvent(eventType: CommunicationEventType) {
        return eventType > CommunicationEventType.OneWay && eventType < CommunicationEventType.TwoWay;
    }

    private static _parseEvent(event: string): [CommunicationEventType, string] {
        const index = event.indexOf(this.EVENT_TYPE_FILTER_SEPARATOR);
        const type = index === -1 ? event : event.substring(0, index);
        const filter = index === -1 ? undefined : event.substring(index + 1);
        return [this._getEventType(type), filter];
    }

    private static _getUtf8BytesCount(str: string) {
        // Returns the UTF-8 byte length of a JavaScript UTF-16 string.
        // (see https://tools.ietf.org/html/rfc3629#section-3)
        let count = 0;
        const strLen = str.length;
        for (let i = 0; i < strLen; i++) {
            const code = str.charCodeAt(i);
            if (code <= 0x7f) {
                count++;
            } else if (code <= 0x7ff) {
                count += 2;
            } else if (code >= 0xd800 && code <= 0xdbff) {
                // high surrogate code unit
                count += 4;
            } else {
                count += 3;
            }
        }
        return count;
    }

    private static _initTopicLevels() {
        if (this.EVENT_TYPE_TOPIC_LEVELS === undefined) {
            this.EVENT_TYPE_TOPIC_LEVELS = {
                ADV: CommunicationEventType.Advertise,
                DAD: CommunicationEventType.Deadvertise,
                CHN: CommunicationEventType.Channel,
                ASC: CommunicationEventType.Associate,
                IOV: CommunicationEventType.IoValue,

                DSC: CommunicationEventType.Discover,
                RSV: CommunicationEventType.Resolve,
                QRY: CommunicationEventType.Query,
                RTV: CommunicationEventType.Retrieve,
                UPD: CommunicationEventType.Update,
                CPL: CommunicationEventType.Complete,
                CLL: CommunicationEventType.Call,
                RTN: CommunicationEventType.Return,
            };
        }
        if (this.TOPIC_LEVELS_BY_EVENT_TYPE === undefined) {
            this.TOPIC_LEVELS_BY_EVENT_TYPE = [];
            Object.keys(this.EVENT_TYPE_TOPIC_LEVELS).findIndex(key => {
                const eventType = this.EVENT_TYPE_TOPIC_LEVELS[key];
                this.TOPIC_LEVELS_BY_EVENT_TYPE[eventType] = key;
            });
        }
    }

    private static _getEventType(topicLevel: string) {
        this._initTopicLevels();
        return this.EVENT_TYPE_TOPIC_LEVELS[topicLevel];
    }

    private static _getEventTopicLevelPrefix(eventType: CommunicationEventType) {
        this._initTopicLevels();
        return this.TOPIC_LEVELS_BY_EVENT_TYPE[eventType];
    }

}

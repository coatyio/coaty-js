/*! Copyright (c) 2020 Siemens AG. Licensed under the MIT License. */

import { Client, connect, IClientOptions, ISubscriptionMap } from "mqtt";

import {
    CommunicationBinding,
    CommunicationBindingJoinOptions,
    CommunicationBindingLogLevel,
    CommunicationBindingOptions,
    CommunicationBindingWithOptions,
    CommunicationEventLike,
    CommunicationEventType,
    CommunicationState,
} from "../..";

import { MqttTopic } from "./mqtt-topic";

/**
 * Options provided by the MQTT communication binding.
 */
export interface MqttBindingOptions extends CommunicationBindingOptions {

    /**
     * Connection Url to MQTT broker (schema `protocol://host:port`, e.g.
     * `mqtt://localhost:1883`).
     *
     * Supported protocols include `mqtt`, `mqtts`, `tcp`, `tls`, `ws`, `wss`,
     * `wx`, `wxs` (WeChat Mini), `ali`, `alis` (Ali Mini).
     *
     * @remarks You can also specify `mqtt` or `mqtts` if the Coaty agent runs
     * in a browser: the binding will automatically open a (secure) websocket
     * connection.
     */
    brokerUrl: string;

    /**
     * Keep alive interval in seconds (optional).
     * 
     * Defaults to 60 seconds, set to 0 to disable.
     */
    keepalive?: number;

    /**
     * Interval in milliseconds between two reconnection attempts (optional).
     *
     * Defaults to 1000 ms. Disable auto reconnect by setting to 0.
     */
    reconnectPeriod?: number;

    /**
     * Time in milliseconds to wait for a connection acknowledgement message
     * from the broker (optional).
     *
     * Defaults to 30000 ms. If no CONNACK is received within the given time,
     * the connection is aborted.
     */
    connectTimeout?: number;

    /**
     * The username required by your MQTT broker (optional).
     */
    username?: string;

    /**
     * The password required by your MQTT broker (optional).
     */
    password?: string;

    /**
     * Connection options for mqtts - MQTT over TLS (optional).
     *
     * Default is {}. Options are passed through to
     * [`tls.connect()`](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options).
     *
     * @remarks If you run your MQTT connection over WebSockets, use the
     * `wsOptions` instead.
     */
    tlsOptions?: {
        /**
         * Private keys in PEM format (optional).
         */
        key?: string | string[] | Buffer | Buffer[] | Array<{ pem: string | Buffer; passphrase?: string; }>;

        /**
         * Cert chains in PEM format (optional).
         */
        cert?: string | string[] | Buffer | Buffer[];

        /**
         * Optionally override the trusted CA certificates in PEM format (optional).
         */
        ca?: string | string[] | Buffer | Buffer[];

        /**
         * PFX or PKCS12 encoded private key and certificate chain. pfx is an
         * alternative to providing `key` and `cert` individually. PFX is
         * usually encrypted, if it is, `passphrase` will be used to decrypt it.
         */
        pfx?: string | string[] | Buffer | Buffer[] | Array<{ buf: string | Buffer; passphrase?: string; }>;

        /**
         * Shared passphrase used for a single private key and/or a PFX.
         */
        passphrase?: string;

        /**
         * If not false, the server certificate is verified against the list of
         * supplied CAs (optional). Defaults to true.
         *
         * @remarks If you are using a self-signed certificate, additionally
         * pass the `rejectUnauthorized: false` option. Beware that you are
         * exposing yourself to man in the middle attacks, so it is a
         * configuration that should never be used for production environments.
         */
        rejectUnauthorized?: boolean;

        /**  
         * Any other option supported by
         * [`tls.connect()`](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options).
         */
        [option: string]: any;
    };

    /** 
     * WebSocket specific connection options (optional).
     * 
     * Default is {}. Only used for WebSocket connections.
     *
     * For possible options have a look at:
     * https://github.com/websockets/ws/blob/master/doc/ws.md.
     */
    wsOptions?: object;

    /**
     * For WebSocket ws/wss protocols only (optional). Can be used to implement
     * signing urls or authentication options which upon reconnect can have
     * become expired.
     *
     * For details, see
     * [here](https://github.com/mqttjs/MQTT.js#refresh-authentication-options--signed-urls-with-transformwsurl-websocket-only).
     */
    transformWsUrl?: (url: string, options: any, client: any) => string;
}

/**
 * Defines a communication binding for transmitting Coaty communication events
 * via the MQTT publish-subscribe messaging protocol.
 *
 * This binding is compatible with any MQTT broker that supports the MQTT v3.1.1
 * or v5.0 protocols. The binding itself connects to a broker using the MQTT
 * v3.1.1 protocol.
 *
 * This binding provides the following MQTT-specific publication options for Raw
 * events:
 * - retain: false | true (defaults to false)
 *
 * If specified, these options overwrite the default values supplied by the
 * binding.
 */
export class MqttBinding extends CommunicationBinding<MqttBindingOptions> {

    private _joinOptions: CommunicationBindingJoinOptions;
    private _pendingPublicationItems: PublicationItem[];
    private _issuedSubscriptionItems: SubscriptionItem[];
    private _isPublishingDeferred: boolean;
    private _client: Client;
    private _clientIdLogItem: string;
    private _qos: 0 | 1 | 2;

    /**
     * Provides the MQTT binding with application-specific options as value of the
     * `CommunicationOptions.binding` property in the agent container configuration.
     *
     * To be used as follows:
     *
     * ```ts
     * import { MqttBinding } from "@coaty/binding.mqtt";
     *
     * const configuration: Configuration = {
     *   ...
     *   communication: {
     *       binding: MqttBinding.withOptions({
     *           namespace: ...,
     *           brokerUrl: ... ,
     *           ...
     *       }),
     *       ...
     *   },
     *   ...
     * };
     * ```
     *
     * @param options options available for MQTT binding
     */
    static withOptions(options: MqttBindingOptions): CommunicationBindingWithOptions<MqttBinding, MqttBindingOptions> {
        return { type: MqttBinding, options };
    }

    /* Communication Binding Protocol */

    get apiName(): string {
        return "MQTT";
    }

    get apiVersion() {
        return 3;
    }

    createIoRoute(ioSourceId: string) {
        return MqttTopic.getTopicName(
            this.apiVersion,
            this.options.namespace,
            CommunicationEventType.IoValue,
            undefined,
            ioSourceId,
            undefined,
        );
    }

    /* Communication Binding Protocol Handlers */

    protected onInit() {
        this._reset();
    }

    protected onJoin(joinOptions: CommunicationBindingJoinOptions) {
        this._joinOptions = joinOptions;

        // Set up MQTT Client

        // Provide connection info and options for MQTT.js client.
        const mqttClientOpts: IClientOptions = { ...this.options, ...this.options.tlsOptions };
        delete (mqttClientOpts as any).namespace;
        delete (mqttClientOpts as any).shouldEnableCrossNamespacing;
        delete (mqttClientOpts as any).logLevel;
        delete (mqttClientOpts as any).brokerUrl;
        delete (mqttClientOpts as any).tlsOptions;
        delete mqttClientOpts.properties;
        delete mqttClientOpts.reschedulePings;
        delete mqttClientOpts.incomingStore;
        delete mqttClientOpts.outgoingStore;
        delete (mqttClientOpts as any).customHandleAcks;
        delete (mqttClientOpts as any).authPacket;

        // Always use QoS level 0 for publications, subscriptions, and last will
        // as delivery of Coaty communication events should not rely on a higher
        // QoS level. That's why we also connect with a clean session.  
        this._qos = 0;

        mqttClientOpts.will = this._getLastWill();

        const clientId = this._brokerClientId;
        mqttClientOpts.clientId = clientId;
        this._clientIdLogItem = `[${clientId}] `;

        // Do not support clean/persistent sessions in broker as this interferes with
        // deferred subscription and publication management on the client side. Always
        // connect with the same clientId and set 'clean' to true (MQTT.js default is true)
        // to get a clean new broker session on each (re)-connection.
        //
        // MQTT CleanSession behavior: When a connecting client provides a CLEAN=true|1 flag
        // for the MQTT session, the client’s MQTT session and any related information
        // (subscription sets and undelivered messages) are not persisted after the client
        // disconnects. That is, the flag ensures that the session “cleans up” after itself
        // and no information is stored on the event broker after the client disconnects. If
        // the client provides a CLEAN=false|0 flag, the MQTT session is persisted on the
        // event broker, which means that the client’s client ID, topic subscriptions, QoS
        // levels, and undelivered messages are all maintained (that is, they are not
        // cleaned up). The client may then reconnect to the persisted session later.
        mqttClientOpts.clean = true;

        // Do not support automatic resubscription/republication of topics on reconnection
        // by MQTT.js v2 because communication manager provides its own implementation.
        //
        // If connection is broken, do not queue outgoing QoS zero messages as we provide our
        // own implementation of deferred publications.
        mqttClientOpts.queueQoSZero = false;

        // If connection is broken and reconnects, subscribed topics are not automatically
        // subscribed again, because this is handled by separate binding logic.
        mqttClientOpts.resubscribe = false;

        // Connect to broker with MQTT v3.1.1 protocol.
        mqttClientOpts.protocolId = "MQTT";
        mqttClientOpts.protocolVersion = 4;

        this._client = connect(this.options.brokerUrl, mqttClientOpts);

        this.log(CommunicationBindingLogLevel.info, "Client connecting to ", this.options.brokerUrl);

        // Called on successful (re)connection.
        this._client.on("connect", (connack) => {
            this.log(CommunicationBindingLogLevel.info, "Client connected");
            this.emit("communicationState", CommunicationState.Online);

            // Ensure all issued subscription items are (re)subscribed.
            this._subscribeItems(this._issuedSubscriptionItems);

            // Ensure join events are published first on (re)connection in the given order.
            const joinEvents = this._joinOptions.joinEvents;
            for (let i = joinEvents.length - 1; i >= 0; i--) {
                this._addPublicationItem(joinEvents[i], undefined, true, true);
            }

            // Start emitting all deferred offline publications.
            this._drainPublications();
        });

        // Called when a reconnect starts.
        this._client.on("reconnect", () => {
            this.log(CommunicationBindingLogLevel.info, "Client reconnecting...");
        });

        // Called after a disconnection requested by calling client.end().
        this._client.on("close", () => {
            this.log(CommunicationBindingLogLevel.info, "Client disconnected");
            this.emit("communicationState", CommunicationState.Offline);
        });

        // Emitted when the client goes offline, i.e. when the connection to the server
        // is closed (for whatever reason) and before the client reconnects.
        this._client.on("offline", () => {
            this.log(CommunicationBindingLogLevel.info, "Client offline");
            this.emit("communicationState", CommunicationState.Offline);
        });

        // Emitted when the client cannot connect (i.e. connack rc != 0) or when a
        // parsing error occurs.
        this._client.on("error", (error) => {
            this.log(CommunicationBindingLogLevel.info, "Client error on connect: ", error);
            this.emit("communicationState", CommunicationState.Offline);
        });

        // Emitted when the client receives a publish packet.
        this._client.on("message", (topic, payload, packet) => {
            this._dispatchMessage(topic, payload);
        });
    }

    protected onUnjoin() {
        if (!this._client) {
            // In Initialized state dispose allocated resources.
            this._reset();
            return Promise.resolve();
        }

        // In Joined state, wait for unjoin event to be published before disconnecting
        // MQTT client. No need to explicitely unsubscribe issued subscriptions as a
        // clean session is used anyway and communication manager triggers
        // unsubscriptions whenever it is stopped.
        return new Promise<void>(resolve => {
            this._addPublicationItem(
                this._joinOptions.unjoinEvent,
                publishFailed => {
                    // If unjoin event could not be published sucessfully, end client forcibly so
                    // that the broker delivers the unjoin event as last will.
                    this._client.end(publishFailed, () => {
                        // Clean up all event listeners on disposed MQTT client instance.
                        this._client.removeAllListeners();
                        this._reset();
                        resolve();
                    });
                },
            );
            this._drainPublications();
        });
    }

    protected onPublish(eventLike: CommunicationEventLike) {
        // Check whether raw topic is in a valid format; otherwise ignore it.
        if (eventLike.eventType === CommunicationEventType.Raw &&
            (MqttTopic.isCoatyTopicLike(eventLike.eventTypeFilter) ||
                !MqttTopic.isValidTopic(eventLike.eventTypeFilter, false))) {
            this.log(CommunicationBindingLogLevel.error, "Raw publication topic is invalid: ", eventLike.eventTypeFilter);
            return;
        }

        this._addPublicationItem(eventLike);
        this._drainPublications();
    }

    protected onSubscribe(eventLike: CommunicationEventLike) {
        // Check whether raw topic is in a valid format; otherwise ignore it.
        if (eventLike.eventType === CommunicationEventType.Raw &&
            (MqttTopic.isCoatyTopicLike(eventLike.eventTypeFilter) ||
                !MqttTopic.isValidTopic(eventLike.eventTypeFilter, true))) {
            this.log(CommunicationBindingLogLevel.error, "Raw subscription topic is invalid: ", eventLike.eventTypeFilter);
            return;
        }

        // Check whether IO route is in a valid format; otherwise ignore it. Since the
        // IO route topic name is used both for publication and subscription it must
        // must not contain any wildcard tokens.
        if (eventLike.eventType === CommunicationEventType.IoValue &&
            ((eventLike.isExternalIoRoute && MqttTopic.isCoatyTopicLike(eventLike.eventTypeFilter)) ||
                !MqttTopic.isValidTopic(eventLike.eventTypeFilter, false))) {
            this.log(CommunicationBindingLogLevel.error, "IO route topic is invalid: ", eventLike.eventTypeFilter);
            return;
        }

        this._addSubscriptionItem(eventLike);
    }

    protected onUnsubscribe(eventLike: CommunicationEventLike) {
        this._removeSubscriptionItem(eventLike);
    }

    protected log(logLevel: CommunicationBindingLogLevel, arg1: string, arg2?: any, arg3?: any, arg4?: any) {
        super.log(logLevel, this._clientIdLogItem, arg1, arg2, arg3, arg4);
    }

    /* Private */

    private _reset() {
        this._client = undefined;
        this._clientIdLogItem = "[---]";
        this._joinOptions = undefined;
        this._isPublishingDeferred = true;
        this._pendingPublicationItems = [];
        this._issuedSubscriptionItems = [];
        this.emit("communicationState", CommunicationState.Offline);
    }

    private _getTopicFor(eventLike: CommunicationEventLike) {
        if (eventLike.eventType === CommunicationEventType.Raw) {
            return eventLike.eventTypeFilter;
        }
        if (eventLike.eventType === CommunicationEventType.IoValue) {
            return eventLike.eventTypeFilter;
        }
        return MqttTopic.getTopicName(
            this.apiVersion,
            this.options.namespace,
            eventLike.eventType,
            eventLike.eventTypeFilter,
            eventLike.sourceId,
            eventLike.correlationId,
        );
    }

    private _getTopicFilterFor(eventLike: CommunicationEventLike) {
        if (eventLike.eventType === CommunicationEventType.Raw) {
            return eventLike.eventTypeFilter;
        }
        if (eventLike.eventType === CommunicationEventType.IoValue) {
            return eventLike.eventTypeFilter;
        }
        return MqttTopic.getTopicFilter(
            this.apiVersion,
            this.options.shouldEnableCrossNamespacing ? undefined : this.options.namespace,
            eventLike.eventType,
            eventLike.eventTypeFilter,
            eventLike.correlationId,
        );
    }

    private _getLastWill() {
        try {
            const unjoinEventLike = this._joinOptions.unjoinEvent;
            return {
                topic: this._getTopicFor(unjoinEventLike),
                payload: this._encodePayload(unjoinEventLike),
                qos: this._qos,
                retain: false,
            };
        } catch (error) {
            this.log(CommunicationBindingLogLevel.error, "Last will message cannot be composed: ", error);
            return undefined;
        }
    }

    /** Assign own client id because the MQTT.JS default value
     * is based on a weak random calculation:
     * 'mqttjs_' + Math.random().toString(16).substr(2, 8)
     *
     * MQTT Spec 3.1:
     * The Server MUST allow ClientIds which are between 1 and 23 UTF-8 encoded
     * bytes in length, and that contain only the characters
     * "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".
     * The Server MAY allow ClientId’s that contain more than 23 encoded bytes.
     * The Server MAY allow ClientId’s that contain characters not included in the list given above.
     */
    private get _brokerClientId() {
        const id = this._joinOptions.agentId;
        return `Coaty${id.replace(/-/g, "").substr(0, 18)}`;
    }

    /* Inbound MQTT Message Dispatch */

    private _dispatchMessage(topicName: string, payload: any) {
        try {
            const topic = MqttTopic.createByName(topicName);

            if (topic === undefined || topic.eventType === CommunicationEventType.IoValue) {

                // For Raw and IoValue events find matching subscriptions and dispatch event likes
                // for them. Take into account that Raw and external IoValue events can use the same
                // subscription topic.
                this._issuedSubscriptionItems.forEach(item => {
                    if ((item.eventType === CommunicationEventType.Raw && MqttTopic.matches(topicName, item.topicFilter)) ||
                        (item.eventType === CommunicationEventType.IoValue && topicName === item.topicFilter)) {
                        this.log(CommunicationBindingLogLevel.debug,
                            "Inbound message as ",
                            CommunicationEventType[item.eventType],
                            " on ",
                            topicName);
                        this.emit("inboundEvent", {
                            eventType: item.eventType,
                            eventTypeFilter: topicName,
                            sourceId: topic?.sourceId,
                            correlationId: item.topicFilter,
                            data: item.shouldDecodeData ? this._decodePayload(payload) : payload,
                        });
                    }
                });

                return;
            }

            // For Coaty events except IoValue events dispatch an event like directly.
            this.log(CommunicationBindingLogLevel.debug, "Inbound message on ", topicName);
            this.emit("inboundEvent", {
                eventType: topic.eventType,
                eventTypeFilter: topic.eventTypeFilter,
                sourceId: topic.sourceId,
                correlationId: topic.correlationId,
                data: this._decodePayload(payload),
            });
        } catch (error) {
            this.log(CommunicationBindingLogLevel.error, "Inbound message error on topic ", topicName, ": ", error);
        }
    }

    /* Encoding and Decoding */

    /**
     * Encodes the given event data.
     * 
     * @param eventData a raw value or JSON object to be encoded 
     * @returns encoded data in raw or JSON-UTF8 string format
     * @throws if event data cannot be encoded
     */
    private _encodePayload(eventLike: CommunicationEventLike) {
        if (eventLike.isDataRaw) {
            return eventLike.data;
        }
        return JSON.stringify(eventLike.data);
    }

    private _decodePayload(payload: any) {
        return JSON.parse(payload.toString());
    }

    /* Publication Management */

    private _addPublicationItem(
        eventLike: CommunicationEventLike,
        callback?: (publishFailed: boolean) => void,
        shouldAddFirst = false,
        once = false) {
        // If a publication item cannot be composed, discard it immediately and signal an
        // error.
        try {
            const topic = this._getTopicFor(eventLike);
            const payload = this._encodePayload(eventLike);
            const options = eventLike.options;

            if (once && this._pendingPublicationItems.some(i => i.topic === topic)) {
                callback && callback(true);
                return;
            }
            if (shouldAddFirst) {
                this._pendingPublicationItems.unshift({ topic, payload, options, callback });
            } else {
                this._pendingPublicationItems.push({ topic, payload, options, callback });
            }
        } catch (error) {
            this.log(CommunicationBindingLogLevel.error, "Publication message cannot be composed: ", error);
            callback && callback(true);
        }
    }

    private _drainPublications() {
        if (!this._isPublishingDeferred) {
            return;
        }
        this._isPublishingDeferred = false;
        this._doDrainPublications();
    }

    private _doDrainPublications() {
        // In Joined state, try to publish each pending publication draining them in the
        // order they were queued.
        if (!this._client || this._pendingPublicationItems.length === 0) {
            this._isPublishingDeferred = true;
            return;
        }

        const { topic, payload, options, callback } = this._pendingPublicationItems[0];

        this._client.publish(topic, payload, { qos: this._qos, retain: options?.retain || false }, err => {
            if (err) {
                // If client is disconnected or disconnecting, stop draining, but keep this
                // publication and all other pending ones queued for next reconnect.
                this._isPublishingDeferred = true;

                // Notify publishers of all remaining pending items.
                this._pendingPublicationItems.forEach(item => item.callback && item.callback(true));
            } else {
                this.log(CommunicationBindingLogLevel.debug, "Published on ", topic);
                this._pendingPublicationItems.shift();
                callback && callback(false);
                this._doDrainPublications();
            }
        });
    }

    /* Subscription Management */

    private _addSubscriptionItem(eventLike: CommunicationEventLike) {
        const topicFilter = this._getTopicFilterFor(eventLike);
        const item: SubscriptionItem = {
            eventType: eventLike.eventType,
            topicFilter,
            shouldDecodeData: !eventLike.isDataRaw,
        };

        // For Raw and external IoValue events we need to store separate subscriptions
        // for the same (maybe pattern-based) topic filter as they can be unsubscribed
        // individually. Note however, that an MQTT broker only maintains the latest
        // subscription.
        const index = this._issuedSubscriptionItems.findIndex(i =>
            i.eventType === eventLike.eventType && i.topicFilter === topicFilter);

        if (index === -1) {
            this._issuedSubscriptionItems.push(item);
        } else {
            this._issuedSubscriptionItems[index] = item;
        }

        this._subscribeItems(item);
    }

    private _removeSubscriptionItem(eventLike: CommunicationEventLike) {
        const topicFilter = this._getTopicFilterFor(eventLike);
        const index = this._issuedSubscriptionItems.findIndex(i =>
            i.eventType === eventLike.eventType && i.topicFilter === topicFilter);

        if (index === -1) {
            // Already unsubscribed.
            return;
        }

        const items = this._issuedSubscriptionItems.splice(index, 1);

        // For Raw and external IoValue events we can only unsubscribe the item if
        // there is no other subscription issued on the same (maybe pattern-based)
        // topic filter.
        let otherEventType: CommunicationEventType;
        if (eventLike.eventType === CommunicationEventType.Raw) {
            otherEventType = CommunicationEventType.IoValue;
        } else if (eventLike.eventType === CommunicationEventType.IoValue) {
            otherEventType = CommunicationEventType.Raw;
        }
        if (otherEventType !== undefined &&
            this._issuedSubscriptionItems.some(i =>
                i.eventType === otherEventType && i.topicFilter === topicFilter)) {
            return;
        }

        this._unsubscribeItems(items);
    }

    private _subscribeItems(items: SubscriptionItem | SubscriptionItem[]) {
        // If client is not connected, items will be subscribed on next reconnect.
        if (this._client?.connected) {
            const subsMap: ISubscriptionMap = {};
            const subsOpts = { qos: this._qos };
            if (Array.isArray(items)) {
                items.forEach(item => {
                    subsMap[item.topicFilter] = subsOpts;
                    this.log(CommunicationBindingLogLevel.debug, "Subscribed on ", item.topicFilter);
                });
            } else {
                subsMap[items.topicFilter] = subsOpts;
                this.log(CommunicationBindingLogLevel.debug, "Subscribed on ", items.topicFilter);
            }
            this._client.subscribe(subsMap);
        }
    }

    private _unsubscribeItems(items: SubscriptionItem | SubscriptionItem[]) {
        // If client is not connected, items don't need to be unsubscribed.
        if (this._client?.connected) {
            if (Array.isArray(items)) {
                const topicFilters = items.map(i => i.topicFilter);
                this._client.unsubscribe(topicFilters);
                this.log(CommunicationBindingLogLevel.debug, "Unsubscribed on ", topicFilters);
            } else {
                this._client.unsubscribe(items.topicFilter);
                this.log(CommunicationBindingLogLevel.debug, "Unsubscribed on ", items.topicFilter);
            }
        }
    }
}

/** Represents an item to be published. */
interface PublicationItem {
    topic: string;
    payload: any;
    options: { [key: string]: any };
    callback?: (publishFailed: boolean) => void;
}

/** Represents an item to be subscribed or unsubscribed. */
interface SubscriptionItem {
    eventType: CommunicationEventType;
    topicFilter: string;
    shouldDecodeData: boolean;
}

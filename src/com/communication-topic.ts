/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Uuid } from "..";

import { CommunicationEventType } from "./communication-event";

/**
 * Encapsulates the internal representation of messaging topics used by the
 * Coaty communication infrastructure.
 *
 * Note: this class is exported only for testing purposes within the Coaty
 * framework. It has not been exported in the public API module because it
 * should not be used by an application.
 */
export class CommunicationTopic {

    get eventType() {
        return this._eventType;
    }

    get eventTypeFilter() {
        return this._eventTypeFilter;
    }

    get eventTypeName() {
        return CommunicationTopic.getEventTypeName(this._eventType, this._eventTypeFilter);
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

    static readonly PROTOCOL_NAME = "coaty";
    static readonly EVENT_TYPE_FILTER_SEPARATOR = ":";
    static readonly EMPTY_TOPIC_LEVEL = "-";

    static EVENT_TYPE_TOPIC_LEVELS: { [level: string]: CommunicationEventType };
    static TOPIC_LEVELS_BY_EVENT_TYPE: string[];

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
     * Create a new topic from the given publication topic name.
     * 
     * @param topicName the structured name of a publication topic
     * @throws exception when topic name is not in correct format
     */
    static createByName(topicName: string): CommunicationTopic {
        const topic = new CommunicationTopic();
        const [protocolName, version, namespace, event, sourceId, corrId, postfix] = topicName.split("/");

        if (protocolName !== this.PROTOCOL_NAME || !version || !namespace || !event || !sourceId) {
            throw new Error("Communication topic is invalid");
        }
        if (corrId === "" && postfix === undefined) {
            throw new Error("Communication topic is invalid");
        }
        if (!!corrId && postfix !== undefined) {
            throw new Error("Communication topic is invalid");
        }

        const v = parseInt(version, 10);
        if (isNaN(v) || v <= 0) {
            throw new Error(`Communication topic has invalid protocol version: ${v}`);
        }

        const [eventType, eventTypeFilter] = this._parseEvent(event);
        if (!eventType) {
            throw new Error(`Communication topic has invalid event type: ${event}`);
        }
        const eventTypeKey = CommunicationEventType[eventType];
        const isOneWayEvent = this.isOneWayEvent(eventType);
        if (isOneWayEvent) {
            if (corrId) {
                throw new Error(`Communication topic has correlation id for ${eventTypeKey} event`);
            }
            if ((eventType === CommunicationEventType.Advertise ||
                eventType === CommunicationEventType.Channel ||
                eventType === CommunicationEventType.Associate) &&
                !eventTypeFilter) {
                throw new Error(`Communication topic missing event filter for ${eventTypeKey} event`);
            }
            if (eventType !== CommunicationEventType.Advertise &&
                eventType !== CommunicationEventType.Channel &&
                eventType !== CommunicationEventType.Associate
                && eventTypeFilter) {
                throw new Error(`Communication topic has event filter for ${eventTypeKey} event`);
            }
        } else {
            if (!corrId) {
                throw new Error(`Communication topic missing correlation id for two-way event: ${eventTypeKey}`);
            }
            if (eventType === CommunicationEventType.Call && !eventTypeFilter) {
                throw new Error(`Communication topic missing event filter for ${eventTypeKey} event`);
            }
            if (eventType === CommunicationEventType.Update && !eventTypeFilter) {
                throw new Error(`Communication topic missing event filter for ${eventTypeKey} event`);
            }
            if (eventType !== CommunicationEventType.Call && eventType !== CommunicationEventType.Update && eventTypeFilter) {
                throw new Error(`Communication topic has event filter for ${eventTypeKey} event`);
            }
        }

        topic._version = v;
        topic._namespace = namespace;
        topic._eventType = eventType;
        topic._eventTypeFilter = eventTypeFilter;
        topic._sourceId = sourceId;
        topic._correlationId = corrId === "" ? undefined : corrId;

        return topic;
    }

    /**
     * Create a new topic for the given topic levels.
     *
     * @param version the protocol version
     * @param namepace the messaging namespace
     * @param eventType an event type
     * @param eventTypeFilter a filter for an event type, or undefined
     * @param sourceId ID from which this event originates
     * @param correlationId correlation ID for response message, or undefined
     */
    static createByLevels(
        version: number,
        namespace: string,
        eventType: CommunicationEventType,
        eventTypeFilter: string,
        sourceId: Uuid,
        correlationId: Uuid,
    ): CommunicationTopic {
        const topic = new CommunicationTopic();

        topic._version = version;
        topic._namespace = namespace;
        topic._eventType = eventType;
        topic._eventTypeFilter = eventTypeFilter || undefined;
        topic._sourceId = sourceId;
        topic._correlationId = correlationId;

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
        let eventLevel = CommunicationTopic._getEventTopicLevelPrefix(eventType);
        if (eventTypeFilter) {
            eventLevel += CommunicationTopic.EVENT_TYPE_FILTER_SEPARATOR + eventTypeFilter;
        }
        let levels = `${this.PROTOCOL_NAME}/${version}/${namespace || "+"}/${eventLevel}/+`;
        if (!this.isOneWayEvent(eventType)) {
            levels += correlationId ? `/${correlationId}` : "/+";
        }

        return levels;
    }

    /**
     * Gets a name that represents the given event type and filter.
     *
     * @param eventType the event type to use
     * @param eventTypeFilter the optional event type filter to use, or
     * undefined (optional)
     */
    static getEventTypeName(eventType: CommunicationEventType, eventTypeFilter?: string) {
        let name = CommunicationEventType[eventType];
        if (eventTypeFilter) {
            name += this.EVENT_TYPE_FILTER_SEPARATOR + eventTypeFilter;
        }
        return name;
    }

    static isOneWayEvent(eventType: CommunicationEventType) {
        return eventType > CommunicationEventType.OneWay && eventType < CommunicationEventType.TwoWay;
    }

    /**
     * Determines whether the given topic name conforms to the communication
     * topic specification of an internal or external IoValue topic that is used
     * for publishing and subscription.
     *
     * @param topicName a topic name
     * @param protocolVersion communication protocol version
     * @returns true if the given topic name is a valid IoValue topic; false
     * otherwise
     */
    static isValidIoValueTopic(topicName: string, protocolVersion: number) {
        if (!this._isValidMqttTopicWithoutWildcards(topicName)) {
            return false;
        }

        let topic: CommunicationTopic;
        try {
            topic = this.createByName(topicName);
            return (topic.eventType === CommunicationEventType.IoValue && topic.version === protocolVersion);
        } catch {
            // Valid external topic
            return true;
        }
    }

    /**
     * Determines whether the given topic name conforms to a raw message.
     *
     * @param topicName a topic name
     * @returns true if the given topic name is a raw topic; false otherwise
     */
    static isRawTopic(topicName: string) {
        return !topicName.startsWith(this.PROTOCOL_NAME + "/");
    }

    /**
     * Determines whether the given name is valid as (part of) a topic level.
     *
     * @param name name
     * @returns true if the given name can be used in a topic level; false
     * otherwise
     */
    static isValidTopicLevel(name: string) {
        return this.isValidPublicationTopic(name) && name.indexOf("/") === -1;
    }

    /**
     * Determines whether the given name is a valid topic name for publication.
     *
     * @param name name
     * @returns true if the given name can be used for publication; false
     * otherwise
     */
    static isValidPublicationTopic(name: string) {
        return typeof name === "string" && name.length > 0 &&
            name.indexOf("\u0000") === -1 && name.indexOf("#") === -1 &&
            name.indexOf("+") === -1;
    }

    private static _isValidMqttTopicWithoutWildcards(topic: string): boolean {
        if (!topic || this._getUtf8BytesCount(topic) > 65535) {
            return false;
        }

        if (topic.indexOf("+") !== -1 ||
            topic.indexOf("#") !== -1 ||
            topic.indexOf("\u0000") !== -1) {
            return false;
        }

        return true;
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

    /**
     * Gets the topic name for publishing.
     */
    getTopicName(): string {
        let eventLevel = CommunicationTopic._getEventTopicLevelPrefix(this.eventType);
        if (this.eventTypeFilter) {
            eventLevel += CommunicationTopic.EVENT_TYPE_FILTER_SEPARATOR + this.eventTypeFilter;
        }
        let topic = `${CommunicationTopic.PROTOCOL_NAME}/${this.version}/${this.namespace}/${eventLevel}/${this.sourceId}`;
        if (!CommunicationTopic.isOneWayEvent(this.eventType)) {
            topic += `/${this.correlationId}`;
        }
        return topic;
    }

}

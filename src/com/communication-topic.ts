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

    get associatedUserId() {
        return this._associatedId;
    }

    get sourceObjectId() {
        return this._sourceObjectId;
    }

    get messageToken() {
        return this._messageToken;
    }

    get version() {
        return this._version;
    }

    static PROTOCOL_NAME = "coaty";
    static EVENT_TYPE_FILTER_SEPARATOR = ":";
    static MESSAGE_TOKEN_ID_COUNTER = 0;
    static TOPIC_ASSOCIATED_USER_ID_NONE = "-";

    private _associatedId: Uuid | string;
    private _sourceObjectId: Uuid | string;
    private _eventType: CommunicationEventType;
    private _eventTypeFilter: string;
    private _messageToken: Uuid | string;
    private _version: number;

    private constructor() {
        /* tslint:disable:empty-block */
        /* tslint:enable:empty-block */
    }

    /**
     * Create a new topic from the given topic name.
     * 
     * @param topicName the structured name of a topic
     * @throws exception when topic name is not in correct format
     */
    static createByName(topicName: string): CommunicationTopic {
        const topic = new CommunicationTopic();
        const [start, protocolName, version, event, userId, sourceId, token, end] = topicName.split("/");

        if (start !== "" || protocolName !== CommunicationTopic.PROTOCOL_NAME || version === "" ||
            event === "" || userId === "" || sourceId === "" || token === "" || end !== "") {
            throw new Error("Communication topic structure invalid");
        }
        topic._associatedId = userId === CommunicationTopic.TOPIC_ASSOCIATED_USER_ID_NONE ? undefined : userId;
        topic._sourceObjectId = sourceId;

        const [eventType, eventTypeFilter] = this._parseEvent(event);
        topic._eventType = eventType;
        topic._eventTypeFilter = eventTypeFilter;
        topic._messageToken = token;
        topic._version = this._parseVersion(version);
        return topic;
    }

    /**
     * Create a new topic for the given topic levels.
     * 
     * @param associatedUserId user ID associated with the topic, or undefined
     * @param sourceObjectId event source object ID
     * @param eventType an event type
     * @param eventTypeFilter an optional filter for an event type
     * @param messageToken a token to identify the message
     * @param protocolVersion the integral protocol version number
     */
    static createByLevels(
        associatedUserId: Uuid,
        sourceObjectId: Uuid,
        eventType: CommunicationEventType,
        eventTypeFilter: string,
        messageToken: Uuid,
        protocolVersion: number): CommunicationTopic {
        const topic = new CommunicationTopic();

        topic._associatedId = associatedUserId;
        topic._sourceObjectId = sourceObjectId;
        topic._eventType = eventType;
        topic._eventTypeFilter = eventTypeFilter || undefined;
        topic._version = protocolVersion;
        topic._messageToken = messageToken;

        return topic;
    }

    /**
     * Gets a topic filter for subscription.
     *
     * @param version the protocol version
     * @param eventTypeName the event name topic level
     * @param associatedUserId user ID associated with the topic, or undefined
     * @param messageToken message token with the topic, or undefined
     */
    static getTopicFilter(version: number, eventTypeName: string, associatedUserId: Uuid, messageToken: string): string {
        return `/${CommunicationTopic.PROTOCOL_NAME}/${version}/${eventTypeName}/${associatedUserId ?? "+"}/+/${messageToken || "+"}/`;
    }

    /**
     * Gets a topic level that represents the event type name.
     *
     * @param eventType the event type to use
     * @param eventTypeFilter the optional event type filter to use, or
     * undefined (optional)
     */
    static getEventTypeName(eventType: CommunicationEventType, eventTypeFilter?: string) {
        let name = CommunicationEventType[eventType];
        if (eventTypeFilter) {
            name += CommunicationTopic.EVENT_TYPE_FILTER_SEPARATOR + eventTypeFilter;
        }
        return name;
    }

    /**
     * Determines whether the given topic name conforms to the communication
     * topic specification of an internal or external IoValue topic that is used
     * for publishing and subscription.
     *
     * @param topic a topic name
     * @param protocolVersion communication protocol version
     * @returns true if the given topic name is a valid IoValue topic; false
     * otherwise
     */
    static isValidIoValueTopic(
        topic: string,
        protocolVersion: number) {
        if (!CommunicationTopic._isValidMqttTopicWithoutWildcards(topic)) {
            return false;
        }

        const [start, protocolName, version, event, userId, sourceId, messageToken, end] = topic.split("/");
        if (start === "" && protocolName === CommunicationTopic.PROTOCOL_NAME &&
            !!version && !!event && !!userId && !!sourceId && !!messageToken &&
            end === "") {

            // Matches internal topic structure (but could still be external)
            const [eventType] = this._parseEvent(event);
            if (typeof eventType !== "number" || (eventType <= 0 || eventType >= CommunicationEventType.MAX)) {
                // Valid external topic
                return true;
            }

            // Assume internal topic
            try {
                if (eventType === CommunicationEventType.IoValue &&
                    this._parseVersion(version) === protocolVersion) {
                    return true;
                }
                return false;
            } catch (error) {
                return false;
            }
        } else {
            // Valid external topic
            return true;
        }
    }

    /**
     * Determines whether the given data is valid as an event type filter.
     *
     * @param filter an event type filter
     * @returns true if the given topic name is a valid event type filter; false
     * otherwise
     */
    static isValidEventTypeFilter(filter: string) {
        return typeof filter === "string" && filter.length > 0 &&
            filter.indexOf("\u0000") === -1 && filter.indexOf("#") === -1 &&
            filter.indexOf("+") === -1 && filter.indexOf("/") === -1;
    }

    private static _isValidMqttTopicWithoutWildcards(topic: string): boolean {
        if (!topic || CommunicationTopic._getUtf8BytesCount(topic) > 65535) {
            return false;
        }

        if (topic.indexOf("+") !== -1 ||
            topic.indexOf("#") !== -1 ||
            topic.indexOf("\u0000") !== -1) {
            return false;
        }

        return true;
    }

    private static _parseVersion(versionLevel: string) {
        return parseInt(versionLevel, 10);
    }

    private static _parseEvent(event: string) {
        const index = event.indexOf(CommunicationTopic.EVENT_TYPE_FILTER_SEPARATOR);
        const type = index === -1 ? event : event.substring(0, index);
        const filter = index === -1 ? undefined : event.substring(index + 1);
        return [CommunicationEventType[type], filter];
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

    /**
     * Gets the topic name for publishing.
     */
    getTopicName(): string {
        /* tslint:disable-next-line:max-line-length */
        return `/${CommunicationTopic.PROTOCOL_NAME}/${this.version}/${this.eventTypeName}/${this.associatedUserId || CommunicationTopic.TOPIC_ASSOCIATED_USER_ID_NONE}/${this.sourceObjectId}/${this.messageToken}/`;
    }

}

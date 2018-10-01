/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject, Uuid } from "../model/object";
import { User } from "../model/user";

import { CommunicationEventType } from "./communication-events";

/**
 * Encapsulates the internal representation of messaging topics
 * used by the Coaty communication infrastructure.
 *
 * Note: this class is exported only for testing purposes within the Coaty framework.
 * It has not been exported in the public "com" module because it is
 * useless in an application.
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
    static READABLE_NAME_ID_SEPARATOR = "_";
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
     * @param associatedUser user or user ID associated with the topic, or undefined
     * @param sourceObject event source object or object ID
     * @param eventType an event type
     * @param eventTypeFilter an optional filter for an event type
     * @param messageToken a token to identify the message
     * @param protocolVersion the integral protocol version number
     * @param isReadable whether to generate a readable topic name
     * @param preserveMessageToken whether to generate a readable topic for the given token
     */
    static createByLevels(
        associatedUser: User | Uuid,
        sourceObject: CoatyObject | Uuid,
        eventType: CommunicationEventType,
        eventTypeFilter: string,
        messageToken: Uuid,
        protocolVersion: number,
        isReadable: boolean,
        preserveMessageToken: boolean = false): CommunicationTopic {
        const topic = new CommunicationTopic();

        if (!associatedUser) {
            topic._associatedId = undefined;
        } else {
            if (typeof associatedUser === "string") {
                topic._associatedId = associatedUser;
            } else {
                // Do not create readable topic level for Associate events
                // in order to match the Associate topic filter where 
                // the associatedID level is always non-readable (see getTopicFilter)
                topic._associatedId = isReadable && (eventType !== CommunicationEventType.Associate) ?
                    CommunicationTopic._readable(associatedUser) :
                    associatedUser.objectId;
            }
        }

        if (typeof sourceObject === "string") {
            topic._sourceObjectId = sourceObject;
        } else {
            topic._sourceObjectId = isReadable ?
                CommunicationTopic._readable(sourceObject) :
                sourceObject.objectId;
        }

        topic._eventType = eventType;
        topic._eventTypeFilter = eventTypeFilter || undefined;
        topic._version = protocolVersion;

        if (isReadable && !preserveMessageToken) {
            topic._messageToken = `${topic._sourceObjectId.replace(/[|]/g, "_")}_${this.MESSAGE_TOKEN_ID_COUNTER++}`;
        } else {
            topic._messageToken = messageToken;
        }

        return topic;
    }

    /**
     * Gets a topic filter for subscription.
     * @param eventTypeName the event name topic level
     * @param associatedUser user associated with the topic, or undefined
     * @param messageToken message token with the topic, or undefined
     */
    static getTopicFilter(eventTypeName: string, associatedUser: User, messageToken: string): string {
        /* tslint:disable-next-line:max-line-length */
        return `/${CommunicationTopic.PROTOCOL_NAME}/+/${eventTypeName}/${associatedUser ? associatedUser.objectId : "+"}/+/${messageToken || "+"}/`;
    }

    /**
     * Gets a topic level that represents the event type name.
     * @param eventType the event type to use
     * @param eventTypeFilter the optional event type filter to use, or undefined (optional)
     */
    static getEventTypeName(eventType: CommunicationEventType, eventTypeFilter?: string) {
        let name = CommunicationEventType[eventType];
        if (eventTypeFilter) {
            name += CommunicationTopic.EVENT_TYPE_FILTER_SEPARATOR + eventTypeFilter;
        }
        return name;
    }

    /**
     * Gets the UUID for a readable or non-readable topic level, either for
     * sourceObject or associatedUser.
     *
     * @param level either sourceId or associatedUserId level (may also be undefined)
     */
    static uuidFromLevel(level: string) {
        if (!level) {
            return undefined;
        }
        const i = level.lastIndexOf(this.READABLE_NAME_ID_SEPARATOR);
        if (i === -1) {
            return level;
        }
        return level.substr(i + 1);
    }

    /**
     * Determines whether the given topic name conforms to the communication topic
     * specification of an internal or external IoValue topic that is used
     * for publishing and subscription.
     *
     * @param topic a topic name
     * @param protocolVersionChecker check function for communication protocol version
     * @Returns true if the given topic name is a valid IoValue topic; false otherwise
     */
    static isValidIoValueTopic(
        topic: string,
        protocolVersionChecker: (protocolVersion: number) => boolean): boolean {
        if (!CommunicationTopic._isValidMqttTopicWithoutWildcards(topic)) {
            return false;
        }

        const [start, protocolName, version, event, userId, sourceId, messageToken, end] = topic.split("/");
        if (start === "" && protocolName === CommunicationTopic.PROTOCOL_NAME &&
            !!version && !!event && !!userId && !!sourceId && !!messageToken &&
            end === "") {

            // Matches internal topic structure (but could still be external)
            const [eventType] = this._parseEvent(event);
            if (eventType !== CommunicationEventType.Advertise &&
                eventType !== CommunicationEventType.Deadvertise &&
                eventType !== CommunicationEventType.Channel &&
                eventType !== CommunicationEventType.Discover &&
                eventType !== CommunicationEventType.Resolve &&
                eventType !== CommunicationEventType.Query &&
                eventType !== CommunicationEventType.Retrieve &&
                eventType !== CommunicationEventType.Update &&
                eventType !== CommunicationEventType.Associate &&
                eventType !== CommunicationEventType.IoValue) {
                // Valid external topic
                return true;
            }

            // Assume internal topic
            try {
                if (eventType === CommunicationEventType.IoValue &&
                    protocolVersionChecker(this._parseVersion(version))) {
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

    private static _readable(obj: CoatyObject) {
        return this._normalize(obj.name) + this.READABLE_NAME_ID_SEPARATOR + obj.objectId;
    }

    private static _normalize(name: string) {
        // Replace invalid Unicode chars within a topic level by underscores
        return name.replace(/[\u0000\+#\/]/g, "_");
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

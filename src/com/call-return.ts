/*! Copyright (c) 2019 Siemens AG. Licensed under the MIT License. */

import { CoatyObject, CommunicationEventType, ContextFilter, isContextFilterValid, isPlainObject, ObjectMatcher } from "..";
import { CommunicationEvent, CommunicationEventData } from "./communication-event";

/**
 * Call event for invoking a remote operation call.
 */
export class CallEvent extends CommunicationEvent<CallEventData> {

    get eventType() {
        return CommunicationEventType.Call;
    }

    get eventTypeFilter() {
        return this._operation;
    }

    get responseEventType() {
        return CommunicationEventType.Return;
    }

    /**
     * A non-empty string containing the name of the operation to be invoked.
     */
    get operation() {
        return this._operation;
    }

    /**
     * Respond to an observed Call event by returning the given Return event
     * with the result yielded by executing the Call event's operation.
     *
     * @param event a Return event
     */
    returnEvent: (event: ReturnEvent) => void;

    private _operation: string;

    /**
     * @internal For internal use in framework only. Do not use in application code.
     *
     * Create a Call event instance.
     *
     * @param operation the operation name of this Call event
     * @param eventData data associated with this Call event
     * @throws if operation name is not in a valid format
     */
    constructor(
        operation: string,
        eventData: CallEventData) {
        super(eventData);

        if (!CommunicationEvent.isValidEventFilter(operation)) {
            throw new TypeError("in CallEvent: argument 'operation' is not a valid operation name");
        }

        this._operation = operation;
    }

    /**
     * Create a CallEvent instance for invoking a remote operation call with the
     * given operation name, parameters (optional), and a context filter
     * (optional).
     *
     * The operation name must be a non-empty string that does not contain the
     * following characters: `NULL (U+0000)`, `# (U+0023)`, `+ (U+002B)`, `/
     * (U+002F)`.
     *
     * Parameters must be either by-position through a JSON array or by-name
     * through a JSON object. If a context filter is specified, the given remote
     * call is only executed if the filter conditions match a context object
     * provided by the remote end.
     *
     * @param operation a non-empty string containing the name of the operation
     * to be invoked
     * @param parameters holds the parameter values to be used during the
     * invocation of the operation (optional)
     * @param filter a context filter that must match a given context object at
     * the remote end (optional)
     * @throws if operation name is not in a valid format
     */
    static with(operation: string, parameters?: any[] | { [key: string]: any; }, filter?: ContextFilter) {
        return new CallEvent(operation, new CallEventData(parameters, filter));
    }

    /**
     * @internal For internal use in framework only.
     *
     * @param eventData event data for Return response event
     * @throws if the given Return event data does not correspond to the event
     * data of this Call event.
     */
    ensureValidResponseParameters(eventData: ReturnEventData) {
        // No checks required.
        // tslint:disable-next-line: no-empty
    }
}

/**
 * Defines event data format for invoking a remote operation call.
 */
export class CallEventData extends CommunicationEventData {

    /**
     * Holds the parameter values to be used during the remote invocation of the operation (optional).
     * Parameters must be either by-position through a JSON array or by-name
     * through a JSON object. If no parameters have been specified the value returned is `undefined`.
     */
    get parameters() {
        return this._parameters;
    }

    /**
     * A context filter whose conditions must match a context object at the remote end
     * in order to allow execution of the remote call (optional).
     * If no filter has been specified the value returned is `undefined`.
     */
    get filter() {
        return this._filter;
    }

    private _parameters: any[] | { [key: string]: any; };
    private _filter: ContextFilter;

    /**
     * Create a CallEventData instance for the given data.
     *
     * @param parameters holds the parameter values to be used during the invocation of the operation (optional)
     * @param filter a context filter that must match a given context at the remote end (optional)
     */
    constructor(
        parameters?: any[] | { [key: string]: any; },
        filter?: ContextFilter) {
        super();

        this._parameters = parameters;
        this._filter = filter;

        if (!this._hasValidParameters()) {
            throw new TypeError("in CallEventData: arguments not valid");
        }
    }

    /** @internal For internal use in framework only. */
    static createFrom(eventData: any): CallEventData {
        return new CallEventData(
            eventData.parameters,
            eventData.filter);
    }

    /**
     * Returns the JSON value of the positional parameter with the given index. Returns `undefined`,
     * if the given index is out of range or if no index parameters have been specified.
     *
     * @param index the zero-based index into the JSON parameters array
     */
    getParameterByIndex(index: number) {
        if (!Array.isArray(this._parameters)) {
            return undefined;
        }
        return this._parameters[index];
    }

    /**
     * Returns the JSON value of the keyword parameter with the given name. Returns `undefined`,
     * if the given name is missing or if no keyword parameters have been specified.
     *
     * @param name the name of a key in the JSON parameters object
     */
    getParameterByName(name: string) {
        if (!isPlainObject(this._parameters)) {
            return undefined;
        }
        return this.parameters[name];
    }

    /**
     * @internal For internal use in framework only.
     *
     * Determines whether the given context object matches the context filter of
     * this event data, returning false if it does not match, true otherwise.
     *
     * A match fails if:
     * - context filter and context object are *both* specified and they do not
     *   match (checked by using `ObjectMatcher.matchesFilter`), or
     * - context filter is *not* specified *and* context object *is* specified.
     *
     * In all other cases, the match is considered successfull.
     *
     * Note that there is no need to use this operation in application code.
     * When observing incoming Call events (via
     * `CommunicationManager.observeCall`), the communication manager takes care
     * to invoke this function automatically and to filter out events that do
     * not match a given context.
     *
     * @param context a CoatyObject to match against the context filter
     * specified in event data (optional).
     */
    matchesFilter(context?: CoatyObject): boolean {
        if (this._filter !== undefined && context !== undefined) {
            return ObjectMatcher.matchesFilter(context, this._filter);
        }
        if (this._filter === undefined && context !== undefined) {
            return false;
        }
        return true;
    }

    toJsonObject() {
        return {
            parameters: this._parameters,
            filter: this._filter,
        };
    }

    private _hasValidParameters(): boolean {
        return (this._parameters === undefined || Array.isArray(this._parameters) || isPlainObject(this._parameters)) &&
            isContextFilterValid(this._filter);
    }

}

/**
 * Defines error codes for pre-defined remote call errors.
 *
 * The integer error codes from and including -32768 to -32000 are reserved for pre-defined errors
 * encountered while executing a remote call. Any code within this range, but not defined explicitly
 * below is reserved for future use. The remaining integers are available for application defined errors.
 *
 * The predefined error messages corresponding to these predefined error codes are defined by enum
 * `RemoteCallErrorMessage`.
 */
export enum RemoteCallErrorCode {
    InvalidParameters = -32602,
}

/**
 * Defines error messages for pre-defined remote call errors.
 *
 * The predefined error codes corresponding to these predefined error messages are defined by enum
 * `RemoteCallErrorCode`.
 */
export enum RemoteCallErrorMessage {
    InvalidParameters = "Invalid params",
}

/**
 * Return event for providing the response of executing a remote operation call.
 */
export class ReturnEvent extends CommunicationEvent<ReturnEventData> {

    get eventType() {
        return CommunicationEventType.Return;
    }

    /**
     * @internal For internal use in framework only. Do not use in application
     * code.
     *
     * Associated request event.
     */
    eventRequest: CallEvent;

    /**
     * Create a ReturnEvent instance for a remote operation call that successfully yields a result.
     *
     * @param result the result value to be returned (any JSON data type)
     * @param executionInfo information about execution environment (optional)
     */
    static withResult(result: any, executionInfo?: any) {
        return new ReturnEvent(new ReturnEventData(result, undefined, executionInfo));
    }

    /**
     * Create a ReturnEvent instance for a remote operation call that yields an error.
     *
     * The error code given is an integer that indicates the error type
     * that occurred, either a predefined error or an application defined one. Predefined error
     * codes are defined by the `RemoteCallErrorCode` enum. Predefined error
     * codes are within the range -32768 to -32000. Application defined error codes must be
     * defined outside this range.
     *
     * The error message provides a short description of the error. Predefined error messages
     * exist for all predefined error codes (see enum `RemoteCallErrorMessage`).
     *
     * @param code an integer that indicates the error type that occurred
     * @param message a string providing a short description of the error
     * @param executionInfo information about execution environment (optional)
     */
    static withError(
        code: RemoteCallErrorCode | number,
        message: RemoteCallErrorMessage | string,
        executionInfo?: any) {
        return new ReturnEvent(new ReturnEventData(undefined, { code, message }, executionInfo));
    }
}

/**
 * Defines event data format for returning a result or error from executing a remote operation call.
 */
export class ReturnEventData extends CommunicationEventData {

    /**
     * The result value to be returned (any JSON data type). The value is `undefined`,
     * if operation execution yielded an error.
     */
    get result() {
        return this._result;
    }

    /**
     * The error object to be returned in case the operation call yielded an error (optional).
     * The value is `undefined` if the operation executed successfully.
     *
     * The error object consists of two properties: `code`, `message`.
     *
     * The error code given is an integer that indicates the error type
     * that occurred, either a predefined error or an application defined one. Predefined error
     * codes are defined by the `RemoteCallErrorCode` enum. Predefined error
     * codes are within the range -32768 to -32000. Application specific error codes must be
     * defined outside this range.
     *
     * The error message provides a short description of the error. Predefined error messages
     * exist for all predefined error codes (see enum `RemoteCallErrorMessage`).
     */
    get error() {
        return this._error;
    }

    /**
     * Determines whether an error object has been returned.
     *
     * Returns true, if remote operation failed with an error; false otherwise.
     */
    get isError() {
        return this._error !== undefined;
    }

    /**
     * Defines additional information about the execution environment (any JSON value)
     * such as the execution time of the operation or the ID of the operated control unit
     * (optional).
     *
     * The value is `undefined`, if no execution info has been specified.
     */
    get executionInfo() {
        return this._executionInfo;
    }

    private _result: any;
    private _error: { code: number, message: string };
    private _executionInfo: any;

    /**
     * Create an instance of ReturnEventData.
     *
     * Exactly one of the parameters `result` or `error` is required.
     * The `executionInfo` parameter is optional and may be specified
     * both in case of success and error.
     *
     * @param result the result value to be returned (any JSON data type, optional)
     * @param error the error object in case of failure (optional)
     * @param executionInfo information about execution environment (optional)
     */
    constructor(
        result?: any,
        error?: { code: number, message: string },
        executionInfo?: any) {
        super();

        this._result = result;
        this._error = error;
        this._executionInfo = executionInfo;

        if (!this._hasValidParameters()) {
            throw new TypeError("in ReturnEventData: arguments not valid");
        }
    }

    /** @internal For internal use in framework only. */
    static createFrom(eventData: any): ReturnEventData {
        return new ReturnEventData(
            eventData.result,
            eventData.error,
            eventData.executionInfo,
        );
    }

    toJsonObject() {
        return {
            result: this._result,
            error: this._error,
            executionInfo: this._executionInfo,
        };
    }

    private _hasValidParameters(): boolean {
        if (this._result === undefined && this._error === undefined) {
            return false;
        }
        if (this._result !== undefined && this._error !== undefined) {
            return false;
        }
        if (this._error !== undefined &&
            (!isPlainObject(this._error) || this._error.code === undefined || this._error.message === undefined)) {
            return false;
        }
        return true;
    }
}

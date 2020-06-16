/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { filter, take } from "rxjs/operators";

import {
    AdvertiseEvent,
    AdvertiseEventData,
    CallEvent,
    ChannelEvent,
    ChannelEventData,
    CoatyObject,
    CompleteEvent,
    ContextFilter,
    Controller,
    CoreTypes,
    DiscoverEvent,
    RawEvent,
    RemoteCallErrorCode,
    RemoteCallErrorMessage,
    ResolveEvent,
    ReturnEvent,
    ReturnEventData,
} from "../..";

import { Spy } from "./utils";

export interface AdvertiseEventLogger {
    count: number;
    eventData: AdvertiseEventData[];
}

export interface ChannelEventLogger {
    count: number;
    eventData: ChannelEventData[];
}

export interface ReturnEventLogger {
    eventData: { [key: string]: ReturnEventData };
}

export interface RawEventLogger {
    count: number;
    eventData: any[];
}

export class MockDeviceController extends Controller {
    onInit() {
        super.onInit();
        this.communicationManager
            .publishDiscover(DiscoverEvent.withObjectTypes(["coaty.test.MockObject"]))
            .subscribe(event => {
                Spy.set("MockDeviceController", event);
            });

        this.communicationManager
            .observeCommunicationState()
            .subscribe(state => {
                Spy.set("MockDeviceController", Spy.NO_VALUE, state);
            });
    }

    watchForAdvertiseEvents(logger: AdvertiseEventLogger) {
        this.communicationManager
            .observeAdvertiseWithCoreType("CoatyObject")
            .subscribe(event => {
                logger.count++;
                logger.eventData.push(event.data);
            });

        this.communicationManager
            .observeAdvertiseWithObjectType(CoreTypes.OBJECT_TYPE_OBJECT)
            .subscribe(event => {
                logger.count++;
                logger.eventData.push(event.data);
            });

        this.communicationManager
            .observeAdvertiseWithObjectType("com.mydomain.mypackage.MyCustomObjectType")
            .subscribe(event => {
                logger.count++;
                logger.eventData.push(event.data);
            });
    }

    watchForChannelEvents(logger: ChannelEventLogger, channelId: string) {
        this.communicationManager
            .observeChannel(channelId)
            .subscribe(event => {
                logger.count++;
                logger.eventData.push(event.data);
            });
    }

    watchForRawEvents(logger: RawEventLogger, topicFilter: string, options?: { [key: string]: any }) {
        this.communicationManager
            .observeRaw(topicFilter, options)
            .subscribe(([topic, payload]) => {
                logger.count++;
                // Raw values are emitted as tuples of topic name and Uint8Array/Buffer payload
                logger.eventData.push([topic, payload]);
            });
    }

}

export class MockObjectController extends Controller {

    onInit() {
        super.onInit();

        this._handleIdentityEvents();
        this._handleDiscoverEvents();

        this.communicationManager.observeUpdateWithObjectType("coaty.test.MockObject")
            .subscribe(event => event.complete(CompleteEvent.withObject(event.data.object)));
    }

    publishAdvertiseEvents(count: number) {
        for (let i = 1; i <= count; i++) {
            this.communicationManager.publishAdvertise(
                AdvertiseEvent.withObject(
                    {
                        objectId: this.runtime.newUuid(),
                        objectType: (i % 2) !== 0 ? CoreTypes.OBJECT_TYPE_OBJECT : "com.mydomain.mypackage.MyCustomObjectType",
                        coreType: "CoatyObject",
                        name: "Advertised_" + i,
                    }));
        }
    }

    publishChannelEvents(count: number, channelId: string) {
        for (let i = 1; i <= count; i++) {
            this.communicationManager.publishChannel(
                ChannelEvent.withObject(
                    channelId,
                    {
                        objectId: this.runtime.newUuid(),
                        objectType: CoreTypes.OBJECT_TYPE_OBJECT,
                        coreType: "CoatyObject",
                        name: "Channeled_" + i,
                    }));
        }
    }

    publishRawEvents(count: number, topic: string) {
        for (let i = 1; i <= count; i++) {
            this.communicationManager.publishRaw(RawEvent.withTopicAndPayload(topic, Uint8Array.of(i)));
        }
    }

    watchForAdvertiseEvents(logger: AdvertiseEventLogger) {
        this.communicationManager
            .observeAdvertiseWithCoreType("CoatyObject")
            .subscribe(event => {
                logger.count++;
                logger.eventData.push(event.data);
            });
    }

    private _handleIdentityEvents() {
        this.communicationManager
            .observeAdvertiseWithCoreType("Identity")
            .subscribe(event => {
                Spy.set(this.registeredName + "_Identities", event);
            });
    }

    private _handleDiscoverEvents() {
        this.communicationManager
            .observeDiscover()
            .pipe(
                filter(event => event.data.isObjectTypeCompatible("coaty.test.MockObject")),
                // Take first event only and unsubscribe automatically afterwards
                take(1),
            )
            .subscribe(event => {
                Spy.set(this.registeredName, event);

                setTimeout(
                    () => {
                        event.resolve(ResolveEvent.withObject(
                            {
                                objectId: this.runtime.newUuid(),
                                objectType: "coaty.test.MockObject",
                                coreType: "CoatyObject",
                                name: `MockObject_${this.registeredName}`,
                            }));
                    },
                    this.options.responseDelay);
            });
    }

}

export class MockOperationsCallController extends Controller {

    publishCallEvent(
        op: string,
        params: { [key: string]: any },
        contextFilter: ContextFilter,
        logger: ReturnEventLogger,
        loggerKey: string) {
        this.communicationManager.publishCall(
            CallEvent.with(
                op,
                params,
                contextFilter,
            ))
            .pipe(take(1))
            .subscribe(returnEvent => {
                logger.eventData[loggerKey] = returnEvent.data;
            });
    }
}

export class MockOperationsExecutionController extends Controller {

    context: CoatyObject;

    onInit() {
        super.onInit();

        this.context = {
            coreType: "CoatyObject",
            objectId: this.runtime.newUuid(),
            objectType: "coaty.test.TestContextObject",
            name: "TestContext",
        };
        this.context["floor"] = 7;

        this._handleCallEvents(
            "coaty.test.switchLight",
            event => {
                const color = event.data.getParameterByName("color");
                const state = event.data.getParameterByName("state");
                if (color === "black" && state === "on") {
                    return new Error("Cannot turn on black light");
                }
                return {
                    state,
                    color,
                };
            },
            4711,
        );
        this._handleCallEvents(
            "coaty.test.add",
            event => {
                const add1 = event.data.getParameterByIndex(0);
                const add2 = event.data.getParameterByIndex(1);
                if (add1 !== undefined && add2 !== undefined) {
                    return add1 + add2;
                }
                return new Error("Invalid param for add operation");
            },
            4712,
        );
    }

    private _handleCallEvents(operation: string, resultFunc: (event: CallEvent) => any, duration: number) {
        this.communicationManager
            .observeCall(operation, this.context)
            .subscribe(event => {
                const result = resultFunc(event);
                if (result instanceof Error) {
                    event.returnEvent(ReturnEvent.withError(
                        RemoteCallErrorCode.InvalidParameters,
                        RemoteCallErrorMessage.InvalidParameters,
                        { duration },
                    ));
                } else {
                    event.returnEvent(ReturnEvent.withResult(
                        result,
                        { duration },
                    ));
                }
            });
    }

}

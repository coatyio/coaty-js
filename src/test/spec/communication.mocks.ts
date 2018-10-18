/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { filter, take } from "rxjs/operators";

import {
    AdvertiseEvent,
    AdvertiseEventData,
    ChannelEvent,
    ChannelEventData,
    DiscoverEvent,
    ResolveEvent,
} from "../../com";
import { Controller } from "../../controller";
import { CoreTypes } from "../../model";

import { Spy } from "./utils";

export interface AdvertiseEventLogger {
    count: number;
    eventData: AdvertiseEventData[];
}

export interface ChannelEventLogger {
    count: number;
    eventData: ChannelEventData[];
}

export interface RawEventLogger {
    count: number;
    eventData: any[];
}

export class MockDeviceController extends Controller {
    onInit() {
        super.onInit();
        this.communicationManager
            .publishDiscover(DiscoverEvent.withObjectTypes(this.identity, ["coaty.test.MockObject"]))
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
            .observeAdvertiseWithCoreType(this.identity, "CoatyObject")
            .subscribe(event => {
                logger.count++;
                logger.eventData.push(event.eventData);
            });

        this.communicationManager
            .observeAdvertiseWithObjectType(this.identity, CoreTypes.OBJECT_TYPE_OBJECT)
            .subscribe(event => {
                logger.count++;
                logger.eventData.push(event.eventData);
            });

        this.communicationManager
            .observeAdvertiseWithObjectType(this.identity, "com.mycompany.MyCustomObjectType")
            .subscribe(event => {
                logger.count++;
                logger.eventData.push(event.eventData);
            });
    }

    watchForChannelEvents(logger: ChannelEventLogger, channelId: string) {
        this.communicationManager
            .observeChannel(this.identity, channelId)
            .subscribe(event => {
                logger.count++;
                logger.eventData.push(event.eventData);
            });
    }

    watchForRawEvents(logger: RawEventLogger, topicFilter: string, topicPrefix: string) {
        this.communicationManager
            .observeRaw(this.identity, topicFilter)
            // Note that all published raw messages are dispatched on all raw observables!
            .pipe(filter(([topic,]) => topic.startsWith(topicPrefix)))
            .subscribe(([topic, payload]) => {
                logger.count++;
                // Raw values are emitted as tuples of topic name and Uint8Array/Buffer payload
                logger.eventData.push([topic, payload.toString()]);
            });
    }

}

export class MockObjectController extends Controller {

    onInit() {
        super.onInit();

        this._handleDiscoverEvents();
        this._handleAdvertiseEvents();
    }

    publishAdvertiseEvents(count: number) {
        for (let i = 1; i <= count; i++) {
            this.communicationManager.publishAdvertise(
                AdvertiseEvent.withObject(
                    this.identity,
                    {
                        objectId: this.runtime.newUuid(),
                        objectType: (i % 2) !== 0 ? CoreTypes.OBJECT_TYPE_OBJECT : "com.mycompany.MyCustomObjectType",
                        coreType: "CoatyObject",
                        name: "Advertised_" + i,
                    }));
        }
    }

    publishChannelEvents(count: number, channelId: string) {
        for (let i = 1; i <= count; i++) {
            this.communicationManager.publishChannel(
                ChannelEvent.withObject(
                    this.identity,
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
            this.communicationManager.publishRaw(topic, `${i}`);
        }
    }

    watchForAdvertiseEvents(logger: AdvertiseEventLogger) {
        this.communicationManager
            .observeAdvertiseWithCoreType(this.identity, "CoatyObject")
            .subscribe(event => {
                logger.count++;
                logger.eventData.push(event.eventData);
            });
    }

    private _handleDiscoverEvents() {
        this.communicationManager
            .observeDiscover(this.identity)
            .pipe(
                filter(event => event.eventData.isObjectTypeCompatible("coaty.test.MockObject")),
                // Take first event only and unsubscribe automatically afterwards
                take(1),
            )
            .subscribe(event => {
                Spy.set(this.identity.name, event);

                setTimeout(
                    () => {
                        event.resolve(ResolveEvent.withObject(
                            this.identity,
                            {
                                objectId: this.runtime.newUuid(),
                                objectType: "coaty.test.MockObject",
                                coreType: "CoatyObject",
                                name: `MockObject_${this.identity.name}`,
                            }));
                    },
                    this.options["responseDelay"]);
            });
    }

    private _handleAdvertiseEvents() {
        this.communicationManager
            .observeAdvertiseWithCoreType(this.identity, "Component")
            // Multiple Advertise events arrive: one identity advertisement
            // from the MockDeviceController and one from the other 
            // MockObjectController
            .pipe(filter(event => event.eventUserId &&
                event.eventData.object.name === "MockDeviceController1"))
            .subscribe(event => Spy.set(this.identity.name, Spy.NO_VALUE, event));
    }

}

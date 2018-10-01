/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from "rxjs";
import { Thing, ThingObserverController } from "coaty/sensor-things";

@Component({
    templateUrl: './welcome.component.html'
})
export class WelcomeComponent implements OnInit, OnDestroy {

    private _discoverThingsSubscription: Subscription;
    private _advertiseThingSubscription: Subscription;
    private _things: Thing[] = [];

    constructor(private _thingObserverController: ThingObserverController) {
    }

    get things(): Thing[] {
        return this._things;
    }

    ngOnInit(): void {
        this._discoverThingsSubscription && this._discoverThingsSubscription.unsubscribe();
        this._advertiseThingSubscription && this._advertiseThingSubscription.unsubscribe();

        this._discoverThingsSubscription = this._thingObserverController
            .discoverThings()
            .subscribe(thing => this._onThing(thing));

        this._advertiseThingSubscription = this._thingObserverController
            .observeAdvertisedThings()
            .subscribe(thing => this._onThing(thing));
    }

    ngOnDestroy() {
        this._advertiseThingSubscription && this._advertiseThingSubscription.unsubscribe();
        this._discoverThingsSubscription && this._discoverThingsSubscription.unsubscribe();
    }

    private _onThing(thing: Thing) {
        this._things.push(thing);
    }

}

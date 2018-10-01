/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Component, NgZone } from '@angular/core';
import { CommunicationManager } from 'coaty/com';

import { agentInfo } from './agent.info';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    constructor(comManager: CommunicationManager, zone: NgZone) {
        // Start Communication Manager inside Angular zone
        zone.run(() => comManager.start());
    }

    appTitle = `Coaty - Sensor Things Dashboard`;
    appVersion = `v${agentInfo.packageInfo.version}`;
    headerLinks = [
        { icon: 'assets/images/github-icon.svg', url: 'https://github.com/coatyio/coaty-js/tree/master/examples/sensor-things/' }
    ];
}

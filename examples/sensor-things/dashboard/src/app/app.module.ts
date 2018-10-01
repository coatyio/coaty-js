/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { WelcomeComponent } from './welcome/welcome.component';
import { SensorComponent } from './sensor/sensor.component';
import { ObjectNetworkComponent } from './sensor/object-network.component';
import { TruncatePipe } from './pipes/truncate.pipe';
import { FloorPipe } from './pipes/floor.pipe';
import { KeysPipe } from './pipes/keys.pipe';

@NgModule({
    declarations: [
        AppComponent,
        WelcomeComponent,
        SensorComponent,
        TruncatePipe,
        FloorPipe,
        KeysPipe,
        ObjectNetworkComponent,
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule { }


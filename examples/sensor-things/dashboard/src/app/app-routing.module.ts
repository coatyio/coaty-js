/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { WelcomeComponent } from './welcome/welcome.component';
import { SensorComponent } from './sensor/sensor.component';

const routes: Routes = [];

@NgModule({
    imports: [
        RouterModule.forRoot([
            {
                path: '',
                component: WelcomeComponent,
                data: {
                    title: 'Welcome'
                }
            },
            {
                path: 'object/:id',
                component: SensorComponent,
                data: {
                    title: 'Object'
                }
            }
        ], { useHash: true })
    ],
    exports: [
        RouterModule
    ]
})
export class AppRoutingModule { }

/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CommunicationManager } from "../../com/communication-manager";
import { Container } from "../../runtime/container";
import { Runtime } from "../../runtime/runtime";

/**
 * Get dependency injection providers for Coaty applications
 * built with Angular or Ionic.
 *
 * Use this function to retrieve Angular providers for all components of
 * the given Coaty container. The returned array of providers 
 * should be passed as `extraProviders` argument to one of the Angular 
 * bootstrap functions `platformBrowser` or `platformBrowserDynamic`.
 *
 * @param container a Container object with resolved components
 * @returns an array of Provider objects
 */
export function provideComponents(container: Container): any[] {
    return [
        { provide: Container, useValue: container },
        { provide: Runtime, useValue: container.runtime },
        { provide: CommunicationManager, useValue: container.communicationManager },
        ...container.mapControllers((controllerName, controllerType, controller) => {
            return { provide: controllerType, useValue: controller };
        }),
    ];
}

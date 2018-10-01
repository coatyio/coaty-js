/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Release system resources used by the component that implements this
 * interface.
 */
export interface IDisposable {
    onDispose(): void;
}

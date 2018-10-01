/*! Copyright (c) Siemens AG and contributors. Licensed under the MIT License. */

/**
 * Ambient External Module Declaration for 'pg-connection-string' npm module version 0.1.3
 * exposed as CommonJS module. For use in Node.js runtime.
 * 
 * Note that the latest pg-connection-string npm module (v2.0.0) already includes these
 * type definitions, but the latest pg npm module still specifies version 0.1.3 as dependency.
 */
declare module "pg-connection-string" {

    import {ConnectionConfig} from "pg";

    export function parse(connectionString: string): ConnectionConfig;
}

/*! Copyright (c) 2020 Siemens AG. Licensed under the MIT License. */

import { IoActor, IoSource } from "./io-point";
import { CoatyObject } from "./object";

/**
 * Represents an IO node with IO sources and IO actors for IO routing.
 *
 * The name of an IO node equals the name of the IO context it is associated
 * with. An IO node also contains node-specific characteristics used by IO
 * routers to manage routes.
 */
export interface IoNode extends CoatyObject {

    coreType: "IoNode";

    /**
     * The name of the IO context, that this IO node is associated with.
     */
    name: string;

    /**
     * The IO sources belonging wto this IO node.
     */
    ioSources: IoSource[];

    /**
     * The IO actors belonging to this IO node.
     */
    ioActors: IoActor[];

    /** 
     * Node-specific characteristics defined by application (optional).
     *
     * Can be used by IO routers to manage routes.
     */
    characteristics?: { [key: string]: any };
}

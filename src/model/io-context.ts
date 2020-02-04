/*! Copyright (c) 2020 Siemens AG. Licensed under the MIT License. */

import { CoatyObject } from "./object";

/**
 * Represents the context of IO routing.
 *
 * An IO context is associated with an IO router that can use its context
 * information to manage routes.
 *
 * @remarks If needed, create a custom subtype with custom properties that
 * represent application-specific context information.
 */
export interface IoContext extends CoatyObject {

    coreType: "IoContext";

    /**
     * A name that uniquely identifies this IO context *within a Coaty
     * application scope*.
     *
     * Use an expressive name that is shared by all agents defining IO nodes for
     * this context.
     *
     * @remarks The context name must be a non-empty string that does not
     * contain the following characters: `NULL (U+0000)`, `# (U+0023)`, `+
     * (U+002B)`, `/ (U+002F)`.
     */
    name: string;
}

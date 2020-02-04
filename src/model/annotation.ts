/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject, Uuid } from "./object";

export enum AnnotationStatus {

    /**
     * Set when annotation media has only been stored by the creator
     */
    StoredLocally,

    /**
     * Set when Advertise event for publishing annotation media is being sent
     */
    StorageRequest,

    /**
     * Set when annotation media was stored by a service component subscribing for annotations
     */
    Published,

    /**
     * Set when annotation media is outdated, i.e. should no longer be in use by
     * application
     */
    Outdated,
}

/**
 * Represents an annotation
 */
export interface Annotation extends CoatyObject {
    coreType: "Annotation";

    /**
     * Specific type of this annotation object
     */
    type: AnnotationType;

    /**
     * UUID of User who created the annotation
     */
    creatorId: Uuid;

    /**
     * Timestamp when annotation was issued/created.
     * Value represents the number of milliseconds since the epoc in UTC.
     * (see Date.getTime(), Date.now())
     */
    creationTimestamp: number;

    /**
     * Status of storage
     */
    status: AnnotationStatus;

    /**
     * Array of annotation media variants (optional). A variant is an object 
     * with a description key and a download url  
     */
    variants?: AnnotationVariant[];

}

/**
 * Variant object composed of a description key and a download url
 */
export interface AnnotationVariant {

    /**
     * Description key of  annotation variant
     */
    variant: string;

    /**
     * Dowload url for annotation variant
     */
    downloadUrl: string;
}

/**
 * Defines all annotation types
 */
export enum AnnotationType {
    Text,
    Image,
    Audio,
    Video,
    Object3D,
    Pdf,
    WebDocumentUrl,
    LiveDataUrl,
}

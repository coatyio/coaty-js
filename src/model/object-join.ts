/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Defines a condition for joining related objects into a result set of Coaty objects.
 * Result objects are augmented by resolving object references to related 
 * objects and by storing them in an extra property of the result object.
 * Used in combination with query events.
 */
export interface ObjectJoinCondition {

    /** 
     * Specifies the property name of an object reference to be resolved by joining.
     * 
     * An equality match is performed on the `localProperty` to the corresponding 
     * property of the related object.
     * If `isLocalPropertyArray` is specified as `true`, the value of the local 
     * property must be an array whose elements are matched for equality individually.
     * 
     * If a result object does not contain the `localProperty` the value is ignored for 
     * matching purposes.
     */
    localProperty: string;

    /** 
     * Specifies whether the value of the local property is an array
     * whose individual elements should be matched for equality against the value of the 
     * corresponding property of the related object.
     * 
     * If not specified, the value of this property defaults to `false`.
     */
    isLocalPropertyArray?: boolean;

    /**
     * Specifies the name of the extra property to be added to the result objects.
     * The extra property contains the matching objects which have been joined 
     * from related objects.
     * The extra property is an array property to support one to many relations
     * between the `localProperty` and the corresponding property of the related object
     * unless `isOneToOneRelation` is specified as `true`. In this case the extra property 
     * contains a single related object or is deleted from the result object if there is no match.
     *  
     * If the specified property name already exists in the result object, the existing 
     * property is overwritten.
     */
    asProperty: string;

    /** 
     * Specifies whether the join between the `localProperty` and the corresponding 
     * property of the related object is a one to one relation. If true, the extra property `asProperty` 
     * contains a single related object; otherwise it contains an array of related objects.
     * 
     * If not specified, the value of this property defaults to `false`.
     */
    isOneToOneRelation?: boolean;
}

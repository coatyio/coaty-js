﻿/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject } from "./object";

/**
 * Object model representing users as defined by the SCIM 2 standard
 * according to RFC7643.
 * 
 * Note that the SCIM `userName` property is represented in the 
 * `name` property of the base CoatyObject type.
 */
export interface User extends CoatyObject {

    coreType: "User";

    /**
     * SCIM userName property: A service provider's unique identifier for the user, typically
     * used by the user to directly authenticate to the service provider.
     * Often displayed to the user as their unique identifier within the
     * system (as opposed to "id" or "externalId", which are generally
     * opaque and not user-friendly identifiers).  Each User MUST include
     * a non-empty userName value.  This identifier MUST be unique across
     * the service provider's entire set of Users.  This attribute is
     * REQUIRED and is case insensitive.
     */
    name: string;

    /**
     * The components of the SCIM user's name. Service providers MAY return just
     * the full name as a single string in the formatted sub-attribute, or they
     * MAY return just the individual component attributes using the other
     * sub-attributes, or they MAY return both. If both variants are returned,
     * they SHOULD be describing the same name, with the formatted name
     * indicating how the component attributes should be combined.
     */
    names: ScimUserNames;

    /**
     * The name of the user, suitable for display to end-users.Each
     * user returned MAY include a non- empty displayName value.The name
     * SHOULD be the full name of the User being described, if known
     * (e.g., "Babs Jensen" or "Ms. Barbara J Jensen, III") but MAY be a
     * username or handle, if that is all that is available (e.g.,
     * "bjensen").The value provided SHOULD be the primary textual
     * label by which this User is normally displayed by the service
     * provider when presenting it to end- users.
     */
    displayName?: string;

    /**
     * The casual way to address the user in real life, e.g., "Bob" or
     * "Bobby" instead of "Robert".This attribute SHOULD NOT be used to
     * represent a User's username (e.g., bjensen or mpepperidge).
     */
    nickName?: string;

    /**
     * The user's title, such as "Vice President".
     */
    title?: string;

    /**
     * Used to identify the relationship between the organization and the
     * user. Typical values used might be "Contractor", "Employee",
     * "Intern", "Temp", "External", and "Unknown", but any value may be
     * used.
     */
    userType?: string;

    /**
     * Indicates the user's preferred written or spoken languages and is
     * generally used for selecting a localized user interface.The
     * value indicates the set of natural languages that are preferred.
     * The format of the value is the same as the HTTP Accept- Language
     * header field (not including "Accept-Language:") and is specified
     * in Section 5.3.5 of [RFC7231].The intent of this value is to
     * enable cloud applications to perform matching of language tags
     * [RFC4647] to the user's language preferences, regardless of what
     * may be indicated by a user agent (which might be shared), or in an
     * interaction that does not involve a user (such as in a delegated
     * OAuth 2.0 [RFC6749] style interaction) where normal HTTP
     * Accept - Language header negotiation cannot take place.
     */
    preferredLanguage?: string;

    /**
     * Used to indicate the User's default location for purposes of
     * localizing such items as currency, date time format, or numerical
     * representations.A valid value is a language tag as defined in
     * [RFC5646].Computer languages are explicitly excluded.
     *
     * A language tag is a sequence of one or more case-insensitive
     * sub - tags, each separated by a hyphen character ("-", %x2D).For
     * backward compatibility, servers MAY accept tags separated by an
     * underscore character ("_", %x5F).In most cases, a language tag
     * consists of a primary language sub- tag that identifies a broad
     * family of related languages (e.g., "en" = English) and that is
     * optionally followed by a series of sub- tags that refine or narrow
     * that language's range (e.g., "en-CA" = the variety of English as
     * communicated in Canada).  Whitespace is not allowed within a
     * language tag.Example tags include:
     * fr, en - US, es - 419, az - Arab, x - pig - latin, man - Nkoo - GN
     * See[RFC5646] for further information.
     */
    locale?: string;

    /**
     * The User's time zone, in IANA Time Zone database format [RFC6557],
     * also known as the "Olson" time zone database format [Olson - TZ]
     * (e.g., "America/Los_Angeles").
     */
    timezone?: string;

    /**
     * A Boolean value indicating the user's administrative status. The
     * definitive meaning of this attribute is determined by the service
     * provider.  As a typical example, a value of true implies that the
     * user is able to log in, while a value of false implies that the
     * user's account has been suspended.
     */
    active?: boolean;

    /**
     * This attribute is intended to be used as a means to set, replace,
     * or compare (i.e., filter for equality) a password.  The cleartext
     * value or the hashed value of a password SHALL NOT be returnable by
     * a service provider.  If a service provider holds the value
     * locally, the value SHOULD be hashed.
     */
    password?: string;

    /**
     * Email addresses for the User. The value SHOULD be specified
     * according to [RFC5321]. Service providers SHOULD canonicalize the
     * value according to [RFC5321], e.g., "bjensen@example.com" instead
     * of "bjensen@EXAMPLE.COM".The "display" sub-attribute MAY be used
     * to return the canonicalized representation of the email value.
     * The "type" sub-attribute is used to provide a classification
     * meaningful to the (human) user. The user interface should
     * encourage the use of basic values of "work", "home", and "other"
     * and MAY allow additional type values to be used at the discretion
     * of SCIM clients.
     */
    emails?: ScimMultiValuedAttribute[];

    /**
     * Phone numbers for the user. The value SHOULD be specified
     * according to the format defined in [RFC3966], e.g.,
     * 'tel:+1-201-555-0123'.  Service providers SHOULD canonicalize the
     * value according to [RFC3966] format, when appropriate.  The
     * "display" sub-attribute MAY be used to return the canonicalized
     * representation of the phone number value.  The sub-attribute
     * "type" often has typical values of "work", "home", "mobile",
     * "fax", "pager", and "other" and MAY allow more types to be defined
     * by the SCIM clients.
     */
    phoneNumbers?: ScimMultiValuedAttribute[];

    /**
     * Instant messaging address for the user.  No official
     * canonicalization rules exist for all instant messaging addresses,
     * but service providers SHOULD, when appropriate, remove all
     * whitespace and convert the address to lowercase.  The "type"
     * sub-attribute SHOULD take one of the following values: "aim",
     * "gtalk", "icq", "xmpp", "msn", "skype", "qq", "yahoo", or "other"
     * (representing currently popular IM services at the time of this
     * writing).  Service providers MAY add further values if new IM
     * services are introduced and MAY specify more detailed
     * canonicalization rules for each possible value.
     */
    ims?: ScimMultiValuedAttribute[];

    /**
     * A URI that is a uniform resource locator (as defined in
     * Section 1.1.3 of [RFC3986]) that points to a resource location
     * representing the user's image.  The resource MUST be a file (e.g.,
     * a GIF, JPEG, or PNG image file) rather than a web page containing
     * an image. Service providers MAY return the same image in
     * different sizes, although it is recognized that no standard for
     * describing images of various sizes currently exists. Note that
     * this attribute SHOULD NOT be used to send down arbitrary photos
     * taken by this user; instead, profile photos of the user that are
     * suitable for display when describing the user should be sent.
     * Instead of the standard canonical values for type, this attribute
     * defines the following canonical values to represent popular photo
     * sizes: "photo" and "thumbnail".
     */
    photos?: ScimMultiValuedAttribute[];

    addresses?: ScimAddress[];

    /**
     * A list of groups to which the user belongs, either through direct
     * membership, through nested groups, or dynamically calculated.  The
     * values are meant to enable expression of common group-based or
     * role-based access control models, although no explicit
     * authorization model is defined.  It is intended that the semantics
     * of group membership and any behavior or authorization granted as a
     * result of membership are defined by the service provider.  The
     * canonical types "direct" and "indirect" are defined to describe
     * how the group membership was derived.  Direct group membership
     * indicates that the user is directly associated with the group and
     * SHOULD indicate that clients may modify membership through the
     * "Group" resource.  Indirect membership indicates that user
     * membership is transitive or dynamic and implies that clients
     * cannot modify indirect group membership through the "Group"
     * resource but MAY modify direct group membership through the
     * "Group" resource, which may influence indirect memberships.  If
     * the SCIM service provider exposes a "Group" resource, the "value"
     * sub-attribute MUST be the "id", and the "$ref" sub-attribute must
     * be the URI of the corresponding "Group" resources to which the
     * user belongs.  Since this attribute has a mutability of
     * "readOnly", group membership changes MUST be applied via the
     * "Group" Resource (Section 4.2). This attribute has a mutability
     * of "readOnly".
     */
    groups?: ScimMultiValuedAttribute[];

    /**
     * entitlements
     * A list of entitlements for the user that represent a thing the
     * user has.  An entitlement may be an additional right to a thing,
     * object, or service.  No vocabulary or syntax is specified; service
     * providers and clients are expected to encode sufficient
     * information in the value so as to accurately and without ambiguity
     * determine what the user has access to.  This value has no
     * canonical types, although a type may be useful as a means to scope
     * entitlements.
     */
    entitlements?: any[];

    /**
     * A list of roles for the user that collectively represent who the
     * user is, e.g., "Student", "Faculty".  No vocabulary or syntax is
     * specified, although it is expected that a role value is a String
     * or label representing a collection of entitlements.  This value
     * has no canonical types.
     */
    roles?: string[];

    /**
     * A list of certificates associated with the resource (e.g., a
     * User). Each value contains exactly one DER- encoded X.509
     * certificate(see Section 4 of [RFC5280]), which MUST be base64
     * encoded per Section 4 of [RFC4648].A single value MUST NOT
     * contain multiple certificates and so does not contain the encoding
     * "SEQUENCE OF Certificate" in any guise.
     */
    x509Certificates?: string[];

}

/**
 * The components of the SCIM user's name.
 * Service providers MAY return
 * just the full name as a single string in the formatted
 * sub-attribute, or they MAY return just the individual component
 * attributes using the other sub-attributes, or they MAY return
 * both. If both variants are returned, they SHOULD be describing
 * the same name, with the formatted name indicating how the
 * component attributes should be combined.
 */
export interface ScimUserNames {

    /**
     * The full name, including all middle names, titles, and
     * suffixes as appropriate, formatted for display (e.g.,
     * "Ms. Barbara Jane Jensen, III").
     */
    formatted?: string;

    /**
     * The family name of the User, or last name in most
     * Western languages (e.g., "Jensen" given the full name
     * "Ms. Barbara Jane Jensen, III").
     */
    familyName?: string;

    /**
     * The given name of the User, or first name in most
     * Western languages (e.g., "Barbara" given the full name
     * "Ms. Barbara Jane Jensen, III").
     */
    givenName?: string;

    /**
     * The middle name(s) of the User (e.g., "Jane" given the
     * full name "Ms. Barbara Jane Jensen, III").
     */
    middleName?: string;

    /**
     * The honorific prefix(es) of the User, or title in
     * most Western languages (e.g., "Ms." given the full name
     * Ms. Barbara Jane Jensen, III").
     */
    honorificPrefix?: string;

    /**
     * The honorific suffix(es) of the User, or suffix
     * in most Western languages (e.g., "III" given the full name
     * "Ms. Barbara Jane Jensen, III").
     */
    honorificSuffix?: string;

}

export interface ScimMultiValuedAttribute {

    /**
     * A label indicating the attribute's function, e.g., "work" or
     * "home".
     */
    type: string;

    /**
     * The attribute's significant value, e.g., email address, phone
     * number.
     */
    value: string;

    /**
     * A Boolean value indicating the 'primary' or preferred attribute
     * value for this attribute, e.g., the preferred mailing address or
     * the primary email address. The primary attribute value "true"
     * MUST appear no more than once. If not specified, the value of
     * "primary" SHALL be assumed to be "false".
     */
    primary?: boolean;

    /**
     * A human-readable name, primarily used for display purposes and
     * having a mutability of "immutable".
     */
    display?: string;

}

export interface ScimAddress extends ScimMultiValuedAttribute {
    /**
     *  The full mailing address, formatted for display or use
     * with a mailing label. This attribute MAY contain newlines.
     */
    formatted?: string;

    /**
     * The full street address component, which may
     * include house number, street name, P.O.box, and multi- line
     * extended street address information. This attribute MAY
     * contain newlines.
     */
    streetAddress?: string;

    /**
     *  The city or locality component.
     */
    locality?: string;

    /**
     * The state or region component.
     */
    region?: string;

    /**
     * The zip code or postal code component.
     */
    postalCode?: string;

    /**
     * The country name component.When specified, the value
     * MUST be in ISO 3166-1 "alpha-2" code format [ISO3166]; e.g.,
     * the United States and Sweden are "US" and "SE", respectively.
     */
    country?: string;

}

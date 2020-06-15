---
layout: default
title: Coaty JS Documentation
---

# Rights Management in Coaty Applications

## Table of Contents

* [Scope](#scope)
* [Prerequisites](#prerequisites)
* [Role based rights management](#role-based-rights-management)
* [Implementing rights management in broker based communication infrastructure](#implementing-rights-management-in-broker-based-communication-infrastructure)
* [Authentication with the Coaty framework](#authentication-with-the-coaty-framework)

## Scope

Rights management in a Coaty application should securely control access to
resources for all system participants, such as users, devices, and services.
It should cover the following aspects:

* control access to application data on a per-object type (or object) level:
  Which authenticated identity is allowed to read or write which application
  objects?
* control communication messaging on a per-component basis: Which component
  associated to a specific user is allowed to publish or subscribe to which
  communication events/topics?

## Prerequisites

To implement rights management in a Coaty application, secure authenticated
communications must be established between distributed Coaty agents. This is to
ensure that an agent that claims access to certain resources always has the
identity it pretends to have.

Identity access management (IAM) should be kept separate from
the Coaty application because it is highly dependent on the
IT infrastructure in which the application is integrated.

To set up an authenticated communication in an MQTT based IoT network, follow
these steps:

* On login/start-up the user authenticates against the installed IAM, providing
  his/her credentials.
* On successful authentication, IAM returns an authentication token.
* Pass user ID and authentication token to the Coaty communication binding using
  binding-specific options. For example, use user/password options in the MQTT
  binding.
* On connection the MQTT client passes this information to the MQTT broker.
* The broker checks authentication information against the IAM. Connections are
  only set up if this check succeeds.

Note that authentication of userless application components, such as backend
services, follows the same approach: define service "user" accounts in IAM that
serve as identities for individual services or all services (common service
identity). Each service or group of services deployed by the Coaty ecosystem is
assigned such a service user and an automatically generated authentication
token. This token can also be used to implement license expiration by
invalidating the generated token in the IAM.

Authentication as described above will only make sense when the traffic between
Coaty agents is secured at least on the TCP network layer to prevent spoofing
and man-in-the-middle attacks. To secure communications on the network layer
instruct the Coaty communication binding to set up a TLS connection by passing
in an X509 user certificate (using binding-specific configuration options).

## Role based rights management

ACLs should not be assigned to individual users but to user groups or user roles.

* User management should provide a predefined set of user groups/roles. Defining
  application-specific user groups/roles should also be supported.
* Individual users are then assigned to user groups/roles by user management.
* To control access on objects/object types and communication events, access
  rights are mapped onto the defined user groups/roles.
* To check access the assigned groups/roles of an authenticated user are matched
  against the defined ACLs.

In the Coaty framework you can define user groups/roles by utilizing the `groups`
and/or `roles` properties of the `User` object type.

## Implementing rights management in broker based communication infrastructure

* Rights management should be implemented by the Coaty communication
  infrastructure component, such as an MQTT broker, to keep it centralised for
  applications.
* The broker keeps track of authenticated clients by the mechanism described in
  the previous section.
* The broker can access ACLs (access control lists) that control (1) access to
  objects/object types (2) access to publish-subscribe communication messages by
  event types as part of the communication topic.
* ACLs are checked on every communication message received by the broker, i.e.
  publications and subscriptions.
* ACLs should be configurable by a tool that is part of your core
  infrastructure.

The following sequence diagram depicts the control flow for authentication and
authorization with an MQTT broker:

```
Client                          IAM              MQTT Broker
   |                             |                   |
   | Authenticate Credentials    |                   |
   |---------------------------->|                   |
   |                  Auth Token |                   |
   |<----------------------------|                   |
   |                                                 |
   | Connect with auth token / cert                  |
   |------------------------------------------------>|
   |                             |  Check auth token |
   |                             |<----------------->|
   |<------------------------------------------------|
   |                      Accept / Reject connection |
   |                                                 |
   | Publish/Subscribe with auth token               |
   |------------------------------------------------>|
   |                             |  Check auth token |             |-----------|
   |                             |<----------------->| Check ACL   | User Mgmt |
   |                             |                   |<----------->|           |
   |                             |                   | Check Topic |    ACLs   |
   |                             |                   |             |-----------|
```

Note that the ACL-Rights Management component depicted in the sequence diagram should
never expose detailed information on request. Ideally, all checks should just return
one of the values `accepted` or `rejected`.

## Authentication with the Coaty framework

1. Acquire authentication token by authenticating against IAM in a separate
   step.
2. Provide user ID and authentication token as well as the user certificate as
   appropriate options of the communication binding in the Coaty container
   configuration (see code example below, where you could also add the auth
   token to the user field and skip the password field).
3. On connection the Communication Manager will pass this information
   transparently to the broker.

```ts
import { MqttBinding } from "@coaty/binding.mqtt";

const configuration: Configuration =
    {
        ...
        communication: {
            binding: MqttBinding.withOptions({
                brokerUrl: <broker connection URL>,

                // The username string
                username: "<username>",

                // The authentication token string
                password: "<authentication-token>",

                tlsOptions: {
                    // Certificate's private key
                    key: fs.readFileSync("./keys/key.pem"),

                    // Certificate
                    cert: fs.readFileSync("./keys/cert.pem"),

                    // Optional: The trusted CA list will be used to determine if broker is authorized
                    ca: fs.readFileSync("./crt.ca.cg.pem"),

                    // Set to false for self-signed certificates, but NEVER use for production
                    rejectUnauthorized: true|false,
                }
            })
        },
        ...
    });
```

---
Copyright (c) 2018 Siemens AG. This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).

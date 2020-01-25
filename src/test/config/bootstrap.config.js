/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

module.exports = {
  common: {
    associatedUser: {
      name: "Fred",
      coreType: "User",
      objectType: "coaty.User",
      objectId: "f608cdb1-3350-4c62-8feb-4589f26f2efe",
      names: {
        givenName: "Fred",
        familyName: "Feuerstein",
      }
    },
    extra: { testProp: 4711 }
  },
  communication: {
    shouldAutoStart: true,
    brokerUrl: "mqtt://192.168.0.112"
  },
  controllers: {
    MockObjectController1: { mockCtrlProp: 1 },
    MockObjectController3: { mockCtrlProp: 3 },
    MockMyController1: { mockIoProp: "io1" },
    MockMyController2: { mockIoProp: "io2" }
  }
};
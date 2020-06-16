/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

module.exports = {
    common: {
        agentIdentity: {
            name: "Barney",
        },
        extra: { testProp: 4711 },
    },
    communication: {
        shouldAutoStart: true,
    },
    controllers: {
        MockObjectController1: { mockCtrlProp: 1 },
        MockObjectController3: { mockCtrlProp: 3 },
        MockMyController1: { mockIoProp: "io1" },
        MockMyController2: { mockIoProp: "io2" }
    }
};
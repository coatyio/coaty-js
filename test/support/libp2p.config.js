/*! Copyright (c) 2020 Siemens AG. Licensed under the MIT License. */

const path = require("path");

module.exports = {

    initBinding: (debug) => {
        // Configure global debug modes for specific libp2p modules.
        if (debug) {
            // For complete libp2p debugging use "libp2p,libp2p:*"
            // process.env.DEBUG = "libp2p,libp2p:mdns,libp2p:gossipsub,libp2p:floodsub";
        }

        const Libp2pBinding = require("@coaty/binding.libp2p").Libp2pBinding;

        return Libp2pBinding.withOptions({

            // Use local loopback interface for testing.
            listenAddresses: ["/ip4/127.0.0.1/tcp/0"],

            // 0:debug, 1:info, 2:error
            logLevel: debug ? 0 : 2,
        });
    },

    // Execute the tests.
    withTests: (debug, testRunner) => {
        testRunner();
    },
};

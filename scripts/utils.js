/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/* Utility functions for coaty-scripts */

const chalk = require("chalk");

function logInfo(message) {
    console.log(chalk.yellow("# " + message));
}

module.exports.logInfo = logInfo;

function logError(message) {
    console.error(chalk.red("# " + message));
}

module.exports.logError = logError;

function logMessage(message) {
    console.log(chalk.cyan("# " + message));
}

module.exports.logMessage = logMessage;

/**
 * Returns a string in ISO 8601 format including timezone offset information.
 * @param date a Date object
 * @param includeMillis whether to include milliseconds in the string (defaults to false)
 */
function toLocalIsoString(date, includeMillis) {
    if (includeMillis === undefined) {
        includeMillis = false;
    }
    const pad = (n, length, padChar) => {
        if (length === undefined) { length = 2; }
        if (padChar === undefined) { padChar = "0"; }
        let str = "" + n;
        while (str.length < length) {
            str = padChar + str;
        }
        return str;
    };
    const getOffsetFromUTC = () => {
        const offset = date.getTimezoneOffset();
        if (offset === 0) {
            return "Z";
        }
        return (offset < 0 ? "+" : "-")
            + pad(Math.abs(offset / 60), 2) + ":"
            + pad(Math.abs(offset % 60), 2);
    };
    return date.getFullYear() + "-"
        + pad(date.getMonth() + 1) + "-"
        + pad(date.getDate()) + "T"
        + pad(date.getHours()) + ":"
        + pad(date.getMinutes()) + ":"
        + pad(date.getSeconds())
        + (includeMillis ? "." + pad(date.getMilliseconds(), 3) : "")
        + getOffsetFromUTC();
}

module.exports.toLocalIsoString = toLocalIsoString;

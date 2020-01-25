/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Returns a string in ISO 8601 format including timezone offset information.
 * @param date a Date object
 * @param includeMillis whether to include milliseconds in the string (defaults to false)
 */
export function toLocalIsoString(date: Date, includeMillis: boolean = false) {
    const pad = (n: number, length: number = 2, padChar: string = "0") => {
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

/**
 * Returns a string in ISO 8601 format for a duration.
 * @param duration a duration given in milliseconds
 */
export function toDurationIsoString(duration: number) {
    if (duration < 0) {
        throw new Error("Duration cannot be negative.");
    }

    // Just return the duration in form of seconds.
    return "PT" + (duration / 1000) + "S";
}

/**
 * Defines a time interval using the number of milliseconds since the epoc in UTC
 * instead of ISO 8601 standard time intervals. This is used for consistency within
 * the system.
 * 
 * An interval can have four formats:
 * - start and end timestamps
 * - start timestamp and duration
 * - duration and end timestamp
 * - duration only
 * 
 * The ISO 8601 standard string can be created using the function `toLocalTimeIntervalIsoString` 
 * in the `@coaty/core` module.
 */
export interface TimeInterval {
    /**
     * Start timestamp of the interval.
     * Value represents the number of milliseconds since the epoc in UTC.
     * (see Date.getTime(), Date.now())
     * 
     * This can be either used with end timestamp or a duration but not both.
     */
    start?: number;

    /**
     * End timestamp of the interval.
     * Value represents the number of milliseconds since the epoc in UTC.
     * (see Date.getTime(), Date.now())
     * 
     * This can be either used with start timestamp or a duration but not both.
     */
    end?: number;

    /**
     * Duration of the interval. Value represents the number of milliseconds.
     * 
     * This can be either used with start or end timestamp but not both.
     */
    duration?: number;
}

export function isTimeInterval(obj: any): boolean {
    if (obj === undefined || typeof obj !== "object") {
        return false;
    }

    return isValidTimeInterval(obj as TimeInterval);
}

/**
 * Returns whether the given time interval object is valid.
 */
export function isValidTimeInterval(interval: TimeInterval): boolean {
    if (!interval) {
        return false;
    }

    const isValidNumber = (value) => {
        return typeof value === "number" && value >= 0;
    };

    if (interval.duration !== undefined) {
        if (!isValidNumber(interval.duration)) {
            return false; // Duration is not a valid number.
        }

        if (interval.start === undefined) {
            // No start timestamp. Either the interval only has duration
            // information or a valid end timestamp.
            return interval.end === undefined || isValidNumber(interval.end);
        } else {
            // Interval has start timestamp. There can be no end timestamp and
            // start should be a valid value.
            return interval.end === undefined && isValidNumber(interval.start);
        }
    } else {
        // Duration is undefined. Both start and end timestamp should be defined
        // and valid.
        return interval.start !== undefined && isValidNumber(interval.start)
            && interval.end !== undefined && isValidNumber(interval.end);
    }
}

/**
 * Returns a string in ISO 8601 format for a time interval including timezone offset information.
 * @param interval a TimeInterval object
 * @param includeMillis whether to include milliseconds in the string (defaults to false)
 */
export function toLocalIntervalIsoString(interval: TimeInterval, includeMillis: boolean = false) {
    if (!isValidTimeInterval(interval)) {
        throw new Error ("Time interval is not valid: " + interval);
    }

    if (interval.duration !== undefined) {
        const duration = toDurationIsoString(interval.duration);
        if (interval.start !== undefined) {
            return toLocalIsoString(new Date(interval.start), includeMillis) + "/" + duration;
        } else {
            return duration + "/" + toLocalIsoString(new Date(interval.end), includeMillis);
        }
    } else {
        return toLocalIsoString(new Date(interval.start), includeMillis) + "/"
            + toLocalIsoString(new Date(interval.end), includeMillis);
    }
}

/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Provides static methods for combining asynchronous promise operations.
 */
export class Async {

    /**
     * The inSeries method applies an asynchronous operation against each
     * value of an array of items in series (from left-to-right).
     *
     * The operation function returns a promise that is resolved
     * when the operation completes successfully and rejected when the operation fails.
     * The resolved value should be `false` if the iteration should break, i.e. terminate
     * prematurely without executing the remaining operations. If any other value
     * is resolved the iteration continues.
     *
     * The inSeries method returns a promise that is resolved with a boolean value
     * indicating whether the iteration has terminated prematurely (`false`) or not (`true`).
     * If one of the async operations is rejected, the returned promise is rejected
     * immediately and inSeries fails fast.
     */
    static inSeries<T>(items: T[], asyncFunc: (item: T, index?: number) => Promise<boolean | any>): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const series = (index: number) => {
                if (index === items.length) {
                    resolve(true);
                    return;
                }

                // Intentionally use promise nesting instead of promise chaining 
                // to avoid generating one promise per array item initially.
                // This would not scale well for a large number of items.
                asyncFunc(items[index], index)
                    .then(didNotBreak => {
                        if (didNotBreak === false) {
                            resolve(false);
                        } else {
                            series(index + 1);
                        }
                    })
                    .catch(error => reject(error));
            };

            series(0);
        });
    }

    /**
     * The reduce method applies an asynchronous operation against an
     * accumulator and each value of an array of items in series (from left-to-right)
     * to reduce it to a single value.
     *
     * The operation function is applied in series to each item in the sequence.
     * It returns a promise that is resolved when the operation completes successfully
     * and rejected when the operation fails.
     *
     * The value that results from the reduction is resolved in the returned promise.
     * If one of the async operations is rejected, the returned promise is rejected
     * immediately with the value of the rejected promise and reduce fails fast.
     */
    static reduce<T, R>(
        items: T[],
        asyncFunc: (item: T, previousValue?: R, index?: number) => Promise<R>,
        initialValue?: R): Promise<R> {
        return new Promise<R>((resolve, reject) => {
            const series = (index: number, result: R) => {
                if (index === items.length) {
                    resolve(result);
                    return;
                }

                // Intentionally use promise nesting instead of promise chaining 
                // to avoid generating one promise per array item initially.
                // This would not scale well for a large number of items.
                asyncFunc(items[index], result, index)
                    .then(value => {
                        series(index + 1, value);
                    })
                    .catch(error => reject(error));
            };

            series(0, initialValue);
        });
    }

    /**
     * Returns a promise that rejects after the given number of milliseconds
     * if the passed in promise doesn't resolve or reject in the meantime;
     * otherwise the returned promise resolves or rejects with the passed in
     * promise. 
     * 
     * @param timeoutMillis  number of milliseconds after which to reject
     * @param promise as promise
     */
    static withTimeout<T>(timeoutMillis: number, promise: Promise<T>): Promise<T> {

        // Create a promise that rejects after the given number of milliseconds
        const timeout = new Promise<T>((resolve, reject) => {
            setTimeout(() => {
                reject(new Error(`Timed out after ${timeoutMillis} ms`));
            }, timeoutMillis);
        });

        return Promise.race([
            promise,
            timeout,
        ]);
    }

}

/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Provides static methods for combining asynchronous promise operations.
 */
export class Async {

    /**
     * This method applies an asynchronous operation against each value of an
     * array of items in series (from left-to-right).
     *
     * The async operation function returns a promise that is resolved when the
     * operation completes successfully and rejected when the operation fails.
     * The resolved value should be `false` if the iteration should break, i.e.
     * terminate prematurely without executing the remaining operations. If any
     * other value is resolved the iteration continues.
     *
     * The `inSeries ` method returns a promise that is resolved with the index
     * of the last item that the async operation function has been applied to
     * successfully. The index is `-1`, if an empty items array has been
     * specified. If the index is less than that of the last element in the
     * items array, operation has terminated prematurely after executing the
     * item with the index returned.
     *
     * The returned promise is rejected immediately and `inSeries` fails fast,
     * if any of the async operations is rejected.
     */
    static inSeries<T>(items: T[], asyncFunc: (item: T, index?: number) => Promise<boolean | any>): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const series = (index: number) => {
                if (index === items.length) {
                    resolve(index - 1);
                    return;
                }

                // Intentionally use promise nesting instead of promise chaining 
                // to avoid generating one promise per array item initially.
                // This would not scale well for a large number of items.
                asyncFunc(items[index], index)
                    .then(didNotBreak => {
                        if (didNotBreak === false) {
                            resolve(index);
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
     * accumulator and each value of an array of items in series (from
     * left-to-right) to reduce it to a single value.
     *
     * The operation function is applied in series to each item in the sequence.
     * It returns a promise that is resolved when the operation completes
     * successfully and rejected when the operation fails.
     *
     * The value that results from the reduction is resolved in the returned
     * promise. If one of the async operations is rejected, the returned promise
     * is rejected immediately with the value of the rejected promise and reduce
     * fails fast.
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
     * Returns a promise that rejects after the given number of milliseconds if
     * the passed in promise doesn't resolve or reject in the meantime;
     * otherwise the returned promise resolves or rejects with the passed in
     * promise. 
     *
     * @param timeoutMillis  number of milliseconds after which to reject
     * @param promise a promise
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

/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { DbAdapterBase } from "../db-adapter";

import { SQL, SqlQueryBuilder } from "../db-operations";

/**
 * Base implementation class for common functionality of SQLite adapters.
 */
export class SqLiteBaseAdapter extends DbAdapterBase {

    private static DEFAULT_KV_STORE = "__coaty_default_kvstore";

    /* IDbLocalStore */

    addStore(name: string): Promise<any> {
        return this.query(this.getStoreQuery("CREATE", name));
    }

    removeStore(name: string): Promise<any> {
        if (!name) {
            Promise.reject(new Error(`Cannot remove store '${name}'`));
        }
        return this.query(this.getStoreQuery("DROP", name));
    }


    getValue(key: string, store?: string): Promise<any> {
        return this.query(this.getKvQuery("GET", store, key))
            .then(result => result.rows.length > 0 ?
                JSON.parse(result.rows[0].value) :
                undefined);
    }

    getValues(store?: string): Promise<any> {
        return this.query(this.getKvQuery("GETV", store))
            .then(result => {
                const obj = {};
                result.rows.forEach(row => {
                    obj[row.key] = JSON.parse(row.value);
                });
                return obj;
            });
    }

    setValue(key: string, value: any, store?: string): Promise<any> {
        return this.query(this.getKvQuery("SET", store, key, JSON.stringify(value)));
    }

    deleteValue(key: string, store?: string): Promise<any> {
        return this.query(this.getKvQuery("DELETE", store, key));
    }

    clearValues(store?: string): Promise<any> {
        return this.query(this.getKvQuery("CLEAR", store));
    }

    /* SQL query builders */

    protected getSqlQuery(sql: SqlQueryBuilder): [string, any[]] {
        return sql("?", false, 0, id => this.asIdent(id), lit => this.asLiteral(lit));
    }

    protected getStoreQuery(op: "CREATE" | "DROP", store?: string) {
        const tableName = store || SqLiteBaseAdapter.DEFAULT_KV_STORE;
        switch (op) {
            case "CREATE":
                return SQL`CREATE TABLE IF NOT EXISTS ${tableName}{IDENT}
                             (key text primary key, value text)`;
            case "DROP":
                return SQL`DROP TABLE IF EXISTS ${tableName}{IDENT}`;
            default:
                throw new Error(`Unhandled store operation ${op}`);
        }
    }

    protected getKvQuery(op: "GET" | "GETV" | "SET" | "DELETE" | "CLEAR", store: string, key?: string, value?: any) {
        const tableName = store || SqLiteBaseAdapter.DEFAULT_KV_STORE;
        switch (op) {
            case "GET":
                return SQL`SELECT value from ${tableName}{IDENT} 
                             WHERE key = ${key} limit 1`;
            case "GETV":
                return SQL`SELECT key, value from ${tableName}{IDENT}`;
            case "SET":
                return SQL`INSERT OR REPLACE INTO ${tableName}{IDENT}(key, value)
                             VALUES (${key}, ${value})`;
            case "DELETE":
                return SQL`DELETE FROM ${tableName}{IDENT}
                             WHERE key = ${key}`;
            case "CLEAR":
                return SQL`DELETE FROM ${tableName}{IDENT}`;
            default:
                throw new Error(`Unhandled key-value operation ${op}`);
        }
    }

    /* Helpers */

    /**
     * Returns the given string suitably quoted to be used as an identifier
     * in a SQLite statement string. Quotes are always added to disable
     * case folding. Embedded quotes are properly doubled.
     * @param text a value to be used as identifier
     */
    protected asIdent(text: any) {
        if (typeof text !== "string") {
            text = JSON.stringify(text);
        }

        const len = text.length;
        const escape = "\"";
        let escaped = escape;

        for (let i = 0; i < len; i++) {
            const c = text[i];
            if (c === escape) {
                escaped += c + c;
            } else {
                escaped += c;
            }
        }

        escaped += escape;

        return escaped;
    }

    /**
     * Returns the given string suitably quoted to be used as a string literal
     * in a SQLite statement string. Embedded single-quotes are properly doubled.
     * @param text a value to be used as literal
     */
    protected asLiteral(text: any) {
        if (typeof text !== "string") {
            text = JSON.stringify(text);
        }

        const len = text.length;
        const escape = "'";
        let escaped = escape;

        for (let i = 0; i < len; i++) {
            const c = text[i];
            if (c === escape) {
                escaped += c + c;
            } else {
                escaped += c;
            }
        }

        escaped += escape;

        return escaped;
    }

}

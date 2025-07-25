/**
 * Schema Extend register
 */
export class SchemaExtends {

    /**
     * Instance
     * @protected
     */
    protected static _instance: SchemaExtends|null = null;

    /**
     * Get Instance
     * @return {SchemaExtends}
     */
    public static getInstance(): SchemaExtends {
        if (this._instance === null) {
            this._instance = new SchemaExtends();
        }

        return this._instance;
    }

    /**
     * Map of extends
     * @protected
     */
    protected _mapExtends: Map<string, string> = new Map<string, string>();

    /**
     * Constructor
     */
    public constructor() {
        this._mapExtends.set('object', 'Vts.object');
        this._mapExtends.set('object2', 'Vts.object2');
    }

    /**
     * Set extend (new/overwrite)
     * @param {string} uuid
     * @param {string} name
     */
    public setExtend(uuid: string, name: string): void {
        this._mapExtends.set(uuid, name);
    }

    /**
     * Return all extends
     * @param {string[]|null} excludeKey
     */
    public getExtends(excludeKey: string[]|null = null): Map<string, string> {
        if (excludeKey) {
            return new Map(
                Array.from(this._mapExtends.entries()).filter(([key]) => excludeKey.indexOf(key) === -1)
            );
        }

        return this._mapExtends;
    }

    /**
     * Return the name
     * @param {string} extend
     * @return {string|null}
     */
    public getExtendNameBy(extend: string): string|null {
        return this._mapExtends.get(extend) ?? null;
    }

    /**
     * Is extend a Schema
     * @param {string} extend
     * @return {boolean}
     */
    public isExtendASchema(extend: string): boolean {
        return extend.length > 8;
    }

    /**
     * Get extend id by name
     * @param {string} name
     * @return {string|null}
     */
    public getExtendIdByName(name: string): string|null {
        for (const [id, tname] of this._mapExtends.entries()) {
            if (name === tname) {
                return id;
            }
        }

        return null;
    }
}
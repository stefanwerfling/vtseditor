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
     * Map of schema extends
     * @protected
     */
    protected _mapSchemaExtends: Map<string, string> = new Map<string, string>();

    /**
     * Constructor
     */
    public constructor() {
        this._mapExtends.set('object', 'Vts.object');
        this._mapExtends.set('object2', 'Vts.object2');
    }

    /**
     * Return a map with all types
     * @return {Map<string, string>}
     * @protected
     */
    protected _getAllExtends(): Map<string, string> {
        return new Map<string, string>([
            ...this._mapExtends,
            ...this._mapSchemaExtends
        ]);
    }

    /**
     * Set extend (new/overwrite)
     * @param {string} uuid
     * @param {string} name
     */
    public setExtend(uuid: string, name: string): void {
        this._mapSchemaExtends.set(uuid, name);
    }

    /**
     * Return all extends
     * @param {string[]|null} excludeKey
     * @param {boolean} onlySchemas
     * @return {Map<string, string>}
     */
    public getExtends(excludeKey: string[]|null = null, onlySchemas: boolean = false): Map<string, string> {
        let allExtends = this._getAllExtends();

        if (onlySchemas) {
            allExtends = this._mapSchemaExtends;
        }

        if (excludeKey) {
            return new Map(
                Array.from(allExtends.entries()).filter(([key]) => excludeKey.indexOf(key) === -1)
            );
        }

        return allExtends;
    }

    /**
     * Return the name
     * @param {string} extend
     * @return {string|null}
     */
    public getExtendNameBy(extend: string): string|null {
        const allExtends = this._getAllExtends();
        return allExtends.get(extend) ?? null;
    }

    /**
     * Is extend a Schema
     * @param {string} unid
     * @return {boolean}
     */
    public isExtendASchema(unid: string): boolean {
        return this._mapSchemaExtends.has(unid);
    }

    /**
     * Get extend id by name
     * @param {string} name
     * @return {string|null}
     */
    public getExtendIdByName(name: string): string|null {
        const allExtends = this._getAllExtends();

        for (const [id, tname] of allExtends.entries()) {
            if (name === tname) {
                return id;
            }
        }

        return null;
    }
}
/**
 * Schema types
 */
export class SchemaTypes {

    /**
     * Instance
     * @protected
     */
    protected static _instance: SchemaTypes|null = null;

    /**
     * Return an instance of SchemaTypes
     * @return {SchemaTypes}
     */
    public static getInstance(): SchemaTypes {
        if (this._instance === null) {
            this._instance = new SchemaTypes();
        }

        return this._instance;
    }

    /**
     * Map types
     * @protected
     */
    protected _mapTypes: Map<string, string> = new Map<string, string>();

    /**
     * Map schema types
     * @protected
     */
    protected _mapSchemaTypes: Map<string, string> = new Map<string, string>();

    /**
     * Map enum types
     * @protected
     */
    protected _mapEnumTypes: Map<string, string> = new Map<string, string>();

    /**
     * Construcotr
     */
    public constructor() {
        this._mapTypes.set('string', 'String');
        this._mapTypes.set('number', 'Number');
        this._mapTypes.set('boolean', 'Boolean');
        this._mapTypes.set('or', 'Or');
        this._mapTypes.set('null', 'Null');
        this._mapTypes.set('unknown', 'Unknown');
        this._mapTypes.set('undefined', 'Undefined');
        this._mapTypes.set('true', 'True');
        this._mapTypes.set('false', 'False');
        this._mapTypes.set('date', 'Date');
        this._mapTypes.set('datestring', 'DateString');
    }

    /**
     * Return a map with all types
     * @return {Map<string, string>}
     * @protected
     */
    protected _getAllTypes(): Map<string, string> {
        return new Map<string, string>([
            ...this._mapTypes,
            ...this._mapSchemaTypes,
            ...this._mapEnumTypes
        ]);
    }

    /**
     * Return the Vts Types
     * @return {Map<string, string>}
     */
    public getVtsTypes(): Map<string, string> {
        return this._mapTypes;
    }

    /**
     * Return the schema types
     * @return {Map<string, string>}
     */
    public getSchemaTypes(): Map<string, string> {
        return this._mapSchemaTypes;
    }

    /**
     * Return the enum types
     * @return {Map<string, string>}
     */
    public getEnumTypes(): Map<string, string> {
        return this._mapEnumTypes;
    }

    /**
     * Return all types
     * @param {string} excludeKey
     */
    public getTypes(excludeKey: string[]|null = null): Map<string, string> {
        const allTypes = this._getAllTypes();

        if (excludeKey) {
            return new Map(
                Array.from(allTypes.entries()).filter(([key]) => excludeKey.indexOf(key) === -1)
            );
        }

        return allTypes;
    }

    /**
     * Set a type
     * @param {string} uuid
     * @param {string} name
     */
    public setType(uuid: string, name: string): void {
        this._mapSchemaTypes.set(uuid, name);
    }

    /**
     * Set a enum
     * @param {string} uuid
     * @param {string} name
     */
    public setEnumType(uuid: string, name: string): void {
        this._mapEnumTypes.set(uuid, name);
    }

    /**
     * Is type a schema
     * @param {string} type
     * @return {boolean}
     */
    public isTypeASchema(type: string): boolean {
        if (this._mapSchemaTypes.has(type) ) {
            return true;
        }

        return this._mapEnumTypes.has(type);
    }

    /**
     * Return the name
     * @param {string} type
     * @return {string|null}
     */
    public getTypeNameBy(type: string): string|null {
        const allTypes = this._getAllTypes();

        return allTypes.get(type) ?? null;
    }

}
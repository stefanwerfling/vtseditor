import {MapVtsComplex, MapVtsExtends, MapVtsSimple, MapVtsSimple2} from '../../SchemaTypes/SchemaTypes.js';

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
    protected _mapTypes: Map<string, string> = new Map<string, string>([
        ...MapVtsSimple,
        ...MapVtsSimple2
    ]);

    /**
     * Map of vts extends
     * @protected
     */
    protected _mapVtsExtends: Map<string, string> = new Map<string, string>([
        ...MapVtsExtends,
        ...MapVtsComplex
    ]);

    /**
     * Map of vts simple extends
     * @protected
     */
    protected _mapVtsSimpleExtends: Map<string, string> = new Map<string, string>([
        ...MapVtsSimple
    ]);

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
     * @param {string[]|null} excludeKey
     * @return {Map<string, string>}
     */
    public getSchemaTypes(excludeKey: string[]|null = null): Map<string, string> {
        if (excludeKey) {
            return new Map(
                Array.from(this._mapSchemaTypes.entries()).filter(([key]) => excludeKey.indexOf(key) === -1)
            );
        }

        return this._mapSchemaTypes;
    }

    /**
     * Return the enum types
     * @param {string[]|null} excludeKey
     * @return {Map<string, string>}
     */
    public getEnumTypes(excludeKey: string[]|null = null): Map<string, string> {
        if (excludeKey) {
            return new Map(
                Array.from(this._mapEnumTypes.entries()).filter(([key]) => excludeKey.indexOf(key) === -1)
            );
        }

        return this._mapEnumTypes;
    }

    /**
     * Return all types
     * @param {string} excludeKey
     * @param {boolean} onlySchemas
     */
    public getTypes(excludeKey: string[]|null = null, onlySchemas: boolean = false): Map<string, string> {
        let allTypes = this._getAllTypes();

        if (onlySchemas) {
            allTypes = this._mapSchemaTypes;
        }

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

    /**
     * Return a map with all types
     * @return {Map<string, string>}
     * @protected
     */
    protected _getAllExtends(): Map<string, string> {
        return new Map<string, string>([
            ...this._mapVtsExtends,
            ...this._mapVtsSimpleExtends,
            ...this._mapSchemaTypes,
            ...this._mapEnumTypes
        ]);
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
     * Return the extend Vts simple Types
     * @return {Map<string, string>}
     */
    public getExtendVtsSimpleTypes(): Map<string, string> {
        return this._mapVtsSimpleExtends;
    }

    /**
     * Return the Vts Types
     * @return {Map<string, string>}
     */
    public getExtendVtsTypes(): Map<string, string> {
        return new Map<string, string>([
            ...this._mapVtsExtends,
            ...this._mapVtsSimpleExtends
        ]);
    }

}
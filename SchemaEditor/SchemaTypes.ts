
export class SchemaTypes {

    protected static _instance: SchemaTypes|null = null;

    public static getInstance(): SchemaTypes {
        if (this._instance === null) {
            this._instance = new SchemaTypes();
        }

        return this._instance;
    }

    protected _mapTypes: Map<string, string> = new Map<string, string>();

    public constructor() {
        this._mapTypes.set('string', 'String');
        this._mapTypes.set('number', 'Number');
        this._mapTypes.set('boolean', 'Boolean');
        this._mapTypes.set('or', 'Or');
        this._mapTypes.set('array', 'Array');
        this._mapTypes.set('null', 'Null');
    }

    /**
     * Return all types
     * @param {string} excludeKey
     */
    public getTypes(excludeKey: string[]|null = null): Map<string, string> {
        if (excludeKey) {
            return new Map(
                Array.from(this._mapTypes.entries()).filter(([key]) => excludeKey.indexOf(key) === -1)
            );
        }

        return this._mapTypes;
    }

    /**
     * Set a type
     * @param {string} uuid
     * @param {string} name
     */
    public setType(uuid: string, name: string): void {
        this._mapTypes.set(uuid, name);
    }

    public isTypeASchema(type: string): boolean {
        return type.length > 8;
    }

    /**
     * Return the name
     * @param type
     */
    public getTypeNameBy(type: string): string|null {
        return this._mapTypes.get(type) ?? null;
    }

}
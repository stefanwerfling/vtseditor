export class SchemaExtends {

    protected static _instance: SchemaExtends|null = null;

    public static getInstance(): SchemaExtends {
        if (this._instance === null) {
            this._instance = new SchemaExtends();
        }

        return this._instance;
    }

    protected _mapExtends: Map<string, string> = new Map<string, string>();

    public constructor() {
        this._mapExtends.set('object', 'Vts.object');
    }

    public setExtend(uuid: string, name: string): void {
        this._mapExtends.set(uuid, name);
    }

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
     * @param extend
     */
    public getExtendNameBy(extend: string): string|null {
        return this._mapExtends.get(extend) ?? null;
    }

    public isExtendASchema(extend: string): boolean {
        return extend.length > 8;
    }

    public getExtendIdByName(name: string): string|null {
        for (const [id, tname] of this._mapExtends.entries()) {
            if (name === tname) {
                return id;
            }
        }

        return null;
    }
}
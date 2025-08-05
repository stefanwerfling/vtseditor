import {
    JsonData,
    JsonDataFS,
    JsonEnumDescription,
    JsonSchemaDescription,
    SchemaJsonDataFS
} from '../SchemaEditor/JsonData.js';

/**
 * Schema validate util
 */
export class SchemaValidateUtil {

    protected _listSchemas: Map<string, JsonSchemaDescription> = new Map<string, JsonSchemaDescription>();
    protected _listEnums: Map<string, JsonEnumDescription> = new Map<string, JsonEnumDescription>();

    public constructor(lists: JsonData[]) {
        for (const list of lists) {
            this._listMap(list.fs);
        }
    }

    protected _listMap(cEntry: JsonDataFS): void {
        for (const aenum of cEntry.enums) {
            this._listEnums.set(aenum.unid, aenum);
        }

        for (const schema of cEntry.schemas) {
            this._listSchemas.set(schema.unid, schema);
        }

        for (const entry of cEntry.entrys) {
            if (SchemaJsonDataFS.validate(entry, [])) {
                this._listMap(entry);
            }
        }
    }

    public validate(schemaId: string, jsonData: string): boolean {

        return false;
    }

    /**
     * Create an enum
     * @param {string} unid
     * @return {Record<string, string> | undefined}
     * @protected
     */
    protected _createEnum(unid: string): Record<string, string> | undefined {
        const enumDesc = this._listEnums.get(unid);

        if (!enumDesc) {
            return undefined;
        }

        const entries = enumDesc.values.map(
            ({ name, value }) => [name, value]
        );

        return Object.fromEntries(entries);
    }

}
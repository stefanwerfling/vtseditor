import {JsonDataFS} from '../SchemaEditor/JsonData.js';
import {SchemaGeneratorRegister, SchemaGeneratorRegisterIdEntry} from './SchemaGeneratorRegister.js';

/**
 * Schema generator extern register info
 */
export type SchemaGeneratorExternRegisterInfo = {
    packageName: string;
    schemaEntry: SchemaGeneratorRegisterIdEntry;
    isEnum: boolean;
};

/**
 * Schema generator extern register
 */
export class SchemaGeneratorExternRegister {

    /**
     * Extern register
     * @protected
     */
    protected _externRegister: Map<string, SchemaGeneratorRegister> = new Map<string, SchemaGeneratorRegister>();

    /**
     * Set an extern module schemas
     * @param {string} packageName
     * @param {string} schemaPrefix
     * @param {JsonDataFS} data
     */
    public setExtern(packageName: string, schemaPrefix: string,  data: JsonDataFS): void {
        this._externRegister.set(packageName, new SchemaGeneratorRegister(data, schemaPrefix, false));
    }

    /**
     * find schema
     * @param {string} unid
     * @return {SchemaGeneratorExternRegisterInfo|null}
     */
    public findSchema(unid: string): SchemaGeneratorExternRegisterInfo|null {
        for (const [packageName, register] of this._externRegister.entries()) {
            const schemaEntry = register.getSchemaNameByUnid(unid);

            if (schemaEntry) {
                const isEnum = register.isUnidEnum(unid);

                return {
                    packageName: packageName,
                    schemaEntry: schemaEntry,
                    isEnum: isEnum
                };
            }
        }

        return null;
    }

}
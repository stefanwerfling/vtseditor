import {JsonDataFS} from '../SchemaEditor/JsonData.js';
import {SchemaGeneratorRegister} from './SchemaGeneratorRegister.js';

/**
 * Schema generator extern register info
 */
export type SchemaGeneratorExternRegisterInfo = {
    packageName: string;
    schemaName: string;
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
            const schemaName = register.getSchemaNameByUnid(unid);

            if (schemaName) {
                const isEnum = register.isUnidEnum(unid);

                return {
                    packageName: packageName,
                    schemaName: schemaName,
                    isEnum: isEnum
                };
            }
        }

        return null;
    }

}
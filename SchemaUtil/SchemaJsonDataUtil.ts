import {JsonSchemaFieldType, SchemaJsonSchemaFieldTypeArray} from '../SchemaEditor/JsonData.js';

/**
 * SchemaJsonDataUtil
 */
export class SchemaJsonDataUtil {

    /**
     * getTypeArray
     * @param {JsonSchemaFieldType} data
     * @return {string[]}
     */
    public static getTypeArray(data: JsonSchemaFieldType): string[] {
        const set = new Set<string>();

        const collect = (d: JsonSchemaFieldType) => {
            set.add(d.type);

            if (d.type === 'or' && SchemaJsonSchemaFieldTypeArray.validate(d.types, [])) {
                for (const sData of d.types) {
                    collect(sData);
                }
            }
        };

        collect(data);
        return Array.from(set);
    }

}
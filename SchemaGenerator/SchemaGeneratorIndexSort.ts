import {JsonSchemaDescription, SchemaJsonSchemaFieldTypeArray} from '../SchemaEditor/JsonData.js';
import {TypeVtsObject, TypeVtsOr, TypeVtsString} from '../SchemaTypes/SchemaTypes.js';

/**
 * Schema generator index sort
 */
export class SchemaGeneratorIndexSort {

    /**
     * Sort schemas
     * @param {JsonSchemaDescription[]} schemas
     * @return {JsonSchemaDescription[]}
     */
    public static sortSchemas(schemas: JsonSchemaDescription[]): JsonSchemaDescription[] {
        const schemaMap = new Map<string, JsonSchemaDescription>();
        const idCounts = new Map<string, number>();

        // check dublicate uuids ---------------------------------------------------------------------------------------

        for (const schema of schemas) {
            const count = idCounts.get(schema.unid) ?? 0;

            if (count > 0) {
                throw new Error(`Dublicate found: The UUID '${schema.unid}' is dublicate.`);
            }

            idCounts.set(schema.unid, count + 1);
            schemaMap.set(schema.unid, schema);
        }

        // -------------------------------------------------------------------------------------------------------------

        const visited = new Set<string>();
        const visiting = new Set<string>();
        const sorted: JsonSchemaDescription[] = [];

        const isSchemaId = (id: string): boolean => schemaMap.has(id);

        const visit = (schema: JsonSchemaDescription) => {
            if (visited.has(schema.unid)) {
                return;
            }

            if (visiting.has(schema.unid)) {
                throw new Error(`Circular dependency detected in schema '${schema.unid}'`);
            }

            visiting.add(schema.unid);

            /**
             * Extend dependencies
             */

            if (schema.extend) {
                const ext = schema.extend;

                if (ext.type === TypeVtsOr) {
                    if (!ext.or_values || ext.or_values.length === 0) {
                        throw new Error(
                            `Schema '${schema.unid}' has type 'or' but no or_values defined`
                        );
                    }

                    for (const orVal of ext.or_values) {
                        if (isSchemaId(orVal.type)) {
                            visit(schemaMap.get(orVal.type)!);
                        }

                        if (orVal.value && isSchemaId(orVal.value)) {
                            visit(schemaMap.get(orVal.value)!);
                        }
                    }
                } else {
                    if (ext.type !== TypeVtsObject && isSchemaId(ext.type)) {
                        visit(schemaMap.get(ext.type)!);
                    }

                    if (ext.value && isSchemaId(ext.value)) {
                        visit(schemaMap.get(ext.value)!);
                    }
                }
            }

            /**
             * Fields dependencies
             */

            for (const field of schema.fields) {
                const fieldType = field.type;

                if (typeof fieldType === 'string') {
                    continue;
                }

                if (typeof fieldType === 'object' && fieldType !== null) {
                    if (isSchemaId(fieldType.type)) {
                        visit(schemaMap.get(fieldType.type)!);
                    }

                    if (SchemaJsonSchemaFieldTypeArray.validate(fieldType.types, [])) {
                        for (const t of fieldType.types) {
                            if (typeof t === TypeVtsString) {
                                continue;
                            }

                            if (isSchemaId(t.type)) {
                                visit(schemaMap.get(t.type)!);
                            }
                        }
                    }
                }

            }

            visiting.delete(schema.unid);
            visited.add(schema.unid);
            sorted.push(schema);
        };

        // sorting topologic
        for (const schema of schemas) {
            visit(schema);
        }

        return sorted;
    }

}
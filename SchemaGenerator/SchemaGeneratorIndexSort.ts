import {JsonSchemaDescription, SchemaJsonSchemaFieldTypeArray} from '../SchemaEditor/JsonData.js';

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

            if (schema.extend && schema.extend.type !== "object" && isSchemaId(schema.extend.type)) {
                visit(schemaMap.get(schema.extend.type)!);
            }

            if (schema.extend.values_schema && isSchemaId(schema.extend.values_schema)) {
                visit(schemaMap.get(schema.extend.values_schema)!);
            }

            for (const field of schema.fields) {
                const fieldType = field.type;

                if (typeof fieldType === "string") {
                    continue;
                }

                if (typeof fieldType === "object" && fieldType !== null) {
                    if (isSchemaId(fieldType.type)) {
                        visit(schemaMap.get(fieldType.type)!);
                    }

                    if (SchemaJsonSchemaFieldTypeArray.validate(fieldType.types, [])) {
                        for (const t of fieldType.types) {
                            if (typeof t === "string") {
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
import {JsonSchemaDescription} from '../SchemaEditor/JsonData.js';

export class SchemaGeneratorIndexSort {

    public static sortSchemas(schemas: JsonSchemaDescription[]): JsonSchemaDescription[] {
        const schemaMap = new Map<string, JsonSchemaDescription>();
        const idCounts = new Map<string, number>();

        // check dublicate uuids ---------------------------------------------------------------------------------------

        for (const schema of schemas) {
            const count = idCounts.get(schema.unid) ?? 0;

            idCounts.set(schema.unid, count + 1);

            if (count > 0) {
                throw new Error(`Dublicate found: The UUID '${schema.unid}' is dublicate.`);
            }

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

            if (schema.extend && schema.extend !== "object" && isSchemaId(schema.extend)) {
                visit(schemaMap.get(schema.extend)!);
            }

            for (const field of schema.fields) {
                const typeId = field.type;

                if (isSchemaId(typeId)) {
                    visit(schemaMap.get(typeId)!);
                }

                for (const subType of field.subtypes) {
                    if (isSchemaId(subType)) {
                        visit(schemaMap.get(subType)!);
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
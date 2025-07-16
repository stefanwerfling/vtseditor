import {SchemaJsonSchemaDescription} from '../SchemaEditor/SchemaJsonData.js';

export class SchemaGeneratorIndexSort {

    public static sortSchemas(schemas: SchemaJsonSchemaDescription[]): SchemaJsonSchemaDescription[] {
        const schemaMap = new Map<string, SchemaJsonSchemaDescription>();
        const idCounts = new Map<string, number>();

        // check dublicate uuids ---------------------------------------------------------------------------------------

        for (const schema of schemas) {
            const count = idCounts.get(schema.id) ?? 0;

            idCounts.set(schema.id, count + 1);

            if (count > 0) {
                throw new Error(`Dublicate found: The UUID '${schema.id}' is dublicate.`);
            }

            schemaMap.set(schema.id, schema);
        }

        // -------------------------------------------------------------------------------------------------------------

        const visited = new Set<string>();
        const visiting = new Set<string>();
        const sorted: SchemaJsonSchemaDescription[] = [];

        const isSchemaId = (id: string): boolean => schemaMap.has(id);

        const visit = (schema: SchemaJsonSchemaDescription) => {
            if (visited.has(schema.id)) {
                return;
            }

            if (visiting.has(schema.id)) {
                throw new Error(`Circular dependency detected in schema '${schema.id}'`);
            }

            visiting.add(schema.id);

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

            visiting.delete(schema.id);
            visited.add(schema.id);
            sorted.push(schema);
        };

        // sorting topologic
        for (const schema of schemas) {
            visit(schema);
        }

        return sorted;
    }

}
import fs from 'fs';
import path from 'path';
import {SchemaJsonDataFS, SchemaJsonDataFSType, SchemaJsonSchemaDescription} from '../SchemaEditor/SchemaJsonData.js';

/**
 * Schema generator options
 */
export type SchemaGeneratorOptions = {
    schemaPrefix: string;
    createTypes: boolean;
    destinationPath: string;
};

/**
 * Schema generator
 */
export class SchemaGenerator {

    /**
     * options
     * @protected
     */
    protected _options: SchemaGeneratorOptions;

    /**
     * File register
     * @protected
     */
    protected _fileRegister: Map<string, string> = new Map<string, string>();

    /**
     * Id register
     * @protected
     */
    protected _idRegister: Map<string, string> = new Map<string, string>();

    /**
     * constructor
     * @param {SchemaGeneratorOptions} options
     */
    public constructor(options: SchemaGeneratorOptions) {
        this._options = options;
    }

    public generate(data: SchemaJsonDataFS): void {
        const destPath = this._options.destinationPath;

        if (!fs.existsSync(destPath)) {
            throw new Error(`❌ Destination path does not exist: ${destPath}`);
        }

        if (data.type !== SchemaJsonDataFSType.root) {
            throw new Error(`❌ Schema data start not by root`);
        }

        this._createFileRegister(data.entrys);
        console.log(this._fileRegister);
        this._generateEntrys(destPath, data.entrys);
    }

    protected _buildName(name: string): string {
        return `${this._options.schemaPrefix}${name}`;
    }

    protected _createFileRegister(entrys: SchemaJsonDataFS[], aPath: string = './'): void {
        for (const entry of entrys) {
            switch (entry.type) {
                case SchemaJsonDataFSType.folder:
                    const newPath = path.join(aPath, entry.name);
                    this._createFileRegister(entry.entrys, newPath);
                    break;

                case SchemaJsonDataFSType.file:
                    const filePath = path.join(aPath, entry.name);
                    this._createSchemaRegister(filePath, entry.schemas);
                    break;
            }
        }
    }

    protected _createSchemaRegister(file: string, schemas: SchemaJsonSchemaDescription[]): void {
        for (const schema of schemas) {
            const schemaName = this._buildName(schema.name);

            this._fileRegister.set(schemaName, file);
            this._idRegister.set(schema.id, schemaName);
        }
    }

    protected _generateEntrys(aPath: string, entrys: SchemaJsonDataFS[]): void {
        for (const entry of entrys) {
            switch (entry.type) {
                case SchemaJsonDataFSType.folder:
                    const newPath = path.join(aPath, entry.name);
                    fs.mkdirSync(newPath, { recursive: true });

                    this._generateEntrys(newPath, entry.entrys);
                    break;

                case SchemaJsonDataFSType.file:
                    const filePath = path.join(aPath, entry.name);
                    this._generateFile(filePath, entry.schemas);
                    break;
            }
        }
    }

    protected _generateFile(file: string, schemas: SchemaJsonSchemaDescription[]): void {
        let contentHeader = 'import {ExtractSchemaResultType, Vts} from \'vts\';\r\n';
        let content = '\r\n';

        for (const schema of schemas) {
            content += '\r\n';

            const schemaName = this._buildName(schema.name);

            content += `export const ${schemaName}  = `;

            if (schema.extend === 'object') {
                content += 'Vts.object({\r\n';
            } else {
                const extendSchemaName = this._idRegister.get(schema.extend);

                if (extendSchemaName) {
                    content += `${extendSchemaName}.extend({\r\n`;
                } else {
                    content += 'Vts.object({\r\n';
                }
            }

            for (const field of schema.fields) {
                content += `\t${field.name}: `;

                if (field.optional) {
                    content += 'Vts.optional(';
                }

                switch (field.type) {
                    case 'string':
                        content += 'Vts.string()';
                        break;

                    case 'number':
                        content += 'Vts.number()';
                        break;

                    case 'boolean':
                        content += 'Vts.boolean()';
                        break;

                    default:
                        const schemaName = this._idRegister.get(field.type);

                        if (schemaName) {
                            content += `${schemaName}`;
                        } else {
                            content += 'Vts.null()';
                        }
                }

                if (field.optional) {
                    content += ')';
                }

                content += ',\r\n';
            }

            content += '});\r\n\r\n';

            content += `export type ${schema.name} = ExtractSchemaResultType<typeof ${schemaName}>;\r\n\r\n`;
        }

        fs.writeFileSync(`${file}.ts`, `${contentHeader}${content}`, 'utf-8');
    }

}
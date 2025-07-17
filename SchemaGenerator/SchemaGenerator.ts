import fs from 'fs';
import path from 'path';
import {SchemaJsonDataFS, SchemaJsonDataFSType, SchemaJsonSchemaDescription} from '../SchemaEditor/SchemaJsonData.js';
import {SchemaPathUtil} from '../SchemaUtil/SchemaPathUtil.js';
import {SchemaGeneratorIndexSort} from './SchemaGeneratorIndexSort.js';

/**
 * Schema generator options
 */
export type SchemaGeneratorOptions = {
    schemaPrefix: string;
    createTypes: boolean;
    createIndex: boolean;
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
     * file used schemas
     * @protected
     */
    protected _fileUsedSchemas: string[] = [];

    /**
     * constructor
     * @param {SchemaGeneratorOptions} options
     */
    public constructor(options: SchemaGeneratorOptions) {
        this._options = options;
    }

    /**
     * Generate
     * @param {SchemaJsonDataFS} data
     */
    public generate(data: SchemaJsonDataFS): void {
        const destPath = this._options.destinationPath;

        if (!fs.existsSync(destPath)) {
            throw new Error(`❌ Destination path does not exist: ${destPath}`);
        }

        if (data.type !== SchemaJsonDataFSType.root) {
            throw new Error(`❌ Schema data start not by root`);
        }

        console.info(`Generate file in: ${destPath}`);

        this._createFileRegister(data.entrys);
        this._generateEntrys(destPath, data.entrys);

        if (this._options.createIndex) {
            console.info(`Generate index in: ${destPath}`);
            this._generateIndex(destPath);
        }
    }

    /**
     * Build name
     * @param {string} name
     * @return {string}
     * @protected
     */
    protected _buildName(name: string): string {
        return `${this._options.schemaPrefix}${name.trim()}`;
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
        const sortedSchemas = SchemaGeneratorIndexSort.sortSchemas(schemas);

        for (const schema of sortedSchemas) {
            const schemaName = this._buildName(schema.name);

            this._fileRegister.set(schemaName, file);

            if (this._options.createTypes) {
                this._fileRegister.set(schema.name.trim(), file);
            }

            this._idRegister.set(schema.id, schemaName);
        }
    }

    protected _generateEntrys(fullPath: string, entrys: SchemaJsonDataFS[], relPath: string = ''): void {
        for (const entry of entrys) {
            const newFullPath = path.join(fullPath, entry.name);
            const newRelPath = path.join(relPath, entry.name);

            switch (entry.type) {
                case SchemaJsonDataFSType.folder:
                    fs.mkdirSync(newFullPath, { recursive: true });

                    this._generateEntrys(newFullPath, entry.entrys, newRelPath);
                    break;

                case SchemaJsonDataFSType.file:
                    this._generateFile(newFullPath, newRelPath, entry.schemas);
                    break;
            }
        }
    }

    protected _generateFile(fullPath: string, relPath: string, schemas: SchemaJsonSchemaDescription[]): void {
        // reset used schemas
        this._fileUsedSchemas = [];

        let contentHeader = 'import {ExtractSchemaResultType, Vts} from \'vts\';\r\n';
        let content = this._writeContent(relPath, schemas);

        for (const schemaImport of this._fileUsedSchemas) {
            const importPath = this._fileRegister.get(schemaImport);

            if (importPath) {
                if (importPath !== relPath) {
                    const relativImportPath = SchemaPathUtil.getRelativeImportPath(`./${relPath}`, `./${importPath}.js`);

                    contentHeader += `import {${schemaImport}} from '${relativImportPath}';\r\n`;
                }
            }
        }

        fs.writeFileSync(`${fullPath}.ts`, `${contentHeader}${content}`, 'utf-8');
    }

    protected _writeContent(relPath: string, schemas: SchemaJsonSchemaDescription[], writenSchemas: string[] = []): string {
        let content = '\r\n';
        const sortedSchemas = SchemaGeneratorIndexSort.sortSchemas(schemas);

        for (const schema of sortedSchemas) {
            const schemaName = this._buildName(schema.name);

            content += this._writeSchema(schemaName, schema);

            writenSchemas.push(schemaName);
        }

        return content;
    }

    protected _writeSchema(schemaName: string, schema: SchemaJsonSchemaDescription): string {
        let content = '\r\n';

        content += `export const ${schemaName}  = `;

        if (schema.extend === 'object') {
            content += 'Vts.object({\r\n';
        } else {
            const extendSchemaName = this._idRegister.get(schema.extend);

            if (extendSchemaName) {
                if (this._fileUsedSchemas.indexOf(extendSchemaName) === -1) {
                    this._fileUsedSchemas.push(extendSchemaName);
                }

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

            content += this._writeType(field.type, field.subtypes, field.description);

            if (field.optional) {
                content += ')';
            }

            content += ',\r\n';
        }

        content += '});\r\n\r\n';

        if (this._options.createTypes) {
            content += `export type ${schema.name} = ExtractSchemaResultType<typeof ${schemaName}>;\r\n\r\n`;
        }

        return content;
    }

    protected _writeType(type: string, subtypes: string[] = [], description: string = ''): string {
        let content = '';

        let tdescription = '';

        if (description !== '') {
            tdescription = `{description: '${description}'}`;
        }

        switch (type) {
            case 'string':
                content += `Vts.string(${tdescription})`;
                break;

            case 'number':
                content += `Vts.number(${tdescription})`;
                break;

            case 'boolean':
                content += `Vts.boolean(${tdescription})`;
                break;

            case 'array':
                let subType = 'Vts.null()';

                if (subtypes.length > 0) {
                    subType = this._writeType(subtypes[0], [], description);
                }

                content += `Vts.array(${subType})`;
                break;

            case 'or':
                const tSubtypes: string[] = [];

                for (const aSubtype of subtypes) {
                    tSubtypes.push(this._writeType(aSubtype));
                }

                content += `Vts.or([${tSubtypes.join(', ')}])`;
                break;

            default:
                const tschemaName = this._idRegister.get(type);

                if (tschemaName) {
                    if (this._fileUsedSchemas.indexOf(tschemaName) === -1) {
                        this._fileUsedSchemas.push(tschemaName);
                    }

                    content += `${tschemaName}`;
                } else {
                    content += 'Vts.null()';
                }
        }

        return content;
    }

    protected _generateIndex(aPath: string): void {
        const indexFile = path.join(aPath, 'index');

        const list: Map<string, string[]> = new Map<string, string[]>();

        for (const [schemaName, file] of this._fileRegister) {
            let schemaList: string[] = [];

            if (list.has(file)) {
                const tschemaList = list.get(file);

                if (tschemaList) {
                    schemaList = tschemaList;
                }
            }

            schemaList.push(schemaName);

            list.set(file, schemaList);
        }

        // -------------------------------------------------------------------------------------------------------------

        let content = '';

        for (const [file, schemas] of list.entries()) {
            content += 'export {\r\n';

            for (const schema of schemas) {
                content += `\t${schema},\r\n`;
            }

            content += `} from './${file}.js';\r\n`;
        }

        fs.writeFileSync(`${indexFile}.ts`, content, 'utf-8');
    }

}
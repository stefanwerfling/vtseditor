import fs from 'fs';
import path from 'path';
import {SchemaErrors} from 'vts';
import {
    JsonDataFS,
    SchemaJsonDataFSType,
    JsonEnumDescription,
    JsonSchemaDescription, SchemaJsonDataFS
} from '../SchemaEditor/JsonData.js';
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
    code_indent: string;
    code_comment: boolean;
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
     * List of enums
     * @protected
     */
    protected _enumRegister: string[] = [];

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
     * @param {JsonDataFS} data
     */
    public generate(data: JsonDataFS): void {
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

    /**
     * create file register
     * @param {unknown[]} entrys
     * @param {string} aPath
     * @protected
     */
    protected _createFileRegister(entrys: unknown[], aPath: string = './'): void {
        for (const entry of entrys) {
            const errors: SchemaErrors = [];

            if (SchemaJsonDataFS.validate(entry, errors)) {
                switch (entry.type) {
                    case SchemaJsonDataFSType.folder:
                        const newPath = path.join(aPath, entry.name);
                        this._createFileRegister(entry.entrys, newPath);

                        break;

                    case SchemaJsonDataFSType.file:
                        const filePath = path.join(aPath, entry.name);
                        this._createSchemaRegister(filePath, entry.schemas);
                        this._createEnumRegister(filePath, entry.enums);
                        break;
                }
            } else {
                console.log('_createFileRegister:SchemaJsonDataFS: wrong schema!');
            }
        }
    }

    protected _createSchemaRegister(file: string, schemas: JsonSchemaDescription[]): void {
        const sortedSchemas = SchemaGeneratorIndexSort.sortSchemas(schemas);

        for (const schema of sortedSchemas) {
            const schemaName = this._buildName(schema.name);

            this._fileRegister.set(schemaName, file);

            if (this._options.createTypes) {
                this._fileRegister.set(schema.name.trim(), file);
            }

            this._idRegister.set(schema.unid, schemaName);
        }
    }

    protected _createEnumRegister(file: string, enums: JsonEnumDescription[]): void {
        for (const aenum of enums) {
            this._fileRegister.set(aenum.name, file);
            this._idRegister.set(aenum.unid, aenum.name);
            this._enumRegister.push(aenum.unid);
        }
    }

    /**
     * Generate entrys to content
     * @param {string} fullPath
     * @param {unknown[]} entrys
     * @param {string} relPath
     * @protected
     */
    protected _generateEntrys(fullPath: string, entrys: unknown[], relPath: string = ''): void {
        for (const entry of entrys) {
            const errors: SchemaErrors = [];

            if (SchemaJsonDataFS.validate(entry, errors)) {
                const newFullPath = path.join(fullPath, entry.name);
                const newRelPath = path.join(relPath, entry.name);

                switch (entry.type) {
                    case SchemaJsonDataFSType.folder:
                        fs.mkdirSync(newFullPath, { recursive: true });
                        this._generateEntrys(newFullPath, entry.entrys, newRelPath);

                        break;

                    case SchemaJsonDataFSType.file:
                        this._generateFile(
                            newFullPath,
                            newRelPath,
                            entry.schemas,
                            entry.enums
                        );
                        break;
                }
            } else {
                console.log('_generateEntrys:SchemaJsonDataFS: wrong schema!');
            }
        }
    }

    /**
     * Generate file
     * @param {string} fullPath
     * @param {string} relPath
     * @param {JsonSchemaDescription[]} schemas
     * @param {JsonEnumDescription[]} enums
     * @protected
     */
    protected _generateFile(
        fullPath: string,
        relPath: string,
        schemas: JsonSchemaDescription[],
        enums: JsonEnumDescription[]
    ): void {
        // reset used schemas
        this._fileUsedSchemas = [];

        let contentHeader = '';
        let content = '';

        // write schemas and enums -------------------------------------------------------------------------------------

        if (enums.length > 0) {
            content += this._writeEnumContent(enums);
        }

        // write imports -----------------------------------------------------------------------------------------------

        if (schemas.length > 0) {
            if (enums.length > 0) {
                content += '\r\n\r\n';
            }

            content += this._writeContent(schemas);

            contentHeader = 'import {ExtractSchemaResultType, Vts} from \'vts\';\r\n';

            for (const schemaImport of this._fileUsedSchemas) {
                const importPath = this._fileRegister.get(schemaImport);

                if (importPath) {
                    if (importPath !== relPath) {
                        const relativImportPath = SchemaPathUtil.getRelativeImportPath(
                            `./${relPath}`,
                            `./${importPath}.js`
                        );

                        contentHeader += `import {${schemaImport}} from '${relativImportPath}';\r\n`;
                    }
                }
            }

            contentHeader += '\r\n';
        }

        // write to file -----------------------------------------------------------------------------------------------

        fs.writeFileSync(`${fullPath}.ts`, `${contentHeader}${content}`, 'utf-8');
    }

    /**
     * Write Enum content
     * @param {JsonEnumDescription[]} enums
     * @protected
     */
    protected _writeEnumContent(enums: JsonEnumDescription[]): string {
        let content = '';

        for (const aenum of enums) {
            if (content !== '') {
                content += '\r\n\r\n';
            }

            if (this._options.code_comment) {
                content += '/**\r\n';
                content += ` * Enum ${aenum.name}\r\n`;
                content += ' */\r\n'
            }

            content += `export enum ${aenum.name} {\r\n`;

            for (const tvalue of aenum.values) {
                content += `${this._options.code_indent}${tvalue.name} = '${tvalue.value}',\r\n`
            }

            content += '}';
        }

        return content;
    }

    /**
     * Write content
     * @param {JsonSchemaDescription[]} schemas
     * @param {string[]} writenSchemas
     * @return {string}
     * @protected
     */
    protected _writeContent(schemas: JsonSchemaDescription[], writenSchemas: string[] = []): string {
        let content = '';
        const sortedSchemas = SchemaGeneratorIndexSort.sortSchemas(schemas);

        for (const schema of sortedSchemas) {
            const schemaName = this._buildName(schema.name);

            if (content !== '') {
                content += '\r\n\r\n';
            }

            content += this._writeSchema(schemaName, schema);

            writenSchemas.push(schemaName);
        }

        return content;
    }

    /**
     * Write Schema
     * @param {string} schemaName
     * @param {JsonSchemaDescription} schema
     * @return {string}
     * @protected
     */
    protected _writeSchema(schemaName: string, schema: JsonSchemaDescription): string {
        let content = '';

        if (this._options.code_comment) {
            content += '/**\r\n';
            content += ` * Schema of ${schema.name}\r\n`;
            content += ' */\r\n'
        }

        content += `export const ${schemaName}  = `;

        if (schema.extend === 'object2') {
            content += 'Vts.object2(';
            content += this._writeType('string');
            content += `, ${this._writeType(schema.values_schema ?? 'unknown')}`;
            content += ');';
        } else {
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
                content += `${this._options.code_indent}${field.name}: `;

                if (field.optional) {
                    content += 'Vts.optional(';
                }

                if (field.array) {
                    content += 'Vts.array(';
                }

                content += this._writeType(field.type, field.subtypes, field.description);

                if (field.array) {
                    content += ')';
                }

                if (field.optional) {
                    content += ')';
                }

                content += ',\r\n';
            }

            content += '}';

            if (schema.options) {
                const contentOption: string[] = [];

                if (schema.options.ignore_additional_items) {
                    contentOption.push(`${this._options.code_indent}${this._options.code_indent}ignoreAdditionalItems: true`);
                }

                if (contentOption.length > 0) {
                    content += ', {\r\n';
                    content += `${this._options.code_indent}objectSchema: {\r\n`;
                    content += contentOption.join(',\r\n');
                    content += '\r\n';
                    content += `${this._options.code_indent}}\r\n`;
                    content += '}';
                }
            }

            content += ');';
        }

        if (this._options.createTypes) {

            content += '\r\n\r\n';

            if (this._options.code_comment) {
                content += '/**\r\n';
                content += ` * Type of schema ${schema.name}\r\n`;
                content += ' */\r\n'
            }

            content += `export type ${schema.name} = ExtractSchemaResultType<typeof ${schemaName}>;`;
        }

        return content;
    }

    /**
     * Write Type
     * @param {string} type
     * @param {string[]} subtypes
     * @param {string} description
     * @return {string}
     * @protected
     */
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

            case 'unknown':
                content += `Vts.unknown()`;
                break;

            case 'undefined':
                content += `Vts.undefined()`;
                break;

            case 'true':
                content += `Vts.true(${tdescription})`;
                break;

            case 'false':
                content += `Vts.false(${tdescription})`;
                break;

            case 'date':
                content += `Vts.date(${tdescription})`;
                break;

            case 'datestring':
                content += `Vts.dateString(${tdescription})`;
                break;

            case 'or':
                const tSubtypes: string[] = [];

                for (const aSubtype of subtypes) {
                    tSubtypes.push(this._writeType(aSubtype));
                }

                content += `Vts.or([${tSubtypes.join(', ')}])`;
                break;

            default:
                const isEnum = this._enumRegister.indexOf(type) !== -1;
                const tschemaName = this._idRegister.get(type);

                if (tschemaName) {
                    if (this._fileUsedSchemas.indexOf(tschemaName) === -1) {
                        this._fileUsedSchemas.push(tschemaName);
                    }

                    if (isEnum) {
                        content += `Vts.enum(${tschemaName})`;
                    } else {
                        content += `${tschemaName}`;
                    }
                } else {
                    content += 'Vts.null()';
                }
        }

        return content;
    }

    /**
     * Generate Index file
     * @param {string} aPath
     * @protected
     */
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
            if (content.length !== 0) {
                content += '\r\n';
            }

            content += 'export {\r\n';

            for (const schema of schemas) {
                content += `${this._options.code_indent}${schema},\r\n`;
            }

            content += `} from './${file}.js';`;
        }

        fs.writeFileSync(`${indexFile}.ts`, content, 'utf-8');
    }

}
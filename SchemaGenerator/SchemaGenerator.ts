import fs from 'fs';
import path from 'path';
import {SchemaErrors} from 'vts';
import {
    JsonDataFS,
    SchemaJsonDataFSType,
    JsonEnumDescription,
    JsonSchemaDescription,
    SchemaJsonDataFS,
    JsonSchemaFieldType,
    SchemaJsonSchemaFieldTypeArray,
    SchemaJsonSchemaFieldType, SchemaJsonSchemaDescriptionExtend
} from '../SchemaEditor/JsonData.js';
import {SchemaExternLoaderSchemaFile} from '../SchemaExtern/SchemaExternLoader.js';
import {SchemaDescriptionUtil} from '../SchemaUtil/SchemaDescriptionUtil.js';
import {SchemaPathUtil} from '../SchemaUtil/SchemaPathUtil.js';
import {SchemaGeneratorExternRegister} from './SchemaGeneratorExternRegister.js';
import {SchemaGeneratorIndexSort} from './SchemaGeneratorIndexSort.js';
import {SchemaGeneratorRegister} from './SchemaGeneratorRegister.js';

/**
 * Schema generator options
 */
export type SchemaGeneratorOptions = {
    schemaPrefix: string;
    createTypes: boolean;
    createIndex: boolean;
    destinationPath: string;
    destinationClear: boolean;
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
     * Register
     * @protected
     */
    protected _register: SchemaGeneratorRegister|null = null;

    /**
     * Extern register
     * @protected
     */
    protected _externRegister: SchemaGeneratorExternRegister = new SchemaGeneratorExternRegister();

    /**
     * file used schemas
     * ID, SchemaName
     * @protected
     */
    protected _fileUsedSchemas: Map<string, string> = new Map<string, string>();

    /**
     * constructor
     * @param {SchemaGeneratorOptions} options
     */
    public constructor(options: SchemaGeneratorOptions) {
        this._options = options;
    }

    /**
     * Set an extern source
     * @param {SchemaExternLoaderSchemaFile} source
     * @param {JsonDataFS} data
     */
    public setExternSource(source: SchemaExternLoaderSchemaFile, data: JsonDataFS): void {
        this._externRegister.setExtern(source.name, source.schemaPrefix, data);
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

        if (this._options.destinationClear) {
            console.info(`Clear destination: ${destPath}`);
            SchemaPathUtil.clearFolder(destPath);
        }

        console.info(`Generate file in: ${destPath}`);

        this._register = new SchemaGeneratorRegister(
            data,
            this._options.schemaPrefix,
            this._options.createTypes
        );

        this._generateEntrys(destPath, data.entrys);

        if (this._options.createIndex) {
            console.info(`Generate index in: ${destPath}`);
            this._generateIndex(destPath);
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
        if (this._register === null) {
            console.log('Register is not init!');
            return;
        }

        // reset used schemas
        this._fileUsedSchemas.clear();

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

            const nameImportRegister: string[] = [];

            const buildAliasName = (orgName: string, count: number = 1) => {
                const newAliasName = `${orgName}${count}`;

                if (nameImportRegister.indexOf(newAliasName) !== -1) {
                    return buildAliasName(orgName, count++);
                }

                return newAliasName;
            };

            for (const [schemaUnid, schemaImport] of this._fileUsedSchemas.entries()) {
                let importNameLine = schemaImport;

                if (nameImportRegister.indexOf(schemaImport) !== -1) {
                    const aliasName = buildAliasName(schemaImport);
                    nameImportRegister.push(aliasName);

                    importNameLine = `${schemaImport} as ${aliasName}`;
                } else {
                    nameImportRegister.push(schemaImport);
                }

                const importPath = this._register.getFileBySchemaName(schemaImport);

                if (importPath) {
                    if (importPath !== relPath) {
                        const relativImportPath = SchemaPathUtil.getRelativeImportPath(
                            `./${relPath}`,
                            `./${importPath}.js`
                        );

                        contentHeader += `import {${importNameLine}} from '${relativImportPath}';\r\n`;
                    }
                } else {
                    const externInfo = this._externRegister.findSchema(schemaUnid);

                    if (externInfo) {
                        contentHeader += `import {${importNameLine}} from '${externInfo.packageName}';\r\n`;
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
                content += `${this._options.code_indent}'${tvalue.name}' = '${tvalue.value}',\r\n`
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
            const schemaName = this._register!.buildName(schema.name);

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
        if (!SchemaJsonSchemaDescriptionExtend.validate(schema.extend, [])) {
            // old format can not support
            return '';
        }

        let content = '';

        if (this._options.code_comment) {
            content += '/**\r\n';
            content += ` * Schema of ${schema.name}\r\n`;

            if (schema.description !== '') {
                const descLines = schema.description.split('\n');

                for (const descLine of descLines) {
                    content += ` * ${descLine.trim()}\r\n`;
                }
            }

            content += ' */\r\n'
        }

        let strExport = 'export';

        if (schema.extend.options && schema.extend.options.not_export) {
            strExport = '';
        }

        content += `${strExport} const ${schemaName} = `;

        let isObject = false;

        switch (schema.extend.type) {
            case 'string':
            case 'number':
            case 'boolean':
            case 'null':
            case 'unknown':
            case 'date':
            case 'datestring':
                content += `${this._writeType({
                    type: schema.extend.type ?? 'unknown',
                    optional: false,
                    array: false,
                    types: [],
                }, SchemaDescriptionUtil.validateDescription(schema.description))}`;
                content += ';';

                break;

            case 'object2':
                content += 'Vts.object2(';
                content += this._writeType({
                    type: 'string',
                    optional: false,
                    array: false,
                    types: []
                });

                content += `, ${this._writeType({
                    type: schema.extend.values_schema ?? 'unknown',
                    optional: false,
                    array: false,
                    types: []
                })}`;

                content += ');';
                break;

            case 'object':
                isObject = true;
                content += 'Vts.object({\r\n';
                break;

            default:
                isObject = true;
                const extendSchemaName = this._register!.getSchemaNameByUnid(schema.extend.type);

                if (extendSchemaName) {
                    if (!this._fileUsedSchemas.has(schema.extend.type)) {
                        this._fileUsedSchemas.set(schema.extend.type, extendSchemaName);
                    }

                    content += `${extendSchemaName}.extend({\r\n`;
                } else {
                    const extendExternSchemaName = this._externRegister.findSchema(schema.extend.type);

                    if (extendExternSchemaName) {
                        if (!this._fileUsedSchemas.has(schema.extend.type)) {
                            this._fileUsedSchemas.set(schema.extend.type, extendExternSchemaName.schemaName);
                        }

                        content += `${extendExternSchemaName.schemaName}.extend({\r\n`;
                    } else {
                        content += 'Vts.object({\r\n';
                    }
                }
                break;
        }

        // -------------------------------------------------------------------------------------------------------------

        if (isObject) {
            for (const field of schema.fields) {
                if (SchemaJsonSchemaFieldType.validate(field.type, [])) {
                    content += `${this._options.code_indent}${field.name}: `;

                    content += this._writeType(
                        field.type,
                        SchemaDescriptionUtil.validateDescription(field.description)
                    );

                    content += ',\r\n';
                }
            }

            content += '}';
            content += ', {\r\n';

            content += `${this._options.code_indent}description: '${SchemaDescriptionUtil.validateDescription(schema.description)}',\r\n`;

            if (schema.extend.options) {
                const contentOption: string[] = [];

                if (schema.extend.options.ignore_additional_items) {
                    contentOption.push(`${this._options.code_indent}${this._options.code_indent}ignoreAdditionalItems: true`);
                }

                if (contentOption.length > 0) {
                    content += `${this._options.code_indent}objectSchema: {\r\n`;
                    content += contentOption.join(',\r\n');
                    content += '\r\n';
                    content += `${this._options.code_indent}}\r\n`;

                }
            }

            content += '}';
            content += ');';
        }

        // -------------------------------------------------------------------------------------------------------------

        if (this._options.createTypes) {

            content += '\r\n\r\n';

            if (this._options.code_comment) {
                content += '/**\r\n';
                content += ` * Type of schema ${schema.name}\r\n`;
                content += ' */\r\n'
            }

            content += `${strExport} type ${schema.name} = ExtractSchemaResultType<typeof ${schemaName}>;`;
        }

        return content;
    }

    /**
     * Write Type
     * @param {JsonSchemaFieldType} type
     * @param {string} description
     * @return {string}
     * @protected
     */
    protected _writeType(type: JsonSchemaFieldType, description: string = ''): string {
        let content = '';

        if (type.optional) {
            content += 'Vts.optional(';
        }

        if (type.array) {
            content += 'Vts.array(';
        }

        // -------------------------------------------------------------------------------------------------------------

        let tdescription = '';

        if (description !== '') {
            tdescription = `{description: '${description}'}`;
        }

        switch (type.type) {
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

                if (SchemaJsonSchemaFieldTypeArray.validate(type.types, [])) {
                    for (const aType of type.types) {
                        tSubtypes.push(this._writeType(aType));
                    }
                }

                content += `Vts.or([${tSubtypes.join(', ')}])`;
                break;

            default:
                const isEnum = this._register!.isUnidEnum(type.type);
                const tschemaName = this._register!.getSchemaNameByUnid(type.type);

                if (tschemaName) {
                    if (!this._fileUsedSchemas.has(type.type)) {
                        this._fileUsedSchemas.set(type.type, tschemaName);
                    }

                    if (isEnum) {
                        content += `Vts.enum(${tschemaName})`;
                    } else {
                        content += `${tschemaName}`;
                    }
                } else {
                    const tExternSchemaName = this._externRegister.findSchema(type.type);

                    if (tExternSchemaName) {
                        if (!this._fileUsedSchemas.has(type.type)) {
                            this._fileUsedSchemas.set(type.type, tExternSchemaName.schemaName);
                        }

                        if (tExternSchemaName.isEnum) {
                            content += `Vts.enum(${tExternSchemaName.schemaName})`;
                        } else {
                            content += `${tExternSchemaName.schemaName}`;
                        }
                    } else {
                        content += 'Vts.null()';
                    }
                }
        }

        if (type.array) {
            content += ')';
        }

        if (type.optional) {
            content += ')';
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
        const files = this._register!.getFiles();
        for (const [schemaName, file] of files.entries()) {
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
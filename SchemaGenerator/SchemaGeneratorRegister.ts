import {SchemaErrors} from 'vts';
import {
    JsonDataFS,
    JsonEnumDescription,
    JsonSchemaDescription,
    SchemaJsonDataFS,
    SchemaJsonDataFSType
} from '../SchemaEditor/JsonData.js';
import path from 'path';
import {SchemaGeneratorIndexSort} from './SchemaGeneratorIndexSort.js';

/**
 * Register
 */
export class SchemaGeneratorRegister {

    /**
     * Register
     * @protected
     */
    protected _fileRegister: Map<string, string> = new Map<string, string>();

    /**
     * Id register
     * @protected
     */
    protected _idRegister: Map<string, string> = new Map<string, string>();

    /**
     * Schema prefix
     * @protected
     */
    protected _schemaPrefix: string = '';

    /**
     * Create types
     * @protected
     */
    protected _createTypes: boolean = false;

    /**
     * List of enums
     * @protected
     */
    protected _enumRegister: string[] = [];

    /**
     * Constructor
     * @param {JsonDataFS} data
     * @param {string} schemaPrefix
     * @param {boolean} createTypes
     */
    public constructor(data: JsonDataFS, schemaPrefix: string, createTypes: boolean) {
        this._schemaPrefix = schemaPrefix;
        this._createTypes = createTypes;

        if (data.type === SchemaJsonDataFSType.root) {
            this._createFileRegister(data.entrys);
        }
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

    /**
     * Build name
     * @param {string} name
     * @return {string}
     * @protected
     */
    public buildName(name: string): string {
        return `${this._schemaPrefix}${name.trim()}`;
    }

    /**
     * create schema register
     * @param {string} file
     * @param {JsonSchemaDescription[]} schemas
     * @protected
     */
    protected _createSchemaRegister(file: string, schemas: JsonSchemaDescription[]): void {
        const sortedSchemas = SchemaGeneratorIndexSort.sortSchemas(schemas);

        for (const schema of sortedSchemas) {
            const schemaName = this.buildName(schema.name);

            let allowedExport = true;

            if (schema.options && schema.options.not_export) {
                allowedExport = false;
            }

            if (allowedExport) {
                this._fileRegister.set(schemaName, file);

                if (this._createTypes) {
                    this._fileRegister.set(schema.name.trim(), file);
                }
            }

            this._idRegister.set(schema.unid, schemaName);
        }
    }

    /**
     * Create enum register
     * @param {string} file
     * @param {JsonEnumDescription[]} enums
     * @protected
     */
    protected _createEnumRegister(file: string, enums: JsonEnumDescription[]): void {
        for (const aenum of enums) {
            this._fileRegister.set(aenum.name, file);
            this._idRegister.set(aenum.unid, aenum.name);
            this._enumRegister.push(aenum.unid);
        }
    }

    /**
     * Get file by schema name
     * @param {string} schemaName
     * @return {string|undefined}
     */
    public getFileBySchemaName(schemaName: string): string|undefined {
        return this._fileRegister.get(schemaName);
    }

    /**
     * Return the schema name by unid
     * @param {string} unid
     * @return {string|undefined}
     */
    public getSchemaNameByUnid(unid: string): string|undefined {
        return this._idRegister.get(unid);
    }

    /**
     * Is unid a enum
     * @param {string} unid
     * @return {boolean}
     */
    public isUnidEnum(unid: string): boolean {
        return this._enumRegister.indexOf(unid) !== -1
    }

    /**
     * Return the files by register
     * @return {Map<string, string>}
     */
    public getFiles(): Map<string, string> {
        return this._fileRegister;
    }

}
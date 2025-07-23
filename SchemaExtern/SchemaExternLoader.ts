import path from 'path';
import {SchemaErrors} from 'vts';
import {JsonData, SchemaJsonData} from '../SchemaEditor/JsonData.js';
import {SchemaFileUtil} from '../SchemaUtil/SchemaFileUtil.js';
import {SchemaPathUtil} from '../SchemaUtil/SchemaPathUtil.js';
import {SchemaPackageExtend} from './SchemaExternConfig.js';

/**
 * Schema extern loader schemafile
 */
export type SchemaExternLoaderSchemaFile = {
    name: string;
    path: string;
    schemas: JsonData
};

/**
 * Schema extern loader
 */
export class SchemaExternLoader {

    /**
     * root path
     * @protected
     */
    protected _rootPath: string;

    /**
     * List
     * @protected
     */
    protected _list: SchemaExternLoaderSchemaFile[] = [];

    /**
     * Constructor
     * @param {string} rootPath
     */
    public constructor(rootPath: string) {
        this._rootPath = rootPath;
    }

    /**
     * scan
     */
    public async scan(): Promise<void> {
        let nodeModulesPath = path.join(this._rootPath, 'node_modules');

        if (!await SchemaPathUtil.directoryExist(nodeModulesPath)) {
            throw new Error('Node modules directory not found!');
        }

        const modules = await SchemaPathUtil.getFiles(nodeModulesPath);

        for await (const aModule of modules) {
            const packageJsonPath = path.join(nodeModulesPath, aModule);

            if (await SchemaPathUtil.directoryExist(packageJsonPath)) {
                const packageFile = path.join(packageJsonPath, 'package.json');

                try {
                    const packetData = await SchemaFileUtil.readJsonFile(packageFile);

                    if (packetData) {
                        if (SchemaPackageExtend.validate(packetData, [])) {
                            const vtseditor = packetData.vtseditor;

                            for (const schemaFile of vtseditor.schemaFiles) {
                                const schemaFilePath = path.join(packageJsonPath, schemaFile);
                                const schemacontent = await SchemaFileUtil.readJsonFile(schemaFilePath);
                                const errors: SchemaErrors = [];

                                if (SchemaJsonData.validate(schemacontent, errors)) {
                                    this._list.push({
                                        name: packetData.name,
                                        path: packageJsonPath,
                                        schemas: schemacontent
                                    });
                                } else {
                                    console.log(`Schema file has wrong fromat (${packetData.name}): ${schemaFilePath}`);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.log(`package.json can not read: ${packageFile}`);
                }
            }
        }
    }

}
import path from 'path';
import {SchemaFileUtil} from '../SchemaUtil/SchemaFileUtil.js';
import {SchemaPathUtil} from '../SchemaUtil/SchemaPathUtil.js';
import {SchemaOwnPackage, SchemaPackageExtend} from './SchemaExternConfig.js';

/**
 * Schema extern loader schemafile
 */
export type SchemaExternLoaderSchemaFile = {
    name: string;
    path: string;
    schemaFile: string;
    schemaPrefix: string;
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
    protected _list: Map<string, SchemaExternLoaderSchemaFile> = new Map<string, SchemaExternLoaderSchemaFile>();

    /**
     * Constructor
     * @param {string} rootPath
     */
    public constructor(rootPath: string) {
        this._rootPath = rootPath;
    }

    /**
     * Return the list
     */
    public getList(): Map<string, SchemaExternLoaderSchemaFile> {
        return this._list;
    }

    /**
     * Scan modules path
     * @param {string} rootPath
     * @protected
     */
    protected async _scanModulesPath(rootPath: string): Promise<void> {
        let nodeModulesPath = path.join(rootPath, 'node_modules');

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

                            for (const aexport of vtseditor.exports) {
                                const schemaFilePath = path.join(packageJsonPath, aexport.schemaFile);

                                this._list.set(crypto.randomUUID(), {
                                    name: packetData.name,
                                    path: packageJsonPath,
                                    schemaFile: schemaFilePath,
                                    schemaPrefix: aexport.schemaPrefix
                                });

                                console.log(`Load node_module schema: ${packetData.name}`);
                            }
                        }
                    }
                } catch (e) {
                    // console.log(`package.json can not read: ${packageFile}`);
                }
            }
        }
    }

    /**
     * Scan project
     * @param {string} rootPath
     * @protected
     */
    protected async _scanProject(rootPath: string): Promise<void> {
        const projectPackage = path.join(rootPath, 'package.json');

        if (!await SchemaPathUtil.fileExist(projectPackage)) {
            throw new Error('Project "package.json" not found!');
        }

        try {
            const packetData = await SchemaFileUtil.readJsonFile(projectPackage);

            if (SchemaOwnPackage.validate(packetData, [])) {
                await this._scanModulesPath(rootPath);

                if (packetData.workspaces) {
                    for await (const workspace of packetData.workspaces) {
                        const workspacePath = path.join(rootPath, workspace);

                        await this._scanProject(workspacePath);
                    }
                }
            }
        } catch (e) {
            // console.log(`package.json can not read: ${projectPackage}`);
        }
    }

    /**
     * scan
     */
    public async scan(): Promise<void> {
        await this._scanProject(this._rootPath);
    }

}
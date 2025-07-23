import * as path from "path";
import {readdir, stat} from 'fs/promises';

/**
 * Schema path util
 */
export class SchemaPathUtil {

    /**
     * Return a relativ import path
     * @param {string} fromPath
     * @param {string} toPath
     * @return {string}
     */
    public static getRelativeImportPath(fromPath: string, toPath: string): string {
        const fromDir = path.dirname(fromPath);
        let relativePath = path.relative(fromDir, toPath);

        if (!relativePath.startsWith(".")) {
            relativePath = "./" + relativePath;
        }

        return relativePath.replace(/\\/g, "/");
    }

    /**
     * Exist a directory
     * @param {string} director
     * @returns {boolean}
     */
    public static async directoryExist(director: string): Promise<boolean> {
        try {
            return (await stat(director)).isDirectory();
        } catch (e) {
            return false;
        }
    }

    /**
     * Read files by path
     * @param {string} dir
     * @param {boolean} recursive
     * @param {string} base
     * @returns {string[]}
     */
    public static async getFiles(dir: string, recursive: boolean = false, base: string = dir): Promise<string[]> {
        const entries = await readdir(dir, { withFileTypes: true });

        const files = await Promise.all(entries.map(async(entry) => {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory() && recursive) {
                return this.getFiles(fullPath, recursive, base);
            } else {
                return [path.relative(base, fullPath)];
            }
        }));

        return files.flat();
    }

}
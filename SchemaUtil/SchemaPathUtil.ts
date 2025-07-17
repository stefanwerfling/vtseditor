import * as path from "path";

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

}
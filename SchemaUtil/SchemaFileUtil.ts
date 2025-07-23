import {readFile} from 'fs/promises';

export class SchemaFileUtil {

    /**
     * Read a content from File and parse as a JSON object
     * @param {string} jsonFile
     * @return {unknown}
     */
    public static async readJsonFile(jsonFile: string): Promise<unknown> {
        const raw = await SchemaFileUtil.fileRead(jsonFile);

        return JSON.parse(raw);
    }

    /**
     * Read a File content
     * @param {string} file
     * @param {BufferEncoding} encoding
     * @return {string}
     * @throws
     */
    public static async fileRead(file: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
        return readFile(file, {
            encoding: encoding
        });
    }

}
/**
 * Schema name util
 */
export class SchemaNameUtil {

    /**
     * Validate name
     * @param {string} name
     * @return {string}
     */
    public static validateName(name: string): string {
        let nName = name.trim();
        nName = nName.replace(/[^a-zA-Z0-9]+/g, '_');

        if (nName.length === 0) {
            nName = 'EmptyName'
        }

        if (!/^[a-zA-Z]/.test(nName)) {
            nName = 'A' + nName;
        }

        return nName;
    }

    /**
     * Validate enum name
     * @param {string} name
     * @return {string}
     */
    public static validateEnumName(name: string): string {
        return this.validateName(name).toUpperCase();
    }
}
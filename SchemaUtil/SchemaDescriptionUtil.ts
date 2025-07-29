/**
 * Schema description util
 */
export class SchemaDescriptionUtil {

    /**
     * validate description
     * @param {string} description
     * @return {string}
     */
    public static validateDescription(description: string): string {
        return description
        .replace(/(\r\n|\r|\n)+/g, ' ')
        .trim();
    }

}
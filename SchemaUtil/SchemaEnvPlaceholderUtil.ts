/**
 * Schema env placeholder util
 */
export class SchemaEnvPlaceholderUtil {

    /**
     * Replace
     * @param {string} value
     * @return {string}
     */
    public static replace(value: string): string {
        if (value.startsWith("$")) {
            const envName = value.substring(1);

            return process.env[envName] || value;
        }

        return value;
    }

}
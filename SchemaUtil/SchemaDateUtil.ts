
export class SchemaDateUtil {

    public static getTimestamp(): string {
        const now = new Date();
        const ms = now.getMilliseconds().toString().padStart(3, '0');
        return `${now.toISOString().replace('T', ' ').replace('Z', '')}.${ms}`;
    }

}
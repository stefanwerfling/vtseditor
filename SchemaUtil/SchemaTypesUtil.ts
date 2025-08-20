import {MapVtsAll, TypeVtsObject} from '../SchemaTypes/SchemaTypes.js';

/**
 * Schema Types util
 */
export class SchemaTypesUtil {

    public static isVtsType(type: string, ignoreObject: boolean = false): boolean {
        if (ignoreObject && type === TypeVtsObject) {
            return false;
        }

        return MapVtsAll.has(type);
    }

}
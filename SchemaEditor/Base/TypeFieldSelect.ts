import {FieldSelectBase, FieldSelectCategory, FieldSelectEventChange} from './FieldSelectBase.js';
import {SchemaTypes} from '../Register/SchemaTypes.js';

export {FieldSelectCategory as TypeFieldSelectCategory};
export type TypeFieldSelectEventChange = FieldSelectEventChange;

/**
 * TypeSelect — lets the user pick any VTS type, in-project schema or enum.
 */
export class TypeFieldSelect extends FieldSelectBase {

    /**
     * Constructor
     * @param {string} tableUnid
     */
    public constructor(tableUnid: string) {
        super();

        const types = SchemaTypes.getInstance();
        this.setOptions(types.getVtsTypes(), FieldSelectCategory.vtstype);
        this.setOptions(types.getSchemaTypes([tableUnid]), FieldSelectCategory.schema);
        this.setOptions(types.getEnumTypes([tableUnid]), FieldSelectCategory.enum);
    }
}
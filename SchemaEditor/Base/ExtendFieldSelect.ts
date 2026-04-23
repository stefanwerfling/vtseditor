import {FieldSelectBase, FieldSelectCategory, FieldSelectEventChange} from './FieldSelectBase.js';
import {SchemaTypes} from '../Register/SchemaTypes.js';

export {FieldSelectCategory as ExtendFieldSelectCategory};
export type ExtendFieldSelectEventChange = FieldSelectEventChange;

/**
 * ExtendFieldSelect — variant used for extend-type descriptions. Can optionally
 * drop the complex VTS types (object/array/or) via the `withoutComplexVTS` flag,
 * which is what the nested "Values Schema" picker in ExtendType needs.
 */
export class ExtendFieldSelect extends FieldSelectBase {

    /**
     * Constructor
     * @param {string} tableUnid
     * @param {boolean} withoutComplexVTS
     */
    public constructor(tableUnid: string, withoutComplexVTS: boolean = false) {
        super();

        const types = SchemaTypes.getInstance();
        const vtsOptions = withoutComplexVTS ? types.getExtendVtsSimpleTypes() : types.getExtendVtsTypes();

        this.setOptions(vtsOptions, FieldSelectCategory.vtstype);
        this.setOptions(types.getSchemaTypes([tableUnid]), FieldSelectCategory.schema);
        this.setOptions(types.getEnumTypes([tableUnid]), FieldSelectCategory.enum);
    }
}
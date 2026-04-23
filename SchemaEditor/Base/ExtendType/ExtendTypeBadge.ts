import {
    JsonSchemaDescriptionExtend,
    JsonSchemaDescriptionExtendValue,
    SchemaJsonSchemaDescriptionExtend
} from '../../JsonData.js';
import {SchemaTypes} from '../../Register/SchemaTypes.js';
import {EditorEvents} from '../EditorEvents.js';

/**
 * Extend type badge data
 */
type ExtendTypeBadgeData = JsonSchemaDescriptionExtend|JsonSchemaDescriptionExtendValue;

/**
 * Extend type badge
 */
export class ExtendTypeBadge {

    /**
     * Main span
     * @protected
     */
    protected _mainSpan: HTMLSpanElement;

    /**
     * Constructor
     * @param {ExtendTypeBadgeData} data
     * @param {boolean} isAlternating
     */
    public constructor(data: ExtendTypeBadgeData, isAlternating: boolean = false) {
        this._mainSpan = document.createElement('span');
        this._mainSpan.classList.add('extendtype-span-short');
        let contentElement = this._mainSpan;

        // getExtendNameBy returns a name for enums too (enums live inside the
        // merged _getAllExtends map), so checking `extendName === null` is not
        // a reliable enum signal. Detect via the enum map directly.
        const isEnum = SchemaTypes.getInstance().getEnumTypes().has(data.type);
        let extendName = SchemaTypes.getInstance().getExtendNameBy(data.type);

        if (isEnum) {
            extendName = SchemaTypes.getInstance().getTypeNameBy(data.type);
        }

        const spanType = document.createElement('span');
        spanType.classList.add('extendtype-span-short');
        spanType.textContent = `${extendName}`;

        if (SchemaTypes.getInstance().isTypeASchema(data.type) || isEnum) {
            spanType.classList.add(isEnum ? 'vts-badge-wh-7' : 'vts-badge-wh-2');
            spanType.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent(EditorEvents.showTable, {
                    detail: {
                        tableId: data.type
                    }
                }));
            });
        } else {
            switch (data.type) {
                case 'array':
                    spanType.classList.add(...['vts-badge-wh-5']);
                    break;

                default:
                    if (isAlternating) {
                        spanType.classList.add(...['vts-badge-wh-3']);
                    } else {
                        spanType.classList.add(...['vts-badge-wh-1']);
                    }
            }
        }

        contentElement.appendChild(spanType);

        // -------------------------------------------------------------------------------------------------------------

        contentElement = spanType;

        if ((data.type === 'object2' || data.type === 'array') && data.value) {
            const spanType = this._createSubBadgeSpan(data.value);
            spanType.classList.add('extendtype-span-short');
            contentElement.appendChild(spanType);
        }

        // -------------------------------------------------------------------------------------------------------------

        if (SchemaJsonSchemaDescriptionExtend.validate(data, [])) {
            if (data.type === 'or' && data.or_values) {
                for (const aData of data.or_values) {
                    const badge = new ExtendTypeBadge(aData, !isAlternating);

                    contentElement.appendChild(badge.getElement());
                }
            }
        }

    }

    /**
     * create sub badge span
     * @param {string} value
     * @return {HTMLSpanElement}
     * @protected
     */
    protected _createSubBadgeSpan(value: string): HTMLSpanElement {
        // Detect via the enum map directly — getTypeNameBy() returns a name
        // for enums too, so the old `extendName2 === null` heuristic always
        // missed and sub-enums got painted with the schema-blue wh-6.
        const isEnum2 = SchemaTypes.getInstance().getEnumTypes().has(value);
        const extendName2 = SchemaTypes.getInstance().getTypeNameBy(value);

        const spanType = document.createElement('span');
        spanType.textContent = `${extendName2}`;

        if (SchemaTypes.getInstance().isTypeASchema(value) || isEnum2) {
            spanType.classList.add(isEnum2 ? 'vts-badge-wh-7' : 'vts-badge-wh-6');

            spanType.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent(EditorEvents.showTable, {
                    detail: {
                        tableId: value
                    }
                }));
            });
        } else {
            spanType.classList.add(...['vts-badge-wh-3']);
        }

        return spanType;
    }

    /**
     * Return the Element
     * @return {HTMLSpanElement}
     */
    public getElement(): HTMLSpanElement {
        return this._mainSpan;
    }

}
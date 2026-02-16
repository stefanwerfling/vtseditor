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

        let extendName = SchemaTypes.getInstance().getExtendNameBy(data.type);

        let isEnum = false;

        if (extendName === null && SchemaTypes.getInstance().getEnumTypes().has(data.type)) {
            extendName = SchemaTypes.getInstance().getTypeNameBy(data.type);
            isEnum = true;
        }

        const spanType = document.createElement('span');
        spanType.classList.add('extendtype-span-short');
        spanType.textContent = `${extendName}`;

        if (SchemaTypes.getInstance().isTypeASchema(data.type) || isEnum) {
            spanType.classList.add(...['vts-badge-wh-2']);
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
        let extendName2 = SchemaTypes.getInstance().getTypeNameBy(value);
        let isEnum2 = false;

        if (extendName2 === null && SchemaTypes.getInstance().getEnumTypes().has(value)) {
            extendName2 = SchemaTypes.getInstance().getTypeNameBy(value);
            isEnum2 = true;
        }

        const spanType = document.createElement('span');
        spanType.textContent = `${extendName2}`;

        if (SchemaTypes.getInstance().isTypeASchema(value) || isEnum2) {
            if (isEnum2) {
                spanType.classList.add(...['vts-badge-wh-2']);
            } else {
                spanType.classList.add(...['vts-badge-wh-6']);
            }

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
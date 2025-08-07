import {JsonSchemaFieldType, SchemaJsonSchemaFieldTypeArray} from '../../JsonData.js';
import {SchemaTypes} from '../../SchemaTypes.js';
import './MultiTypeFieldBadge.css';

/**
 * Badge
 */
export class MultiTypeFieldBadge {

    /**
     * Main span
     * @protected
     */
    protected _mainSpan: HTMLSpanElement;

    /**
     * Constructor
     * @param {JsonSchemaFieldType} data
     * @param {boolean} isAlternating
     */
    public constructor(data: JsonSchemaFieldType, isAlternating: boolean = false) {
        this._mainSpan = document.createElement('span');
        let contentElement = this._mainSpan;

        if (data.array) {
            const spanArray = document.createElement('span');
            spanArray.textContent = 'Array';
            spanArray.classList.add(...['vts-badge-wh-5']);
            contentElement.appendChild(spanArray);
            contentElement = spanArray;
        }

        const typename = SchemaTypes.getInstance().getTypeNameBy(data.type) ?? 'unknown';
        const spanType = document.createElement('span');
        spanType.textContent = `${typename}`;

        if (SchemaTypes.getInstance().isTypeASchema(data.type)) {
            spanType.classList.add(...['vts-badge-wh-2']);
            spanType.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('schemaeditor:showtable', {
                    detail: {
                        tableId: data.type
                    }
                }));
            });
        } else {
            if (isAlternating) {
                spanType.classList.add(...['vts-badge-wh-3']);
            } else {
                spanType.classList.add(...['vts-badge-wh-1']);
            }
        }

        contentElement.appendChild(spanType);
        contentElement = spanType;

        if (data.type === 'or') {
            if (SchemaJsonSchemaFieldTypeArray.validate(data.types, [])) {

                for (const aData of data.types) {
                    const fieldBadge = new MultiTypeFieldBadge(aData, !isAlternating);

                    contentElement.appendChild(fieldBadge.getElement());
                }
            }
        }
    }

    /**
     * Return the Element
     * @return {HTMLSpanElement}
     */
    public getElement(): HTMLSpanElement {
        return this._mainSpan;
    }
}
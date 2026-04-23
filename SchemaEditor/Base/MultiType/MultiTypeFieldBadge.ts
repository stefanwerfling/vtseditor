import {JsonSchemaFieldType, SchemaJsonSchemaFieldTypeArray} from '../../JsonData.js';
import {SchemaTypes} from '../../Register/SchemaTypes.js';
import './MultiTypeFieldBadge.css';
import {EditorEvents} from '../EditorEvents.js';

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

        // NOTE: SchemaTypes.isTypeASchema() returns true for both schemas and
        // enums — check enum first and treat it as the authoritative signal,
        // otherwise enum refs would land on the schema branch and lose the
        // green distinction.
        const isEnum = SchemaTypes.getInstance().getEnumTypes().has(data.type);
        const isSchema = !isEnum && SchemaTypes.getInstance().isTypeASchema(data.type);

        if (isSchema || isEnum) {
            spanType.classList.add(isEnum ? 'vts-badge-wh-7' : 'vts-badge-wh-2');
            spanType.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent(EditorEvents.showTable, {
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
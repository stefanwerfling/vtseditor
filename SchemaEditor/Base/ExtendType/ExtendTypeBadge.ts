import {JsonSchemaDescriptionExtend} from '../../JsonData.js';
import {SchemaExtends} from '../../Register/SchemaExtends.js';

export class ExtendTypeBadge {

    /**
     * Main span
     * @protected
     */
    protected _mainSpan: HTMLSpanElement;

    public constructor(data: JsonSchemaDescriptionExtend) {
        this._mainSpan = document.createElement('span');
        let contentElement = this._mainSpan;

        const extendName = SchemaExtends.getInstance().getExtendNameBy(data.type);

        const spanType = document.createElement('span');
        spanType.textContent = `${extendName}`;

        if (SchemaExtends.getInstance().isExtendASchema(data.type)) {
            spanType.classList.add(...['vts-badge-wh-2']);
            spanType.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('schemaeditor:showtable', {
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
                    spanType.classList.add(...['vts-badge-wh-1']);
            }
        }

        contentElement.appendChild(spanType);

        // -------------------------------------------------------------------------------------------------------------

        contentElement = spanType;

        if ((data.type === 'object2' || data.type === 'array') && data.values_schema) {
            const extendName2 = SchemaExtends.getInstance().getExtendNameBy(data.values_schema);
            const spanType = document.createElement('span');
            spanType.textContent = `${extendName2}`;

            if (SchemaExtends.getInstance().isExtendASchema(data.values_schema)) {
                spanType.classList.add(...['vts-badge-wh-6']);
                spanType.addEventListener('click', () => {
                    window.dispatchEvent(new CustomEvent('schemaeditor:showtable', {
                        detail: {
                            tableId: data.values_schema
                        }
                    }));
                });
            } else {
                spanType.classList.add(...['vts-badge-wh-3']);
            }

            contentElement.appendChild(spanType);
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
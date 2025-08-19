import './ExtendType.css';
import {JsonSchemaDescriptionExtend} from '../../JsonData.js';
import {SchemaExtends} from '../../Register/SchemaExtends.js';
import {ExtendFieldSelect} from '../ExtendFieldSelect.js';

/**
 * Extend Type
 */
export class ExtendType {

    /**
     * unid
     * @protected
     */
    protected _unid: string = '';

    /**
     * div main field
     * @protected
     */
    protected _divMainField: HTMLDivElement;

    /**
     * select field
     * @protected
     */
    protected _select: ExtendFieldSelect;

    /**
     * div option container
     * @protected
     */
    protected _divOptionContainer: HTMLDivElement;

    /**
     * Label Ignore additional items
     * @protected
     */
    protected _labelIai: HTMLLabelElement;

    /**
     * checkbox Ignore additional items
     * @protected
     */
    protected _checkboxIai: HTMLInputElement;

    /**
     * checkbox not export
     * @protected
     */
    protected _checkboxNotExport: HTMLInputElement;

    /**
     * object 2 container
     * @protected
     */
    protected _divValueSchemaContainer: HTMLDivElement;

    /**
     * Select value Schema
     * @protected
     */
    protected _selectValueSchema: ExtendFieldSelect;

    /**
     * constructor
     * @param {string} tableUnid
     * @param {string} unid
     */
    public constructor(tableUnid: string, unid: string = '') {
        this._unid = unid === '' ? crypto.randomUUID() : unid;
        this._divMainField = document.createElement('div');
        this._divMainField.classList.add('extendtype-container');

        // select div --------------------------------------------------------------------------------------------------

        const valueContainer = document.createElement('div');
        valueContainer.classList.add(...['extendtypefield-value']);
        this._divMainField.appendChild(valueContainer);

        this._select = new ExtendFieldSelect(tableUnid);
        this._select.setEventChange(value => {
            this._onUpdateOptions(value);
        });

        valueContainer.appendChild(this._select.getElement());

        this._divOptionContainer = document.createElement('div');
        this._divMainField.appendChild(this._divOptionContainer);

        // optional ----------------------------------------------------------------------------------------------------
        this._divOptionContainer.classList.add('dialog-row');
        this._divOptionContainer.style.display = 'flex';
        this._divOptionContainer.style.gap = '24px';

        // --- ignore additional items Checkbox ---
        this._labelIai = document.createElement('label');
        this._labelIai.classList.add('dialog-label');
        this._labelIai.textContent = 'Ignore additional items';
        this._labelIai.style.display = 'flex';
        this._labelIai.style.alignItems = 'center';
        this._labelIai.style.gap = '6px';

        this._checkboxIai = document.createElement('input');
        this._checkboxIai.type = 'checkbox';
        this._checkboxIai.classList.add('dialog-checkbox');

        this._labelIai.prepend(this._checkboxIai);
        this._divOptionContainer.appendChild(this._labelIai);

        // --- not export Checkbox ---
        const labelNotExport = document.createElement('label');
        labelNotExport.classList.add('dialog-label');
        labelNotExport.textContent = 'Not export';
        labelNotExport.style.display = 'flex';
        labelNotExport.style.alignItems = 'center';
        labelNotExport.style.gap = '6px';

        this._checkboxNotExport = document.createElement('input');
        this._checkboxNotExport.type = 'checkbox';
        this._checkboxNotExport.classList.add('dialog-checkbox');

        labelNotExport.prepend(this._checkboxNotExport);
        this._divOptionContainer.appendChild(labelNotExport);

        // --- object2 value

        this._divValueSchemaContainer = document.createElement('div');
        this._divMainField.appendChild(this._divValueSchemaContainer);

        const labelSchemaValue = document.createElement('div');
        labelSchemaValue.classList.add('dialog-label');
        labelSchemaValue.textContent = 'Values Schema';
        this._divValueSchemaContainer.appendChild(labelSchemaValue);

        this._selectValueSchema = new ExtendFieldSelect(tableUnid, true);
        this._divValueSchemaContainer.appendChild(this._selectValueSchema.getElement());

        // init
        this._hideObjectOptions();
        this._hideValueSchemaOptions();
    }

    /**
     * on Update options
     * @param {string} value
     * @protected
     */
    protected _onUpdateOptions(value: string): void {
        this._hideObjectOptions();
        this._hideValueSchemaOptions();

        switch (value) {
            case 'object':
                this._showObjectOptions();
                break;

            case 'array':
            case 'object2':
                this._showValueSchemaOptions();
                break;
        }

        if (SchemaExtends.getInstance().isExtendASchema(value)) {
            this._showObjectOptions();
        }
    }

    /**
     * show object options
     * @protected
     */
    protected _showObjectOptions(): void {
        this._labelIai.style.display = 'flex';
    }

    /**
     * hide object options
     * @protected
     */
    protected _hideObjectOptions(): void {
        this._labelIai.style.display = 'none';
    }

    /**
     * show value schema options
     * @protected
     */
    protected _showValueSchemaOptions(): void {
        this._divValueSchemaContainer.style.display = '';
    }

    /**
     * hide value schema options
     * @protected
     */
    protected _hideValueSchemaOptions(): void {
        this._divValueSchemaContainer.style.display = 'none';
    }

    /**
     * Return unid
     * @return {string}
     */
    public getUnid(): string {
        return this._unid;
    }

    /**
     * Return the element
     * @return {HTMLDivElement}
     */
    public getElement(): HTMLDivElement {
        return this._divMainField;
    }

    /**
     * Return the value
     * @return {JsonSchemaDescriptionExtend}
     */
    public getValue(): JsonSchemaDescriptionExtend {
        return {
            type: this._select.getValue() ?? 'object',
            options: {
                not_export: this._checkboxNotExport.checked,
                ignore_additional_items: this._checkboxIai.checked
            },
            values_schema: this._selectValueSchema.getValue() ?? undefined
        };
    }

    /**
     * Set the value
     * @param {JsonSchemaDescriptionExtend} value
     */
    public setValue(value: JsonSchemaDescriptionExtend): void {
        this._select.setValue(value.type);
        this._checkboxNotExport.checked = value.options?.not_export ?? false;
        this._checkboxIai.checked = value.options?.ignore_additional_items ?? false;
        this._selectValueSchema.setValue(value.values_schema ?? '');
        this._onUpdateOptions(value.type);
    }

}
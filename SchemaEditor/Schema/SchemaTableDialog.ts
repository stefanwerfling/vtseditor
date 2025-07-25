import {SchemaNameUtil} from '../../SchemaUtil/SchemaNameUtil.js';
import {BaseDialog} from '../Base/BaseDialog.js';
import {JsonSchemaDescriptionOption} from '../JsonData.js';

/**
 * Schema table dialog
 */
export class SchemaTableDialog extends BaseDialog {

    /**
     * Input name
     * @protected
     */
    protected _inputName: HTMLInputElement;

    /**
     * Select Extend
     * @protected
     */
    protected _selectExtend: HTMLSelectElement;

    /**
     * Row div values schema
     * @protected
     */
    protected _rowDivValuesSchema: HTMLDivElement;

    /**
     * Select values schema
     * @protected
     */
    protected _selectValuesSchema: HTMLSelectElement;

    /**
     * Checkbox Ignore additional items
     * @protected
     */
    protected _checkboxIai: HTMLInputElement;

    /**
     * textarea description
     * @protected
     */
    protected _textareaDescription: HTMLTextAreaElement;

    /**
     * constructor
     */
    public constructor() {
        super();
        this.setDialogTitle('Edit Schema');

        // name --------------------------------------------------------------------------------------------------------

        const labelName = document.createElement('div');
        labelName.classList.add('dialog-label');
        labelName.textContent = 'Schemaname';
        this._divBody.appendChild(labelName);

        this._inputName = document.createElement('input');
        this._inputName.type = 'text';
        this._inputName.classList.add('dialog-input');
        this._inputName.placeholder = 'Schemaname';

        this._divBody.appendChild(this._inputName);

        // Extend ------------------------------------------------------------------------------------------------------

        const labelExtend = document.createElement('div');
        labelExtend.classList.add('dialog-label');
        labelExtend.textContent = 'Extend';
        this._divBody.appendChild(labelExtend);

        this._selectExtend = document.createElement('select');
        this._selectExtend.classList.add('dialog-select');
        this._selectExtend.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;

            this._visableValuesSchema(target.value === 'object2');
        });

        this._divBody.appendChild(this._selectExtend);

        // values schema -----------------------------------------------------------------------------------------------

        this._rowDivValuesSchema = document.createElement('div');
        this._rowDivValuesSchema.classList.add('.dialog-column');
        this._divBody.appendChild(this._rowDivValuesSchema);
        this._rowDivValuesSchema.style.display = 'none';
        this._divBody.appendChild(this._rowDivValuesSchema);

        const labelValuesSchema = document.createElement('div');
        labelValuesSchema.classList.add('dialog-label');
        labelValuesSchema.textContent = 'Values Schema';
        this._rowDivValuesSchema.appendChild(labelValuesSchema);

        this._selectValuesSchema = document.createElement('select');
        this._selectValuesSchema.classList.add('dialog-select');
        this._rowDivValuesSchema.appendChild(this._selectValuesSchema);

        // optional ----------------------------------------------------------------------------------------------------

        const wrapper = document.createElement('div');
        wrapper.classList.add('dialog-row');
        wrapper.style.display = 'flex';
        wrapper.style.gap = '24px';

        // ignore additional items -------------------------------------------------------------------------------------

        // --- ignore additional items Checkbox ---
        const labelIai = document.createElement('label');
        labelIai.classList.add('dialog-label');
        labelIai.textContent = 'Ignore additional items';
        labelIai.style.display = 'flex';
        labelIai.style.alignItems = 'center';
        labelIai.style.gap = '6px';

        this._checkboxIai = document.createElement('input');
        this._checkboxIai.type = 'checkbox';
        this._checkboxIai.classList.add('dialog-checkbox');

        labelIai.prepend(this._checkboxIai);
        wrapper.appendChild(labelIai);


        this._divBody.appendChild(wrapper);

        // description -------------------------------------------------------------------------------------------------

        const labelDescription = document.createElement('div');
        labelDescription.classList.add('dialog-label');
        labelDescription.textContent = 'Description';
        this._divBody.appendChild(labelDescription);

        this._textareaDescription = document.createElement('textarea');
        this._textareaDescription.placeholder = 'Your description ...';
        this._textareaDescription.rows = 8;

        this._divBody.appendChild(this._textareaDescription);
    }

    /**
     * Visable values schema setting
     * @param {boolean} visable
     * @protected
     */
    protected _visableValuesSchema(visable: boolean): void {
        if (visable) {
            this._rowDivValuesSchema.style.display = '';
        } else {
            this._rowDivValuesSchema.style.display = 'none';
        }
    }

    /**
     * Set types options
     * @param {Map<string, string>} options
     */
    public setExtendOptions(options: Map<string, string>): void {
        this._selectExtend.innerHTML = '';

        for (const [typeName, typeValue] of options.entries()) {
            const option = document.createElement('option');
            option.value = typeName;
            option.textContent = typeValue;

            this._selectExtend.appendChild(option);
        }
    }

    /**
     * Set schemas
     * @param {Map<string, string>} options
     */
    public setValuesSchemaOptions(options: Map<string, string>): void {
        this._selectValuesSchema.innerHTML = '';

        for (const [typeName, typeValue] of options.entries()) {
            const option = document.createElement('option');
            option.value = typeName;
            option.textContent = typeValue;

            this._selectValuesSchema.appendChild(option);
        }
    }

    /**
     * Get schema name value
     * @return {string}
     */
    public getSchemaName(): string {
        return SchemaNameUtil.validateName(this._inputName.value);
    }

    /**
     * Set schema name
     * @param {string} name
     */
    public setSchemaName(name: string): void {
        this._inputName.value = name;
    }

    /**
     * Return schema extend
     * @return {string}
     */
    public getSchemaExtend(): string {
        return this._selectExtend.value;
    }

    /**
     * Set schema extend
     * @param {string} extend
     */
    public setSchemaExtend(extend: string): void {
        if (extend === 'object2') {
            this._visableValuesSchema(true);
        }

        this._selectExtend.value = extend;
    }

    /**
     * Return the values schema
     * @return {string}
     */
    public getSchemaValuesSchema(): string {
        return this._selectValuesSchema.value;
    }

    /**
     * Set the values schema
     * @param {string} valuesSchema
     */
    public setSchemaValuesSchema(valuesSchema: string): void {
        this._selectValuesSchema.value = valuesSchema;
    }

    /**
     * Set description
     * @param {string} description
     */
    public setDescription(description: string): void {
        this._textareaDescription.value = description;
    }

    /**
     * Get description
     * @return
     */
    public getDescription(): string {
        return this._textareaDescription.value;
    }

    /**
     * Set options
     * @param {JsonSchemaDescriptionOption} option
     */
    public setOptions(option: JsonSchemaDescriptionOption): void {
        this._checkboxIai.checked = option.ignore_additional_items ?? false;
    }

    /**
     * Return the options
     * @return {JsonSchemaDescriptionOption}
     */
    public getOptions(): JsonSchemaDescriptionOption {
        return {
            ignore_additional_items: this._checkboxIai.checked
        };
    }

}
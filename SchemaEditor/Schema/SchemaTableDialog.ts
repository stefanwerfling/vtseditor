import {SchemaNameUtil} from '../../SchemaUtil/SchemaNameUtil.js';
import {BaseDialog} from '../Base/BaseDialog.js';

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

}
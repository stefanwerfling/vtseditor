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

        this._divBody.appendChild(this._selectExtend);
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
        this._selectExtend.value = extend;
    }

}
import {SchemaNameUtil} from '../../SchemaUtil/SchemaNameUtil.js';
import {BaseDialog} from '../Base/BaseDialog.js';

/**
 * Enum table value dialog
 */
export class EnumTableValueDialog extends BaseDialog {

    /**
     * Input name
     * @protected
     */
    protected _inputName: HTMLInputElement;

    /**
     * Input value
     * @protected
     */
    protected _inputValue: HTMLInputElement;


    /**
     * constructor
     */
    public constructor() {
        super();
        this.setDialogTitle('Add/Edit Value');

        // Name --------------------------------------------------------------------------------------------------------

        const labelName = document.createElement('div');
        labelName.classList.add('dialog-label');
        labelName.textContent = 'Name';
        this._divBody.appendChild(labelName);

        this._inputName = document.createElement('input');
        this._inputName.type = 'text';
        this._inputName.classList.add('dialog-input');
        this._inputName.placeholder = 'Name';

        this._divBody.appendChild(this._inputName);

        // Value -------------------------------------------------------------------------------------------------------

        const labelValue = document.createElement('div');
        labelValue.classList.add('dialog-label');
        labelValue.textContent = 'Value';
        this._divBody.appendChild(labelValue);

        this._inputValue = document.createElement('input');
        this._inputValue.type = 'text';
        this._inputValue.classList.add('dialog-input');
        this._inputValue.placeholder = 'Value';

        this._divBody.appendChild(this._inputValue);
    }

    /**
     * Get name value
     * @return {string}
     */
    public getName(): string {
        return SchemaNameUtil.validateName(this._inputName.value);
    }

    /**
     * Set name
     * @param {string} name
     */
    public setName(name: string): void {
        this._inputName.value = name;
    }

    /**
     * Get value
     * @return {string}
     */
    public getValue(): string {
        return this._inputValue.value;
    }

    /**
     * Set value
     * @param {string} value
     */
    public setValue(value: string): void {
        this._inputValue.value = value;
    }

}
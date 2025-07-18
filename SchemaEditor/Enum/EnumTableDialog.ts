import {SchemaNameUtil} from '../../SchemaUtil/SchemaNameUtil.js';
import {BaseDialog} from '../Base/BaseDialog.js';

/**
 * Enum table dialog
 */
export class EnumTableDialog extends BaseDialog {

    /**
     * Input name
     * @protected
     */
    protected _inputName: HTMLInputElement;

    /**
     * constructor
     */
    public constructor() {
        super();
        this.setDialogTitle('Edit Enum');

        // input name --------------------------------------------------------------------------------------------------

        const labelName = document.createElement('div');
        labelName.classList.add('dialog-label');
        labelName.textContent = 'Enumname';
        this._divBody.appendChild(labelName);

        this._inputName = document.createElement('input');
        this._inputName.type = 'text';
        this._inputName.classList.add('dialog-input');
        this._inputName.placeholder = 'Enumname';

        this._divBody.appendChild(this._inputName);
    }

    /**
     * Get enum name value
     * @return {string}
     */
    public getEnumName(): string {
        return SchemaNameUtil.validateName(this._inputName.value);
    }

    /**
     * Set enum name
     * @param {string} name
     */
    public setEnumName(name: string): void {
        this._inputName.value = name;
    }


}
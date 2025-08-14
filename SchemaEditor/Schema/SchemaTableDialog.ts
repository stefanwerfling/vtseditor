import {SchemaNameUtil} from '../../SchemaUtil/SchemaNameUtil.js';
import {BaseDialog} from '../Base/BaseDialog.js';
import {ExtendType} from '../Base/ExtendType/ExtendType.js';
import {JsonSchemaDescriptionExtend} from '../JsonData.js';

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
    protected _selectExtend: ExtendType;

    /**
     * textarea description
     * @protected
     */
    protected _textareaDescription: HTMLTextAreaElement;

    /**
     * constructor
     * @param {string} tableUnid
     */
    public constructor(tableUnid: string) {
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

        this._selectExtend = new ExtendType(tableUnid);

        this._divBody.appendChild(this._selectExtend.getElement());

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
     * @return {JsonSchemaDescriptionExtend}
     */
    public getSchemaExtend(): JsonSchemaDescriptionExtend {
        return this._selectExtend.getValue();
    }

    /**
     * Set the schema extend
     * @param {JsonSchemaDescriptionExtend} extend
     */
    public setSchemaExtend(extend: JsonSchemaDescriptionExtend) {
        this._selectExtend.setValue(extend);
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

}
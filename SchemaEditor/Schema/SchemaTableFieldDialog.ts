import {SchemaNameUtil} from '../../SchemaUtil/SchemaNameUtil.js';
import {BaseDialog} from '../Base/BaseDialog.js';
import {MultiTypeField} from '../Base/MultiType/MultiTypeField.js';
import {JsonSchemaFieldType} from '../JsonData.js';

/**
 * Schema Table field dialog
 */
export class SchemaTableFieldDialog extends BaseDialog {

    /**
     * Input name
     * @protected
     */
    protected _inputName: HTMLInputElement;

    /**
     * multi type
     * @protected
     */
    protected _multiType: MultiTypeField;

    /**
     * select Subtypes
     * @protected
     */
    protected _selectSubTypes: HTMLSelectElement[] = [];


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
        this.setDialogTitle('Add/Edit Field');

        // fieldname ---------------------------------------------------------------------------------------------------

        const labelName = document.createElement('div');
        labelName.classList.add('dialog-label');
        labelName.textContent = 'Fieldname';
        this._divBody.appendChild(labelName);

        this._inputName = document.createElement('input');
        this._inputName.type = 'text';
        this._inputName.classList.add('dialog-input');
        this._inputName.placeholder = 'Fieldname';

        this._divBody.appendChild(this._inputName);

        // multi type --------------------------------------------------------------------------------------------------

        const labelTypeM = document.createElement('div');
        labelTypeM.classList.add('dialog-label');
        labelTypeM.textContent = 'Type';
        this._divBody.appendChild(labelTypeM);

        this._multiType = new MultiTypeField();
        this._divBody.appendChild(this._multiType.getElement());

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
     * Get field name value
     * @return {string}
     */
    public getFieldName(): string {
        return SchemaNameUtil.validateName(this._inputName.value);
    }

    /**
     * Set field name
     * @param {string} name
     */
    public setFieldName(name: string): void {
        this._inputName.value = name;
    }

    /**
     * Return field type
     * @return {string}
     */
    public getFieldType(): JsonSchemaFieldType {
        return this._multiType.getValue();
    }

    /**
     * Set field type
     * @param {JsonSchemaFieldType} type
     */
    public setFieldType(type: JsonSchemaFieldType): void {
        this._multiType.setValue(type);
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
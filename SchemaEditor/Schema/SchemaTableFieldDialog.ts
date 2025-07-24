import {SchemaNameUtil} from '../../SchemaUtil/SchemaNameUtil.js';
import {BaseDialog} from '../Base/BaseDialog.js';

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
     * Select type
     * @protected
     */
    protected _selectType: HTMLSelectElement;

    /**
     * select Subtypes
     * @protected
     */
    protected _selectSubTypes: HTMLSelectElement[] = [];

    /**
     * checkbox optional
     * @protected
     */
    protected _checkboxOptional: HTMLInputElement;

    /**
     * checkbox array
     * @protected
     */
    protected _checkboxArray: HTMLInputElement;

    /**
     * textarea description
     * @protected
     */
    protected _textareaDescription: HTMLTextAreaElement;

    /**
     * type options
     * @protected
     */
    protected _typeOptions: Map<string, string> = new Map<string, string>();

    /**
     * Subtypes div
     * @protected
     */
    protected _subtypesDiv: HTMLDivElement;

    /**
     * subtypes select div
     * @protected
     */
    protected _subtypesSelectsDiv: HTMLDivElement;

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

        // type --------------------------------------------------------------------------------------------------------

        const labelType = document.createElement('div');
        labelType.classList.add('dialog-label');
        labelType.textContent = 'Type';
        this._divBody.appendChild(labelType);

        this._selectType = document.createElement('select');
        this._selectType.classList.add('dialog-select');
        this._selectType.addEventListener('change', (event) => {
            this._clearSubtypesSelects();
            const target = event.target as HTMLSelectElement;

            this._visableSubtypes(target.value);
        });

        this._divBody.appendChild(this._selectType);

        // subtypes ----------------------------------------------------------------------------------------------------

        this._subtypesDiv = document.createElement('div');
        this._subtypesDiv.classList.add('dialog-subtypes');
        this._divBody.appendChild(this._subtypesDiv);

        const labelSubTypes = document.createElement('div');
        labelSubTypes.classList.add('dialog-label');
        labelSubTypes.textContent = 'Subtypes';
        this._subtypesDiv.appendChild(labelSubTypes);

        this._subtypesSelectsDiv = document.createElement('div');
        this._subtypesSelectsDiv.classList.add('dialog-subtypes-list');
        this._subtypesDiv.appendChild(this._subtypesSelectsDiv);

        const btnAddSubtype = document.createElement('button');
        btnAddSubtype.textContent = '+';
        btnAddSubtype.style.margin = 'auto';
        btnAddSubtype.classList.add(...['dialog-button', 'centered-button']);
        btnAddSubtype.addEventListener('click', () => {
            if (this.getFieldType() === 'array' && this._selectSubTypes.length > 0) {
                alert('You can only add one subtype for array!');
                return;
            }

            this._addSubtypesSelect();
        });

        this._subtypesDiv.appendChild(btnAddSubtype);

        // optional ----------------------------------------------------------------------------------------------------
        const wrapper = document.createElement('div');
        wrapper.classList.add('dialog-row');
        wrapper.style.display = 'flex';
        wrapper.style.gap = '24px';

        // --- Optional Checkbox ---
        const labelOptional = document.createElement('label');
        labelOptional.classList.add('dialog-label');
        labelOptional.textContent = 'Optional';
        labelOptional.style.display = 'flex';
        labelOptional.style.alignItems = 'center';
        labelOptional.style.gap = '6px';

        this._checkboxOptional = document.createElement('input');
        this._checkboxOptional.type = 'checkbox';
        this._checkboxOptional.classList.add('dialog-checkbox');

        labelOptional.prepend(this._checkboxOptional);
        wrapper.appendChild(labelOptional);

        // --- Array Checkbox ---
        const labelArray = document.createElement('label');
        labelArray.classList.add('dialog-label');
        labelArray.textContent = 'Array';
        labelArray.style.display = 'flex';
        labelArray.style.alignItems = 'center';
        labelArray.style.gap = '6px';

        this._checkboxArray = document.createElement('input');
        this._checkboxArray.type = 'checkbox';
        this._checkboxArray.classList.add('dialog-checkbox');

        labelArray.prepend(this._checkboxArray);
        wrapper.appendChild(labelArray);

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
     * Add subtypes select
     * @protected
     */
    protected _addSubtypesSelect(): HTMLSelectElement {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('dialog-subtypes-item');

        const selectType = document.createElement('select');
        selectType.classList.add('dialog-select');

        for (const [typeName, typeValue] of this._typeOptions.entries()) {
            const option = document.createElement('option');
            option.value = typeName;
            option.textContent = typeValue;

            selectType.appendChild(option);
        }

        itemDiv.appendChild(selectType);

        const btnDelete = document.createElement('button');
        btnDelete.classList.add('delete-button');
        btnDelete.textContent = '🗑️';
        btnDelete.title = 'Delete subtype';
        btnDelete.addEventListener('click', () => {
           itemDiv.remove();

            const index = this._selectSubTypes.indexOf(selectType);

            if (index !== -1) {
                this._selectSubTypes.splice(index, 1);
            }
        });

        itemDiv.appendChild(btnDelete);

        this._subtypesSelectsDiv.appendChild(itemDiv);
        this._selectSubTypes.push(selectType);

        return selectType;
    }

    protected _clearSubtypesSelects(): void {
        for (const select of this._selectSubTypes) {
            if (select.parentElement) {
                select.parentElement.removeChild(select);
            }
        }

        this._selectSubTypes = [];
    }

    /**
     * Visable subtypes
     * @param {string} value
     * @protected
     */
    protected _visableSubtypes(value: string): void {
        switch (value) {
            case 'array':
                this._subtypesDiv.style.display = 'block';
                break;

            case 'or':
                this._subtypesDiv.style.display = 'block';
                break;

            default:
                this._subtypesDiv.style.display = 'none';
        }
    }

    /**
     * Set types options
     * @param {Map<string, string>} options
     */
    public setTypeOptions(options: Map<string, string>): void {
        this._typeOptions = options;
        this._selectType.innerHTML = '';

        for (const [typeName, typeValue] of options.entries()) {
            const option = document.createElement('option');
            option.value = typeName;
            option.textContent = typeValue;

            this._selectType.appendChild(option);
        }

        // default
        this._selectType.value = 'string';
        this._visableSubtypes('string');
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
    public getFieldType(): string {
        return this._selectType.value;
    }

    /**
     * Set field type
     * @param {string} type
     */
    public setFieldType(type: string): void {
        this._selectType.value = type;
        this._visableSubtypes(type);
    }

    /**
     * Get Field subtypes
     * @return {string[]}
     */
    public getFieldSubTypes(): string[] {
        const list: string[] = [];

        for (const select of this._selectSubTypes) {
            list.push(select.value);
        }

        return list;
    }

    /**
     * Set field subtypes
     * @param {string[]} subtypes
     */
    public setFieldSubTypes(subtypes: string[]): void {
        this._clearSubtypesSelects();

        for (const aSubtype of subtypes) {
            const el = this._addSubtypesSelect();
            el.value = aSubtype;
        }
    }

    /**
     * Get optional
     * @return {string}
     */
    public getOptional(): boolean {
        return this._checkboxOptional.checked;
    }

    /**
     * Set optional
     * @param {string} optional
     */
    public setOptional(optional: boolean): void {
        this._checkboxOptional.checked = optional;
    }

    /**
     * Get array
     * @return {boolean}
     */
    public getArray(): boolean {
        return this._checkboxArray.checked;
    }

    /**
     * Set array
     * @param {boolean} isArray
     */
    public setArray(isArray: boolean): void {
        this._checkboxArray.checked = isArray;
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
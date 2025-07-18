import {SchemaNameUtil} from '../../SchemaUtil/SchemaNameUtil.js';

/**
 * Schema table field dialog on close
 */
export type SchemaTableFieldDialogOnClose = () => void;

/**
 * Schema table field dialog on confirm
 */
export type SchemaTableFieldDialogOnConfirm = (dialog: SchemaTableFieldDialog) => boolean;

/**
 * Schema Table field dialog
 */
export class SchemaTableFieldDialog {

    /**
     * Dialog element
     * @protected
     */
    protected _dialog: HTMLDialogElement;

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
     * Select optional
     * @protected
     */
    protected _selectOptional: HTMLSelectElement;

    /**
     * textarea description
     * @protected
     */
    protected _textareaDescription: HTMLTextAreaElement;

    /**
     * on close
     * @protected
     */
    protected _onClose: SchemaTableFieldDialogOnClose|null = null;

    /**
     * on confirm
     * @protected
     */
    protected _onConfirm: SchemaTableFieldDialogOnConfirm|null = null;

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
        this._dialog = document.createElement('dialog');

        const title = document.createElement('div');
        title.classList.add('dialog-title');
        title.textContent = 'Add/Edit Field';

        this._dialog.appendChild(title);

        // fieldname ---------------------------------------------------------------------------------------------------

        const labelName = document.createElement('div');
        labelName.classList.add('dialog-label');
        labelName.textContent = 'Fieldname';
        this._dialog.appendChild(labelName);

        this._inputName = document.createElement('input');
        this._inputName.type = 'text';
        this._inputName.classList.add('dialog-input');
        this._inputName.placeholder = 'Fieldname';

        this._dialog.appendChild(this._inputName);

        // type --------------------------------------------------------------------------------------------------------

        const labelType = document.createElement('div');
        labelType.classList.add('dialog-label');
        labelType.textContent = 'Type';
        this._dialog.appendChild(labelType);

        this._selectType = document.createElement('select');
        this._selectType.classList.add('dialog-select');
        this._selectType.addEventListener('change', (event) => {
            this._clearSubtypesSelects();
            const target = event.target as HTMLSelectElement;

            this._visableSubtypes(target.value);
        });

        this._dialog.appendChild(this._selectType);

        // subtypes ----------------------------------------------------------------------------------------------------

        this._subtypesDiv = document.createElement('div');
        this._subtypesDiv.classList.add('dialog-subtypes');
        this._dialog.appendChild(this._subtypesDiv);

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

        const labelOptional = document.createElement('div');
        labelOptional.classList.add('dialog-label');
        labelOptional.textContent = 'Optional';
        this._dialog.appendChild(labelOptional);

        this._selectOptional = document.createElement('select');
        this._selectOptional.classList.add('dialog-select');

        const optionInc = document.createElement('option');
        optionInc.value = '0';
        optionInc.textContent = 'Field must be included';
        this._selectOptional.appendChild(optionInc);

        const optionOptional = document.createElement('option');
        optionOptional.value = '1';
        optionOptional.textContent = 'Field is optional';
        this._selectOptional.appendChild(optionOptional);

        this._dialog.appendChild(this._selectOptional);

        // description -------------------------------------------------------------------------------------------------

        const labelDescription = document.createElement('div');
        labelDescription.classList.add('dialog-label');
        labelDescription.textContent = 'Description';
        this._dialog.appendChild(labelDescription);

        this._textareaDescription = document.createElement('textarea');
        this._textareaDescription.placeholder = 'Your description ...';
        this._textareaDescription.rows = 8;

        this._dialog.appendChild(this._textareaDescription);

        // buttons -----------------------------------------------------------------------------------------------------

        const btns = document.createElement('div');
        btns.classList.add('dialog-buttons');

        const btnCancel = document.createElement('button');
        btnCancel.textContent = 'Cancel';
        btnCancel.classList.add('dialog-button');
        btnCancel.addEventListener('click', () => {
            if (this._onClose) {
                this._onClose();
            }

            this._close();
        });

        btns.appendChild(btnCancel);

        const btnConfirm = document.createElement('button');
        btnConfirm.textContent = 'Save';
        btnConfirm.classList.add('dialog-button');
        btnConfirm.addEventListener('click', () => {
            if (this._onConfirm) {
                if (this._onConfirm(this)) {
                    this._close();
                }
            } else {
                this._close();
            }
        });


        btns.appendChild(btnConfirm);

        this._dialog.appendChild(btns);

        // -------------------------------------------------------------------------------------------------------------

        document.body.appendChild(this._dialog);
    }

    /**
     * close dialog
     * @protected
     */
    protected _close(): void {
        this._dialog.close();
        this._dialog.remove();
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
        btnDelete.addEventListener('click', ev => {
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
     * Show the dialog
     */
    public show(): void {
        this._dialog.showModal();
    }

    /**
     * Set on close
     * @param {SchemaTableFieldDialogOnClose} event
     */
    public setOnClose(event: SchemaTableFieldDialogOnClose): void {
        this._onClose = event;
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
     * Set on confirm
     * @param {SchemaTableFieldDialogOnConfirm} event
     */
    public setOnConfirm(event: SchemaTableFieldDialogOnConfirm): void {
        this._onConfirm = event;
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
        return this._selectOptional.value === '1';
    }

    /**
     * Set optional
     * @param {string} optional
     */
    public setOptional(optional: boolean): void {
        this._selectOptional.value = optional ? '1' : '0';
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
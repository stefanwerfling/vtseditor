import {SchemaTypes} from './../SchemaTypes.js';

/**
 * Schema table field dialog on close
 */
export type SchemaTableFieldDialogOnClose = () => void;

/**
 * Schema table field dialog on confirm
 */
export type SchemaTableFieldDialogOnConfirm = (dialog: SchemaTableFieldDialog) => void;

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
     * constructor
     */
    public constructor() {
        this._dialog = document.createElement('dialog');

        const title = document.createElement('div');
        title.classList.add('dialog-title');
        title.textContent = 'Add/Edit Field';

        this._dialog.appendChild(title);

        this._inputName = document.createElement('input');
        this._inputName.type = 'text';
        this._inputName.classList.add('dialog-input');
        this._inputName.placeholder = 'Fieldname';

        this._dialog.appendChild(this._inputName);

        this._selectType = document.createElement('select');
        this._selectType.classList.add('dialog-select');

        this._dialog.appendChild(this._selectType);

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
        btnConfirm.textContent = 'Ok';
        btnConfirm.classList.add('dialog-button');
        btnConfirm.addEventListener('click', () => {
            if (this._onConfirm) {
                this._onConfirm(this);
            }

            this._close();
        });


        btns.appendChild(btnConfirm);

        this._dialog.appendChild(btns);

        // -------------------------------------------------------------------------------------------------------------

        document.body.appendChild(this._dialog);
    }

    protected _close(): void {
        this._dialog.close();
        this._dialog.remove();
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
        this._selectType.innerHTML = '';

        for (const [typeName, typeValue] of options.entries()) {
            const option = document.createElement('option');
            option.value = typeName;
            option.textContent = typeValue;

            this._selectType.appendChild(option);
        }
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
        return this._inputName.value.trim();
    }

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

    public setFieldType(type: string): void {
        this._selectType.value = type;
    }
}
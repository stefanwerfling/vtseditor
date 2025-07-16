import {SchemaNameUtil} from '../../SchemaUtil/SchemaNameUtil.js';

/**
 * Schema table dialog on close
 */
export type SchemaTableDialogOnClose = () => void;

/**
 * Schema table dialog on confirm
 */
export type SchemaTableDialogOnConfirm = (dialog: SchemaTableDialog) => boolean;

export class SchemaTableDialog {

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
     * Select Extend
     * @protected
     */
    protected _selectExtend: HTMLSelectElement;

    /**
     * on close
     * @protected
     */
    protected _onClose: SchemaTableDialogOnClose|null = null;

    /**
     * on confirm
     * @protected
     */
    protected _onConfirm: SchemaTableDialogOnConfirm|null = null;

    /**
     * constructor
     */
    public constructor() {
        this._dialog = document.createElement('dialog');

        const title = document.createElement('div');
        title.classList.add('dialog-title');
        title.textContent = 'Edit Schema';

        this._dialog.appendChild(title);

        this._inputName = document.createElement('input');
        this._inputName.type = 'text';
        this._inputName.classList.add('dialog-input');
        this._inputName.placeholder = 'Schema-name';

        this._dialog.appendChild(this._inputName);

        this._selectExtend = document.createElement('select');
        this._selectExtend.classList.add('dialog-select');

        this._dialog.appendChild(this._selectExtend);

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
     * @param {SchemaTableDialogOnClose} event
     */
    public setOnClose(event: SchemaTableDialogOnClose): void {
        this._onClose = event;
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
     * Set on confirm
     * @param {SchemaTableDialogOnConfirm} event
     */
    public setOnConfirm(event: SchemaTableDialogOnConfirm): void {
        this._onConfirm = event;
    }

    /**
     * Get schema name value
     * @return {string}
     */
    public getSchemaName(): string {
        return SchemaNameUtil.validateName(this._inputName.value);
    }

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

    public setSchemaExtend(extend: string): void {
        this._selectExtend.value = extend;
    }
}
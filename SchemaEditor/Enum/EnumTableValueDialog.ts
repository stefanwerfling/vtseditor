import {SchemaNameUtil} from '../../SchemaUtil/SchemaNameUtil.js';

/**
 * Enum table value dialog on close
 */
export type EnumTableValueDialogOnClose = () => void;

/**
 * Enum table value dialog on confirm
 */
export type EnumTableValueDialogOnConfirm = (dialog: EnumTableValueDialog) => boolean;

/**
 * Enum table value dialog
 */
export class EnumTableValueDialog {

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
     * Input value
     * @protected
     */
    protected _inputValue: HTMLInputElement;

    /**
     * on close
     * @protected
     */
    protected _onClose: EnumTableValueDialogOnClose|null = null;

    /**
     * on confirm
     * @protected
     */
    protected _onConfirm: EnumTableValueDialogOnConfirm|null = null;

    /**
     * constructor
     */
    public constructor() {
        this._dialog = document.createElement('dialog');

        const title = document.createElement('div');
        title.classList.add('dialog-title');
        title.textContent = 'Add/Edit Field';

        this._dialog.appendChild(title);

        // Name --------------------------------------------------------------------------------------------------------

        const labelName = document.createElement('div');
        labelName.classList.add('dialog-label');
        labelName.textContent = 'Name';
        this._dialog.appendChild(labelName);

        this._inputName = document.createElement('input');
        this._inputName.type = 'text';
        this._inputName.classList.add('dialog-input');
        this._inputName.placeholder = 'Name';

        this._dialog.appendChild(this._inputName);

        // Value -------------------------------------------------------------------------------------------------------

        const labelValue = document.createElement('div');
        labelValue.classList.add('dialog-label');
        labelValue.textContent = 'Value';
        this._dialog.appendChild(labelValue);

        this._inputValue = document.createElement('input');
        this._inputValue.type = 'text';
        this._inputValue.classList.add('dialog-input');
        this._inputValue.placeholder = 'Value';

        this._dialog.appendChild(this._inputValue);

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
     * Show the dialog
     */
    public show(): void {
        this._dialog.showModal();
    }

    /**
     * Set on close
     * @param {EnumTableValueDialogOnClose} event
     */
    public setOnClose(event: EnumTableValueDialogOnClose): void {
        this._onClose = event;
    }

    /**
     * Set on confirm
     * @param {EnumTableValueDialogOnConfirm} event
     */
    public setOnConfirm(event: EnumTableValueDialogOnConfirm): void {
        this._onConfirm = event;
    }

    /**
     * Get name value
     * @return {string}
     */
    public getName(): string {
        return SchemaNameUtil.validateName(this._inputName.value);
    }

    public setName(name: string): void {
        this._inputName.value = name;
    }

    public getValue(): string {
        return this._inputValue.value;
    }

    public setValue(value: string): void {
        this._inputValue.value = value;
    }

}
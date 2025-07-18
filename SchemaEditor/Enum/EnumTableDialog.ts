import {SchemaNameUtil} from '../../SchemaUtil/SchemaNameUtil.js';

/**
 * Enum table dialog on close
 */
export type EnumTableDialogOnClose = () => void;

/**
 * Enum table dialog on confirm
 */
export type EnumTableDialogOnConfirm = (dialog: EnumTableDialog) => boolean;

/**
 * Enum table dialog
 */
export class EnumTableDialog {

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
     * on close
     * @protected
     */
    protected _onClose: EnumTableDialogOnClose|null = null;

    /**
     * on confirm
     * @protected
     */
    protected _onConfirm: EnumTableDialogOnConfirm|null = null;

    /**
     * constructor
     */
    public constructor() {
        this._dialog = document.createElement('dialog');

        const title = document.createElement('div');
        title.classList.add('dialog-title');
        title.textContent = 'Edit Enum';

        this._dialog.appendChild(title);

        const labelName = document.createElement('div');
        labelName.classList.add('dialog-label');
        labelName.textContent = 'Enumname';
        this._dialog.appendChild(labelName);

        this._inputName = document.createElement('input');
        this._inputName.type = 'text';
        this._inputName.classList.add('dialog-input');
        this._inputName.placeholder = 'Enumname';

        this._dialog.appendChild(this._inputName);

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
     * @param {EnumTableDialogOnClose} event
     */
    public setOnClose(event: EnumTableDialogOnClose): void {
        this._onClose = event;
    }

    /**
     * Set on confirm
     * @param {EnumTableDialogOnConfirm} event
     */
    public setOnConfirm(event: EnumTableDialogOnConfirm): void {
        this._onConfirm = event;
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
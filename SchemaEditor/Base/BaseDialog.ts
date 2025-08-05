import './BaseDialog.css';

/**
 * Base dialog on close
 */
export type BaseDialogOnClose = () => void;

/**
 * Base dialog on confirm
 */
export type BaseDialogOnConfirm = <T extends BaseDialog>(dialog: T) => boolean;

/**
 * Base dialog
 */
export class BaseDialog {

    /**
     * Dialog element
     * @protected
     */
    protected _dialog: HTMLDialogElement;

    /**
     * Div title
     * @protected
     */
    protected _divTitle: HTMLDivElement;

    /**
     * Div body
     * @protected
     */
    protected _divBody: HTMLDivElement;

    /**
     * on close
     * @protected
     */
    protected _onClose: BaseDialogOnClose|null = null;

    /**
     * on confirm
     * @protected
     */
    protected _onConfirm: BaseDialogOnConfirm|null = null;

    /**
     * Constructor
     */
    public constructor() {
        this._dialog = document.createElement('dialog');

        // title -------------------------------------------------------------------------------------------------------

        this._divTitle = document.createElement('div');
        this._divTitle.classList.add('dialog-title');
        this._dialog.appendChild(this._divTitle);

        // body ------------------------------------------------------------------------------------------------------------

        this._divBody = document.createElement('div');
        this._divBody.classList.add('dialog-body');
        this._dialog.appendChild(this._divBody);

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
     * Set dialog title
     * @param {string} title
     */
    public setDialogTitle(title: string): void {
        this._divTitle.textContent = title;
    }

    /**
     * Show the dialog
     */
    public show(): void {
        this._dialog.showModal();
    }

    /**
     * Set on close
     * @param {BaseDialogOnClose} event
     */
    public setOnClose(event: BaseDialogOnClose): void {
        this._onClose = event;
    }

    /**
     * Set on confirm
     * @param {BaseDialogOnConfirm} event
     */
    public setOnConfirm(event: BaseDialogOnConfirm): void {
        this._onConfirm = event;
    }

}
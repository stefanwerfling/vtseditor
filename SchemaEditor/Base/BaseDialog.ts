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
     * Div header
     * @protected
     */
    protected _divHeader: HTMLDivElement;

    /**
     * Div title
     * @protected
     */
    protected _divTitle: HTMLDivElement;

    /**
     * Button close x
     * @protected
     */
    protected _btnCloseX: HTMLButtonElement;

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

        // header ------------------------------------------------------------------------------------------------------

        this._divHeader = document.createElement('div');
        this._divHeader.classList.add('dialog-header');
        this._dialog.appendChild(this._divHeader);

        // title -------------------------------------------------------------------------------------------------------

        this._divTitle = document.createElement('div');
        this._divTitle.classList.add('dialog-title');
        this._divHeader.appendChild(this._divTitle);

        // close btn ---------------------------------------------------------------------------------------------------

        this._btnCloseX = document.createElement('button');
        this._btnCloseX.classList.add('dialog-close');
        this._btnCloseX.ariaLabel = 'Close';
        this._btnCloseX.innerHTML = '&times;';
        this._btnCloseX.addEventListener('click', () => {
            if (this._onClose) {
                this._onClose();
            }

            this._close();
        });

        this._divHeader.appendChild(this._btnCloseX);

        // body --------------------------------------------------------------------------------------------------------

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
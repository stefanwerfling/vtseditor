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
     * Dialog stack
     * @protected
     */
    protected static _dialogStack: HTMLDialogElement[] = [];

    /**
     * Dialog element
     * @protected
     */
    protected _dialog: HTMLDialogElement;

    /**
     * Is Modal
     * @protected
     */
    protected _isModal: boolean = false;

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
     * Button confirm
     * @protected
     */
    protected _btnConfirm: HTMLButtonElement;

    /**
     * Button cancel
     * @protected
     */
    protected _btnCancel: HTMLButtonElement;

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

        const baseZ = 1000;
        BaseDialog._dialogStack.push(this._dialog);

        this._dialog.style.position = 'fixed';
        this._dialog.style.zIndex = (baseZ + BaseDialog._dialogStack.length).toString();

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

            this.destroy();
        });

        this._divHeader.appendChild(this._btnCloseX);

        // body --------------------------------------------------------------------------------------------------------

        this._divBody = document.createElement('div');
        this._divBody.classList.add('dialog-body');
        this._dialog.appendChild(this._divBody);

        // buttons -----------------------------------------------------------------------------------------------------

        const btns = document.createElement('div');
        btns.classList.add('dialog-buttons');

        this._btnCancel = document.createElement('button');
        this._btnCancel.textContent = 'Cancel';
        this._btnCancel.classList.add('dialog-button');
        this._btnCancel.addEventListener('click', () => {
            if (this._onClose) {
                this._onClose();
            }

            this.destroy();
        });

        btns.appendChild(this._btnCancel);

        this._btnConfirm = document.createElement('button');
        this._btnConfirm.textContent = 'Save';
        this._btnConfirm.classList.add('dialog-button');
        this._btnConfirm.addEventListener('click', () => {
            if (this._onConfirm) {
                if (this._onConfirm(this)) {
                    this.destroy();
                }
            } else {
                this.destroy();
            }
        });


        btns.appendChild(this._btnConfirm);

        this._dialog.appendChild(btns);

        // -------------------------------------------------------------------------------------------------------------

        document.body.appendChild(this._dialog);
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
     * @param {boolean} modal
     */
    public show(modal: boolean = true): void {
        this._dialog.style.display = '';

        if (modal) {
            this._isModal = true;
            this._dialog.showModal();
        } else {
            this._dialog.show();
        }
    }

    /**
     * Is modal
     * @return {boolean}
     */
    public isModal(): boolean {
        return this._isModal;
    }

    /**
     * Close
     */
    public close(): void {
        this._isModal = false;
        this._dialog.close();
        this._dialog.style.display = 'none';
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

    /**
     * Destroy
     */
    public destroy(): void {
        this._isModal = false;
        this._dialog.close();
        this._dialog.remove();

        BaseDialog._dialogStack = BaseDialog._dialogStack.filter(d => d !== this._dialog);
    }

}
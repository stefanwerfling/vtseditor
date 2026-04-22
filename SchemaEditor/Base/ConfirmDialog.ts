import {AlertDialogTypes} from './AlertDialog.js';
import {BaseDialog} from './BaseDialog.js';
import './AlertDialog.css';

/**
 * Confirm dialog on confirm
 */
export type ConfirmDialogOnConfirm = () => void;

/**
 * Confirm Dialog
 */
export class ConfirmDialog extends BaseDialog {

    /**
     * constructor
     * @param {string} title
     * @param {string} msg
     * @param {AlertDialogTypes} type
     */
    public constructor(title: string, msg: string, type: AlertDialogTypes = AlertDialogTypes.warning) {
        super();
        this.setDialogTitle(title);
        this._divBody.classList.add('dialog-body-alert');

        switch (type) {
            case AlertDialogTypes.success:
                this._divBody.classList.add('success');
                break;

            case AlertDialogTypes.warning:
                this._divBody.classList.add('warning');
                break;

            case AlertDialogTypes.error:
                this._divBody.classList.add('error');
                break;

            default:
                this._divBody.classList.add('info');
        }

        this._divBody.textContent = msg;

        this._btnCancel.textContent = 'Cancel';
        this._btnConfirm.textContent = 'Ok';
    }

    /**
     * Static helper show confirm
     * @param {string} title
     * @param {string} msg
     * @param {ConfirmDialogOnConfirm} onConfirm
     * @param {AlertDialogTypes} type
     * @param {BaseDialog} [parentDialog]
     */
    public static showConfirm(
        title: string,
        msg: string,
        onConfirm: ConfirmDialogOnConfirm,
        type: AlertDialogTypes = AlertDialogTypes.warning,
        parentDialog?: BaseDialog
    ): void {
        if (parentDialog) {
            parentDialog.close();
            parentDialog.show(false);
        }

        const d = new ConfirmDialog(title, msg, type);
        d.show();
        d.setOnConfirm((): boolean => {
            onConfirm();
            return true;
        });
        d.setOnClose(() => {
            if (parentDialog) {
                parentDialog.close();
                parentDialog.show();
            }
        });
    }

}
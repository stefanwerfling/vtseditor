import {BaseDialog} from './BaseDialog.js';
import './AlertDialog.css';

export enum AlertDialogTypes {
    'info' = 'info',
    'warning' = 'warning',
    'error' = 'error',
    'success' = 'success'
}

/**
 * Alert Dialog
 */
export class AlertDialog extends BaseDialog {

    /**
     * constructor
     * @param {string} title
     * @param {string} msg
     * @param {AlertDialogTypes} type
     */
    public constructor(title: string, msg: string, type: AlertDialogTypes = AlertDialogTypes.info) {
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

        this._btnCancel.textContent = 'Ok';
        this._btnConfirm.style.display = 'none';
    }

    /**
     * Static helper show alert
     * @param {title} title
     * @param {string} msg
     * @param {AlertDialogTypes} type
     * @param {[BaseDialog]} parentDialog
     */
    public static showAlert(title: string, msg: string, type: AlertDialogTypes, parentDialog?: BaseDialog): void {
        if (parentDialog) {
            parentDialog.close();
            parentDialog.show(false);
        }

        const d = new AlertDialog(title, msg, type);
        d.show();
        d.setOnClose(() => {
            if (parentDialog) {
                parentDialog.close();
                parentDialog.show();
            }
        });
    }

}
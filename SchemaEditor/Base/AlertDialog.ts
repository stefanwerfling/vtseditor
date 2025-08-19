import {BaseDialog} from './BaseDialog.js';

/**
 * Alert Dialog
 */
export class AlertDialog extends BaseDialog {

    /**
     * constructor
     * @param {string} msg
     */
    public constructor(msg: string) {
        super();
        this.setDialogTitle(msg);

        this._btnCancel.textContent = 'Ok';
        this._btnConfirm.style.display = 'none';
    }

}
import {BaseDialog} from '../Base/BaseDialog.js';

/**
 * Treeview dialog
 */
export class TreeviewDialog extends BaseDialog {

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
     * Row div icon
     * @protected
     */
    protected _rowDivIcon: HTMLDivElement;

    /**
     * Select icon
     * @protected
     */
    protected _selectIcon: HTMLSelectElement;

    /**
     * Constructor
     */
    public constructor() {
        super();
        this.setDialogTitle('Add/Edit Folder/File');

        // name --------------------------------------------------------------------------------------------------------

        const labelName = document.createElement('div');
        labelName.classList.add('dialog-label');
        labelName.textContent = 'Name';
        this._divBody.appendChild(labelName);

        this._inputName = document.createElement('input');
        this._inputName.type = 'text';
        this._inputName.classList.add('dialog-input');
        this._inputName.placeholder = 'Folder/File-name';

        this._divBody.appendChild(this._inputName);

        // type --------------------------------------------------------------------------------------------------------

        const labelType = document.createElement('div');
        labelType.classList.add('dialog-label');
        labelType.textContent = 'Type';
        this._divBody.appendChild(labelType);

        this._selectType = document.createElement('select');
        this._selectType.classList.add('dialog-select');

        this._divBody.appendChild(this._selectType);

        // icons -------------------------------------------------------------------------------------------------------

        this._rowDivIcon = document.createElement('div');
        this._rowDivIcon.classList.add('.dialog-column');
        this._divBody.appendChild(this._rowDivIcon);
        this._rowDivIcon.style.display = 'none';

        const labelIcon = document.createElement('div');
        labelIcon.classList.add('dialog-label');
        labelIcon.textContent = 'Icon';
        this._rowDivIcon.appendChild(labelIcon);

        this._selectIcon = document.createElement('select');
        this._selectIcon.classList.add('dialog-select');

        this._rowDivIcon.appendChild(this._selectIcon);
    }

    /**
     * Return the name
     * @return {string}
     */
    public getName(): string {
        return this._inputName.value;
    }

    /**
     * Set the name
     * @param {string} name
     */
    public setName(name: string): void {
        this._inputName.value = name;
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
     * Return type
     * @return {string}
     */
    public getType(): string {
        return this._selectType.value;
    }

    /**
     * Set type
     * @param {string} type
     */
    public setType(type: string): void {
        this._selectType.value = type;
    }

    /**
     * Set icon options
     * @param {Map<string, string>} options
     */
    public setIconOptions(options: Map<string, string>): void {
        this._rowDivIcon.style.display = '';
        this._selectIcon.innerHTML = '';

        for (const [typeName, typeValue] of options.entries()) {
            const option = document.createElement('option');
            option.value = typeName;
            option.textContent = typeValue;

            this._selectIcon.appendChild(option);
        }
    }

    /**
     * Return the icon
     * @return {string}
     */
    public getIcon(): string {
        return this._selectIcon.value;
    }

    /**
     * Set icon
     * @param {string} icon
     */
    public setIcon(icon: string): void {
        this._selectIcon.value = icon;
    }
}
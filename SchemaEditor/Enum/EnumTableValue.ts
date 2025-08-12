import {SchemaNameUtil} from '../../SchemaUtil/SchemaNameUtil.js';
import {JsonEnumValueDescription} from '../JsonData.js';
import {EnumTableValueDialog} from './EnumTableValueDialog.js';

/**
 * On Save
 */
export type EnumTableValueOnSave = (value: EnumTableValue,  dialog: EnumTableValueDialog) => boolean;

/**
 * On Delete
 */
export type EnumTableValueOnDelete = (value: EnumTableValue) => void;

/**
 * Enum table value
 */
export class EnumTableValue {

    /**
     * Id
     * @protected
     */
    protected _id: string;

    /**
     * name
     * @protected
     */
    protected _name: string = '';

    /**
     * Value
     * @protected
     */
    protected _value: string = '';

    /**
     * Read only
     * @protected
     */
    protected _readOnly: boolean = false;

    /**
     * Span content name
     * @protected
     */
    protected _contentName: HTMLSpanElement;

    /**
     * Span content value
     * @protected
     */
    protected _contentValue: HTMLSpanElement;

    /**
     * Column
     * @protected
     */
    protected _column: HTMLDivElement;

    /**
     * button delete
     * @protected
     */
    protected _btnDelete: HTMLDivElement;

    /**
     * button edit
     * @protected
     */
    protected _btnEdit: HTMLDivElement;

    /**
     * On Save
     * @protected
     */
    protected _onSave: EnumTableValueOnSave|null = null;

    /**
     * On Delete
     * @protected
     */
    protected _onDelete: EnumTableValueOnDelete|null = null;

    /**
     * Constructor
     * @param {string} tableId
     * @param {string} id
     * @param {string} name
     * @param {string} value
     */
    public constructor(tableId: string, id: string, name: string, value: string) {
        this._id = id;

        this._column = document.createElement('div');
        this._column.classList.add('vts-schema-table-column');
        this._column.style.backgroundColor = '#ffffff';

        // delete button -----------------------------------------------------------------------------------------------

        this._btnDelete = document.createElement('div');
        this._btnDelete.classList.add(...['vts-schema-table-column-delete', 'vts-schema-delete']);
        this._btnDelete.addEventListener('click', () => {
            if (this._onDelete) {
                this._onDelete(this);
            }
        });

        this._column.appendChild(this._btnDelete);

        // content -----------------------------------------------------------------------------------------------------

        const content = document.createElement('div');
        this._column.appendChild(content);

        this._contentName = document.createElement('span');
        content.appendChild(this._contentName);

        this._contentValue = document.createElement('span');
        this._contentValue.classList.add('vts-badge-wh-4');
        content.appendChild(this._contentValue);

        // Buttons -----------------------------------------------------------------------------------------------------

        const elBtn = document.createElement('div');
        elBtn.classList.add(...['vts-schema-column-buttons']);
        this._column.appendChild(elBtn);

        // edit button -------------------------------------------------------------------------------------------------

        this._btnEdit = document.createElement('div');
        this._btnEdit.classList.add(...['vts-schema-table-column-edit', 'vts-schema-edit']);
        this._btnEdit.addEventListener('click', () => {
            const dialog = new EnumTableValueDialog();

            dialog.setName(this._name);
            dialog.setValue(this._value);
            dialog.show();

            dialog.setOnConfirm(dialog1 => {
                const tdialog = dialog1 as unknown as EnumTableValueDialog;

                if (this._onSave) {
                    return this._onSave(this, tdialog);
                }

                // close dialog
                return true;
            });
        });

        elBtn.appendChild(this._btnEdit);
    }

    /**
     * Return the id
     * @return {string}
     */
    public getId(): string {
        return this._id;
    }

    /**
     * Set the name for value
     * @param {string} name
     */
    public setName(name: string): void {
        const vName = SchemaNameUtil.validateEnumName(name);
        this._name = vName;
        this._contentName.textContent = vName;
    }

    /**
     * Get value name
     * @return {string}
     */
    public getName(): string {
        return this._name;
    }

    /**
     * Is read only
     * @return {boolean}
     */
    public isReadOnly(): boolean {
        return this._readOnly;
    }

    /**
     * Set read only
     * @param {boolean} readonly
     */
    public setReadOnly(readonly: boolean): void {
        this._readOnly = readonly;

        if (readonly) {
            this._btnDelete.style.display = 'none';
            this._btnEdit.style.display = 'none';
        } else {
            this._btnDelete.style.display = '';
            this._btnEdit.style.display = '';
        }
    }

    /**
     * Set value
     * @param {string} value
     */
    public setValue(value: string): void {
        this._value = value;
        this._contentValue.textContent = value;
    }

    /**
     * Return value
     * @return {string}
     */
    public getValue(): string {
        return this._value;
    }

    /**
     * Return the element
     * @return {HTMLDivElement}
     */
    public getElement(): HTMLDivElement {
        return this._column;
    }

    /**
     * Update view, create connection new/right on ui
     */
    public updateView(): void {}

    /**
     * Set on save
     * @param {EnumTableValueOnSave|null} save
     */
    public setOnSave(save: EnumTableValueOnSave|null): void {
        this._onSave = save;
    }

    /**
     * Set on delete
     * @param {EnumTableValueOnDelete|null} onDelete
     */
    public setOnDelete(onDelete: EnumTableValueOnDelete|null): void {
        this._onDelete = onDelete;
    }

    /**
     * Remove
     */
    public remove(): void {
        this._column.remove();
    }

    /**
     * Return the data
     * @return {JsonEnumValueDescription}
     */
    public getData(): JsonEnumValueDescription {
        return {
            unid: this._id,
            name: this._name,
            value: this._value
        };
    }

    /**
     * Set data
     * @param {JsonEnumValueDescription} data
     */
    public setData(data: JsonEnumValueDescription): void {
        this._id = data.unid;
        this.setName(data.name);
        this.setValue(data.value);
    }
}
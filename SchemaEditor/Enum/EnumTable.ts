import {Connection} from '@jsplumb/browser-ui';
import {BaseTable, BaseTableOnDelete} from '../Base/BaseTable.js';
import {EditorIcons} from '../Base/EditorIcons.js';
import jsPlumbInstance from '../jsPlumbInstance.js';
import {
    JsonEnumDescription,
    JsonEnumValueDescription,
    SchemaJsonDataFSType
} from '../JsonData.js';
import {SchemaTypes} from '../Register/SchemaTypes.js';
import {EnumTableDialog} from './EnumTableDialog.js';
import {EnumTableValue} from './EnumTableValue.js';
import {EnumTableValueDialog} from './EnumTableValueDialog.js';

/**
 * Enum table event on delete
 * @param {BaseTable} table
 * @constructor
 */
export const EnumTableEventOnDelete: BaseTableOnDelete = (table: BaseTable) => {
    window.dispatchEvent(new CustomEvent('schemaeditor:deleteenumtable', {
        detail: {
            id: table.getUnid()
        }
    }));
};

/**
 * Enum table
 */
export class EnumTable extends BaseTable {

    /**
     * columns
     * @protected
     */
    protected _columns: HTMLDivElement;

    /**
     * values
     * @protected
     */
    protected _values: Map<string, EnumTableValue> = new Map<string, EnumTableValue>();

    /**
     * Constructor
     * @param {string} unid
     * @param {string} name
     */
    public constructor(unid: string, name: string) {
        super(unid, name);

        // update Schema Types
        SchemaTypes.getInstance().setEnumType(this._unid, this._name);

        this._table.classList.add(...['table', 'vts-schema-table', 'vts-schema-element', 'vts-enum-table']);
        this._headline.classList.add(...['vts-enum-element-name']);

        this.getIconElement().textContent = EditorIcons.enum;

        // Buttons -----------------------------------------------------------------------------------------------------

        const elBtn = document.createElement('div');
        elBtn.classList.add(...['vts-schema-buttons']);
        this._headline.appendChild(elBtn);

        // Button edit -------------------------------------------------------------------------------------------------

        const elBtnEdit = document.createElement('div');
        elBtnEdit.classList.add(...['vts-schema-edit-name', 'vts-schema-edit']);
        elBtnEdit.title = 'Edit Enum';
        elBtnEdit.addEventListener('click', () => {
            this.openEditDialog();
        });

        elBtn.appendChild(elBtnEdit);

        // Button add --------------------------------------------------------------------------------------------------

        const elBtnAdd = document.createElement('div');
        elBtnAdd.classList.add(...['vts-schema-new-column', 'vts-schema-add']);
        elBtnAdd.title = 'Add Value';
        elBtnAdd.addEventListener('click', () => {
            const dialog = new EnumTableValueDialog();
            dialog.show();
            dialog.setOnConfirm(dialog1 => {
                const tdialog = dialog1 as unknown as EnumTableValueDialog;
                const name = tdialog.getName();
                const uid = crypto.randomUUID();

                /*if (this.existFieldName(uid, fieldName)) {
                    alert('Please change your Fieldname, it already exist!');
                    return false;
                }*/

                this.setValues([{
                    unid: uid,
                    name: name,
                    value: tdialog.getValue()
                }]);

                window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));

                return true;
            });
        });

        elBtn.appendChild(elBtnAdd);

        // columns -----------------------------------------------------------------------------------------------------

        this._columns = document.createElement('div');
        this._columns.classList.add(...['vts-schema-columns']);

        this._table.appendChild(this._columns);

        // -------------------------------------------------------------------------------------------------------------

        this._initJsPlumb();
    }

    /**
     * open the edit dialog
     */
    public openEditDialog(): void {
        const dialog = new EnumTableDialog();
        dialog.show();
        dialog.setEnumName(this._name);
        dialog.setOnConfirm(dialog1 => {
            const tdialog = dialog1 as unknown as EnumTableDialog;
            const enumName = tdialog.getEnumName();

            this.setName(enumName);
            this.updateView();

            window.dispatchEvent(new CustomEvent('schemaeditor:updatename', {
                detail: {
                    sourceType: SchemaJsonDataFSType.enum,
                    sourceId: this.getUnid()
                }
            }));

            window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));

            return true;
        });
    }

    /**
     * Set the values
     * @param {JsonEnumValueDescription[]} values
     */
    public setValues(values: JsonEnumValueDescription[]): void {
        for (const valueDesc of values) {
            const uuid = valueDesc.unid ?? crypto.randomUUID();
            const value = new EnumTableValue(this._unid, uuid, valueDesc.name, valueDesc.value);
            value.setData(valueDesc);
            value.setOnSave((value1, dialog) => {
                //const fieldName = dialog.getFieldName();

                /*if (this.existValuedName(value1.getId(), fieldName)) {
                    alert('Please change your Fieldname, it already exist!');
                    return false;
                }*/

                value1.setName(dialog.getName());
                value1.setValue(dialog.getValue());
                value1.updateView();

                window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));

                return true;
            });

            value.setOnDelete(field1 => {
                if (!confirm(`Do you really want to delete field '${field1.getName()}'?`)) {
                    return;
                }

                field1.remove();
                this._values.delete(field1.getId());

                window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));
            });

            this._columns.appendChild(value.getElement());
            this._values.set(uuid, value);

            value.updateView();
        }
    }

    /**
     * Return the table name
     * @return {string}
     */
    public getName(): string {
        return this._name;
    }

    /**
     * Set name
     * @param {string} name
     */
    public setName(name: string): void {
        super.setName(name);

        // update new name
        SchemaTypes.getInstance().setEnumType(this._unid, this._name);
    }


    /**
     * Return data
     * @return {JsonEnumDescription}
     */
    public getData(): JsonEnumDescription {
        const values: JsonEnumValueDescription[] = [];

        for (const [, value] of this._values.entries()) {
            values.push(value.getData());
        }

        return {
            unid: this._unid,
            name: this._name,
            pos: this._position,
            values: values,
            description: ''
        };
    }

    public setData(data: JsonEnumDescription): void {
        this._unid = data.unid;
        this.setName(data.name);
        this._position = data.pos;
        this.setValues(data.values);
    }

    /**
     * Update view
     */
    public override updateView(): void {
        super.updateView();
        this.getIconElement().textContent = EditorIcons.enum;
        this.setOnDelete(EnumTableEventOnDelete);
    }

    protected override _setConnectionHoverByElement(hover: boolean): void {
        const connections = jsPlumbInstance.getConnections() as Connection[];

        connections.forEach(conn => {
            if (!conn.source || !conn.target) {
                return;
            }

            if (this._table.contains(conn.source) || this._table.contains(conn.target)) {
                let parent = conn.source.parentElement;
                let grandParent = undefined;

                if (conn.parameters.connectionType === 'field') {
                    parent = conn.source.parentElement;
                    grandParent = parent?.parentElement;
                }

                if (hover) {
                    conn.addClass('hovered-connection');

                    if (grandParent) {
                        grandParent.classList.add('hovered');
                    }
                } else {
                    conn.removeClass('hovered-connection');

                    if (grandParent) {
                        grandParent.classList.remove('hovered');
                    }
                }

                jsPlumbInstance.repaintEverything();
            }
        });
    }

    /**
     * Remove all
     */
    public override remove(): void {
        for (const [id, value] of this._values.entries()) {
            value.remove();
            this._values.delete(id);
        }

        super.remove();
    }

    /**
     * Set activ view
     * @param {boolean} active
     */
    public setActivView(active: boolean): void {
        if (active) {
            this._table.classList.add('selected');
        } else {
            this._table.classList.remove('selected');
        }
    }

}
import {Connection} from '@jsplumb/browser-ui';
import jsPlumbInstance from '../jsPlumbInstance.js';
import {
    JsonEnumDescription,
    JsonEnumValueDescription,
    JsonSchemaPositionDescription, SchemaJsonDataFSType
} from '../JsonData.js';
import {SchemaTypes} from '../SchemaTypes.js';
import {EnumTableDialog} from './EnumTableDialog.js';
import {EnumTableValue} from './EnumTableValue.js';
import {EnumTableValueDialog} from './EnumTableValueDialog.js';

/**
 * On delete table
 */
export type EnumTableOnDelete = (table: EnumTable) => void;

/**
 * Enum table
 */
export class EnumTable {

    /**
     * Id
     * @protected
     */
    protected _unid: string = '';

    /**
     * name
     * @protected
     */
    protected _name: string = '';

    /**
     * Grid position
     * @protected
     */
    protected _position: JsonSchemaPositionDescription = {
        x: 0,
        y: 0
    };

    /**
     * table
     * @protected
     */
    protected _table: HTMLDivElement;

    /**
     * on delete
     * @protected
     */
    protected _onDelete: EnumTableOnDelete|null = null;

    /**
     * Enum name
     * @protected
     */
    protected _enumName: HTMLSpanElement;

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
     * @param {string} id
     * @param {string} name
     */
    public constructor(id: string, name: string) {
        this._unid = id;
        this._name = name;

        // update Schema Types
        SchemaTypes.getInstance().setType(this._unid, this._name);

        this._table = document.createElement('div');
        this._table.classList.add(...['table', 'vts-schema-table', 'vts-schema-element', 'vts-enum-table']);

        this._table.addEventListener('mouseenter', () => {
            this._setConnectionHoverByElement(true);
        });

        this._table.addEventListener('mouseleave', () => {
            this._setConnectionHoverByElement(false);
        });

        this._position = {
            x: 50 + Math.random() * 300,
            y: 50 + Math.random() * 500
        };

        const elName = document.createElement('div');
        elName.classList.add(...['vts-schema-element-name', 'vts-enum-element-name']);

        const targetpoint = document.createElement('div');
        targetpoint.id = `targetpoint-${this._unid}`;
        elName.appendChild(targetpoint);

        const elDelete = document.createElement('div');
        elDelete.title = 'Delete Enum';
        elDelete.classList.add(...['vts-schema-delete', 'vts-schema-delete-vertex']);
        elDelete.addEventListener('click', () => {
            if (this._onDelete) {
                this._onDelete(this);
            }
        });

        elName.appendChild(elDelete);

        this._enumName = document.createElement('span');
        this._enumName.textContent = name;
        elName.appendChild(this._enumName);

        // Buttons -----------------------------------------------------------------------------------------------------

        const elBtn = document.createElement('div');
        elBtn.classList.add(...['vts-schema-buttons']);
        elName.appendChild(elBtn);

        // Button edit -------------------------------------------------------------------------------------------------

        const elBtnEdit = document.createElement('div');
        elBtnEdit.classList.add(...['vts-schema-edit-name', 'vts-schema-edit']);
        elBtnEdit.title = 'Edit Enum';
        elBtnEdit.addEventListener('click', () => {
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
                        sourceId: this.getId()
                    }
                }));

                window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));

                return true;
            });
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

        // Add content -------------------------------------------------------------------------------------------------

        this._table.appendChild(elName);

        // columns -----------------------------------------------------------------------------------------------------

        this._columns = document.createElement('div');
        this._columns.classList.add(...['vts-schema-columns']);

        this._table.appendChild(this._columns);

        jsPlumbInstance.manage(this._table);
        jsPlumbInstance.setDraggable(this._table, true);

        jsPlumbInstance.bind('drag:stop', (info) => {
            if (info.el === this._table) {
                this._position.y = this._table.offsetTop;
                this._position.x = this._table.offsetLeft;

                window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));
            }
        });
    }

    /**
     * Return the table id
     * @return {string}
     */
    public getId(): string {
        return this._unid;
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
        this._name = name;
        this._enumName.textContent = name;

        // update new name
        SchemaTypes.getInstance().setType(this._unid, this._name);
    }

    /**
     * Set Position of table
     * @param {number} x
     * @param {number} y
     */
    public setPosition(x: number, y: number): void {
        this._position.x = x;
        this._position.y = y;
        this._table.style.left = `${x}px`;
        this._table.style.top = `${y}px`;
    }

    /**
     * Set on delete
     * @param {EnumTableOnDelete|null} onDelete
     */
    public setOnDelete(onDelete: EnumTableOnDelete|null): void {
        this._onDelete = onDelete;
    }

    /**
     * Return the Element from Table
     * @return {HTMLDivElement}
     */
    public getElement(): HTMLDivElement {
        return this._table;
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
    public updateView(): void {
        this._table.style.top = `${this._position.y}px`;
        this._table.style.left = `${this._position.x}px`;
    }

    protected _setConnectionHoverByElement(hover: boolean) {
        const connections = jsPlumbInstance.getConnections() as Connection[];

        connections.forEach(conn => {
            if (!conn.source || !conn.target) {
                return;
            }

            if (this._table.contains(conn.source) || this._table.contains(conn.target)) {
                if (hover) {
                    conn.addClass('hovered-connection');
                } else {
                    conn.removeClass('hovered-connection');
                }

                jsPlumbInstance.repaintEverything();
            }
        });
    }

    /**
     * Remove all
     */
    public remove(): void {
        for (const [id, value] of this._values.entries()) {
            value.remove();
            this._values.delete(id);
        }

        this._table.remove();
    }

    public setActivView(active: boolean): void {
        if (active) {
            this._table.classList.add('selected');
        } else {
            this._table.classList.remove('selected');
        }
    }

}
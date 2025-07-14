import {Connection} from '@jsplumb/browser-ui';
import jsPlumbInstance from '../jsPlumbInstance.js';
import {SchemaExtends} from '../SchemaExtends.js';
import {SchemaTypes} from '../SchemaTypes.js';
import {SchemaFieldDescription} from './../SchemaFieldDescription.js';
import {SchemaTableDialog} from './SchemaTableDialog.js';
import {SchemaTableField} from './SchemaTableField.js';
import {SchemaTableFieldDialog} from './SchemaTableFieldDialog.js';

export class SchemaTable {

    /**
     * Id
     * @protected
     */
    protected _id: string = '';

    /**
     * name
     * @protected
     */
    protected _name: string = '';

    /**
     * extend
     * @protected
     */
    protected _extend: string = '';

    /**
     * table
     * @protected
     */
    protected _table: HTMLDivElement;

    /**
     * fields
     * @protected
     */
    protected _fields: Map<string, SchemaTableField> = new Map<string, SchemaTableField>();

    /**
     * Schema name
     * @protected
     */
    protected _schemaName: HTMLSpanElement;

    /**
     * Schema extend
     * @protected
     */
    protected _schemaExtend: HTMLSpanElement;

    /**
     * columns
     * @protected
     */
    protected _columns: HTMLDivElement;

    /**
     * Connection
     * @protected
     */
    protected _connection: Connection|null = null;

    /**
     * Constructor
     * @param {string} id
     * @param {string} name
     * @param {string} extend
     * @param {SchemaFieldDescription} fields
     */
    public constructor(id: string, name: string, extend: string = 'object', fields: SchemaFieldDescription[] = [{
        uuid: null,
        name: 'id',
        type: 'number',
        description: 'Id for entry'
    }]) {
        this._id = id;
        this._name = name;
        this._extend = extend;

        // update Schema Types
        SchemaTypes.getInstance().setType(this._id, this._name);

        this._table = document.createElement('div');
        this._table.classList.add(...['table', 'vts-schema-table', 'vts-schema-element']);
        this._table.style.top = `${50 + Math.random() * 300}px`;
        this._table.style.left = `${50 + Math.random() * 500}px`;

        const elName = document.createElement('div');
        elName.classList.add(...['vts-schema-element-name']);

        const targetpoint = document.createElement('div');
        targetpoint.id = `targetpoint-${this._id}`;
        elName.appendChild(targetpoint);

        const elDelete = document.createElement('div');
        elDelete.title = 'Delete Schema';
        elDelete.classList.add(...['vts-schema-delete', 'vts-schema-delete-vertex']);
        elName.appendChild(elDelete);

        this._schemaName = document.createElement('span');
        this._schemaName.textContent = name;
        elName.appendChild(this._schemaName);

        this._schemaExtend = document.createElement('span');
        this._schemaExtend.classList.add(...['vts-schema-extend-span']);
        elName.appendChild(this._schemaExtend);

        // Buttons -----------------------------------------------------------------------------------------------------

        const elBtn = document.createElement('div');
        elBtn.classList.add(...['vts-schema-buttons']);
        elName.appendChild(elBtn);

        // Button edit -------------------------------------------------------------------------------------------------

        const elBtnEdit = document.createElement('div');
        elBtnEdit.classList.add(...['vts-schema-edit-name', 'vts-schema-edit']);
        elBtnEdit.title = 'Edit Schema';
        elBtnEdit.addEventListener('click', () => {
            const dialog = new SchemaTableDialog();
            dialog.show();
            dialog.setSchemaName(this._name);
            dialog.setExtendOptions(SchemaExtends.getInstance().getExtends([this._id]));
            dialog.setSchemaExtend(this._extend);
            dialog.setOnConfirm(dialog1 => {
                this.setName(dialog1.getSchemaName());
                this.setExtend(dialog1.getSchemaExtend());
                SchemaExtends.getInstance().setExtend(this._id, this._name);

                this.updateView();
            });
        });

        elBtn.appendChild(elBtnEdit);

        // Button add --------------------------------------------------------------------------------------------------

        const elBtnAdd = document.createElement('div');
        elBtnAdd.classList.add(...['vts-schema-new-column', 'vts-schema-add']);
        elBtnAdd.title = 'Add Field';
        elBtnAdd.addEventListener('click', () => {
            const dialog = new SchemaTableFieldDialog();
            dialog.show();
            dialog.setTypeOptions(SchemaTypes.getInstance().getTypes([this._id]));
            dialog.setOnConfirm(dialog1 => {
                const uid = crypto.randomUUID();
                const field = new SchemaTableField(this._id, uid, dialog1.getFieldName(), dialog1.getFieldType());

                this._columns.appendChild(field.getElement());
                this._fields.set(uid, field);

                field.updateView();
            });
        });

        elBtn.appendChild(elBtnAdd);

        // for connection
        const endpoint = document.createElement('div');
        endpoint.id = `endpoint-${this._id}`;
        endpoint.classList.add('endpoint');
        elBtn.appendChild(endpoint);

        // Add content -------------------------------------------------------------------------------------------------

        this._table.appendChild(elName);

        // columns -----------------------------------------------------------------------------------------------------

        this._columns = document.createElement('div');
        this._columns.classList.add(...['vts-schema-columns']);

        this._table.appendChild(this._columns);

        this.setExtend(extend);

        jsPlumbInstance.manage(this._table);
        jsPlumbInstance.setDraggable(this._table, true);
    }

    /**
     * Set the fields
     * @param {SchemaFieldDescription[]} fields
     */
    public setFields(fields: SchemaFieldDescription[]): void {
        for (const fieldDesc of fields) {
            const uuid = fieldDesc.uuid ?? crypto.randomUUID();
            const field = new SchemaTableField(this._id, uuid, fieldDesc.name, fieldDesc.type);

            this._columns.appendChild(field.getElement());
            this._fields.set(uuid, field);

            field.updateView();
        }
    }

    /**
     * Return the table id
     * @return {string}
     */
    public getId(): string {
        return this._id;
    }

    /**
     * Return the table name
     * @return {string}
     */
    public getName(): string {
        return this._name;
    }

    public setName(name: string): void {
        this._name = name;
        this._schemaName.textContent = name;

        // update new name
        SchemaTypes.getInstance().setType(this._id, this._name);
    }

    public setExtend(extend: string): void {
        const extendName = SchemaExtends.getInstance().getExtendNameBy(extend);
        this._extend = extend;
        this._schemaExtend.textContent = `^${extendName}`;
    }

    /**
     * Return the Element from Table
     */
    public getElement(): HTMLDivElement {
        return this._table;
    }

    public updateView(): void {
        if (this._connection !== null) {
            jsPlumbInstance.deleteConnection(this._connection);
        }

        if (SchemaExtends.getInstance().isExtendASchema(this._extend)) {
            this._connection = jsPlumbInstance.connect({
                source: document.getElementById(`endpoint-${this._id}`)!,
                target: document.getElementById(`targetpoint-${this._extend}`)!,
                anchors: ['Right', 'Left'],
                connector: {
                    type: 'Flowchart',
                    options: {
                        cornerRadius: 5,
                        stub: 20
                    }
                },
                paintStyle: {
                    stroke: '#000000',
                    strokeWidth: 2
                }
            });
        }
    }
}
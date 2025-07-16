import {Connection} from '@jsplumb/browser-ui';
import {SchemaNameUtil} from '../../SchemaUtil/SchemaNameUtil.js';
import jsPlumbInstance from '../jsPlumbInstance.js';
import {SchemaExtends} from '../SchemaExtends.js';
import {
    SchemaJsonSchemaDescription,
    SchemaJsonSchemaFieldDescription,
    SchemaJsonSchemaPositionDescription
} from '../SchemaJsonData.js';
import {SchemaTypes} from '../SchemaTypes.js';
import {SchemaTableDialog} from './SchemaTableDialog.js';
import {SchemaTableField} from './SchemaTableField.js';
import {SchemaTableFieldDialog} from './SchemaTableFieldDialog.js';

/**
 * Schema table
 */
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
     * Grid position
     * @protected
     */
    protected _position: SchemaJsonSchemaPositionDescription = {
        x: 0,
        y: 0
    };

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
     */
    public constructor(id: string, name: string, extend: string = 'object') {
        this._id = id;
        this._name = name;
        this._extend = extend;

        // update Schema Types
        SchemaTypes.getInstance().setType(this._id, this._name);

        this._table = document.createElement('div');
        this._table.classList.add(...['table', 'vts-schema-table', 'vts-schema-element']);

        this._position = {
            x: 50 + Math.random() * 300,
            y: 50 + Math.random() * 500
        };

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
                const schemaName = dialog1.getSchemaName();
                const tId = SchemaExtends.getInstance().getExtendIdByName(schemaName);

                if (tId !== null && tId !== this._id) {
                    alert('The Schemaname is already exist, please change your name!');
                    return false;
                }

                this.setName(schemaName);
                this.setExtend(dialog1.getSchemaExtend());
                SchemaExtends.getInstance().setExtend(this._id, this._name);

                this.updateView();
                window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));

                return true;
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
                const fieldName = dialog1.getFieldName();

                if (this.existFieldName(fieldName)) {
                    alert('Please change your Fieldname, it already exist!');
                    return false;
                }

                const uid = crypto.randomUUID();
                const field = new SchemaTableField(this._id, uid, dialog1.getFieldName(), dialog1.getFieldType());
                field.setOptional(dialog1.getOptional());

                this._columns.appendChild(field.getElement());
                this._fields.set(uid, field);

                field.updateView();
                window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));

                return true;
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

        jsPlumbInstance.bind('drag:stop', (info) => {
            if (info.el === this._table) {
                this._position.y = this._table.offsetTop;
                this._position.x = this._table.offsetLeft;

                window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));
            }
        });
    }

    /**
     * Set the fields
     * @param {SchemaJsonSchemaFieldDescription[]} fields
     */
    public setFields(fields: SchemaJsonSchemaFieldDescription[]): void {
        for (const fieldDesc of fields) {
            const uuid = fieldDesc.uuid ?? crypto.randomUUID();
            const field = new SchemaTableField(this._id, uuid, fieldDesc.name, fieldDesc.type);
            field.setData(fieldDesc);

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
        this._schemaExtend.textContent = `${extendName}`;

        if (SchemaExtends.getInstance().isExtendASchema(this._extend)) {
            this._schemaExtend.classList.add(...['vts-badge-wh-2']);
        } else {
            this._schemaExtend.classList.add(...['vts-badge-wh-1']);
        }
    }

    /**
     * Return the Element from Table
     */
    public getElement(): HTMLDivElement {
        return this._table;
    }

    public setPosition(x: number, y: number): void {
        this._position.x = x;
        this._position.y = y;
        this._table.style.left = `${x}px`;
        this._table.style.top = `${y}px`;
    }

    public updateView(): void {
        this._table.style.top = `${this._position.y}px`;
        this._table.style.left = `${this._position.x}px`;

        if (this._connection !== null) {
            jsPlumbInstance.deleteConnection(this._connection);
        }

        if (SchemaExtends.getInstance().isExtendASchema(this._extend)) {
            console.log(`Create connection for ${this._id}`);

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

        for (const [, field] of this._fields) {
            field.updateView();
        }
    }

    public getData(): SchemaJsonSchemaDescription {
        const fields: SchemaJsonSchemaFieldDescription[] = [];

        for (const [, field] of this._fields.entries()) {
            fields.push(field.getData());
        }

        return {
            id: this._id,
            name: this._name,
            extend: this._extend,
            pos: this._position,
            fields: fields,
            description: ''
        };
    }

    public setData(data: SchemaJsonSchemaDescription): void {
        this._id = data.id;
        this.setName(data.name);
        this.setExtend(data.extend);
        this.setFields(data.fields);
        this.setPosition(data.pos.x, data.pos.y);
    }

    public existFieldName(name: string): boolean {
        for (const [, field] of this._fields.entries()) {
            if (name === field.getName()) {
                return true;
            }
        }

        return false;
    }
}
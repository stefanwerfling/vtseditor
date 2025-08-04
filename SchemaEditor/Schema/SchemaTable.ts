import {Connection} from '@jsplumb/browser-ui';
import {PaintStyle} from '@jsplumb/browser-ui/types/common/paint-style.js';
import {SchemaJsonDataUtil} from '../../SchemaUtil/SchemaJsonDataUtil.js';
import jsPlumbInstance from '../jsPlumbInstance.js';
import {SchemaExtends} from '../SchemaExtends.js';
import {
    JsonSchemaDescription, JsonSchemaDescriptionOption,
    JsonSchemaFieldDescription, JsonSchemaFieldType,
    JsonSchemaPositionDescription, SchemaJsonDataFSType, SchemaJsonSchemaFieldType
} from '../JsonData.js';
import {SchemaTypes} from '../SchemaTypes.js';
import {SchemaTableDialog} from './SchemaTableDialog.js';
import {SchemaTableField} from './SchemaTableField.js';
import {SchemaTableFieldDialog} from './SchemaTableFieldDialog.js';

/**
 * On delete table
 */
export type SchemaTableOnDelete = (table: SchemaTable) => void;

/**
 * Schema table
 */
export class SchemaTable {

    public static painStyle: PaintStyle = {
        stroke: '#000000',
        strokeWidth: 2
    };

    public static painStyleHover: PaintStyle = {
        stroke: '#ff6600',
        strokeWidth: 2,
    };

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
     * extend
     * @protected
     */
    protected _extend: string = '';

    /**
     * values schema
     * @protected
     */
    protected _valuesSchema: string = '';

    /**
     * Description
     * @protected
     */
    protected _description: string = '';

    /**
     * table
     * @protected
     */
    protected _table: HTMLDivElement;

    /**
     * Button sort
     * @protected
     */
    protected _btnSort: HTMLDivElement;

    /**
     * Button add
     * @protected
     */
    protected _btnAdd: HTMLDivElement;

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
    protected _position: JsonSchemaPositionDescription = {
        x: 0,
        y: 0
    };

    /**
     * Options
     * @protected
     */
    protected _options: JsonSchemaDescriptionOption = {};

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
     * Drop area
     * @protected
     */
    protected _dropArea: HTMLDivElement;

    /**
     * on delete
     * @protected
     */
    protected _onDelete: SchemaTableOnDelete|null = null;

    /**
     * Constructor
     * @param {string} id
     * @param {string} name
     * @param {string} extend
     */
    public constructor(id: string, name: string, extend: string = 'object') {
        this._unid = id;
        this._name = name;
        this._extend = extend;

        // update Schema Types
        SchemaTypes.getInstance().setType(this._unid, this._name);

        this._table = document.createElement('div');
        this._table.classList.add(...['table', 'vts-schema-table', 'vts-schema-element']);

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
        elName.classList.add(...['vts-schema-element-name']);

        const targetpoint = document.createElement('div');
        targetpoint.id = `targetpoint-${this._unid}`;
        elName.appendChild(targetpoint);

        const elDelete = document.createElement('div');
        elDelete.title = 'Delete Schema';
        elDelete.classList.add(...['vts-schema-delete', 'vts-schema-delete-vertex']);
        elDelete.addEventListener('click', () => {
            if (this._onDelete) {
                this._onDelete(this);
            }
        });

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
            dialog.setExtendOptions(SchemaExtends.getInstance().getExtends([this._unid]));
            dialog.setValuesSchemaOptions(SchemaExtends.getInstance().getExtends([this._unid], true));
            dialog.setSchemaExtend(this._extend);
            dialog.setSchemaValuesSchema(this._valuesSchema);
            dialog.setOptions(this._options);
            dialog.setDescription(this._description);
            dialog.setOnConfirm(tdialog => {
                const dialog1 = tdialog as unknown as SchemaTableDialog;
                const schemaName = dialog1.getSchemaName();
                const tId = SchemaExtends.getInstance().getExtendIdByName(schemaName);

                if (tId !== null && tId !== this._unid) {
                    alert('The Schemaname is already exist, please change your name!');
                    return false;
                }

                this.setName(schemaName);
                this.setExtend(dialog1.getSchemaExtend());
                this.setValuesSchema(dialog1.getSchemaValuesSchema());
                this._description = dialog1.getDescription();
                this._options = dialog1.getOptions();

                SchemaExtends.getInstance().setExtend(this._unid, this._name);

                this.updateView();

                window.dispatchEvent(new CustomEvent('schemaeditor:updatename', {
                    detail: {
                        sourceType: SchemaJsonDataFSType.schema,
                        sourceId: this.getId()
                    }
                }));

                window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));

                return true;
            });
        });

        elBtn.appendChild(elBtnEdit);

        // Button sorting ----------------------------------------------------------------------------------------------

        this._btnSort = document.createElement('div');
        this._btnSort.classList.add(...['vts-schema-sort-name']);
        this._btnSort.title = 'Sortieren';
        this._btnSort.addEventListener('click', () => {
            if (confirm('Do you want to sort the fields by name?')) {
                this.sortingFields();
                this.updateView();
                window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));
            }
        });

        elBtn.appendChild(this._btnSort);

        // Button add --------------------------------------------------------------------------------------------------

        this._btnAdd = document.createElement('div');
        this._btnAdd.classList.add(...['vts-schema-new-column', 'vts-schema-add']);
        this._btnAdd.title = 'Add Field';
        this._btnAdd.addEventListener('click', () => {
            this._openNewColumnDialog();
        });

        elBtn.appendChild(this._btnAdd);

        // for connection
        const endpoint = document.createElement('div');
        endpoint.id = `endpoint-${this._unid}`;
        endpoint.classList.add('endpoint');
        elBtn.appendChild(endpoint);

        // Add content -------------------------------------------------------------------------------------------------

        this._table.appendChild(elName);

        // columns -----------------------------------------------------------------------------------------------------

        this._columns = document.createElement('div');
        this._columns.classList.add(...['vts-schema-columns']);

        this._table.appendChild(this._columns);

        this.setExtend(extend);

        // drop area ---------------------------------------------------------------------------------------------------

        this._dropArea = document.createElement('div');
        this._dropArea.classList.add(...['drop-area', 'hidden']);
        this._dropArea.textContent = '+ Drop your column';
        this._table.appendChild(this._dropArea);

        // set jsPlumb -------------------------------------------------------------------------------------------------

        jsPlumbInstance.manage(this._table);
        jsPlumbInstance.setDraggable(this._table, true);

        jsPlumbInstance.bind('drag:stop', (info) => {
            if (info.el === this._table) {
                this._position.y = this._table.offsetTop;
                this._position.x = this._table.offsetLeft;

                window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));
            }
        });

        // set drag and drop -------------------------------------------------------------------------------------------

        this._table.addEventListener('dragover', e => {
            e.preventDefault();

            const type = e.dataTransfer?.getData('type');

            if (type === SchemaJsonDataFSType.schema || type === SchemaJsonDataFSType.enum) {
                this._dropArea.classList.add('hover');
            }
        });

        this._table.addEventListener('dragleave', () => {
            this._dropArea.classList.remove('hover');
        });

        this._table.addEventListener('drop', e => {
            this._dropArea.classList.remove('hover');
            e.preventDefault();

            const type = e.dataTransfer?.getData('type');

            if (type === SchemaJsonDataFSType.schema || type === SchemaJsonDataFSType.enum) {
                const id = e.dataTransfer?.getData('id');

                if (id) {
                    this._openNewColumnDialog(id);
                }
            }
        });
    }

    /**
     * Show the drop area
     * @param {boolean} show
     */
    public showDropArea(show: boolean): void {
        if (show) {
            this._dropArea.classList.remove('hidden');
        } else {
            this._dropArea.classList.add('hidden');
        }
    }

    /**
     * Open new column dialog
     * @param {string|null} type
     * @protected
     */
    protected _openNewColumnDialog(type: string|null = null): void {
        const dialog = new SchemaTableFieldDialog();
        dialog.show();

        if (type !== null) {
            dialog.setFieldType({
                type: type,
                array: false,
                optional: false,
                types: []
            });
        }

        dialog.setOnConfirm(tdialog => {
            const dialog1 = tdialog as unknown as SchemaTableFieldDialog;
            const fieldName = dialog1.getFieldName();
            const uid = crypto.randomUUID();

            if (this.existFieldName(uid, fieldName)) {
                alert('Please change your Fieldname, it already exist!');
                return false;
            }

            this.addFields([{
                type: dialog1.getFieldType(),
                name: fieldName,
                description: dialog1.getDescription(),
                unid: uid
            }]);

            window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));

            return true;
        });
    }

    /**
     * Add the fields
     * @param {JsonSchemaFieldDescription[]} fields
     */
    public addFields(fields: JsonSchemaFieldDescription[]): void {
        for (const fieldDesc of fields) {
            this.addField(fieldDesc);
        }
    }

    /**
     * Add a field
     * @param {JsonSchemaFieldDescription[]} fieldDesc
     */
    public addField(fieldDesc: JsonSchemaFieldDescription): void {
        const uuid = fieldDesc.unid ?? crypto.randomUUID();

        let aType: JsonSchemaFieldType|null = null;

        if (SchemaJsonSchemaFieldType.validate(fieldDesc.type, [])) {
            aType = fieldDesc.type;
        }

        const field = new SchemaTableField(this._unid, uuid, fieldDesc.name, aType);
        field.setData(fieldDesc);
        field.setOnSave((field1, dialog) => {
            const fieldName = dialog.getFieldName();

            if (this.existFieldName(field1.getId(), fieldName)) {
                alert('Please change your Fieldname, it already exist!');
                return false;
            }

            field1.setName(dialog.getFieldName());
            field1.setType(dialog.getFieldType());
            field1.setDescription(dialog.getDescription());
            field1.updateView();

            window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));

            return true;
        });

        field.setOnDelete(field1 => {
            if (!confirm(`Do you really want to delete field '${field1.getName()}'?`)) {
                return;
            }

            field1.remove();
            this._fields.delete(field1.getId());

            window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));
        });

        this._columns.appendChild(field.getElement());
        this._fields.set(uuid, field);

        field.updateView();
    }

    /**
     * Return the table id
     * @return {string}
     */
    public getId(): string {
        return this._unid;
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
        this._schemaName.textContent = name;

        // update new name
        SchemaTypes.getInstance().setType(this._unid, this._name);
    }

    /**
     * Set extend
     * @param {string} extend
     */
    public setExtend(extend: string): void {
        const extendName = SchemaExtends.getInstance().getExtendNameBy(extend);
        this._extend = extend;
        this._schemaExtend.textContent = `${extendName}`;

        if (SchemaExtends.getInstance().isExtendASchema(this._extend)) {
            this._schemaExtend.classList.add(...['vts-badge-wh-2']);
        } else {
            this._schemaExtend.classList.add(...['vts-badge-wh-1']);
        }

        if (this._extend === 'object2') {
            this._btnSort.style.display = 'none';
            this._btnAdd.style.display = 'none';
            this._columns.style.display = 'none';
        } else {
            this._btnSort.style.display = '';
            this._btnAdd.style.display = '';
            this._columns.style.display = '';
        }
    }

    /**
     * Set values schema
     * @param {string} valuesSchema
     */
    public setValuesSchema(valuesSchema: string): void {
        const valuesSchemaName = SchemaExtends.getInstance().getExtendNameBy(valuesSchema);
        this._valuesSchema = valuesSchema;

        if (this._extend === 'object2') {
            const span = document.createElement('span');
            span.classList.add(...['vts-badge-wh-6']);
            span.textContent = `${valuesSchemaName}`;

            this._schemaExtend.appendChild(span);
        }
    }

    /**
     * Return the Element from Table
     * @return {HTMLDivElement}
     */
    public getElement(): HTMLDivElement {
        return this._table;
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
     * Update view
     */
    public updateView(): void {
        this._table.style.top = `${this._position.y}px`;
        this._table.style.left = `${this._position.x}px`;

        if (this._connection !== null) {
            jsPlumbInstance.deleteConnection(this._connection);
        }

        let connectId = '';

        if (this._extend === 'object2') {
            if (SchemaExtends.getInstance().isExtendASchema(this._valuesSchema)) {
                connectId = this._valuesSchema;
            }
        } else if (SchemaExtends.getInstance().isExtendASchema(this._extend)) {
            connectId = this._extend;
        }

        if (connectId !== '') {
            console.log(`Create connection for ${this._unid}`);

            this._connection = jsPlumbInstance.connect({
                source: document.getElementById(`endpoint-${this._unid}`)!,
                target: document.getElementById(`targetpoint-${connectId}`)!,
                anchors: ['Right', 'Left'],
                connector: {
                    type: 'Flowchart',
                    options: {
                        cornerRadius: 5,
                        stub: 20
                    }
                },
                paintStyle: SchemaTable.painStyle,
                hoverPaintStyle: SchemaTable.painStyleHover,
                endpoints: ['Blank', 'Blank'],
                overlays: [
                    {
                        type: 'Arrow',
                        options: {
                            location: 0,
                            direction: -1,
                            width: 10,
                            length: 14,
                            foldback: 0.7,
                            paintStyle: {
                                fill: '#000000',
                                stroke: 'none'
                            }
                        }
                    }
                ],
                parameters: {
                    tableId: this.getId(),
                    connectionType: 'extend'
                }
            });
        }

        for (const [, field] of this._fields) {
            field.updateView();
        }
    }

    /**
     * Return Data
     * @return {JsonSchemaDescription}
     */
    public getData(): JsonSchemaDescription {
        const fields: JsonSchemaFieldDescription[] = [];

        for (const [, field] of this._fields.entries()) {
            fields.push(field.getData());
        }

        return {
            unid: this._unid,
            name: this._name,
            extend: this._extend,
            values_schema: this._valuesSchema,
            options: this._options,
            pos: this._position,
            fields: fields,
            description: this._description
        };
    }

    /**
     * Set Data
     * @param {JsonSchemaDescription} data
     */
    public setData(data: JsonSchemaDescription): void {
        this._unid = data.unid;
        this.setName(data.name);
        this.setExtend(data.extend);

        if (data.values_schema) {
            this.setValuesSchema(data.values_schema);
        }

        this.addFields(data.fields);
        this.setPosition(data.pos.x, data.pos.y);
        this._options = data.options ?? {};
        this._description = data.description;
    }

    /**
     * Exist field name
     * @param {string} fieldId
     * @param {string} name
     * @return {boolean}
     */
    public existFieldName(fieldId: string, name: string): boolean {
        for (const [, field] of this._fields.entries()) {
            if (field.getId() !== fieldId) {
                if (name === field.getName()) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Set on delete
     * @param {SchemaTableOnDelete|null} onDelete
     */
    public setOnDelete(onDelete: SchemaTableOnDelete|null): void {
        this._onDelete = onDelete;
    }

    /**
     * Is schema table use
     * @param {string} id
     * @return {boolean}
     */
    public isSchemaTableUse(id: string): boolean {
        if (this._extend === id) {
            return true;
        }

        for (const [, field] of this._fields.entries()) {
            const idTypeList = SchemaJsonDataUtil.getTypeArray(field.getType());

            if (idTypeList.indexOf(id) > -1) {
                return true;
            }
        }

        return false;
    }

    /**
     * Remove all
     */
    public remove(): void {
        for (const [id, field] of this._fields.entries()) {
            field.remove();
            this._fields.delete(id);
        }

        this._fields.clear();
        this._table.remove();
    }

    protected _setConnectionHoverByElement(hover: boolean) {
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
     * Sorting fields
     */
    public sortingFields(): void {
        const sortedFields = Array.from(this._fields.values()).sort((a, b) =>
            a.getName().localeCompare(b.getName())
        );

        this._columns.innerHTML = '';

        for (const field of sortedFields) {
            this._columns.appendChild(field.getElement());
        }

        this._fields = new Map(
            sortedFields.map(field => [field.getName(), field])
        );
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
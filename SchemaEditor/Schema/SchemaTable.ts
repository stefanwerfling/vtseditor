import {Connection} from '@jsplumb/browser-ui';
import {PaintStyle} from '@jsplumb/browser-ui/types/common/paint-style.js';
import {SchemaJsonDataUtil} from '../../SchemaUtil/SchemaJsonDataUtil.js';
import {BaseTable} from '../Base/BaseTable.js';
import jsPlumbInstance from '../jsPlumbInstance.js';
import {SchemaExtends} from '../SchemaExtends.js';
import {
    JsonSchemaDescription, JsonSchemaDescriptionOption,
    JsonSchemaFieldDescription, JsonSchemaFieldType,
    SchemaJsonDataFSType, SchemaJsonSchemaFieldType
} from '../JsonData.js';
import {SchemaTypes} from '../SchemaTypes.js';
import {SchemaTableDialog} from './SchemaTableDialog.js';
import {SchemaTableField} from './SchemaTableField.js';
import {SchemaTableFieldDialog} from './SchemaTableFieldDialog.js';

/**
 * Schema table
 */
export class SchemaTable extends BaseTable {

    public static painStyle: PaintStyle = {
        stroke: '#000000',
        strokeWidth: 2
    };

    public static painStyleHover: PaintStyle = {
        stroke: '#ff6600',
        strokeWidth: 2,
    };

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
     * Schema extend
     * @protected
     */
    protected _schemaExtend: HTMLSpanElement;

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
     * Constructor
     * @param {string} unid
     * @param {string} name
     * @param {string} extend
     */
    public constructor(unid: string, name: string, extend: string = 'object') {
        super(unid, name);

        this._extend = extend;

        // update Schema Types
        SchemaTypes.getInstance().setType(this._unid, this._name);
        this._table.classList.add(...['table', 'vts-schema-table', 'vts-schema-element']);

        this._schemaExtend = document.createElement('span');
        this._headline.appendChild(this._schemaExtend);

        // Buttons -----------------------------------------------------------------------------------------------------

        const elBtn = document.createElement('div');
        elBtn.classList.add(...['vts-schema-buttons']);
        this._headline.appendChild(elBtn);

        // Button edit -------------------------------------------------------------------------------------------------

        const elBtnEdit = document.createElement('div');
        elBtnEdit.classList.add(...['vts-schema-edit-name', 'vts-schema-edit']);
        elBtnEdit.title = 'Edit Schema';
        elBtnEdit.addEventListener('click', () => {
            this.openEditDialog();
        });

        elBtn.appendChild(elBtnEdit);

        // Button sorting ----------------------------------------------------------------------------------------------

        this._btnSort = document.createElement('div');
        this._btnSort.classList.add(...['vts-schema-sort-name']);
        this._btnSort.title = 'Sorting';
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

        this._initJsPlumb();

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
     * open the edit dialog
     */
    public openEditDialog(): void {
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
                    sourceId: this.getUnid()
                }
            }));

            window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));

            return true;
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
     * Set name
     * @param {string} name
     */
    public override setName(name: string): void {
        super.setName(name);

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
     * Update view
     */
    public override updateView(): void {
        super.updateView();

        for (const [, field] of this._fields.entries()) {
            field.updateView();
        }

        this.updateConnection();
    }

    /**
     * update connection
     */
    public override updateConnection(): void {
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
                    tableId: this.getUnid(),
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
    public override remove(): void {
        for (const [id, field] of this._fields.entries()) {
            field.remove();
            this._fields.delete(id);
        }

        this._fields.clear();
        super.remove();
    }

    protected override _setConnectionHoverByElement(hover: boolean) {
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

}
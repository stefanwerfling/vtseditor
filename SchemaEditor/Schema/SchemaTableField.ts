import {Connection} from '@jsplumb/browser-ui';
import {SchemaJsonDataUtil} from '../../SchemaUtil/SchemaJsonDataUtil.js';
import {MultiTypeFieldBadge} from '../Base/MultiType/MultiTypeFieldBadge.js';
import {Tooltip} from '../Base/Tooltip.js';
import jsPlumbInstance from '../jsPlumbInstance.js';
import {JsonSchemaFieldDescription, JsonSchemaFieldType, SchemaJsonSchemaFieldType} from '../JsonData.js';
import {SchemaTypes} from '../Register/SchemaTypes.js';
import {SchemaTableFieldDialog} from './SchemaTableFieldDialog.js';

/**
 * On Save
 */
export type SchemaTableFieldOnSave = (field: SchemaTableField,  dialog: SchemaTableFieldDialog) => boolean;

/**
 * On Delete
 */
export type SchemaTableFieldOnDelete = (field: SchemaTableField) => void;

/**
 * Schema table field
 */
export class SchemaTableField {

    /**
     * Id
     * @protected
     */
    protected _unid: string;

    /**
     * Read only
     * @protected
     */
    protected _readOnly: boolean = false;

    /**
     * name
     * @protected
     */
    protected _name: string = '';

    /**
     * type
     * @protected
     */
    protected _type: JsonSchemaFieldType = {
        type: '',
        array: false,
        optional: false,
        types: []
    };

    /**
     * Description
     * @protected
     */
    protected _description: string = '';

    /**
     * Column
     * @protected
     */
    protected _column: HTMLDivElement;

    /**
     * Span content name
     * @protected
     */
    protected _contentName: HTMLSpanElement;

    /**
     * Span content type
     * @protected
     */
    protected _contentType: HTMLSpanElement;

    /**
     * Button delete
     * @protected
     */
    protected _btnDelete: HTMLDivElement;

    /**
     * Button edit
     * @protected
     */
    protected _btnEdit: HTMLDivElement;

    /**
     * info icon wrapper
     * @protected
     */
    protected _tooltip: Tooltip;

    /**
     * Endpoint
     * @protected
     */
    protected _endpoint: HTMLDivElement;

    /**
     * Connection
     * @protected
     */
    protected _connection: Connection|null = null;

    /**
     * On Save
     * @protected
     */
    protected _onSave: SchemaTableFieldOnSave|null = null;

    /**
     * On Delete
     * @protected
     */
    protected _onDelete: SchemaTableFieldOnDelete|null = null;

    /**
     * Constructor
     * @param {string} tableUnid
     * @param {string} unid
     * @param {string} name
     * @param {JsonSchemaFieldType|null} type
     */
    public constructor(tableUnid: string, unid: string, name: string, type: JsonSchemaFieldType|null = null) {
        this._unid = unid;

        this._column = document.createElement('div');
        this._column.classList.add('vts-schema-table-column');
        this._column.style.backgroundColor = '#ffffff';

        // delete button -----------------------------------------------------------------------------------------------

        this._btnDelete = document.createElement('div');
        this._btnDelete.classList.add(...['vts-schema-table-column-delete', 'vts-schema-delete']);
        this._btnDelete.addEventListener('click', () => {
            if (this._readOnly) {
                alert('Field can not delete by readonly!');
                return;
            }

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

        this._contentType = document.createElement('span');
        content.appendChild(this._contentType);

        // -------------------------------------------------------------------------------------------------------------

        this._tooltip = new Tooltip();
        this._tooltip.hide();
        content.appendChild(this._tooltip.getElement());


        // Buttons -----------------------------------------------------------------------------------------------------

        const elBtn = document.createElement('div');
        elBtn.classList.add(...['vts-schema-column-buttons']);
        this._column.appendChild(elBtn);

        // edit button -------------------------------------------------------------------------------------------------

        this._btnEdit = document.createElement('div');
        this._btnEdit.classList.add(...['vts-schema-table-column-edit', 'vts-schema-edit']);
        this._btnEdit.addEventListener('click', () => {
            if (this._readOnly) {
                alert('Field can not edit by readonly!');
                return;
            }

            const dialog = new SchemaTableFieldDialog(tableUnid);
            dialog.setFieldName(this._name);
            dialog.setFieldType(this._type);
            dialog.setDescription(this._description);
            dialog.show();

            dialog.setOnConfirm(dialog1 => {
                const tdialog = dialog1 as unknown as SchemaTableFieldDialog;

                if (this._onSave) {
                    return this._onSave(this, tdialog);
                }

                // close dialog
                return true;
            });
        });

        elBtn.appendChild(this._btnEdit);

        // for connection
        this._endpoint = document.createElement('div');
        this._endpoint.id = `endpoint-column-${this._unid}`;
        this._endpoint.classList.add('endpoint');
        elBtn.appendChild(this._endpoint);

        this.setName(name);

        if (type === null) {
            this.setType({
                type: '',
                array: false,
                optional: false,
                types: []
            });
        } else {
            this.setType(type);
        }
    }

    /**
     * Return the id
     * @return {string}
     */
    public getId(): string {
        return this._unid;
    }

    /**
     * Set the name for field
     * @param {string} name
     */
    public setName(name: string): void {
        this._name = name;
        this._contentName.textContent = name;
    }

    /**
     * Get field name
     * @return {string}
     */
    public getName(): string {
        return this._name;
    }

    /**
     * Set field Type
     * @param {JsonSchemaFieldType|string} type
     */
    public setType(type: JsonSchemaFieldType|string): void {
        this._contentType.innerHTML = 'unknown';

        if (SchemaJsonSchemaFieldType.validate(type, [])) {
            this._type = type;

            if (this._type.optional) {
                this._column.style.backgroundColor = '#cbeae1';
                this._column.classList.add('optional');
            } else {
                this._column.style.backgroundColor = '#ffffff';
                this._column.classList.remove('optional');
            }

            const badge = new MultiTypeFieldBadge(this._type);
            this._contentType.innerHTML = '';
            this._contentType.appendChild(badge.getElement());
        }
    }

    /**
     * Return type
     * @return {JsonSchemaFieldType}
     */
    public getType(): JsonSchemaFieldType {
        return this._type;
    }

    /**
     * Set description
     * @param {string} description
     */
    public setDescription(description: string): void {
        if (description === '') {
            this._tooltip.hide();
        } else {
            this._tooltip.show()
            this._tooltip.setContent(description);
        }

        this._description = description;
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
    public updateView(): void {
        // update type
        this.setType(this._type);

        if (this._connection !== null) {
            jsPlumbInstance.deleteConnection(this._connection);
        }

        const types: string[] = SchemaJsonDataUtil.getTypeArray(this._type);

        for (const atype of types) {
            if (SchemaTypes.getInstance().isTypeASchema(atype)) {
                this._connection = jsPlumbInstance.connect({
                    source: document.getElementById(`endpoint-column-${this._unid}`)!,
                    target: document.getElementById(`targetpoint-${atype}`)!,
                    anchors: ['Right', 'Left'],
                    connector: {
                        type: 'Flowchart',
                        options: {
                            cornerRadius: 5,
                            stub: 20
                        }
                    },
                    paintStyle: {
                        stroke: '#3e7e9c',
                        strokeWidth: 2,
                        dashstyle: '4 2'
                    },
                    hoverPaintStyle: {
                        stroke: '#ff6600',
                        strokeWidth: 2,
                        dashstyle: '4 2'
                    },
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
                                    fill: '#3e7e9c',
                                    stroke: 'none'
                                }
                            }
                        }
                    ],
                    parameters: {
                        fieldId: this.getId(),
                        connectionType: 'field'
                    }
                });
            }
        }
    }

    /**
     * Is table read only
     * @return {boolean}
     */
    public isReadOnly(): boolean {
        return this._readOnly;
    }

    /**
     * Set the read only
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
     * Return the date from field
     * @return {JsonSchemaFieldDescription}
     */
    public getData(): JsonSchemaFieldDescription {
        return {
            unid: this._unid,
            name: this._name,
            type: this._type,
            description: this._description
        };
    }

    /**
     * Set data for field
     * @param {JsonSchemaFieldDescription} data
     */
    public setData(data: JsonSchemaFieldDescription): void {
        this._unid = data.unid ?? '';
        this.setName(data.name);
        this.setType(data.type);
        this.setDescription(data.description);
    }

    /**
     * Set on save
     * @param {SchemaTableFieldOnSave|null} save
     */
    public setOnSave(save: SchemaTableFieldOnSave|null): void {
        this._onSave = save;
    }

    /**
     * Set on delete
     * @param {SchemaTableFieldOnDelete|null} onDelete
     */
    public setOnDelete(onDelete: SchemaTableFieldOnDelete|null): void {
        this._onDelete = onDelete;
    }

    /**
     * Remove
     */
    public remove(): void {
        if (this._connection !== null) {
            jsPlumbInstance.deleteConnection(this._connection);
        }

        this._column.remove();
    }
}
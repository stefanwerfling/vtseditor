import {Connection} from '@jsplumb/browser-ui';
import {SchemaJsonDataUtil} from '../../SchemaUtil/SchemaJsonDataUtil.js';
import {MultiTypeFieldBadge} from '../Base/MultiType/MultiTypeFieldBadge.js';
import jsPlumbInstance from '../jsPlumbInstance.js';
import {JsonSchemaFieldDescription, JsonSchemaFieldType, SchemaJsonSchemaFieldType} from '../JsonData.js';
import {SchemaTypes} from './../SchemaTypes.js';
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
     * info icon wrapper
     * @protected
     */
    protected _infoIconWrapper: HTMLDivElement;

    /**
     * info content div
     * @protected
     */
    protected _infoContentDiv: HTMLDivElement;

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
     * @param {string} tableId
     * @param {string} unid
     * @param {string} name
     * @param {JsonSchemaFieldType|null} type
     */
    public constructor(tableId: string, unid: string, name: string, type: JsonSchemaFieldType|null = null) {
        this._unid = unid;

        this._column = document.createElement('div');
        this._column.classList.add('vts-schema-table-column');
        this._column.style.backgroundColor = '#ffffff';

        // delete button -----------------------------------------------------------------------------------------------

        const btnDelete = document.createElement('div');
        btnDelete.classList.add(...['vts-schema-table-column-delete', 'vts-schema-delete']);
        btnDelete.addEventListener('click', () => {
            if (this._onDelete) {
                this._onDelete(this);
            }
        });

        this._column.appendChild(btnDelete);

        // content -----------------------------------------------------------------------------------------------------

        const content = document.createElement('div');
        this._column.appendChild(content);

        this._contentName = document.createElement('span');
        content.appendChild(this._contentName);

        this._contentType = document.createElement('span');
        content.appendChild(this._contentType);

        this._infoIconWrapper = document.createElement('div');
        this._infoIconWrapper.style.display = 'none';
        this._infoIconWrapper.classList.add(...['info-icon-wrapper']);
        content.appendChild(this._infoIconWrapper);

        const iconInfo = document.createElement('span');
        iconInfo.classList.add('info-icon');
        iconInfo.textContent = 'ℹ️';
        this._infoIconWrapper.appendChild(iconInfo);

        this._infoContentDiv = document.createElement('div');
        this._infoContentDiv.classList.add('info-tooltip');
        this._infoIconWrapper.appendChild(this._infoContentDiv);

        this._infoIconWrapper.addEventListener('mouseenter', () => {
            const rect = this._infoIconWrapper.getBoundingClientRect();
            this._infoContentDiv.style.display = 'block';
            this._infoContentDiv.style.left = `${rect.left + rect.width / 2}px`;
            this._infoContentDiv.style.top = `${rect.bottom + 8}px`;
        });

        this._infoIconWrapper.addEventListener('mouseleave', () => {
            this._infoContentDiv.style.display = 'none';
        });

        // Buttons -----------------------------------------------------------------------------------------------------

        const elBtn = document.createElement('div');
        elBtn.classList.add(...['vts-schema-column-buttons']);
        this._column.appendChild(elBtn);

        // edit button -------------------------------------------------------------------------------------------------

        const btnEdit = document.createElement('div');
        btnEdit.classList.add(...['vts-schema-table-column-edit', 'vts-schema-edit']);
        btnEdit.addEventListener('click', () => {
            const dialog = new SchemaTableFieldDialog();
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

        elBtn.appendChild(btnEdit);

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
            this._infoIconWrapper.style.display = 'none';
        } else {
            this._infoIconWrapper.style.display = '';
            this._infoContentDiv.textContent = description;
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
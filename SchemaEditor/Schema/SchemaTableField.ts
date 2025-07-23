import {Connection} from '@jsplumb/browser-ui';
import jsPlumbInstance from '../jsPlumbInstance.js';
import {JsonSchemaFieldDescription} from '../JsonData.js';
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
    protected _id: string;

    /**
     * name
     * @protected
     */
    protected _name: string = '';

    /**
     * type
     * @protected
     */
    protected _type: string = '';

    /**
     * subtypes
     * @protected
     */
    protected _subtypes: string[] = [];

    /**
     * is field optional
     * @protected
     */
    protected _optional: boolean = false;

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
     * @param {string} id
     * @param {string} name
     * @param {string} type
     * @param {string[]} subtypes
     */
    public constructor(tableId: string, id: string, name: string, type: string, subtypes: string[] = []) {
        this._id = id;

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

        // Buttons -----------------------------------------------------------------------------------------------------

        const elBtn = document.createElement('div');
        elBtn.classList.add(...['vts-schema-column-buttons']);
        this._column.appendChild(elBtn);

        // edit button -------------------------------------------------------------------------------------------------

        const btnEdit = document.createElement('div');
        btnEdit.classList.add(...['vts-schema-table-column-edit', 'vts-schema-edit']);
        btnEdit.addEventListener('click', () => {
            const dialog = new SchemaTableFieldDialog();
            dialog.setTypeOptions(SchemaTypes.getInstance().getTypes([tableId]));
            dialog.setFieldName(this._name);
            dialog.setFieldType(this._type);
            dialog.setFieldSubTypes(this._subtypes);
            dialog.setOptional(this._optional);
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
        this._endpoint.id = `endpoint-column-${this._id}`;
        this._endpoint.classList.add('endpoint');
        elBtn.appendChild(this._endpoint);

        this.setName(name);
        this.setSubTypes(subtypes);
        this.setType(type);
    }

    /**
     * Return the id
     * @return {string}
     */
    public getId(): string {
        return this._id;
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
     * @param {string} type
     */
    public setType(type: string): void {
        this._type = type;
        const typename = SchemaTypes.getInstance().getTypeNameBy(type) ?? 'unknown';
        this._contentType.textContent = `${typename}`;

        this._contentType.classList.remove(...['vts-badge-wh-1', 'vts-badge-wh-2']);

        if (SchemaTypes.getInstance().isTypeASchema(this._type)) {
            this._contentType.classList.add(...['vts-badge-wh-2']);
        } else {
            this._contentType.classList.add(...['vts-badge-wh-1']);
        }

        switch (type) {
            case 'array':
            case 'or':
                for (const subtype of this._subtypes) {
                    const span = document.createElement('span');
                    const subtypename = SchemaTypes.getInstance().getTypeNameBy(subtype) ?? 'unknown';

                    span.textContent = `${subtypename}`;

                    if (SchemaTypes.getInstance().isTypeASchema(subtype)) {
                        span.classList.add(...['vts-badge-wh-2']);
                    } else {
                        span.classList.add(...['vts-badge-wh-3']);
                    }

                    this._contentType.appendChild(span);
                }
                break;
        }
    }

    /**
     * Return type
     * @return {string}
     */
    public getType(): string {
        return this._type;
    }

    /**
     * Return subtypes
     * @return {string[]}
     */
    public getSubTypes(): string[] {
        return this._subtypes;
    }

    /**
     * Set subtypes
     * @param {string[]} subtypes
     */
    public setSubTypes(subtypes: string[]): void {
        this._subtypes = subtypes;
    }

    /**
     * Set optional
     * @param {boolean} optional
     */
    public setOptional(optional: boolean): void {
        this._optional = optional;

        this._column.classList.remove('optional');

        if (this._optional) {
            this._column.style.backgroundColor = '#cbeae1';
            this._column.classList.add('optional');

        } else {
            this._column.style.backgroundColor = '#ffffff';
        }
    }

    /**
     * Set description
     * @param {string} description
     */
    public setDescription(description: string): void {
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

        const types: string[] = [this._type, ...this._subtypes];

        for (const atype of types) {
            if (SchemaTypes.getInstance().isTypeASchema(atype)) {
                this._connection = jsPlumbInstance.connect({
                    source: document.getElementById(`endpoint-column-${this._id}`)!,
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
                    ]
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
            unid: this._id,
            name: this._name,
            type: this._type,
            subtypes: this._subtypes,
            optional: this._optional,
            description: this._description
        };
    }

    /**
     * Set data for field
     * @param {JsonSchemaFieldDescription} data
     */
    public setData(data: JsonSchemaFieldDescription): void {
        this._id = data.unid ?? '';
        this.setName(data.name);

        if (data.subtypes) {
            this.setSubTypes(data.subtypes);
        }

        this.setType(data.type);
        this.setOptional(data.optional);
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
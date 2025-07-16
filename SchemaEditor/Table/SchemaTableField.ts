import {Connection} from '@jsplumb/browser-ui';
import jsPlumbInstance from '../jsPlumbInstance.js';
import {SchemaJsonSchemaFieldDescription} from '../SchemaJsonData.js';
import {SchemaTypes} from './../SchemaTypes.js';
import {SchemaTableFieldDialog} from './SchemaTableFieldDialog.js';

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

    protected _contentName: HTMLSpanElement;
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
     * Constructor
     * @param tableId
     * @param id
     * @param name
     * @param type
     */
    public constructor(tableId: string, id: string, name: string, type: string) {
        this._id = id;

        this._column = document.createElement('div');
        this._column.classList.add('vts-schema-table-column');
        this._column.style.backgroundColor = '#ffffff';

        // delete button -----------------------------------------------------------------------------------------------

        const btnDelete = document.createElement('div');
        btnDelete.classList.add(...['vts-schema-table-column-delete', 'vts-schema-delete']);
        btnDelete.addEventListener('click', () => {

        });

        this._column.appendChild(btnDelete);

        // content -----------------------------------------------------------------------------------------------------

        const content = document.createElement('div');
        this._column.appendChild(content);

        this._contentName = document.createElement('span');
        content.appendChild(this._contentName);

        this._contentType = document.createElement('span');
        content.appendChild(this._contentType);

        // edit button -------------------------------------------------------------------------------------------------

        const btnEdit = document.createElement('div');
        btnEdit.classList.add(...['vts-schema-table-column-edit', 'vts-schema-edit']);
        btnEdit.addEventListener('click', () => {
            const dialog = new SchemaTableFieldDialog();
            dialog.setTypeOptions(SchemaTypes.getInstance().getTypes([tableId]));
            dialog.setFieldName(this._name);
            dialog.setFieldType(this._type);
            dialog.setOptional(this._optional);
            dialog.setDescription(this._description);
            dialog.show();

            dialog.setOnConfirm(dialog1 => {
                this.setName(dialog1.getFieldName());
                this.setType(dialog1.getFieldType());
                this.setOptional(dialog1.getOptional());
                this.setDescription(dialog1.getDescription());
                this.updateView();

                window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));

                return true;
            });
        });

        this._column.appendChild(btnEdit);

        // for connection
        this._endpoint = document.createElement('div');
        this._endpoint.id = `endpoint-column-${this._id}`;
        this._endpoint.classList.add('endpoint');
        this._column.appendChild(this._endpoint);

        this.setName(name);
        this.setType(type);
    }

    public setName(name: string): void {
        this._name = name;
        this._contentName.textContent = name;
    }

    public getName(): string {
        return this._name;
    }

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
    }

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

    public setDescription(description: string): void {
        this._description = description;
    }

    public getElement(): HTMLDivElement {
        return this._column;
    }

    public updateView(): void {
        if (this._connection !== null) {
            jsPlumbInstance.deleteConnection(this._connection);
        }

        if (SchemaTypes.getInstance().isTypeASchema(this._type)) {
            this._connection = jsPlumbInstance.connect({
                source: document.getElementById(`endpoint-column-${this._id}`)!,
                target: document.getElementById(`targetpoint-${this._type}`)!,
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
                }
            });
        }
    }

    public getData(): SchemaJsonSchemaFieldDescription {
        return {
            uuid: this._id,
            name: this._name,
            type: this._type,
            optional: this._optional,
            description: this._description
        };
    }

    public setData(data: SchemaJsonSchemaFieldDescription): void {
        this._id = data.uuid ?? '';
        this.setName(data.name);
        this.setType(data.type);
        this.setOptional(data.optional);
        this.setDescription(data.description);
    }
}
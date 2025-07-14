import {Connection} from '@jsplumb/browser-ui';
import jsPlumbInstance from '../jsPlumbInstance.js';
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
     * Column
     * @protected
     */
    protected _column: HTMLDivElement;

    protected _contentName: HTMLSpanElement;
    protected _contentType: HTMLSpanElement;

    protected _endpoint: HTMLDivElement;

    protected _connection: Connection|null = null;

    public constructor(tableId: string, id: string, name: string, type: string) {
        this._id = id;

        this._column = document.createElement('div');
        this._column.classList.add('vts-schema-table-column');
        this._column.style.backgroundColor = '#e5f5f0';

        const btnDelete = document.createElement('div');
        btnDelete.classList.add(...['vts-schema-table-column-delete', 'vts-schema-delete']);
        this._column.appendChild(btnDelete);

        const content = document.createElement('div');
        this._column.appendChild(content);

        this._contentName = document.createElement('span');
        content.appendChild(this._contentName);

        this._contentType = document.createElement('span');
        this._contentType.classList.add(...['vts-schema-type-colum-span']);
        content.appendChild(this._contentType);

        const btnEdit = document.createElement('div');
        btnEdit.classList.add(...['vts-schema-table-column-edit', 'vts-schema-edit']);
        btnEdit.addEventListener('click', () => {
            const dialog = new SchemaTableFieldDialog();
            dialog.setTypeOptions(SchemaTypes.getInstance().getTypes([tableId]));
            dialog.setFieldName(this._name);
            dialog.setFieldType(this._type);
            dialog.show();
            dialog.setOnConfirm(dialog1 => {
                this.setName(dialog1.getFieldName());
                this.setType(dialog1.getFieldType());

                this.updateView();
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

    public setType(type: string): void {
        this._type = type;
        const typename = SchemaTypes.getInstance().getTypeNameBy(type) ?? 'unknown';
        this._contentType.textContent = `^${typename}`;
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
}
import {Connection} from '@jsplumb/browser-ui';
import {SchemaJsonDataUtil} from '../../SchemaUtil/SchemaJsonDataUtil.js';
import {ContextMenu} from '../Base/ContextMenu.js';
import {EditorIcons} from '../Base/EditorIcons.js';
import {MultiTypeFieldBadge} from '../Base/MultiType/MultiTypeFieldBadge.js';
import {Tooltip} from '../Base/Tooltip.js';
import jsPlumbInstance from '../jsPlumbInstance.js';
import {JsonSchemaFieldDescription, JsonSchemaFieldType, SchemaJsonSchemaFieldType} from '../JsonData.js';
import {SchemaTypes} from '../Register/SchemaTypes.js';
import {SchemaTableFieldDialog} from './SchemaTableFieldDialog.js';

/**
 * Drag data MIME type used for in-editor field reordering.
 */
const SCHEMA_FIELD_DRAG_TYPE = 'application/x-vts-field';

/**
 * On Save
 */
export type SchemaTableFieldOnSave = (field: SchemaTableField,  dialog: SchemaTableFieldDialog) => boolean;

/**
 * On Delete
 */
export type SchemaTableFieldOnDelete = (field: SchemaTableField) => void;

/**
 * On Reorder — fired when a drop inside this table should move a field.
 */
export type SchemaTableFieldOnReorder = (sourceId: string, targetId: string, position: 'before'|'after') => void;

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
     * Drag handle (grip icon used to initiate a reorder drag)
     * @protected
     */
    protected _dragHandle: HTMLDivElement;

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
     * Context menu (Edit / Delete)
     * @protected
     */
    protected _contextMenu: ContextMenu;

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
     * On Reorder
     * @protected
     */
    protected _onReorder: SchemaTableFieldOnReorder|null = null;

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

        // drag handle -------------------------------------------------------------------------------------------------

        this._dragHandle = document.createElement('div');
        this._dragHandle.classList.add('vts-schema-column-drag-handle');
        this._dragHandle.title = 'Drag to reorder';
        // two columns of dots — visually reads as a grip handle
        this._dragHandle.innerHTML = '<span></span><span></span><span></span><span></span><span></span><span></span>';

        this._dragHandle.addEventListener('mousedown', e => {
            if (this._readOnly) {
                return;
            }

            this._column.draggable = true;
            // keep jsPlumb from starting a table drag on the same mousedown
            e.stopPropagation();
        });

        this._column.appendChild(this._dragHandle);

        // mouseup resets draggable when the user clicked the handle but did not drag
        this._column.addEventListener('mouseup', () => {
            if (this._column.draggable) {
                this._column.draggable = false;
            }
        });

        // drag events for reordering ----------------------------------------------------------------------------------

        this._column.addEventListener('dragstart', e => {
            if (!this._column.draggable) {
                return;
            }

            e.stopPropagation();
            e.dataTransfer!.effectAllowed = 'move';
            e.dataTransfer!.setData(SCHEMA_FIELD_DRAG_TYPE, this._unid);
            this._column.classList.add('dragging-field');
        });

        this._column.addEventListener('dragend', () => {
            this._column.draggable = false;
            this._column.classList.remove('dragging-field');
            this._column.classList.remove('drop-indicator-top', 'drop-indicator-bottom');
        });

        this._column.addEventListener('dragover', e => {
            if (!e.dataTransfer || !e.dataTransfer.types.includes(SCHEMA_FIELD_DRAG_TYPE)) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';

            const rect = this._column.getBoundingClientRect();
            const isAbove = e.clientY < rect.top + rect.height / 2;

            this._column.classList.remove('drop-indicator-top', 'drop-indicator-bottom');
            this._column.classList.add(isAbove ? 'drop-indicator-top' : 'drop-indicator-bottom');
        });

        this._column.addEventListener('dragleave', () => {
            this._column.classList.remove('drop-indicator-top', 'drop-indicator-bottom');
        });

        this._column.addEventListener('drop', e => {
            if (!e.dataTransfer || !e.dataTransfer.types.includes(SCHEMA_FIELD_DRAG_TYPE)) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const sourceId = e.dataTransfer.getData(SCHEMA_FIELD_DRAG_TYPE);
            const rect = this._column.getBoundingClientRect();
            const isAbove = e.clientY < rect.top + rect.height / 2;

            this._column.classList.remove('drop-indicator-top', 'drop-indicator-bottom');

            if (sourceId && sourceId !== this._unid && this._onReorder) {
                this._onReorder(sourceId, this._unid, isAbove ? 'before' : 'after');
            }
        });

        // content -----------------------------------------------------------------------------------------------------

        const content = document.createElement('div');
        content.classList.add('vts-schema-column-content');
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
        elBtn.classList.add('vts-schema-column-buttons');
        this._column.appendChild(elBtn);

        // context menu (Edit / Delete) --------------------------------------------------------------------------------

        this._contextMenu = new ContextMenu();

        this._contextMenu.addItem({
            icon: EditorIcons.edit,
            label: 'Edit field',
            onClick: () => {
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

                    return true;
                });
            }
        });

        this._contextMenu.addSeparator();

        this._contextMenu.addItem({
            icon: EditorIcons.delete,
            label: 'Delete field',
            danger: true,
            onClick: () => {
                if (this._onDelete) {
                    this._onDelete(this);
                }
            }
        });

        elBtn.appendChild(this._contextMenu.getTriggerElement());

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
                this._column.classList.add('optional');
            } else {
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
            this._connection = null;
        }

        // When the owning SchemaTable has its columns hidden (extend type is
        // not `object` / not a schema ref), this row is display:none via an
        // ancestor. Skip the connect call — jsPlumb would otherwise place the
        // source endpoint at (0, 0) on the next repaint and draw a phantom
        // arrow from the canvas origin to the target.
        if (!this._column.offsetParent) {
            return;
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

        this._contextMenu.setTriggerVisible(!readonly);

        if (readonly) {
            this._dragHandle.style.display = 'none';
        } else {
            this._dragHandle.style.display = '';
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
     * Set on reorder
     * @param {SchemaTableFieldOnReorder|null} onReorder
     */
    public setOnReorder(onReorder: SchemaTableFieldOnReorder|null): void {
        this._onReorder = onReorder;
    }

    /**
     * Remove
     */
    public remove(): void {
        if (this._connection !== null) {
            jsPlumbInstance.deleteConnection(this._connection);
        }

        this._contextMenu.destroy();
        this._tooltip.destroy();
        this._column.remove();
    }
}
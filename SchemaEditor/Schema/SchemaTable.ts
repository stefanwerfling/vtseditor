import {Connection} from '@jsplumb/browser-ui';
import {PaintStyle} from '@jsplumb/browser-ui/types/common/paint-style.js';
import {SchemaJsonDataUtil} from '../../SchemaUtil/SchemaJsonDataUtil.js';
import {AlertDialog, AlertDialogTypes} from '../Base/AlertDialog.js';
import {BaseTable, BaseTableOnDelete} from '../Base/BaseTable.js';
import {ConfirmDialog} from '../Base/ConfirmDialog.js';
import {ContextMenu} from '../Base/ContextMenu.js';
import {EditorEvents} from '../Base/EditorEvents.js';
import {EditorIcons} from '../Base/EditorIcons.js';
import {ExtendTypeBadge} from '../Base/ExtendType/ExtendTypeBadge.js';
import {GlobalDragDrop} from '../GlobalDragDrop.js';
import {
    JsonSchemaDescription,
    JsonSchemaDescriptionExtend,
    JsonSchemaFieldDescription,
    JsonSchemaFieldType,
    SchemaJsonDataFSType,
    SchemaJsonSchemaDescriptionExtend,
    SchemaJsonSchemaFieldType
} from '../JsonData.js';
import jsPlumbInstance from '../jsPlumbInstance.js';
import {SchemaTypes} from '../Register/SchemaTypes.js';
import {SchemaTableDialog} from './SchemaTableDialog.js';
import {SchemaTableField} from './SchemaTableField.js';
import {SchemaTableFieldDialog} from './SchemaTableFieldDialog.js';
import {SchemaValidateDialog} from './SchemaValidateDialog.js';

/**
 * Delete event for Schema
 * @param {BaseTable} table
 * @constructor
 */
export const SchemaTableEventOnDelete: BaseTableOnDelete = (table: BaseTable) => {
    window.dispatchEvent(new CustomEvent(EditorEvents.deleteSchemaTable, {
        detail: {
            id: table.getUnid()
        }
    }));
};

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
    protected _extend: JsonSchemaDescriptionExtend = {
        type: 'object',
    };

    /**
     * Description
     * @protected
     */
    protected _description: string = '';

    /**
     * button line right
     * @protected
     */
    protected _btnLineRight: HTMLDivElement;

    /**
     * Context menu (Add field / Sort / Edit / Delete)
     * @protected
     */
    protected _contextMenu: ContextMenu;

    /**
     * Add field menu item (hidden when extend is not object/schema)
     * @protected
     */
    protected _miAddField: HTMLButtonElement;

    /**
     * Sort fields menu item (hidden when extend is not object/schema)
     * @protected
     */
    protected _miSortFields: HTMLButtonElement;

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
     * Empty-state row shown inside _columns when the table allows fields
     * but none are defined yet. Auto-hidden when extend type disallows fields
     * (because the whole _columns container is display:none then).
     * @protected
     */
    protected _columnsEmpty: HTMLDivElement;

    /**
     * Constructor
     * @param {string} unid
     * @param {string} name
     * @param {JsonSchemaDescriptionExtend|null} extend
     */
    public constructor(unid: string, name: string, extend: JsonSchemaDescriptionExtend|null = null) {
        super(unid, name);

        if (extend) {
            this._extend = extend;
        }

        // update Schema Types
        SchemaTypes.getInstance().setType(this._unid, this._name);
        this._table.classList.add(...['table', 'vts-schema-table', 'vts-schema-element']);

        this.getIconElement().textContent = EditorIcons.schema;

        this._schemaExtend = document.createElement('span');
        this._headline.appendChild(this._schemaExtend);

        // front-placed delete from BaseTable is replaced by the context
        // menu entry, so hide the inherited button
        this._btnDelete.style.display = 'none';

        // Buttons -----------------------------------------------------------------------------------------------------

        this._btnLineRight = document.createElement('div');
        this._btnLineRight.classList.add('vts-schema-buttons');
        this._headline.appendChild(this._btnLineRight);

        // Context menu (Add / Sort / Edit / Delete) -------------------------------------------------------------------

        this._contextMenu = new ContextMenu();

        this._miAddField = this._contextMenu.addItem({
            icon: EditorIcons.add,
            label: 'Add field',
            onClick: () => {
                this._openNewColumnDialog();
            }
        });

        this._miSortFields = this._contextMenu.addItem({
            icon: EditorIcons.sort,
            label: 'Sort fields by name',
            onClick: () => {
                ConfirmDialog.showConfirm(
                    'Sort fields',
                    'Do you want to sort the fields by name?',
                    () => {
                        this.sortingFields();
                        this.updateView();
                        window.dispatchEvent(new CustomEvent(EditorEvents.updateData, {}));
                    },
                    AlertDialogTypes.info
                );
            }
        });

        this._contextMenu.addItem({
            icon: EditorIcons.edit,
            label: 'Edit schema',
            onClick: () => {
                this.openEditDialog();
            }
        });

        this._contextMenu.addItem({
            icon: EditorIcons.info,
            label: 'Validate JSON',
            onClick: () => {
                const dialog = new SchemaValidateDialog(this._unid, this._name);
                dialog.show();
            }
        });

        this._contextMenu.addSeparator();

        this._contextMenu.addItem({
            icon: EditorIcons.delete,
            label: 'Delete schema',
            danger: true,
            onClick: () => {
                if (this._onDelete) {
                    this._onDelete(this);
                }
            }
        });

        this._btnLineRight.appendChild(this._contextMenu.getTriggerElement());

        // for connection
        const endpoint = document.createElement('div');
        endpoint.id = `endpoint-${this._unid}`;
        endpoint.classList.add('endpoint');
        this._btnLineRight.appendChild(endpoint);


        // columns -----------------------------------------------------------------------------------------------------

        this._columns = document.createElement('div');
        this._columns.classList.add(...['vts-schema-columns']);

        this._columnsEmpty = document.createElement('div');
        this._columnsEmpty.classList.add('vts-schema-columns-empty');
        this._columnsEmpty.textContent = 'No fields yet';
        this._columns.appendChild(this._columnsEmpty);

        this._table.appendChild(this._columns);

        // drop area ---------------------------------------------------------------------------------------------------
        // Must exist before setExtend() so _updateViewExtend can safely toggle it.
        this._dropArea = document.createElement('div');
        this._dropArea.classList.add(...['drop-area', 'hidden']);
        this._dropArea.textContent = '+ Drop your column';
        this._table.appendChild(this._dropArea);

        this.setExtend(this._extend);

        // set jsPlumb -------------------------------------------------------------------------------------------------

        this._initJsPlumb();

        // set drag and drop -------------------------------------------------------------------------------------------

        this._table.addEventListener('dragover', e => {
            e.preventDefault();

            if (this._readOnly || !this._allowsFields()) {
                return;
            }

            if (GlobalDragDrop.dragData !== null) {
                const dragData = GlobalDragDrop.dragData;

                if (dragData.type === SchemaJsonDataFSType.schema || dragData.type === SchemaJsonDataFSType.enum) {
                    this._dropArea.classList.add('hover');
                }
            }
        });

        this._table.addEventListener('dragleave', () => {
            this._dropArea.classList.remove('hover');
        });

        this._table.addEventListener('drop', e => {
            this._dropArea.classList.remove('hover');
            e.preventDefault();

            if (this._readOnly || !this._allowsFields()) {
                return;
            }

            if (GlobalDragDrop.dragData !== null) {
                const dragData = GlobalDragDrop.dragData;

                if (dragData.type === SchemaJsonDataFSType.schema || dragData.type === SchemaJsonDataFSType.enum) {
                    this._openNewColumnDialog(dragData.unid);
                }
            }
        });
    }

    /**
     * Whether this schema's current extend type permits fields. Fields only
     * make sense for `object` extends or extends that reference another schema
     * (which effectively inherit that schema's shape). Anything else (array,
     * or, object2, primitive, enum, …) should refuse drop, hide the drop area,
     * and hide the column container.
     * @protected
     */
    protected _allowsFields(): boolean {
        return this._extend.type === 'object' || SchemaTypes.getInstance().isTypeASchema(this._extend.type);
    }

    /**
     * Set read only
     * @param {boolean} readonly
     */
    public override setReadOnly(readonly: boolean) {
        super.setReadOnly(readonly);

        for (const [, field] of this._fields.entries()) {
            field.setReadOnly(readonly);
        }

        // BaseTable.setReadOnly toggles the inherited _btnDelete — it is
        // replaced by the context menu here, so keep it hidden.
        this._btnDelete.style.display = 'none';

        this._contextMenu.setTriggerVisible(!readonly);

        if (readonly) {
            this._dropArea.style.display = 'none';
        } else {
            this._dropArea.style.display = '';
        }
    }

    /**
     * open the edit dialog
     */
    public openEditDialog(): void {
        if (this._readOnly) {
            AlertDialog.showAlert('Schema', 'Schema is readonly!', AlertDialogTypes.warning);
            return;
        }

        const dialog = new SchemaTableDialog(this._unid);

        dialog.show();
        dialog.setSchemaName(this._name);
        dialog.setSchemaExtend(this._extend);
        dialog.setDescription(this._description);
        dialog.setOnConfirm(tdialog => {
            const dialog1 = tdialog as unknown as SchemaTableDialog;
            const schemaName = dialog1.getSchemaName();
            const tId = SchemaTypes.getInstance().getExtendIdByName(schemaName);

            if (tId !== null && tId !== this._unid) {
                AlertDialog.showAlert(
                    'Schema',
                    'The Schemaname is already exist, please change your name!',
                    AlertDialogTypes.error
                );
                return false;
            }

            this.setName(schemaName);
            this.setExtend(dialog1.getSchemaExtend());
            this._description = dialog1.getDescription();

            this.updateView();

            window.dispatchEvent(new CustomEvent(EditorEvents.updateName, {
                detail: {
                    sourceType: SchemaJsonDataFSType.schema,
                    sourceId: this.getUnid()
                }
            }));

            window.dispatchEvent(new CustomEvent(EditorEvents.updateData, {}));

            return true;
        });
    }

    /**
     * Show the drop area. Noop when the schema's current extend type would
     * reject a field drop — keeps the hint from appearing on e.g. Array<…>
     * schemas where fields cannot be added.
     * @param {boolean} show
     */
    public showDropArea(show: boolean): void {
        if (show && this._allowsFields()) {
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
        const dialog = new SchemaTableFieldDialog(this._unid);
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
                AlertDialog.showAlert(
                    'Fieldname',
                    'Please change your Fieldname, it already exist!',
                    AlertDialogTypes.info,
                    tdialog
                );

                return false;
            }

            this.addFields([{
                type: dialog1.getFieldType(),
                name: fieldName,
                description: dialog1.getDescription(),
                unid: uid
            }]);

            window.dispatchEvent(new CustomEvent(EditorEvents.updateData, {}));

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
                AlertDialog.showAlert(
                    'Fieldname',
                    'Please change your Fieldname, it already exist!',
                    AlertDialogTypes.info
                );
                return false;
            }

            field1.setName(dialog.getFieldName());
            field1.setType(dialog.getFieldType());
            field1.setDescription(dialog.getDescription());
            field1.updateView();

            window.dispatchEvent(new CustomEvent(EditorEvents.updateData, {}));

            return true;
        });

        field.setOnDelete(field1 => {
            ConfirmDialog.showConfirm(
                'Delete field',
                `Do you really want to delete field '${field1.getName()}'?`,
                () => {
                    field1.remove();
                    this._fields.delete(field1.getId());
                    this._updateEmptyState();

                    window.dispatchEvent(new CustomEvent(EditorEvents.updateData, {}));
                }
            );
        });

        field.setOnReorder((sourceId, targetId, position) => {
            this.moveField(sourceId, targetId, position);
        });

        this._columns.appendChild(field.getElement());
        this._fields.set(uuid, field);
        this._updateEmptyState();

        field.setReadOnly(this._readOnly);
        field.updateView();
    }

    /**
     * Show the "No fields yet" placeholder only when the table has zero fields.
     * When fields exist, hide it. The parent container (_columns) is itself
     * hidden for non-object extends, so we don't need to double-check that here.
     * @protected
     */
    protected _updateEmptyState(): void {
        this._columnsEmpty.style.display = this._fields.size === 0 ? '' : 'none';
    }

    /**
     * Move a field before or after another field (drag & drop reorder).
     * @param {string} sourceId
     * @param {string} targetId
     * @param {'before'|'after'} position
     */
    public moveField(sourceId: string, targetId: string, position: 'before'|'after'): void {
        if (sourceId === targetId) {
            return;
        }

        const sourceField = this._fields.get(sourceId);
        const targetField = this._fields.get(targetId);

        if (!sourceField || !targetField) {
            return;
        }

        const sourceEl = sourceField.getElement();
        const targetEl = targetField.getElement();

        sourceEl.remove();

        if (position === 'before') {
            targetEl.parentElement!.insertBefore(sourceEl, targetEl);
        } else {
            targetEl.parentElement!.insertBefore(sourceEl, targetEl.nextSibling);
        }

        // rebuild the map in the new DOM order so getData() emits fields in the right order
        const reordered = new Map<string, SchemaTableField>();

        for (const child of Array.from(this._columns.children)) {
            for (const [id, field] of this._fields.entries()) {
                if (field.getElement() === child) {
                    reordered.set(id, field);
                    break;
                }
            }
        }

        this._fields = reordered;

        window.dispatchEvent(new CustomEvent(EditorEvents.updateData, {}));
        jsPlumbInstance.repaintEverything();
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
     * Return the description
     * @return {string}
     */
    public getDescription(): string {
        return this._description;
    }

    /**
     * Set extend
     * @param {JsonSchemaDescriptionExtend} extend
     */
    public setExtend(extend: JsonSchemaDescriptionExtend): void {
        this._extend = extend;
        this._updateViewExtend();
    }

    /**
     * update view extend
     * @protected
     */
    protected _updateViewExtend(): void {
        const allowsFields = this._allowsFields();

        this._miAddField.style.display = allowsFields ? '' : 'none';
        this._miSortFields.style.display = allowsFields ? '' : 'none';
        this._columns.style.display = allowsFields ? '' : 'none';

        if (!allowsFields) {
            this._dropArea.classList.add('hidden');
        }

        const badge = new ExtendTypeBadge(this._extend);
        this._schemaExtend.innerHTML = '';
        this._schemaExtend.appendChild(badge.getElement());
    }

    /**
     * Update view
     */
    public override updateView(): void {
        super.updateView();

        this.getIconElement().textContent = EditorIcons.schema;
        this.setOnDelete(SchemaTableEventOnDelete);

        // Apply extend-related visibility (columns shown only for object/schema
        // extends) BEFORE the fields update. Otherwise a later hide on the
        // column container leaves field endpoints at (0, 0) after the next
        // repaintEverything — phantom connections drawn from the canvas origin.
        this._updateViewExtend();

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

        let connectIds: string[] = [];

        if (this._extend.type === 'object2' || this._extend.type === 'array') {
            if (this._extend.value) {
                if (SchemaTypes.getInstance().isTypeASchema(this._extend.value)) {
                    connectIds.push(this._extend.value);
                } else if (SchemaTypes.getInstance().getEnumTypes().has(this._extend.value)) {
                    connectIds.push(this._extend.value);
                }
            }
        } else if (this._extend.type === 'or' && this._extend.or_values) {
            for (const orValue of this._extend.or_values) {
                if (SchemaTypes.getInstance().isTypeASchema(orValue.type)) {
                    connectIds.push(orValue.type);
                } else if(SchemaTypes.getInstance().getEnumTypes().has(orValue.type)) {
                    connectIds.push(orValue.type);
                }
            }
        } else if (SchemaTypes.getInstance().isTypeASchema(this._extend.type)) {
            connectIds.push(this._extend.type);
        } else if(SchemaTypes.getInstance().getEnumTypes().has(this._extend.type)) {
            connectIds.push(this._extend.type);
        }

        for (const connectId of connectIds) {
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

        if (SchemaJsonSchemaDescriptionExtend.validate(data.extend, [])) {
            this.setExtend(data.extend);
        } else {
            this.setExtend(this._extend);
        }

        this.addFields(data.fields);
        this.setPosition(data.pos.x, data.pos.y);
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
     * Return the list of schema/enum ids that this schema depends on
     * (referenced via extend or any field type). Only ids that exist in
     * the global SchemaTypes registry are returned.
     * @return {string[]}
     */
    public getDependencyIds(): string[] {
        const types = SchemaTypes.getInstance();
        const ids = new Set<string>();

        const isKnown = (t: string): boolean =>
            types.isTypeASchema(t) || types.getEnumTypes().has(t);

        if (this._extend.type === 'object2' || this._extend.type === 'array') {
            if (this._extend.value && isKnown(this._extend.value)) {
                ids.add(this._extend.value);
            }
        } else if (this._extend.type === 'or' && this._extend.or_values) {
            for (const ov of this._extend.or_values) {
                if (isKnown(ov.type)) {
                    ids.add(ov.type);
                }
            }
        } else if (isKnown(this._extend.type)) {
            ids.add(this._extend.type);
        }

        for (const [, field] of this._fields) {
            const fieldTypes = SchemaJsonDataUtil.getTypeArray(field.getType());

            for (const t of fieldTypes) {
                if (isKnown(t)) {
                    ids.add(t);
                }
            }
        }

        // never depend on self (defensive — shouldn't happen)
        ids.delete(this._unid);

        return Array.from(ids);
    }

    /**
     * Is schema table use
     * @param {string} id
     * @return {boolean}
     */
    public isSchemaTableUse(id: string): boolean {
        if (this._extend.type === id) {
            return true;
        } else if (this._extend.value === id) {
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
        this._contextMenu.destroy();
        super.remove();
    }

    /**
     * Set connection hover by element
     * @param {boolean} hover
     * @protected
     */
    protected override _setConnectionHoverByElement(hover: boolean) {
        this._getConnections().forEach(conn => {
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
            sortedFields.map(field => [field.getId(), field])
        );
    }

}
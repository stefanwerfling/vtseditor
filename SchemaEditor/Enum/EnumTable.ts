import {SchemaEditorUpdateDataDetail} from '../Api/SchemaEditorApiCall.js';
import {AlertDialog, AlertDialogTypes} from '../Base/AlertDialog.js';
import {BaseTable, BaseTableOnDelete} from '../Base/BaseTable.js';
import {ConfirmDialog} from '../Base/ConfirmDialog.js';
import {ContextMenu} from '../Base/ContextMenu.js';
import {EditorEvents} from '../Base/EditorEvents.js';
import {EditorIcons} from '../Base/EditorIcons.js';
import jsPlumbInstance from '../jsPlumbInstance.js';
import {
    JsonEnumDescription,
    JsonEnumValueDescription,
    SchemaJsonDataFSType
} from '../JsonData.js';
import {SchemaTypes} from '../Register/SchemaTypes.js';
import {EnumTableDialog} from './EnumTableDialog.js';
import {EnumTableValue} from './EnumTableValue.js';
import {EnumTableValueDialog} from './EnumTableValueDialog.js';

/**
 * Enum table event on delete
 * @param {BaseTable} table
 * @constructor
 */
export const EnumTableEventOnDelete: BaseTableOnDelete = (table: BaseTable) => {
    window.dispatchEvent(new CustomEvent(EditorEvents.deleteEnumTable, {
        detail: {
            id: table.getUnid()
        }
    }));
};

/**
 * Enum table
 */
export class EnumTable extends BaseTable {

    /**
     * columns
     * @protected
     */
    protected _columns: HTMLDivElement;

    /**
     * values
     * @protected
     */
    protected _values: Map<string, EnumTableValue> = new Map<string, EnumTableValue>();

    /**
     * Data stashed by setPendingData() and applied by flushPendingData()
     * once the element is attached to the DOM — avoids detached
     * intrinsic-sizing inflating the table width.
     * @protected
     */
    protected _pendingData: JsonEnumDescription|null = null;

    /**
     * Context menu (Add / Edit / Delete)
     * @protected
     */
    protected _contextMenu: ContextMenu;

    /**
     * Constructor
     * @param {string} unid
     * @param {string} name
     */
    public constructor(unid: string, name: string) {
        super(unid, name);

        // update Schema Types
        SchemaTypes.getInstance().setEnumType(this._unid, this._name);

        this._table.classList.add(...['table', 'vts-schema-table', 'vts-schema-element', 'vts-enum-table']);
        this._headline.classList.add(...['vts-enum-element-name']);

        this.getIconElement().textContent = EditorIcons.enum;

        // front-placed delete from BaseTable is replaced by the context
        // menu entry, so hide the inherited button
        this._btnDelete.style.display = 'none';

        // Buttons -----------------------------------------------------------------------------------------------------

        const elBtn = document.createElement('div');
        elBtn.classList.add('vts-schema-buttons');
        this._headline.appendChild(elBtn);

        // Context menu (Add / Edit / Delete) --------------------------------------------------------------------------

        this._contextMenu = new ContextMenu();

        this._contextMenu.addItem({
            icon: EditorIcons.add,
            label: 'Add value',
            onClick: () => {
                this._openAddValueDialog();
            }
        });

        this._contextMenu.addItem({
            icon: EditorIcons.edit,
            label: 'Edit enum',
            onClick: () => {
                this.openEditDialog();
            }
        });

        this._contextMenu.addSeparator();

        this._contextMenu.addItem({
            icon: EditorIcons.delete,
            label: 'Delete enum',
            danger: true,
            onClick: () => {
                if (this._onDelete) {
                    this._onDelete(this);
                }
            }
        });

        elBtn.appendChild(this._contextMenu.getTriggerElement());

        // columns -----------------------------------------------------------------------------------------------------

        this._columns = document.createElement('div');
        this._columns.classList.add(...['vts-schema-columns']);

        this._table.appendChild(this._columns);

        // -------------------------------------------------------------------------------------------------------------

        this._initJsPlumb();
    }

    /**
     * exist enum entry name
     * @param {string} name
     * @return {boolean}
     */
    public existEnumEntryName(name: string): boolean {
        for (const entry of this._values.values()) {
            if (entry.getName() === name) {
                return true;
            }
        }

        return false;
    }

    /**
     * Set read only
     * @param {boolean} readonly
     */
    public override setReadOnly(readonly: boolean): void {
        super.setReadOnly(readonly);

        for (const [, value] of this._values.entries()) {
            value.setReadOnly(readonly);
        }

        // keep the inherited delete button hidden — replaced by context menu
        this._btnDelete.style.display = 'none';

        this._contextMenu.setTriggerVisible(!readonly);
    }

    /**
     * Open the dialog to add a new value
     * @protected
     */
    protected _openAddValueDialog(): void {
        const dialog = new EnumTableValueDialog();
        dialog.show();
        dialog.setOnConfirm(dialog1 => {
            const tdialog = dialog1 as unknown as EnumTableValueDialog;
            const name = tdialog.getName();
            const uid = crypto.randomUUID();

            if (this.existEnumEntryName(name)) {
                AlertDialog.showAlert(
                    'Add enum value',
                    `Please change your Entryname "${name}", it already exist!`,
                    AlertDialogTypes.error,
                );
                return false;
            }

            const valueStr = tdialog.getValue();

            this.setValues([{
                unid: uid,
                name: name,
                value: valueStr
            }]);

            window.dispatchEvent(new CustomEvent<SchemaEditorUpdateDataDetail>(EditorEvents.updateData, {
                detail: {
                    apiCall: {
                        op: 'enum_value_create',
                        enumUnid: this._unid,
                        unid: uid,
                        name,
                        value: valueStr
                    }
                }
            }));

            return true;
        });
    }

    /**
     * open the edit dialog
     */
    public openEditDialog(): void {
        const dialog = new EnumTableDialog();
        dialog.show();
        dialog.setEnumName(this._name);
        dialog.setOnConfirm(dialog1 => {
            const tdialog = dialog1 as unknown as EnumTableDialog;
            const enumName = tdialog.getEnumName();

            this.setName(enumName);
            this.updateView();

            window.dispatchEvent(new CustomEvent(EditorEvents.updateName, {
                detail: {
                    sourceType: SchemaJsonDataFSType.enum,
                    sourceId: this.getUnid()
                }
            }));

            window.dispatchEvent(new CustomEvent<SchemaEditorUpdateDataDetail>(EditorEvents.updateData, {
                detail: {
                    apiCall: {
                        op: 'enum_update',
                        unid: this.getUnid(),
                        patch: {name: enumName}
                    }
                }
            }));

            return true;
        });
    }

    /**
     * Set the values
     * @param {JsonEnumValueDescription[]} values
     */
    public setValues(values: JsonEnumValueDescription[]): void {
        for (const valueDesc of values) {
            const uuid = valueDesc.unid ?? crypto.randomUUID();
            const value = new EnumTableValue(this._unid, uuid, valueDesc.name, valueDesc.value);
            value.setData(valueDesc);
            value.setOnSave((value1, dialog) => {
                const name = dialog.getName();

                if (this.existEnumEntryName(name)) {
                    AlertDialog.showAlert(
                        'Save enum value',
                        `Please change your Entryname "${name}", it already exist!`,
                        AlertDialogTypes.error,
                    );
                    return false;
                }

                const newValue = dialog.getValue();

                value1.setName(name);
                value1.setValue(newValue);
                value1.updateView();

                window.dispatchEvent(new CustomEvent<SchemaEditorUpdateDataDetail>(EditorEvents.updateData, {
                    detail: {
                        apiCall: {
                            op: 'enum_value_update',
                            enumUnid: this._unid,
                            valueUnid: value1.getId(),
                            patch: {name, value: newValue}
                        }
                    }
                }));

                return true;
            });

            value.setOnDelete(field1 => {
                ConfirmDialog.showConfirm(
                    'Delete field',
                    `Do you really want to delete field '${field1.getName()}'?`,
                    () => {
                        const valueId = field1.getId();

                        field1.remove();
                        this._values.delete(valueId);

                        window.dispatchEvent(new CustomEvent<SchemaEditorUpdateDataDetail>(EditorEvents.updateData, {
                            detail: {
                                apiCall: {
                                    op: 'enum_value_delete',
                                    enumUnid: this._unid,
                                    valueUnid: valueId
                                }
                            }
                        }));
                    }
                );
            });

            value.setOnReorder((sourceId, targetId, position) => {
                this.moveValue(sourceId, targetId, position);
            });

            this._columns.appendChild(value.getElement());
            this._values.set(uuid, value);

            value.setReadOnly(this._readOnly);
            value.updateView();
        }
    }

    /**
     * Move a value before or after another value (drag & drop reorder).
     * @param {string} sourceId
     * @param {string} targetId
     * @param {'before'|'after'} position
     */
    public moveValue(sourceId: string, targetId: string, position: 'before'|'after'): void {
        if (sourceId === targetId) {
            return;
        }

        const sourceValue = this._values.get(sourceId);
        const targetValue = this._values.get(targetId);

        if (!sourceValue || !targetValue) {
            return;
        }

        const sourceEl = sourceValue.getElement();
        const targetEl = targetValue.getElement();

        sourceEl.remove();

        if (position === 'before') {
            targetEl.parentElement!.insertBefore(sourceEl, targetEl);
        } else {
            targetEl.parentElement!.insertBefore(sourceEl, targetEl.nextSibling);
        }

        const reordered = new Map<string, EnumTableValue>();

        for (const child of Array.from(this._columns.children)) {
            for (const [id, val] of this._values.entries()) {
                if (val.getElement() === child) {
                    reordered.set(id, val);
                    break;
                }
            }
        }

        this._values = reordered;

        window.dispatchEvent(new CustomEvent<SchemaEditorUpdateDataDetail>(EditorEvents.updateData, {
            detail: {
                apiCall: {
                    op: 'enum_value_reorder',
                    enumUnid: this._unid,
                    order: Array.from(this._values.keys())
                }
            }
        }));
        jsPlumbInstance.repaintEverything();
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
        super.setName(name);

        // update new name
        SchemaTypes.getInstance().setEnumType(this._unid, this._name);
    }


    /**
     * Return data
     * @return {JsonEnumDescription}
     */
    public getData(): JsonEnumDescription {
        const values: JsonEnumValueDescription[] = [];

        for (const [, value] of this._values.entries()) {
            values.push(value.getData());
        }

        return {
            unid: this._unid,
            name: this._name,
            pos: this._position,
            values: values,
            description: ''
        };
    }

    /**
     * Set data
     * @param {JsonEnumDescription} data
     */
    public setData(data: JsonEnumDescription): void {
        this._unid = data.unid;
        this.setName(data.name);
        this._position = data.pos;
        this.setValues(data.values);
    }

    /**
     * Stash data to be applied once the element is attached to the DOM.
     * @param {JsonEnumDescription} data
     */
    public setPendingData(data: JsonEnumDescription): void {
        this._pendingData = data;
    }

    /**
     * Apply previously stashed pending data. No-op if none pending.
     */
    public flushPendingData(): void {
        if (this._pendingData !== null) {
            const data = this._pendingData;
            this._pendingData = null;
            this.setData(data);
        }
    }

    public override getContextMenu(): ContextMenu {
        return this._contextMenu;
    }

    /**
     * Update view
     */
    public override updateView(): void {
        super.updateView();
        this._contextMenu.clearLinkMode();
        this.getIconElement().textContent = EditorIcons.enum;
        this.setOnDelete(EnumTableEventOnDelete);
    }

    /**
     * Set connection hover by element
     * @param {boolean} hover
     * @protected
     */
    protected override _setConnectionHoverByElement(hover: boolean): void {
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
     * Remove all
     */
    public override remove(): void {
        for (const [id, value] of this._values.entries()) {
            value.remove();
            this._values.delete(id);
        }

        this._contextMenu.destroy();
        super.remove();
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

    protected override _buildPositionUpdateApiCall() {
        return {
            op: 'enum_update' as const,
            unid: this._unid,
            patch: {pos: {x: this._position.x, y: this._position.y}}
        };
    }

}
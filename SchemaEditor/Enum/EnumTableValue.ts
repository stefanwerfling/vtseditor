import {SchemaNameUtil} from '../../SchemaUtil/SchemaNameUtil.js';
import {ContextMenu} from '../Base/ContextMenu.js';
import {EditorIcons} from '../Base/EditorIcons.js';
import {JsonEnumValueDescription} from '../JsonData.js';
import {EnumTableValueDialog} from './EnumTableValueDialog.js';

/**
 * Drag data MIME type used for in-editor enum value reordering.
 */
const ENUM_VALUE_DRAG_TYPE = 'application/x-vts-enum-value';

/**
 * On Save
 */
export type EnumTableValueOnSave = (value: EnumTableValue,  dialog: EnumTableValueDialog) => boolean;

/**
 * On Delete
 */
export type EnumTableValueOnDelete = (value: EnumTableValue) => void;

/**
 * On Reorder
 */
export type EnumTableValueOnReorder = (sourceId: string, targetId: string, position: 'before'|'after') => void;

/**
 * Enum table value
 */
export class EnumTableValue {

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
     * Value
     * @protected
     */
    protected _value: string = '';

    /**
     * Read only
     * @protected
     */
    protected _readOnly: boolean = false;

    /**
     * Span content name
     * @protected
     */
    protected _contentName: HTMLSpanElement;

    /**
     * Span content value
     * @protected
     */
    protected _contentValue: HTMLSpanElement;

    /**
     * Column
     * @protected
     */
    protected _column: HTMLDivElement;

    /**
     * Drag handle
     * @protected
     */
    protected _dragHandle: HTMLDivElement;

    /**
     * Context menu (Edit / Delete)
     * @protected
     */
    protected _contextMenu: ContextMenu;

    /**
     * On Save
     * @protected
     */
    protected _onSave: EnumTableValueOnSave|null = null;

    /**
     * On Delete
     * @protected
     */
    protected _onDelete: EnumTableValueOnDelete|null = null;

    /**
     * On Reorder
     * @protected
     */
    protected _onReorder: EnumTableValueOnReorder|null = null;

    /**
     * Constructor
     * @param {string} tableId
     * @param {string} id
     * @param {string} name
     * @param {string} value
     */
    public constructor(tableId: string, id: string, name: string, value: string) {
        this._id = id;

        this._column = document.createElement('div');
        this._column.classList.add('vts-schema-table-column');

        // drag handle -------------------------------------------------------------------------------------------------

        this._dragHandle = document.createElement('div');
        this._dragHandle.classList.add('vts-schema-column-drag-handle');
        this._dragHandle.title = 'Drag to reorder';
        this._dragHandle.innerHTML = '<span></span><span></span><span></span><span></span><span></span><span></span>';

        this._dragHandle.addEventListener('mousedown', e => {
            if (this._readOnly) {
                return;
            }

            this._column.draggable = true;
            e.stopPropagation();
        });

        this._column.appendChild(this._dragHandle);

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
            e.dataTransfer!.setData(ENUM_VALUE_DRAG_TYPE, this._id);
            this._column.classList.add('dragging-field');
        });

        this._column.addEventListener('dragend', () => {
            this._column.draggable = false;
            this._column.classList.remove('dragging-field');
            this._column.classList.remove('drop-indicator-top', 'drop-indicator-bottom');
        });

        this._column.addEventListener('dragover', e => {
            if (!e.dataTransfer || !e.dataTransfer.types.includes(ENUM_VALUE_DRAG_TYPE)) {
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
            if (!e.dataTransfer || !e.dataTransfer.types.includes(ENUM_VALUE_DRAG_TYPE)) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const sourceId = e.dataTransfer.getData(ENUM_VALUE_DRAG_TYPE);
            const rect = this._column.getBoundingClientRect();
            const isAbove = e.clientY < rect.top + rect.height / 2;

            this._column.classList.remove('drop-indicator-top', 'drop-indicator-bottom');

            if (sourceId && sourceId !== this._id && this._onReorder) {
                this._onReorder(sourceId, this._id, isAbove ? 'before' : 'after');
            }
        });

        // content -----------------------------------------------------------------------------------------------------

        const content = document.createElement('div');
        content.classList.add('vts-schema-column-content');
        this._column.appendChild(content);

        this._contentName = document.createElement('span');
        content.appendChild(this._contentName);

        this._contentValue = document.createElement('span');
        this._contentValue.classList.add('vts-badge-wh-4');
        content.appendChild(this._contentValue);

        // Buttons -----------------------------------------------------------------------------------------------------

        const elBtn = document.createElement('div');
        elBtn.classList.add('vts-schema-column-buttons');
        this._column.appendChild(elBtn);

        // context menu (Edit / Delete) --------------------------------------------------------------------------------

        this._contextMenu = new ContextMenu();

        this._contextMenu.addItem({
            icon: EditorIcons.edit,
            label: 'Edit value',
            onClick: () => {
                const dialog = new EnumTableValueDialog();
                dialog.setName(this._name);
                dialog.setValue(this._value);
                dialog.show();

                dialog.setOnConfirm(dialog1 => {
                    const tdialog = dialog1 as unknown as EnumTableValueDialog;

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
            label: 'Delete value',
            danger: true,
            onClick: () => {
                if (this._onDelete) {
                    this._onDelete(this);
                }
            }
        });

        elBtn.appendChild(this._contextMenu.getTriggerElement());
    }

    /**
     * Return the id
     * @return {string}
     */
    public getId(): string {
        return this._id;
    }

    /**
     * Set the name for value
     * @param {string} name
     */
    public setName(name: string): void {
        const vName = SchemaNameUtil.validateEnumName(name);
        this._name = vName;
        this._contentName.textContent = vName;
    }

    /**
     * Get value name
     * @return {string}
     */
    public getName(): string {
        return this._name;
    }

    /**
     * Is read only
     * @return {boolean}
     */
    public isReadOnly(): boolean {
        return this._readOnly;
    }

    /**
     * Set read only
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
     * Set value
     * @param {string} value
     */
    public setValue(value: string): void {
        this._value = value;
        this._contentValue.textContent = value;
    }

    /**
     * Return value
     * @return {string}
     */
    public getValue(): string {
        return this._value;
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
    public updateView(): void {}

    /**
     * Set on save
     * @param {EnumTableValueOnSave|null} save
     */
    public setOnSave(save: EnumTableValueOnSave|null): void {
        this._onSave = save;
    }

    /**
     * Set on delete
     * @param {EnumTableValueOnDelete|null} onDelete
     */
    public setOnDelete(onDelete: EnumTableValueOnDelete|null): void {
        this._onDelete = onDelete;
    }

    /**
     * Set on reorder
     * @param {EnumTableValueOnReorder|null} onReorder
     */
    public setOnReorder(onReorder: EnumTableValueOnReorder|null): void {
        this._onReorder = onReorder;
    }

    /**
     * Remove
     */
    public remove(): void {
        this._contextMenu.destroy();
        this._column.remove();
    }

    /**
     * Return the data
     * @return {JsonEnumValueDescription}
     */
    public getData(): JsonEnumValueDescription {
        return {
            unid: this._id,
            name: this._name,
            value: this._value
        };
    }

    /**
     * Set data
     * @param {JsonEnumValueDescription} data
     */
    public setData(data: JsonEnumValueDescription): void {
        this._id = data.unid;
        this.setName(data.name);
        this.setValue(data.value);
    }
}
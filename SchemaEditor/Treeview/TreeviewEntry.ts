import {SchemaEditorUpdateDataDetail} from '../Api/SchemaEditorApiCall.js';
import {AlertDialog, AlertDialogTypes} from '../Base/AlertDialog.js';
import {EditorEvents} from '../Base/EditorEvents.js';
import {EditorIcons} from '../Base/EditorIcons.js';
import {EnumTable} from '../Enum/EnumTable.js';
import {GlobalDragDrop} from '../GlobalDragDrop.js';
import {
    JsonDataFS,
    JsonEnumDescription,
    JsonLinkDescription,
    JsonSchemaDescription,
    JsonSchemaDescriptionExtend,
    SchemaJsonDataFS,
    SchemaJsonDataFSIcon,
    SchemaJsonDataFSType,
    SchemaJsonSchemaDescriptionExtend
} from '../JsonData.js';
import {LinkTable} from '../Link/LinkTable.js';
import {SchemaTable} from '../Schema/SchemaTable.js';
import {Treeview} from './Treeview.js';
import {TreeviewDialog} from './TreeviewDialog.js';
import {TreeviewSearchResult} from './TreeviewSearchResult.js';

/**
 * Treeview entry
 */
export class TreeviewEntry {

    /**
     * Ul Element
     * @protected
     */
    protected _ul: HTMLUListElement;

    /**
     * Li Element
     * @protected
     */
    protected _liElement: HTMLLIElement;

    /**
     * span toggle
     * @protected
     */
    protected _spanToggle: HTMLSpanElement;

    /**
     * span icon
     * @protected
     */
    protected _spanIcon: HTMLSpanElement;

    /**
     * Span Name
     * @protected
     */
    protected _spanName: HTMLSpanElement;

    /**
     * div button
     * @protected
     */
    protected _divButtons: HTMLDivElement;

    /**
     * Unid
     * @protected
     */
    protected _unid: string = '';

    /**
     * is the entry readonly
     * @protected
     */
    protected _readonly: boolean = false;

    /**
     * Name
     * @protected
     */
    protected _name: string = '';

    /**
     * Type
     * @protected
     */
    protected _type: SchemaJsonDataFSType|string = '';

    /**
     * icon
     * @protected
     */
    protected _icon: SchemaJsonDataFSIcon|string = '';

    /**
     * List
     * @protected
     */
    protected _list: Map<string, TreeviewEntry> = new Map<string, TreeviewEntry>();

    /**
     * List of tables
     * @protected
     */
    protected _tables: SchemaTable[] = [];

    /**
     * List of enums
     * @protected
     */
    protected _enums: EnumTable[] = [];

    /**
     * List of links
     * @protected
     */
    protected _links: LinkTable[] = [];

    /**
     * True when the canvas content for this entry (schemas, enums, links)
     * is live in memory. Set to `false` only on `file` entries loaded
     * through {@link setSkeletonData}; folder/project/root/extern remain
     * `true` and just hold their children. Hydration is driven by the
     * SchemaEditor when the user makes the file active.
     * @protected
     */
    protected _isHydrated: boolean = true;

    /**
     * Placeholder schema unids/names captured from the skeleton load so
     * the tree leaves can be re-created on demand after a dehydrate.
     * Stays empty for entries that were never loaded as skeleton.
     * @protected
     */
    protected _skeletonSchemas: {unid: string; name: string}[] = [];

    /**
     * Placeholder enum unids/names — same role as {@link _skeletonSchemas}.
     * @protected
     */
    protected _skeletonEnums: {unid: string; name: string}[] = [];

    /**
     * Unid of the owning project (or extern source) — needed to address
     * the hydrate endpoint (`/api/projects/:pid/entries/:unid` or the
     * extern twin). Inherited from the parent during skeleton load.
     * @protected
     */
    protected _projectUnid: string = '';

    /**
     * True when this entry sits under an extern (read-only) source. Used
     * to pick the correct hydrate endpoint.
     * @protected
     */
    protected _isExtern: boolean = false;

    /**
     * Constructor
     * @param {string} unid
     * @param {string} name
     * @param {SchemaJsonDataFSType|string} type
     * @param {string} icon
     */
    public constructor(
        unid: string = '',
        name: string = 'Root',
        type: SchemaJsonDataFSType|string = SchemaJsonDataFSType.root,
        icon: string = ''
    ) {
        this._unid = unid;

        if (type === SchemaJsonDataFSType.extern) {
            this._readonly = true;
        }

        this._ul = document.createElement('ul');
        this._liElement = document.createElement('li');

        const folderLine = document.createElement('div');
        folderLine.classList.add('folder-line');
        this._liElement.appendChild(folderLine);

        // toggle ------------------------------------------------------------------------------------------------------
        this._spanToggle = document.createElement('span');
        this._spanToggle.classList.add('toggle-icon');
        this._spanToggle.textContent = EditorIcons.toggle_open;
        this._spanToggle.addEventListener("click", () => {
            const nextOpen = !this.isToggle();
            this.setToggle(nextOpen);

            // Only folder containers live as real server entities under
            // the project root. The client-side synthetic root and project
            // wrappers use unids that don't map back to the server FS, so
            // persistence on them would 404. Readonly extern trees are
            // skipped for the same reason.
            if (this._readonly) {
                return;
            }

            if (this._type !== SchemaJsonDataFSType.folder) {
                return;
            }

            window.dispatchEvent(new CustomEvent<SchemaEditorUpdateDataDetail>(EditorEvents.updateData, {
                detail: {
                    apiCall: {
                        op: 'container_update',
                        unid: this.getUnid(),
                        patch: {istoggle: nextOpen}
                    }
                }
            }));
        });

        folderLine.appendChild(this._spanToggle);

        // set span name -----------------------------------------------------------------------------------------------

        const clickSetActiv = () => {
            if (this.getType() === SchemaJsonDataFSType.root) {
                // Clicking Root clears the selection so the canvas
                // falls back to the welcome / what's-new panel.
                Treeview.setActivEntryTable(null);
                Treeview.setActivEntry(null);

                window.dispatchEvent(new CustomEvent(EditorEvents.updateView, {}));
                return;
            }

            if (this.getType() === SchemaJsonDataFSType.file) {
                Treeview.setActivEntryTable(null);
                Treeview.setActivEntry(this);

                window.dispatchEvent(new CustomEvent(EditorEvents.updateView, {}));
            }

            if (this.getType() === SchemaJsonDataFSType.enum || this.getType() === SchemaJsonDataFSType.schema) {
                Treeview.setActivEntryTable(this);

                window.dispatchEvent(new CustomEvent(EditorEvents.updateView, {}));
            }
        };

        this._spanIcon = document.createElement('span');
        this._spanIcon.classList.add('folder');
        folderLine.appendChild(this._spanIcon);

        this._spanIcon.addEventListener('click', clickSetActiv);

        this._spanName = document.createElement('span');
        this._spanName.classList.add('folder');
        folderLine.appendChild(this._spanName);

        this._spanName.addEventListener('click', clickSetActiv);

        this._divButtons = document.createElement('div');
        folderLine.appendChild(this._divButtons);

        // helper function ---------------------------------------------------------------------------------------------

        const getDialogTypes = (): Map<string, string> =>  {
            const types = new Map<string, string>();

            if (this._tables.length === 0) {
                types.set('folder', `${EditorIcons.folder} Folder`);
            }

            types.set('file', `${EditorIcons.file} File`);

            return types;
        };

        const getDialogIcons = (): Map<string, string> => {
            const icons = new Map<string, string>();

            icons.set('', 'None');
            icons.set(SchemaJsonDataFSIcon.package, `${EditorIcons.package} Package`);
            icons.set(SchemaJsonDataFSIcon.libary, `${EditorIcons.libary} Libary`);
            icons.set(SchemaJsonDataFSIcon.registry, `${EditorIcons.registry} Registry`);
            icons.set(SchemaJsonDataFSIcon.archiv, `${EditorIcons.archiv} Archiv`);

            return icons;
        };

        // add folder/file ---------------------------------------------------------------------------------------------

        if (type === SchemaJsonDataFSType.project || type === SchemaJsonDataFSType.folder) {
            const btnAdd = document.createElement('button');
            btnAdd.textContent = EditorIcons.add;
            btnAdd.classList.add('add-folder');
            btnAdd.addEventListener('click', () => {
                if (this._readonly) {
                    AlertDialog.showAlert(
                        'Add folder/file',
                        'Add new folder/file can not use by readonly!',
                        AlertDialogTypes.warning
                    );
                    return;
                }

                folderLine.classList.add('folder-line-hover');

                const dialog = new TreeviewDialog();
                dialog.show();

                dialog.setTypeOptions(getDialogTypes());

                if (type === SchemaJsonDataFSType.folder) {
                    dialog.setIconOptions(getDialogIcons());
                }

                dialog.setOnConfirm(dialog1 => {
                    const tdialog = dialog1 as unknown as TreeviewDialog;
                    const newUnid = crypto.randomUUID();
                    const newName = tdialog.getName();
                    const newType = tdialog.getType();
                    const newIcon = tdialog.getIcon();

                    const entry = new TreeviewEntry(newUnid, newName, newType, newIcon);

                    this._list.set(entry.getUnid(), entry);
                    this._liElement.appendChild(entry.getElement());

                    folderLine.classList.remove('folder-line-hover');

                    window.dispatchEvent(new CustomEvent<SchemaEditorUpdateDataDetail>(EditorEvents.updateData, {
                        detail: {
                            apiCall: {
                                op: 'container_create',
                                parentUnid: this.getUnid(),
                                unid: newUnid,
                                name: newName,
                                type: newType,
                                icon: newIcon
                            }
                        }
                    }));

                    return true;
                });

                dialog.setOnClose(() => {
                    folderLine.classList.remove('folder-line-hover');
                });
            });

            this._divButtons.appendChild(btnAdd);
        }

        // add sorting -------------------------------------------------------------------------------------------------

        if (type === SchemaJsonDataFSType.root) {
            const btnSorting = document.createElement('button');
            btnSorting.textContent = EditorIcons.sort;
            btnSorting.classList.add('add-folder');
            btnSorting.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent(EditorEvents.sortEntries, {}));
            });

            this._divButtons.appendChild(btnSorting);
        }

        // edit folder/file --------------------------------------------------------------------------------------------

        if (type === SchemaJsonDataFSType.folder || type === SchemaJsonDataFSType.file) {
            const btnEdit = document.createElement('button');
            btnEdit.textContent = EditorIcons.edit;
            btnEdit.classList.add('add-folder');
            btnEdit.addEventListener('click', () => {
                if (this._readonly) {
                    AlertDialog.showAlert(
                        'Edit folder/file',
                        'Edit folder/file can not use by readonly!',
                        AlertDialogTypes.warning
                    );
                    return;
                }

                folderLine.classList.add('folder-line-hover');

                const dialog = new TreeviewDialog();
                dialog.setName(this.getName());
                dialog.setTypeOptions(getDialogTypes());
                dialog.setType(this.getType());
                dialog.setIconOptions(getDialogIcons());
                dialog.setIcon(this.getIcon());
                dialog.show();

                dialog.setOnConfirm(dialog1 => {
                    const tdialog = dialog1 as unknown as TreeviewDialog;
                    const newName = tdialog.getName();
                    const newType = tdialog.getType();
                    const newIcon = tdialog.getIcon();

                    this.setName(newName);
                    this.setType(newType);
                    this.setIcon(newIcon);

                    folderLine.classList.remove('folder-line-hover');

                    window.dispatchEvent(new CustomEvent<SchemaEditorUpdateDataDetail>(EditorEvents.updateData, {
                        detail: {
                            apiCall: {
                                op: 'container_update',
                                unid: this.getUnid(),
                                patch: {
                                    name: newName,
                                    type: newType,
                                    icon: newIcon
                                }
                            }
                        }
                    }));

                    return true;
                });

                dialog.setOnClose(() => {
                    folderLine.classList.remove('folder-line-hover');
                });
            });

            this._divButtons.appendChild(btnEdit);
        }

        // add button delete -------------------------------------------------------------------------------------------

        const allowDeleteTypes: SchemaJsonDataFSType|string[] = [
            SchemaJsonDataFSType.folder,
            SchemaJsonDataFSType.file
        ];

        if (allowDeleteTypes.indexOf(type) > -1) {
            const btnDelete = document.createElement('button');
            btnDelete.textContent = EditorIcons.delete;
            btnDelete.classList.add('delete-folder');
            btnDelete.addEventListener('click', () => {
                if (this._readonly) {
                    AlertDialog.showAlert(
                        'Delete folder/file',
                        'Delete folder/file can not use by readonly!',
                        AlertDialogTypes.warning
                    );
                    return;
                }

                window.dispatchEvent(new CustomEvent(EditorEvents.deleteFolderFile, {
                    detail: {
                        id: this.getUnid()
                    }
                }));
            });

            this._divButtons.appendChild(btnDelete);
        }

        // set draggable -----------------------------------------------------------------------------------------------

        if (type === SchemaJsonDataFSType.file || type === SchemaJsonDataFSType.folder ||
            type === SchemaJsonDataFSType.schema || type === SchemaJsonDataFSType.enum)
        {
            folderLine.draggable = true;
            folderLine.addEventListener('dragstart', e => {
                if (this._readonly) {
                    if (type === SchemaJsonDataFSType.file || type === SchemaJsonDataFSType.folder) {
                        e.stopPropagation();
                        GlobalDragDrop.dragData = null;
                        return;
                    }
                }

                const selfType = this.getType();
                console.log(`dragstart: Type: ${type} SelfType: ${selfType}`);

                GlobalDragDrop.dragData = {
                    type: selfType,
                    unid: this.getUnid()
                };

                e.dataTransfer?.clearData();
                folderLine.classList.add('dragging');

                if (selfType === SchemaJsonDataFSType.schema || selfType === SchemaJsonDataFSType.enum) {
                    const activeEntry = Treeview.getActiveEntry();

                    if (activeEntry) {
                        const tables = activeEntry.getSchemaTables();

                        for (const table of tables) {
                            if (this.getUnid() !== table.getUnid()) {
                                table.showDropArea(true);
                            }
                        }
                    }
                }
            });
        }

        folderLine.addEventListener('dragover', e => {
            if (this._readonly) {
                GlobalDragDrop.dragData = null;
                e.stopPropagation();
                return;
            }

            e.preventDefault();

            if (GlobalDragDrop.dragData !== null) {
                const dragType = GlobalDragDrop.dragData.type;
                const selfType = this.getType();

                console.log(`dragover: Type: ${dragType} SelfType: ${selfType}`);

                switch (selfType) {
                    case SchemaJsonDataFSType.project:
                        if (dragType === SchemaJsonDataFSType.folder) {
                            folderLine.classList.add('drag-over');
                        }
                        break;

                    case SchemaJsonDataFSType.folder:
                        if (dragType === SchemaJsonDataFSType.file || dragType === SchemaJsonDataFSType.folder) {
                            folderLine.classList.add('drag-over');
                        }
                        break;

                    case SchemaJsonDataFSType.file:
                        if (dragType === SchemaJsonDataFSType.schema || dragType === SchemaJsonDataFSType.enum) {
                            folderLine.classList.add('drag-over');
                        }
                        break;
                }
            }
        });

        folderLine.addEventListener('dragleave', () => {
            folderLine.classList.remove('drag-over');
        });

        folderLine.addEventListener('dragend', () => {
            folderLine.classList.remove('dragging');

            const activeEntry = Treeview.getActiveEntry();

            if (activeEntry) {
                const tables = activeEntry.getSchemaTables();

                for (const table of tables) {
                    table.showDropArea(false);
                }
            }
        });

        folderLine.addEventListener('drop', e => {
            if (this._readonly) {
                GlobalDragDrop.dragData = null;
                e.stopPropagation();
                return;
            }

            e.preventDefault();

            if (GlobalDragDrop.dragData !== null) {
                const dragData = GlobalDragDrop.dragData;
                const selfType = this.getType();

                console.log(`drop: Type: ${dragData.type} SelfType: ${selfType}`);

                switch (selfType) {
                    case SchemaJsonDataFSType.project:
                        if (dragData.type === SchemaJsonDataFSType.folder) {
                            window.dispatchEvent(new CustomEvent(EditorEvents.moveTo, {
                                detail: {
                                    sourceType: dragData.type,
                                    destinationType: selfType,
                                    sourceId: dragData.unid,
                                    destinationId: this.getUnid()
                                }
                            }));
                        }
                        break;

                    case SchemaJsonDataFSType.folder:
                        if (dragData.type === SchemaJsonDataFSType.file || dragData.type === SchemaJsonDataFSType.folder) {
                            window.dispatchEvent(new CustomEvent(EditorEvents.moveTo, {
                                detail: {
                                    sourceType: dragData.type,
                                    destinationType: selfType,
                                    sourceId: dragData.unid,
                                    destinationId: this.getUnid()
                                }
                            }));
                        }
                        break;

                    case SchemaJsonDataFSType.file:
                        if (dragData.type === SchemaJsonDataFSType.schema || dragData.type === SchemaJsonDataFSType.enum) {
                            window.dispatchEvent(new CustomEvent(EditorEvents.moveTo, {
                                detail: {
                                    sourceType: dragData.type,
                                    destinationType: selfType,
                                    sourceId: dragData.unid,
                                    destinationId: this.getUnid()
                                }
                            }));
                        }
                        break;
                }
            }

            folderLine.classList.remove('drag-over');
        });

        // -------------------------------------------------------------------------------------------------------------

        this._ul.appendChild(this._liElement);

        this.setType(type);
        this.setName(name);

        if (type === SchemaJsonDataFSType.root || type === SchemaJsonDataFSType.folder) {
            this.setToggle(false);
        }

        if (icon !== '') {
            this.setIcon(icon);
        } else {
            this.setIcon(type);
        }
    }

    /**
     * Return an element
     * @return {HTMLUListElement}
     */
    public getElement(): HTMLUListElement {
        return this._ul;
    }

    /**
     * Is this entry only read
     * @return {boolean}
     */
    public isReadOnly(): boolean {
        return this._readonly;
    }

    /**
     * Set readonly
     * @param {boolean} readOnly
     */
    public setReadOnly(readOnly: boolean): void {
        this._readonly = readOnly;

        if (this._readonly) {
            this._divButtons.style.display = 'none';
        } else {
            this._divButtons.style.display = '';
        }
    }

    /**
     * Is entry toggle
     * @return {boolean}
     */
    public isToggle(): boolean {
        const line = this._spanToggle.parentElement;

        if (!line) {
            return false;
        }

        return line.classList.contains('open');
    }

    /**
     * Set toogle
     * @param {boolean} open
     */
    public setToggle(open: boolean): void {
        const line = this._spanToggle.parentElement;

        if (!line) return;

        const parentLi = this._spanToggle.closest('li');

        if (!parentLi) return;

        const uls = Array.from(parentLi.children).filter(el => el.tagName === 'UL') as HTMLUListElement[];

        if (open) {
            line.classList.add('open');
            this._spanToggle.textContent = EditorIcons.toggle_open;
        } else {
            line.classList.remove('open');
            this._spanToggle.textContent = EditorIcons.toggle_close;
        }

        if (this._icon !== '') {
            this._setIcon(this._icon);
        } else {
            this._setIcon(this.getType());
        }

        for (const ul of uls) {
            ul.style.display = open ? 'block' : 'none';
        }
    }

    /**
     * Set Type
     * @param {SchemaJsonDataFSType|string} type
     */
    public setType(type: SchemaJsonDataFSType|string): void {
        this._type = type;

        this._spanName.classList.remove('treeview-file');
        this._spanToggle.style.display = 'block';

        if (type === SchemaJsonDataFSType.file || type === SchemaJsonDataFSType.schema || type === SchemaJsonDataFSType.enum) {
            this._spanName.classList.add('treeview-file');
            this._spanToggle.style.display = 'none';
        }

        if (this._icon !== '') {
            this._setIcon(this._icon);
        } else {
            this._setIcon(type);
        }
    }

    /**
     * Get type
     * @return {string|SchemaJsonDataFSType}
     */
    public getType(): string|SchemaJsonDataFSType {
        return this._type;
    }

    /**
     * Set icon
     * @param {SchemaJsonDataFSType|SchemaJsonDataFSIcon|string} icon
     */
    protected _setIcon(icon: SchemaJsonDataFSType|SchemaJsonDataFSIcon|string): void {
        let iconText: string = EditorIcons.unknown;

        switch (icon) {
            case SchemaJsonDataFSType.root:
                iconText = EditorIcons.root;
                break;

            case SchemaJsonDataFSType.project:
                iconText = EditorIcons.project;
                break;

            case SchemaJsonDataFSType.extern:
                iconText = EditorIcons.package;
                break;

            case SchemaJsonDataFSType.folder:
                iconText = EditorIcons.folder;

                if (this.isToggle()) {
                    iconText = EditorIcons.folder_open;
                }

                break;

            case SchemaJsonDataFSType.file:
                iconText = EditorIcons.file;
                break;

            case SchemaJsonDataFSType.schema:
                iconText = EditorIcons.schema;
                break;

            case SchemaJsonDataFSType.enum:
                iconText = EditorIcons.enum;
                break;

            case SchemaJsonDataFSIcon.package:
                iconText = EditorIcons.package;
                break;

            case SchemaJsonDataFSIcon.libary:
                iconText = EditorIcons.libary;
                break;

            case SchemaJsonDataFSIcon.registry:
                iconText = EditorIcons.registry;
                break;

            case SchemaJsonDataFSIcon.archiv:
                iconText = EditorIcons.archiv;
                break;
        }

        if (this._spanIcon) {
            this._spanIcon.textContent = iconText;
        }
    }

    /**
     * Set name
     * @param {name} name
     */
    public setName(name: string): void {
        this._name = name;
        this._spanName.textContent = name;
    }

    /**
     * Get name
     * @return {string}
     */
    public getName(): string {
        return this._name;
    }

    /**
     * Return the icon
     * @return {string}
     */
    public getIcon(): string {
        return this._icon;
    }

    /**
     * Set the icon
     * @param {string} icon
     */
    public setIcon(icon: SchemaJsonDataFSIcon|string): void {
        let mIcon = icon;

        if (mIcon === '') {
            if (this._type !== '') {
                mIcon = this._type;
            }
        }

        this._icon = mIcon;
        this._setIcon(mIcon);
    }

    /**
     * Get unid
     * @return {string}
     */
    public getUnid(): string {
        return this._unid;
    }

    /**
     * Add an entry
     * @param {TreeviewEntry} entry
     */
    public addEntry(entry: TreeviewEntry): void {
        if (this._type !== SchemaJsonDataFSType.root) {
            entry.setReadOnly(this._readonly);
        }

        this._list.set(entry.getUnid(), entry);
        this._liElement.appendChild(entry.getElement());
    }

    /**
     * Return the child entries (folders / files / schemas / enums).
     * Order matches `_list` insertion / sort order.
     */
    public getChildren(): TreeviewEntry[] {
        return Array.from(this._list.values());
    }

    /**
     * Get data
     * @return {JsonDataFS}
     */
    public getData(): JsonDataFS {
        const entrys: JsonDataFS[] = [];

        for (const [, entry] of this._list.entries()) {
            if (entry.getType() === SchemaJsonDataFSType.schema || entry.getType() === SchemaJsonDataFSType.enum) {
                continue;
            }

            entrys.push(entry.getData());
        }

        // enums -------------------------------------------------------------------------------------------------------

        const enums: JsonEnumDescription[] = [];

        if (this._isHydrated) {
            for (const aenum of this._enums) {
                enums.push(aenum.getData());
            }
        } else {
            // Skeleton-only file: emit placeholders so callers walking
            // the tree (e.g. _updateTreeview, sorting, search) see the
            // names without forcing a hydrate. Heavy fields are kept
            // at their default-empty values so a downstream
            // setSkeletonData round-trips cleanly.
            for (const placeholder of this._skeletonEnums) {
                enums.push({
                    unid: placeholder.unid,
                    name: placeholder.name,
                    pos: {x: 0, y: 0},
                    values: [],
                    description: ''
                });
            }
        }

        // schemas -----------------------------------------------------------------------------------------------------

        const schemas: JsonSchemaDescription[] = [];

        if (this._isHydrated) {
            for (const table of this._tables) {
                schemas.push(table.getData());
            }
        } else {
            for (const placeholder of this._skeletonSchemas) {
                schemas.push({
                    unid: placeholder.unid,
                    name: placeholder.name,
                    extend: {type: 'object'},
                    pos: {x: 0, y: 0},
                    fields: [],
                    description: ''
                });
            }
        }

        // links -------------------------------------------------------------------------------------------------------

        const links: JsonLinkDescription[] = [];

        for (const link of this._links) {
            links.push(link.getData());
        }

        // -------------------------------------------------------------------------------------------------------------

        return {
            unid: this._unid,
            name: this._name,
            type: this._type,
            icon: this._icon === '' ? undefined : this._icon,
            istoggle: this.isToggle(),
            entrys: entrys,
            schemas: schemas,
            enums: enums,
            links: links
        };
    }

    /**
     * Set data
     * @param {JsonDataFS} data
     */
    public setData(data: JsonDataFS): void {
        // Clear any previous state so reloads (initial load, SSE resync,
        // manual refresh) rebuild from scratch instead of appending.
        this.removeEntrys();

        this._unid = data.unid;
        this.setType(data.type);
        this.setName(data.name);

        if (data.icon) {
            this.setIcon(data.icon);
        }

        if (data.istoggle) {
            this.setToggle(data.istoggle);
        }

        // entrys ------------------------------------------------------------------------------------------------------

        for (const aEntry of data.entrys) {
            if (SchemaJsonDataFS.validate(aEntry, [])) {
                const entry = new TreeviewEntry(aEntry.unid, aEntry.name, aEntry.type);
                this.addEntry(entry);
                entry.setData(aEntry);
            }
        }

        // enums -------------------------------------------------------------------------------------------------------

        if (data.enums) {
            for (const aEnum of data.enums) {
                const tenum = new EnumTable(aEnum.unid, aEnum.name);
                // Defer field population until the element is in the DOM —
                // SchemaEditor._updateView calls flushPendingData() after
                // appendChild. Populating while detached causes intrinsic
                // flex sizing to lock the table to the widest nowrap child.
                tenum.setPendingData(aEnum);
                this.addEnumTable(tenum);
            }
        }

        // schemas -----------------------------------------------------------------------------------------------------

        for (const aSchema of data.schemas) {
            let extend: JsonSchemaDescriptionExtend|null = null;

            if (SchemaJsonSchemaDescriptionExtend.validate(aSchema.extend, [])) {
                extend = aSchema.extend;
            }

            const schema = new SchemaTable(aSchema.unid, aSchema.name, extend);
            schema.setPendingData(aSchema);
            this.addSchemaTable(schema);
        }

        // links -------------------------------------------------------------------------------------------------------

        if (data.links) {
            for (const aLink of data.links) {
                const link = new LinkTable(aLink.unid, aLink.link_unid);
                link.setData(aLink);
                this.addLinkTable(link);
            }
        }
    }

    /**
     * Set the project / extern source this entry belongs to so the
     * SchemaEditor can address the right hydrate endpoint when the user
     * opens it. Propagates down on skeleton load.
     */
    public setProjectScope(projectUnid: string, isExtern: boolean): void {
        this._projectUnid = projectUnid;
        this._isExtern = isExtern;
    }

    /**
     * Project / extern source unid this entry belongs to.
     */
    public getProjectUnid(): string {
        return this._projectUnid;
    }

    /**
     * True when this entry sits under an extern (read-only) source.
     */
    public isExternEntry(): boolean {
        return this._isExtern;
    }

    /**
     * True when canvas content (schemas/enums/links) is live. False on
     * `file` entries that were loaded as skeleton and have not been
     * opened yet — those carry only placeholder tree leaves.
     */
    public isHydrated(): boolean {
        return this._isHydrated;
    }

    /**
     * Lightweight counterpart to {@link setData} used by the chunked
     * load path. Builds the tree structure from a {@link JsonDataFS} but
     * does **not** instantiate {@link SchemaTable}/{@link EnumTable} for
     * `file` entries — only placeholder tree leaves are added so the
     * treeview renders and the type registry stays populated. `file`
     * entries are marked unhydrated; the SchemaEditor calls
     * {@link hydrate} on demand when the user opens one.
     *
     * Recurses into sub-containers (`folder`, `project`, `extern`)
     * passing the same project scope down.
     */
    public setSkeletonData(data: JsonDataFS, projectUnid: string, isExtern: boolean): void {
        this.removeEntrys();

        this._unid = data.unid;
        this.setType(data.type);
        this.setName(data.name);

        // Project / extern entries reset the addressing context — their
        // own unid is the pid (or eid) used by the hydrate endpoints,
        // and all descendants inherit it. The synthetic root sits above
        // this and just delegates to its project children.
        let childProjectUnid = projectUnid;
        let childIsExtern = isExtern;

        if (data.type === SchemaJsonDataFSType.project) {
            childProjectUnid = data.unid;
            childIsExtern = false;
        } else if (data.type === SchemaJsonDataFSType.extern) {
            childProjectUnid = data.unid;
            childIsExtern = true;
        }

        this.setProjectScope(childProjectUnid, childIsExtern);

        if (data.icon) {
            this.setIcon(data.icon);
        }

        if (data.istoggle) {
            this.setToggle(data.istoggle);
        }

        // Child containers (folder/project/extern under root, files
        // inside folders). Recurse so the skeleton fills the whole
        // tree below this node.
        for (const aEntry of data.entrys) {
            if (SchemaJsonDataFS.validate(aEntry, [])) {
                const entry = new TreeviewEntry(aEntry.unid, aEntry.name, aEntry.type);
                this.addEntry(entry);
                entry.setSkeletonData(aEntry, childProjectUnid, childIsExtern);
            }
        }

        // For schemas/enums on a `file` entry the skeleton ships
        // {unid, name} placeholders. Stash them and render tree leaves
        // only — full hydration creates the canvas tables later.
        if (this._type === SchemaJsonDataFSType.file) {
            this._skeletonSchemas = data.schemas.map((s) => ({unid: s.unid, name: s.name}));
            this._skeletonEnums = (data.enums ?? []).map((e) => ({unid: e.unid, name: e.name}));
            this._isHydrated = false;

            this._renderSkeletonLeaves();
        }
    }

    /**
     * Add a tree leaf for a schema/enum placeholder without creating a
     * {@link SchemaTable}/{@link EnumTable}. Shared by skeleton load and
     * dehydrate.
     * @protected
     */
    protected _renderSkeletonLeaves(): void {
        // Order matches the eager-load `setData` path (enums first,
        // then schemas) so the tree does not visibly reshuffle when a
        // file transitions skeleton → hydrated → skeleton.
        for (const placeholder of this._skeletonEnums) {
            const entry = new TreeviewEntry(
                placeholder.unid,
                placeholder.name,
                SchemaJsonDataFSType.enum
            );

            entry.setReadOnly(this._readonly);
            this._list.set(entry.getUnid(), entry);
            this._liElement.appendChild(entry.getElement());
        }

        for (const placeholder of this._skeletonSchemas) {
            const entry = new TreeviewEntry(
                placeholder.unid,
                placeholder.name,
                SchemaJsonDataFSType.schema
            );

            entry.setReadOnly(this._readonly);
            this._list.set(entry.getUnid(), entry);
            this._liElement.appendChild(entry.getElement());
        }
    }

    /**
     * Replace the placeholder tree leaves on a `file` entry with live
     * {@link SchemaTable}/{@link EnumTable}/{@link LinkTable} instances
     * built from the per-entry payload that
     * `/api/projects/:pid/entries/:unid` returned. After this call the
     * entry behaves like one loaded eagerly through {@link setData}.
     */
    public hydrate(data: JsonDataFS): void {
        // Tear down whatever is live (skeleton leaves or a previous
        // hydration that is being replaced) so we rebuild from scratch.
        this._destroyTablesAndLeaves();

        if (data.enums) {
            for (const aEnum of data.enums) {
                const tenum = new EnumTable(aEnum.unid, aEnum.name);
                tenum.setPendingData(aEnum);
                this.addEnumTable(tenum);
            }
        }

        for (const aSchema of data.schemas) {
            let extend: JsonSchemaDescriptionExtend|null = null;

            if (SchemaJsonSchemaDescriptionExtend.validate(aSchema.extend, [])) {
                extend = aSchema.extend;
            }

            const schema = new SchemaTable(aSchema.unid, aSchema.name, extend);
            schema.setPendingData(aSchema);
            this.addSchemaTable(schema);
        }

        if (data.links) {
            for (const aLink of data.links) {
                const link = new LinkTable(aLink.unid, aLink.link_unid);
                link.setData(aLink);
                this.addLinkTable(link);
            }
        }

        // Keep the placeholder list in sync — used by dehydrate to
        // re-render leaves and by callers (e.g. _updateTreeview) that
        // need to know what's inside without touching the live tables.
        this._skeletonSchemas = data.schemas.map((s) => ({unid: s.unid, name: s.name}));
        this._skeletonEnums = (data.enums ?? []).map((e) => ({unid: e.unid, name: e.name}));
        this._isHydrated = true;
    }

    /**
     * Drop live {@link SchemaTable}/{@link EnumTable}/{@link LinkTable}
     * instances and re-render the schema/enum tree leaves from the
     * cached placeholder data. Used by the LRU when an old file falls
     * off the cache tail.
     *
     * The placeholder list is refreshed from the current live tables
     * first so any user-added/renamed schemas or enums survive the
     * round-trip — addSchemaTable / removeSchemaTable do not maintain
     * the placeholder list incrementally.
     */
    public dehydrate(): void {
        if (!this._isHydrated) {
            return;
        }

        this._skeletonSchemas = this._tables.map((t) => ({unid: t.getUnid(), name: t.getName()}));
        this._skeletonEnums = this._enums.map((e) => ({unid: e.getUnid(), name: e.getName()}));

        this._destroyTablesAndLeaves();
        this._renderSkeletonLeaves();
        this._isHydrated = false;
    }

    /**
     * Common teardown for the schema/enum/link instances and the
     * matching tree leaves. Shared by {@link hydrate} (which rebuilds
     * straight after) and {@link dehydrate} (which re-renders skeleton
     * leaves straight after).
     * @protected
     */
    protected _destroyTablesAndLeaves(): void {
        for (const aenum of this._enums) {
            aenum.remove();
        }

        for (const atable of this._tables) {
            atable.remove();
        }

        this._enums = [];
        this._tables = [];
        this._links = [];

        // Tree leaves of type schema/enum live in `_list`. Folder/file
        // children must survive because skeleton load already placed
        // them as direct children too (e.g. project root holding
        // folders), and dehydrate is only called on file entries which
        // do not contain folder children anyway.
        const toRemove: string[] = [];

        for (const [unid, child] of this._list.entries()) {
            const t = child.getType();

            if (t === SchemaJsonDataFSType.schema || t === SchemaJsonDataFSType.enum) {
                toRemove.push(unid);
            }
        }

        for (const unid of toRemove) {
            const child = this._list.get(unid);

            if (child) {
                this._liElement.removeChild(child.getElement());
                this._list.delete(unid);
            }
        }
    }

    /**
     * Add schema table
     * @param {SchemaTable} table
     */
    public addSchemaTable(table: SchemaTable): void {
        table.setReadOnly(this._readonly);
        this._tables.push(table);

        const entry = new TreeviewEntry(
            table.getUnid(),
            table.getName(),
            SchemaJsonDataFSType.schema
        );

        this.addEntry(entry);
    }

    /**
     * Add enum table
     * @param {EnumTable} table
     */
    public addEnumTable(table: EnumTable): void {
        table.setReadOnly(this._readonly);
        this._enums.push(table);

        const entry = new TreeviewEntry(table.getUnid(), table.getName(), SchemaJsonDataFSType.enum);
        this.addEntry(entry);
    }

    /**
     * Add link table
     * @param {LinkTable} table
     */
    public addLinkTable(table: LinkTable): void {
        this._links.push(table);
    }

    /**
     * Return schema tables
     * @return {SchemaTable[]}
     */
    public getSchemaTables(): SchemaTable[] {
        return this._tables;
    }

    /**
     * Return enum tables
     * @return {EnumTable[]}
     */
    public getEnumTables(): EnumTable[] {
        return this._enums;
    }

    /**
     * Return link tables
     * @return {LinkTable[]}
     */
    public getLinkTables(): LinkTable[] {
        return this._links;
    }

    /**
     * Is schema table use
     * @param {string} unid
     * @return {boolean}
     */
    public isSchemaTableUse(unid: string): boolean {
        for (const [, entry] of this._list.entries()) {
            if (entry.isSchemaTableUse(unid)) {
                return true;
            }
        }

        for (const table of this._tables) {
            if (table.getUnid() === unid) {
                continue;
            }

            if (table.isSchemaTableUse(unid)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Remove a Schema table
     * @param {string} unid
     * @return {boolean}
     */
    public removeSchemaTable(unid: string): boolean {
        for (let i = 0; i < this._tables.length; i++) {
            const table = this._tables[i];

            if (table.getUnid() === unid) {
                table.remove();
                this._tables.splice(i, 1);
                return true;
            }
        }

        for (const [, entry] of this._list.entries()) {
            if (entry.removeSchemaTable(unid)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Remove an enum table
     * @param {string} unid
     * @return {boolean}
     */
    public removeEnumTable(unid: string): boolean {
        for (let i = 0; i < this._enums.length; i++) {
            const table = this._enums[i];

            if (table.getUnid() === unid) {
                table.remove();
                this._enums.splice(i, 1);
                return true;
            }
        }

        for (const [, entry] of this._list.entries()) {
            if (entry.removeEnumTable(unid)) {
                return true;
            }
        }

        return false;
    }

    /**
     * removeLinkTable
     * @param {string} objectUnid
     * @return {boolean}
     */
    public removeLinkTable(objectUnid: string): boolean {
        for (let i = 0; i < this._links.length; i++) {
            const table = this._links[i];

            if (table.getLinkObjectUnid() === objectUnid) {
                this._links.splice(i, 1);
                return true;
            }
        }

        return false;
    }

    /**
     * Remove entrys. Resets this node back to an empty state so a subsequent
     * {@link setData} call rebuilds cleanly — otherwise a reload (e.g. the
     * SSE-triggered resync after a remote MCP edit) would duplicate every
     * child because setData previously only appended.
     */
    public removeEntrys(): void {
        for (const aenum of this._enums) {
            aenum.remove();
        }

        for (const atable of this._tables) {
            atable.remove();
        }

        for (const [, entry] of this._list.entries()) {
            entry.removeEntrys();
            this._liElement.removeChild(entry.getElement());
        }

        this._enums = [];
        this._tables = [];
        this._links = [];
        this._list.clear();
    }

    /**
     * Re-append the live `_list` children to {@link _liElement} in
     * their current Map iteration order. Used after
     * {@link sortingEntrys} so the DOM picks up the new order without
     * the destructive rebuild that {@link removeEntrys} + {@link setData}
     * would do (which dehydrates unrelated entries). Recurses so a
     * sort at any level reorders everything below it as well.
     */
    public redrawChildren(recursive: boolean = true): void {
        for (const [, entry] of this._list.entries()) {
            this._liElement.appendChild(entry.getElement());

            if (recursive) {
                entry.redrawChildren(true);
            }
        }
    }

    /**
     * Sorting entrys
     */
    public sortingEntrys(): void {
        for (const [, entry] of this._list.entries()) {
            entry.sortingEntrys();
        }

        this._list = new Map(
            Array.from(this._list.entries()).sort((
                [, a],
                [, b]
            ) => {
                const typeOrder = (type: string) => (type === 'folder' ? 0 : 1);
                const typeDiff = typeOrder(a.getType()) - typeOrder(b.getType());

                if (typeDiff !== 0) {
                    return typeDiff;
                }

                return a.getName().localeCompare(b.getName());
            })
        );
    }

    /**
     * Set an active name
     */
    public setActiveName(): void {
        if (this.getType() === SchemaJsonDataFSType.file) {
            this._spanName.classList.add('active');
        }

        if (this.getType() === SchemaJsonDataFSType.enum || this.getType() === SchemaJsonDataFSType.schema) {
            this._spanName.classList.add('active2');
        }
    }

    /**
     * Return the entry by id
     * @param {string} unid
     * @return {TreeviewEntry|null}
     */
    public getEntryById(unid: string): TreeviewEntry|null {
        if (this._unid === unid) {
            return this;
        }

        for (const [, enty] of this._list.entries()) {
            const tentry = enty.getEntryById(unid);

            if (tentry !== null) {
                return tentry;
            }
        }

        return null;
    }

    /**
     * has entry with
     * @param {string} name
     * @param {string} eType
     * @return {boolean}
     */
    public hasEntryWith(name: string, eType: string): boolean {
        for (const [, entry] of this._list.entries()) {
            if (entry.getName() === name && entry.getType() === eType) {
                return true;
            }
        }

        return false;
    }

    /**
     * Update view
     * @param {boolean} recursive
     */
    public updateView(recursive: boolean): void {
        if (this._type === SchemaJsonDataFSType.root || this._type === SchemaJsonDataFSType.folder) {
            this.setToggle(this.isToggle());
        }

        if (recursive) {
            for (const [, entry] of this._list.entries()) {
                entry.updateView(recursive);
            }
        }
    }

    /**
     * Find parent
     * @param {string} unid
     * @return {TreeviewEntry|null}
     */
    public findEntry(unid: string): TreeviewEntry|null {
        for (const [, entry] of this._list.entries()) {
            if (entry.getUnid() === unid) {
                return this;
            }

            const found = entry.findEntry(unid);

            if (found !== null) {
                return found;
            }
        }

        return null;
    }

    /**
     * find parent entry
     * @param {string} unid
     * @return {TreeviewEntry|null}
     */
    public findParentEntry(unid: string): TreeviewEntry|null {
        if (this.hasEntry(unid)) {
            return this;
        }

        for (const [, entry] of this._list.entries()) {
            if (entry.hasEntry(unid)) {
                return entry;
            }

            const tentry = entry.findParentEntry(unid);

            if (tentry !== null) {
                return tentry;
            }
        }

        return null;
    }

    /**
     * splice an entry
     * @param {string} unid
     * @return {TreeviewEntry|null}
     */
    public spliceEntry(unid: string): TreeviewEntry|null {
        if (this._list.has(unid)) {
            const entry = this._list.get(unid);

            if (entry) {
                this._list.delete(unid);

                return entry;
            }
        }

        return null;
    }

    /**
     * Get table by id
     * @param {string} tableId
     * @return {SchemaTable|null}
     */
    public getTableById(tableId: string): SchemaTable|null {
        for (const table of this._tables) {
            if (table.getUnid() === tableId) {
                return table;
            }
        }

        return null;
    }

    /**
     * Splice a table
     * @param {string} unid
     * @return {SchemaTable|null}
     */
    public spliceTable(unid: string): SchemaTable|null {
        const index = this._tables.findIndex(table => table.getUnid() === unid);

        if (index !== -1) {
            return this._tables.splice(index, 1)[0];
        }

        return null;
    }

    /**
     * has table or enum name in this entry
     * @param {string} name
     * @return {boolean}
     */
    public hasTableOrEnumName(name: string): boolean {
        for (const table of this._tables) {
            if (table.getName() === name) {
                return true;
            }
        }

        for (const aenum of this._enums) {
            if (aenum.getName() === name) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get enum by id
     * @param {string} enumId
     * @return {EnumTable|null}
     */
    public getEnumById(enumId: string): EnumTable|null {
        for (const aenum of this._enums) {
            if (aenum.getUnid() === enumId) {
                return aenum;
            }
        }

        return null;
    }

    /**
     * Splice a enum
     * @param {string} unid
     * @return {EnumTable|null}
     */
    public spliceEnum(unid: string): EnumTable|null {
        const index = this._enums.findIndex(table => table.getUnid() === unid);

        if (index !== -1) {
            return this._enums.splice(index, 1)[0];
        }

        return null;
    }

    /**
     * Remove a children entry
     * @param {string} unid
     * @return {boolean}
     */
    public removeEntry(unid: string): boolean {
        const aEntry = this._list.get(unid);

        if (aEntry) {
            const allowDirectDeleteType: SchemaJsonDataFSType|string[] = [
                SchemaJsonDataFSType.folder,
                SchemaJsonDataFSType.file,
                SchemaJsonDataFSType.enum,
                SchemaJsonDataFSType.schema,
                SchemaJsonDataFSType.link
            ];

            if (allowDirectDeleteType.indexOf(aEntry.getType()) > -1) {
                aEntry.removeEntrys();

                // Drop the child's DOM subtree from this entry so the
                // tree visually reflects the deletion. Previously the
                // editor relied on _updateTreeview() to rebuild the
                // whole tree after a delete and never cleaned up the
                // child here; lazy hydration cannot afford that
                // destructive rebuild anymore (it would dehydrate
                // unrelated entries).
                if (aEntry.getElement().parentElement === this._liElement) {
                    this._liElement.removeChild(aEntry.getElement());
                }

                this._list.delete(unid);

                return true;
            }
        }

        return false;
    }

    /**
     * Is Empty
     * @return {boolean}
     */
    public isEmpty(): boolean {
        return this._list.size === 0 && this._tables.length === 0 && this._enums.length === 0;
    }

    /**
     * Has entry by unid
     * @param {string} unid
     * @return {boolean}
     */
    public hasEntry(unid: string): boolean {
        return this._list.has(unid);
    }

    /**
     * Has a link object
     * @param {string} objectUnid
     * @return {boolean}
     */
    public hasLinkObject(objectUnid: string): boolean {
        for (const link of this._links) {
            if (link.getLinkObjectUnid() === objectUnid) {
                return true;
            }
        }

        return false;
    }

    /**
     * Return a link table by object unid
     * @param {string} objectUnid
     * @return {LinkTable|null}
     */
    public getLinkTableByObjectUnid(objectUnid: string): LinkTable|null {
        for (const link of this._links) {
            if (link.getLinkObjectUnid() === objectUnid) {
                return link;
            }
        }

        return null;
    }

    public search(
        pattern: string,
        path: TreeviewEntry[] = [],
        matcher: (name: string, pattern: string) => boolean = (name, pattern) =>
            name.toLowerCase().indexOf(pattern.toLowerCase()) > -1
        ): TreeviewSearchResult[] {
        const results: TreeviewSearchResult[] = [];

        // Walk tree children so the result set covers both hydrated
        // (live SchemaTable / EnumTable inside this file) and skeleton
        // (placeholder-only) entries. `_list` is the single source of
        // truth for "what schemas/enums exist below this node" — live
        // tables in `_tables` / `_enums` are always mirrored as a
        // matching tree leaf, while unhydrated files only have the
        // tree leaves.
        for (const [, entry] of this._list.entries()) {
            const t = entry.getType();

            if (t === SchemaJsonDataFSType.schema) {
                if (matcher(entry.getName(), pattern)) {
                    results.push({
                        entry: this,
                        schema: this.getTableById(entry.getUnid()),
                        enum: null,
                        unid: entry.getUnid(),
                        name: entry.getName(),
                        path: path
                    });
                }
            } else if (t === SchemaJsonDataFSType.enum) {
                if (matcher(entry.getName(), pattern)) {
                    results.push({
                        entry: this,
                        schema: null,
                        enum: this.getEnumById(entry.getUnid()),
                        unid: entry.getUnid(),
                        name: entry.getName(),
                        path: path
                    });
                }
            } else {
                results.push(...entry.search(pattern, [...path, this], matcher));
            }
        }

        return results;
    }

}
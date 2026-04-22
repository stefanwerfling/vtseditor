import {BrowserJsPlumbInstance} from '@jsplumb/browser-ui';
import {ProjectSave} from '../SchemaProject/SchemaProjectSave.js';
import {EditorInit, ProjectsData, SchemaProjectsResponse} from '../SchemaProject/SchemaProjectsResponse.js';
import {AlertDialog, AlertDialogTypes} from './Base/AlertDialog.js';
import {AutoLayout} from './Base/AutoLayout.js';
import {BaseTable} from './Base/BaseTable.js';
import {ConfirmDialog} from './Base/ConfirmDialog.js';
import {EditorEvents} from './Base/EditorEvents.js';
import {EditorIcons} from './Base/EditorIcons.js';
import {EnumTable} from './Enum/EnumTable.js';
import {JsonDataFS, JsonEditorSettings, SchemaJsonDataFS, SchemaJsonDataFSType} from './JsonData.js';
import jsPlumbInstance from './jsPlumbInstance.js';
import {LinkTable} from './Link/LinkTable.js';
import {SchemaTable} from './Schema/SchemaTable.js';
import {SchemaTypes} from './Register/SchemaTypes.js';
import {SchemaCreateDialog} from './SchemaCreateDialog.js';
import {Searchbar, SearchbarResultEntry} from './Search/Searchbar.js';
import {Treeview} from './Treeview/Treeview.js';

/**
 * SchemaEditor move event detail
 */
type SchemaEditorMoveEventDetail = {
    sourceType: string;
    destinationType: string;
    sourceId: string;
    detionationId: string;
};

/**
 * SchemaEditor update name event detail
 */
type SchemaEditorUpdatenameEventDetail = {
    sourceId: string;
    sourceType: string;
};

/**
 * SchemaEditor wiggle event detail
 */
type SchemaEditorWiggleEventDetail = {
    tableId: string;
};

/**
 * SchemaEditor invoke event detail
 */
type SchemaEditorInvokeEventDetail = {
    schema: string;
};

/**
 * Schema Editor
 */
export class SchemaEditor {

    /**
     * Container for diagram
     * @protected
     */
    protected _container: HTMLElement | null = null;

    /**
     * Controls
     * @protected
     */
    protected _controls: HTMLElement | null = null;

    /**
     * Button for add Schema
     * @protected
     */
    protected _btnAddSchema: HTMLElement | null = null;

    /**
     * Button for add enum
     * @protected
     */
    protected _btnAddEnum: HTMLElement | null = null;

    /**
     * Button for create Schema
     * @protected
     */
    protected _btnCreateSchema: HTMLElement | null = null;

    /**
     * Button for arranging tables by dependency
     * @protected
     */
    protected _btnArrangeTables: HTMLElement | null = null;

    /**
     * Searchbar
     * @protected
     */
    protected _searchbar: Searchbar | null = null;

    /**
     * Treeview
     * @protected
     */
    protected _treeview: Treeview | null = null;

    /**
     * Js Plumb instance
     * @protected
     */
    protected _jsPlumbInstance: BrowserJsPlumbInstance | null = null;

    /**
     * Editor init
     * @protected
     */
    protected _editorInit: EditorInit = {
        enable_schema_create: false
    };

    /**
     * Editor settings
     * @protected
     */
    protected _editorSettings: JsonEditorSettings = {
        controls_width: 300
    };

    /**
     * Add a new Schema
     * @protected
     */
    protected _addSchema(): void {
        if (Treeview.getActiveEntry() === null) {
            return;
        }

        const table = new SchemaTable(crypto.randomUUID(), 'NewSchema');

        Treeview.getActiveEntry()!.addSchemaTable(table);

        this._container!.appendChild(table.getElement());
        this._jsPlumbInstance!.revalidate(table.getElement());

        table.openEditDialog();
    }

    /**
     * Add a new Enum
     * @protected
     */
    protected _addEnum(): void {
        if (Treeview.getActiveEntry() === null) {
            return;
        }

        const table = new EnumTable(crypto.randomUUID(), 'NewEnum');

        Treeview.getActiveEntry()!.addEnumTable(table);

        this._container!.appendChild(table.getElement());
        this._jsPlumbInstance!.revalidate(table.getElement());

        table.openEditDialog();
    }

    /**
     * Add a new link
     * @param {string} sourceUnid id from schema or enum
     * @protected
     */
    protected _addLink(sourceUnid: string): void {
        if (Treeview.getActiveEntry() === null) {
            return;
        }

        const rootEntry = this._treeview?.getRoot();

        if (rootEntry) {
            const entry = rootEntry.findParentEntry(sourceUnid);

            if (entry) {
                let table: BaseTable|null = entry.getTableById(sourceUnid);

                if (table === null) {
                    table = entry.getEnumById(sourceUnid);
                }

                if (table !== null) {
                    const link = new LinkTable(crypto.randomUUID(), table.getUnid(), table);

                    Treeview.getActiveEntry()!.addLinkTable(link);

                    const linkElement = link.getElement();

                    if (linkElement) {
                        this._container!.appendChild(linkElement);
                        this._jsPlumbInstance!.revalidate(linkElement);

                        this._updateView();
                    }
                }
            }
        }
    }

    /**
     * create schema
     */
    public _createSchema(): void {
        if (Treeview.getActiveEntry() === null) {
            return;
        }

        const createDialog = new SchemaCreateDialog();
        createDialog.setOnConfirm((): boolean => {
            return false;
        });

        createDialog.show();
    }

    /**
     * Init
     */
    public init() {
        this._jsPlumbInstance = jsPlumbInstance;
        this._container = jsPlumbInstance.getContainer();

        const buttonBar = document.getElementById('buttonbar');

        // add schema button -------------------------------------------------------------------------------------------

        this._btnAddSchema = document.getElementById('addSchemaBtn');
        this._btnAddSchema!.style.display = 'none';
        this._btnAddSchema!.addEventListener('click', () => {
            if (Treeview.getActiveEntry() !== null) {
                this._addSchema();
            } else {
                AlertDialog.showAlert(
                    'Add schema',
                    'Please select first a File for your Schema!',
                    AlertDialogTypes.error,
                );
            }
        })

        // add enum button ---------------------------------------------------------------------------------------------

        this._btnAddEnum = document.getElementById('addEnumBtn');
        this._btnAddEnum!.style.display = 'none';
        this._btnAddEnum!.addEventListener('click', () => {
            if (Treeview.getActiveEntry() !== null) {
                this._addEnum();
            } else {
                AlertDialog.showAlert(
                    'Add enum',
                    'Please select first a File for your Enum!',
                    AlertDialogTypes.error,
                );
            }
        });

        // create schema button ----------------------------------------------------------------------------------------

        this._btnCreateSchema = document.getElementById('createSchemaBtn');
        this._btnCreateSchema!.style.display = 'none';
        this._btnCreateSchema!.addEventListener('click', () => {
            if (!this._editorInit.enable_schema_create) {
                return;
            }

            if (Treeview.getActiveEntry() !== null) {
                this._createSchema();
            } else {
                AlertDialog.showAlert(
                    'Create schema',
                    'Please select first a File for your Schema!',
                    AlertDialogTypes.error,
                );
            }
        });

        // arrange tables button ---------------------------------------------------------------------------------------

        this._btnArrangeTables = document.getElementById('arrangeTablesBtn');
        this._btnArrangeTables!.style.display = 'none';
        this._btnArrangeTables!.addEventListener('click', () => {
            const activeEntry = Treeview.getActiveEntry();

            if (activeEntry === null) {
                AlertDialog.showAlert(
                    'Arrange tables',
                    'Please select first a File with tables!',
                    AlertDialogTypes.error,
                );
                return;
            }

            if (activeEntry.isReadOnly()) {
                AlertDialog.showAlert(
                    'Arrange tables',
                    'This file is read-only — rearranging would not persist.',
                    AlertDialogTypes.warning,
                );
                return;
            }

            const schemas = activeEntry.getSchemaTables();
            const enums = activeEntry.getEnumTables();
            const links = activeEntry.getLinkTables();

            if (schemas.length === 0 && enums.length === 0 && links.length === 0) {
                AlertDialog.showAlert(
                    'Arrange tables',
                    'There are no tables to arrange in this file.',
                    AlertDialogTypes.info,
                );
                return;
            }

            AutoLayout.arrange(schemas, enums, links);

            this._jsPlumbInstance?.repaintEverything();

            window.dispatchEvent(new CustomEvent(EditorEvents.updateData, {
                detail: {
                    updateView: true
                }
            }));
        });

        // searchbar ---------------------------------------------------------------------------------------------------

        this._searchbar = new Searchbar();
        this._searchbar!.hide();
        this._searchbar.setOnSearch((search, searchbar) => {
            const rootEntry = this._treeview?.getRoot();

            if (rootEntry) {
                const results = rootEntry?.search(search);

                const items: SearchbarResultEntry[] = [];

                results?.forEach(value => {
                    let object: SchemaTable|EnumTable|null;
                    let isSchema = true;
                    let description = '';

                    object = value.schema ? value.schema : null;

                    if (object === null) {
                        isSchema = false;
                        object = value.enum ? value.enum : null;
                    } else {
                        description = object.getDescription();
                    }

                    if (object === null) {
                        return;
                    }

                    let path = '';

                    value.path.forEach(pathValue => {
                        if (path !== '') {
                            path += ` ${EditorIcons.toggle_close} `;
                        }

                        switch (pathValue.getType()) {
                            case SchemaJsonDataFSType.root:
                                path += `${EditorIcons.root}`;
                                break;

                            case SchemaJsonDataFSType.project:
                                path += `${EditorIcons.project}`;
                                break;

                            case SchemaJsonDataFSType.extern:
                                path += `${EditorIcons.registry}`;
                                break;

                            case SchemaJsonDataFSType.folder:
                                path += `${EditorIcons.folder}`;
                                break;
                        }

                        path += `${pathValue.getName()}`;
                    });

                    items.push({
                        path: path,
                        isSchema: isSchema,
                        objectId: object.getUnid(),
                        name: object ? object.getName() : 'Unknown',
                        description: description
                    });
                });

                searchbar.showResults(items);
            }
        });

        this._searchbar.setOnResultClick(entry => {
            window.dispatchEvent(new CustomEvent(EditorEvents.selectTable, {
                detail: {
                    tableId: entry.objectId
                }
            }));
        });

        buttonBar?.appendChild(this._searchbar.getElement());

        // treeview ----------------------------------------------------------------------------------------------------

        this._treeview = new Treeview();

        // listener update events --------------------------------------------------------------------------------------

        window.addEventListener(EditorEvents.updateData, (event: Event) => {
            const customEvent = event as CustomEvent<{
                updateView?: boolean,
                updateTreeView?: boolean;
            }>;

            const rootEntry = this._treeview?.getRoot();

            if (rootEntry) {
                rootEntry.sortingEntrys();
            }

            this.saveData().then(() => {
                if (customEvent.detail) {
                    if (customEvent.detail.updateTreeView === true) {
                        this._updateTreeview();
                    }

                    if (customEvent.detail.updateView === true) {
                        this._updateView();
                    }
                }
            });
        });

        // listener update view ----------------------------------------------------------------------------------------

        window.addEventListener(EditorEvents.updateView, () => {
            this._updateView();
        });

        // listener delete schema table --------------------------------------------------------------------------------

        window.addEventListener(EditorEvents.deleteSchemaTable, (event: Event) => {
            const customEvent = event as CustomEvent<{ id: string }>;
            const rootEntry = this._treeview?.getRoot();

            if (rootEntry) {
                if (rootEntry.isSchemaTableUse(customEvent.detail.id)) {
                    AlertDialog.showAlert(
                        'Delete schema',
                        'The schema is in use by another schema and cannot be deleted. If this schema is to be deleted, the connections must be deleted.',
                        AlertDialogTypes.error,
                    );
                    return;
                }

                ConfirmDialog.showConfirm('Delete schema', 'Do you really want to delete Schema?', () => {
                    if (rootEntry.removeSchemaTable(customEvent.detail.id)) {
                        rootEntry.removeEntry(customEvent.detail.id);

                        window.dispatchEvent(new CustomEvent(EditorEvents.updateData, {
                            detail: {
                                updateView: true,
                                updateTreeView: true
                            }
                        }));
                    }
                });
            }
        });

        // listener delete enum table ----------------------------------------------------------------------------------

        window.addEventListener(EditorEvents.deleteEnumTable, (event: Event) => {
            const customEvent = event as CustomEvent<{ id: string }>;
            const rootEntry = this._treeview?.getRoot();

            if (rootEntry) {
                if (rootEntry.isSchemaTableUse(customEvent.detail.id)) {
                    AlertDialog.showAlert(
                        'Delete enum',
                        'The enum is in use by another schema and cannot be deleted. If this enum is to be deleted, the connections must be deleted.',
                        AlertDialogTypes.error,
                    );
                    return;
                }

                ConfirmDialog.showConfirm('Delete enum', 'Do you really want to delete enum?', () => {
                    if (rootEntry.removeEnumTable(customEvent.detail.id)) {
                        rootEntry.removeEntry(customEvent.detail.id);

                        window.dispatchEvent(new CustomEvent(EditorEvents.updateData, {
                            detail: {
                                updateView: true,
                                updateTreeView: true
                            }
                        }));
                    }
                });
            }
        });

        // listener delete link table ----------------------------------------------------------------------------------

        window.addEventListener(EditorEvents.deleteLinkTable, (event: Event) => {
            const customEvent = event as CustomEvent<{ id: string }>;
            const activEntry = Treeview.getActiveEntry();

            if (activEntry) {
                if (activEntry.hasLinkObject(customEvent.detail.id)) {
                    ConfirmDialog.showConfirm('Delete link', 'Do you really want to delete link?', () => {
                        activEntry.removeLinkTable(customEvent.detail.id);

                        window.dispatchEvent(new CustomEvent(EditorEvents.updateData, {
                            detail: {
                                updateView: true,
                                updateTreeView: true
                            }
                        }));
                    });
                }
            }
        });

        // listener delete folder file ---------------------------------------------------------------------------------

        window.addEventListener(EditorEvents.deleteFolderFile, (event: Event) => {
            const customEvent = event as CustomEvent<{ id: string }>;
            const rootEntry = this._treeview?.getRoot();

            if (rootEntry) {
                const entry = rootEntry.getEntryById(customEvent.detail.id);

                if (entry) {
                    if (entry.getType() === SchemaJsonDataFSType.file || entry.getType() === SchemaJsonDataFSType.folder) {
                        if (entry.isEmpty()) {
                            const parentEntry = rootEntry.findParentEntry(entry.getUnid());

                            if (parentEntry) {
                                parentEntry.removeEntry(entry.getUnid());

                                window.dispatchEvent(new CustomEvent(EditorEvents.updateData, {
                                    detail: {
                                        updateView: true,
                                        updateTreeView: true
                                    }
                                }));
                            }
                        } else {
                            AlertDialog.showAlert(
                                'Delete folder/file',
                                'Folder/File is not empty, please remove all entries first.',
                                AlertDialogTypes.error,
                            );
                        }
                    }
                }
            }
        });

        // listener sort entries ---------------------------------------------------------------------------------------

        window.addEventListener(EditorEvents.sortEntries, () => {
            const rootEntry = this._treeview?.getRoot();

            if (rootEntry) {
                const activeEntryTableId = Treeview.getActivEntryTable()?.getUnid();
                const activeEntryId = Treeview.getActiveEntry()?.getUnid();

                rootEntry.sortingEntrys();
                this._updateTreeview();

                if (activeEntryTableId) {
                    const tentry = rootEntry.getEntryById(activeEntryTableId);

                    if (tentry) {
                        Treeview.setActivEntryTable(tentry);
                    }
                } else {
                    if (activeEntryId) {
                        const tentry = rootEntry.getEntryById(activeEntryId);

                        if (tentry) {
                            Treeview.setActivEntry(tentry);
                        }
                    }
                }

                this._updateView();
            }
        });

        // listener move to --------------------------------------------------------------------------------------------

        window.addEventListener(EditorEvents.moveTo, (event: Event) => {
            const customEvent = event as CustomEvent<SchemaEditorMoveEventDetail>;
            const treeview = this._treeview;

            if (treeview) {
                switch (customEvent.detail.sourceType) {
                    case SchemaJsonDataFSType.folder:
                    case SchemaJsonDataFSType.file:
                        treeview.moveToEntry(customEvent.detail.sourceId, customEvent.detail.detionationId);
                        break;

                    case SchemaJsonDataFSType.schema:
                        treeview.moveTableToEntry(customEvent.detail.sourceId, customEvent.detail.detionationId);
                        break;

                    case SchemaJsonDataFSType.enum:
                        treeview.moveEnumToEntry(customEvent.detail.sourceId, customEvent.detail.detionationId);
                        break;
                }

                window.dispatchEvent(new CustomEvent(EditorEvents.updateData, {}));
            }
        });

        // listener update name ----------------------------------------------------------------------------------------

        window.addEventListener(EditorEvents.updateName, (event: Event) => {
            const customEvent = event as CustomEvent<SchemaEditorUpdatenameEventDetail>;
            const treeview = this._treeview;

            if (treeview) {
                switch (customEvent.detail.sourceType) {
                    case SchemaJsonDataFSType.schema:
                        treeview.updateEntryNameTable(customEvent.detail.sourceId);
                        break;

                    case SchemaJsonDataFSType.enum:
                        treeview.updateEntryNameEnum(customEvent.detail.sourceId);
                        break;
                }

                this._updateView();
            }
        });

        // listener show table -----------------------------------------------------------------------------------------

        window.addEventListener(EditorEvents.showTable, (event: Event) => {
            const customEvent = event as CustomEvent<SchemaEditorWiggleEventDetail>;
            const treeview = this._treeview;

            if (treeview === null) {
                console.log(`${EditorEvents.showTable}: Error, treeview is empty!`);
                return;
            }

            const entry = treeview.getRoot().findEntry(customEvent.detail.tableId);
            const activeEntry = Treeview.getActiveEntry();

            if (activeEntry) {
                const activeEntryId = activeEntry.getUnid();

                if (entry && activeEntryId) {
                    if (entry.getUnid() === activeEntryId) {
                        const table = entry.getTableById(customEvent.detail.tableId);

                        if (table !== null) {
                            table.runWiggle();
                            return;
                        }

                        const aenum =  entry.getEnumById(customEvent.detail.tableId);

                        if (aenum !== null) {
                            aenum.runWiggle();
                            return;
                        }
                    } else if(activeEntry.hasLinkObject(customEvent.detail.tableId)) {
                        const link = activeEntry.getLinkTableByObjectUnid(customEvent.detail.tableId);

                        if (link) {
                            link.getLinkObject()?.runWiggle();
                        }
                    } else {
                        ConfirmDialog.showConfirm(
                            'Add link',
                            'Do you want to add a link object to see the source schema/enum?',
                            () => {
                                this._addLink(customEvent.detail.tableId);
                            },
                            AlertDialogTypes.info
                        );
                    }
                }
            }
        });

        // listener select table ---------------------------------------------------------------------------------------

        window.addEventListener(EditorEvents.selectTable, (event: Event) => {
            const customEvent = event as CustomEvent<SchemaEditorWiggleEventDetail>;
            const treeview = this._treeview;

            if (treeview === null) {
                console.log(`${EditorEvents.selectTable}: Error, treeview is empty!`);
                return;
            }

            const entry = treeview.getRoot().findEntry(customEvent.detail.tableId);

            if (entry === null) {
                AlertDialog.showAlert(
                    'Search',
                    'Selected schema/enum not found in tree!',
                    AlertDialogTypes.error,
                );
                return;
            }

            const tableEntry = entry.getEntryById(customEvent.detail.tableId);

            if (tableEntry === null) {
                AlertDialog.showAlert(
                    'Search',
                    'Selected schema/enum not found in tree!',
                    AlertDialogTypes.error,
                );
                return;
            }

            if (tableEntry.getType() === SchemaJsonDataFSType.enum || tableEntry.getType() === SchemaJsonDataFSType.schema) {
                Treeview.setActivEntry(null);
                Treeview.setActivEntryTable(tableEntry);

                window.dispatchEvent(new CustomEvent(EditorEvents.updateView, {}));
            }
        });

        // listener invoke schema --------------------------------------------------------------------------------------

        window.addEventListener(EditorEvents.invokeSchema, (event: Event) => {
            const customEvent = event as CustomEvent<SchemaEditorInvokeEventDetail>;
            const schemaName = customEvent.detail.schema;

            this._selectSchemaByName(schemaName);
        });

        // resizer -----------------------------------------------------------------------------------------------------

        const resizer = document.getElementById('resizer')!;
        const resizerTop = document.getElementById('resizer-topbar')!;
        this._controls = document.getElementById('controls')!;

        let isResizing = false;

        resizerTop.addEventListener('mousedown', () => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
        });

        resizer.addEventListener('mousedown', () => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) {
                return;
            }

            const newWidth = e.clientX;

            if (newWidth > 150 && newWidth < window.innerWidth - 100) {
                this._editorSettings.controls_width = newWidth;
                this._updateResizer();
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                this.saveEditorSettings().then();
            }

            isResizing = false;
            document.body.style.cursor = 'default';
        });

        // load data ---------------------------------------------------------------------------------------------------

        this.loadData().then();
    }

    /**
     * Update resizer
     * @protected
     */
    protected _updateResizer(): void {
        if (this._controls) {
            const topbarheader = document.getElementById('topbarheader')!;

            this._controls.style.width = `${this._editorSettings.controls_width}px`;
            topbarheader.style.width = `${this._editorSettings.controls_width}px`;
        }
    }

    /**
     * Update view
     * @protected
     */
    protected _updateView(): void {
        if (this._jsPlumbInstance && this._container) {
            this._jsPlumbInstance.deleteEveryConnection();
            this._container.innerHTML = '';
        }

        this._treeview?.removeAllActiveName();

        const rootEntry = this._treeview?.getRoot();
        const entryTable = Treeview.getActivEntryTable();
        let entry = Treeview.getActiveEntry();

        if (entry !== null) {
            const entryId = entry.getUnid();

            if (rootEntry) {
                const pentry = rootEntry.findEntry(entryId);

                if (pentry) {
                    const tentry = pentry.getEntryById(entryId);

                    if (tentry) {
                        entry = tentry;
                        Treeview.setActivEntry(entry);
                    }
                }
            }
        }

        if (entryTable !== null) {
            if (rootEntry) {
                const tentry = rootEntry.findEntry(entryTable.getUnid());

                if (tentry) {
                    entry = tentry;
                    Treeview.setActivEntry(entry);
                }
            }
        }

        // -------------------------------------------------------------------------------------------------------------

        if (entry) {
            this._btnAddSchema!.style.display = '';
            this._btnAddEnum!.style.display = '';
            this._btnArrangeTables!.style.display = '';
            this._searchbar!.show();

            if (this._editorInit.enable_schema_create) {
                this._btnCreateSchema!.style.display = '';
            }

            // Schemas -------------------------------------------------------------------------------------------------
            const sTables = entry.getSchemaTables();

            for (const table of sTables) {
                this._container!.appendChild(table.getElement());

                requestAnimationFrame(() => {
                    this._jsPlumbInstance!.revalidate(table.getElement());
                });
            }

            // Enums ---------------------------------------------------------------------------------------------------
            const sEnums = entry.getEnumTables();

            for (const tenum of sEnums) {
                this._container!.appendChild(tenum.getElement());

                requestAnimationFrame(() => {
                    this._jsPlumbInstance!.revalidate(tenum.getElement());
                });
            }

            // links ---------------------------------------------------------------------------------------------------

            const links = entry.getLinkTables();

            for (const link of links) {
                if (link.getLinkObject() === null) {
                    const parentEntry = rootEntry?.findParentEntry(link.getLinkUnid());

                    if (parentEntry) {
                        let aTable: BaseTable|null = parentEntry.getTableById(link.getLinkUnid());

                        if (aTable === null) {
                            aTable = parentEntry.getEnumById(link.getLinkUnid());
                        }

                        if (aTable) {
                            link.setLinkObject(aTable);
                        }
                    }
                }

                // readd to container
                const linkElement = link.getElement();

                if (linkElement) {
                    this._container!.appendChild(linkElement);

                    requestAnimationFrame(() => {
                        this._jsPlumbInstance!.revalidate(linkElement);
                    });
                }
            }

            this._jsPlumbInstance!.repaintEverything();

            // updates view --------------------------------------------------------------------------------------------
            for (const tenum of sEnums) {
                tenum.updateView();

                if (entryTable) {
                    if (tenum.getUnid() === entryTable.getUnid()) {
                        tenum.setActivView(true);
                    } else {
                        tenum.setActivView(false);
                    }
                }
            }

            for (const link of links) {
                link.updateView();
            }

            for (const table of sTables) {
                table.showDropArea(false);
                table.updateView();

                if (entryTable) {
                    if (table.getUnid() === entryTable.getUnid()) {
                        table.setActivView(true);
                    } else {
                        table.setActivView(false);
                    }
                }
            }

            entry.setActiveName();
        }

        if (entryTable) {
            entryTable.setActiveName();
        }

        this._updateResizer();
    }

    /**
     * Update tree view
     */
    public _updateTreeview(): void {
        const data = this.getData();
        this._treeview?.getRoot().removeEntrys();
        this.setData(data);
    }

    /**
     * Return the data
     * @return {JsonData}
     */
    public getData(): ProjectsData {
        const data: ProjectsData = {
            projects: [],
            extern: [],
            editor: this._editorSettings
        };

        if (this._treeview) {
            const treeviewData = this._treeview.getData();

            if (treeviewData.type === SchemaJsonDataFSType.root) {
                const entrys = treeviewData.entrys;

                for (const aEntry of entrys) {
                    if (SchemaJsonDataFS.validate(aEntry, [])) {
                        if (aEntry.type === SchemaJsonDataFSType.project) {
                            data.projects.push({
                                unid: aEntry.unid,
                                name: aEntry.name,
                                fs: {
                                    unid: 'root',
                                    name: 'root',
                                    istoggle: true,
                                    icon: 'root',
                                    type: SchemaJsonDataFSType.root,
                                    entrys: aEntry.entrys,
                                    schemas: [],
                                    enums: []
                                }
                            });
                        } else if (aEntry.type === SchemaJsonDataFSType.extern) {
                            data.extern.push({
                                unid: aEntry.unid,
                                name: aEntry.name,
                                fs: {
                                    unid: 'root',
                                    name: 'root',
                                    istoggle: true,
                                    icon: 'root',
                                    type: SchemaJsonDataFSType.root,
                                    entrys: aEntry.entrys,
                                    schemas: [],
                                    enums: []
                                }
                            });
                        }
                    }
                }
            }
        }

        return data;
    }

    /**
     * Update registers
     * @param {JsonDataFS} data
     * @protected
     */
    protected _updateRegisters(data: JsonDataFS): void {
        for (const aenum of data.enums) {
            SchemaTypes.getInstance().setEnumType(aenum.unid, aenum.name);
        }

        for (const schema of data.schemas) {
            SchemaTypes.getInstance().setType(schema.unid, schema.name);
        }

        for (const entry of data.entrys) {
            if (SchemaJsonDataFS.validate(entry, [])) {
                this._updateRegisters(entry);
            }
        }
    }

    /**
     * Set data
     * @param {ProjectsResponse} data
     */
    public setData(data: ProjectsData): void {
        const rootEntry: JsonDataFS = {
            unid: 'root',
            name: 'Root',
            istoggle: true,
            icon: 'root',
            type: SchemaJsonDataFSType.root,
            entrys: [],
            schemas: [],
            enums: []
        };

        for (const project of data.projects) {
            const projectEntry: JsonDataFS = {
                unid: project.unid,
                name: project.name,
                istoggle: true,
                icon: 'project',
                type: SchemaJsonDataFSType.project,
                entrys: project.fs.entrys,
                schemas: [],
                enums: []
            };

            rootEntry.entrys.push(projectEntry);
        }

        for (const extern of data.extern) {
            const externEntry: JsonDataFS = {
                unid: extern.unid,
                name: extern.name,
                istoggle: true,
                icon: 'extern',
                type: SchemaJsonDataFSType.extern,
                entrys: extern.fs.entrys,
                schemas: [],
                enums: []
            };

            rootEntry.entrys.push(externEntry);
        }

        this._updateRegisters(rootEntry);
        this._treeview?.setData(rootEntry);

        if (data.editor) {
            this._editorSettings = data.editor;
            this._updateResizer();
        }

        if (data.init) {
            this._editorInit = data.init;
        }

        this._treeview?.getRoot().updateView(true);
    }

    /**
     * Save data to vite server
     */
    public async saveData(): Promise<void> {
        const save: ProjectSave = {
            data: this.getData()
        };

        await fetch('/api/save-schema', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(save)
        });
    }

    /**
     * save editor settings
     */
    public async saveEditorSettings(): Promise<void> {
        await fetch('/api/save-editor-setting', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(this._editorSettings)
        });
    }

    /**
     * Load data by vite server
     */
    public async loadData(): Promise<void> {
        const response = await fetch('/api/load-schema');

        if (!response.ok) {
            throw new Error(`Can not load: ${response.statusText}`);
        }

        const projectResponse = await response.json();

        if (SchemaProjectsResponse.validate(projectResponse, [])) {
            this.setData(projectResponse.data);
            this._selectSchemaFromUrl();
        } else {
            AlertDialog.showAlert(
                'Load data',
                'Schema response format is broken!',
                AlertDialogTypes.error,
            );
        }
    }

    private _selectSchemaFromUrl(): void {
        const params = new URLSearchParams(window.location.search);
        const search = params.get('schema');

        if (!search) {
            return;
        }

        this._selectSchemaByName(search);
    }

    private _selectSchemaByName(search: string): void {
        this._updateTopbarHeader(search);

        const rootEntry = this._treeview?.getRoot();

        if (!rootEntry) {
            return;
        }

        const results = rootEntry.search(search);

        if (!results || results.length === 0) {
            console.warn(`Schema "${search}" not found`);
            return;
        }

        let match = results.find(r => {
            const obj = r.schema ?? r.enum;
            return obj?.getName() === search;
        });

        if (!match) {
            match = results[0];
        }

        const object = match.schema ?? match.enum;

        if (!object) {
            return;
        }

        // Event dispatchen
        window.dispatchEvent(new CustomEvent(EditorEvents.selectTable, {
            detail: {
                tableId: object.getUnid()
            }
        }));
    }

    private _updateTopbarHeader(schemaName: string | null): void {
        const schemaEl = document.getElementById('topbar-schema');

        if (!schemaEl) {
            return;
        }

        if (!schemaName) {
            schemaEl.textContent = '';
            return;
        }

        schemaEl.textContent = `Schema: ${schemaName}`;
    }
}
import {BrowserJsPlumbInstance} from '@jsplumb/browser-ui';
import {EditorInit, ProjectsData, SchemaProjectsResponse} from '../SchemaProject/SchemaProjectsResponse.js';
import {SchemaRepositoryEvent} from '../SchemaRepository/SchemaRepositoryEventTypes.js';
import {SchemaApiClient, SchemaApiError} from './Api/SchemaApiClient.js';
import {SchemaEditorApiCall, SchemaEditorUpdateDataDetail} from './Api/SchemaEditorApiCall.js';
import {SchemaMcpApprovalClient} from './Api/SchemaMcpApprovalClient.js';
import {SchemaSseClient} from './Api/SchemaSseClient.js';
import {AlertDialog, AlertDialogTypes} from './Base/AlertDialog.js';
import {AutoLayout} from './Base/AutoLayout.js';
import {BaseTable} from './Base/BaseTable.js';
import {ConfirmDialog} from './Base/ConfirmDialog.js';
import {McpApprovalDialog} from './Base/McpApprovalDialog.js';
import {EditorEvents} from './Base/EditorEvents.js';
import {highlightRemoteNew} from './Base/RemoteNewHighlight.js';
import {EnumTable} from './Enum/EnumTable.js';
import {JsonDataFS, JsonEditorSettings, SchemaJsonDataFS, SchemaJsonDataFSType} from './JsonData.js';
import jsPlumbInstance from './jsPlumbInstance.js';
import {LinkTable} from './Link/LinkTable.js';
import {SchemaTable} from './Schema/SchemaTable.js';
import {SchemaTypes} from './Register/SchemaTypes.js';
import {SchemaCreateDialog} from './SchemaCreateDialog.js';
import {SchemaValidateDialog} from './Schema/SchemaValidateDialog.js';
import {Searchbar, SearchbarResultEntry} from './Search/Searchbar.js';
import {Treeview} from './Treeview/Treeview.js';
import {TreeviewEntry} from './Treeview/TreeviewEntry.js';
import {WelcomePanel} from './Welcome/WelcomePanel.js';

/**
 * SchemaEditor move event detail
 */
type SchemaEditorMoveEventDetail = {
    sourceType: string;
    destinationType: string;
    sourceId: string;
    destinationId: string;
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
 * SchemaEditor validate event detail. Fired by external integrators
 * (e.g. the JetBrains plugin) to open the Validate-JSON dialog for a
 * named schema with a JSON payload pre-filled and auto-validated.
 */
type SchemaEditorValidateEventDetail = {
    schema: string;
    json: string;
    isArray?: boolean;
};

export type {SchemaEditorApiCall, SchemaEditorUpdateDataDetail} from './Api/SchemaEditorApiCall.js';

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
     * Stable clientId for this session. Every mutation goes out with this
     * in `X-Client-Id`; the SSE handler uses it to recognize our own echoes.
     * @protected
     */
    protected _clientId: string = crypto.randomUUID();

    /**
     * One client per loaded project. Populated in {@link setData}.
     * @protected
     */
    protected _clients: Map<string, SchemaApiClient> = new Map();

    /**
     * One live SSE stream per loaded project. Remote mutations (other tabs,
     * MCP) trigger a debounced reload via {@link _scheduleRemoteResync}.
     * @protected
     */
    protected _sseClients: Map<string, SchemaSseClient> = new Map();

    /**
     * MCP tool-call approval client. Pops up a confirmation dialog for
     * any tool call the server-side policy flags as `ask`. Active only
     * when `mcp.enabled` in `vtseditor.json`; otherwise stops itself
     * silently on the first connection error.
     * @protected
     */
    protected _mcpApprovalClient: SchemaMcpApprovalClient|null = null;

    /**
     * Open approval dialogs indexed by requestId so a server-side
     * resolution (timeout, other tab) can dismiss them.
     * @protected
     */
    protected _mcpApprovalDialogs: Map<string, McpApprovalDialog> = new Map();

    /**
     * Welcome / "what's new" panel shown in the canvas when no schema
     * or enum entry is active. Built once in {@link init} and
     * re-attached on demand by {@link _updateView}; fetches the
     * CHANGELOG and product info exactly once.
     * @protected
     */
    protected _welcomePanel: WelcomePanel|null = null;

    /**
     * Cooldown timer for `loadData()` triggered by SSE events. See
     * {@link _scheduleRemoteResync} for the leading-edge throttle
     * semantics.
     * @protected
     */
    protected _resyncTimer: ReturnType<typeof setTimeout>|null = null;

    /**
     * Debounce timer for persisting the active-selection change back to
     * editor_settings. Clicking a schema can trigger two updates in a row
     * (e.g. `setActivEntry(null)` + `setActivEntryTable(entry)`); coalesce
     * them into one save.
     * @protected
     */
    protected _selectionPersistTimer: ReturnType<typeof setTimeout>|null = null;

    /**
     * True while the editor programmatically restores selection from
     * editor_settings on load. Suppresses the save-back path so a fresh
     * load never writes the same values it just read.
     * @protected
     */
    protected _restoringSelection: boolean = false;

    /**
     * Unids of schemas / enums / links that were created, updated,
     * moved, or even deleted by a remote mutation (MCP or another
     * browser tab) since the last resync. After `loadData()` rebuilds
     * the view, the active entry is switched to the owning file (if
     * needed) and the matching canvas element gets a short pulse plus
     * a centred scroll so the user sees where the change landed. The
     * set tracks "touched" unids, not only newly-created ones.
     * Cleared after the flash is applied.
     * @protected
     */
    protected _pendingRemoteTouched: Set<string> = new Set();

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
                    const activeEntry = Treeview.getActiveEntry()!;
                    const link = new LinkTable(crypto.randomUUID(), table.getUnid(), table);

                    activeEntry.addLinkTable(link);

                    const linkElement = link.getElement();

                    if (linkElement) {
                        this._container!.appendChild(linkElement);
                        this._jsPlumbInstance!.revalidate(linkElement);

                        window.dispatchEvent(new CustomEvent<SchemaEditorUpdateDataDetail>(EditorEvents.updateData, {
                            detail: {
                                updateView: true,
                                apiCall: {
                                    op: 'link_create',
                                    containerUnid: activeEntry.getUnid(),
                                    link_unid: table.getUnid(),
                                    unid: link.getUnid()
                                }
                            }
                        }));
                    }
                }
            }
        }
    }

    /**
     * create schema
     * @protected
     */
    protected _createSchema(): void {
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
    /**
     * Active editor instance. `main.ts` creates a single `SchemaEditor` and
     * calls `init()`; the last one to do so wins. Dialogs (e.g.
     * `SchemaCreateDialog`) that need to call batched API ops reach the
     * client registry through this handle.
     */
    protected static _active: SchemaEditor|null = null;

    public static getActive(): SchemaEditor|null {
        return SchemaEditor._active;
    }

    /**
     * Fetch a required DOM element by id or throw a descriptive error.
     * The editor's init path hard-depends on these elements; failing
     * loudly with the missing id beats a cryptic TypeError on `.style`
     * ten lines later.
     * @protected
     */
    protected static _requireElement(id: string): HTMLElement {
        const el = document.getElementById(id);

        if (el === null) {
            throw new Error(`SchemaEditor: required element #${id} not found in DOM`);
        }

        return el;
    }

    public init() {
        SchemaEditor._active = this;
        this._jsPlumbInstance = jsPlumbInstance;
        this._container = jsPlumbInstance.getContainer();

        this._startMcpApprovalClient();

        // Welcome panel — built up front so the first render of the
        // empty canvas already has content; the fetch runs in the
        // background and fills the changelog area once it returns.
        this._welcomePanel = new WelcomePanel();
        this._welcomePanel.load();

        const buttonBar = SchemaEditor._requireElement('buttonbar');

        // add schema button -------------------------------------------------------------------------------------------

        this._btnAddSchema = SchemaEditor._requireElement('addSchemaBtn');
        this._btnAddSchema.style.display = 'none';
        this._btnAddSchema.addEventListener('click', () => {
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

        this._btnAddEnum = SchemaEditor._requireElement('addEnumBtn');
        this._btnAddEnum.style.display = 'none';
        this._btnAddEnum.addEventListener('click', () => {
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

        this._btnCreateSchema = SchemaEditor._requireElement('createSchemaBtn');
        this._btnCreateSchema.style.display = 'none';
        this._btnCreateSchema.addEventListener('click', () => {
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

        this._btnArrangeTables = SchemaEditor._requireElement('arrangeTablesBtn');
        this._btnArrangeTables.style.display = 'none';
        this._btnArrangeTables.addEventListener('click', () => {
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

            const ops: SchemaEditorApiCall[] = [];

            for (const schema of schemas) {
                ops.push({
                    op: 'schema_update',
                    unid: schema.getUnid(),
                    patch: {pos: schema.getPosition()}
                });
            }

            for (const enumeration of enums) {
                ops.push({
                    op: 'enum_update',
                    unid: enumeration.getUnid(),
                    patch: {pos: enumeration.getPosition()}
                });
            }

            for (const link of links) {
                ops.push({
                    op: 'link_update',
                    unid: link.getUnid(),
                    patch: {pos: link.getPosition()}
                });
            }

            const client = this.getEditorClient();

            if (client !== null && ops.length > 0) {
                client.batch(ops).then(() => {
                    this._updateView();
                }).catch((err) => {
                    this._handleApiError(err, 'Arrange tables');
                });
            } else {
                this._updateView();
            }
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

                    // Path segments (ancestors + owning file entry). Searchbar
                    // uses these to group results into a folder tree instead
                    // of showing a breadcrumb on each row.
                    const pathSegments = value.path.map(p => ({
                        name: p.getName(),
                        type: p.getType()
                    }));

                    if (value.entry) {
                        pathSegments.push({
                            name: value.entry.getName(),
                            type: value.entry.getType()
                        });
                    }

                    items.push({
                        pathSegments,
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
            const customEvent = event as CustomEvent<SchemaEditorUpdateDataDetail|undefined>;
            const detail = customEvent.detail;

            const rootEntry = this._treeview?.getRoot();

            if (rootEntry) {
                rootEntry.sortingEntrys();
            }

            const persist = detail?.apiCall
                ? this.dispatchApiCall(detail.apiCall)
                : Promise.resolve();

            persist
                .catch((err) => {
                    this._handleApiError(err, 'Save');
                })
                .finally(() => {
                    if (detail?.updateTreeView === true) {
                        this._updateTreeview();
                    }

                    if (detail?.updateView === true) {
                        this._updateView();
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

                        window.dispatchEvent(new CustomEvent<SchemaEditorUpdateDataDetail>(EditorEvents.updateData, {
                            detail: {
                                updateView: true,
                                updateTreeView: true,
                                apiCall: {op: 'schema_delete', unid: customEvent.detail.id}
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

                        window.dispatchEvent(new CustomEvent<SchemaEditorUpdateDataDetail>(EditorEvents.updateData, {
                            detail: {
                                updateView: true,
                                updateTreeView: true,
                                apiCall: {op: 'enum_delete', unid: customEvent.detail.id}
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

                        window.dispatchEvent(new CustomEvent<SchemaEditorUpdateDataDetail>(EditorEvents.updateData, {
                            detail: {
                                updateView: true,
                                updateTreeView: true,
                                apiCall: {op: 'link_delete', unid: customEvent.detail.id}
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

                                window.dispatchEvent(new CustomEvent<SchemaEditorUpdateDataDetail>(EditorEvents.updateData, {
                                    detail: {
                                        updateView: true,
                                        updateTreeView: true,
                                        apiCall: {op: 'container_delete', unid: entry.getUnid()}
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
                let apiCall: SchemaEditorApiCall|undefined;

                switch (customEvent.detail.sourceType) {
                    case SchemaJsonDataFSType.folder:
                    case SchemaJsonDataFSType.file:
                        treeview.moveToEntry(customEvent.detail.sourceId, customEvent.detail.destinationId);
                        apiCall = {
                            op: 'container_move',
                            unid: customEvent.detail.sourceId,
                            toParentUnid: customEvent.detail.destinationId
                        };
                        break;

                    case SchemaJsonDataFSType.schema:
                        treeview.moveTableToEntry(customEvent.detail.sourceId, customEvent.detail.destinationId);
                        apiCall = {
                            op: 'schema_move',
                            unid: customEvent.detail.sourceId,
                            toContainerUnid: customEvent.detail.destinationId
                        };
                        break;

                    case SchemaJsonDataFSType.enum:
                        treeview.moveEnumToEntry(customEvent.detail.sourceId, customEvent.detail.destinationId);
                        apiCall = {
                            op: 'enum_move',
                            unid: customEvent.detail.sourceId,
                            toContainerUnid: customEvent.detail.destinationId
                        };
                        break;
                }

                window.dispatchEvent(new CustomEvent<SchemaEditorUpdateDataDetail>(EditorEvents.updateData, {
                    detail: apiCall ? {apiCall} : {}
                }));
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

        // listener validate schema (external trigger, e.g. JetBrains plugin) --------------------------------------------

        window.addEventListener(EditorEvents.validateSchema, (event: Event) => {
            const customEvent = event as CustomEvent<SchemaEditorValidateEventDetail>;
            const schemaName = customEvent.detail.schema;
            const jsonString = customEvent.detail.json;
            const isArray = customEvent.detail.isArray === true;

            const rootEntry = this._treeview?.getRoot();

            if (!rootEntry) {
                console.warn(`${EditorEvents.validateSchema}: treeview not ready`);
                return;
            }

            const results = rootEntry.search(schemaName);

            if (!results || results.length === 0) {
                AlertDialog.showAlert(
                    'Validate JSON',
                    `Schema "${schemaName}" not found.`,
                    AlertDialogTypes.error
                );
                return;
            }

            // Prefer an exact-name match; fall back to the first result (same
            // rule as _selectSchemaByName).
            let match = results.find(r => {
                const obj = r.schema ?? r.enum;
                return obj?.getName() === schemaName;
            });

            if (!match) {
                match = results[0];
            }

            const target = match.schema ?? match.enum;

            if (!target) {
                AlertDialog.showAlert(
                    'Validate JSON',
                    `Schema "${schemaName}" not resolvable.`,
                    AlertDialogTypes.error
                );
                return;
            }

            const dialog = new SchemaValidateDialog(target.getUnid(), target.getName());
            dialog.show();
            dialog.validateNow(jsonString, isArray);
        });

        // listener selection changed ---------------------------------------------------------------------------------
        // Persist the active entry / active entry table so the next reload
        // opens the same view. Debounced so a paired setActivEntry(null) +
        // setActivEntryTable(entry) coalesces into one save.

        window.addEventListener(EditorEvents.selectionChanged, () => {
            if (this._restoringSelection) {
                return;
            }

            if (this._selectionPersistTimer !== null) {
                clearTimeout(this._selectionPersistTimer);
            }

            this._selectionPersistTimer = setTimeout(() => {
                this._selectionPersistTimer = null;

                const entry = Treeview.getActiveEntry();
                const entryTable = Treeview.getActivEntryTable();

                this._editorSettings.active_entry_unid = entry?.getUnid();
                this._editorSettings.active_entry_table_unid = entryTable?.getUnid();

                this.saveEditorSettings().catch((err) => {
                    console.warn('persist selection failed', err);
                });
            }, 50);
        });

        // resizer -----------------------------------------------------------------------------------------------------

        const resizer = SchemaEditor._requireElement('resizer');
        const resizerTop = SchemaEditor._requireElement('resizer-topbar');
        this._controls = SchemaEditor._requireElement('controls');

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
            const topbarheader = SchemaEditor._requireElement('topbarheader');

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
                // Apply deferred fields now that the element is attached so
                // width is measured against the live flex container, not
                // the detached intrinsic size.
                table.flushPendingData();

                requestAnimationFrame(() => {
                    this._jsPlumbInstance!.revalidate(table.getElement());
                });
            }

            // Enums ---------------------------------------------------------------------------------------------------
            const sEnums = entry.getEnumTables();

            for (const tenum of sEnums) {
                this._container!.appendChild(tenum.getElement());
                tenum.flushPendingData();

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
        } else if (this._welcomePanel !== null && this._container !== null) {
            // No active entry → show the welcome / what's-new panel
            // and hide the toolbar buttons that operate on an entry.
            this._container.appendChild(this._welcomePanel.getElement());

            this._btnAddSchema?.style.setProperty('display', 'none');
            this._btnAddEnum?.style.setProperty('display', 'none');
            this._btnArrangeTables?.style.setProperty('display', 'none');
            this._btnCreateSchema?.style.setProperty('display', 'none');
            this._searchbar?.hide();
        }

        if (entryTable) {
            entryTable.setActiveName();
        }

        this._updateResizer();
        this._flushRemoteTouchedHighlights();
    }

    /**
     * After a remote-mutation resync has rebuilt the view, pulse every
     * canvas-visible schema / enum / link whose unid was collected by
     * {@link _trackRemoteTouched} and scroll the canvas so the most recent
     * one is centred. {@link _resolveRemoteJumpTarget} has already
     * switched the active entry to the owning file when necessary, so
     * items outside the active entry here are genuinely stale (e.g. a
     * container_create whose folder has no canvas element) and are
     * dropped silently.
     * @protected
     */
    protected _flushRemoteTouchedHighlights(): void {
        if (this._pendingRemoteTouched.size === 0) {
            return;
        }

        const entry = Treeview.getActiveEntry();
        let lastElement: HTMLElement|null = null;

        if (entry !== null) {
            for (const table of entry.getSchemaTables()) {
                if (this._pendingRemoteTouched.has(table.getUnid())) {
                    const el = table.getElement();
                    highlightRemoteNew(el);
                    lastElement = el;
                }
            }

            for (const tenum of entry.getEnumTables()) {
                if (this._pendingRemoteTouched.has(tenum.getUnid())) {
                    const el = tenum.getElement();
                    highlightRemoteNew(el);
                    lastElement = el;
                }
            }

            for (const link of entry.getLinkTables()) {
                if (!this._pendingRemoteTouched.has(link.getUnid())) {
                    continue;
                }

                const linkEl = link.getElement();

                if (linkEl) {
                    highlightRemoteNew(linkEl);
                    lastElement = linkEl;
                }
            }
        }

        this._pendingRemoteTouched.clear();

        if (lastElement !== null) {
            const target = lastElement;
            // Defer one frame so the just-appended tables have been
            // measured and jsPlumb has applied its positions — scroll
            // math uses getBoundingClientRect on both.
            requestAnimationFrame(() => this._scrollCanvasToElement(target));
        }
    }

    /**
     * Resolve the schema / enum entry a pending remote mutation points
     * at. Insertion order matters: the last unid still resolvable to a
     * schema or enum wins, so a burst of MCP ops lands on whichever
     * item was touched most recently. Container / link unids are
     * skipped — they're tracked for the highlight pass but aren't
     * meaningful jump targets for the treeview.
     * @protected
     */
    protected _resolveRemoteJumpTarget(): TreeviewEntry|null {
        if (this._pendingRemoteTouched.size === 0) {
            return null;
        }

        const rootEntry = this._treeview?.getRoot();

        if (!rootEntry) {
            return null;
        }

        let chosen: TreeviewEntry|null = null;

        for (const unid of this._pendingRemoteTouched) {
            const entry = rootEntry.getEntryById(unid);

            if (entry === null) {
                continue;
            }

            const type = entry.getType();

            if (type === SchemaJsonDataFSType.schema || type === SchemaJsonDataFSType.enum) {
                chosen = entry;
            }
        }

        return chosen;
    }

    /**
     * Centre the given canvas element in the schemagrid viewport. Uses
     * `scrollTo` on the grid directly (not `scrollIntoView`) so only the
     * canvas scrolls — the surrounding editor layout stays put.
     * @protected
     */
    protected _scrollCanvasToElement(element: HTMLElement): void {
        const grid = this._container;

        if (!grid) {
            return;
        }

        const gridRect = grid.getBoundingClientRect();
        const elRect = element.getBoundingClientRect();

        const targetLeft = grid.scrollLeft + (elRect.left - gridRect.left) - (gridRect.width - elRect.width) / 2;
        const targetTop = grid.scrollTop + (elRect.top - gridRect.top) - (gridRect.height - elRect.height) / 2;

        grid.scrollTo({
            left: Math.max(0, targetLeft),
            top: Math.max(0, targetTop),
            behavior: 'smooth'
        });
    }

    /**
     * Update tree view
     * @protected
     */
    protected _updateTreeview(): void {
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
        this._resetClients(data.projects.map((p) => p.unid));

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

        this._restoreActiveSelection();
    }

    /**
     * Apply the persisted active-entry / active-entry-table from
     * editor_settings. The table id takes precedence — it's what the
     * user sees highlighted. Falls back to the containing folder/file
     * entry if no table was selected.
     * @protected
     */
    protected _restoreActiveSelection(): void {
        const rootEntry = this._treeview?.getRoot();

        if (!rootEntry) {
            return;
        }

        // A pending remote mutation (MCP / other tab) wins over the
        // persisted selection — we want the user to see what just
        // changed, not whatever they last looked at. _restoringSelection
        // stays false here so the override is persisted as the new
        // selection through the normal selectionChanged path.
        const remoteTarget = this._resolveRemoteJumpTarget();

        if (remoteTarget) {
            Treeview.setActivEntry(null);
            Treeview.setActivEntryTable(remoteTarget);
            window.dispatchEvent(new CustomEvent(EditorEvents.updateView, {}));
            return;
        }

        this._restoringSelection = true;

        try {
            const tableUnid = this._editorSettings.active_entry_table_unid;
            const entryUnid = this._editorSettings.active_entry_unid;

            if (tableUnid) {
                const tableEntry = rootEntry.getEntryById(tableUnid);

                if (tableEntry) {
                    Treeview.setActivEntry(null);
                    Treeview.setActivEntryTable(tableEntry);
                    return;
                }
            }

            if (entryUnid) {
                const entry = rootEntry.getEntryById(entryUnid);

                if (entry) {
                    Treeview.setActivEntryTable(null);
                    Treeview.setActivEntry(entry);
                    return;
                }
            }

            // Neither persisted uid resolved (fresh install, stale
            // uids, or cleared settings) — clear any lingering
            // selection so the welcome panel renders on first paint.
            Treeview.setActivEntryTable(null);
            Treeview.setActivEntry(null);
        } finally {
            this._restoringSelection = false;

            // Always fire updateView so _updateView runs exactly once
            // at the end of the restore — either painting the
            // restored selection or falling through to the welcome
            // panel when nothing was persisted.
            window.dispatchEvent(new CustomEvent(EditorEvents.updateView, {}));
        }
    }

    /**
     * Dispatch a granular mutation to the project's API client. Consumed
     * by the `EditorEvents.updateData` listener when `detail.apiCall` is
     * set.
     */
    public async dispatchApiCall(call: SchemaEditorApiCall): Promise<void> {
        const client = this.getEditorClient();

        if (client === null) {
            throw new Error('No active project client');
        }

        switch (call.op) {
            // Containers -----------------------------------------------------
            case 'container_create':
                await client.createContainer({
                    parentUnid: call.parentUnid,
                    name: call.name,
                    type: call.type,
                    icon: call.icon,
                    unid: call.unid
                });
                return;

            case 'container_update':
                await client.updateContainer(call.unid, call.patch);
                return;

            case 'container_delete':
                await client.deleteContainer(call.unid);
                return;

            case 'container_move':
                await client.moveContainer(call.unid, {
                    toParentUnid: call.toParentUnid,
                    index: call.index
                });
                return;

            // Schemas --------------------------------------------------------
            case 'schema_create':
                await client.createSchema({
                    containerUnid: call.containerUnid,
                    name: call.name,
                    description: call.description,
                    extend: call.extend,
                    pos: call.pos,
                    unid: call.unid
                });
                return;

            case 'schema_update':
                await client.updateSchema(call.unid, call.patch);
                return;

            case 'schema_delete':
                await client.deleteSchema(call.unid);
                return;

            case 'schema_move':
                await client.moveSchema(call.unid, {toContainerUnid: call.toContainerUnid});
                return;

            // Fields ---------------------------------------------------------
            case 'field_create':
                await client.createField(call.schemaUnid, {
                    name: call.name,
                    type: call.type,
                    optional: call.optional,
                    array: call.array,
                    types: call.types,
                    description: call.description,
                    index: call.index,
                    unid: call.unid
                });
                return;

            case 'field_update':
                await client.updateField(call.schemaUnid, call.fieldUnid, call.patch);
                return;

            case 'field_delete':
                await client.deleteField(call.schemaUnid, call.fieldUnid);
                return;

            case 'field_reorder':
                await client.reorderFields(call.schemaUnid, call.order);
                return;

            // Enums ----------------------------------------------------------
            case 'enum_update':
                await client.updateEnum(call.unid, call.patch);
                return;

            case 'enum_delete':
                await client.deleteEnum(call.unid);
                return;

            case 'enum_move':
                await client.moveEnum(call.unid, {toContainerUnid: call.toContainerUnid});
                return;

            // Enum values ----------------------------------------------------
            case 'enum_value_create':
                await client.createEnumValue(call.enumUnid, {
                    name: call.name,
                    value: call.value,
                    index: call.index,
                    unid: call.unid
                });
                return;

            case 'enum_value_update':
                await client.updateEnumValue(call.enumUnid, call.valueUnid, call.patch);
                return;

            case 'enum_value_delete':
                await client.deleteEnumValue(call.enumUnid, call.valueUnid);
                return;

            case 'enum_value_reorder':
                await client.reorderEnumValues(call.enumUnid, call.order);
                return;

            // Links ----------------------------------------------------------
            case 'link_create':
                await client.createLink({
                    containerUnid: call.containerUnid,
                    link_unid: call.link_unid,
                    unid: call.unid,
                    pos: call.pos
                });
                return;

            case 'link_update':
                await client.updateLink(call.unid, call.patch);
                return;

            case 'link_delete':
                await client.deleteLink(call.unid);
                return;
        }
    }

    /**
     * Boots the MCP approval SSE client exactly once. A missing
     * endpoint (MCP disabled) causes the client to stop itself on
     * first error — no retry loop, no console noise.
     */
    protected _startMcpApprovalClient(): void {
        if (this._mcpApprovalClient !== null) {
            return;
        }

        const client = new SchemaMcpApprovalClient();
        client.onRequest((ev) => this._handleMcpApprovalRequest(ev.requestId, ev.tool, ev.args));
        client.onResolved((ev) => this._handleMcpApprovalResolved(ev.requestId));
        client.connect();
        this._mcpApprovalClient = client;
    }

    protected _handleMcpApprovalRequest(requestId: string, tool: string, args: unknown): void {
        if (this._mcpApprovalDialogs.has(requestId)) {
            return;
        }

        const dialog = new McpApprovalDialog(requestId, tool, args, async (decision) => {
            this._mcpApprovalDialogs.delete(requestId);
            dialog.destroy();

            try {
                const accepted = await this._mcpApprovalClient?.decide(
                    requestId,
                    decision.allow,
                    decision.remember
                );

                // false means the server already resolved the request —
                // timed out, or another tab clicked first. Tell the user
                // so a lost click doesn't look like the editor ate it.
                if (accepted === false) {
                    AlertDialog.showAlert(
                        'MCP approval',
                        `The approval window for '${tool}' had already closed (timeout or another tab). Your decision was not applied.`,
                        AlertDialogTypes.warning
                    );
                }
            } catch (err) {
                this._handleApiError(err, 'MCP approval');
            }
        });

        this._mcpApprovalDialogs.set(requestId, dialog);
        dialog.show();
    }

    protected _handleMcpApprovalResolved(requestId: string): void {
        const dialog = this._mcpApprovalDialogs.get(requestId);

        if (dialog === undefined) {
            return;
        }

        this._mcpApprovalDialogs.delete(requestId);
        dialog.dismiss();
    }

    /**
     * Tears down clients/SSE for projects no longer loaded and spins up new
     * ones for freshly-seen project unids. Idempotent — calling with the
     * same set of unids is a no-op.
     */
    protected _resetClients(projectUnids: string[]): void {
        const incoming = new Set(projectUnids);

        for (const [unid, sse] of this._sseClients.entries()) {
            if (!incoming.has(unid)) {
                sse.close();
                this._sseClients.delete(unid);
                this._clients.delete(unid);
            }
        }

        for (const unid of projectUnids) {
            if (this._clients.has(unid)) {
                continue;
            }

            this._clients.set(unid, new SchemaApiClient(unid, this._clientId));

            const sse = new SchemaSseClient(unid);
            sse.onEvent((ev) => this._handleRemoteEvent(ev));
            sse.onResync(() => this._scheduleRemoteResync());
            sse.onError(() => this._scheduleRemoteResync());
            sse.connect();
            this._sseClients.set(unid, sse);
        }
    }

    /**
     * Returns the client for the active project. Currently single-project
     * (first entry); multi-project routing would resolve the target project
     * from the mutation context.
     */
    public getEditorClient(): SchemaApiClient|null {
        const first = this._clients.values().next();
        return first.done ? null : first.value;
    }

    /**
     * Handles SSE events from the server. Our own mutations echo back with
     * our clientId and are ignored here — UI is already up to date. Remote
     * mutations (MCP, other browser tab) trigger a debounced full reload,
     * except `editor_settings` which is applied directly.
     */
    protected _handleRemoteEvent(event: SchemaRepositoryEvent): void {
        if (event.clientId === this._clientId) {
            return;
        }

        if (event.op === 'editor_settings') {
            // Merge — a partial payload (another tab persisted just one
            // key) must not drop local keys like active_entry_unid.
            this._editorSettings = {...this._editorSettings, ...event.payload};
            this._updateResizer();
            return;
        }

        this._trackRemoteTouched(event);
        this._scheduleRemoteResync();
    }

    /**
     * Record schemas / enums / links that a remote mutation just touched
     * so the next `_updateView()` pulse can highlight them and scroll
     * them into view. Field / enum-value ops resolve to the owning
     * schema or enum — the granular child isn't a canvas element on
     * its own. Pure deletes are ignored (nothing left to point at).
     * @protected
     */
    protected _trackRemoteTouched(event: SchemaRepositoryEvent): void {
        switch (event.op) {
            case 'schema_create':
                this._pendingRemoteTouched.add(event.payload.schema.unid);
                return;
            case 'schema_update':
            case 'schema_move':
                this._pendingRemoteTouched.add(event.payload.unid);
                return;
            case 'enum_create':
                this._pendingRemoteTouched.add(event.payload.enumeration.unid);
                return;
            case 'enum_update':
            case 'enum_move':
                this._pendingRemoteTouched.add(event.payload.unid);
                return;
            case 'link_create':
                this._pendingRemoteTouched.add(event.payload.link.unid);
                return;
            case 'link_update':
                this._pendingRemoteTouched.add(event.payload.unid);
                return;
            case 'container_create':
                this._pendingRemoteTouched.add(event.payload.node.unid);
                return;
            case 'field_create':
            case 'field_update':
            case 'field_delete':
            case 'field_reorder':
                this._pendingRemoteTouched.add(event.payload.schemaUnid);
                return;
            case 'enum_value_create':
            case 'enum_value_update':
            case 'enum_value_delete':
            case 'enum_value_reorder':
                this._pendingRemoteTouched.add(event.payload.enumUnid);
                return;
            default:
                return;
        }
    }

    /**
     * Leading-edge throttle with a 150 ms cooldown, not a trailing-edge
     * debounce. The first remote event arms a timer; any events
     * arriving during the cooldown are coalesced into that same
     * pending reload. When the timer fires, `loadData()` re-fetches
     * the full state (which already reflects every intermediate
     * event), so nothing is lost.
     *
     * Leading-edge is deliberate: under a steady stream of edits in
     * another tab, a trailing-edge debounce would defer the reload
     * forever. Users need to see changes within ~150 ms, not "once
     * the other tab stops typing".
     * @protected
     */
    protected _scheduleRemoteResync(): void {
        if (this._resyncTimer !== null) {
            return;
        }

        this._resyncTimer = setTimeout(() => {
            this._resyncTimer = null;
            this.loadData().catch((err) => {
                console.warn('remote resync failed', err);
            });
        }, 150);
    }

    /**
     * Presents a mutation error to the user. `SchemaApiError` carries an
     * HTTP status and a short code; unknown errors fall back to their
     * message.
     */
    protected _handleApiError(error: unknown, context: string): void {
        const msg = error instanceof SchemaApiError
            ? `${error.message}${error.code ? ` (${error.code})` : ''}`
            : (error instanceof Error ? error.message : String(error));

        AlertDialog.showAlert(context, msg, AlertDialogTypes.error);
    }

    /**
     * save editor settings
     */
    public async saveEditorSettings(): Promise<void> {
        const client = this.getEditorClient();

        if (client === null) {
            return;
        }

        await client.setEditorSettings(this._editorSettings);
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
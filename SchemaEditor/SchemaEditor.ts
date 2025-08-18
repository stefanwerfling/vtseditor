import {BrowserJsPlumbInstance} from '@jsplumb/browser-ui';
import {ProjectSave} from '../SchemaProject/SchemaProjectSave.js';
import {ProjectsData, SchemaProjectsResponse} from '../SchemaProject/SchemaProjectsResponse.js';
import {BaseTable} from './Base/BaseTable.js';
import {EnumTable} from './Enum/EnumTable.js';
import {JsonDataFS, SchemaJsonDataFS, SchemaJsonDataFSType} from './JsonData.js';
import jsPlumbInstance from './jsPlumbInstance.js';
import {LinkTable} from './Link/LinkTable.js';
import {SchemaTable} from './Schema/SchemaTable.js';
import {SchemaExtends} from './Register/SchemaExtends.js';
import {SchemaTypes} from './Register/SchemaTypes.js';
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

        SchemaExtends.getInstance().setExtend(table.getUnid(), table.getName());

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
     * Init
     */
    public init() {
        this._jsPlumbInstance = jsPlumbInstance;
        this._container = jsPlumbInstance.getContainer();

        // add schema button -------------------------------------------------------------------------------------------

        this._btnAddSchema = document.getElementById('addSchemaBtn');
        this._btnAddSchema!.style.display = 'none';
        this._btnAddSchema!.addEventListener('click', () => {
            if (Treeview.getActiveEntry() !== null) {
                this._addSchema();
            } else {
                alert('Please select first a File for your Schema!');
            }
        })

        // add enum button ---------------------------------------------------------------------------------------------

        this._btnAddEnum = document.getElementById('addEnumBtn');
        this._btnAddEnum!.style.display = 'none';
        this._btnAddEnum!.addEventListener('click', () => {
            if (Treeview.getActiveEntry() !== null) {
                this._addEnum();
            } else {
                alert('Please select first a File for your Schema!');
            }
        });

        // treeview ----------------------------------------------------------------------------------------------------

        this._treeview = new Treeview();

        // update events -----------------------------------------------------------------------------------------------

        window.addEventListener('schemaeditor:updatedata', (event: Event) => {
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

        window.addEventListener('schemaeditor:updateview', () => {
            this._updateView();
        });

        window.addEventListener('schemaeditor:deleteschematable', (event: Event) => {
            const customEvent = event as CustomEvent<{ id: string }>;
            const rootEntry = this._treeview?.getRoot();

            if (rootEntry) {
                if (rootEntry.isSchemaTableUse(customEvent.detail.id)) {
                    alert('Your Schema is used and can not delete!');
                    return;
                }

                if (confirm('Do you really want to delete Schema?')) {
                    if (rootEntry.removeSchemaTable(customEvent.detail.id)) {
                        rootEntry.removeEntry(customEvent.detail.id);

                        window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {
                            detail: {
                                updateView: true,
                                updateTreeView: true
                            }
                        }));
                    }
                }
            }
        });

        window.addEventListener('schemaeditor:deleteenumtable', (event: Event) => {
            const customEvent = event as CustomEvent<{ id: string }>;
            const rootEntry = this._treeview?.getRoot();

            if (rootEntry) {
                if (rootEntry.isSchemaTableUse(customEvent.detail.id)) {
                    alert('Your Enum is used and can not delete!');
                    return;
                }

                if (confirm('Do you really want to delete enum?')) {
                    if (rootEntry.removeEnumTable(customEvent.detail.id)) {
                        rootEntry.removeEntry(customEvent.detail.id);

                        window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {
                            detail: {
                                updateView: true,
                                updateTreeView: true
                            }
                        }));
                    }
                }
            }
        });

        window.addEventListener('schemaeditor:deletelinktable', (event: Event) => {
            const customEvent = event as CustomEvent<{ id: string }>;
            const activEntry = Treeview.getActiveEntry();

            if (activEntry) {
                if (activEntry.hasLinkObject(customEvent.detail.id)) {
                    if (confirm('Do you really want to delete link?')) {
                        activEntry.removeLinkTable(customEvent.detail.id);

                        window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {
                            detail: {
                                updateView: true,
                                updateTreeView: true
                            }
                        }));
                    }
                }
            }
        });

        window.addEventListener('schemaeditor:deletefolderfile', (event: Event) => {
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

                                window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {
                                    detail: {
                                        updateView: true,
                                        updateTreeView: true
                                    }
                                }));
                            }
                        } else {
                            alert('Folder/File is not empty, please remove all entries first!');
                        }
                    }
                }
            }
        });

        window.addEventListener('schemaeditor:sortingentrys', () => {
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

        window.addEventListener('schemaeditor:moveto', (event: Event) => {
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

                window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));
            }
        });

        window.addEventListener('schemaeditor:updatename', (event: Event) => {
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

        window.addEventListener('schemaeditor:showtable', (event: Event) => {
            const customEvent = event as CustomEvent<SchemaEditorWiggleEventDetail>;
            const treeview = this._treeview;

            if (treeview) {
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
                            if (confirm('Do you want to add a link object to see the source schema/enum?')) {
                                this._addLink(customEvent.detail.tableId);
                            }
                        }
                    }
                }
            }
        });

        // resizer -----------------------------------------------------------------------------------------------------

        const resizer = document.getElementById('resizer')!;
        const resizerTop = document.getElementById('resizer-topbar')!;
        const controls = document.getElementById('controls')!;
        const topbarheader = document.getElementById('topbarheader')!;
        this._controls = controls;

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
                controls.style.width = `${newWidth}px`;
                topbarheader.style.width = `${newWidth}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.body.style.cursor = 'default';
        });

        // load data ---------------------------------------------------------------------------------------------------

        this.loadData().then();
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
            editor: {
                controls_width: parseInt(this._controls!.style.width , 10) || 300
            }
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
            SchemaExtends.getInstance().setExtend(schema.unid, schema.name);
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
            name: 'root',
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
            this._controls!.style.width = `${data.editor.controls_width}px`;

            const topbarheader = document.getElementById('topbarheader')!;
            topbarheader!.style.width = `${data.editor.controls_width}px`;
        }

        this._treeview?.getRoot().updateView(true);
    }

    /**
     * Save data to vite server
     */
    public async saveData(): Promise<void> {
        const save: ProjectSave = {
            data: this.getData()
        }

        await fetch('/api/save-schema', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(save)
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
        } else {
            alert('Schema response format is broken!');
        }
    }

}
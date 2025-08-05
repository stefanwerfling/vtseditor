import {BrowserJsPlumbInstance} from '@jsplumb/browser-ui';
import {EnumTable} from './Enum/EnumTable.js';
import jsPlumbInstance from './jsPlumbInstance.js';
import {SchemaExtends} from './SchemaExtends.js';
import {JsonData, JsonDataFS, SchemaJsonDataFS, SchemaJsonDataFSType} from './JsonData.js';
import {SchemaTypes} from './SchemaTypes.js';
import {SchemaTable} from './Schema/SchemaTable.js';
import {Treeview} from './Treeview/Treeview.js';

type SchemaEditorMoveEventDetail = {
    sourceType: string;
    destinationType: string;
    sourceId: string;
    detionationId: string;
};

type SchemaEditorUpdatenameEventDetail = {
    sourceId: string;
    sourceType: string;
};

type SchemaEditorWiggleEventDetail = {
    schemaId: string;
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

        window.addEventListener('schemaeditor:updatedata', () => {
            const rootEntry = this._treeview?.getRoot();

            if (rootEntry) {
                rootEntry.sortingEntrys();
            }

            this.saveData().then();
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
                        window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));
                    }
                }
            }
        });

        window.addEventListener('schemaeditor:sortingentrys', () => {
            const rootEntry = this._treeview?.getRoot();

            if (rootEntry) {
                const activeEntryTableId = Treeview.getActivEntryTable()?.getId();
                const activeEntryId = Treeview.getActiveEntry()?.getId();

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
            }
        });

        window.addEventListener('schemaeditor:showschema', (event: Event) => {
            const customEvent = event as CustomEvent<SchemaEditorWiggleEventDetail>;
            const treeview = this._treeview;

            if (treeview) {
                const entry = treeview.getRoot().findParent(customEvent.detail.schemaId);
                const activeEntryId = Treeview.getActiveEntry()?.getId();

                if (entry && activeEntryId) {
                    if (entry.getId() === activeEntryId) {
                        const table = entry.getTableById(customEvent.detail.schemaId);

                        if (table !== null) {
                            table.runWiggle();
                            return;
                        }

                        const aenum =  entry.getEnumById(customEvent.detail.schemaId);

                        if (aenum !== null) {
                            aenum.runWiggle();
                            return;
                        }
                    } else {
                        alert('Not found');
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

        const entryTable = Treeview.getActivEntryTable();
        let entry = Treeview.getActiveEntry();

        if (entryTable !== null) {
            const rootEntry = this._treeview?.getRoot();

            if (rootEntry) {
                entry = rootEntry.findParent(entryTable.getId());

                if (entry) {
                    Treeview.setActivEntry(entry);
                }
            }
        }

        if (entry) {
            this._btnAddSchema!.style.display = '';
            this._btnAddEnum!.style.display = '';

            // Schemas ---------------------------------------------------------------------------------------------
            const sTables = entry.getSchemaTables();

            for (const table of sTables) {
                this._container!.appendChild(table.getElement());
                this._jsPlumbInstance!.revalidate(table.getElement());
            }

            // Enums -----------------------------------------------------------------------------------------------
            const sEnums = entry.getEnumTables();

            for (const tenum of sEnums) {
                this._container!.appendChild(tenum.getElement());
                this._jsPlumbInstance!.revalidate(tenum.getElement());
            }

            // updates view ----------------------------------------------------------------------------------------
            for (const tenum of sEnums) {
                tenum.updateView();

                if (entryTable) {
                    if (tenum.getId() === entryTable.getId()) {
                        tenum.setActivView(true);
                    } else {
                        tenum.setActivView(false);
                    }
                }
            }

            for (const table of sTables) {
                table.showDropArea(false);
                table.updateView();

                if (entryTable) {
                    if (table.getUnid() === entryTable.getId()) {
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
    public getData(): JsonData {
        return {
            fs: this._treeview?.getData()!,
            editor: {
                controls_width: parseInt(this._controls!.style.width , 10) ?? 300
            }
        };
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
     * @param {JsonData} data
     */
    public setData(data: JsonData): void {
        this._updateRegisters(data.fs);
        this._treeview?.setData(data.fs);

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
        await fetch('/api/save-schema', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.getData())
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

        const data = await response.json() as JsonData;

        this.setData(data);
    }

}
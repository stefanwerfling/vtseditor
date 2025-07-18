import {BrowserJsPlumbInstance} from '@jsplumb/browser-ui';
import {EnumTable} from './Enum/EnumTable.js';
import jsPlumbInstance from './jsPlumbInstance.js';
import {SchemaExtends} from './SchemaExtends.js';
import {SchemaJsonData, SchemaJsonDataFS} from './SchemaJsonData.js';
import {SchemaTypes} from './SchemaTypes.js';
import {SchemaTable} from './Schema/SchemaTable.js';
import {Treeview} from './Treeview/Treeview.js';

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

        SchemaExtends.getInstance().setExtend(table.getId(), table.getName());
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

        this._btnAddSchema!.addEventListener('click', () => {
            if (Treeview.getActiveEntry() !== null) {
                this._addSchema();
            } else {
                alert('Please select first a File for your Schema!');
            }
        })

        // add enum button ---------------------------------------------------------------------------------------------

        this._btnAddEnum = document.getElementById('addEnumBtn');

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
                const activeEntryId = Treeview.getActiveEntry()?.getId();

                rootEntry.sortingEntrys();
                this._updateTreeview();

                if (activeEntryId) {
                    const tentry = rootEntry.getEntryById(activeEntryId);

                    if (tentry) {
                        Treeview.setActivEntry(tentry);
                    }
                }

                this._updateView();
            }
        });

        // resizer -----------------------------------------------------------------------------------------------------

        const resizer = document.getElementById('resizer')!;
        const controls = document.getElementById('controls')!;
        this._controls = controls;


        let isResizing = false;

        resizer.addEventListener('mousedown', () => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const newWidth = e.clientX;

            if (newWidth > 150 && newWidth < window.innerWidth - 100) {
                controls.style.width = `${newWidth}px`;
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

        const entry = Treeview.getActiveEntry();

        if (entry) {
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
            }

            for (const table of sTables) {
                table.updateView();
            }

            entry.setActiveName();
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
     * @return {SchemaJsonData}
     */
    public getData(): SchemaJsonData {
        return {
            fs: this._treeview?.getData()!,
            editor: {
                controls_width: parseInt(this._controls!.style.width , 10) ?? 300
            }
        };
    }

    /**
     * Update registers
     * @param {SchemaJsonDataFS} data
     * @protected
     */
    protected _updateRegisters(data: SchemaJsonDataFS): void {
        for (const schema of data.schemas) {
            SchemaExtends.getInstance().setExtend(schema.id, schema.name);
            SchemaTypes.getInstance().setType(schema.id, schema.name);
        }

        for (const entry of data.entrys) {
            this._updateRegisters(entry);
        }
    }

    /**
     * Set data
     * @param {SchemaJsonData} data
     */
    public setData(data: SchemaJsonData): void {
        this._updateRegisters(data.fs);
        this._treeview?.setData(data.fs);

        if (data.editor) {
            this._controls!.style.width = `${data.editor.controls_width}px`;
        }
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

        const data = await response.json() as SchemaJsonData;

        this.setData(data);
    }

}
import {BrowserJsPlumbInstance} from '@jsplumb/browser-ui';
import jsPlumbInstance from './jsPlumbInstance.js';
import {SchemaExtends} from './SchemaExtends.js';
import {SchemaJsonData, SchemaJsonDataFS} from './SchemaJsonData.js';
import {SchemaTypes} from './SchemaTypes.js';
import {SchemaTable} from './Table/SchemaTable.js';
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
     * Init
     */
    public init() {
        this._jsPlumbInstance = jsPlumbInstance;
        this._container = jsPlumbInstance.getContainer();

        this._btnAddSchema = document.getElementById("addSchemaBtn");

        this._btnAddSchema!.addEventListener("click", () => {
            if (Treeview.getActiveEntry() !== null) {
                this._addSchema();
            } else {
                alert('Please select first a File for your Schema!');
            }
        })

        this._treeview = new Treeview();

        // update events -----------------------------------------------------------------------------------------------

        window.addEventListener('schemaeditor:updatedata', () => {
           console.log(this.getData());
           this.saveData().then();
        });

        window.addEventListener('schemaeditor:updateview', () => {
            if (this._jsPlumbInstance && this._container) {
                this._jsPlumbInstance.deleteEveryConnection();
                this._container.innerHTML = '';
            }

            const entry = Treeview.getActiveEntry();

            if (entry) {
                const tables = entry.getSchemaTables();

                for (const table of tables) {
                    this._container!.appendChild(table.getElement());
                    this._jsPlumbInstance!.revalidate(table.getElement());
                }

                for (const table of tables) {
                    table.updateView();
                }
            }
        });

        window.addEventListener('schemaeditor:deletetable', (event: Event) => {
            const customEvent = event as CustomEvent<{ id: string }>;
            const rootEntry = this._treeview?.getRoot();

            if (rootEntry) {
                if (rootEntry.isSchemaTableUse(customEvent.detail.id)) {
                    alert('Your Schema is used and can not delete!');
                    return;
                }

                rootEntry.removeSchemaTable(customEvent.detail.id);
            }
        });

        // resizer -----------------------------------------------------------------------------------------------------

        const resizer = document.getElementById('resizer')!;
        const controls = document.getElementById('controls')!;
        this._controls = controls;


        let isResizing = false;

        resizer.addEventListener('mousedown', (e) => {
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

    public getData(): SchemaJsonData {
        return {
            fs: this._treeview?.getData()!,
            editor: {
                controls_width: parseInt(this._controls!.style.width , 10) ?? 300
            }
        };
    }

    protected _updateRegisters(data: SchemaJsonDataFS): void {
        for (const schema of data.schemas) {
            SchemaExtends.getInstance().setExtend(schema.id, schema.name);
            SchemaTypes.getInstance().setType(schema.id, schema.name);
        }

        for (const entry of data.entrys) {
            this._updateRegisters(entry);
        }
    }

    public setData(data: SchemaJsonData): void {
        this._updateRegisters(data.fs);
        this._treeview?.setData(data.fs);

        if (data.editor) {
            this._controls!.style.width = `${data.editor.controls_width}px`;
        }
    }

    public async saveData(): Promise<void> {
        await fetch('/api/save-schema', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.getData())
        });
    }

    public async loadData(): Promise<void> {
        const response = await fetch('/api/load-schema');

        if (!response.ok) {
            throw new Error(`Can not load: ${response.statusText}`);
        }

        const data = await response.json() as SchemaJsonData;

        this.setData(data);
        console.log(data);
    }
}
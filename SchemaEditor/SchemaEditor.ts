import {BrowserJsPlumbInstance, newInstance} from '@jsplumb/browser-ui';
import jsPlumbInstance from './jsPlumbInstance.js';
import {SchemaExtends} from './SchemaExtends.js';
import {SchemaTable} from './Table/SchemaTable.js';
import {Treeview} from './Treeview/Treeview.js';

export class SchemaEditor {

    /**
     * Container for diagram
     * @protected
     */
    protected _container: HTMLElement | null = null;

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
     * List of tables
     * @protected
     */
    protected _tables: SchemaTable[] = [];

    /**
     * Add a new Schema
     * @param id
     * @param name
     * @protected
     */
    protected _addSchema(id: string, name: string): void {
        const table = new SchemaTable(id, name);

        this._tables.push(table);

        this._container!.appendChild(table.getElement());
        this._jsPlumbInstance!.revalidate(table.getElement());

        SchemaExtends.getInstance().setExtend(id, name);
    }

    /**
     * Init
     */
    public init() {
        this._jsPlumbInstance = jsPlumbInstance;
        this._container = jsPlumbInstance.getContainer();

        this._btnAddSchema = document.getElementById("addSchemaBtn");

        this._btnAddSchema!.addEventListener("click", () => {
            this._addSchema(crypto.randomUUID(), 'NewSchema');
        })

        this._treeview = new Treeview();
    }

}
import {JsonDataFS} from '../JsonData.js';
import {TreeviewEntry} from './TreeviewEntry.js';

/**
 * Treeview
 */
export class Treeview {

    /**
     * Activ entry (file)
     * @protected
     */
    protected static _activEntry: TreeviewEntry|null = null;

    /**
     * Activ entry table (table/enum)
     * @protected
     */
    protected static _activeEntryTable: TreeviewEntry|null = null;

    /**
     * Set the activ entry
     * @param {TreeviewEntry|null} entry
     */
    public static setActivEntry(entry: TreeviewEntry|null): void {
        this._activEntry = entry;
    }

    /**
     * Get the activ entry
     * @return {TreeviewEntry|null}
     */
    public static getActiveEntry(): TreeviewEntry|null {
        return this._activEntry;
    }

    /**
     * Set the activ entry table
     * @param entry
     */
    public static setActivEntryTable(entry: TreeviewEntry|null): void {
        this._activeEntryTable = entry;
    }

    /**
     * Get the active entry table
     * @return {TreeviewEntry|null}
     */
    public static getActivEntryTable(): TreeviewEntry|null {
        return this._activeEntryTable;
    }

    /**
     * Treeview div element
     * @protected
     */
    protected _div: HTMLDivElement;

    /**
     * Root folder entry
     * @protected
     */
    protected _rootFolder: TreeviewEntry;

    /**
     * Constructor
     */
    public constructor() {
        this._div = document.getElementById('treeview')! as HTMLDivElement;
        this._rootFolder = new TreeviewEntry('Root');
        this._div.appendChild(this._rootFolder.getElement());
    }

    /**
     * Return the root entry
     * @return {TreeviewEntry}
     */
    public getRoot(): TreeviewEntry {
        return this._rootFolder;
    }

    /**
     * Return the data
     * @return {JsonDataFS}
     */
    public getData(): JsonDataFS {
        return this._rootFolder.getData();
    }

    /**
     * Set the data
     * @param {JsonDataFS} data
     */
    public setData(data: JsonDataFS): void {
        this._rootFolder.setData(data);
    }

    /**
     * Remove all active name
     */
    public removeAllActiveName(): void {
        document.querySelectorAll('.treeview-file.active').forEach(el => {
            el.classList.remove('active');
        });

        document.querySelectorAll('.treeview-file.active2').forEach(el => {
            el.classList.remove('active2');
        });
    }

    public moveToEntry(sourceId: string, destinationId: string): void {
        const parentEntry = this._rootFolder.findParent(sourceId);
        const destinationEntry = this._rootFolder.getEntryById(destinationId);

        if (parentEntry && destinationEntry) {
            const entryInfo = parentEntry.getEntryById(sourceId);

            if (entryInfo) {
                if (destinationEntry.hasEntryWith(entryInfo.getName(), entryInfo.getType())) {
                    alert('The destination have also a File/Folder with the same name!');
                    return;
                }

                const entry = parentEntry.spliceEntry(sourceId);

                if (entry) {
                    destinationEntry.addEntry(entry);
                    window.dispatchEvent(new CustomEvent('schemaeditor:sortingentrys', {}));
                }
            }
        }
    }

    public moveTableToEntry(sourceTableId: string, destinationId: string): void {
        const parentEntry = this._rootFolder.findParent(sourceTableId);
        const destinationEntry = this._rootFolder.getEntryById(destinationId);

        if (parentEntry && destinationEntry) {
            const tableInfo = parentEntry.getTableById(sourceTableId);

            if (tableInfo) {
                if (destinationEntry.hasTableOrEnumName(tableInfo.getName())) {
                    alert('The destination have also a Schema/Enum with the same name!');
                    return;
                }

                const table = parentEntry.spliceTable(sourceTableId);

                if (table) {
                    destinationEntry.addSchemaTable(table);

                    const entry = parentEntry.spliceEntry(sourceTableId);

                    if (entry) {
                        destinationEntry.addEntry(entry);
                    }

                    window.dispatchEvent(new CustomEvent('schemaeditor:sortingentrys', {}));
                }
            }
        }
    }

    public moveEnumToEntry(sourceEnumId: string, destinationId: string): void {
        const parentEntry = this._rootFolder.findParent(sourceEnumId);
        const destinationEntry = this._rootFolder.getEntryById(destinationId);

        if (parentEntry && destinationEntry) {
            const enumInfo = parentEntry.getEnumById(sourceEnumId);

            if (enumInfo) {
                if (destinationEntry.hasTableOrEnumName(enumInfo.getName())) {
                    alert('The destination have also a Schema/Enum with the same name!');
                    return;
                }

                const aenum = parentEntry.spliceEnum(sourceEnumId);

                if (aenum) {
                    destinationEntry.addEnumTable(aenum);

                    const entry = parentEntry.spliceEntry(sourceEnumId);

                    if (entry) {
                        destinationEntry.addEntry(entry);
                    }

                    window.dispatchEvent(new CustomEvent('schemaeditor:sortingentrys', {}));
                }
            }
        }
    }

    /**
     * Update entry name by table name
     * @param {string} id
     */
    public updateEntryNameTable(id: string): void {
        const parentEntry = this._rootFolder.findParent(id);

        if (parentEntry) {
            const table = parentEntry.getTableById(id);

            if (table) {
                const entry = parentEntry.getEntryById(id);

                if (entry) {
                    entry.setName(table.getName());
                }
            }
        }
    }

    /**
     * Update entry name by enum name
     * @param {string} id
     */
    public updateEntryNameEnum(id: string): void {
        const parentEntry = this._rootFolder.findParent(id);

        if (parentEntry) {
            const aenum = parentEntry.getEntryById(id);

            if (aenum) {
                const entry = parentEntry.getEntryById(id);

                if (entry) {
                    entry.setName(aenum.getName());
                }
            }
        }
    }

}
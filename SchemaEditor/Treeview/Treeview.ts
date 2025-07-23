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
}
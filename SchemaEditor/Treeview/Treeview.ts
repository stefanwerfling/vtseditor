import {SchemaJsonDataFS} from '../SchemaJsonData.js';
import {TreeviewEntry} from './TreeviewEntry.js';

/**
 * Treeview
 */
export class Treeview {

    /**
     * Activ entry
     * @protected
     */
    protected static _activEntry: TreeviewEntry|null = null;

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
     * @return {SchemaJsonDataFS}
     */
    public getData(): SchemaJsonDataFS {
        return this._rootFolder.getData();
    }

    /**
     * Set the data
     * @param {SchemaJsonDataFS} data
     */
    public setData(data: SchemaJsonDataFS): void {
        this._rootFolder.setData(data);
    }
}
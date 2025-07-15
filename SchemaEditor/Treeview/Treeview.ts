import {SchemaJsonDataFS} from '../SchemaJsonData.js';
import {TreeviewEntry} from './TreeviewEntry.js';

export class Treeview {

    protected static _activEntry: TreeviewEntry|null = null;

    public static setActivEntry(entry: TreeviewEntry|null): void {
        this._activEntry = entry;
    }

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

    public constructor() {
        this._div = document.getElementById('treeview')! as HTMLDivElement;
        this._rootFolder = new TreeviewEntry('Root');
        this._div.appendChild(this._rootFolder.getElement());
    }

    /**
     * Return the data
     */
    public getData(): SchemaJsonDataFS {
        return this._rootFolder.getData();
    }

    public setData(data: SchemaJsonDataFS): void {
        this._rootFolder.setData(data);
    }
}
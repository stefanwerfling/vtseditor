import {TreeviewEntry} from './TreeviewEntry.js';

export class Treeview {

    protected _div: HTMLDivElement;

    protected _rootFolder: TreeviewEntry;

    public constructor() {
        this._div = document.getElementById('treeview')! as HTMLDivElement;
        this._rootFolder = new TreeviewEntry('Root');
        this._div.appendChild(this._rootFolder.getElement());
    }
}
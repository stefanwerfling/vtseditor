import {TreeviewDialog} from './TreeviewDialog.js';

/**
 * Treeview entry type
 */
export enum TreeviewEntryType {
    root = 'root',
    folder = 'folder',
    file = 'file',
    schema = 'schema'
}

/**
 * Treeview entry
 */
export class TreeviewEntry {

    protected _ul: HTMLUListElement;

    protected _liFolder: HTMLLIElement;

    protected _spanName: HTMLSpanElement;

    /**
     * Id
     * @protected
     */
    protected _id: string = '';

    /**
     * Name
     * @protected
     */
    protected _name: string = '';

    protected _type: TreeviewEntryType|string = '';

    /**
     * List
     * @protected
     */
    protected _list: Map<string, TreeviewEntry> = new Map<string, TreeviewEntry>();

    public constructor(id: string = '', name: string = 'Root', type: TreeviewEntryType|string = TreeviewEntryType.root) {
        this._ul = document.createElement('ul');
        this._liFolder = document.createElement('li');

        const folderLine = document.createElement('div');
        folderLine.classList.add('folder-line');
        this._liFolder.appendChild(folderLine);

        // add button delete -------------------------------------------------------------------------------------------

        const btnDelete = document.createElement('button');
        btnDelete.textContent = '🗑';
        btnDelete.classList.add('delete-folder');

        folderLine.appendChild(btnDelete);

        // set span name -----------------------------------------------------------------------------------------------

        this._spanName = document.createElement('span');
        this._spanName.classList.add('folder');

        folderLine.appendChild(this._spanName);

        this._spanName.addEventListener('click', () => {
            if (this.getType() === TreeviewEntryType.file) {
                document.querySelectorAll('.treeview-file.active').forEach(el => {
                    el.classList.remove('active');
                });

                this._spanName.classList.add('active');

            }
        });


        // add folder/file ---------------------------------------------------------------------------------------------

        if (type === TreeviewEntryType.root || type === TreeviewEntryType.folder) {
            const btnAdd = document.createElement('button');
            btnAdd.textContent = '➕';
            btnAdd.classList.add('add-folder');
            btnAdd.addEventListener('click', ev => {
                const dialog = new TreeviewDialog();
                dialog.show();

                const types = new Map<string, string>();
                types.set('folder', '📁 Folder');
                types.set('file', '📄 File');

                dialog.setTypeOptions(types);
                dialog.setOnConfirm(dialog1 => {
                    const entry = new TreeviewEntry(crypto.randomUUID(), dialog1.getName(), dialog1.getType());
                    this._list.set(entry.getId(), entry);
                    this._liFolder.appendChild(entry.getElement());
                });
            });

            folderLine.appendChild(btnAdd);
        }

        // edit folder/file --------------------------------------------------------------------------------------------

        if (type === TreeviewEntryType.folder || type === TreeviewEntryType.file) {
            const btnEdit = document.createElement('button');
            btnEdit.textContent = '📝';
            btnEdit.classList.add('add-folder');
            btnEdit.addEventListener('click', ev => {
                const dialog = new TreeviewDialog();
                dialog.setName(this.getName());
                dialog.setType(this.getType());
                dialog.show();

                const types = new Map<string, string>();
                types.set('folder', '📁 Folder');
                types.set('file', '📄 File');

                dialog.setTypeOptions(types);
                dialog.setOnConfirm(dialog1 => {
                    this.setName(dialog1.getName());
                    this.setType(dialog1.getType());
                });
            });

            folderLine.appendChild(btnEdit);
        }

        // -------------------------------------------------------------------------------------------------------------

        this._ul.appendChild(this._liFolder);

        this.setType(type);
        this.setName(name);
    }

    public getElement(): HTMLUListElement {
        return this._ul;
    }

    public setType(type: TreeviewEntryType|string): void {
        this._type = type;

        this._spanName.classList.remove('treeview-file');

        if (type === TreeviewEntryType.file) {
            this._spanName.classList.add('treeview-file');
        }
    }

    /**
     * Get type
     * @return {string|TreeviewEntryType}
     */
    public getType(): string|TreeviewEntryType {
        return this._type;
    }

    public setName(name: string): void {
        this._name = name;

        let typeIcon = '';

        switch (this._type) {
            case TreeviewEntryType.root:
                typeIcon = '🌳';
                break;

            case TreeviewEntryType.folder:
                typeIcon = '📁';
                break;

            case TreeviewEntryType.file:
                typeIcon = '📄';
                break;

            case TreeviewEntryType.schema:
                typeIcon = '🧩';
                break;
        }

        this._spanName.textContent = `${typeIcon} ${name}`;
    }

    public getName(): string {
        return this._name;
    }

    public getId(): string {
        return this._id;
    }

}
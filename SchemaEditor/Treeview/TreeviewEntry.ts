import {SchemaExtends} from '../SchemaExtends.js';
import {SchemaJsonDataFS, SchemaJsonDataFSType, SchemaJsonSchemaDescription} from '../SchemaJsonData.js';
import {SchemaTable} from '../Table/SchemaTable.js';
import {Treeview} from './Treeview.js';
import {TreeviewDialog} from './TreeviewDialog.js';

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

    /**
     * Type
     * @protected
     */
    protected _type: SchemaJsonDataFSType|string = '';

    /**
     * List
     * @protected
     */
    protected _list: Map<string, TreeviewEntry> = new Map<string, TreeviewEntry>();

    /**
     * List of tables
     * @protected
     */
    protected _tables: SchemaTable[] = [];

    public constructor(id: string = '', name: string = 'Root', type: SchemaJsonDataFSType|string = SchemaJsonDataFSType.root) {
        this._id = id;
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
            if (this.getType() === SchemaJsonDataFSType.file) {
                document.querySelectorAll('.treeview-file.active').forEach(el => {
                    el.classList.remove('active');
                });

                this._spanName.classList.add('active');

                Treeview.setActivEntry(this);

                window.dispatchEvent(new CustomEvent('schemaeditor:updateview', {}));
            }
        });


        // add folder/file ---------------------------------------------------------------------------------------------

        if (type === SchemaJsonDataFSType.root || type === SchemaJsonDataFSType.folder) {
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

                    window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));
                });
            });

            folderLine.appendChild(btnAdd);
        }

        // edit folder/file --------------------------------------------------------------------------------------------

        if (type === SchemaJsonDataFSType.folder || type === SchemaJsonDataFSType.file) {
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

                    window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));
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

    public setType(type: SchemaJsonDataFSType|string): void {
        this._type = type;

        this._spanName.classList.remove('treeview-file');

        if (type === SchemaJsonDataFSType.file) {
            this._spanName.classList.add('treeview-file');
        }
    }

    /**
     * Get type
     * @return {string|SchemaJsonDataFSType}
     */
    public getType(): string|SchemaJsonDataFSType {
        return this._type;
    }

    public setName(name: string): void {
        this._name = name;

        let typeIcon = '';

        switch (this._type) {
            case SchemaJsonDataFSType.root:
                typeIcon = '🌳';
                break;

            case SchemaJsonDataFSType.folder:
                typeIcon = '📁';
                break;

            case SchemaJsonDataFSType.file:
                typeIcon = '📄';
                break;

            case SchemaJsonDataFSType.schema:
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

    public addEntry(entry: TreeviewEntry): void {
        this._list.set(entry.getId(), entry);
        this._liFolder.appendChild(entry.getElement());
    }

    public getData(): SchemaJsonDataFS {
        const entrys: SchemaJsonDataFS[] = [];

        for (const [, entry] of this._list.entries()) {
            entrys.push(entry.getData());
        }

        const schemas: SchemaJsonSchemaDescription[] = [];

        for (const table of this._tables) {
            schemas.push(table.getData());
        }

        return {
            id: this._id,
            name: this._name,
            type: this._type,
            entrys: entrys,
            schemas: schemas
        };
    }

    public setData(data: SchemaJsonDataFS): void {
        this._id = data.id;
        this.setType(data.type);
        this.setName(data.name);

        for (const aEntry of data.entrys) {
            const entry = new TreeviewEntry(aEntry.id, aEntry.name, aEntry.type);
            this.addEntry(entry);
            entry.setData(aEntry);
        }

        for (const aSchema of data.schemas) {
            const schema = new SchemaTable(aSchema.id, aSchema.name, aSchema.extend, aSchema.fields);
            schema.setData(aSchema);
            this.addSchemaTable(schema);
        }
    }

    public addSchemaTable(table: SchemaTable): void {
        this._tables.push(table);
    }

    public getSchemaTables(): SchemaTable[] {
        return this._tables;
    }
}
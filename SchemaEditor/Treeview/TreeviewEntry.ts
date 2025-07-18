import {EnumTable} from '../Enum/EnumTable.js';
import {
    SchemaJsonDataFS,
    SchemaJsonDataFSType,
    SchemaJsonEnumDescription,
    SchemaJsonSchemaDescription
} from '../SchemaJsonData.js';
import {SchemaTable} from '../Schema/SchemaTable.js';
import {Treeview} from './Treeview.js';
import {TreeviewDialog} from './TreeviewDialog.js';

/**
 * Treeview entry
 */
export class TreeviewEntry {

    /**
     * Ul Element
     * @protected
     */
    protected _ul: HTMLUListElement;

    /**
     * Li Element
     * @protected
     */
    protected _liElement: HTMLLIElement;

    /**
     * span toggle
     * @protected
     */
    protected _spanToggle: HTMLSpanElement;

    /**
     * Span Name
     * @protected
     */
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

    /**
     * List of enums
     * @protected
     */
    protected _enums: EnumTable[] = [];

    /**
     * Constructor
     * @param {string} id
     * @param {string} name
     * @param {SchemaJsonDataFSType|string} type
     */
    public constructor(id: string = '', name: string = 'Root', type: SchemaJsonDataFSType|string = SchemaJsonDataFSType.root) {
        this._id = id;
        this._ul = document.createElement('ul');
        this._liElement = document.createElement('li');

        const folderLine = document.createElement('div');
        folderLine.classList.add('folder-line');
        this._liElement.appendChild(folderLine);

        // toggle ------------------------------------------------------------------------------------------------------
        this._spanToggle = document.createElement('span');
        this._spanToggle.classList.add('toggle-icon');
        this._spanToggle.textContent = '▼';
        this._spanToggle.addEventListener("click", () => {
            const line = this._spanToggle.parentElement;

            if (!line) {
                return;
            }

            const parentLi = line.closest('li');

            if (!parentLi) {
                return;
            }

            const uls = Array.from(parentLi.children).filter(
                el => el.tagName === 'UL'
            ) as HTMLUListElement[];

            const isOpen = line.classList.toggle('open');

            for (const ul of uls) {
                ul.style.display = isOpen ? 'block' : 'none';
            }

            this._spanToggle.textContent = isOpen ? '▼' : '▶';
        });

        folderLine.appendChild(this._spanToggle);
        this._spanToggle.parentElement?.classList.add('open');
        const parentLi = this._spanToggle.closest('li');

        if (parentLi) {
            parentLi.querySelectorAll('ul').forEach(ul => {
                ul.style.display = 'block';
            });
        }

        // add button delete -------------------------------------------------------------------------------------------

        if (type !== SchemaJsonDataFSType.root) {
            const btnDelete = document.createElement('button');
            btnDelete.textContent = '🗑';
            btnDelete.classList.add('delete-folder');

            folderLine.appendChild(btnDelete);
        }

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
            btnAdd.addEventListener('click', () => {
                const dialog = new TreeviewDialog();
                dialog.show();

                const types = new Map<string, string>();

                if (this._tables.length === 0) {
                    types.set('folder', '📁 Folder');
                }

                types.set('file', '📄 File');

                dialog.setTypeOptions(types);
                dialog.setOnConfirm(dialog1 => {
                    const entry = new TreeviewEntry(crypto.randomUUID(), dialog1.getName(), dialog1.getType());
                    this._list.set(entry.getId(), entry);
                    this._liElement.appendChild(entry.getElement());

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
            btnEdit.addEventListener('click', () => {
                const dialog = new TreeviewDialog();
                dialog.setName(this.getName());
                dialog.setType(this.getType());
                dialog.show();

                const types = new Map<string, string>();

                if (this._tables.length === 0) {
                    types.set('folder', '📁 Folder');
                }

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

        this._ul.appendChild(this._liElement);

        this.setType(type);
        this.setName(name);
    }

    /**
     * Return an element
     */
    public getElement(): HTMLUListElement {
        return this._ul;
    }

    /**
     * Set Type
     * @param {SchemaJsonDataFSType|string} type
     */
    public setType(type: SchemaJsonDataFSType|string): void {
        this._type = type;

        this._spanName.classList.remove('treeview-file');
        this._spanToggle.style.display = 'block';

        if (type === SchemaJsonDataFSType.file) {
            this._spanName.classList.add('treeview-file');
            this._spanToggle.style.display = 'none';
        }
    }

    /**
     * Get type
     * @return {string|SchemaJsonDataFSType}
     */
    public getType(): string|SchemaJsonDataFSType {
        return this._type;
    }

    /**
     * Set name
     * @param {name} name
     */
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

    /**
     * Get name
     * @return {string}
     */
    public getName(): string {
        return this._name;
    }

    /**
     * Get id
     * @return {string}
     */
    public getId(): string {
        return this._id;
    }

    /**
     * Add an entry
     * @param {TreeviewEntry} entry
     */
    public addEntry(entry: TreeviewEntry): void {
        this._list.set(entry.getId(), entry);
        this._liElement.appendChild(entry.getElement());
    }

    /**
     * Get data
     * @return {SchemaJsonDataFS}
     */
    public getData(): SchemaJsonDataFS {
        const entrys: SchemaJsonDataFS[] = [];

        for (const [, entry] of this._list.entries()) {
            entrys.push(entry.getData());
        }

        const enums: SchemaJsonEnumDescription[] = [];

        for (const aenum of this._enums) {
            enums.push(aenum.getData());
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
            schemas: schemas,
            enums: enums,
        };
    }

    /**
     * Set data
     * @param {SchemaJsonDataFS} data
     */
    public setData(data: SchemaJsonDataFS): void {
        this._id = data.id;
        this.setType(data.type);
        this.setName(data.name);

        for (const aEntry of data.entrys) {
            const entry = new TreeviewEntry(aEntry.id, aEntry.name, aEntry.type);
            this.addEntry(entry);
            entry.setData(aEntry);
        }

        for (const aEnum of data.enums) {
            const tenum = new EnumTable(aEnum.id, aEnum.name);
            tenum.setData(aEnum);
            this.addEnumTable(tenum);
        }

        for (const aSchema of data.schemas) {
            const schema = new SchemaTable(aSchema.id, aSchema.name, aSchema.extend);
            schema.setData(aSchema);
            this.addSchemaTable(schema);
        }
    }

    /**
     * Add schema table
     * @param {SchemaTable} table
     */
    public addSchemaTable(table: SchemaTable): void {
        this._tables.push(table);

        table.setOnDelete(table1 => {
            window.dispatchEvent(new CustomEvent('schemaeditor:deleteschematable', {
                detail: {
                    id: table1.getId()
                }
            }));
        });
    }

    /**
     * Add enum table
     * @param table
     */
    public addEnumTable(table: EnumTable): void {
        this._enums.push(table);

        table.setOnDelete(table1 => {
            window.dispatchEvent(new CustomEvent('schemaeditor:deleteenumtable', {
                detail: {
                    id: table1.getId()
                }
            }));
        });
    }

    /**
     * Return schema tables
     * @return {SchemaTable[]}
     */
    public getSchemaTables(): SchemaTable[] {
        return this._tables;
    }

    /**
     * Return enum tables
     * @return {EnumTable[]}
     */
    public getEnumTables(): EnumTable[] {
        return this._enums;
    }

    /**
     * Is schema table use
     * @param {string} id
     * @return {boolean}
     */
    public isSchemaTableUse(id: string): boolean {
        for (const [, entry] of this._list.entries()) {
            if (entry.isSchemaTableUse(id)) {
                return true;
            }
        }

        for (const table of this._tables) {
            if (table.getId() === id) {
                continue;
            }

            if (table.isSchemaTableUse(id)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Remove a Schema table
     * @param {string} id
     * @return {boolean}
     */
    public removeSchemaTable(id: string): boolean {
        for (let i = 0; i < this._tables.length; i++) {
            const table = this._tables[i];
            if (table.getId() === id) {
                table.remove();
                this._tables.splice(i, 1);
                return true;
            }
        }

        for (const [, entry] of this._list.entries()) {
            if (entry.removeSchemaTable(id)) {
                return true;
            }
        }

        return false;
    }

}
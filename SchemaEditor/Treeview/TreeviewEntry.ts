import {EnumTable} from '../Enum/EnumTable.js';
import {
    JsonDataFS,
    JsonEnumDescription,
    JsonSchemaDescription,
    SchemaJsonDataFS,
    SchemaJsonDataFSIcon,
    SchemaJsonDataFSType
} from '../JsonData.js';
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
     * span icon
     * @protected
     */
    protected _spanIcon: HTMLSpanElement;

    /**
     * Span Name
     * @protected
     */
    protected _spanName: HTMLSpanElement;

    /**
     * Id
     * @protected
     */
    protected unid: string = '';

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
     * icon
     * @protected
     */
    protected _icon: SchemaJsonDataFSIcon|string = '';

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
     * @param {string} icon
     */
    public constructor(id: string = '', name: string = 'Root', type: SchemaJsonDataFSType|string = SchemaJsonDataFSType.root, icon: string = '') {
        this.unid = id;
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
            this.setToggle(!this.isToggle());
        });

        folderLine.appendChild(this._spanToggle);

        // set span name -----------------------------------------------------------------------------------------------

        const clickSetActiv = () => {
            if (this.getType() === SchemaJsonDataFSType.file) {
                Treeview.setActivEntryTable(null);
                Treeview.setActivEntry(this);

                window.dispatchEvent(new CustomEvent('schemaeditor:updateview', {}));
            }

            if (this.getType() === SchemaJsonDataFSType.enum || this.getType() === SchemaJsonDataFSType.schema) {
                Treeview.setActivEntryTable(this);

                window.dispatchEvent(new CustomEvent('schemaeditor:updateview', {}));
            }
        };

        this._spanIcon = document.createElement('span');
        this._spanIcon.classList.add('folder');
        folderLine.appendChild(this._spanIcon);

        this._spanIcon.addEventListener('click', clickSetActiv);

        this._spanName = document.createElement('span');
        this._spanName.classList.add('folder');
        folderLine.appendChild(this._spanName);

        this._spanName.addEventListener('click', clickSetActiv);

        // helper function ---------------------------------------------------------------------------------------------

        const getDialogTypes = (): Map<string, string> =>  {
            const types = new Map<string, string>();

            if (this._tables.length === 0) {
                types.set('folder', '📁 Folder');
            }

            types.set('file', '📄 File');

            return types;
        };

        const getDialogIcons = (): Map<string, string> => {
            const icons = new Map<string, string>();

            icons.set('', 'None');
            icons.set(SchemaJsonDataFSIcon.package, '📦 Package');
            icons.set(SchemaJsonDataFSIcon.libary, '🧱 Libary');
            icons.set(SchemaJsonDataFSIcon.registry, '🗂️ Registry');
            icons.set(SchemaJsonDataFSIcon.archiv, '🗃️ Archiv');

            return icons;
        };

        // add folder/file ---------------------------------------------------------------------------------------------

        if (type === SchemaJsonDataFSType.root || type === SchemaJsonDataFSType.folder) {
            const btnAdd = document.createElement('button');
            btnAdd.textContent = '➕';
            btnAdd.classList.add('add-folder');
            btnAdd.addEventListener('click', () => {
                folderLine.classList.add('folder-line-hover');

                const dialog = new TreeviewDialog();
                dialog.show();

                dialog.setTypeOptions(getDialogTypes());

                if (type === SchemaJsonDataFSType.folder) {
                    dialog.setIconOptions(getDialogIcons());
                }

                dialog.setOnConfirm(dialog1 => {
                    const tdialog = dialog1 as unknown as TreeviewDialog;

                    const entry = new TreeviewEntry(
                        crypto.randomUUID(),
                        tdialog.getName(),
                        tdialog.getType(),
                        tdialog.getIcon()
                    );

                    this._list.set(entry.getId(), entry);
                    this._liElement.appendChild(entry.getElement());

                    folderLine.classList.remove('folder-line-hover');

                    window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));

                    return true;
                });

                dialog.setOnClose(() => {
                    folderLine.classList.remove('folder-line-hover');
                });
            });

            folderLine.appendChild(btnAdd);
        }

        // add sorting -------------------------------------------------------------------------------------------------

        if (type === SchemaJsonDataFSType.root) {
            const btnSorting = document.createElement('button');
            btnSorting.textContent = '↕️';
            btnSorting.classList.add('add-folder');
            btnSorting.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('schemaeditor:sortingentrys', {}));
            });
            folderLine.appendChild(btnSorting);
        }

        // edit folder/file --------------------------------------------------------------------------------------------

        if (type === SchemaJsonDataFSType.folder || type === SchemaJsonDataFSType.file) {
            const btnEdit = document.createElement('button');
            btnEdit.textContent = '📝';
            btnEdit.classList.add('add-folder');
            btnEdit.addEventListener('click', () => {
                folderLine.classList.add('folder-line-hover');

                const dialog = new TreeviewDialog();
                dialog.setName(this.getName());
                dialog.setTypeOptions(getDialogTypes());
                dialog.setType(this.getType());
                dialog.setIconOptions(getDialogIcons());
                dialog.setIcon(this.getIcon());
                dialog.show();

                dialog.setOnConfirm(dialog1 => {
                    const tdialog = dialog1 as unknown as TreeviewDialog;
                    this.setName(tdialog.getName());
                    this.setType(tdialog.getType());
                    this.setIcon(tdialog.getIcon());

                    folderLine.classList.remove('folder-line-hover');

                    window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));

                    return true;
                });

                dialog.setOnClose(() => {
                    folderLine.classList.remove('folder-line-hover');
                })
            });

            folderLine.appendChild(btnEdit);
        }

        // add button delete -------------------------------------------------------------------------------------------

        if (type !== SchemaJsonDataFSType.root) {
            const btnDelete = document.createElement('button');
            btnDelete.textContent = '🗑';
            btnDelete.classList.add('delete-folder');

            folderLine.appendChild(btnDelete);
        }

        // set draggable -----------------------------------------------------------------------------------------------

        if (type === SchemaJsonDataFSType.file || type === SchemaJsonDataFSType.folder ||
            type === SchemaJsonDataFSType.schema || type === SchemaJsonDataFSType.enum)
        {
            folderLine.draggable = true;
            folderLine.addEventListener('dragstart', e => {
                e.dataTransfer?.setData('type', this.getType());
                e.dataTransfer?.setData('id', this.getId());
                folderLine.classList.add('dragging');

                if (this.getType() === SchemaJsonDataFSType.schema || this.getType() === SchemaJsonDataFSType.enum) {
                    const activeEntry = Treeview.getActiveEntry();

                    if (activeEntry) {
                        const tables = activeEntry.getSchemaTables();

                        for (const table of tables) {
                            if (this.getId() !== table.getUnid()) {
                                table.showDropArea(true);
                            }
                        }
                    }
                }
            });
        }

        folderLine.addEventListener('dragover', e => {
            const type = e.dataTransfer?.getData('type');

            switch (this.getType()) {
                case SchemaJsonDataFSType.folder:
                    if (type === SchemaJsonDataFSType.file || type === SchemaJsonDataFSType.folder) {
                        e.preventDefault();
                        folderLine.classList.add('drag-over');
                    }
                    break;

                case SchemaJsonDataFSType.file:
                    if (type === SchemaJsonDataFSType.schema || type === SchemaJsonDataFSType.enum) {
                        e.preventDefault();
                        folderLine.classList.add('drag-over');
                    }
                    break;
            }
        });

        folderLine.addEventListener('dragleave', () => {
            folderLine.classList.remove('drag-over');
        });

        folderLine.addEventListener('dragend', () => {
            folderLine.classList.remove('dragging');

            const activeEntry = Treeview.getActiveEntry();

            if (activeEntry) {
                const tables = activeEntry.getSchemaTables();

                for (const table of tables) {
                    table.showDropArea(false);
                }
            }
        });

        folderLine.addEventListener('drop', e => {
            const type = e.dataTransfer?.getData('type');

            switch (this.getType()) {
                case SchemaJsonDataFSType.folder:
                    if (type === SchemaJsonDataFSType.file || type === SchemaJsonDataFSType.folder) {
                        window.dispatchEvent(new CustomEvent('schemaeditor:moveto', {
                            detail: {
                                sourceType: type,
                                destinationType: this.getType(),
                                sourceId: e.dataTransfer?.getData('id'),
                                detionationId: this.getId()
                            }
                        }));
                    }
                    break;

                case SchemaJsonDataFSType.file:
                    if (type === SchemaJsonDataFSType.schema || type === SchemaJsonDataFSType.enum) {
                        window.dispatchEvent(new CustomEvent('schemaeditor:moveto', {
                            detail: {
                                sourceType: type,
                                destinationType: this.getType(),
                                sourceId: e.dataTransfer?.getData('id'),
                                detionationId: this.getId()
                            }
                        }));
                    }
                    break;
            }

            folderLine.classList.remove('drag-over');
        });

        // -------------------------------------------------------------------------------------------------------------

        this._ul.appendChild(this._liElement);

        this.setType(type);
        this.setName(name);

        if (type === SchemaJsonDataFSType.root || type === SchemaJsonDataFSType.folder) {
            this.setToggle(false);
        }

        if (icon !== '') {
            this.setIcon(icon);
        } else {
            this.setIcon(type);
        }
    }

    /**
     * Return an element
     * @return {HTMLUListElement}
     */
    public getElement(): HTMLUListElement {
        return this._ul;
    }

    /**
     * Is entry toggle
     * @return {boolean}
     */
    public isToggle(): boolean {
        const line = this._spanToggle.parentElement;

        if (!line) {
            return false;
        }

        return line.classList.contains('open');
    }

    /**
     * Set toogle
     * @param {boolean} open
     */
    public setToggle(open: boolean): void {
        const line = this._spanToggle.parentElement;

        if (!line) return;

        const parentLi = this._spanToggle.closest('li');

        if (!parentLi) return;

        const uls = Array.from(parentLi.children).filter(el => el.tagName === 'UL') as HTMLUListElement[];

        if (open) {
            line.classList.add('open');
            this._spanToggle.textContent = '▼';
        } else {
            line.classList.remove('open');
            this._spanToggle.textContent = '▶';
        }

        if (this._icon !== '') {
            this._setIcon(this._icon);
        } else {
            this._setIcon(this.getType());
        }

        for (const ul of uls) {
            ul.style.display = open ? 'block' : 'none';
        }
    }

    /**
     * Set Type
     * @param {SchemaJsonDataFSType|string} type
     */
    public setType(type: SchemaJsonDataFSType|string): void {
        this._type = type;

        this._spanName.classList.remove('treeview-file');
        this._spanToggle.style.display = 'block';

        if (type === SchemaJsonDataFSType.file || type === SchemaJsonDataFSType.schema || type === SchemaJsonDataFSType.enum) {
            this._spanName.classList.add('treeview-file');
            this._spanToggle.style.display = 'none';
        }

        if (this._icon !== '') {
            this._setIcon(this._icon);
        } else {
            this._setIcon(type);
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
     * Set icon
     * @param icon
     */
    protected _setIcon(icon: SchemaJsonDataFSType|SchemaJsonDataFSIcon|string): void {
        let iconText = '❓';

        switch (icon) {
            case SchemaJsonDataFSType.root:
                iconText = '🌳';
                break;

            case SchemaJsonDataFSType.folder:
                iconText = '📁';

                if (this.isToggle()) {
                    iconText = '📂';
                }

                break;

            case SchemaJsonDataFSType.file:
                iconText = '📄';
                break;

            case SchemaJsonDataFSType.schema:
                iconText = '🧬';
                break;

            case SchemaJsonDataFSType.enum:
                iconText = '🧩';
                break;

            case SchemaJsonDataFSIcon.package:
                iconText = '📦';
                break;

            case SchemaJsonDataFSIcon.libary:
                iconText = '🧱';
                break;

            case SchemaJsonDataFSIcon.registry:
                iconText = '🗂️';
                break;

            case SchemaJsonDataFSIcon.archiv:
                iconText = '🗃️';
                break;
        }

        if (this._spanIcon) {
            this._spanIcon.textContent = iconText;
        }
    }

    /**
     * Set name
     * @param {name} name
     */
    public setName(name: string): void {
        this._name = name;
        this._spanName.textContent = name;
    }

    /**
     * Get name
     * @return {string}
     */
    public getName(): string {
        return this._name;
    }

    /**
     * Return the icon
     * @return {string}
     */
    public getIcon(): string {
        return this._icon;
    }

    /**
     * Set the icon
     * @param {string} icon
     */
    public setIcon(icon: SchemaJsonDataFSIcon|string): void {
        this._icon = icon;
        this._setIcon(icon);
    }

    /**
     * Get id
     * @return {string}
     */
    public getId(): string {
        return this.unid;
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
     * @return {JsonDataFS}
     */
    public getData(): JsonDataFS {
        const entrys: JsonDataFS[] = [];

        for (const [, entry] of this._list.entries()) {
            if (entry.getType() === SchemaJsonDataFSType.schema || entry.getType() === SchemaJsonDataFSType.enum) {
                continue;
            }

            entrys.push(entry.getData());
        }

        const enums: JsonEnumDescription[] = [];

        for (const aenum of this._enums) {
            enums.push(aenum.getData());
        }

        const schemas: JsonSchemaDescription[] = [];

        for (const table of this._tables) {
            schemas.push(table.getData());
        }

        return {
            unid: this.unid,
            name: this._name,
            type: this._type,
            icon: this._icon === '' ? undefined : this._icon,
            istoggle: this.isToggle(),
            entrys: entrys,
            schemas: schemas,
            enums: enums,
        };
    }

    /**
     * Set data
     * @param {JsonDataFS} data
     */
    public setData(data: JsonDataFS): void {
        this.unid = data.unid;
        this.setType(data.type);
        this.setName(data.name);

        if (data.icon) {
            this.setIcon(data.icon);
        }

        if (data.istoggle) {
            this.setToggle(data.istoggle);
        }

        for (const aEntry of data.entrys) {
            if (SchemaJsonDataFS.validate(aEntry, [])) {
                const entry = new TreeviewEntry(aEntry.unid, aEntry.name, aEntry.type);
                this.addEntry(entry);
                entry.setData(aEntry);
            }
        }

        if (data.enums) {
            for (const aEnum of data.enums) {
                const tenum = new EnumTable(aEnum.unid, aEnum.name);
                tenum.setData(aEnum);
                this.addEnumTable(tenum);
            }
        }

        for (const aSchema of data.schemas) {
            const schema = new SchemaTable(aSchema.unid, aSchema.name, aSchema.extend);
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

        const entry = new TreeviewEntry(table.getUnid(), table.getName(), SchemaJsonDataFSType.schema);
        this.addEntry(entry);

        table.setOnDelete(table1 => {
            window.dispatchEvent(new CustomEvent('schemaeditor:deleteschematable', {
                detail: {
                    id: table1.getUnid()
                }
            }));
        });
    }

    /**
     * Add enum table
     * @param {EnumTable} table
     */
    public addEnumTable(table: EnumTable): void {
        this._enums.push(table);

        const entry = new TreeviewEntry(table.getId(), table.getName(), SchemaJsonDataFSType.enum);
        this.addEntry(entry);

        table.setOnDelete(table1 => {
            window.dispatchEvent(new CustomEvent('schemaeditor:deleteenumtable', {
                detail: {
                    id: table1.getUnid()
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
            if (table.getUnid() === id) {
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
            if (table.getUnid() === id) {
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

    /**
     * Remove entrys
     */
    public removeEntrys(): void {
        for (const aenum of this._enums) {
            aenum.remove();
        }

        for (const atable of this._tables) {
            atable.remove();
        }

        for (const [, entry] of this._list.entries()) {
            entry.removeEntrys();
            this._liElement.removeChild(entry.getElement());
        }

        this._enums = [];
        this._tables = [];
        this._list.clear();
    }

    /**
     * Sorting entrys
     */
    public sortingEntrys(): void {
        for (const [, entry] of this._list.entries()) {
            entry.sortingEntrys();
        }

        this._list = new Map(
            Array.from(this._list.entries()).sort((
                [, a],
                [, b]
            ) => {
                const typeOrder = (type: string) => (type === 'folder' ? 0 : 1);
                const typeDiff = typeOrder(a.getType()) - typeOrder(b.getType());

                if (typeDiff !== 0) {
                    return typeDiff;
                }

                return a.getName().localeCompare(b.getName());
            })
        );
    }

    /**
     * Set an active name
     */
    public setActiveName(): void {
        if (this.getType() === SchemaJsonDataFSType.file) {
            this._spanName.classList.add('active');
        }

        if (this.getType() === SchemaJsonDataFSType.enum || this.getType() === SchemaJsonDataFSType.schema) {
            this._spanName.classList.add('active2');
        }
    }

    /**
     * Return the entry by id
     * @param {string} id
     */
    public getEntryById(id: string): TreeviewEntry|null {
        if (this.unid === id) {
            return this;
        }

        for (const [, enty] of this._list.entries()) {
            const tentry = enty.getEntryById(id);

            if (tentry !== null) {
                return tentry;
            }
        }

        return null;
    }

    public hasEntryWith(name: string, eType: string): boolean {
        for (const [, entry] of this._list.entries()) {
            if (entry.getName() === name && entry.getType() === eType) {
                return true;
            }
        }

        return false;
    }

    /**
     * Update view
     * @param {boolean} recursive
     */
    public updateView(recursive: boolean): void {
        if (this._type === SchemaJsonDataFSType.root || this._type === SchemaJsonDataFSType.folder) {
            this.setToggle(this.isToggle());
        }

        if (recursive) {
            for (const [, entry] of this._list.entries()) {
                entry.updateView(recursive);
            }
        }
    }

    /**
     * Find parent
     * @param {string} id
     * @return {TreeviewEntry|null}
     */
    public findParent(id: string): TreeviewEntry|null {
        for (const [, entry] of this._list.entries()) {
            if (entry.getId() === id) {
                return this;
            }

            const found = entry.findParent(id);

            if (found !== null) {
                return found;
            }
        }

        return null;
    }

    /**
     * splice a entry
     * @param {string} id
     * @return {TreeviewEntry|null}
     */
    public spliceEntry(id: string): TreeviewEntry|null {
        if (this._list.has(id)) {
            const entry = this._list.get(id);

            if (entry) {
                this._list.delete(id);

                return entry;
            }
        }

        return null;
    }

    /**
     * Get table by id
     * @param {string} tableId
     * @return {SchemaTable|null}
     */
    public getTableById(tableId: string): SchemaTable|null {
        for (const table of this._tables) {
            if (table.getUnid() === tableId) {
                return table;
            }
        }

        return null;
    }

    /**
     * Splice a table
     * @param {string} id
     * @return SchemaTable|null
     */
    public spliceTable(id: string): SchemaTable|null {
        const index = this._tables.findIndex(table => table.getUnid() === id);

        if (index !== -1) {
            return this._tables.splice(index, 1)[0];
        }

        return null;
    }

    /**
     * has table or enum name in this entry
     * @param {string} name
     * @return boolean
     */
    public hasTableOrEnumName(name: string): boolean {
        for (const table of this._tables) {
            if (table.getName() === name) {
                return true;
            }
        }

        for (const aenum of this._enums) {
            if (aenum.getName() === name) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get enum by id
     * @param {string} enumId
     * @return {EnumTable|null}
     */
    public getEnumById(enumId: string): EnumTable|null {
        for (const aenum of this._enums) {
            if (aenum.getId() === enumId) {
                return aenum;
            }
        }

        return null;
    }

    /**
     * Splice a enum
     * @param {string} id
     * @return {EnumTable|null}
     */
    public spliceEnum(id: string): EnumTable|null {
        const index = this._enums.findIndex(table => table.getId() === id);

        if (index !== -1) {
            return this._enums.splice(index, 1)[0];
        }

        return null;
    }

}
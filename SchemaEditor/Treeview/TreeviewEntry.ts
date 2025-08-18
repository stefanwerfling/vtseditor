import {EditorIcons} from '../Base/EditorIcons.js';
import {EnumTable} from '../Enum/EnumTable.js';
import {
    JsonDataFS,
    JsonEnumDescription,
    JsonLinkDescription,
    JsonSchemaDescription, JsonSchemaDescriptionExtend,
    SchemaJsonDataFS,
    SchemaJsonDataFSIcon,
    SchemaJsonDataFSType, SchemaJsonSchemaDescriptionExtend
} from '../JsonData.js';
import {LinkTable} from '../Link/LinkTable.js';
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
     * div button
     * @protected
     */
    protected _divButtons: HTMLDivElement;

    /**
     * Unid
     * @protected
     */
    protected _unid: string = '';

    /**
     * is the entry readonly
     * @protected
     */
    protected _readonly: boolean = false;

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
     * List of links
     * @protected
     */
    protected _links: LinkTable[] = [];

    /**
     * Constructor
     * @param {string} unid
     * @param {string} name
     * @param {SchemaJsonDataFSType|string} type
     * @param {string} icon
     */
    public constructor(
        unid: string = '',
        name: string = 'Root',
        type: SchemaJsonDataFSType|string = SchemaJsonDataFSType.root,
        icon: string = ''
    ) {
        this._unid = unid;

        if (type === SchemaJsonDataFSType.extern) {
            this._readonly = true;
        }

        this._ul = document.createElement('ul');
        this._liElement = document.createElement('li');

        const folderLine = document.createElement('div');
        folderLine.classList.add('folder-line');
        this._liElement.appendChild(folderLine);

        // toggle ------------------------------------------------------------------------------------------------------
        this._spanToggle = document.createElement('span');
        this._spanToggle.classList.add('toggle-icon');
        this._spanToggle.textContent = EditorIcons.toggle_open;
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

        this._divButtons = document.createElement('div');
        folderLine.appendChild(this._divButtons);

        // helper function ---------------------------------------------------------------------------------------------

        const getDialogTypes = (): Map<string, string> =>  {
            const types = new Map<string, string>();

            if (this._tables.length === 0) {
                types.set('folder', `${EditorIcons.folder} Folder`);
            }

            types.set('file', `${EditorIcons.file} File`);

            return types;
        };

        const getDialogIcons = (): Map<string, string> => {
            const icons = new Map<string, string>();

            icons.set('', 'None');
            icons.set(SchemaJsonDataFSIcon.package, `${EditorIcons.package} Package`);
            icons.set(SchemaJsonDataFSIcon.libary, `${EditorIcons.libary} Libary`);
            icons.set(SchemaJsonDataFSIcon.registry, `${EditorIcons.registry} Registry`);
            icons.set(SchemaJsonDataFSIcon.archiv, `${EditorIcons.archiv} Archiv`);

            return icons;
        };

        // add folder/file ---------------------------------------------------------------------------------------------

        if (type === SchemaJsonDataFSType.project || type === SchemaJsonDataFSType.folder) {
            const btnAdd = document.createElement('button');
            btnAdd.textContent = EditorIcons.add;
            btnAdd.classList.add('add-folder');
            btnAdd.addEventListener('click', () => {
                if (this._readonly) {
                    alert('Add new folder/file can not use by readonly!');
                    return;
                }

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

                    this._list.set(entry.getUnid(), entry);
                    this._liElement.appendChild(entry.getElement());

                    folderLine.classList.remove('folder-line-hover');

                    window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {}));

                    return true;
                });

                dialog.setOnClose(() => {
                    folderLine.classList.remove('folder-line-hover');
                });
            });

            this._divButtons.appendChild(btnAdd);
        }

        // add sorting -------------------------------------------------------------------------------------------------

        if (type === SchemaJsonDataFSType.root) {
            const btnSorting = document.createElement('button');
            btnSorting.textContent = EditorIcons.sort;
            btnSorting.classList.add('add-folder');
            btnSorting.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('schemaeditor:sortingentrys', {}));
            });

            this._divButtons.appendChild(btnSorting);
        }

        // edit folder/file --------------------------------------------------------------------------------------------

        if (type === SchemaJsonDataFSType.folder || type === SchemaJsonDataFSType.file) {
            const btnEdit = document.createElement('button');
            btnEdit.textContent = EditorIcons.edit;
            btnEdit.classList.add('add-folder');
            btnEdit.addEventListener('click', () => {
                if (this._readonly) {
                    alert('Edit folder/file can not use by readonly!');
                    return;
                }

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
                });
            });

            this._divButtons.appendChild(btnEdit);
        }

        // add button delete -------------------------------------------------------------------------------------------

        const allowDeleteTypes: SchemaJsonDataFSType|string[] = [
            SchemaJsonDataFSType.folder,
            SchemaJsonDataFSType.file
        ];

        if (allowDeleteTypes.indexOf(type) > -1) {
            const btnDelete = document.createElement('button');
            btnDelete.textContent = EditorIcons.delete;
            btnDelete.classList.add('delete-folder');
            btnDelete.addEventListener('click', () => {
                if (this._readonly) {
                    alert('Delete folder/file can not use by readonly!');
                    return;
                }

                window.dispatchEvent(new CustomEvent('schemaeditor:deletefolderfile', {
                    detail: {
                        id: this.getUnid()
                    }
                }));
            });

            this._divButtons.appendChild(btnDelete);
        }

        // set draggable -----------------------------------------------------------------------------------------------

        if (type === SchemaJsonDataFSType.file || type === SchemaJsonDataFSType.folder ||
            type === SchemaJsonDataFSType.schema || type === SchemaJsonDataFSType.enum)
        {
            folderLine.draggable = true;
            folderLine.addEventListener('dragstart', e => {
                if (this._readonly) {
                    if (type === SchemaJsonDataFSType.file || type === SchemaJsonDataFSType.folder) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                }

                e.dataTransfer?.setData('type', this.getType());
                e.dataTransfer?.setData('id', this.getUnid());
                folderLine.classList.add('dragging');

                if (this.getType() === SchemaJsonDataFSType.schema || this.getType() === SchemaJsonDataFSType.enum) {
                    const activeEntry = Treeview.getActiveEntry();

                    if (activeEntry) {
                        const tables = activeEntry.getSchemaTables();

                        for (const table of tables) {
                            if (this.getUnid() !== table.getUnid()) {
                                table.showDropArea(true);
                            }
                        }
                    }
                }
            });
        }

        folderLine.addEventListener('dragover', e => {
            if (this._readonly) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

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
            if (this._readonly) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            const type = e.dataTransfer?.getData('type');

            switch (this.getType()) {
                case SchemaJsonDataFSType.folder:
                    if (type === SchemaJsonDataFSType.file || type === SchemaJsonDataFSType.folder) {
                        window.dispatchEvent(new CustomEvent('schemaeditor:moveto', {
                            detail: {
                                sourceType: type,
                                destinationType: this.getType(),
                                sourceId: e.dataTransfer?.getData('id'),
                                detionationId: this.getUnid()
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
                                detionationId: this.getUnid()
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
     * Is this entry only read
     * @return {boolean}
     */
    public isReadOnly(): boolean {
        return this._readonly;
    }

    /**
     * Set readonly
     * @param {boolean} readOnly
     */
    public setReadOnly(readOnly: boolean): void {
        this._readonly = readOnly;

        if (this._readonly) {
            this._divButtons.style.display = 'none';
        } else {
            this._divButtons.style.display = '';
        }
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
            this._spanToggle.textContent = EditorIcons.toggle_open;
        } else {
            line.classList.remove('open');
            this._spanToggle.textContent = EditorIcons.toggle_close;
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
        let iconText: string = EditorIcons.unknown;

        switch (icon) {
            case SchemaJsonDataFSType.root:
                iconText = EditorIcons.root;
                break;

            case SchemaJsonDataFSType.project:
                iconText = EditorIcons.project;
                break;

            case SchemaJsonDataFSType.extern:
                iconText = EditorIcons.package;
                break;

            case SchemaJsonDataFSType.folder:
                iconText = EditorIcons.folder;

                if (this.isToggle()) {
                    iconText = EditorIcons.folder_open;
                }

                break;

            case SchemaJsonDataFSType.file:
                iconText = EditorIcons.file;
                break;

            case SchemaJsonDataFSType.schema:
                iconText = EditorIcons.schema;
                break;

            case SchemaJsonDataFSType.enum:
                iconText = EditorIcons.enum;
                break;

            case SchemaJsonDataFSIcon.package:
                iconText = EditorIcons.package;
                break;

            case SchemaJsonDataFSIcon.libary:
                iconText = EditorIcons.libary;
                break;

            case SchemaJsonDataFSIcon.registry:
                iconText = EditorIcons.registry;
                break;

            case SchemaJsonDataFSIcon.archiv:
                iconText = EditorIcons.archiv;
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
        let mIcon = icon;

        if (mIcon === '') {
            if (this._type !== '') {
                mIcon = this._type;
            }
        }

        this._icon = mIcon;
        this._setIcon(mIcon);
    }

    /**
     * Get unid
     * @return {string}
     */
    public getUnid(): string {
        return this._unid;
    }

    /**
     * Add an entry
     * @param {TreeviewEntry} entry
     */
    public addEntry(entry: TreeviewEntry): void {
        if (this._type !== SchemaJsonDataFSType.root) {
            entry.setReadOnly(this._readonly);
        }

        this._list.set(entry.getUnid(), entry);
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

        // enums -------------------------------------------------------------------------------------------------------

        const enums: JsonEnumDescription[] = [];

        for (const aenum of this._enums) {
            enums.push(aenum.getData());
        }

        // schemas -----------------------------------------------------------------------------------------------------

        const schemas: JsonSchemaDescription[] = [];

        for (const table of this._tables) {
            schemas.push(table.getData());
        }

        // links -------------------------------------------------------------------------------------------------------

        const links: JsonLinkDescription[] = [];

        for (const link of this._links) {
            links.push(link.getData());
        }

        // -------------------------------------------------------------------------------------------------------------

        return {
            unid: this._unid,
            name: this._name,
            type: this._type,
            icon: this._icon === '' ? undefined : this._icon,
            istoggle: this.isToggle(),
            entrys: entrys,
            schemas: schemas,
            enums: enums,
            links: links
        };
    }

    /**
     * Set data
     * @param {JsonDataFS} data
     */
    public setData(data: JsonDataFS): void {
        this._unid = data.unid;
        this.setType(data.type);
        this.setName(data.name);

        if (data.icon) {
            this.setIcon(data.icon);
        }

        if (data.istoggle) {
            this.setToggle(data.istoggle);
        }

        // entrys ------------------------------------------------------------------------------------------------------

        for (const aEntry of data.entrys) {
            if (SchemaJsonDataFS.validate(aEntry, [])) {
                const entry = new TreeviewEntry(aEntry.unid, aEntry.name, aEntry.type);
                this.addEntry(entry);
                entry.setData(aEntry);
            }
        }

        // enums -------------------------------------------------------------------------------------------------------

        if (data.enums) {
            for (const aEnum of data.enums) {
                const tenum = new EnumTable(aEnum.unid, aEnum.name);
                tenum.setData(aEnum);
                this.addEnumTable(tenum);
            }
        }

        // schemas -----------------------------------------------------------------------------------------------------

        for (const aSchema of data.schemas) {
            let extend: JsonSchemaDescriptionExtend|null = null;

            if (SchemaJsonSchemaDescriptionExtend.validate(aSchema.extend, [])) {
                extend = aSchema.extend;
            }

            const schema = new SchemaTable(aSchema.unid, aSchema.name, extend);
            schema.setData(aSchema);
            this.addSchemaTable(schema);
        }

        // links -------------------------------------------------------------------------------------------------------

        if (data.links) {
            for (const aLink of data.links) {
                const link = new LinkTable(aLink.unid, aLink.link_unid);
                link.setData(aLink);
                this.addLinkTable(link);
            }
        }
    }

    /**
     * Add schema table
     * @param {SchemaTable} table
     */
    public addSchemaTable(table: SchemaTable): void {
        table.setReadOnly(this._readonly);
        this._tables.push(table);

        const entry = new TreeviewEntry(
            table.getUnid(),
            table.getName(),
            SchemaJsonDataFSType.schema
        );

        this.addEntry(entry);
    }

    /**
     * Add enum table
     * @param {EnumTable} table
     */
    public addEnumTable(table: EnumTable): void {
        table.setReadOnly(this._readonly);
        this._enums.push(table);

        const entry = new TreeviewEntry(table.getUnid(), table.getName(), SchemaJsonDataFSType.enum);
        this.addEntry(entry);
    }

    /**
     * Add link table
     * @param {LinkTable} table
     */
    public addLinkTable(table: LinkTable): void {
        this._links.push(table);
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
     * Return link tables
     * @return {LinkTable[]}
     */
    public getLinkTables(): LinkTable[] {
        return this._links;
    }

    /**
     * Is schema table use
     * @param {string} unid
     * @return {boolean}
     */
    public isSchemaTableUse(unid: string): boolean {
        for (const [, entry] of this._list.entries()) {
            if (entry.isSchemaTableUse(unid)) {
                return true;
            }
        }

        for (const table of this._tables) {
            if (table.getUnid() === unid) {
                continue;
            }

            if (table.isSchemaTableUse(unid)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Remove a Schema table
     * @param {string} unid
     * @return {boolean}
     */
    public removeSchemaTable(unid: string): boolean {
        for (let i = 0; i < this._tables.length; i++) {
            const table = this._tables[i];

            if (table.getUnid() === unid) {
                table.remove();
                this._tables.splice(i, 1);
                return true;
            }
        }

        for (const [, entry] of this._list.entries()) {
            if (entry.removeSchemaTable(unid)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Remove an enum table
     * @param {string} unid
     * @return {boolean}
     */
    public removeEnumTable(unid: string): boolean {
        for (let i = 0; i < this._enums.length; i++) {
            const table = this._enums[i];

            if (table.getUnid() === unid) {
                table.remove();
                this._enums.splice(i, 1);
                return true;
            }
        }

        for (const [, entry] of this._list.entries()) {
            if (entry.removeEnumTable(unid)) {
                return true;
            }
        }

        return false;
    }

    /**
     * removeLinkTable
     * @param {string} objectUnid
     * @return {boolean}
     */
    public removeLinkTable(objectUnid: string): boolean {
        for (let i = 0; i < this._links.length; i++) {
            const table = this._links[i];

            if (table.getLinkObjectUnid() === objectUnid) {
                this._links.splice(i, 1);
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
     * @param {string} unid
     * @return {TreeviewEntry|null}
     */
    public getEntryById(unid: string): TreeviewEntry|null {
        if (this._unid === unid) {
            return this;
        }

        for (const [, enty] of this._list.entries()) {
            const tentry = enty.getEntryById(unid);

            if (tentry !== null) {
                return tentry;
            }
        }

        return null;
    }

    /**
     * has entry with
     * @param {string} name
     * @param {string} eType
     * @return {boolean}
     */
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
     * @param {string} unid
     * @return {TreeviewEntry|null}
     */
    public findEntry(unid: string): TreeviewEntry|null {
        for (const [, entry] of this._list.entries()) {
            if (entry.getUnid() === unid) {
                return this;
            }

            const found = entry.findEntry(unid);

            if (found !== null) {
                return found;
            }
        }

        return null;
    }

    /**
     * find parent entry
     * @param {string} unid
     * @return {TreeviewEntry|null}
     */
    public findParentEntry(unid: string): TreeviewEntry|null {
        if (this.hasEntry(unid)) {
            return this;
        }

        for (const [, entry] of this._list.entries()) {
            if (entry.hasEntry(unid)) {
                return entry;
            }

            const tentry = entry.findParentEntry(unid);

            if (tentry !== null) {
                return tentry;
            }
        }

        return null;
    }

    /**
     * splice an entry
     * @param {string} unid
     * @return {TreeviewEntry|null}
     */
    public spliceEntry(unid: string): TreeviewEntry|null {
        if (this._list.has(unid)) {
            const entry = this._list.get(unid);

            if (entry) {
                this._list.delete(unid);

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
     * @param {string} unid
     * @return {SchemaTable|null}
     */
    public spliceTable(unid: string): SchemaTable|null {
        const index = this._tables.findIndex(table => table.getUnid() === unid);

        if (index !== -1) {
            return this._tables.splice(index, 1)[0];
        }

        return null;
    }

    /**
     * has table or enum name in this entry
     * @param {string} name
     * @return {boolean}
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
            if (aenum.getUnid() === enumId) {
                return aenum;
            }
        }

        return null;
    }

    /**
     * Splice a enum
     * @param {string} unid
     * @return {EnumTable|null}
     */
    public spliceEnum(unid: string): EnumTable|null {
        const index = this._enums.findIndex(table => table.getUnid() === unid);

        if (index !== -1) {
            return this._enums.splice(index, 1)[0];
        }

        return null;
    }

    /**
     * Remove a children entry
     * @param {string} unid
     * @return {boolean}
     */
    public removeEntry(unid: string): boolean {
        const aEntry = this._list.get(unid);

        if (aEntry) {
            const allowDirectDeleteType: SchemaJsonDataFSType|string[] = [
                SchemaJsonDataFSType.folder,
                SchemaJsonDataFSType.file,
                SchemaJsonDataFSType.enum,
                SchemaJsonDataFSType.schema,
                SchemaJsonDataFSType.link
            ];

            if (allowDirectDeleteType.indexOf(aEntry.getType()) > -1) {
                aEntry.removeEntrys();
                this._list.delete(unid);

                return true;
            }
        }

        return false;
    }

    /**
     * Is Empty
     * @return {boolean}
     */
    public isEmpty(): boolean {
        return this._list.size === 0 && this._tables.length === 0 && this._enums.length === 0;
    }

    /**
     * Has entry by unid
     * @param {string} unid
     * @return {boolean}
     */
    public hasEntry(unid: string): boolean {
        return this._list.has(unid);
    }

    /**
     * Has a link object
     * @param {string} objectUnid
     * @return {boolean}
     */
    public hasLinkObject(objectUnid: string): boolean {
        for (const link of this._links) {
            if (link.getLinkObjectUnid() === objectUnid) {
                return true;
            }
        }

        return false;
    }

    /**
     * Return a link table by object unid
     * @param {string} objectUnid
     * @return {LinkTable|null}
     */
    public getLinkTableByObjectUnid(objectUnid: string): LinkTable|null {
        for (const link of this._links) {
            if (link.getLinkObjectUnid() === objectUnid) {
                return link;
            }
        }

        return null;
    }

}
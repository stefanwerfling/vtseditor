import './ExtendFieldSelect.css';
import {SchemaTypes} from '../Register/SchemaTypes.js';
import {EditorIcons} from './EditorIcons.js';

/**
 * Extend field select category
 */
export enum ExtendFieldSelectCategory {
    'all' = 'all',
    'vtstype' = 'vtstype',
    'schema' = 'schema',
    'enum' = 'enum'
}

/**
 * Extend field select event change
 */
export type ExtendFieldSelectEventChange = (value: string) => void;

type CategoryMeta = {
    cat: ExtendFieldSelectCategory;
    icon: string;
    label: string;
};

type VisibleOption = {
    id: string;
    title: string;
    category: ExtendFieldSelectCategory;
    element: HTMLDivElement;
};

const GROUPED_CATEGORIES: CategoryMeta[] = [
    {cat: ExtendFieldSelectCategory.vtstype, icon: EditorIcons.vts, label: 'VTS Type'},
    {cat: ExtendFieldSelectCategory.schema, icon: EditorIcons.schema, label: 'Schema'},
    {cat: ExtendFieldSelectCategory.enum, icon: EditorIcons.enum, label: 'Enum'}
];

const TAB_HEADERS: CategoryMeta[] = [
    {cat: ExtendFieldSelectCategory.all, icon: '', label: 'All'},
    ...GROUPED_CATEGORIES
];

const PLACEHOLDER_TEXT = 'Please select...';

/**
 * ExtendFieldSelect
 */
export class ExtendFieldSelect {

    protected _divSelect: HTMLDivElement;
    protected _divToggle: HTMLDivElement;
    protected _divMain: HTMLDivElement;
    protected _divHeaders: HTMLDivElement;
    protected _divSearch: HTMLDivElement;
    protected _inputSearch: HTMLInputElement;
    protected _divOptions: HTMLDivElement;

    protected _currentCategory: ExtendFieldSelectCategory|string = ExtendFieldSelectCategory.all;
    protected _optionsData: Map<string, Map<string, string>> = new Map<string, Map<string, string>>();
    protected _selectedId: string | null = null;
    protected _onChange: ExtendFieldSelectEventChange|null = null;

    protected _listboxId: string;
    protected _headerCountElements: Map<string, HTMLSpanElement> = new Map();
    protected _visibleOptions: VisibleOption[] = [];
    protected _activeIndex: number = -1;
    protected _documentClickHandler: (e: MouseEvent) => void;

    /**
     * Constructor
     * @param {string} tableUnid
     * @param {boolean} withoutComplexVTS
     */
    public constructor(tableUnid: string, withoutComplexVTS: boolean = false) {
        this._listboxId = `extendfield-listbox-${Math.random().toString(36).slice(2, 10)}`;

        // wrapper
        this._divSelect = document.createElement('div');
        this._divSelect.classList.add('extendfield-select-wrapper');

        // toggle
        this._divToggle = document.createElement('div');
        this._divToggle.classList.add('extendfield-select-toggle', 'is-placeholder');
        this._divToggle.textContent = PLACEHOLDER_TEXT;
        this._divToggle.setAttribute('role', 'combobox');
        this._divToggle.setAttribute('aria-haspopup', 'listbox');
        this._divToggle.setAttribute('aria-expanded', 'false');
        this._divToggle.setAttribute('aria-controls', this._listboxId);
        this._divToggle.setAttribute('tabindex', '0');

        this._divSelect.appendChild(this._divToggle);

        // main
        this._divMain = document.createElement('div');
        this._divMain.classList.add('extendfield-select');
        this._divSelect.appendChild(this._divMain);

        // headers -----------------------------------------------------------------------------------------------------
        this._divHeaders = document.createElement('div');
        this._divHeaders.classList.add('extendfield-select-headers');
        this._divHeaders.setAttribute('role', 'tablist');
        this._divMain.appendChild(this._divHeaders);

        for (const meta of TAB_HEADERS) {
            const header = document.createElement('div');
            header.classList.add('extendfield-section-header');

            if (meta.cat === this._currentCategory) {
                header.classList.add('active');
            }

            header.setAttribute('data-category', meta.cat);
            header.setAttribute('role', 'tab');

            const labelSpan = document.createElement('span');
            labelSpan.classList.add('extendfield-section-header-label');
            labelSpan.textContent = meta.icon ? `${meta.icon} ${meta.label}` : meta.label;
            header.appendChild(labelSpan);

            const countSpan = document.createElement('span');
            countSpan.classList.add('extendfield-section-header-count');
            header.appendChild(countSpan);

            this._headerCountElements.set(meta.cat, countSpan);
            this._divHeaders.appendChild(header);
        }

        // search box --------------------------------------------------------------------------------------------------
        this._divSearch = document.createElement('div');
        this._divSearch.classList.add('extendfield-search-box');
        this._divMain.appendChild(this._divSearch);

        this._inputSearch = document.createElement('input');
        this._inputSearch.type = 'text';
        this._inputSearch.placeholder = 'Search...';
        this._inputSearch.setAttribute('aria-label', 'Search types');
        this._divSearch.appendChild(this._inputSearch);

        // options -----------------------------------------------------------------------------------------------------
        this._divOptions = document.createElement('div');
        this._divOptions.classList.add('extendfield-options');
        this._divOptions.setAttribute('role', 'listbox');
        this._divOptions.id = this._listboxId;
        this._divMain.appendChild(this._divOptions);

        // close-on-outside-click — reference kept so destroy() can remove it
        this._documentClickHandler = (e: MouseEvent) => {
            const target = e.target;
            if (target instanceof HTMLElement && target.closest('.extendfield-select-wrapper') !== this._divSelect) {
                this._close();
            }
        };

        this._registerEvents();

        // add options
        if (withoutComplexVTS) {
            this.setOptions(SchemaTypes.getInstance().getExtendVtsSimpleTypes(), ExtendFieldSelectCategory.vtstype);
        } else {
            this.setOptions(SchemaTypes.getInstance().getExtendVtsTypes(), ExtendFieldSelectCategory.vtstype);
        }

        this.setOptions(SchemaTypes.getInstance().getSchemaTypes([tableUnid]), ExtendFieldSelectCategory.schema);
        this.setOptions(SchemaTypes.getInstance().getEnumTypes([tableUnid]), ExtendFieldSelectCategory.enum);
    }

    /**
     * Register events
     * @protected
     */
    protected _registerEvents(): void {
        this._divHeaders.addEventListener('click', (e) => {
            const target = e.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            const header = target.closest('.extendfield-section-header');
            if (!header || !(header instanceof HTMLElement)) {
                return;
            }

            const cat = header.getAttribute('data-category');
            if (!cat) {
                return;
            }

            this._divHeaders.querySelectorAll('.extendfield-section-header').forEach(h => h.classList.remove('active'));
            header.classList.add('active');
            this._currentCategory = cat;

            this._renderOptions(this._inputSearch.value);
            this._setActiveIndex(this._visibleOptions.length > 0 ? 0 : -1);
            this._inputSearch.focus();
        });

        this._inputSearch.addEventListener('input', () => {
            this._renderOptions(this._inputSearch.value);
            this._setActiveIndex(this._visibleOptions.length > 0 ? 0 : -1);
        });

        this._divToggle.addEventListener('click', () => {
            this._toggleOpen();
        });

        this._divSelect.addEventListener('keydown', (e) => this._handleKeyDown(e));

        document.addEventListener('click', this._documentClickHandler);
    }

    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} e
     * @protected
     */
    protected _handleKeyDown(e: KeyboardEvent): void {
        const isOpen = this._divMain.classList.contains('open');

        if (!isOpen) {
            if (document.activeElement === this._divToggle &&
                (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
                e.preventDefault();
                this._open();
            }
            return;
        }

        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                this._close();
                this._divToggle.focus();
                break;

            case 'ArrowDown':
                e.preventDefault();
                this._moveActive(1);
                break;

            case 'ArrowUp':
                e.preventDefault();
                this._moveActive(-1);
                break;

            case 'Home':
                if (e.target !== this._inputSearch) {
                    e.preventDefault();
                    this._setActiveIndex(0);
                }
                break;

            case 'End':
                if (e.target !== this._inputSearch) {
                    e.preventDefault();
                    this._setActiveIndex(this._visibleOptions.length - 1);
                }
                break;

            case 'Enter':
                if (this._activeIndex >= 0 && this._activeIndex < this._visibleOptions.length) {
                    e.preventDefault();
                    const opt = this._visibleOptions[this._activeIndex];
                    this._selectOption(opt.id, opt.title, opt.category);
                }
                break;
        }
    }

    /**
     * Open the dropdown
     * @protected
     */
    protected _open(): void {
        this._divMain.classList.add('open');
        this._divToggle.setAttribute('aria-expanded', 'true');
        this._renderOptions(this._inputSearch.value);

        requestAnimationFrame(() => {
            this._applyFlipDirection();
            this._inputSearch.focus();

            const selectedIdx = this._visibleOptions.findIndex(o => o.id === this._selectedId);
            this._setActiveIndex(selectedIdx >= 0 ? selectedIdx : (this._visibleOptions.length > 0 ? 0 : -1));
        });
    }

    /**
     * Close the dropdown
     * @protected
     */
    protected _close(): void {
        this._divMain.classList.remove('open', 'flip-up');
        this._divToggle.setAttribute('aria-expanded', 'false');
        this._divToggle.removeAttribute('aria-activedescendant');
        this._activeIndex = -1;
    }

    /**
     * Toggle open/close
     * @protected
     */
    protected _toggleOpen(): void {
        if (this._divMain.classList.contains('open')) {
            this._close();
        } else {
            this._open();
        }
    }

    /**
     * Flip dropdown above the toggle when there is more room there than below.
     * Measured after the dropdown is visible so offsetHeight is accurate.
     * @protected
     */
    protected _applyFlipDirection(): void {
        const rect = this._divSelect.getBoundingClientRect();
        const dropdownHeight = this._divMain.offsetHeight || 320;
        const spaceBelow = window.innerHeight - rect.bottom - 16;
        const spaceAbove = rect.top - 16;

        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
            this._divMain.classList.add('flip-up');
        } else {
            this._divMain.classList.remove('flip-up');
        }
    }

    /**
     * Move active option by delta (for keyboard navigation)
     * @param {number} delta
     * @protected
     */
    protected _moveActive(delta: number): void {
        if (this._visibleOptions.length === 0) {
            return;
        }

        let next = this._activeIndex + delta;

        if (next < 0) {
            next = 0;
        }

        if (next >= this._visibleOptions.length) {
            next = this._visibleOptions.length - 1;
        }

        this._setActiveIndex(next);
    }

    /**
     * Set active option index and keep it in view
     * @param {number} index
     * @protected
     */
    protected _setActiveIndex(index: number): void {
        if (this._activeIndex >= 0 && this._activeIndex < this._visibleOptions.length) {
            this._visibleOptions[this._activeIndex].element.classList.remove('active');
        }

        this._activeIndex = index;

        if (index >= 0 && index < this._visibleOptions.length) {
            const curr = this._visibleOptions[index];
            curr.element.classList.add('active');
            this._divToggle.setAttribute('aria-activedescendant', curr.element.id);
            curr.element.scrollIntoView({block: 'nearest'});
        } else {
            this._divToggle.removeAttribute('aria-activedescendant');
        }
    }

    /**
     * Render options based on current category + filter.
     * Rebuilds _visibleOptions and updates tab counts.
     * @param {string} filter
     * @protected
     */
    protected _renderOptions(filter: string = ''): void {
        this._divOptions.innerHTML = '';
        this._visibleOptions = [];

        const normalizedFilter = filter.trim().toLowerCase();
        const matches = new Map<string, Array<{id: string; title: string; icon: string}>>();
        let total = 0;

        for (const meta of GROUPED_CATEGORIES) {
            const entries = this._optionsData.get(meta.cat);
            const arr: Array<{id: string; title: string; icon: string}> = [];

            if (entries) {
                for (const [id, title] of entries) {
                    if (!normalizedFilter || title.toLowerCase().includes(normalizedFilter)) {
                        arr.push({id, title, icon: meta.icon});
                    }
                }
            }

            matches.set(meta.cat, arr);
            total += arr.length;
        }

        this._updateHeaderCounts(matches, total);

        if (total === 0) {
            const empty = document.createElement('div');
            empty.classList.add('extendfield-options-empty');
            empty.textContent = 'No matches';
            this._divOptions.appendChild(empty);
            return;
        }

        const isAll = this._currentCategory === ExtendFieldSelectCategory.all;

        if (isAll) {
            for (const meta of GROUPED_CATEGORIES) {
                const arr = matches.get(meta.cat) ?? [];
                if (arr.length === 0) {
                    continue;
                }

                const group = document.createElement('div');
                group.classList.add('extendfield-options-group');

                const groupHeader = document.createElement('div');
                groupHeader.classList.add('extendfield-options-group-header');
                groupHeader.textContent = `${meta.icon} ${meta.label}`;
                group.appendChild(groupHeader);

                for (const {id, title, icon} of arr) {
                    group.appendChild(this._createOptionElement(id, title, icon, meta.cat));
                }

                this._divOptions.appendChild(group);
            }
        } else {
            const arr = matches.get(this._currentCategory) ?? [];
            const meta = GROUPED_CATEGORIES.find(c => c.cat === this._currentCategory);
            const icon = meta?.icon ?? EditorIcons.vts;
            const cat = (meta?.cat ?? ExtendFieldSelectCategory.vtstype) as ExtendFieldSelectCategory;

            for (const {id, title} of arr) {
                this._divOptions.appendChild(this._createOptionElement(id, title, icon, cat));
            }
        }
    }

    /**
     * Create a single option element and register it in _visibleOptions
     * @protected
     */
    protected _createOptionElement(id: string, title: string, icon: string, category: ExtendFieldSelectCategory): HTMLDivElement {
        const div = document.createElement('div');
        div.classList.add('extendfield-option');
        div.setAttribute('role', 'option');
        div.id = `${this._listboxId}-opt-${this._visibleOptions.length}`;
        div.textContent = `${icon} ${title}`;

        if (id === this._selectedId) {
            div.classList.add('selected');
            div.setAttribute('aria-selected', 'true');
        } else {
            div.setAttribute('aria-selected', 'false');
        }

        div.addEventListener('click', () => {
            this._selectOption(id, title, category);
        });

        div.addEventListener('mouseenter', () => {
            const idx = this._visibleOptions.findIndex(o => o.element === div);

            if (idx >= 0) {
                this._setActiveIndex(idx);
            }
        });

        this._visibleOptions.push({id, title, category, element: div});
        return div;
    }

    /**
     * Update the numeric counters shown on each tab header
     * @protected
     */
    protected _updateHeaderCounts(
        matches: Map<string, Array<{id: string; title: string; icon: string}>>,
        total: number
    ): void {
        for (const [cat, el] of this._headerCountElements) {
            if (cat === ExtendFieldSelectCategory.all) {
                el.textContent = String(total);
            } else {
                el.textContent = String(matches.get(cat)?.length ?? 0);
            }
        }
    }

    /**
     * Commit selection, update toggle label, close dropdown, fire callback
     * @protected
     */
    protected _selectOption(id: string, title: string, category: ExtendFieldSelectCategory|string): void {
        this._selectedId = id;
        const icon = this._getIconFor(category);
        this._divToggle.textContent = `${icon} ${title}`;
        this._divToggle.classList.remove('is-placeholder');
        this._close();
        this._divToggle.focus();

        if (this._onChange) {
            this._onChange(id);
        }
    }

    /**
     * Get the icon for a category
     * @protected
     */
    protected _getIconFor(category: ExtendFieldSelectCategory|string): string {
        switch (category) {
            case ExtendFieldSelectCategory.vtstype: return EditorIcons.vts;
            case ExtendFieldSelectCategory.schema: return EditorIcons.schema;
            case ExtendFieldSelectCategory.enum: return EditorIcons.enum;
            default: return EditorIcons.vts;
        }
    }

    /**
     * Return the wrapper element
     * @return {HTMLDivElement}
     */
    public getElement(): HTMLDivElement {
        return this._divSelect;
    }

    /**
     * Set options
     * @param {Map<string, string>} data
     * @param {ExtendFieldSelectCategory|string} category
     */
    public setOptions(data: Map<string, string>, category: ExtendFieldSelectCategory|string): void {
        this._optionsData.set(category, data);
    }

    /**
     * Return the value
     * @return {string|null}
     */
    public getValue(): string | null {
        return this._selectedId ?? null;
    }

    /**
     * Set the value
     * @param {string} id
     */
    public setValue(id: string): void {
        for (const [category, options] of this._optionsData) {
            if (options.has(id)) {
                const title = options.get(id)!;
                const icon = this._getIconFor(category);

                this._selectedId = id;
                this._divToggle.textContent = `${icon} ${title}`;
                this._divToggle.classList.remove('is-placeholder');
                return;
            }
        }

        this._selectedId = null;
        this._divToggle.textContent = PLACEHOLDER_TEXT;
        this._divToggle.classList.add('is-placeholder');
    }

    /**
     * Set event change
     * @param {ExtendFieldSelectEventChange|null} change
     */
    public setEventChange(change: ExtendFieldSelectEventChange|null): void {
        this._onChange = change;
    }

    /**
     * Dispose the component: removes the global click listener and the DOM wrapper.
     * Owners should call this when the surrounding row/table is removed.
     */
    public destroy(): void {
        document.removeEventListener('click', this._documentClickHandler);
        this._divSelect.remove();
    }
}
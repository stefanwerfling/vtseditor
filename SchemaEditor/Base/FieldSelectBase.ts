import './FieldSelectBase.css';
import {EditorIcons} from './EditorIcons.js';

/**
 * Field select category
 */
export enum FieldSelectCategory {
    all = 'all',
    vtstype = 'vtstype',
    schema = 'schema',
    enum = 'enum'
}

/**
 * Field select event change
 */
export type FieldSelectEventChange = (value: string) => void;

type CategoryMeta = {
    cat: FieldSelectCategory;
    icon: string;
    label: string;
};

type VisibleOption = {
    id: string;
    title: string;
    category: FieldSelectCategory;
    element: HTMLDivElement;
};

const GROUPED_CATEGORIES: CategoryMeta[] = [
    {cat: FieldSelectCategory.vtstype, icon: EditorIcons.vts, label: 'VTS Type'},
    {cat: FieldSelectCategory.schema, icon: EditorIcons.schema, label: 'Schema'},
    {cat: FieldSelectCategory.enum, icon: EditorIcons.enum, label: 'Enum'}
];

const TAB_HEADERS: CategoryMeta[] = [
    {cat: FieldSelectCategory.all, icon: '', label: 'All'},
    ...GROUPED_CATEGORIES
];

const PLACEHOLDER_TEXT = 'Please select...';
const WRAPPER_SELECTOR = '.fieldselect-wrapper';

/**
 * Shared implementation for TypeFieldSelect and ExtendFieldSelect.
 * Subclasses only need to populate options via setOptions() in their constructor.
 */
export class FieldSelectBase {

    protected _divSelect: HTMLDivElement;
    protected _divToggle: HTMLDivElement;
    protected _divMain: HTMLDivElement;
    protected _divHeaders: HTMLDivElement;
    protected _divSearch: HTMLDivElement;
    protected _inputSearch: HTMLInputElement;
    protected _divOptions: HTMLDivElement;

    protected _currentCategory: FieldSelectCategory|string = FieldSelectCategory.all;
    protected _optionsData: Map<string, Map<string, string>> = new Map<string, Map<string, string>>();
    protected _selectedId: string | null = null;
    protected _onChange: FieldSelectEventChange|null = null;

    protected _listboxId: string;
    protected _headerCountElements: Map<string, HTMLSpanElement> = new Map();
    protected _visibleOptions: VisibleOption[] = [];
    protected _activeIndex: number = -1;
    protected _documentClickHandler: (e: MouseEvent) => void;

    public constructor() {
        this._listboxId = `fieldselect-listbox-${Math.random().toString(36).slice(2, 10)}`;

        this._divSelect = document.createElement('div');
        this._divSelect.classList.add('fieldselect-wrapper');

        this._divToggle = document.createElement('div');
        this._divToggle.classList.add('fieldselect-toggle', 'is-placeholder');
        this._divToggle.textContent = PLACEHOLDER_TEXT;
        this._divToggle.setAttribute('role', 'combobox');
        this._divToggle.setAttribute('aria-haspopup', 'listbox');
        this._divToggle.setAttribute('aria-expanded', 'false');
        this._divToggle.setAttribute('aria-controls', this._listboxId);
        this._divToggle.setAttribute('tabindex', '0');
        this._divSelect.appendChild(this._divToggle);

        this._divMain = document.createElement('div');
        this._divMain.classList.add('fieldselect-panel');
        this._divSelect.appendChild(this._divMain);

        this._divHeaders = document.createElement('div');
        this._divHeaders.classList.add('fieldselect-headers');
        this._divHeaders.setAttribute('role', 'tablist');
        this._divMain.appendChild(this._divHeaders);

        for (const meta of TAB_HEADERS) {
            const header = document.createElement('div');
            header.classList.add('fieldselect-header');

            if (meta.cat === this._currentCategory) {
                header.classList.add('active');
            }

            header.setAttribute('data-category', meta.cat);
            header.setAttribute('role', 'tab');

            const labelSpan = document.createElement('span');
            labelSpan.classList.add('fieldselect-header-label');
            labelSpan.textContent = meta.icon ? `${meta.icon} ${meta.label}` : meta.label;
            header.appendChild(labelSpan);

            const countSpan = document.createElement('span');
            countSpan.classList.add('fieldselect-header-count');
            header.appendChild(countSpan);

            this._headerCountElements.set(meta.cat, countSpan);
            this._divHeaders.appendChild(header);
        }

        this._divSearch = document.createElement('div');
        this._divSearch.classList.add('fieldselect-search');
        this._divMain.appendChild(this._divSearch);

        this._inputSearch = document.createElement('input');
        this._inputSearch.type = 'text';
        this._inputSearch.placeholder = 'Search...';
        this._inputSearch.setAttribute('aria-label', 'Search types');
        this._divSearch.appendChild(this._inputSearch);

        this._divOptions = document.createElement('div');
        this._divOptions.classList.add('fieldselect-options');
        this._divOptions.setAttribute('role', 'listbox');
        this._divOptions.id = this._listboxId;
        this._divMain.appendChild(this._divOptions);

        this._documentClickHandler = (e: MouseEvent) => {
            const target = e.target;
            if (target instanceof HTMLElement && target.closest(WRAPPER_SELECTOR) !== this._divSelect) {
                this._close();
            }
        };

        this._registerEvents();
    }

    protected _registerEvents(): void {
        this._divHeaders.addEventListener('click', (e) => {
            const target = e.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            const header = target.closest('.fieldselect-header');
            if (!header || !(header instanceof HTMLElement)) {
                return;
            }

            const cat = header.getAttribute('data-category');
            if (!cat) {
                return;
            }

            this._divHeaders.querySelectorAll('.fieldselect-header').forEach(h => h.classList.remove('active'));
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

    protected _close(): void {
        this._divMain.classList.remove('open', 'flip-up');
        this._divToggle.setAttribute('aria-expanded', 'false');
        this._divToggle.removeAttribute('aria-activedescendant');
        this._activeIndex = -1;
    }

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
            empty.classList.add('fieldselect-options-empty');
            empty.textContent = 'No matches';
            this._divOptions.appendChild(empty);
            return;
        }

        const isAll = this._currentCategory === FieldSelectCategory.all;

        if (isAll) {
            for (const meta of GROUPED_CATEGORIES) {
                const arr = matches.get(meta.cat) ?? [];
                if (arr.length === 0) {
                    continue;
                }

                const group = document.createElement('div');
                group.classList.add('fieldselect-options-group');

                const groupHeader = document.createElement('div');
                groupHeader.classList.add('fieldselect-options-group-header');
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
            const cat = (meta?.cat ?? FieldSelectCategory.vtstype) as FieldSelectCategory;

            for (const {id, title} of arr) {
                this._divOptions.appendChild(this._createOptionElement(id, title, icon, cat));
            }
        }
    }

    protected _createOptionElement(id: string, title: string, icon: string, category: FieldSelectCategory): HTMLDivElement {
        const div = document.createElement('div');
        div.classList.add('fieldselect-option');
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

    protected _updateHeaderCounts(
        matches: Map<string, Array<{id: string; title: string; icon: string}>>,
        total: number
    ): void {
        for (const [cat, el] of this._headerCountElements) {
            if (cat === FieldSelectCategory.all) {
                el.textContent = String(total);
            } else {
                el.textContent = String(matches.get(cat)?.length ?? 0);
            }
        }
    }

    protected _selectOption(id: string, title: string, category: FieldSelectCategory|string): void {
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

    protected _getIconFor(category: FieldSelectCategory|string): string {
        switch (category) {
            case FieldSelectCategory.vtstype: return EditorIcons.vts;
            case FieldSelectCategory.schema: return EditorIcons.schema;
            case FieldSelectCategory.enum: return EditorIcons.enum;
            default: return EditorIcons.vts;
        }
    }

    public getElement(): HTMLDivElement {
        return this._divSelect;
    }

    public setOptions(data: Map<string, string>, category: FieldSelectCategory|string): void {
        this._optionsData.set(category, data);
    }

    public getValue(): string | null {
        return this._selectedId ?? null;
    }

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

    public setEventChange(change: FieldSelectEventChange|null): void {
        this._onChange = change;
    }

    /**
     * Remove the global click listener and detach the wrapper from the DOM.
     * Call this from the owning component's own destroy() to avoid leaking
     * document-level listeners when rows/dialogs are torn down.
     */
    public destroy(): void {
        document.removeEventListener('click', this._documentClickHandler);
        this._divSelect.remove();
    }
}
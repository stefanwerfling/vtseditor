import './Searchbar.css';
import {EditorIcons} from '../Base/EditorIcons.js';

/**
 * A single segment on the ancestor path of a search hit (root → project
 * → folder(s) → file). The Searchbar uses `type` to pick an icon.
 */
export type SearchbarResultPathSegment = {
    name: string;
    type: string;
};

/**
 * Searchbar result entry
 */
export type SearchbarResultEntry = {
    objectId: string;
    pathSegments: SearchbarResultPathSegment[];
    name: string;
    isSchema: boolean;
    description: string;
};

/**
 * Interface of searchbar
 */
export interface ISearchbar {

    /**
     * show results
     * @param {SearchbarResultEntry[]} items
     */
    showResults(items: SearchbarResultEntry[]): void;
}

/**
 * Searchbar on search
 */
export type SearchbarOnSearch = (search: string, searchbar: ISearchbar) => void;

/**
 * Searchbar on result click
 */
export type SearchbarOnResultClick = (entry: SearchbarResultEntry) => void;

/**
 * Internal tree node for the folder-grouped result view.
 */
type TreeNode = {
    name: string;
    type: string;
    children: TreeNode[];
    items: SearchbarResultEntry[];
};

/**
 * Searchbar
 */
export class Searchbar implements ISearchbar {

    protected _container: HTMLDivElement;
    protected _input: HTMLInputElement;
    protected _results: HTMLUListElement;

    protected _onSearch: SearchbarOnSearch|null = null;
    protected _onResultClick: SearchbarOnResultClick|null = null;

    /**
     * Rendered item `<li>` elements (only clickable result rows — excludes
     * summary/empty rows). Used to drive keyboard navigation.
     * @protected
     */
    protected _itemElements: HTMLLIElement[] = [];

    /**
     * Backing entries parallel to _itemElements.
     * @protected
     */
    protected _itemEntries: SearchbarResultEntry[] = [];

    /**
     * Index of the keyboard-focused row (-1 when nothing is active).
     * @protected
     */
    protected _activeIndex: number = -1;

    /**
     * Current search query — captured so showResults() can highlight matches
     * without the caller having to pass it in.
     * @protected
     */
    protected _currentQuery: string = '';

    /**
     * Constructor
     */
    public constructor() {
        this._container = document.createElement('div');
        this._container.classList.add('searchbar-container');

        this._input = document.createElement('input');
        this._input.type = 'text';
        this._input.classList.add('searchbar');
        this._input.placeholder = '🔍 Search...';

        this._results = document.createElement('ul');
        this._results.classList.add('search-results');
        this._results.style.display = 'none';

        this._input.addEventListener('input', () => {
            const value = this._input.value.trim();
            this._currentQuery = value;

            if (value.length > 0) {
                if (this._onSearch !== null) {
                    this._onSearch(value, this);
                } else {
                    this.showResults([]);
                }
            } else {
                this.hideResults();
            }
        });

        this._input.addEventListener('keydown', (e) => this._handleKeyDown(e));

        // Prevent blur-on-mousedown from hiding the dropdown before the click
        // event on a result row fires. Much more reliable than the previous
        // 200ms setTimeout hack.
        this._results.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });

        this._input.addEventListener('blur', () => {
            this.hideResults();
        });

        this._container.appendChild(this._input);
        this._container.appendChild(this._results);
    }

    /**
     * Return the element
     * @return HTMLDivElement
     */
    public getElement(): HTMLDivElement {
        return this._container;
    }

    /**
     * show results
     * @param {SearchbarResultEntry[]} items
     */
    public showResults(items: SearchbarResultEntry[]): void {
        this._results.innerHTML = '';
        this._itemElements = [];
        this._itemEntries = [];
        this._activeIndex = -1;

        if (items.length === 0) {
            const li = document.createElement('li');
            li.classList.add('search-result-empty');
            li.textContent = `No matches for "${this._currentQuery}"`;
            this._results.appendChild(li);
            this._results.style.display = 'block';
            return;
        }

        // Header: total count, non-interactive
        const summary = document.createElement('li');
        summary.classList.add('search-results-summary');
        summary.textContent = `${items.length} ${items.length === 1 ? 'match' : 'matches'}`;
        this._results.appendChild(summary);

        // Group items into a nested folder tree keyed by their path segments.
        const tree = this._buildTree(items);
        this._renderTree(tree, 0);

        this._results.style.display = 'block';
    }

    /**
     * Build a nested tree from a flat result list using each entry's
     * pathSegments. Each tree node represents one ancestor (root / project /
     * folder / file); the items living at that node are leaves beneath it.
     * @param {SearchbarResultEntry[]} items
     * @return {TreeNode}
     * @protected
     */
    protected _buildTree(items: SearchbarResultEntry[]): TreeNode {
        const root: TreeNode = {
            name: '',
            type: '',
            children: [],
            items: []
        };

        for (const entry of items) {
            let cursor = root;

            for (const seg of entry.pathSegments) {
                let child = cursor.children.find(
                    c => c.name === seg.name && c.type === seg.type
                );

                if (!child) {
                    child = {
                        name: seg.name,
                        type: seg.type,
                        children: [],
                        items: []
                    };
                    cursor.children.push(child);
                }

                cursor = child;
            }

            cursor.items.push(entry);
        }

        return root;
    }

    /**
     * Render a TreeNode and everything below it as `<li>` rows. Folder
     * headers indent by depth; items (actual results) indent by depth+1.
     * @param {TreeNode} node
     * @param {number} depth
     * @protected
     */
    protected _renderTree(node: TreeNode, depth: number): void {
        for (const child of node.children) {
            this._results.appendChild(this._buildGroupHeader(child, depth));
            this._renderTree(child, depth + 1);
        }

        for (const item of node.items) {
            this._results.appendChild(this._buildItem(item, depth));
        }
    }

    /**
     * Build a folder header row (root / project / folder / file).
     * @param {TreeNode} node
     * @param {number} depth
     * @return {HTMLLIElement}
     * @protected
     */
    protected _buildGroupHeader(node: TreeNode, depth: number): HTMLLIElement {
        const li = document.createElement('li');
        li.classList.add('search-result-group');
        li.style.paddingLeft = `${8 + depth * 14}px`;

        const iconEl = document.createElement('span');
        iconEl.classList.add('search-result-group-icon');
        iconEl.textContent = this._iconForSegmentType(node.type);
        li.appendChild(iconEl);

        const nameEl = document.createElement('span');
        nameEl.classList.add('search-result-group-name');
        this._fillHighlighted(nameEl, node.name);
        li.appendChild(nameEl);

        return li;
    }

    /**
     * Build a single result row.
     * @param {SearchbarResultEntry} entry
     * @param {number} depth
     * @return {HTMLLIElement}
     * @protected
     */
    protected _buildItem(entry: SearchbarResultEntry, depth: number): HTMLLIElement {
        const li = document.createElement('li');
        li.classList.add('search-result-item');
        li.style.paddingLeft = `${8 + (depth + 1) * 14}px`;

        const row = document.createElement('div');
        row.classList.add('search-result-row');

        const iconEl = document.createElement('span');
        iconEl.classList.add('search-result-icon', entry.isSchema ? 'schema' : 'enum');
        iconEl.textContent = entry.isSchema ? EditorIcons.schema : EditorIcons.enum;
        row.appendChild(iconEl);

        const nameEl = document.createElement('span');
        nameEl.classList.add('search-result-name');
        this._fillHighlighted(nameEl, entry.name);
        row.appendChild(nameEl);

        const typeEl = document.createElement('span');
        typeEl.classList.add('search-result-type', entry.isSchema ? 'schema' : 'enum');
        typeEl.textContent = entry.isSchema ? 'schema' : 'enum';
        row.appendChild(typeEl);

        li.appendChild(row);

        if (entry.description) {
            const descEl = document.createElement('div');
            descEl.classList.add('search-result-description');
            this._fillHighlighted(descEl, entry.description);
            li.appendChild(descEl);
        }

        const index = this._itemElements.length;

        li.addEventListener('mouseenter', () => {
            this._setActive(index);
        });

        li.addEventListener('click', () => {
            this._commit(entry);
        });

        this._itemElements.push(li);
        this._itemEntries.push(entry);

        return li;
    }

    /**
     * Pick the emoji icon for a given path-segment type.
     * @param {string} type
     * @return {string}
     * @protected
     */
    protected _iconForSegmentType(type: string): string {
        switch (type) {
            case 'root':    return EditorIcons.root;
            case 'project': return EditorIcons.project;
            case 'extern':  return EditorIcons.registry;
            case 'folder':  return EditorIcons.folder;
            case 'file':    return EditorIcons.file;
            default:        return EditorIcons.folder;
        }
    }

    /**
     * Render `text` into `target`, wrapping any occurrence of the current
     * query in a `<mark>`-style span for visual match highlighting. Case
     * insensitive; first-match-only (keeps DOM small for long strings).
     * @param {HTMLElement} target
     * @param {string} text
     * @protected
     */
    protected _fillHighlighted(target: HTMLElement, text: string): void {
        const query = this._currentQuery;

        if (!query) {
            target.textContent = text;
            return;
        }

        const idx = text.toLowerCase().indexOf(query.toLowerCase());

        if (idx === -1) {
            target.textContent = text;
            return;
        }

        const before = text.slice(0, idx);
        const match = text.slice(idx, idx + query.length);
        const after = text.slice(idx + query.length);

        if (before) {
            target.appendChild(document.createTextNode(before));
        }

        const mark = document.createElement('span');
        mark.classList.add('search-result-mark');
        mark.textContent = match;
        target.appendChild(mark);

        if (after) {
            target.appendChild(document.createTextNode(after));
        }
    }

    /**
     * Keyboard navigation on the input element.
     * @param {KeyboardEvent} e
     * @protected
     */
    protected _handleKeyDown(e: KeyboardEvent): void {
        const visible = this._results.style.display !== 'none';

        switch (e.key) {
            case 'ArrowDown':
                if (!visible || this._itemElements.length === 0) {
                    return;
                }
                e.preventDefault();
                this._moveActive(1);
                break;

            case 'ArrowUp':
                if (!visible || this._itemElements.length === 0) {
                    return;
                }
                e.preventDefault();
                this._moveActive(-1);
                break;

            case 'Enter':
                if (this._activeIndex >= 0 && this._activeIndex < this._itemEntries.length) {
                    e.preventDefault();
                    this._commit(this._itemEntries[this._activeIndex]);
                }
                break;

            case 'Escape':
                e.preventDefault();
                this.hideResults();
                this._input.blur();
                break;
        }
    }

    /**
     * Move keyboard cursor by delta, clamped to the result range.
     * @param {number} delta
     * @protected
     */
    protected _moveActive(delta: number): void {
        if (this._itemElements.length === 0) {
            return;
        }

        let next = this._activeIndex + delta;

        if (next < 0) {
            next = 0;
        }

        if (next >= this._itemElements.length) {
            next = this._itemElements.length - 1;
        }

        this._setActive(next);
    }

    /**
     * Mark the given index active (keyboard-focused). `-1` clears.
     * @param {number} index
     * @protected
     */
    protected _setActive(index: number): void {
        if (this._activeIndex >= 0 && this._activeIndex < this._itemElements.length) {
            this._itemElements[this._activeIndex].classList.remove('active');
        }

        this._activeIndex = index;

        if (index >= 0 && index < this._itemElements.length) {
            const el = this._itemElements[index];
            el.classList.add('active');
            el.scrollIntoView({block: 'nearest'});
        }
    }

    /**
     * Select a result — clear input, fire callback, hide dropdown.
     * @param {SearchbarResultEntry} entry
     * @protected
     */
    protected _commit(entry: SearchbarResultEntry): void {
        this._input.value = '';
        this._currentQuery = '';

        if (this._onResultClick !== null) {
            this._onResultClick(entry);
        }

        this.hideResults();
    }

    /**
     * hide results
     */
    public hideResults(): void {
        this._results.style.display = 'none';
        this._activeIndex = -1;
    }

    /**
     * set on search
     * @param {SearchbarOnSearch|null} onSearch
     */
    public setOnSearch(onSearch: SearchbarOnSearch|null): void {
        this._onSearch = onSearch;
    }

    /**
     * Set on result click
     * @param {SearchbarOnResultClick|null} onResultClick
     */
    public setOnResultClick(onResultClick: SearchbarOnResultClick|null): void {
        this._onResultClick = onResultClick;
    }

    /**
     * Hide
     */
    public hide(): void {
        this._container.style.display = 'none';
    }

    /**
     * Show
     */
    public show(): void {
        this._container.style.display = '';
    }

}
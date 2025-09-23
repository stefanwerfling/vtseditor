import './Searchbar.css';
import {EditorIcons} from '../Base/EditorIcons.js';

/**
 * Searchbar result entry
 */
export type SearchbarResultEntry = {
    objectId: string;
    path: string;
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
 * Searchbar
 */
export class Searchbar implements ISearchbar {

    /**
     * container
     * @protected
     */
    protected _container: HTMLDivElement;

    /**
     * input
     * @protected
     */
    protected _input: HTMLInputElement;

    /**
     * results
     * @protected
     */
    protected _results: HTMLUListElement;

    /**
     * on search
     * @protected
     */
    protected _onSearch: SearchbarOnSearch|null = null;

    /**
     * on result click
     * @protected
     */
    protected _onResultClick: SearchbarOnResultClick|null = null;

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

        this._input.addEventListener('blur', () => {
            // kleine Verzögerung, damit Klicks noch gehen
            setTimeout(() => this.hideResults(), 200);
        });

        // -------------------------------------------------------------------------------------------------------------

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

        if (items.length === 0) {
            const li = document.createElement('li');

            li.classList.add('search-result-empty');
            li.textContent = 'None results found!';

            this._results.appendChild(li);
            this._results.style.display = 'block';

            return;
        }

        items.forEach(entry => {
            const li = document.createElement('li');
            li.classList.add('search-result-item');

            const pathEl = document.createElement('div');

            pathEl.classList.add('result-path');
            pathEl.textContent = entry.path;
            li.appendChild(pathEl);

            const nameEl = document.createElement('div');

            nameEl.classList.add('result-name');
            nameEl.textContent = (entry.isSchema ? ` ${EditorIcons.schema}` : EditorIcons.enum) + ` ${entry.name}`;
            li.appendChild(nameEl);

            if (entry.description) {
                const descEl = document.createElement('div');

                descEl.classList.add('result-description');
                descEl.textContent = entry.description;
                li.appendChild(descEl);
            }

            li.addEventListener('click', () => {
                this._input.value = '';

                if (this._onResultClick !== null) {
                    this._onResultClick(entry);
                }

                this.hideResults();
            });

            this._results.appendChild(li);
        });

        this._results.style.display = 'block';
    }

    /**
     * hide results
     */
    public hideResults(): void {
        this._results.style.display = 'none';
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
import './TypeFieldSelect.css';
import {SchemaTypes} from '../SchemaTypes.js';

export enum TypeFieldSelectCategory {
    'vtstype' = 'vtstype',
    'schema' = 'schema',
    'enum' = 'enum'
}

/**
 * Type field select event change
 */
export type TypeFieldSelectEventChange = (value: string) => void;

/**
 * TypeSelect
 * https://querybuilder.js.org/
 * https://docs.easyforms.dev/form-builder.html
 */
export class TypeFieldSelect {

    /**
     * wrapper element
     * @protected
     */
    protected _divSelect: HTMLDivElement;

    /**
     * toggle element
     * @protected
     */
    protected _divToggle: HTMLDivElement;

    /**
     * main element
     * @protected
     */
    protected _divMain: HTMLDivElement;

    /**
     * headers element
     * @protected
     */
    protected _divHeaders: HTMLDivElement;

    /**
     * search element
     * @protected
     */
    protected _divSearch: HTMLDivElement;

    /**
     * search input element
     * @protected
     */
    protected _inputSearch: HTMLInputElement;

    /**
     * options element
     * @protected
     */
    protected _divOptions: HTMLDivElement;

    /**
     * current seleted category
     * @protected
     */
    protected _currentCategory: TypeFieldSelectCategory|string = TypeFieldSelectCategory.vtstype;

    /**
     * Options data
     * @protected
     */
    protected _optionsData: Map<string, Map<string, string>> = new Map<string, Map<string, string>>();

    /**
     * selected id
     * @protected
     */
    protected _selectedId: string | null = null;

    /**
     * on change
     * @protected
     */
    protected _onChange: TypeFieldSelectEventChange|null = null;

    /**
     * Constructor
     */
    public constructor() {
        // wrapper
        this._divSelect = document.createElement('div');
        this._divSelect.classList.add('typefield-select-wrapper');

        // toggle
        this._divToggle = document.createElement('div');
        this._divToggle.classList.add('typefield-select-toggle');
        this._divToggle.textContent = 'Please select...';

        this._divSelect.appendChild(this._divToggle);

        // main
        this._divMain = document.createElement('div');
        this._divMain.classList.add('typefield-select');
        this._divSelect.appendChild(this._divMain);

        // headers -----------------------------------------------------------------------------------------------------
        this._divHeaders = document.createElement('div');
        this._divHeaders.classList.add('typefield-select-headers');
        this._divMain.appendChild(this._divHeaders);

        // header select -----------------------------------------------------------------------------------------------
        const selectType = document.createElement('div');
        selectType.classList.add(...['typefield-section-header', 'active']);
        selectType.textContent = '🏷️ VTS Type';
        selectType.setAttribute('data-category', TypeFieldSelectCategory.vtstype);

        this._divHeaders.appendChild(selectType);

        const selectSchema = document.createElement('div');
        selectSchema.classList.add(...['typefield-section-header']);
        selectSchema.textContent = '🧬 Schema';
        selectSchema.setAttribute('data-category', TypeFieldSelectCategory.schema);

        this._divHeaders.appendChild(selectSchema);

        const selectEnum = document.createElement('div');
        selectEnum.classList.add(...['typefield-section-header']);
        selectEnum.textContent = '🧩 Enum';
        selectEnum.setAttribute('data-category', TypeFieldSelectCategory.enum);

        this._divHeaders.appendChild(selectEnum);

        // search box --------------------------------------------------------------------------------------------------

        this._divSearch = document.createElement('div');
        this._divSearch.classList.add('typefield-search-box');

        this._divMain.appendChild(this._divSearch);

        this._inputSearch = document.createElement('input');
        this._inputSearch.type = 'text';
        this._inputSearch.placeholder = 'Search...';

        this._divSearch.appendChild(this._inputSearch);

        // options -----------------------------------------------------------------------------------------------------

        this._divOptions = document.createElement('div');
        this._divOptions.classList.add('typefield-options');

        this._divMain.appendChild(this._divOptions);

        // register event ----------------------------------------------------------------------------------------------

        this._registerEvents();

        // add options
        this.setOptions(SchemaTypes.getInstance().getVtsTypes(), TypeFieldSelectCategory.vtstype);
        this.setOptions(SchemaTypes.getInstance().getSchemaTypes(), TypeFieldSelectCategory.schema);
        this.setOptions(SchemaTypes.getInstance().getEnumTypes(), TypeFieldSelectCategory.enum);
    }

    /**
     * Register events
     * @protected
     */
    protected _registerEvents(): void {
        const headers = this._divHeaders.querySelectorAll('.typefield-section-header');

        headers.forEach(header => {
            header.addEventListener('click', () => {
                headers.forEach(h => h.classList.remove('active'));
                header.classList.add('active');

                this._currentCategory = header.getAttribute('data-category') ?? TypeFieldSelectCategory.vtstype;
                this._inputSearch.value = '';

                this._renderOptions();
            });
        });

        this._inputSearch.addEventListener('input', () => {
            this._renderOptions(this._inputSearch.value);
        });

        this._divToggle.addEventListener('click', () => {
            this._divMain.classList.toggle('open');
            this._renderOptions(this._inputSearch.value);
        });

        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target instanceof HTMLElement && !target.closest('.typefield-select-wrapper')) {
                this._divMain.classList.remove('open');
            }
        });
    }

    /**
     * Render options
     * @param {string} filter
     * @protected
     */
    protected _renderOptions(filter: string = ''): void {
        this._divOptions.innerHTML = '';

        const entries = this._optionsData.get(this._currentCategory);

        if (!entries) {
            return;
        }

        let icon = '🏷️';

        switch (this._currentCategory) {
            case TypeFieldSelectCategory.vtstype:
                icon = '🏷️';
                break;

            case TypeFieldSelectCategory.schema:
                icon = '🧬';
                break;

            case TypeFieldSelectCategory.enum:
                icon = '🧩️';
                break;
        }

        for (const [id, title] of entries) {
            if (title.toLowerCase().includes(filter.toLowerCase())) {
                const div = document.createElement('div');

                div.classList.add('typefield-option');
                div.textContent = `${icon} ${title}`;

                if (id === this._selectedId) {
                    div.classList.add('selected');
                }

                div.onclick = () => {
                    this._divToggle.textContent = `${icon} ${title}`;
                    this._divMain.classList.remove('open');
                    this._selectedId = id;

                    if (this._onChange) {
                        this._onChange(id);
                    }
                };

                this._divOptions.appendChild(div);
            }
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
     * @param {TypeFieldSelectCategory|string} category
     */
    public setOptions(data: Map<string, string>, category: TypeFieldSelectCategory|string): void {
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

                let icon = '🏷️';
                switch (category) {
                    case TypeFieldSelectCategory.vtstype:
                        icon = '🏷️';
                        break;
                    case TypeFieldSelectCategory.schema:
                        icon = '🧬';
                        break;
                    case TypeFieldSelectCategory.enum:
                        icon = '🧩️';
                        break;
                }

                this._selectedId = id;
                this._currentCategory = category;
                this._divToggle.textContent = `${icon} ${title}`;
                this._inputSearch.value = '';
                this._renderOptions();
                return;
            }
        }

        this._selectedId = null;
        this._divToggle.textContent = 'Please select...';
        this._inputSearch.value = '';
        this._renderOptions();
    }

    /**
     * Set event change
     * @param {TypeFieldSelectEventChange|null} change
     */
    public setEventChange(change: TypeFieldSelectEventChange|null): void {
        this._onChange = change;
    }

}
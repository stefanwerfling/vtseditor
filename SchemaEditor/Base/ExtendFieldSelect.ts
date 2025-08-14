import './ExtendFieldSelect.css';
import {SchemaExtends} from '../Register/SchemaExtends.js';
import {EditorIcons} from './EditorIcons.js';

/**
 * Extend field select category
 */
export enum ExtendFieldSelectCategory {
    'vtstype' = 'vtstype',
    'schema' = 'schema',
}

/**
 * Extend field select event change
 */
export type ExtendFieldSelectEventChange = (value: string) => void;

/**
 * ExtendFieldSelect
 */
export class ExtendFieldSelect {

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
    protected _currentCategory: ExtendFieldSelectCategory|string = ExtendFieldSelectCategory.vtstype;

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
    protected _onChange: ExtendFieldSelectEventChange|null = null;

        /**
     * Constructor
     */
    public constructor(tableUnid: string, withoutComplexVTS: boolean = false) {
        // wrapper
        this._divSelect = document.createElement('div');
        this._divSelect.classList.add('extendfield-select-wrapper');

        // toggle
        this._divToggle = document.createElement('div');
        this._divToggle.classList.add('extendfield-select-toggle');
        this._divToggle.textContent = 'Please select...';

        this._divSelect.appendChild(this._divToggle);

        // main
        this._divMain = document.createElement('div');
        this._divMain.classList.add('extendfield-select');
        this._divSelect.appendChild(this._divMain);

        // headers -----------------------------------------------------------------------------------------------------
        this._divHeaders = document.createElement('div');
        this._divHeaders.classList.add('extendfield-select-headers');
        this._divMain.appendChild(this._divHeaders);

        // header select -----------------------------------------------------------------------------------------------
        const selectType = document.createElement('div');
        selectType.classList.add(...['extendfield-section-header', 'active']);
        selectType.textContent = `${EditorIcons.vts} VTS Type`;
        selectType.setAttribute('data-category', ExtendFieldSelectCategory.vtstype);

        this._divHeaders.appendChild(selectType);

        const selectSchema = document.createElement('div');
        selectSchema.classList.add(...['extendfield-section-header']);
        selectSchema.textContent = `${EditorIcons.schema} Schema`;
        selectSchema.setAttribute('data-category', ExtendFieldSelectCategory.schema);

        this._divHeaders.appendChild(selectSchema);

        // search box --------------------------------------------------------------------------------------------------

        this._divSearch = document.createElement('div');
        this._divSearch.classList.add('extendfield-search-box');

        this._divMain.appendChild(this._divSearch);

        this._inputSearch = document.createElement('input');
        this._inputSearch.type = 'text';
        this._inputSearch.placeholder = 'Search...';

        this._divSearch.appendChild(this._inputSearch);

        // options -----------------------------------------------------------------------------------------------------

        this._divOptions = document.createElement('div');
        this._divOptions.classList.add('extendfield-options');

        this._divMain.appendChild(this._divOptions);

        // register event ----------------------------------------------------------------------------------------------

        this._registerEvents();

        // add options
        if (withoutComplexVTS) {
            this.setOptions(SchemaExtends.getInstance().getVtsSimpleTypes(), ExtendFieldSelectCategory.vtstype);
        } else {
            this.setOptions(SchemaExtends.getInstance().getVtsTypes(), ExtendFieldSelectCategory.vtstype);
        }

        this.setOptions(SchemaExtends.getInstance().getExtends([tableUnid], true), ExtendFieldSelectCategory.schema);
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

        let icon = EditorIcons.vts;

        switch (this._currentCategory) {
            case ExtendFieldSelectCategory.vtstype:
                icon = EditorIcons.vts;
                break;

            case ExtendFieldSelectCategory.schema:
                icon = EditorIcons.schema;
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

        const headers = this._divHeaders.querySelectorAll('.typefield-section-header');
        headers.forEach(header => {
            const headerCategory = header.getAttribute('data-category');

            if (headerCategory === this._currentCategory) {
                headers.forEach(h => h.classList.remove('active'));
                header.classList.add('active');
            }
        });
    }

    /**
     * Register events
     * @protected
     */
    protected _registerEvents(): void {
        const headers = this._divHeaders.querySelectorAll('.extendfield-section-header');

        headers.forEach(header => {
            header.addEventListener('click', () => {
                headers.forEach(h => h.classList.remove('active'));
                header.classList.add('active');

                this._currentCategory = header.getAttribute('data-category') ?? ExtendFieldSelectCategory.vtstype;
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
            if (target instanceof HTMLElement && !target.closest('.extendfield-select-wrapper')) {
                this._divMain.classList.remove('open');
            }
        });
    }

    /**
     * Set event change
     * @param {ExtendFieldSelectEventChange|null} change
     */
    public setEventChange(change: ExtendFieldSelectEventChange|null): void {
        this._onChange = change;
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

                let icon = EditorIcons.vts;

                switch (category) {
                    case ExtendFieldSelectCategory.vtstype:
                        icon = EditorIcons.vts;
                        break;

                    case ExtendFieldSelectCategory.schema:
                        icon = EditorIcons.schema;
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
}
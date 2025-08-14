import {JsonSchemaFieldType, SchemaJsonSchemaFieldTypeArray} from '../../JsonData.js';
import {TypeFieldSelect} from '../TypeFieldSelect.js';
import {MultiTypeGroup} from './MultiTypeGroup.js';

/**
 * Multi type field on delete
 */
export type MultiTypeFieldOnDelete = (unid: string) => void;

/**
 * Multi type field
 */
export class MultiTypeField {

    /**
     * Table unid
     * @protected
     */
    protected _tableUnid: string;

    /**
     * unid
     * @protected
     */
    protected _unid: string = '';

    /**
     * div main field
     * @protected
     */
    protected _divMainField: HTMLDivElement;

    /**
     * div header
     * @protected
     */
    protected _divHeader: HTMLDivElement;

    /**
     * button delete
     * @protected
     */
    protected _buttonDelete: HTMLButtonElement|null = null;

    /**
     * select field
     * @protected
     */
    protected _select: TypeFieldSelect;

    /**
     * div option container
     * @protected
     */
    protected _divOptionContainer: HTMLDivElement;

    /**
     * checkbox optional
     * @protected
     */
    protected _checkboxOptional: HTMLInputElement;

    /**
     * chebox array
     * @protected
     */
    protected _checkboxArray: HTMLInputElement;

    /**
     * multi type group
     * @protected
     */
    protected _multiTypeGroup: MultiTypeGroup|null = null;

    /**
     * on delete
     * @protected
     */
    protected _onDelete: MultiTypeFieldOnDelete|null = null;

    /**
     * constructor
     * @param {string} tableUnid
     * @param {string} unid
     * @param {boolean} allowDelete
     */
    public constructor(tableUnid: string, unid: string = '', allowDelete: boolean = false) {
        this._tableUnid = tableUnid;
        this._unid = unid === '' ? crypto.randomUUID() : unid;
        this._divMainField = document.createElement('div');
        this._divMainField.classList.add('multitype-container');

        // header ------------------------------------------------------------------------------------------------------

        this._divHeader = document.createElement('div');
        this._divHeader.classList.add('multitypefield-header');
        this._divMainField.appendChild(this._divHeader);

        // add button --------------------------------------------------------------------------------------------------

        const grpAction = document.createElement('div');
        grpAction.classList.add(...['multitype-btn-group', 'multitype-pull-right']);
        this._divHeader.appendChild(grpAction);

        if (allowDelete) {
            this._buttonDelete = document.createElement('button');
            this._buttonDelete.type = 'button';
            this._buttonDelete.classList.add(...['multitype-btn', 'multitype-btn-xs', 'multitype-btn-danger']);
            this._buttonDelete.append('Delete');
            this._buttonDelete.addEventListener('click', () => {
                if (this._onDelete !== null) {
                    this._onDelete(this._unid);
                }
            });

            this._buttonDelete.addEventListener('mouseenter', () => {
                this._divMainField.style.border = '1px dashed red';
            });

            this._buttonDelete.addEventListener('mouseleave', () => {
                this._divMainField.style.border = '';
            });

            grpAction.appendChild(this._buttonDelete);
        }

        // select div --------------------------------------------------------------------------------------------------

        const valueContainer = document.createElement('div');
        valueContainer.classList.add(...['multitypefield-value']);
        this._divMainField.appendChild(valueContainer);

        this._select = new TypeFieldSelect(tableUnid);
        this._select.setEventChange(value => {
            if (value === 'or') {
                this._showMultiType();
            } else {
                this._hideMultiType();
            }
        });

        valueContainer.appendChild(this._select.getElement());

        this._divOptionContainer = document.createElement('div');
        this._divMainField.appendChild(this._divOptionContainer);

        // optional ----------------------------------------------------------------------------------------------------
        this._divOptionContainer.classList.add('dialog-row');
        this._divOptionContainer.style.display = 'flex';
        this._divOptionContainer.style.gap = '24px';

        // --- Optional Checkbox ---
        const labelOptional = document.createElement('label');
        labelOptional.classList.add('dialog-label');
        labelOptional.textContent = 'Optional';
        labelOptional.style.display = 'flex';
        labelOptional.style.alignItems = 'center';
        labelOptional.style.gap = '6px';
        labelOptional.style.marginBottom = '6px';

        this._checkboxOptional = document.createElement('input');
        this._checkboxOptional.type = 'checkbox';
        this._checkboxOptional.classList.add('dialog-checkbox');

        labelOptional.prepend(this._checkboxOptional);
        this._divOptionContainer.appendChild(labelOptional);

        // --- Array Checkbox ---
        const labelArray = document.createElement('label');
        labelArray.classList.add('dialog-label');
        labelArray.textContent = 'Array';
        labelArray.style.display = 'flex';
        labelArray.style.alignItems = 'center';
        labelArray.style.gap = '6px';
        labelArray.style.marginBottom = '6px';

        this._checkboxArray = document.createElement('input');
        this._checkboxArray.type = 'checkbox';
        this._checkboxArray.classList.add('dialog-checkbox');

        labelArray.prepend(this._checkboxArray);
        this._divOptionContainer.appendChild(labelArray);
    }

    /**
     * hide multi type
     * @protected
     */
    protected _hideMultiType(): void {
        if (this._multiTypeGroup !== null) {
            this._multiTypeGroup.getElement().style.display = 'none';
        }
    }

    /**
     * show multi type
     * @protected
     */
    protected _showMultiType(): void {
        if (this._multiTypeGroup === null) {
            this._multiTypeGroup = new MultiTypeGroup(this._tableUnid);
            this._divMainField.appendChild(this._multiTypeGroup.getElement());
        }

        this._multiTypeGroup.getElement().style.display = '';
    }

    /**
     * hide options
     * @protected
     */
    protected _hideOptions(): void {
        this._divOptionContainer.style.display = 'none';
    }

    /**
     * show options
     * @protected
     */
    protected _showOptions(): void {
        this._divOptionContainer.style.display = '';
    }

    /**
     * Return unid
     * @return {string}
     */
    public getUnid(): string {
        return this._unid;
    }

    /**
     * Set on delete
     * @param {MultiTypeFieldOnDelete|null} ondelete
     */
    public setOnDelete(ondelete: MultiTypeFieldOnDelete|null): void {
        this._onDelete = ondelete;
    }

    /**
     * Return the element
     * @return {HTMLDivElement}
     */
    public getElement(): HTMLDivElement {
        return this._divMainField;
    }

    /**
     * Return the value
     * @return {JsonSchemaFieldType}
     */
    public getValue(): JsonSchemaFieldType {
        const isOr = this._select.getValue() === 'or';
        let types: JsonSchemaFieldType[] = [];

        if (this._multiTypeGroup) {
            types = this._multiTypeGroup.getValues();
        }

        return {
            type: this._select.getValue() ?? '',
            optional: this._checkboxOptional.checked,
            array: this._checkboxArray.checked,
            types: isOr ? types : []
        };
    }

    /**
     * Set the value
     * @param {JsonSchemaFieldType} type
     */
    public setValue(type: JsonSchemaFieldType): void {
        if (type.type === 'or') {
            this._showMultiType();

            if (this._multiTypeGroup) {
                if (SchemaJsonSchemaFieldTypeArray.validate(type.types, [])) {
                    this._multiTypeGroup.setValues(type.types);
                }
            }
        } else {
            this._hideMultiType();
        }

        this._checkboxOptional.checked = type.optional;
        this._checkboxArray.checked = type.array;
        this._select.setValue(type.type);
    }

}
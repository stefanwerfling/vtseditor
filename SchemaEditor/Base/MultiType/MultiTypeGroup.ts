import './MultiType.css';
import {JsonSchemaFieldType, JsonSchemaFieldTypeArray} from '../../JsonData.js';
import {MultiTypeField} from './MultiTypeField.js';

/**
 * Multi type field
 */
export class MultiTypeGroup {

    /**
     * div builder
     * @protected
     */
    protected _divBuilder: HTMLDivElement;

    /**
     * div header
     * @protected
     */
    protected _divHeader: HTMLDivElement;

    /**
     * button add
     * @protected
     */
    protected _buttonAdd: HTMLButtonElement;

    /**
     * Label info
     * @protected
     */
    protected _labelInfo: HTMLLabelElement;

    /**
     * div body
     * @protected
     */
    protected _divBody: HTMLDivElement;

    /**
     * div field list
     * @protected
     */
    protected _divFieldList: HTMLDivElement;

    /**
     * fields
     * @protected
     */
    protected _fields: Map<string, MultiTypeField> = new Map<string, MultiTypeField>();

    /**
     * Constructor
     */
    public constructor() {
        this._divBuilder = document.createElement('div');
        this._divBuilder.classList.add('multitype-wrapper');

        // header ------------------------------------------------------------------------------------------------------

        this._divHeader = document.createElement('div');
        this._divHeader.classList.add('multitype-header');
        this._divBuilder.appendChild(this._divHeader);

        // add button --------------------------------------------------------------------------------------------------

        const grpAction = document.createElement('div');
        grpAction.classList.add(...['multitype-btn-group', 'multitype-pull-right']);
        this._divHeader.appendChild(grpAction);

        this._buttonAdd = document.createElement('button');
        this._buttonAdd.type = 'button';
        this._buttonAdd.classList.add(...['multitype-btn', 'multitype-btn-xs', 'multitype-btn-success']);
        this._buttonAdd.append('➕ Add Type');

        this._buttonAdd.addEventListener('click', () => {
            this.addField();
        });

        grpAction.appendChild(this._buttonAdd);

        // or/single info ----------------------------------------------------------------------------------------------

        const grpCond = document.createElement('div');
        grpCond.classList.add(...['multitype-btn-group', 'multitype-group-conditions']);
        this._divHeader.appendChild(grpCond);

        this._labelInfo = document.createElement('label');
        this._labelInfo.classList.add(...['multitype-btn', 'multitype-btn-xs', 'multitype-label-primary', 'active']);
        this._labelInfo.textContent = 'SINGLE';
        grpCond.appendChild(this._labelInfo);

        // Body --------------------------------------------------------------------------------------------------------

        this._divBody = document.createElement('div');
        this._divBody.classList.add(...['multitype-body']);
        this._divBuilder.appendChild(this._divBody);

        this._divFieldList = document.createElement('div');
        this._divFieldList.classList.add('multitype-fieldlist');
        this._divBody.appendChild(this._divFieldList);
    }

    /**
     * Add field
     * @param {JsonSchemaFieldType|null} value
     */
    public addField(value: JsonSchemaFieldType|null = null): void {
        const field = new MultiTypeField('', true);

        if (value !== null) {
            field.setValue(value);
        }

        field.setOnDelete(unid => {
            this.deleteField(unid);
        });

        this._divFieldList.appendChild(field.getElement());

        this._fields.set(field.getUnid(), field);
        this._updateLabelInfo();
    }

    /**
     * Delete field
     * @param {string} unid
     */
    public deleteField(unid: string): void {
        const field = this._fields.get(unid);

        if (field) {
            field.getElement().remove();
            this._fields.delete(unid);
        }
    }

    /**
     * Update label info
     * @protected
     */
    protected _updateLabelInfo(): void {
        if (this._fields.size <= 1) {
            this._labelInfo.textContent = 'SINGLE';
        } else {
            this._labelInfo.textContent = 'OR';
        }
    }

    /**
     * Return the main element
     * @return {HTMLDivElement}
     */
    public getElement(): HTMLDivElement {
        return this._divBuilder;
    }

    /**
     * Return a list of FieldType
     * @return {JsonSchemaFieldTypeArray}
     */
    public getValues(): JsonSchemaFieldTypeArray {
        const list: JsonSchemaFieldTypeArray = [];

        for (const [, entry] of this._fields.entries()) {
            list.push(entry.getValue());
        }

        return list;
    }

    /**
     * Set type values by list
     * @param {JsonSchemaFieldTypeArray} values
     */
    public setValues(values: JsonSchemaFieldTypeArray): void {
        for (const value of values) {
            this.addField(value);
        }
    }

}
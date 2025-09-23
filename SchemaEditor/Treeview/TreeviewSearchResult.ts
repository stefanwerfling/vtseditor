import {EnumTable} from '../Enum/EnumTable.js';
import {SchemaTable} from '../Schema/SchemaTable.js';
import {TreeviewEntry} from './TreeviewEntry.js';

/**
 * Treeview search result
 */
export type TreeviewSearchResult = {
    path: TreeviewEntry[];
    entry: TreeviewEntry|null;
    schema: SchemaTable|null;
    enum: EnumTable|null;
};
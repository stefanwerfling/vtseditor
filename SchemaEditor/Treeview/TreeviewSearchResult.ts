import {EnumTable} from '../Enum/EnumTable.js';
import {SchemaTable} from '../Schema/SchemaTable.js';
import {TreeviewEntry} from './TreeviewEntry.js';

/**
 * Treeview search result.
 *
 * `schema` and `enum` carry the live instance when the owning file is
 * hydrated. For skeleton (unhydrated) files both are `null` — consumers
 * should fall back to `unid` / `name` for navigation and let the editor
 * hydrate the parent file on demand.
 */
export type TreeviewSearchResult = {
    path: TreeviewEntry[];
    entry: TreeviewEntry|null;
    schema: SchemaTable|null;
    enum: EnumTable|null;
    unid: string;
    name: string;
};
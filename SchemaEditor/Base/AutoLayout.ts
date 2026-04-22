import {EnumTable} from '../Enum/EnumTable.js';
import {LinkTable} from '../Link/LinkTable.js';
import {SchemaTable} from '../Schema/SchemaTable.js';

/**
 * Table reference that can be laid out — schema/enum live inline, link
 * is a stand-in for an external schema/enum that this file references.
 */
type LayoutTable = SchemaTable | EnumTable | LinkTable;

/**
 * Internal node for the layering pass.
 */
type LayoutNode = {
    id: string;
    table: LayoutTable;
    deps: string[];
    layer: number;
};

/**
 * Auto-layout — arranges schemas and enums into dependency layers so
 * that no tables overlap and the reference direction flows visually
 * from left (most dependent) to right (base / leaves).
 *
 * Layering uses the longest-path-from-leaves algorithm: a node's layer
 * is `1 + max(layer of its dependencies)`. Nodes without dependencies
 * end up on layer 0 (rightmost column). Cycles are broken by treating
 * revisited nodes as layer 0 (defensive — schema cycles are unusual in
 * this tool but the algorithm must terminate).
 */
export class AutoLayout {

    /**
     * Horizontal gap between two dependency columns (added on top of the
     * measured width of the left column).
     */
    public static readonly COL_GAP = 80;

    /**
     * Vertical gap between stacked nodes within a layer.
     */
    public static readonly ROW_GAP = 40;

    /**
     * Fallback height when a table's rendered height cannot be read
     * (e.g. the element is not in the DOM).
     */
    public static readonly FALLBACK_ROW_HEIGHT = 180;

    /**
     * Fallback column width when a layer is empty or no table in a layer
     * can be measured.
     */
    public static readonly FALLBACK_COL_WIDTH = 240;

    /**
     * Origin of the layout area (top-left padding inside the canvas).
     */
    public static readonly ORIGIN_X = 40;
    public static readonly ORIGIN_Y = 40;

    /**
     * Arrange the given schemas, enums and link tables. Positions are
     * applied via setPosition on each table — the caller is responsible
     * for dispatching a save / view update afterwards.
     *
     * Link tables act as layer-0 placeholders for externally-defined
     * schemas/enums that are referenced from this view, so that
     * dependencies pointing at them end up in a column to their left
     * instead of being treated as unresolved.
     *
     * @param {SchemaTable[]} schemas
     * @param {EnumTable[]} enums
     * @param {LinkTable[]} links
     */
    public static arrange(
        schemas: SchemaTable[],
        enums: EnumTable[],
        links: LinkTable[] = []
    ): void {
        const nodes = new Map<string, LayoutNode>();

        for (const schema of schemas) {
            nodes.set(schema.getUnid(), {
                id: schema.getUnid(),
                table: schema,
                deps: schema.getDependencyIds(),
                layer: -1
            });
        }

        for (const aenum of enums) {
            nodes.set(aenum.getUnid(), {
                id: aenum.getUnid(),
                table: aenum,
                deps: [],
                layer: -1
            });
        }

        // Links are keyed by the linked object's unid so that any
        // schema's dependency on that id finds them. Skip links whose
        // target hasn't been resolved yet, and never replace a direct
        // node already registered for that id.
        for (const link of links) {
            if (link.getLinkObject() === null) {
                continue;
            }

            const linkedId = link.getLinkObjectUnid();

            if (!linkedId || nodes.has(linkedId)) {
                continue;
            }

            nodes.set(linkedId, {
                id: linkedId,
                table: link,
                deps: [],
                layer: -1
            });
        }

        if (nodes.size === 0) {
            return;
        }

        // longest-path layering
        const computeLayer = (id: string, stack: Set<string>): number => {
            const node = nodes.get(id);

            if (!node) {
                return 0;
            }

            if (node.layer !== -1) {
                return node.layer;
            }

            if (stack.has(id)) {
                // cycle — break at this point
                return 0;
            }

            stack.add(id);

            let maxDep = -1;

            for (const depId of node.deps) {
                if (nodes.has(depId)) {
                    maxDep = Math.max(maxDep, computeLayer(depId, stack));
                }
            }

            stack.delete(id);
            node.layer = maxDep + 1;
            return node.layer;
        };

        for (const id of nodes.keys()) {
            computeLayer(id, new Set());
        }

        // group by layer and find max
        let maxLayer = 0;
        const byLayer = new Map<number, LayoutNode[]>();

        for (const node of nodes.values()) {
            if (node.layer > maxLayer) {
                maxLayer = node.layer;
            }

            let group = byLayer.get(node.layer);

            if (!group) {
                group = [];
                byLayer.set(node.layer, group);
            }

            group.push(node);
        }

        // Stable ordering within each layer: schemas first, enums next,
        // links last (links carry lower visual weight). Alphabetical as
        // a tiebreaker, giving a reproducible layout on repeated clicks.
        const classify = (t: LayoutTable): number => {
            if (t instanceof SchemaTable) {
                return 0;
            }

            if (t instanceof EnumTable) {
                return 1;
            }

            // LinkTable — classify by the linked object so a linked
            // schema sorts with schemas, a linked enum with enums
            const linked = t.getLinkObject();

            if (linked instanceof SchemaTable) {
                return 0;
            }

            if (linked instanceof EnumTable) {
                return 1;
            }

            return 2;
        };

        for (const group of byLayer.values()) {
            group.sort((a, b) => {
                const ca = classify(a.table);
                const cb = classify(b.table);

                if (ca !== cb) {
                    return ca - cb;
                }

                return a.table.getName().localeCompare(b.table.getName());
            });
        }

        // compute X per layer from the actual measured widths, so wide
        // tables don't overlap their neighbouring column. Highest layer
        // (most dependent) is leftmost; we walk from left to right.
        const colX = new Map<number, number>();
        let cursorX = AutoLayout.ORIGIN_X;

        for (let layer = maxLayer; layer >= 0; layer--) {
            colX.set(layer, cursorX);

            const group = byLayer.get(layer);
            let colWidth = 0;

            if (group) {
                for (const node of group) {
                    const el = node.table.getElement();
                    const w = el ? el.offsetWidth : 0;

                    if (w > colWidth) {
                        colWidth = w;
                    }
                }
            }

            if (colWidth === 0) {
                colWidth = AutoLayout.FALLBACK_COL_WIDTH;
            }

            cursorX += colWidth + AutoLayout.COL_GAP;
        }

        // apply positions — Y stacks per-layer using each table's actual
        // height so tall schemas never push into the one below them
        for (const [layer, group] of byLayer) {
            const x = colX.get(layer)!;
            let y = AutoLayout.ORIGIN_Y;

            for (const node of group) {
                node.table.setPosition(x, y);

                const el = node.table.getElement();
                const height = (el ? el.offsetHeight : 0) || AutoLayout.FALLBACK_ROW_HEIGHT;
                y += height + AutoLayout.ROW_GAP;
            }
        }
    }

}
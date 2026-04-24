import './ContextMenu.css';

/**
 * Context menu item click handler
 */
export type ContextMenuItemClick = () => void;

/**
 * Context menu item definition
 */
export type ContextMenuItem = {
    icon?: string;
    label: string;
    onClick: ContextMenuItemClick;
    danger?: boolean;
    disabled?: boolean;
};

/**
 * Separator marker usable inside a link-mode items list.
 */
export type ContextMenuSeparator = {
    separator: true;
};

/**
 * Either an actionable item or a horizontal separator.
 */
export type ContextMenuEntry = ContextMenuItem|ContextMenuSeparator;

/**
 * Context menu — a trigger button (three vertical dots) that opens a
 * floating action menu. The menu is rendered in document.body so it is
 * not clipped by overflow on the triggering container (e.g. schema
 * table cards with overflow: hidden).
 *
 * Remember to call destroy() when the triggering component is removed,
 * otherwise the floating menu element stays orphaned in the DOM.
 */
export class ContextMenu {

    /**
     * Currently-open menu, tracked globally so opening a second menu can
     * close the first one. The trigger-click handler stops propagation,
     * so the document-click path cannot do this on its own.
     * @protected
     */
    protected static _currentOpen: ContextMenu|null = null;

    /**
     * Trigger button (three dots)
     * @protected
     */
    protected _trigger: HTMLDivElement;

    /**
     * Floating menu panel (attached to document.body)
     * @protected
     */
    protected _menu: HTMLDivElement;

    /**
     * Whether the menu is currently open
     * @protected
     */
    protected _open: boolean = false;

    /**
     * Bound document listener so we can remove it again
     * @protected
     */
    protected _onDocumentClick: (e: MouseEvent) => void;

    /**
     * Bound keydown listener
     * @protected
     */
    protected _onKeyDown: (e: KeyboardEvent) => void;

    /**
     * Bound reposition listener
     * @protected
     */
    protected _onReposition: () => void;

    /**
     * Items injected for the current link-mode override. When link mode is
     * active the regular items are hidden and these replacements are shown.
     * @protected
     */
    protected _linkModeItems: HTMLElement[] = [];

    /**
     * Constructor
     */
    public constructor() {
        this._trigger = document.createElement('div');
        this._trigger.classList.add('context-menu-trigger');
        this._trigger.title = 'More actions';
        this._trigger.innerHTML = '<span></span><span></span><span></span>';

        // keep jsPlumb (or any parent drag handler) from reacting
        this._trigger.addEventListener('mousedown', e => {
            e.stopPropagation();
        });

        this._trigger.addEventListener('click', e => {
            e.stopPropagation();
            this.toggle();
        });

        this._menu = document.createElement('div');
        this._menu.classList.add('context-menu');
        this._menu.style.display = 'none';
        // swallow clicks on the panel itself so clicks on empty areas
        // between items don't close the menu via the document listener
        this._menu.addEventListener('click', e => e.stopPropagation());

        document.body.appendChild(this._menu);

        this._onDocumentClick = () => {
            if (this._open) {
                this.close();
            }
        };

        this._onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this._open) {
                this.close();
            }
        };

        this._onReposition = () => {
            if (this._open) {
                this._position();
            }
        };
    }

    /**
     * Add a menu item. Returns the created button element so callers can
     * toggle visibility (e.g. hide an item when a schema type changes).
     * @param {ContextMenuItem} item
     * @return {HTMLButtonElement}
     */
    public addItem(item: ContextMenuItem): HTMLButtonElement {
        const el = document.createElement('button');
        el.type = 'button';
        el.classList.add('context-menu-item');

        if (item.danger) {
            el.classList.add('danger');
        }

        if (item.disabled) {
            el.classList.add('disabled');
            el.disabled = true;
        }

        const icon = document.createElement('span');
        icon.classList.add('context-menu-item-icon');
        icon.textContent = item.icon ?? '';
        el.appendChild(icon);

        const label = document.createElement('span');
        label.classList.add('context-menu-item-label');
        label.textContent = item.label;
        el.appendChild(label);

        el.addEventListener('click', e => {
            e.stopPropagation();

            if (el.disabled) {
                return;
            }

            this.close();
            item.onClick();
        });

        this._menu.appendChild(el);
        return el;
    }

    /**
     * Add a horizontal divider between groups of items.
     */
    public addSeparator(): void {
        const sep = document.createElement('div');
        sep.classList.add('context-menu-separator');
        this._menu.appendChild(sep);
    }

    /**
     * Return the trigger element — append this to wherever the menu
     * should be reachable from (a headline, a field row, …).
     */
    public getTriggerElement(): HTMLDivElement {
        return this._trigger;
    }

    /**
     * Open the menu, positioning it relative to the trigger and
     * clamping to the viewport.
     */
    public open(): void {
        if (this._open) {
            return;
        }

        // Close any other open menu first so only one is ever visible.
        if (ContextMenu._currentOpen && ContextMenu._currentOpen !== this) {
            ContextMenu._currentOpen.close();
        }

        this._menu.style.visibility = 'hidden';
        this._menu.style.display = '';
        this._position();
        this._menu.style.visibility = '';

        this._open = true;
        this._trigger.classList.add('open');
        ContextMenu._currentOpen = this;

        document.addEventListener('click', this._onDocumentClick);
        document.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('scroll', this._onReposition, true);
        window.addEventListener('resize', this._onReposition);
    }

    /**
     * Close the menu.
     */
    public close(): void {
        if (!this._open) {
            return;
        }

        this._menu.style.display = 'none';
        this._open = false;
        this._trigger.classList.remove('open');

        if (ContextMenu._currentOpen === this) {
            ContextMenu._currentOpen = null;
        }

        document.removeEventListener('click', this._onDocumentClick);
        document.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('scroll', this._onReposition, true);
        window.removeEventListener('resize', this._onReposition);
    }

    /**
     * Toggle open/closed.
     */
    public toggle(): void {
        if (this._open) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Replace the current menu with a link-mode override: hides every
     * existing item/separator and shows only the passed entries. Used
     * when the owning table is reused as a LinkTable — most regular
     * actions (edit, delete, add field, …) do not apply to a link.
     * @param {ContextMenuEntry[]} entries
     */
    public setLinkMode(entries: ContextMenuEntry[]): void {
        this.clearLinkMode();

        for (const child of Array.from(this._menu.children)) {
            const el = child as HTMLElement;
            el.dataset.linkModeHidden = 'true';
            el.style.display = 'none';
        }

        for (const entry of entries) {
            if ('separator' in entry) {
                const sep = document.createElement('div');
                sep.classList.add('context-menu-separator');
                this._menu.appendChild(sep);
                this._linkModeItems.push(sep);
            } else {
                const el = this.addItem(entry);
                this._linkModeItems.push(el);
            }
        }
    }

    /**
     * Undo setLinkMode — remove the injected link items and reveal the
     * original ones. Safe to call when link mode is not active.
     */
    public clearLinkMode(): void {
        for (const el of this._linkModeItems) {
            el.remove();
        }
        this._linkModeItems = [];

        for (const child of Array.from(this._menu.children)) {
            const el = child as HTMLElement;
            if (el.dataset.linkModeHidden === 'true') {
                el.style.display = '';
                delete el.dataset.linkModeHidden;
            }
        }
    }

    /**
     * Hide or show the trigger button entirely (used for readonly mode).
     * @param {boolean} visible
     */
    public setTriggerVisible(visible: boolean): void {
        this._trigger.style.display = visible ? '' : 'none';

        if (!visible) {
            this.close();
        }
    }

    /**
     * Destroy — removes the menu panel from document.body and closes it.
     * Must be called when the owning component is removed.
     */
    public destroy(): void {
        this.close();
        this._menu.remove();
        this._trigger.remove();
    }

    /**
     * Position the menu panel next to the trigger, flipping above the
     * trigger if there is not enough space below, and clamping to the
     * horizontal viewport.
     * @protected
     */
    protected _position(): void {
        const triggerRect = this._trigger.getBoundingClientRect();
        const menuRect = this._menu.getBoundingClientRect();
        const margin = 4;

        let top = triggerRect.bottom + margin;
        let left = triggerRect.right - menuRect.width;

        if (top + menuRect.height > window.innerHeight - margin) {
            top = triggerRect.top - menuRect.height - margin;
        }

        if (left < margin) {
            left = margin;
        }

        if (left + menuRect.width > window.innerWidth - margin) {
            left = window.innerWidth - menuRect.width - margin;
        }

        this._menu.style.top = `${top}px`;
        this._menu.style.left = `${left}px`;
    }

}
import './Tooltip.css';

/**
 * Tooltip — a small info icon that shows a panel with descriptive text
 * when hovered. The panel is appended to document.body so it is not
 * clipped by overflow: hidden on parent cards or by jsPlumb transforms
 * applied during table drags.
 *
 * Call destroy() when the owning component is removed, otherwise the
 * panel stays orphaned in the DOM.
 */
export class Tooltip {

    /**
     * Wrapper element containing the icon (lives next to the field name)
     * @protected
     */
    protected _divWrapper: HTMLSpanElement;

    /**
     * The info icon itself
     * @protected
     */
    protected _iconInfo: HTMLSpanElement;

    /**
     * Floating panel appended to document.body
     * @protected
     */
    protected _divInfoContent: HTMLDivElement;

    /**
     * Bound reposition listener so we can add/remove it
     * @protected
     */
    protected _onReposition: () => void;

    /**
     * Constructor
     */
    public constructor() {
        this._divWrapper = document.createElement('span');
        this._divWrapper.classList.add('info-tooltip-icon-wrapper');

        this._iconInfo = document.createElement('span');
        this._iconInfo.classList.add('info-tooltip-icon');
        this._iconInfo.textContent = 'i';
        this._divWrapper.appendChild(this._iconInfo);

        this._divInfoContent = document.createElement('div');
        this._divInfoContent.classList.add('info-tooltip');
        document.body.appendChild(this._divInfoContent);

        this._onReposition = () => {
            if (this._divInfoContent.classList.contains('visible')) {
                this._position();
            }
        };

        this._divWrapper.addEventListener('mouseenter', () => {
            this._position();
            this._divInfoContent.classList.add('visible');

            window.addEventListener('scroll', this._onReposition, true);
            window.addEventListener('resize', this._onReposition);
        });

        this._divWrapper.addEventListener('mouseleave', () => {
            this._divInfoContent.classList.remove('visible');

            window.removeEventListener('scroll', this._onReposition, true);
            window.removeEventListener('resize', this._onReposition);
        });
    }

    /**
     * Return the wrapper element (the icon) — append this where the
     * tooltip should be reachable from.
     * @return {HTMLElement}
     */
    public getElement(): HTMLElement {
        return this._divWrapper;
    }

    /**
     * Show the icon.
     */
    public show(): void {
        this._divWrapper.style.display = '';
    }

    /**
     * Hide the icon (and the panel if it is currently visible).
     */
    public hide(): void {
        this._divWrapper.style.display = 'none';
        this._divInfoContent.classList.remove('visible');
    }

    /**
     * Set the tooltip content.
     * @param {string} content
     */
    public setContent(content: string): void {
        this._divInfoContent.textContent = content;
    }

    /**
     * Destroy — removes the floating panel from document.body.
     * Call from the owning component's remove() method.
     */
    public destroy(): void {
        window.removeEventListener('scroll', this._onReposition, true);
        window.removeEventListener('resize', this._onReposition);
        this._divInfoContent.remove();
        this._divWrapper.remove();
    }

    /**
     * Position the panel relative to the icon. Tries below first; if
     * it would overflow the viewport, flips above. Clamps horizontally
     * and exposes the arrow's X offset via the --arrow-x custom
     * property so the pointer stays aligned with the icon center.
     * @protected
     */
    protected _position(): void {
        // make the panel measurable without flashing it on screen
        const wasVisible = this._divInfoContent.classList.contains('visible');
        this._divInfoContent.style.visibility = 'hidden';
        this._divInfoContent.classList.remove('visible');
        this._divInfoContent.classList.remove('above');

        const iconRect = this._divWrapper.getBoundingClientRect();
        const panelRect = this._divInfoContent.getBoundingClientRect();
        const margin = 8;

        const iconCenterX = iconRect.left + iconRect.width / 2;
        let top = iconRect.bottom + margin;
        let left = iconCenterX - panelRect.width / 2;
        let above = false;

        if (top + panelRect.height > window.innerHeight - margin) {
            top = iconRect.top - panelRect.height - margin;
            above = true;
        }

        if (left < margin) {
            left = margin;
        }

        if (left + panelRect.width > window.innerWidth - margin) {
            left = window.innerWidth - panelRect.width - margin;
        }

        const arrowX = iconCenterX - left;

        this._divInfoContent.style.top = `${top}px`;
        this._divInfoContent.style.left = `${left}px`;
        this._divInfoContent.style.setProperty('--arrow-x', `${arrowX}px`);

        if (above) {
            this._divInfoContent.classList.add('above');
        }

        if (wasVisible) {
            this._divInfoContent.classList.add('visible');
        }

        this._divInfoContent.style.visibility = '';
    }

}
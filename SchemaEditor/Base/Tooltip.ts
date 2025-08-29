import './Tooltip.css';
import {EditorIcons} from './EditorIcons.js';

/**
 * Tooltip
 */
export class Tooltip {

    /**
     * div wrapper
     * @protected
     */
    protected _divWrapper: HTMLDivElement;

    /**
     * div info content
     * @protected
     */
    protected _divInfoContent: HTMLDivElement;

    /**
     * Constructor
     */
    public constructor() {
        this._divWrapper = document.createElement('div');
        this._divWrapper.classList.add(...['info-tooltip-icon-wrapper']);

        const iconInfo = document.createElement('span');
        iconInfo.classList.add('info-tooltip-icon');
        iconInfo.textContent = EditorIcons.info;
        this._divWrapper.appendChild(iconInfo);

        this._divInfoContent = document.createElement('div');
        this._divInfoContent.classList.add('info-tooltip');
        this._divWrapper.appendChild(this._divInfoContent);

        this._divWrapper.addEventListener('mousemove', (e) => {
            const dialogParent = this._divWrapper.closest('dialog');

            if (dialogParent) {
                const rect = dialogParent.getBoundingClientRect();
                const scrollTop = dialogParent.scrollTop;
                const scrollLeft = dialogParent.scrollLeft;

                this._divInfoContent.style.left = `${e.clientX - rect.left + scrollLeft - 90 - 14}px`;
                this._divInfoContent.style.top = `${e.clientY - rect.top + scrollTop + 22}px`;
            } else {
                this._divInfoContent.style.left = `${e.clientX - 14}px`;
                this._divInfoContent.style.top = `${e.clientY + 22}px`;
            }
        });

        this._divWrapper.addEventListener('mouseenter', (e) => {
            this._divInfoContent.style.display = 'block';
            this._divInfoContent.style.visibility = 'visible';
            this._divInfoContent.style.opacity = '1';
            this._divInfoContent.style.position = 'fixed';
            this._divInfoContent.style.zIndex = '100000';
        });

        this._divWrapper.addEventListener('mouseleave', () => {
            this._divInfoContent.style.display = 'none';
            this._divInfoContent.style.visibility = 'hidden';
            this._divInfoContent.style.opacity = '0';
        });
    }

    /**
     * Return the element
     * @return {HTMLDivElement}
     */
    public getElement(): HTMLDivElement {
        return this._divWrapper;
    }

    /**
     * Show
     */
    public show(): void {
        this._divWrapper.style.display = '';
    }

    /**
     * Hide
     */
    public hide(): void {
        this._divWrapper.style.display = 'none';
    }

    /**
     * Set the content
     * @param {string} content
     */
    public setContent(content: string): void {
        this._divInfoContent.textContent = content;
    }

}
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

        this._divWrapper.addEventListener('mouseenter', () => {
            const rect = this._divWrapper.getBoundingClientRect();
            this._divInfoContent.style.display = 'block';
            this._divInfoContent.style.left = `${rect.left + rect.width / 2}px`;
            this._divInfoContent.style.top = `${rect.bottom + 8}px`;
        });

        this._divWrapper.addEventListener('mouseleave', () => {
            this._divInfoContent.style.display = 'none';
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
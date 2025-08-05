import './Wiggle.css';

/**
 * Wiggle
 */
export class Wiggle {

    /**
     * Run wiggle
     * @param {HTMLElement} element
     */
    public static runWiggle(element: HTMLElement): void {
        element.classList.add('element-wiggle');
        setTimeout(() => {
            element.classList.remove('element-wiggle');
        }, 300);
    }

}
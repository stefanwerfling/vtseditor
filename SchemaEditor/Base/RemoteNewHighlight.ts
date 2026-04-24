import './RemoteNewHighlight.css';

const CLASS = 'vts-remote-new';
const DURATION_MS = 3000;

/**
 * Flash a "just arrived from a remote mutation" pulse on the given
 * canvas element. Removes the class after the animation finishes so
 * a second application (rapid back-to-back MCP edits on the same
 * item) retriggers the keyframes from 0 instead of staying static.
 */
export function highlightRemoteNew(element: HTMLElement): void {
    element.classList.remove(CLASS);
    // Force a reflow so the animation restarts when the class is
    // added again within the same tick.
    void element.offsetWidth;
    element.classList.add(CLASS);

    setTimeout(() => {
        element.classList.remove(CLASS);
    }, DURATION_MS + 50);
}
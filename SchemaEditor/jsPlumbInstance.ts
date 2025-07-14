import { newInstance, BrowserJsPlumbInstance } from '@jsplumb/browser-ui';

const jsPlumbInstance: BrowserJsPlumbInstance = newInstance({
    container: document.getElementById('schemagrid')!
});

export default jsPlumbInstance;
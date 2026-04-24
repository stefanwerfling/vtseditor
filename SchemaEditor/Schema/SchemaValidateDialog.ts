import {BaseDialog} from '../Base/BaseDialog.js';
import './SchemaValidateDialog.css';

/**
 * Mirrors the ValidationErrorNode type from SchemaValidator on the backend
 * so the frontend can render the error tree typed.
 */
type ValidationErrorNode = {
    key: string;
    messages: string[];
    children: ValidationErrorNode[];
};

type ValidateResponse = {
    success: boolean;
    result?: {
        valid: boolean;
        errors: ValidationErrorNode;
    };
    msg?: string;
};

type ExampleResponse = {
    success: boolean;
    example?: unknown;
    msg?: string;
};

/**
 * Dialog that lets the user paste a JSON object and validate it against the
 * selected schema. On validate the current text is POSTed to
 * /api/validate-schema; the server builds the VTS validator on the fly and
 * returns an error tree that is rendered indented below the input.
 */
export class SchemaValidateDialog extends BaseDialog {

    protected _schemaUnid: string;
    protected _textareaJson: HTMLTextAreaElement;
    protected _logArea: HTMLDivElement;
    protected _isArrayMode: boolean = false;

    /**
     * Constructor
     * @param {string} schemaUnid
     * @param {string} schemaName
     */
    public constructor(schemaUnid: string, schemaName: string) {
        super();

        this._schemaUnid = schemaUnid;
        this.setDialogTitle(`Validate JSON against "${schemaName}"`);

        this._btnConfirm.textContent = 'Validate';
        this._btnCancel.textContent = 'Close';

        // Toolbar row: "JSON input" label on the left, "Load example" on the
        // right so the user can fill the textarea with a schema-shaped template.
        const toolbar = document.createElement('div');
        toolbar.classList.add('validate-toolbar');

        const labelJson = document.createElement('div');
        labelJson.classList.add('dialog-label');
        labelJson.textContent = 'JSON input';
        toolbar.appendChild(labelJson);

        const btnExample = document.createElement('button');
        btnExample.type = 'button';
        btnExample.classList.add('validate-btn-example');
        btnExample.textContent = '📝 Load example';
        btnExample.addEventListener('click', () => {
            this._loadExample();
        });
        toolbar.appendChild(btnExample);

        this._divBody.appendChild(toolbar);

        this._textareaJson = document.createElement('textarea');
        this._textareaJson.classList.add('validate-json-input');
        this._textareaJson.placeholder = '{\n  "field": "value"\n}';
        this._textareaJson.spellcheck = false;
        this._textareaJson.rows = 14;
        this._divBody.appendChild(this._textareaJson);

        const labelLog = document.createElement('div');
        labelLog.classList.add('dialog-label');
        labelLog.textContent = 'Result';
        this._divBody.appendChild(labelLog);

        this._logArea = document.createElement('div');
        this._logArea.classList.add('validate-log');
        this._renderEmpty();
        this._divBody.appendChild(this._logArea);

        // Returning false keeps the dialog open so the user can iterate on
        // the JSON input without having to reopen the dialog.
        this.setOnConfirm(() => {
            this._runValidation();
            return false;
        });
    }

    /**
     * Pre-fill the textarea with a JSON string and immediately kick off
     * validation. Used by external triggers (e.g. the JetBrains plugin
     * posting a `validateSchema` event) so the result is visible without
     * the user clicking anything.
     *
     * When `isArray` is true the JSON is expected to be an array — each
     * element is validated individually against the schema and the errors
     * are aggregated per index.
     * @param {string} jsonString
     * @param {boolean} isArray
     */
    public validateNow(jsonString: string, isArray: boolean = false): void {
        this._isArrayMode = isArray;
        this._textareaJson.value = jsonString;
        this._runValidation();
    }

    /**
     * Render the placeholder hint while no validation has run yet.
     * @protected
     */
    protected _renderEmpty(): void {
        this._logArea.innerHTML = '';
        const hint = document.createElement('div');
        hint.classList.add('validate-log-hint');
        hint.textContent = 'Paste a JSON object above and click "Validate".';
        this._logArea.appendChild(hint);
    }

    /**
     * Render a success badge.
     * @protected
     */
    protected _renderSuccess(): void {
        this._logArea.innerHTML = '';
        const badge = document.createElement('div');
        badge.classList.add('validate-log-success');
        badge.textContent = '✓ JSON is valid';
        this._logArea.appendChild(badge);
    }

    /**
     * Render a failure message (no tree, e.g. for transport errors).
     * @param {string} message
     * @protected
     */
    protected _renderFailureMessage(message: string): void {
        this._logArea.innerHTML = '';
        const box = document.createElement('div');
        box.classList.add('validate-log-failure');
        box.textContent = message;
        this._logArea.appendChild(box);
    }

    /**
     * Render the indented error tree.
     * @param {ValidationErrorNode} root
     * @protected
     */
    protected _renderErrorTree(root: ValidationErrorNode): void {
        this._logArea.innerHTML = '';

        const header = document.createElement('div');
        header.classList.add('validate-log-header');
        header.textContent = '✗ Validation failed';
        this._logArea.appendChild(header);

        const body = document.createElement('div');
        body.classList.add('validate-log-tree');
        this._appendNode(body, root, true);
        this._logArea.appendChild(body);
    }

    /**
     * Recursively render a ValidationErrorNode into a container div.
     * @param {HTMLElement} container
     * @param {ValidationErrorNode} node
     * @param {boolean} isRoot
     * @protected
     */
    protected _appendNode(container: HTMLElement, node: ValidationErrorNode, isRoot: boolean): void {
        const nodeDiv = document.createElement('div');
        nodeDiv.classList.add('validate-log-node');

        if (!isRoot) {
            const keyEl = document.createElement('span');
            keyEl.classList.add('validate-log-key');
            keyEl.textContent = node.key;
            nodeDiv.appendChild(keyEl);
        }

        for (const msg of node.messages) {
            const msgEl = document.createElement('div');
            msgEl.classList.add('validate-log-message');
            msgEl.textContent = msg;
            nodeDiv.appendChild(msgEl);
        }

        if (node.children.length > 0) {
            const childrenDiv = document.createElement('div');
            childrenDiv.classList.add('validate-log-children');

            for (const child of node.children) {
                this._appendNode(childrenDiv, child, false);
            }

            nodeDiv.appendChild(childrenDiv);
        }

        container.appendChild(nodeDiv);
    }

    /**
     * POST the current JSON to the backend and render the response.
     * Dispatches to the array-mode pathway when `_isArrayMode` is set.
     * @protected
     */
    protected async _runValidation(): Promise<void> {
        const json = this._textareaJson.value;

        this._logArea.innerHTML = '';
        const loading = document.createElement('div');
        loading.classList.add('validate-log-hint');
        loading.textContent = 'Validating …';
        this._logArea.appendChild(loading);

        if (this._isArrayMode) {
            await this._runArrayValidation(json);
            return;
        }

        await this._runSingleValidation(json);
    }

    /**
     * POSTs a single JSON payload to the backend and renders the response.
     * @param {string} json
     * @protected
     */
    protected async _runSingleValidation(json: string): Promise<void> {
        const data = await this._postValidate(json);

        if (typeof data === 'string') {
            this._renderFailureMessage(data);
            return;
        }

        if (data.result.valid) {
            this._renderSuccess();
            return;
        }

        this._renderErrorTree(data.result.errors);
    }

    /**
     * Parses the JSON as an array and validates each element individually
     * against the schema. Failures are aggregated under a synthetic root
     * whose children are keyed `[i]` for each failing index.
     * @param {string} json
     * @protected
     */
    protected async _runArrayValidation(json: string): Promise<void> {
        let parsed: unknown;

        try {
            parsed = JSON.parse(json);
        } catch (e) {
            this._renderFailureMessage(`Invalid JSON: ${(e as Error).message}`);
            return;
        }

        if (!Array.isArray(parsed)) {
            this._renderFailureMessage('Expected a JSON array — the variable was flagged as an array type.');
            return;
        }

        if (parsed.length === 0) {
            this._renderSuccess();
            return;
        }

        const responses = await Promise.all(
            parsed.map(element => this._postValidate(JSON.stringify(element)))
        );

        const failedChildren: ValidationErrorNode[] = [];
        let transportError: string | null = null;

        responses.forEach((data, index) => {
            if (typeof data === 'string') {
                transportError = transportError ?? data;
                return;
            }

            if (!data.result.valid) {
                failedChildren.push({
                    key: `[${index}]`,
                    messages: data.result.errors.messages,
                    children: data.result.errors.children
                });
            }
        });

        if (transportError !== null && failedChildren.length === 0) {
            this._renderFailureMessage(transportError);
            return;
        }

        if (failedChildren.length === 0) {
            this._renderSuccess();
            return;
        }

        this._renderErrorTree({
            key: '',
            messages: [`${failedChildren.length} of ${parsed.length} elements failed validation.`],
            children: failedChildren
        });
    }

    /**
     * Low-level single POST to `/api/validate-schema`. Returns the parsed
     * response on success, or an error message string on transport / protocol
     * failure so callers can decide how to render or aggregate it.
     * @param {string} json
     * @protected
     */
    protected async _postValidate(json: string): Promise<ValidateResponse & { result: NonNullable<ValidateResponse['result']> } | string> {
        let response: Response;

        try {
            response = await fetch('/api/validate-schema', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    schemaUnid: this._schemaUnid,
                    json
                })
            });
        } catch (e) {
            return `Request failed: ${(e as Error).message}`;
        }

        let data: ValidateResponse;

        try {
            data = await response.json();
        } catch {
            return `Server returned non-JSON response (HTTP ${response.status}).`;
        }

        if (!response.ok || !data.success || !data.result) {
            return data.msg ?? `Validation request failed (HTTP ${response.status}).`;
        }

        return data as ValidateResponse & { result: NonNullable<ValidateResponse['result']> };
    }

    /**
     * Fetch a schema-shaped example from the backend and drop it into the
     * textarea, replacing whatever is there. Errors surface in the log area.
     * @protected
     */
    protected async _loadExample(): Promise<void> {
        let response: Response;

        try {
            response = await fetch('/api/schema-example', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({schemaUnid: this._schemaUnid})
            });
        } catch (e) {
            this._renderFailureMessage(`Request failed: ${(e as Error).message}`);
            return;
        }

        let data: ExampleResponse;

        try {
            data = await response.json();
        } catch {
            this._renderFailureMessage(`Server returned non-JSON response (HTTP ${response.status}).`);
            return;
        }

        if (!response.ok || !data.success) {
            this._renderFailureMessage(data.msg ?? `Example request failed (HTTP ${response.status}).`);
            return;
        }

        this._textareaJson.value = JSON.stringify(data.example, null, 2);
        this._renderEmpty();
    }
}
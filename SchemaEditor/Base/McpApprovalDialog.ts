import {McpApprovalRemember} from '../Api/SchemaMcpApprovalClient.js';
import {BaseDialog} from './BaseDialog.js';
import './McpApprovalDialog.css';

export type McpApprovalDecision = {
    allow: boolean;
    remember?: McpApprovalRemember;
};

/**
 * Modal prompting the user to allow or deny a pending MCP tool call.
 * Auto-closes if the backend emits an approval_resolved event for the
 * same requestId (e.g. timeout, or another tab decided first).
 *
 * The "Remember" radio group maps to `McpApprovalRemember`:
 *   - Don't remember → single-shot decision
 *   - This session    → server caches the decision until restart
 *   - Forever         → server additionally writes it into vtseditor.json
 */
export class McpApprovalDialog extends BaseDialog {

    private readonly _requestId: string;
    private _resolved = false;
    private readonly _rememberInputs: HTMLInputElement[] = [];

    public constructor(
        requestId: string,
        tool: string,
        args: unknown,
        onDecision: (decision: McpApprovalDecision) => void
    ) {
        super();

        this._requestId = requestId;

        this.setDialogTitle('MCP tool approval');
        this._dialog.classList.add('mcp-approval-dialog');

        const toolChip = document.createElement('div');
        toolChip.classList.add('mcp-approval-tool');
        toolChip.textContent = tool;
        this._divBody.appendChild(toolChip);

        const hint = document.createElement('div');
        hint.classList.add('mcp-approval-hint');
        hint.textContent = 'An MCP client is requesting permission to run this tool with the arguments below.';
        this._divBody.appendChild(hint);

        const argsLabel = document.createElement('div');
        argsLabel.classList.add('mcp-approval-args-label');
        argsLabel.textContent = 'Arguments';
        this._divBody.appendChild(argsLabel);

        const argsPre = document.createElement('pre');
        argsPre.classList.add('mcp-approval-args');
        argsPre.textContent = McpApprovalDialog._formatArgs(args);
        this._divBody.appendChild(argsPre);

        // Remember options -------------------------------------------

        const rememberGroupName = `mcp-remember-${requestId}`;
        const remember = document.createElement('div');
        remember.classList.add('mcp-approval-remember');

        const rememberLabel = document.createElement('div');
        rememberLabel.classList.add('mcp-approval-remember-label');
        rememberLabel.textContent = 'Remember decision';
        remember.appendChild(rememberLabel);

        const options = document.createElement('div');
        options.classList.add('mcp-approval-remember-options');

        const rememberChoices: Array<{value: ''|McpApprovalRemember; label: string; checked?: boolean}> = [
            {value: '', label: "Don't remember", checked: true},
            {value: 'session', label: 'This session'},
            {value: 'forever', label: 'Forever (writes vtseditor.json)'}
        ];

        for (const choice of rememberChoices) {
            const label = document.createElement('label');

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = rememberGroupName;
            input.value = choice.value;

            if (choice.checked) {
                input.checked = true;
            }

            label.appendChild(input);
            label.appendChild(document.createTextNode(choice.label));
            options.appendChild(label);

            this._rememberInputs.push(input);
        }

        remember.appendChild(options);

        const rememberHint = document.createElement('div');
        rememberHint.classList.add('mcp-approval-remember-hint');
        rememberHint.textContent = 'Applies to the selected action (Allow or Deny) and covers any future call of this tool.';
        remember.appendChild(rememberHint);

        this._divBody.appendChild(remember);

        // Buttons ---------------------------------------------------

        this._btnCancel.textContent = 'Deny';
        this._btnConfirm.textContent = 'Allow';

        this._btnCancel.addEventListener('click', () => {
            if (this._resolved) {
                return;
            }

            this._resolved = true;
            onDecision({allow: false, remember: this._getRemember()});
        });

        this._btnConfirm.addEventListener('click', () => {
            if (this._resolved) {
                return;
            }

            this._resolved = true;
            onDecision({allow: true, remember: this._getRemember()});
        });

        this._btnCloseX.addEventListener('click', () => {
            if (this._resolved) {
                return;
            }

            this._resolved = true;
            // Closing the dialog is a deny, but never a remembered one —
            // an accidental X click shouldn't persist a denial.
            onDecision({allow: false});
        });
    }

    private _getRemember(): McpApprovalRemember|undefined {
        for (const input of this._rememberInputs) {
            if (input.checked && input.value !== '') {
                return input.value as McpApprovalRemember;
            }
        }

        return undefined;
    }

    public getRequestId(): string {
        return this._requestId;
    }

    /**
     * Called when the backend has already decided this request (timeout,
     * other tab, etc.). Closes the dialog without re-posting a decision.
     */
    public dismiss(): void {
        if (this._resolved) {
            this.destroy();
            return;
        }

        this._resolved = true;
        this.destroy();
    }

    private static _formatArgs(args: unknown): string {
        try {
            return JSON.stringify(args, null, 2);
        } catch {
            return String(args);
        }
    }

}

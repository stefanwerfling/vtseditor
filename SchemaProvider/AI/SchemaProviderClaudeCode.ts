import {spawn} from 'child_process';
import {SchemaEnvPlaceholderUtil} from '../../SchemaUtil/SchemaEnvPlaceholderUtil.js';
import {SchemaProviderAIBase} from '../SchemaProviderAIBase.js';
import {ConversationPartRole, ProviderConversationPart} from '../SchemaProviderConversationPart.js';

/**
 * SchemaProviderClaudeCode — spawns the local `claude` CLI (Claude Code) to
 * generate schemas without going through a remote HTTP API. Useful when the
 * user already has Claude Code authenticated on their machine (ANTHROPIC_API_KEY
 * or `claude login`) and wants a zero-setup provider inside the editor.
 *
 * Config mapping:
 *   apiUrl → path to the `claude` binary (default: `claude` from PATH)
 *   apiKey → optional ANTHROPIC_API_KEY injected into the child's env
 *   model  → optional --model alias or full name (e.g. "opus", "claude-sonnet-4-6")
 */
export class SchemaProviderClaudeCode extends SchemaProviderAIBase {

    /**
     * How long to wait before killing a stuck `claude` invocation (ms).
     * @protected
     */
    protected static readonly _TIMEOUT_MS = 180_000;

    /**
     * Send request — build args, pipe the prompt via stdin to avoid ARG_MAX
     * limits, parse the JSON envelope claude emits with --output-format json.
     * @param {ProviderConversationPart[]} conversation
     * @protected
     */
    protected async _sendRequest(conversation: ProviderConversationPart[]): Promise<string | null> {
        if (conversation.length === 0) {
            return null;
        }

        // The base class seeds the conversation with the schema-JSON prompt
        // as the first item. We pass that as --system-prompt so Claude sees
        // the "return strict JSON" instruction as a proper system directive.
        const systemPrompt = conversation[0]?.text ?? '';
        const turns = conversation.slice(1);

        // Claude Code CLI is stateless per invocation — replay the dialog
        // as a single user prompt so multi-turn schema refinement keeps
        // working across calls.
        const userPrompt = this._buildUserPrompt(turns);

        if (!userPrompt) {
            return null;
        }

        const binary = SchemaEnvPlaceholderUtil.replace(this._config.apiUrl || '').trim() || 'claude';
        const apiKey = SchemaEnvPlaceholderUtil.replace(this._config.apiKey || '').trim();

        // Kein --bare: damit der vorhandene OAuth-/Keychain-Login der lokalen
        // Claude-Code-Installation genutzt wird. --bare würde das deaktivieren
        // und einen ANTHROPIC_API_KEY erzwingen.
        const args: string[] = [
            '-p',
            '--output-format', 'json',
            '--system-prompt', systemPrompt
        ];

        if (this._config.model) {
            args.push('--model', this._config.model);
        }

        const env: NodeJS.ProcessEnv = {...process.env};

        if (apiKey) {
            env.ANTHROPIC_API_KEY = apiKey;
        }

        console.log(`Request Claude Code: ${binary} ${args.join(' ')}`);

        return new Promise<string | null>((resolve, reject) => {
            const child = spawn(binary, args, {env});
            let stdout = '';
            let stderr = '';
            let settled = false;

            const timeout = setTimeout(() => {
                if (settled) {
                    return;
                }

                settled = true;
                child.kill('SIGTERM');
                reject(new Error(`claude CLI timed out after ${SchemaProviderClaudeCode._TIMEOUT_MS}ms`));
            }, SchemaProviderClaudeCode._TIMEOUT_MS);

            child.stdout.on('data', (chunk) => {
                stdout += chunk.toString();
            });

            child.stderr.on('data', (chunk) => {
                stderr += chunk.toString();
            });

            child.on('error', (err) => {
                if (settled) {
                    return;
                }

                settled = true;
                clearTimeout(timeout);
                reject(new Error(`Could not spawn claude CLI ("${binary}"): ${err.message}`));
            });

            child.on('close', (code) => {
                if (settled) {
                    return;
                }

                settled = true;
                clearTimeout(timeout);

                if (code !== 0) {
                    // Bei --output-format json schreibt claude den eigentlichen
                    // Fehler (z.B. "Not logged in") in den JSON-Envelope auf
                    // stdout, nicht nach stderr. Erst stdout parsen, sonst
                    // sieht der User nur "(no stderr)".
                    const stdoutError = this._extractError(stdout);
                    const detail = stdoutError || stderr.trim() || '(no stderr)';
                    reject(new Error(`claude CLI exited with code ${code}: ${detail}`));
                    return;
                }

                const result = this._extractResult(stdout);
                resolve(result);
            });

            // pipe prompt via stdin (avoids ARG_MAX issues with long dialogs)
            child.stdin.write(userPrompt);
            child.stdin.end();
        });
    }

    /**
     * Join replayed turns into a single prompt with simple role prefixes.
     * @param {ProviderConversationPart[]} turns
     * @return {string}
     * @protected
     */
    protected _buildUserPrompt(turns: ProviderConversationPart[]): string {
        const lines: string[] = [];

        for (const turn of turns) {
            const label = turn.role === ConversationPartRole.user ? 'User' : 'Assistant';
            lines.push(`${label}: ${turn.text}`);
            lines.push('');
        }

        return lines.join('\n').trim();
    }

    /**
     * Pull a human-readable error out of the JSON envelope claude emits when
     * it fails (`is_error: true`, with the message in `result`). Returns an
     * empty string if stdout isn't a parseable error envelope.
     * @param {string} stdout
     * @return {string}
     * @protected
     */
    protected _extractError(stdout: string): string {
        const trimmed = stdout.trim();

        if (!trimmed) {
            return '';
        }

        try {
            const parsed = JSON.parse(trimmed);

            if (parsed && typeof parsed === 'object' && parsed.is_error && typeof parsed.result === 'string') {
                return parsed.result;
            }
        } catch {
            // not JSON — caller will fall back to stderr
        }

        return '';
    }

    /**
     * Parse the JSON envelope `claude --output-format json` emits and pull
     * out the `result` field. Falls back to the raw stdout if parsing fails
     * so the base class's JSON extractor still gets a chance.
     * @param {string} stdout
     * @return {string|null}
     * @protected
     */
    protected _extractResult(stdout: string): string | null {
        const trimmed = stdout.trim();

        if (!trimmed) {
            return null;
        }

        try {
            const parsed = JSON.parse(trimmed);

            if (parsed && typeof parsed === 'object' && typeof parsed.result === 'string') {
                return parsed.result;
            }
        } catch {
            // Envelope not JSON — may have been --output-format text by mistake
            // or the CLI printed something unexpected. Hand the raw text to
            // the base class's JSON extractor.
        }

        return trimmed;
    }
}
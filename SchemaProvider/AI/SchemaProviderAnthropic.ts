import {SchemaEnvPlaceholderUtil} from '../../SchemaUtil/SchemaEnvPlaceholderUtil.js';
import {SchemaProviderAIBase} from '../SchemaProviderAIBase.js';
import {ConversationPartRole, ProviderConversationPart} from '../SchemaProviderConversationPart.js';

/**
 * SchemaProviderAnthropic — talks to the Anthropic Messages API directly
 * (no local `claude` CLI). Use this when you just want to hit api.anthropic.com
 * with an ANTHROPIC_API_KEY and don't have / don't want Claude Code installed.
 *
 * Config mapping:
 *   apiKey → ANTHROPIC_API_KEY (required)
 *   apiUrl → base URL (default: https://api.anthropic.com)
 *   model  → model ID (default: claude-sonnet-4-5)
 */
export class SchemaProviderAnthropic extends SchemaProviderAIBase {

    /**
     * Anthropic Messages API version pinned against the schema we send.
     * @protected
     */
    protected static readonly _API_VERSION = '2023-06-01';

    /**
     * Fallback model when the config doesn't specify one.
     * @protected
     */
    protected static readonly _DEFAULT_MODEL = 'claude-sonnet-4-5';

    /**
     * Cached raw response — used by _getTotalTokens so the base class can
     * decide to trim the conversation history.
     * @protected
     */
    protected _lastResponse: any = null;

    /**
     * Send request
     * @param {ProviderConversationPart[]} conversation
     * @protected
     */
    protected async _sendRequest(conversation: ProviderConversationPart[]): Promise<string | null> {
        const apiKey = SchemaEnvPlaceholderUtil.replace(this._config.apiKey || '').trim();

        if (!apiKey) {
            throw new Error('Anthropic provider requires an apiKey (ANTHROPIC_API_KEY).');
        }

        const rawUrl = SchemaEnvPlaceholderUtil.replace(this._config.apiUrl || '').trim();
        const baseUrl = (rawUrl || 'https://api.anthropic.com').replace(/\/+$/, '');
        const url = `${baseUrl}/v1/messages`;

        // The base class seeds the conversation with the strict-JSON prompt
        // as the first entry (role=user). Anthropic's API has a dedicated
        // `system` field, so split it out instead of leaving it as a "user"
        // turn — improves prompt caching and follows the API contract.
        const systemPrompt = conversation[0]?.text ?? '';
        const turns = conversation.slice(1);

        const messages = turns.map(h => ({
            role: h.role === ConversationPartRole.user ? 'user' : 'assistant',
            content: h.text
        }));

        const body = {
            model: this._config.model ?? SchemaProviderAnthropic._DEFAULT_MODEL,
            max_tokens: 2048,
            system: systemPrompt,
            messages
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': SchemaProviderAnthropic._API_VERSION
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            throw new Error(`Request failed: ${response.status} ${response.statusText} ${errorBody}`.trim());
        }

        const data = await response.json();
        this._lastResponse = data;

        // content is an array of blocks (text, tool_use, ...). Pull the
        // first text block — the rest are ignored.
        if (Array.isArray(data?.content)) {
            for (const block of data.content) {
                if (block?.type === 'text' && typeof block.text === 'string') {
                    return block.text;
                }
            }
        }

        return null;
    }

    /**
     * Anthropic reports input + output tokens separately (no single total
     * field like OpenAI), so sum them for the base class's trim heuristic.
     * @protected
     */
    protected _getTotalTokens(): number {
        const usage = this._lastResponse?.usage;

        if (!usage) {
            return 0;
        }

        return (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0);
    }
}
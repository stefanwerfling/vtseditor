import {SchemaEnvPlaceholderUtil} from '../../SchemaUtil/SchemaEnvPlaceholderUtil.js';
import {SchemaProviderAIBase} from '../SchemaProviderAIBase.js';
import {ProviderConversationPart} from '../SchemaProviderConversationPart.js';

/**
 * SchemaProviderOpenAI
 */
export class SchemaProviderOpenAI extends SchemaProviderAIBase {

    private _lastResponse: any = null;

    /**
     * send request
     * @param {ProviderConversationPart[]} conversation
     * @protected
     */
    protected async _sendRequest(conversation: ProviderConversationPart[]): Promise<string | null> {
        const apiKey = SchemaEnvPlaceholderUtil.replace(this._config.apiKey);
        const apiUrl = SchemaEnvPlaceholderUtil.replace(this._config.apiUrl);
        const url = `${apiUrl}/v1/chat/completions`;

        const body = {
            model: this._config.model ?? "gpt-4o-mini",  // default model
            messages: conversation.map(h => ({
                role: h.role,    // system | user | assistant
                content: h.text
            })),
            max_tokens: 2048
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        this._lastResponse = data;
        return data?.choices?.[0]?.message?.content ?? null;
    }

    protected _getTotalTokens(): number {
        return this._lastResponse?.usage?.total_tokens ?? 0;
    }
}
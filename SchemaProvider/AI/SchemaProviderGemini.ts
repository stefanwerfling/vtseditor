import {SchemaEnvPlaceholderUtil} from '../../SchemaUtil/SchemaEnvPlaceholderUtil.js';
import {SchemaProviderAIBase} from '../SchemaProviderAIBase.js';
import {ProviderConversationPart} from '../SchemaProviderConversationPart.js';

/**
 * Provider Gemini
 * Create API Key by https://aistudio.google.com/
 */
export class SchemaProviderGemini extends SchemaProviderAIBase {

    /**
     * last response from gemini
     * @private
     */
    private _lastResponse: any = null;

    /**
     * Send request
     * @param {ProviderConversationPart[]} conversation
     * @return {string | null}
     * @protected
     */
    protected async _sendRequest(conversation: ProviderConversationPart[]): Promise<string | null> {
        const apiKey = SchemaEnvPlaceholderUtil.replace(this._config.apiKey);
        const apiUrl = SchemaEnvPlaceholderUtil.replace(this._config.apiUrl);

        console.log(`Request Gemini url: ${apiUrl}`);

        const url = `${apiUrl}?key=${apiKey}`;

        const body = {
            contents: conversation.map(h => ({
                role: h.role,
                parts: [{ text: h.text }]
            }))
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        this._lastResponse = data;
        return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    }

    /**
     * Return total tokens
     * @protected
     */
    protected _getTotalTokens(): number {
        return this._lastResponse?.usageMetadata?.totalTokenCount ?? 0;
    }

}
import {SchemaDateUtil} from '../../SchemaUtil/SchemaDateUtil.js';
import {SchemaEnvPlaceholderUtil} from '../../SchemaUtil/SchemaEnvPlaceholderUtil.js';
import {SchemaProviderAIBase} from '../SchemaProviderAIBase.js';
import {ProviderConversationPart} from '../SchemaProviderConversationPart.js';

export class SchemaProviderLocalAI extends SchemaProviderAIBase {

    private _lastResponse: any = null;

    protected async _sendRequest(conversation: ProviderConversationPart[]): Promise<string | null> {
        const apiKey = SchemaEnvPlaceholderUtil.replace(this._config.apiKey);
        const apiUrl = SchemaEnvPlaceholderUtil.replace(this._config.apiUrl);
        const url = `${apiUrl}/v1/chat/completions`;

        console.log(`Request LocalAI url: ${apiUrl}`);

        const body = {
            model: this._config.model ?? "gpt-3.5-turbo",
            messages: conversation.map(h => ({
                role: h.role,    // system | user | assistant
                content: h.text
            })),
            max_tokens: 2048
        };

        console.log(`Start request at: ${SchemaDateUtil.getTimestamp()}`);
        const start = performance.now();

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {})
            },
            body: JSON.stringify(body)
        });

        const end = performance.now();
        console.log(`Stop request at:  ${SchemaDateUtil.getTimestamp()}`);

        console.log(`Request duration: ${(end - start).toFixed(2)} ms`);

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        this._lastResponse = data;

        let content = data?.choices?.[0]?.message?.content ?? null;

        if (content) {
            content = this._cleanResponse(content);
        }

        console.log(`Response content: ${content}`);

        return content;
    }

    protected _cleanResponse(text: string): string {
        let content = text;

        const idx = content.indexOf('</think>');

        if (idx !== -1) {
            content = content.slice(idx + '</think>'.length).trim();
        }

        return content;
    }

    protected _getTotalTokens(): number {
        return this._lastResponse?.usage?.total_tokens ?? 0;
    }
}
import {ConfigProvider} from '../../Config/Config.js';
import {SchemaEnvPlaceholderUtil} from '../../SchemaUtil/SchemaEnvPlaceholderUtil.js';
import {ASchemaProvider} from '../ASchemaProvider.js';
import {ProviderConversationJson, SchemaProviderConversationJson} from '../SchemaProviderConversationJson.js';
import {ConversationPartRole, ProviderConversationPart} from '../SchemaProviderConversationPart.js';
import {SchemaProviderConversationPrompt} from '../SchemaProviderConversationPrompt.js';

/**
 * Provider Gemini
 * Create API Key by https://aistudio.google.com/
 */
export class SchemaProviderGemini extends ASchemaProvider {

    /**
     * Conversation
     * @protected
     */
    protected _conversation: ProviderConversationPart[] = [];

    /**
     * Max tokens
     * @protected
     */
    protected _maxTokens: number = 100_000;

    /**
     * constructor
     * @param {ConfigProvider} config
     * @param {ProviderConversationPart[]} conversation
     */
    public constructor(config: ConfigProvider, conversation: ProviderConversationPart[] = []) {
        super(config);
        this._conversation = conversation;
    }

    public async generateSchema(description: string): Promise<void> {
        const apiKey = SchemaEnvPlaceholderUtil.replace(this._config.apiKey);
        const apiUrl = SchemaEnvPlaceholderUtil.replace(this._config.apiUrl);

        const url = `${apiUrl}?key=${apiKey}`;

        let msg = description;

        if (this._conversation.length === 0) {
            this._conversation.push({
                role: ConversationPartRole.user,
                text: SchemaProviderConversationPrompt.join(' '),
                json: null
            });
        }

        this._conversation.push({
            role: ConversationPartRole.user,
            text: msg,
            json: null
        });

        const body = {
            contents: this._conversation.map(h => ({
                role: h.role,
                parts: [{
                    text: h.text
                }]
            }))
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No answer from Modell');
        }

        const returnJsonText = this._extractJson(text);
        const returnJsonData = JSON.parse(returnJsonText) || {};
        let returnJson: ProviderConversationJson|null = null;

        if (SchemaProviderConversationJson.validate(returnJsonData, [])) {
            returnJson = returnJsonData;
        }

        this._conversation.push({
            role: ConversationPartRole.model,
            text: text,
            json: returnJson
        });

        const totalTokens = data?.usageMetadata?.totalTokenCount ?? 0;

        if (totalTokens > this._maxTokens) {
            this._trimHistory();
        }

        console.log(data);
    }

    private _trimHistory() {
        this._conversation = this._conversation.slice(-10);
    }

    /**
     * Return conversation
     * @return {ProviderConversationPart[]}
     */
    public getConversation(): ProviderConversationPart[] {
        return this._conversation;
    }

    /**
     * extract json
     * @param {string} text
     * @return {string}
     * @protected
     */
    protected _extractJson(text: string): string {
        return text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
    }

}
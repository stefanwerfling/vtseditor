import {ConfigProvider} from '../Config/Config.js';
import {ASchemaProvider} from './ASchemaProvider.js';
import {ProviderConversationJson, SchemaProviderConversationJson} from './SchemaProviderConversationJson.js';
import {ConversationPartRole, ProviderConversationPart} from './SchemaProviderConversationPart.js';
import {SchemaProviderConversationPrompt} from './SchemaProviderConversationPrompt.js';

export abstract class SchemaProviderAIBase extends ASchemaProvider {

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

    /**
     * Generate Schema
     * Template Method Pattern:
     *   - preps conversation
     *   - calls provider-specific request
     *   - parses response
     *
     * @param {string} description
     */
    public async generateSchema(description: string): Promise<void> {
        let msg = description;

        // initial system prompt (once)
        if (this._conversation.length === 0) {
            this._conversation.push({
                role: ConversationPartRole.user,
                text: SchemaProviderConversationPrompt.join(" "),
                json: null
            });
        }

        this._conversation.push({
            role: ConversationPartRole.user,
            text: msg,
            json: null
        });

        // Provider-specific request
        const text = await this._sendRequest(this._conversation);

        if (!text) {
            throw new Error("No answer from model");
        }

        const returnJsonText = this._extractJson(text);
        const returnJsonData = JSON.parse(returnJsonText) || {};
        let returnJson: ProviderConversationJson | null = null;

        if (SchemaProviderConversationJson.validate(returnJsonData, [])) {
            returnJson = returnJsonData;
        }

        this._conversation.push({
            role: ConversationPartRole.model,
            text: text,
            json: returnJson
        });

        if (this._getTotalTokens() > this._maxTokens) {
            this._trimHistory();
        }
    }

    /**
     * Each provider implements its own request/response handling
     */
    protected abstract _sendRequest(
        conversation: ProviderConversationPart[]
    ): Promise<string | null>;

    /**
     * Extract total tokens from provider response
     * (default 0, override if needed)
     */
    protected _getTotalTokens(): number {
        return 0;
    }

    /**
     * Trim history if too long
     */
    protected _trimHistory() {
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
     * Extract JSON from text
     */
    protected _extractJson(text: string): string {
        return text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
    }

}
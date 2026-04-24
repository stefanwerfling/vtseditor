import {encode} from '@toon-format/toon';
import {ConfigProvider} from '../Config/Config.js';
import {ASchemaProvider} from './ASchemaProvider.js';
import {ProviderConversationJson, SchemaProviderConversationJson} from './SchemaProviderConversationJson.js';
import {ConversationPartRole, ProviderConversationPart} from './SchemaProviderConversationPart.js';
import {SchemaProviderConversationPrompt} from './SchemaProviderConversationPrompt.js';

/**
 * Schema provider ai base
 */
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

        // Provider-specific request. The conversation handed to the
        // provider is a TOON-compressed copy so replayed model turns ride
        // fewer tokens; the in-memory conversation keeps the raw JSON
        // text for UI display.
        const text = await this._sendRequest(this._compressConversation(this._conversation));

        if (!text) {
            throw new Error("No answer from model");
        }

        const returnJsonText = this._extractJson(text);
        const returnJsonData = JSON.parse(returnJsonText) || {};
        let returnJson: ProviderConversationJson | null = null;

        if (SchemaProviderConversationJson.validate(returnJsonData, [])) {
            returnJson = returnJsonData;
        } else {
            console.log('⛔ KI Schema not validate!');
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
     * Produce a transport-ready copy of the conversation where model
     * turns carrying a validated JSON payload are re-encoded as TOON.
     * TOON is ~25–30% smaller than pretty JSON for this schema shape,
     * so replaying multi-turn history costs fewer input tokens. User
     * turns and the system prompt are left untouched, as is any model
     * turn whose response failed validation (its raw text is the only
     * evidence we have of what the model actually said).
     */
    protected _compressConversation(conversation: ProviderConversationPart[]): ProviderConversationPart[] {
        return conversation.map((part) => {
            if (part.role !== ConversationPartRole.model || part.json === null) {
                return part;
            }

            return {
                role: part.role,
                text: encode(part.json as unknown as Parameters<typeof encode>[0]),
                json: part.json
            };
        });
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
        let cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

        const match = cleaned.match(/\{[\s\S]*}/);

        if (match) {
            cleaned = match[0].trim();
        }

        return cleaned;
    }

}
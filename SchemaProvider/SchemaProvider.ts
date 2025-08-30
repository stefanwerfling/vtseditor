import {ConfigProvider, ConfigProviderName, SchemaConfigProvider} from '../Config/Config.js';
import {SchemaProviderGemini} from './AI/SchemaProviderGemini.js';
import {SchemaProviderLocalAI} from './AI/SchemaProviderLocalAI.js';
import {SchemaProviderOpenAI} from './AI/SchemaProviderOpenAI.js';
import {ASchemaProvider} from './ASchemaProvider.js';

/**
 * Schema provider
 */
export class SchemaProvider {

    /**
     * instance
     * @protected
     */
    protected static _instance: SchemaProvider|null = null;

    /**
     * get instance
     * @return {SchemaProvider}
     */
    public static getInstance(): SchemaProvider {
        if (this._instance === null) {
            this._instance = new SchemaProvider();
        }

        return this._instance;
    }

    protected _providers: Map<ConfigProviderName|string, ASchemaProvider> = new Map<ConfigProviderName|string, ASchemaProvider>();

    /**
     * Add a new Provider
     * @param {ConfigProvider} config
     */
    public addNewProvider(config: ConfigProvider): void {
        let aProvider: ASchemaProvider|null = null;

        switch (config.apiProvider) {
            case ConfigProviderName.gemini:
                aProvider = new SchemaProviderGemini(config);
                break;

            case ConfigProviderName.localai:
                aProvider = new SchemaProviderLocalAI(config);
                break;

            case ConfigProviderName.openai:
                aProvider = new SchemaProviderOpenAI(config);
                break;
        }

        if (aProvider !== null) {
            this.addProvider(config.apiProvider, aProvider);
        }
    }

    /**
     * Add a provider
     * @param {ConfigProviderName|string} key
     * @param {ASchemaProvider} provider
     */
    public addProvider(key: ConfigProviderName|string, provider: ASchemaProvider): void {
        this._providers.set(key, provider);
    }

    /**
     * Return a provider
     * @param {ConfigProviderName|string} key
     */
    public getProvider(key: ConfigProviderName|string): ASchemaProvider|undefined {
        return this._providers.get(key);
    }

    /**
     * Count providers
     * @return {number}
     */
    public count(): number {
        return this._providers.size;
    }
}
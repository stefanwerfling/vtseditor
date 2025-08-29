import {ConfigProvider} from '../Config/Config.js';

export abstract class ASchemaProvider {

    protected _config: ConfigProvider;

    protected constructor(config: ConfigProvider) {
        this._config = config;
    }

}
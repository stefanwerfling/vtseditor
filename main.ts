import 'normalize.css';
import './main.css';

import {PluginBridge} from './SchemaEditor/PluginBridge.js';
import {SchemaEditor} from './SchemaEditor/SchemaEditor.js';

const editor = new SchemaEditor();
editor.init();

new PluginBridge().start();
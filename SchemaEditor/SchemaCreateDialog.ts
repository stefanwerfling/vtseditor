import {
    ProjectGenerateSchema, ProjectGenerateSchemaResponse,
    SchemaProjectGenerateSchemaResponse
} from '../SchemaProject/SchemaProjectGenerateSchema.js';
import {ConversationPartRole} from '../SchemaProvider/SchemaProviderConversationPart.js';
import {BaseDialog} from './Base/BaseDialog.js';
import {ChatContainer} from './Base/ChatContainer/ChatContainer.js';
import {SchemaTable} from './Schema/SchemaTable.js';
import {Treeview} from './Treeview/Treeview.js';

/**
 * Schema create dialog
 */
export class SchemaCreateDialog extends BaseDialog {

    /**
     * textarea description
     * @protected
     */
    protected _chatContainer: ChatContainer;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setDialogTitle('Create Schema');

        const labelDescription = document.createElement('div');
        labelDescription.classList.add('dialog-label');
        labelDescription.textContent = 'Assistant';
        this._divBody.appendChild(labelDescription);

        this._chatContainer = new ChatContainer();
        this._chatContainer.addAssistant('Tell us about your schema! 🙂');
        this._chatContainer.setOnSendClick(async () => {
            await this._sendRequestProvider();
        });

        this._chatContainer.setOnApplyTableClick((table): void => {
            if (Treeview.getActiveEntry() === null) {
                return;
            }

            const tableData = table.getData();
            tableData.unid = crypto.randomUUID();

            const newTable = new SchemaTable(tableData.unid, tableData.name);
            newTable.setData(tableData);

            Treeview.getActiveEntry()!.addSchemaTable(newTable);

            window.dispatchEvent(new CustomEvent('schemaeditor:updatedata', {
                detail: {
                    updateView: true,
                    updateTreeView: true
                }
            }));

            this.destroy();
        });

        this._divBody.appendChild(this._chatContainer.getElement());

        this._btnConfirm.style.display = 'none';
        this._btnCancel.textContent = 'Close';

        this._loadConversation().then();
    }

    /**
     * load conversation
     * @protected
     */
    protected async _loadConversation(): Promise<void> {
        const response = await fetch('/api/provider/createschema/load');

        if (!response.ok) {
            throw new Error(`Can not load: ${response.statusText}`);
        }

        const data = await response.json();

        if (SchemaProjectGenerateSchemaResponse.validate(data, [])) {
            this._setConversationResponse(data);
        }
    }

    /**
     * set conversation response
     * @param {ProjectGenerateSchemaResponse} response
     * @protected
     */
    protected _setConversationResponse(response: ProjectGenerateSchemaResponse): void {
        if (response.conversation.length > 0) {
            this._chatContainer.clear();
        }

        for (const part of response.conversation.slice(1)) {
            switch (part.role) {
                case ConversationPartRole.user:
                    this._chatContainer.addUser(part.text);
                    break;

                case ConversationPartRole.model:
                    if (part.json !== null) {
                        const aTable = new SchemaTable(crypto.randomUUID(), part.json.name);
                        aTable.setReadOnly(true);

                        for (const aField of part.json.fields) {
                            aTable.addField({
                                unid: crypto.randomUUID(),
                                name: aField.name,
                                type: {
                                    type: aField.type,
                                    array: aField.isArray,
                                    optional: aField.isOptional,
                                    types: []
                                },
                                description: aField.description
                            });
                        }

                        this._chatContainer.addAssistantTable(aTable);

                        if (part.json.notes.length > 0) {
                            this._chatContainer.addAssistant(part.json.notes.join(' '));
                        }
                    } else {
                        this._chatContainer.addAssistant(part.text);
                    }
                    break;
            }
        }
    }

    /**
     * send request provider
     * @protected
     */
    protected async _sendRequestProvider(): Promise<void> {
        const generate: ProjectGenerateSchema = {
            description: this._chatContainer.getDescription()
        };

        const response = await fetch('/api/provider/createschema/requestprovider', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(generate)
        });

        if (!response.ok) {
            throw new Error(`Can not load: ${response.statusText}`);
        }

        const data = await response.json();

        if (SchemaProjectGenerateSchemaResponse.validate(data, [])) {
            this._setConversationResponse(data);
        }
    }
}
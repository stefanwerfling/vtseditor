import {
    ProjectGenerateSchema, ProjectGenerateSchemaResponse,
    SchemaProjectGenerateSchemaResponse
} from '../SchemaProject/SchemaProjectGenerateSchema.js';
import {ConversationPartRole} from '../SchemaProvider/SchemaProviderConversationPart.js';
import {SchemaEditorApiCall, SchemaEditorUpdateDataDetail} from './Api/SchemaEditorApiCall.js';
import {AlertDialog, AlertDialogTypes} from './Base/AlertDialog.js';
import {BaseDialog} from './Base/BaseDialog.js';
import {ChatContainer} from './Base/ChatContainer/ChatContainer.js';
import {EditorEvents} from './Base/EditorEvents.js';
import {SchemaEditor} from './SchemaEditor.js';
import {SchemaTable} from './Schema/SchemaTable.js';
import {Treeview} from './Treeview/Treeview.js';

/**
 * Schema create dialog
 */
export class SchemaCreateDialog extends BaseDialog {

    /**
     * Chat container driving the conversation with the AI provider
     * @protected
     */
    protected _chatContainer: ChatContainer;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setDialogTitle('✨ Create Schema with AI');

        // Intro line under the title explaining the flow briefly.
        const intro = document.createElement('div');
        intro.classList.add('dialog-label');
        intro.textContent = 'Chat with the configured AI provider. When a generated schema looks right, click "Add to schema" to import it.';
        intro.style.fontWeight = '400';
        intro.style.marginBottom = '8px';
        this._divBody.appendChild(intro);

        this._chatContainer = new ChatContainer();
        this._chatContainer.addAssistant('Hi! Tell me about the schema you want to build. 🙂');

        this._chatContainer.setOnSendClick(async () => {
            await this._sendRequestProvider();
        });

        this._chatContainer.setOnApplyTableClick((table): void => {
            const activeEntry = Treeview.getActiveEntry();

            if (activeEntry === null) {
                AlertDialog.showAlert(
                    'Add schema',
                    'No active entry is selected — please open a project / file first.',
                    AlertDialogTypes.info
                );
                return;
            }

            const tableData = table.getData();
            tableData.unid = crypto.randomUUID();

            const newTable = new SchemaTable(tableData.unid, tableData.name);
            newTable.setData(tableData);

            activeEntry.addSchemaTable(newTable);

            // Build a single batch: schema_create + field_create per field.
            // Field unids arrive from the AI path already minted (see
            // `_setConversationResponse`); preserve them so SSE echoes match
            // the local DOM tree.
            const ops: SchemaEditorApiCall[] = [
                {
                    op: 'schema_create',
                    containerUnid: activeEntry.getUnid(),
                    unid: tableData.unid,
                    name: tableData.name,
                    description: tableData.description,
                    extend: tableData.extend,
                    pos: tableData.pos
                }
            ];

            for (const field of tableData.fields) {
                ops.push({
                    op: 'field_create',
                    schemaUnid: tableData.unid,
                    unid: field.unid ?? crypto.randomUUID(),
                    name: field.name,
                    type: field.type,
                    description: field.description
                });
            }

            const editor = SchemaEditor.getActive();
            const client = editor?.getEditorClient() ?? null;

            if (client !== null) {
                client.batch(ops).then(() => {
                    window.dispatchEvent(new CustomEvent<SchemaEditorUpdateDataDetail>(EditorEvents.updateData, {
                        detail: {updateView: true, updateTreeView: true}
                    }));
                }).catch((err) => {
                    AlertDialog.showAlert(
                        'Add schema',
                        err instanceof Error ? err.message : String(err),
                        AlertDialogTypes.error
                    );
                });
            }

            this.destroy();
        });

        this._divBody.appendChild(this._chatContainer.getElement());

        // No Save/Confirm action — the Close button is sufficient and the
        // Apply-to-Schema button lives inside each assistant bubble.
        this._btnConfirm.style.display = 'none';
        this._btnCancel.textContent = 'Close';

        this._loadConversation().catch(err => console.error('Load conversation failed', err));
    }

    /**
     * Load the existing conversation from the backend (persists in-memory on
     * the SchemaProvider singleton across multiple opens of this dialog).
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
     * Re-render the full conversation from a backend response. Clears any
     * existing messages (including loader) first.
     * @param {ProjectGenerateSchemaResponse} response
     * @protected
     */
    protected _setConversationResponse(response: ProjectGenerateSchemaResponse): void {
        if (response.conversation.length > 0) {
            this._chatContainer.clear();
        }

        // Skip index 0 — that's the seeded system prompt, not a real turn.
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
     * Capture current textarea input as a user message, render it immediately,
     * then POST to the provider. The loading indicator runs while the server
     * thinks. On failure, render an assistant error bubble so the user sees
     * something actionable instead of a silent hang.
     * @protected
     */
    protected async _sendRequestProvider(): Promise<void> {
        const description = this._chatContainer.getDescription().trim();

        if (!description) {
            return;
        }

        this._chatContainer.setLoading(true);

        try {
            const generate: ProjectGenerateSchema = {description};

            const response = await fetch('/api/provider/createschema/requestprovider', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(generate)
            });

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (SchemaProjectGenerateSchemaResponse.validate(data, [])) {
                // Re-render wipes the loader — no explicit setLoading(false) needed.
                this._setConversationResponse(data);
                return;
            }

            throw new Error('Server returned an unexpected response shape.');
        } catch (err) {
            this._chatContainer.setLoading(false);
            this._chatContainer.addAssistant(`⚠ ${(err as Error).message}`);
        }
    }
}

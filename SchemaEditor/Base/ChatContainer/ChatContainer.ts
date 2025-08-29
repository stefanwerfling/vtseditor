import './ChatContainer.css';
import {SchemaTable} from '../../Schema/SchemaTable.js';

/**
 * Chat container send on click
 */
export type ChatContainerSendOnclick = (chatContainer: ChatContainer) => void;

/**
 * chat container apply table on click
 */
export type ChatContainerApplyTableOnclick = (table: SchemaTable) => void;

/**
 * Chat container
 */
export class ChatContainer {

    /**
     * Main element
     * @protected
     */
    protected _mainElement: HTMLDivElement;

    /**
     * Msgs
     * @protected
     */
    protected _divMsgs: HTMLDivElement;

    /**
     * input row
     * @protected
     */
    protected _divInputRow: HTMLDivElement;

    /**
     * textarea
     * @protected
     */
    protected _textarea: HTMLTextAreaElement;

    /**
     * Btn Send
     * @protected
     */
    protected _btnSend: HTMLButtonElement;

    /**
     * Send on click
     * @protected
     */
    protected _sendOnClick: ChatContainerSendOnclick|null = null;

    /**
     * Apply table on click
     * @protected
     */
    protected _applyTableOnClick: ChatContainerApplyTableOnclick|null = null;

    /**
     * constructor
     */
    public constructor() {
        this._mainElement = document.createElement('div');
        this._mainElement.classList.add('chat-container');

        this._divMsgs = document.createElement('div');
        this._divMsgs.classList.add('chat-messages');
        this._mainElement.appendChild(this._divMsgs);

        this._divInputRow = document.createElement('div');
        this._mainElement.appendChild(this._divInputRow);

        this._textarea = document.createElement('textarea');
        this._textarea.classList.add('chat-input');
        this._textarea.placeholder = 'Enter your idea here';
        this._textarea.rows = 5;
        this._divInputRow.appendChild(this._textarea);
        this._textarea.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === "Enter") {
                event.preventDefault();

                if (this._sendOnClick !== null) {
                    this._sendOnClick(this);
                }
            }
        });

        this._btnSend = document.createElement('button');
        this._btnSend.classList.add('chat-send');
        this._btnSend.textContent = 'Send';
        this._divInputRow.appendChild(this._btnSend);
        this._btnSend.addEventListener('click', () => {
            if (this._sendOnClick !== null) {
                this._sendOnClick(this);
            }
        });
    }

    protected _createBubble(value: string): HTMLDivElement {
        const bub = document.createElement('div');
        bub.classList.add('chat-bubble');
        bub.textContent = value;

        return bub;
    }

    public createAssistantDiv(): HTMLDivElement {
        const msg = document.createElement('div');
        msg.classList.add(...['chat-message', 'assistant']);
        this._divMsgs.appendChild(msg);

        return msg;
    }

    public addAssistant(value: string): void {
        const msg = this.createAssistantDiv();
        msg.appendChild(this._createBubble(value));
    }

    /**
     * addAssistantTable
     * @param {SchemaTable} table
     */
    public addAssistantTable(table: SchemaTable): void {
        const msg = this.createAssistantDiv();
        const wrapper = document.createElement('div');
        wrapper.classList.add('chat-table-wrapper');
        msg.appendChild(wrapper);
        wrapper.appendChild(table.getElement());

        const btn = document.createElement('button');
        btn.classList.add('chat-apply-btn');
        btn.textContent = '✔';
        btn.addEventListener('click', () => {
            if (this._applyTableOnClick) {
                this._applyTableOnClick(table);
            }
        });

        wrapper.appendChild(btn);
    }

    /**
     * Add user text
     * @param {string} value
     */
    public addUser(value: string): void {
        const msg = document.createElement('div');
        msg.classList.add(...['chat-message', 'user']);
        msg.appendChild(this._createBubble(value));

        this._divMsgs.appendChild(msg);
    }

    /**
     * Clear
     */
    public clear(): void {
        this._divMsgs.innerHTML = '';
        this._textarea.value = '';
    }

    /**
     * Set on send click
     * @param {ChatContainerSendOnclick|null} click
     */
    public setOnSendClick(click: ChatContainerSendOnclick|null): void {
        this._sendOnClick = click;
    }

    /**
     * Set on apply table click
     * @param {ChatContainerApplyTableOnclick|null} click
     */
    public setOnApplyTableClick(click: ChatContainerApplyTableOnclick|null): void {
        this._applyTableOnClick = click;
    }

    /**
     * Return the description
     * @return {string}
     */
    public getDescription(): string {
        return this._textarea.value;
    }

    /**
     * Return the element
     */
    public getElement(): HTMLDivElement {
        return this._mainElement;
    }

}
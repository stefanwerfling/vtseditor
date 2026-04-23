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

type MessageRole = 'user' | 'assistant';

/**
 * Chat container
 */
export class ChatContainer {

    protected _mainElement: HTMLDivElement;
    protected _divMsgs: HTMLDivElement;
    protected _divInputRow: HTMLDivElement;
    protected _textarea: HTMLTextAreaElement;
    protected _btnSend: HTMLButtonElement;
    protected _hint: HTMLDivElement;

    /**
     * Loader bubble element (null when not shown).
     * @protected
     */
    protected _loaderElement: HTMLDivElement|null = null;

    protected _sendOnClick: ChatContainerSendOnclick|null = null;
    protected _applyTableOnClick: ChatContainerApplyTableOnclick|null = null;

    /**
     * constructor
     */
    public constructor() {
        this._mainElement = document.createElement('div');
        this._mainElement.classList.add('chat-container');

        // ---- Messages area ----
        this._divMsgs = document.createElement('div');
        this._divMsgs.classList.add('chat-messages');
        this._mainElement.appendChild(this._divMsgs);

        // ---- Input row ----
        this._divInputRow = document.createElement('div');
        this._divInputRow.classList.add('chat-input-row');
        this._mainElement.appendChild(this._divInputRow);

        this._textarea = document.createElement('textarea');
        this._textarea.classList.add('chat-input');
        this._textarea.placeholder = 'Describe the schema you want…';
        this._textarea.rows = 2;
        this._divInputRow.appendChild(this._textarea);

        // Enter = send, Shift+Enter = newline (standard chat UX).
        this._textarea.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                this._triggerSend();
            }
        });

        this._btnSend = document.createElement('button');
        this._btnSend.type = 'button';
        this._btnSend.classList.add('chat-send');
        this._btnSend.setAttribute('aria-label', 'Send message');

        const sendIcon = document.createElement('span');
        sendIcon.classList.add('chat-send-icon');
        sendIcon.textContent = '▶';
        this._btnSend.appendChild(sendIcon);

        const sendLabel = document.createElement('span');
        sendLabel.textContent = 'Send';
        this._btnSend.appendChild(sendLabel);

        this._divInputRow.appendChild(this._btnSend);

        this._btnSend.addEventListener('click', () => {
            this._triggerSend();
        });

        // ---- Hint row (keyboard shortcut help) ----
        this._hint = document.createElement('div');
        this._hint.classList.add('chat-hint');
        this._hint.innerHTML = 'Press <kbd>Enter</kbd> to send, <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line.';
        this._mainElement.appendChild(this._hint);
    }

    /**
     * Dispatch the send callback if the textarea has meaningful content.
     * @protected
     */
    protected _triggerSend(): void {
        const value = this._textarea.value.trim();

        if (!value) {
            return;
        }

        if (this._sendOnClick !== null) {
            this._sendOnClick(this);
        }
    }

    /**
     * Build a bubble node with the given text. Preserves line breaks via
     * CSS `white-space: pre-wrap`.
     * @param {string} value
     * @return {HTMLDivElement}
     * @protected
     */
    protected _createBubble(value: string): HTMLDivElement {
        const bub = document.createElement('div');
        bub.classList.add('chat-bubble');
        bub.textContent = value;

        return bub;
    }

    /**
     * Build the avatar chip that precedes / follows a bubble.
     * @param {MessageRole} role
     * @return {HTMLSpanElement}
     * @protected
     */
    protected _createAvatar(role: MessageRole): HTMLSpanElement {
        const avatar = document.createElement('span');
        avatar.classList.add('chat-avatar', role);
        avatar.textContent = role === 'assistant' ? '🤖' : '👤';
        return avatar;
    }

    /**
     * Scroll the messages container to its bottom — called whenever a new
     * message is added so the latest line stays in view.
     * @protected
     */
    protected _scrollToEnd(): void {
        this._divMsgs.scrollTop = this._divMsgs.scrollHeight;
    }

    /**
     * Create an empty assistant message wrapper with avatar already attached.
     * Kept public for backward-compatibility, but now pre-populates the avatar.
     * @return {HTMLDivElement}
     */
    public createAssistantDiv(): HTMLDivElement {
        const msg = document.createElement('div');
        msg.classList.add('chat-message', 'assistant');
        msg.appendChild(this._createAvatar('assistant'));
        this._divMsgs.appendChild(msg);

        return msg;
    }

    /**
     * Add a plain-text assistant message.
     * @param {string} value
     */
    public addAssistant(value: string): void {
        const msg = this.createAssistantDiv();
        msg.appendChild(this._createBubble(value));
        this._scrollToEnd();
    }

    /**
     * Add an assistant message containing a generated SchemaTable preview
     * with an "Add to schema" apply button below it.
     * @param {SchemaTable} table
     */
    public addAssistantTable(table: SchemaTable): void {
        const msg = this.createAssistantDiv();

        const wrapper = document.createElement('div');
        wrapper.classList.add('chat-table-wrapper');
        msg.appendChild(wrapper);
        wrapper.appendChild(table.getElement());

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.classList.add('chat-apply-btn');
        btn.textContent = 'Add to schema';
        btn.addEventListener('click', () => {
            if (this._applyTableOnClick) {
                this._applyTableOnClick(table);
            }
        });

        wrapper.appendChild(btn);
        this._scrollToEnd();
    }

    /**
     * Add a user message.
     * @param {string} value
     */
    public addUser(value: string): void {
        const msg = document.createElement('div');
        msg.classList.add('chat-message', 'user');
        msg.appendChild(this._createAvatar('user'));
        msg.appendChild(this._createBubble(value));

        this._divMsgs.appendChild(msg);
        this._scrollToEnd();
    }

    /**
     * Show or hide the "assistant is thinking" dots bubble, and disable the
     * input controls while loading so the user cannot fire a second request.
     * Safe to call with the same value multiple times.
     * @param {boolean} loading
     */
    public setLoading(loading: boolean): void {
        this._textarea.disabled = loading;
        this._btnSend.disabled = loading;

        if (loading) {
            if (this._loaderElement !== null) {
                return;
            }

            const msg = document.createElement('div');
            msg.classList.add('chat-message', 'assistant');
            msg.appendChild(this._createAvatar('assistant'));

            const loader = document.createElement('div');
            loader.classList.add('chat-loader');
            loader.appendChild(document.createElement('span'));
            loader.appendChild(document.createElement('span'));
            loader.appendChild(document.createElement('span'));
            msg.appendChild(loader);

            this._divMsgs.appendChild(msg);
            this._loaderElement = msg;
            this._scrollToEnd();
        } else if (this._loaderElement !== null) {
            this._loaderElement.remove();
            this._loaderElement = null;
        }
    }

    /**
     * Clear all messages and reset the textarea.
     */
    public clear(): void {
        this._divMsgs.innerHTML = '';
        this._textarea.value = '';
        this._loaderElement = null;
        this._textarea.disabled = false;
        this._btnSend.disabled = false;
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
     * Return the current textarea contents (user's typed prompt).
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
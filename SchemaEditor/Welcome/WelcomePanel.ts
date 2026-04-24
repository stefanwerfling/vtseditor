import {renderMarkdown} from './MiniMarkdown.js';
import './WelcomePanel.css';

/**
 * Payload returned by `GET /api/welcome`. Kept intentionally flat so
 * adding fields (e.g. docs url, tips) is just an additive JSON change.
 */
type WelcomeData = {
    name: string;
    version: string;
    description: string;
    changelog: string;
    readme: string;
};

type TabId = 'changelog'|'readme';

type Tab = {
    id: TabId;
    label: string;
    emptyMessage: string;
    /** Resolved lazily — only the active tab's markdown is parsed. */
    getSource: (data: WelcomeData) => string;
};

const TABS: readonly Tab[] = [
    {
        id: 'changelog',
        label: "What's new",
        emptyMessage: 'No CHANGELOG.md found.',
        getSource: (d) => d.changelog
    },
    {
        id: 'readme',
        label: 'Readme',
        emptyMessage: 'No README.md found.',
        getSource: (d) => d.readme
    }
];

/**
 * Welcome panel rendered in the canvas when no schema / enum entry is
 * active — on first load, after clicking the tree root, or whenever
 * the editor has nothing to display. Fetches product info plus both
 * markdown sources once, caches the payload, and renders each tab on
 * first view.
 */
export class WelcomePanel {

    private readonly _element: HTMLDivElement;
    private readonly _heroVersion: HTMLSpanElement;
    private readonly _heroTagline: HTMLParagraphElement;
    private readonly _tabButtons: Map<TabId, HTMLButtonElement> = new Map();
    private readonly _tabPanels: Map<TabId, HTMLDivElement> = new Map();
    private readonly _tabRendered: Set<TabId> = new Set();
    private _activeTab: TabId = 'changelog';
    private _data: WelcomeData|null = null;
    private _loadPromise: Promise<void>|null = null;

    public constructor() {
        this._element = document.createElement('div');
        this._element.classList.add('welcome-panel');

        const inner = document.createElement('div');
        inner.classList.add('welcome-panel-inner');
        this._element.appendChild(inner);

        // Hero --------------------------------------------------

        const hero = document.createElement('section');
        hero.classList.add('welcome-hero');

        const heroLabel = document.createElement('div');
        heroLabel.classList.add('welcome-hero-label');
        heroLabel.textContent = 'Welcome to';
        hero.appendChild(heroLabel);

        const heroTitle = document.createElement('h1');
        heroTitle.classList.add('welcome-hero-title');

        const nameSpan = document.createElement('span');
        nameSpan.classList.add('welcome-hero-name');
        nameSpan.textContent = 'VTS Editor';
        heroTitle.appendChild(nameSpan);

        this._heroVersion = document.createElement('span');
        this._heroVersion.classList.add('welcome-hero-version');
        this._heroVersion.textContent = '';
        heroTitle.appendChild(this._heroVersion);

        hero.appendChild(heroTitle);

        this._heroTagline = document.createElement('p');
        this._heroTagline.classList.add('welcome-hero-tagline');
        this._heroTagline.textContent =
            'A browser-based visual editor for building VTS type-validation schemas.';
        hero.appendChild(this._heroTagline);

        const heroHint = document.createElement('div');
        heroHint.classList.add('welcome-hero-hint');
        heroHint.textContent = 'Pick a file in the tree on the left to start editing.';
        hero.appendChild(heroHint);

        inner.appendChild(hero);

        inner.appendChild(WelcomePanel._buildPluginPromo());

        // Tabs --------------------------------------------------

        const tabsWrap = document.createElement('section');
        tabsWrap.classList.add('welcome-content');

        const tabBar = document.createElement('div');
        tabBar.classList.add('welcome-tabs');
        tabBar.setAttribute('role', 'tablist');

        for (const tab of TABS) {
            const button = document.createElement('button');
            button.type = 'button';
            button.classList.add('welcome-tab');
            button.textContent = tab.label;
            button.setAttribute('role', 'tab');
            button.dataset.tabId = tab.id;
            button.addEventListener('click', () => this._setActiveTab(tab.id));
            tabBar.appendChild(button);
            this._tabButtons.set(tab.id, button);

            const panel = document.createElement('div');
            panel.classList.add('welcome-tabpanel');
            panel.setAttribute('role', 'tabpanel');

            const loading = document.createElement('div');
            loading.classList.add('welcome-loading');
            loading.textContent = 'Loading…';
            panel.appendChild(loading);

            this._tabPanels.set(tab.id, panel);
        }

        tabsWrap.appendChild(tabBar);

        for (const tab of TABS) {
            tabsWrap.appendChild(this._tabPanels.get(tab.id)!);
        }

        inner.appendChild(tabsWrap);

        this._updateTabActiveState();
    }

    public getElement(): HTMLElement {
        return this._element;
    }

    /**
     * Kicks off the one-time fetch of `/api/welcome`. Safe to call
     * multiple times — only the first call makes a network request.
     */
    public load(): Promise<void> {
        this._loadPromise ??= this._loadInternal();
        return this._loadPromise;
    }

    private async _loadInternal(): Promise<void> {
        try {
            const response = await fetch('/api/welcome');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as WelcomeData;
            this._data = data;
            this._applyHero(data);
            this._renderTab(this._activeTab);
        } catch (err) {
            this._showError(err);
        }
    }

    private _applyHero(data: WelcomeData): void {
        if (data.version) {
            this._heroVersion.textContent = `v${data.version}`;
        } else {
            this._heroVersion.remove();
        }

        if (data.description) {
            this._heroTagline.textContent = data.description;
        }
    }

    private _setActiveTab(id: TabId): void {
        if (this._activeTab === id) {
            return;
        }

        this._activeTab = id;
        this._updateTabActiveState();
        this._renderTab(id);
    }

    private _updateTabActiveState(): void {
        for (const [id, button] of this._tabButtons) {
            const active = id === this._activeTab;
            button.classList.toggle('welcome-tab-active', active);
            button.setAttribute('aria-selected', active ? 'true' : 'false');
            button.tabIndex = active ? 0 : -1;
        }

        for (const [id, panel] of this._tabPanels) {
            const active = id === this._activeTab;
            panel.classList.toggle('welcome-tabpanel-active', active);

            if (active) {
                panel.removeAttribute('hidden');
            } else {
                panel.setAttribute('hidden', '');
            }
        }
    }

    private _renderTab(id: TabId): void {
        if (this._data === null || this._tabRendered.has(id)) {
            return;
        }

        const tab = TABS.find((t) => t.id === id);
        const panel = this._tabPanels.get(id);

        if (!tab || !panel) {
            return;
        }

        panel.replaceChildren();
        const source = tab.getSource(this._data);

        if (!source) {
            const empty = document.createElement('div');
            empty.classList.add('welcome-loading');
            empty.textContent = tab.emptyMessage;
            panel.appendChild(empty);
            this._tabRendered.add(id);
            return;
        }

        const body = document.createElement('div');
        body.classList.add('welcome-tab-body');
        renderMarkdown(source, body);
        panel.appendChild(body);
        this._tabRendered.add(id);
    }

    /**
     * Sibling-tool promo card sitting between hero and tabs.
     * Intentionally static — no data fetch, no i18n, no toggle —
     * just a modest pointer to the JetBrains plugin that embeds
     * this same editor into PhpStorm / IntelliJ IDEA Ultimate.
     */
    private static _buildPluginPromo(): HTMLElement {
        const promo = document.createElement('aside');
        promo.classList.add('welcome-promo');

        const icon = document.createElement('div');
        icon.classList.add('welcome-promo-icon');
        icon.textContent = '🧩';
        promo.appendChild(icon);

        const text = document.createElement('div');
        text.classList.add('welcome-promo-text');

        const title = document.createElement('div');
        title.classList.add('welcome-promo-title');

        const titleText = document.createElement('span');
        titleText.textContent = 'Use VTS Editor inside your IDE';
        title.appendChild(titleText);

        const tag = document.createElement('span');
        tag.classList.add('welcome-promo-tag');
        tag.textContent = 'Plugin';
        title.appendChild(tag);

        text.appendChild(title);

        const desc = document.createElement('div');
        desc.classList.add('welcome-promo-desc');
        desc.textContent =
            'Dockable panel for PhpStorm and IntelliJ IDEA Ultimate — jump to a schema with Ctrl+Click, validate debugger variables against a schema, run the server from the toolbar.';
        text.appendChild(desc);

        promo.appendChild(text);

        const cta = document.createElement('a');
        cta.classList.add('welcome-promo-cta');
        cta.href = 'https://github.com/stefanwerfling/vts-editor-plugin';
        cta.target = '_blank';
        cta.rel = 'noreferrer noopener';
        cta.textContent = 'Get the plugin →';
        promo.appendChild(cta);

        return promo;
    }

    private _showError(err: unknown): void {
        const msg = err instanceof Error ? err.message : String(err);

        for (const [, panel] of this._tabPanels) {
            panel.replaceChildren();
            const box = document.createElement('div');
            box.classList.add('welcome-error');
            box.textContent = `Could not load welcome info: ${msg}`;
            panel.appendChild(box);
        }
    }

}
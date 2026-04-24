/**
 * Tiny Markdown-to-DOM renderer for the welcome panel.
 *
 * Covers the subset this project uses in CHANGELOG.md and README.md:
 *   - `#`, `##`, `###` headings
 *   - unordered lists with `-` or `*`, nested via indentation
 *   - paragraphs
 *   - horizontal rules (`---`, `___`, `***`)
 *   - fenced code blocks (```…```)
 *   - inline: `**bold**`, `*italic*`, `` `code` ``, `[text](url)`,
 *     `![alt](url)` images, `[![alt](img)](href)` badge-links
 *   - HTML passthrough, lenient: `<img src=… alt=…>` is converted to
 *     a markdown image, every other tag is stripped but its inner
 *     text is kept — enough to make README.md with its GitHub-style
 *     `<div align="center">` wrapper and `<table>` feature grid
 *     render as plain prose.
 *
 * Not covered: ordered lists, full HTML tables (structure lost after
 * tag strip), blockquotes, reference-style links. If we need any of
 * those, extend here — the interface stays `renderMarkdown(md, host)`.
 *
 * Built from scratch (no external dep) because the editor ships as an
 * npm CLI and every transitive dependency inflates the install for
 * end users. The output is real DOM nodes, not innerHTML, so no XSS
 * surface.
 */

type ListItem = {
    text: string;
    children?: ListItem[];
};

type Block =
    | {tag: 'h1'|'h2'|'h3'|'p'; text: string}
    | {tag: 'ul'; items: ListItem[]}
    | {tag: 'pre'; text: string; lang: string|null}
    | {tag: 'hr'};

type ListFrame = {indent: number; items: ListItem[]};

/**
 * Renders the supplied Markdown source into the given host element.
 * The host is left intact; blocks are appended. Call on an empty
 * container for a clean render.
 */
export function renderMarkdown(source: string, host: HTMLElement): void {
    for (const block of parseBlocks(preprocess(source))) {
        host.appendChild(renderBlock(block));
    }
}

/**
 * Lenient HTML normalisation run before block parsing. Converts the
 * handful of HTML constructs we actually care about to markdown
 * equivalents, then strips every remaining tag (its inner text
 * survives). Keeps the README's centered title block and logo
 * visible while dropping `<div>`, `<table>`, and friends that the
 * mini parser cannot render.
 */
function preprocess(source: string): string {
    // <img src="X" alt="Y" /> → ![Y](X). `src` is required; `alt`
    // is optional (default empty).
    const imgTag = /<img\b([^>]*?)\/?>/giu;

    let out = source.replace(imgTag, (_whole, attrs: string) => {
        const srcMatch = /\bsrc\s*=\s*"([^"]+)"|\bsrc\s*=\s*'([^']+)'/iu.exec(attrs);
        const altMatch = /\balt\s*=\s*"([^"]*)"|\balt\s*=\s*'([^']*)'/iu.exec(attrs);
        const src = srcMatch ? (srcMatch[1] ?? srcMatch[2] ?? '') : '';
        const alt = altMatch ? (altMatch[1] ?? altMatch[2] ?? '') : '';

        if (src === '') {
            return '';
        }

        return `![${alt}](${src})`;
    });

    // <br>/<br/> → blank line so the surrounding paragraph breaks.
    out = out.replace(/<br\s*\/?>/giu, '\n');

    // Strip every remaining tag. Inner text content stays — that's
    // what makes `<div align="center">...</div>` disappear cleanly
    // without taking the title with it.
    out = out.replace(/<\/?[a-zA-Z][^>]*>/gu, '');

    return out;
}

function parseBlocks(source: string): Block[] {
    const lines = source.split(/\r?\n/);
    const blocks: Block[] = [];

    let listStack: ListFrame[] = [];
    let paragraph: string[]|null = null;
    let fenceLang: string|null = null;
    let fenceBuffer: string[]|null = null;

    const flushList = (): void => {
        if (listStack.length > 0) {
            blocks.push({tag: 'ul', items: listStack[0].items});
            listStack = [];
        }
    };

    const flushParagraph = (): void => {
        if (paragraph !== null) {
            blocks.push({tag: 'p', text: paragraph.join(' ')});
            paragraph = null;
        }
    };

    for (const raw of lines) {
        // Inside a fenced code block nothing is reinterpreted — just
        // collect lines verbatim until the closing fence.
        if (fenceBuffer !== null) {
            if (/^\s*```\s*$/u.test(raw)) {
                blocks.push({tag: 'pre', text: fenceBuffer.join('\n'), lang: fenceLang});
                fenceBuffer = null;
                fenceLang = null;
            } else {
                fenceBuffer.push(raw);
            }
            continue;
        }

        const line = raw.replace(/\s+$/u, '');

        const fenceOpen = /^\s*```\s*([a-zA-Z0-9_-]*)\s*$/u.exec(line);

        if (fenceOpen) {
            flushParagraph();
            flushList();
            fenceLang = fenceOpen[1] === '' ? null : fenceOpen[1];
            fenceBuffer = [];
            continue;
        }

        if (line === '') {
            flushParagraph();
            flushList();
            continue;
        }

        const heading = /^(#{1,3})\s+(.+)$/u.exec(line);

        if (heading) {
            flushParagraph();
            flushList();
            const level = heading[1].length as 1|2|3;
            blocks.push({tag: (`h${level}` as 'h1'|'h2'|'h3'), text: heading[2]});
            continue;
        }

        if (/^(-{3,}|_{3,}|\*{3,})$/u.test(line)) {
            flushParagraph();
            flushList();
            blocks.push({tag: 'hr'});
            continue;
        }

        const listItem = /^(\s*)[-*]\s+(.+)$/u.exec(line);

        if (listItem) {
            flushParagraph();
            addListItem(listStack, listItem[1].length, listItem[2]);
            continue;
        }

        // Indented continuation of a bullet (no leading `-`) — fold
        // onto the current list item so a wrapped sentence stays in
        // the same bullet.
        if (listStack.length > 0 && /^\s{2,}\S/u.test(raw)) {
            const frame = listStack[listStack.length - 1];

            if (frame.items.length > 0) {
                frame.items[frame.items.length - 1].text += ` ${line.trim()}`;
                continue;
            }
        }

        paragraph ??= [];
        paragraph.push(line.trim());
    }

    // Unclosed fence — emit what we have so nothing is silently lost.
    if (fenceBuffer !== null) {
        blocks.push({tag: 'pre', text: fenceBuffer.join('\n'), lang: fenceLang});
    }

    flushParagraph();
    flushList();

    return blocks;
}

/**
 * Appends a bullet at the given indentation, opening or closing
 * nested `<ul>` levels as needed. Indentation widths don't have to
 * be exact multiples — the parser uses a stack and pops any frames
 * with strictly greater indent.
 */
function addListItem(stack: ListFrame[], indent: number, text: string): void {
    while (stack.length > 0 && stack[stack.length - 1].indent > indent) {
        stack.pop();
    }

    const top = stack[stack.length - 1];

    if (top === undefined || top.indent < indent) {
        const frame: ListFrame = {indent, items: []};

        if (top !== undefined && top.items.length > 0) {
            const parent = top.items[top.items.length - 1];
            parent.children = frame.items;
        }

        stack.push(frame);
    }

    stack[stack.length - 1].items.push({text});
}

function renderBlock(block: Block): HTMLElement {
    if (block.tag === 'hr') {
        return document.createElement('hr');
    }

    if (block.tag === 'ul') {
        return renderList(block.items);
    }

    if (block.tag === 'pre') {
        const pre = document.createElement('pre');
        const code = document.createElement('code');

        if (block.lang) {
            code.dataset.lang = block.lang;
        }

        code.textContent = block.text;
        pre.appendChild(code);
        return pre;
    }

    const el = document.createElement(block.tag);
    renderInline(block.text, el);
    return el;
}

function renderList(items: readonly ListItem[]): HTMLElement {
    const ul = document.createElement('ul');

    for (const item of items) {
        const li = document.createElement('li');
        renderInline(item.text, li);

        if (item.children && item.children.length > 0) {
            li.appendChild(renderList(item.children));
        }

        ul.appendChild(li);
    }

    return ul;
}

/**
 * Inline tokenizer. Walks through the text, matching the earliest
 * supported pattern at each step and emitting a matching DOM node.
 * Unmatched text becomes a text node — HTML stays escaped because we
 * never set innerHTML.
 */
function renderInline(text: string, host: HTMLElement): void {
    type Matcher = {re: RegExp; build: (m: RegExpExecArray) => Node};

    const patterns: Matcher[] = [
        {
            re: /\*\*([^*\n]+?)\*\*/gu,
            build: (m) => wrap('strong', m[1])
        },
        {
            re: /\*([^*\n]+?)\*/gu,
            build: (m) => wrap('em', m[1])
        },
        {
            re: /`([^`\n]+?)`/gu,
            build: (m) => wrap('code', m[1])
        },
        // Image-inside-link: `[![alt](img)](href)` — matches README
        // shield badges before either the link or image alternative
        // gobbles it.
        {
            re: /\[!\[([^\]\n]*?)\]\(([^)\s]+)\)\]\(([^)\s]+)\)/gu,
            build: (m) => {
                const a = document.createElement('a');
                a.href = m[3];
                a.target = '_blank';
                a.rel = 'noreferrer noopener';

                const img = document.createElement('img');
                img.src = m[2];
                img.alt = m[1];
                img.loading = 'lazy';
                a.appendChild(img);

                return a;
            }
        },
        {
            re: /!\[([^\]\n]*?)\]\(([^)\s]+)\)/gu,
            build: (m) => {
                const img = document.createElement('img');
                img.src = m[2];
                img.alt = m[1];
                img.loading = 'lazy';
                return img;
            }
        },
        {
            re: /\[([^\]\n]+?)\]\(([^)\s]+)\)/gu,
            build: (m) => {
                const a = document.createElement('a');
                a.href = m[2];
                a.target = '_blank';
                a.rel = 'noreferrer noopener';
                a.textContent = m[1];
                return a;
            }
        }
    ];

    let cursor = 0;

    while (cursor < text.length) {
        let bestIndex = -1;
        let bestLength = 0;
        let bestNode: Node|null = null;

        for (const {re, build} of patterns) {
            re.lastIndex = cursor;
            const m = re.exec(text);

            if (m === null) {
                continue;
            }

            if (bestNode === null || m.index < bestIndex) {
                bestIndex = m.index;
                bestLength = m[0].length;
                bestNode = build(m);
            }
        }

        if (bestNode === null) {
            host.appendChild(document.createTextNode(text.slice(cursor)));
            return;
        }

        if (bestIndex > cursor) {
            host.appendChild(document.createTextNode(text.slice(cursor, bestIndex)));
        }

        host.appendChild(bestNode);
        cursor = bestIndex + bestLength;
    }
}

function wrap(tag: 'strong'|'em'|'code', text: string): HTMLElement {
    const el = document.createElement(tag);
    el.textContent = text;
    return el;
}
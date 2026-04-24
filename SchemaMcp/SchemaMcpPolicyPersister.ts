import fs from 'fs/promises';
import {ConfigMcpPolicyAction} from '../Config/Config.js';

/**
 * Appends (or updates) a policy rule in `vtseditor.json` so that a
 * user's `remember: 'forever'` choice survives the current process.
 *
 * Behaviour:
 * - If a rule with the same `match` already exists, its action is
 *   rewritten in place.
 * - Otherwise the rule is inserted at the front of `mcp.policy.rules`,
 *   ahead of the defaults, so the user's remembered decision wins.
 * - Missing `mcp` / `mcp.policy` / `mcp.policy.rules` objects are
 *   created on the fly.
 *
 * The file is re-read on every call — we can't trust an in-memory
 * snapshot because the user may have edited the config manually
 * between calls. Output keeps the existing trailing newline convention.
 */
export async function persistPolicyRule(
    configFile: string,
    toolName: string,
    action: ConfigMcpPolicyAction.allow|ConfigMcpPolicyAction.deny
): Promise<void> {
    const raw = await fs.readFile(configFile, 'utf-8');
    const config = JSON.parse(raw) as Record<string, unknown>;

    const mcp = (config.mcp ?? {enabled: true}) as Record<string, unknown>;
    config.mcp = mcp;

    const policy = (mcp.policy ?? {}) as Record<string, unknown>;
    mcp.policy = policy;

    const rules = (policy.rules ?? []) as Array<{match: string; action: string}>;
    policy.rules = rules;

    const existingIndex = rules.findIndex((r) => r.match === toolName);

    if (existingIndex >= 0) {
        rules[existingIndex].action = action;
    } else {
        rules.unshift({match: toolName, action});
    }

    const hadTrailingNewline = raw.endsWith('\n');
    const out = JSON.stringify(config, null, 2) + (hadTrailingNewline ? '\n' : '');

    await fs.writeFile(configFile, out, 'utf-8');
}
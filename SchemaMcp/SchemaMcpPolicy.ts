import {ConfigMcpPolicy, ConfigMcpPolicyAction, ConfigMcpPolicyRule} from '../Config/Config.js';

/**
 * Policy decision function. Given a tool name, returns the action the
 * gate should take. Compiled once at server startup from
 * `mcp.policy` in `vtseditor.json`.
 */
export type McpPolicyDecide = (toolName: string) => ConfigMcpPolicyAction;

/**
 * Default rules applied when `mcp.policy` is not configured. Safe reads
 * and non-destructive mutations flow freely; codegen and destructive
 * operations fall into `ask`. Clients that ignore `ask` simply get a
 * deny response until Phase 2 wires up an approval flow.
 */
const DEFAULT_RULES: ConfigMcpPolicyRule[] = [
    {match: 'vts_list_*', action: ConfigMcpPolicyAction.allow},
    {match: 'vts_get_*', action: ConfigMcpPolicyAction.allow},
    {match: 'vts_create_*', action: ConfigMcpPolicyAction.allow},
    {match: 'vts_update_*', action: ConfigMcpPolicyAction.allow},
    {match: 'vts_reorder_*', action: ConfigMcpPolicyAction.allow},
    {match: 'vts_generate', action: ConfigMcpPolicyAction.ask},
    {match: 'vts_delete_*', action: ConfigMcpPolicyAction.ask},
    {match: 'vts_move_*', action: ConfigMcpPolicyAction.ask}
];

const DEFAULT_FALLBACK = ConfigMcpPolicyAction.ask;

/**
 * Translates a shell-style glob into an anchored RegExp. Supports `*`
 * (any chars except nothing forbidden) and `?` (single char). Any other
 * regex metacharacter is escaped so rules stay intuitive.
 */
function globToRegExp(pattern: string): RegExp {
    let out = '^';

    for (const ch of pattern) {
        if (ch === '*') {
            out += '.*';
        } else if (ch === '?') {
            out += '.';
        } else if (/[.+^${}()|[\]\\]/.test(ch)) {
            out += `\\${ch}`;
        } else {
            out += ch;
        }
    }

    out += '$';

    return new RegExp(out);
}

/**
 * Compiles a policy into a decide() closure. Rules are evaluated in
 * order — first match wins. If nothing matches, the policy's `default`
 * applies, falling back to `ask`.
 *
 * When `policy` is undefined the {@link DEFAULT_RULES} are used so a
 * freshly installed vtseditor ships with sane protection out of the box.
 */
export function compileMcpPolicy(policy: ConfigMcpPolicy|undefined): McpPolicyDecide {
    const rules = policy?.rules ?? DEFAULT_RULES;
    const fallback = policy?.default ?? DEFAULT_FALLBACK;

    const compiled = rules.map((rule) => ({
        regex: globToRegExp(rule.match),
        action: rule.action
    }));

    return (toolName: string): ConfigMcpPolicyAction => {
        for (const {regex, action} of compiled) {
            if (regex.test(toolName)) {
                return action;
            }
        }

        return fallback;
    };
}
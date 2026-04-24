import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {Vts} from 'vts';
import {JsonSchemaFieldType} from '../SchemaEditor/JsonData.js';
import {SchemaFsRepository} from '../SchemaRepository/SchemaFsRepository.js';
import {SchemaMcpContext} from './SchemaMcpServer.js';
import {
    defineVtsMcpTool,
    RegisterVtsMcpToolsOptions,
    registerVtsMcpTools,
    VtsMcpTool
} from './SchemaMcpToolRegistry.js';

/**
 * Formats an arbitrary value as a JSON text block — MCP tool results ship
 * strings, so every tool renders its payload via this helper.
 */
function json(value: unknown): CallToolResult {
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify(value, null, 2)
            }
        ]
    };
}

/**
 * Look up the repo for the supplied project unid or throw a descriptive
 * error that the SDK will forward to the client as a tool error.
 */
function repoOf(ctx: SchemaMcpContext, projectUnid: string): SchemaFsRepository {
    const repo = ctx.repositories.get(projectUnid);

    if (repo === undefined) {
        throw new Error(`unknown project ${projectUnid}`);
    }

    return repo;
}

// Common field schemas reused below -------------------------------------------

const ProjectUnid = Vts.string({description: 'Runtime project unid (from list_projects)'});
const Pos = Vts.object({
    x: Vts.number(),
    y: Vts.number()
}, {description: 'Canvas position'});

const ExtendValue = Vts.object({
    type: Vts.string(),
    value: Vts.optional(Vts.string()),
    values_schema: Vts.optional(Vts.string())
});

const Extend = ExtendValue.extend({
    options: Vts.optional(Vts.object({
        ignore_additional_items: Vts.optional(Vts.boolean()),
        not_export: Vts.optional(Vts.boolean())
    })),
    or_values: Vts.optional(Vts.array(ExtendValue))
});

// Field type can be a plain string (simple leaf) or a nested field-type
// descriptor (object / or / …) matching SchemaJsonSchemaFieldType.
const FieldType = Vts.or([
    Vts.string(),
    Vts.object({
        type: Vts.string(),
        optional: Vts.boolean(),
        array: Vts.boolean(),
        types: Vts.array(Vts.unknown())
    })
], {description: 'Either a type name (e.g. "string") or a nested field-type object'});

/**
 * The frontend (SchemaTableField.setType) only renders fields whose `type`
 * is the nested {type, optional, array, types} shape — a bare string falls
 * through to `'unknown'`. Wrap leaf strings and merge any top-level
 * optional/array/types shortcuts into the nested object so MCP-created
 * fields display correctly.
 */
function normalizeFieldType(
    fieldType: string|JsonSchemaFieldType|undefined,
    overrides: {optional?: boolean; array?: boolean; types?: unknown[]}
): JsonSchemaFieldType|undefined {
    if (fieldType === undefined) {
        return undefined;
    }

    const base: JsonSchemaFieldType = typeof fieldType === 'string'
        ? {type: fieldType, optional: false, array: false, types: []}
        : {
            type: fieldType.type,
            optional: fieldType.optional,
            array: fieldType.array,
            types: fieldType.types
        };

    if (overrides.optional !== undefined) {
        base.optional = overrides.optional;
    }

    if (overrides.array !== undefined) {
        base.array = overrides.array;
    }

    if (overrides.types !== undefined) {
        base.types = overrides.types as JsonSchemaFieldType['types'];
    }

    return base;
}

/**
 * Registers every VTS schema tool on the server. Tool names are prefixed
 * with `vts_` so they remain distinguishable when Claude CLI loads multiple
 * MCP servers simultaneously.
 */
export function registerSchemaMcpTools(
    server: McpServer,
    ctx: SchemaMcpContext,
    options: RegisterVtsMcpToolsOptions = {}
): void {
    const tools: VtsMcpTool[] = [

        // Read ---------------------------------------------------------------------

        defineVtsMcpTool({
            name: 'vts_list_projects',
            description: 'List loaded VTS projects with their current revision numbers.',
            inputSchema: Vts.object({}),
            handler: async () => {
                const entries = Array.from(ctx.repositories.entries()).map(([unid, repo]) => ({
                    unid,
                    name: repo.getProject().name,
                    schemaPath: repo.getProject().schemaPath,
                    rev: repo.getRev()
                }));
                return json({projects: entries});
            }
        }),

        defineVtsMcpTool({
            name: 'vts_get_tree',
            description: 'Return the full JsonDataFS tree for a project — folders, files, schemas, enums, fields, enum values, links. Use this first to discover existing unids before mutating.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid
            }),
            handler: async ({projectUnid}) => {
                const repo = repoOf(ctx, projectUnid);
                return json({rev: repo.getRev(), fs: repo.getFs()});
            }
        }),

        defineVtsMcpTool({
            name: 'vts_generate',
            description: 'Explicitly run the code generator for a project. Normally autoGenerate handles this on every mutation; call this when autoGenerate is off or to force a rerun.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid
            }),
            handler: async ({projectUnid}) => {
                const repo = repoOf(ctx, projectUnid);
                await repo.flush();
                await ctx.runGenerate(repo);
                return json({success: true, rev: repo.getRev()});
            }
        }),

        // Containers ---------------------------------------------------------------

        defineVtsMcpTool({
            name: 'vts_create_folder',
            description: 'Create a folder container at parentUnid. Use projectUnid as parent for a top-level folder.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                parentUnid: Vts.string(),
                name: Vts.string(),
                icon: Vts.optional(Vts.string()),
                unid: Vts.optional(Vts.string({description: 'Client-supplied unid; server mints one if omitted'}))
            }),
            handler: async ({projectUnid, ...args}) => {
                const node = repoOf(ctx, projectUnid).createContainer({...args, type: 'folder'});
                return json(node);
            }
        }),

        defineVtsMcpTool({
            name: 'vts_create_file',
            description: 'Create a file container (holds schemas / enums / links) at parentUnid.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                parentUnid: Vts.string(),
                name: Vts.string(),
                icon: Vts.optional(Vts.string()),
                unid: Vts.optional(Vts.string())
            }),
            handler: async ({projectUnid, ...args}) => {
                const node = repoOf(ctx, projectUnid).createContainer({...args, type: 'file'});
                return json(node);
            }
        }),

        defineVtsMcpTool({
            name: 'vts_update_container',
            description: 'Rename / retype / retoggle a folder or file.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                unid: Vts.string(),
                name: Vts.optional(Vts.string()),
                icon: Vts.optional(Vts.string()),
                istoggle: Vts.optional(Vts.boolean()),
                type: Vts.optional(Vts.string())
            }),
            handler: async ({projectUnid, unid, ...patch}) => {
                repoOf(ctx, projectUnid).updateContainer({unid, patch});
                return json({success: true});
            }
        }),

        defineVtsMcpTool({
            name: 'vts_delete_container',
            description: 'Delete a folder or file. The container must be empty (no nested entries, schemas, enums, links).',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                unid: Vts.string()
            }),
            handler: async ({projectUnid, unid}) => {
                repoOf(ctx, projectUnid).deleteContainer({unid});
                return json({success: true});
            }
        }),

        defineVtsMcpTool({
            name: 'vts_move_container',
            description: 'Move a folder or file under a different parent.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                unid: Vts.string(),
                toParentUnid: Vts.string(),
                index: Vts.optional(Vts.number())
            }),
            handler: async ({projectUnid, unid, toParentUnid, index}) => {
                repoOf(ctx, projectUnid).moveContainer({unid, toParentUnid, index});
                return json({success: true});
            }
        }),

        // Schemas ------------------------------------------------------------------

        defineVtsMcpTool({
            name: 'vts_create_schema',
            description: 'Create a schema inside a container. Default extend is object. Fields are added separately via vts_create_field.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                containerUnid: Vts.string(),
                name: Vts.string(),
                description: Vts.optional(Vts.string()),
                extend: Vts.optional(Extend),
                pos: Vts.optional(Pos),
                unid: Vts.optional(Vts.string())
            }),
            handler: async ({projectUnid, ...args}) => {
                const schema = repoOf(ctx, projectUnid).createSchema(args);
                return json(schema);
            }
        }),

        defineVtsMcpTool({
            name: 'vts_update_schema',
            description: 'Update a schema. Only provided keys are applied; omitted keys remain.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                unid: Vts.string(),
                name: Vts.optional(Vts.string()),
                description: Vts.optional(Vts.string()),
                extend: Vts.optional(Extend),
                pos: Vts.optional(Pos)
            }),
            handler: async ({projectUnid, unid, ...patch}) => {
                repoOf(ctx, projectUnid).updateSchema({unid, patch});
                return json({success: true});
            }
        }),

        defineVtsMcpTool({
            name: 'vts_delete_schema',
            description: 'Delete a schema along with all its fields.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                unid: Vts.string()
            }),
            handler: async ({projectUnid, unid}) => {
                repoOf(ctx, projectUnid).deleteSchema({unid});
                return json({success: true});
            }
        }),

        defineVtsMcpTool({
            name: 'vts_move_schema',
            description: 'Move a schema to a different container.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                unid: Vts.string(),
                toContainerUnid: Vts.string()
            }),
            handler: async ({projectUnid, unid, toContainerUnid}) => {
                repoOf(ctx, projectUnid).moveSchema({unid, toContainerUnid});
                return json({success: true});
            }
        }),

        // Fields -------------------------------------------------------------------

        defineVtsMcpTool({
            name: 'vts_create_field',
            description: 'Add a field to a schema. `type` can be a leaf type name or a nested object describing array/optional/or-types.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                schemaUnid: Vts.string(),
                name: Vts.string(),
                type: FieldType,
                optional: Vts.optional(Vts.boolean()),
                array: Vts.optional(Vts.boolean()),
                types: Vts.optional(Vts.array(Vts.unknown())),
                description: Vts.optional(Vts.string()),
                index: Vts.optional(Vts.number()),
                unid: Vts.optional(Vts.string())
            }),
            handler: async ({projectUnid, schemaUnid, type, optional, array, types, ...rest}) => {
                const fieldType = normalizeFieldType(type as string|JsonSchemaFieldType, {optional, array, types})!;
                const field = repoOf(ctx, projectUnid).createField({
                    schemaUnid,
                    fieldType,
                    ...rest
                });
                return json(field);
            }
        }),

        defineVtsMcpTool({
            name: 'vts_update_field',
            description: 'Update a field. Only provided keys are applied.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                schemaUnid: Vts.string(),
                fieldUnid: Vts.string(),
                name: Vts.optional(Vts.string()),
                type: Vts.optional(FieldType),
                optional: Vts.optional(Vts.boolean()),
                array: Vts.optional(Vts.boolean()),
                types: Vts.optional(Vts.array(Vts.unknown())),
                description: Vts.optional(Vts.string())
            }),
            handler: async ({projectUnid, schemaUnid, fieldUnid, type, optional, array, types, ...rest}) => {
                const patch: Record<string, unknown> = {...rest};
                const normalized = normalizeFieldType(type as string|JsonSchemaFieldType|undefined, {optional, array, types});

                if (normalized !== undefined) {
                    patch.type = normalized;
                }

                repoOf(ctx, projectUnid).updateField({schemaUnid, fieldUnid, patch});
                return json({success: true});
            }
        }),

        defineVtsMcpTool({
            name: 'vts_delete_field',
            description: 'Delete a field from a schema.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                schemaUnid: Vts.string(),
                fieldUnid: Vts.string()
            }),
            handler: async ({projectUnid, schemaUnid, fieldUnid}) => {
                repoOf(ctx, projectUnid).deleteField({schemaUnid, fieldUnid});
                return json({success: true});
            }
        }),

        defineVtsMcpTool({
            name: 'vts_reorder_fields',
            description: 'Reorder fields inside a schema. `order` is an array of field unids in the desired order. Missing unids stay at the tail in their previous relative order; unknown unids raise an error.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                schemaUnid: Vts.string(),
                order: Vts.array(Vts.string())
            }),
            handler: async ({projectUnid, schemaUnid, order}) => {
                repoOf(ctx, projectUnid).reorderFields({schemaUnid, order});
                return json({success: true});
            }
        }),

        // Enums --------------------------------------------------------------------

        defineVtsMcpTool({
            name: 'vts_create_enum',
            description: 'Create an enum inside a container.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                containerUnid: Vts.string(),
                name: Vts.string(),
                description: Vts.optional(Vts.string()),
                pos: Vts.optional(Pos),
                unid: Vts.optional(Vts.string())
            }),
            handler: async ({projectUnid, ...args}) => {
                const enumeration = repoOf(ctx, projectUnid).createEnum(args);
                return json(enumeration);
            }
        }),

        defineVtsMcpTool({
            name: 'vts_update_enum',
            description: 'Update an enum. Only provided keys are applied.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                unid: Vts.string(),
                name: Vts.optional(Vts.string()),
                description: Vts.optional(Vts.string()),
                pos: Vts.optional(Pos)
            }),
            handler: async ({projectUnid, unid, ...patch}) => {
                repoOf(ctx, projectUnid).updateEnum({unid, patch});
                return json({success: true});
            }
        }),

        defineVtsMcpTool({
            name: 'vts_delete_enum',
            description: 'Delete an enum along with its values.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                unid: Vts.string()
            }),
            handler: async ({projectUnid, unid}) => {
                repoOf(ctx, projectUnid).deleteEnum({unid});
                return json({success: true});
            }
        }),

        defineVtsMcpTool({
            name: 'vts_move_enum',
            description: 'Move an enum to a different container.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                unid: Vts.string(),
                toContainerUnid: Vts.string()
            }),
            handler: async ({projectUnid, unid, toContainerUnid}) => {
                repoOf(ctx, projectUnid).moveEnum({unid, toContainerUnid});
                return json({success: true});
            }
        }),

        // Enum values --------------------------------------------------------------

        defineVtsMcpTool({
            name: 'vts_create_enum_value',
            description: 'Add a value to an enum.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                enumUnid: Vts.string(),
                name: Vts.string(),
                value: Vts.string(),
                index: Vts.optional(Vts.number()),
                unid: Vts.optional(Vts.string())
            }),
            handler: async ({projectUnid, enumUnid, ...args}) => {
                const value = repoOf(ctx, projectUnid).createEnumValue({enumUnid, ...args});
                return json(value);
            }
        }),

        defineVtsMcpTool({
            name: 'vts_update_enum_value',
            description: 'Update an enum value.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                enumUnid: Vts.string(),
                valueUnid: Vts.string(),
                name: Vts.optional(Vts.string()),
                value: Vts.optional(Vts.string())
            }),
            handler: async ({projectUnid, enumUnid, valueUnid, ...patch}) => {
                repoOf(ctx, projectUnid).updateEnumValue({enumUnid, valueUnid, patch});
                return json({success: true});
            }
        }),

        defineVtsMcpTool({
            name: 'vts_delete_enum_value',
            description: 'Delete an enum value.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                enumUnid: Vts.string(),
                valueUnid: Vts.string()
            }),
            handler: async ({projectUnid, enumUnid, valueUnid}) => {
                repoOf(ctx, projectUnid).deleteEnumValue({enumUnid, valueUnid});
                return json({success: true});
            }
        }),

        defineVtsMcpTool({
            name: 'vts_reorder_enum_values',
            description: 'Reorder enum values. `order` is an array of value unids.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                enumUnid: Vts.string(),
                order: Vts.array(Vts.string())
            }),
            handler: async ({projectUnid, enumUnid, order}) => {
                repoOf(ctx, projectUnid).reorderEnumValues({enumUnid, order});
                return json({success: true});
            }
        }),

        // Links --------------------------------------------------------------------

        defineVtsMcpTool({
            name: 'vts_create_link',
            description: 'Create a visual link in a file referencing another schema/enum by its unid.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                containerUnid: Vts.string(),
                link_unid: Vts.string({description: 'Unid of the target schema or enum'}),
                pos: Vts.optional(Pos),
                unid: Vts.optional(Vts.string())
            }),
            handler: async ({projectUnid, ...args}) => {
                const link = repoOf(ctx, projectUnid).createLink(args);
                return json(link);
            }
        }),

        defineVtsMcpTool({
            name: 'vts_update_link',
            description: 'Update a link (currently only canvas position).',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                unid: Vts.string(),
                pos: Pos
            }),
            handler: async ({projectUnid, unid, pos}) => {
                repoOf(ctx, projectUnid).updateLink({unid, patch: {pos}});
                return json({success: true});
            }
        }),

        defineVtsMcpTool({
            name: 'vts_delete_link',
            description: 'Delete a link.',
            inputSchema: Vts.object({
                projectUnid: ProjectUnid,
                unid: Vts.string()
            }),
            handler: async ({projectUnid, unid}) => {
                repoOf(ctx, projectUnid).deleteLink({unid});
                return json({success: true});
            }
        })

    ];

    // Introspection — must be pushed after `tools` is built so it can
    // report on every sibling tool. Defaults to `allow` under the
    // standard policy (matches `vts_get_*`).
    tools.push(defineVtsMcpTool({
        name: 'vts_get_policy',
        description: 'Return the effective policy action (allow|ask|deny) for every registered tool, including any active session/forever overrides granted by the user.',
        inputSchema: Vts.object({}),
        handler: async () => {
            const rows = tools.map((t) => {
                const base = options.decide ? options.decide(t.name) : 'allow';
                const override = options.getSessionOverride?.(t.name);

                return {
                    tool: t.name,
                    action: override ?? base,
                    policy: base,
                    override: override ?? null
                };
            });

            return json({tools: rows});
        }
    }));

    registerVtsMcpTools(server, tools, options);
}
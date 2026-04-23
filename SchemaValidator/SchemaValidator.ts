import {Schema, SchemaErrors, Vts} from 'vts';
import {
    JsonDataFS,
    JsonEnumDescription,
    JsonSchemaDescription,
    JsonSchemaFieldType,
    SchemaJsonDataFS,
    SchemaJsonSchemaFieldType
} from '../SchemaEditor/JsonData.js';
import {
    TypeVtsArray,
    TypeVtsBoolean,
    TypeVtsDate,
    TypeVtsDateString,
    TypeVtsFalse,
    TypeVtsNull,
    TypeVtsNumber,
    TypeVtsObject,
    TypeVtsObject2,
    TypeVtsOr,
    TypeVtsString,
    TypeVtsTrue,
    TypeVtsUndefined,
    TypeVtsUnknown
} from '../SchemaTypes/SchemaTypes.js';

/**
 * Validation error tree: each node corresponds to a level in the validated
 * structure. Messages are VTS's raw strings for that level; children are
 * nested errors keyed by field name / array index.
 */
export type ValidationErrorNode = {
    key: string;
    messages: string[];
    children: ValidationErrorNode[];
};

/**
 * Validation result
 */
export type ValidationResult = {
    valid: boolean;
    errors: ValidationErrorNode;
};

/**
 * Runtime-builds VTS validators from a JsonDataFS tree and validates arbitrary
 * data against a chosen schema. Mirrors (a subset of) the logic that
 * SchemaGenerator bakes into .ts files, but produces live Schema objects.
 */
export class SchemaValidator {

    protected _schemas: Map<string, JsonSchemaDescription> = new Map();
    protected _enums: Map<string, JsonEnumDescription> = new Map();
    protected _cache: Map<string, Schema<unknown>> = new Map();
    protected _inProgress: Set<string> = new Set();

    /**
     * Construct with a JsonDataFS tree (root or any subtree). Collects every
     * schema and enum found recursively via the `entrys` arrays.
     * @param {JsonDataFS} fs
     */
    public constructor(fs: JsonDataFS) {
        this._collect(fs);
    }

    /**
     * Merge additional schemas/enums from another fs tree (e.g. a second
     * project file). Useful when the caller spans multiple schema.json files.
     * @param {JsonDataFS} fs
     */
    public addFs(fs: JsonDataFS): void {
        this._collect(fs);
    }

    /**
     * Whether a schema with the given unid is known.
     * @param {string} unid
     * @return {boolean}
     */
    public hasSchema(unid: string): boolean {
        return this._schemas.has(unid);
    }

    /**
     * Validate `data` against the schema identified by `schemaUnid`.
     * Always returns a structured result — including parse or build errors
     * reported inside the tree, so the frontend renders uniformly.
     * @param {string} schemaUnid
     * @param {unknown} data
     * @return {ValidationResult}
     */
    public validate(schemaUnid: string, data: unknown): ValidationResult {
        const schema = this._schemas.get(schemaUnid);

        if (!schema) {
            return {
                valid: false,
                errors: {
                    key: '',
                    messages: [`Schema with unid ${schemaUnid} not found.`],
                    children: []
                }
            };
        }

        let builtSchema: Schema<unknown>;

        try {
            builtSchema = this._buildSchemaByUnid(schemaUnid);
        } catch (e) {
            return {
                valid: false,
                errors: {
                    key: '',
                    messages: [`Could not build validator: ${(e as Error).message}`],
                    children: []
                }
            };
        }

        const errors: SchemaErrors = [];
        const valid = builtSchema.validate(data, errors);

        return {
            valid,
            errors: this._buildErrorTree(errors)
        };
    }

    /**
     * Build an example value that satisfies the given schema. Useful for
     * pre-filling the "Validate JSON" dialog with a correctly-shaped template.
     * Optional fields are included so users see the complete shape.
     * Circular references short-circuit with null to prevent stack overflow.
     * @param {string} schemaUnid
     * @return {unknown}
     */
    public generateExample(schemaUnid: string): unknown {
        const desc = this._schemas.get(schemaUnid);

        if (!desc) {
            throw new Error(`Schema unid=${schemaUnid} not found.`);
        }

        return this._exampleFromDescription(desc, new Set());
    }

    /**
     * Example generator for a schema description. Tracks visited unids to
     * break cycles.
     * @param {JsonSchemaDescription} desc
     * @param {Set<string>} visited
     * @return {unknown}
     * @protected
     */
    protected _exampleFromDescription(desc: JsonSchemaDescription, visited: Set<string>): unknown {
        if (visited.has(desc.unid)) {
            return null;
        }

        const nextVisited = new Set(visited);
        nextVisited.add(desc.unid);

        const extend = desc.extend;

        switch (extend.type) {
            case TypeVtsObject:
                return this._exampleItems(desc, nextVisited);

            case TypeVtsObject2: {
                const sample = extend.value
                    ? this._exampleFromTypeString(extend.value, undefined, nextVisited)
                    : null;
                return {example: sample};
            }

            case TypeVtsArray: {
                const elem = extend.value
                    ? this._exampleFromTypeString(extend.value, undefined, nextVisited)
                    : null;
                return [elem];
            }

            case TypeVtsOr: {
                if (!extend.or_values || extend.or_values.length === 0) {
                    return null;
                }

                const first = extend.or_values[0];
                return this._exampleFromTypeString(first.type, first.value, nextVisited);
            }

            case TypeVtsString: return '';
            case TypeVtsNumber: return 0;
            case TypeVtsBoolean: return false;
            case TypeVtsNull: return null;
            case TypeVtsDate:
            case TypeVtsDateString: return new Date().toISOString();
            case TypeVtsUnknown: return null;
            case TypeVtsUndefined: return null;
            case TypeVtsTrue: return true;
            case TypeVtsFalse: return false;

            default: {
                if (this._schemas.has(extend.type)) {
                    const parent = this._schemas.get(extend.type)!;
                    const base = this._exampleFromDescription(parent, nextVisited);

                    if (desc.fields.length === 0) {
                        return base;
                    }

                    if (base && typeof base === 'object' && !Array.isArray(base)) {
                        return {...(base as Record<string, unknown>), ...this._exampleItems(desc, nextVisited)};
                    }

                    return base;
                }

                if (this._enums.has(extend.type)) {
                    return this._exampleEnum(extend.type);
                }

                return null;
            }
        }
    }

    /**
     * Build example objects from a schema's fields.
     * @param {JsonSchemaDescription} desc
     * @param {Set<string>} visited
     * @return {Record<string, unknown>}
     * @protected
     */
    protected _exampleItems(desc: JsonSchemaDescription, visited: Set<string>): Record<string, unknown> {
        const out: Record<string, unknown> = {};

        for (const field of desc.fields) {
            if (SchemaJsonSchemaFieldType.validate(field.type, [])) {
                out[field.name] = this._exampleFromFieldType(field.type, visited);
            } else if (typeof field.type === 'string') {
                out[field.name] = this._exampleFromTypeString(field.type, undefined, visited);
            } else {
                out[field.name] = null;
            }
        }

        return out;
    }

    /**
     * Example generator for a JsonSchemaFieldType. Wraps arrays and picks
     * the first `or` variant.
     * @param {JsonSchemaFieldType} fieldType
     * @param {Set<string>} visited
     * @return {unknown}
     * @protected
     */
    protected _exampleFromFieldType(fieldType: JsonSchemaFieldType, visited: Set<string>): unknown {
        let inner: unknown;

        if (fieldType.type === TypeVtsOr) {
            if (!fieldType.types || fieldType.types.length === 0) {
                inner = null;
            } else {
                const first = fieldType.types[0];

                if (SchemaJsonSchemaFieldType.validate(first, [])) {
                    inner = this._exampleFromFieldType(first, visited);
                } else {
                    inner = null;
                }
            }
        } else {
            inner = this._exampleFromTypeString(fieldType.type, undefined, visited);
        }

        if (fieldType.array) {
            return [inner];
        }

        return inner;
    }

    /**
     * Example generator for a type string (primitive or unid reference).
     * @param {string} type
     * @param {string|undefined} value
     * @param {Set<string>} visited
     * @return {unknown}
     * @protected
     */
    protected _exampleFromTypeString(type: string, value: string|undefined, visited: Set<string>): unknown {
        switch (type) {
            case TypeVtsString: return '';
            case TypeVtsNumber: return 0;
            case TypeVtsBoolean: return false;
            case TypeVtsNull: return null;
            case TypeVtsDate:
            case TypeVtsDateString: return new Date().toISOString();
            case TypeVtsUnknown: return null;
            case TypeVtsUndefined: return null;
            case TypeVtsTrue: return true;
            case TypeVtsFalse: return false;

            case TypeVtsArray: {
                const elem = value ? this._exampleFromTypeString(value, undefined, visited) : null;
                return [elem];
            }

            case TypeVtsObject2: {
                const val = value ? this._exampleFromTypeString(value, undefined, visited) : null;
                return {example: val};
            }

            case TypeVtsObject:
                return {};

            default: {
                if (this._schemas.has(type)) {
                    const desc = this._schemas.get(type)!;
                    return this._exampleFromDescription(desc, visited);
                }

                if (this._enums.has(type)) {
                    return this._exampleEnum(type);
                }

                return null;
            }
        }
    }

    /**
     * Example generator for enums — pick the first value.
     * @param {string} unid
     * @return {unknown}
     * @protected
     */
    protected _exampleEnum(unid: string): unknown {
        const enumDesc = this._enums.get(unid);

        if (!enumDesc || enumDesc.values.length === 0) {
            return null;
        }

        return enumDesc.values[0].value;
    }

    /**
     * Recursively collect schemas + enums across the fs tree.
     * @param {JsonDataFS} fs
     * @protected
     */
    protected _collect(fs: JsonDataFS): void {
        for (const aschema of fs.schemas) {
            this._schemas.set(aschema.unid, aschema);
        }

        for (const aenum of fs.enums) {
            this._enums.set(aenum.unid, aenum);
        }

        for (const entry of fs.entrys) {
            if (SchemaJsonDataFS.validate(entry, [])) {
                this._collect(entry);
            }
        }
    }

    /**
     * Build (or return cached) Schema for a given schema unid. Uses an
     * in-progress set to surface circular references instead of recursing
     * forever.
     * @param {string} unid
     * @return {Schema<unknown>}
     * @protected
     */
    protected _buildSchemaByUnid(unid: string): Schema<unknown> {
        const cached = this._cache.get(unid);

        if (cached) {
            return cached;
        }

        if (this._inProgress.has(unid)) {
            throw new Error(`Circular schema reference (unid=${unid}) is not supported by the validator.`);
        }

        const desc = this._schemas.get(unid);

        if (!desc) {
            throw new Error(`Referenced schema unid=${unid} not found.`);
        }

        this._inProgress.add(unid);

        const built = this._buildFromDescription(desc);

        this._inProgress.delete(unid);
        this._cache.set(unid, built);

        return built;
    }

    /**
     * Build Schema from a single JsonSchemaDescription by dispatching on the
     * extend type. Mirrors SchemaGenerator._writeSchemaContent in intent.
     * @param {JsonSchemaDescription} desc
     * @return {Schema<unknown>}
     * @protected
     */
    protected _buildFromDescription(desc: JsonSchemaDescription): Schema<unknown> {
        const extend = desc.extend;
        const items = (): Record<string, Schema<unknown>> => this._buildItems(desc);

        switch (extend.type) {
            case TypeVtsObject:
                return Vts.object(items());

            case TypeVtsObject2: {
                const valueSchema = extend.value
                    ? this._buildFromTypeString(extend.value)
                    : Vts.unknown();
                return Vts.object2(Vts.string(), valueSchema);
            }

            case TypeVtsArray: {
                const elementSchema = extend.value
                    ? this._buildFromTypeString(extend.value)
                    : Vts.unknown();
                return Vts.array(elementSchema);
            }

            case TypeVtsOr: {
                if (!extend.or_values || extend.or_values.length === 0) {
                    return Vts.unknown();
                }

                const orSchemas = extend.or_values.map(
                    v => this._buildFromTypeString(v.type, v.value)
                );
                return Vts.or(orSchemas);
            }

            case TypeVtsString: return Vts.string();
            case TypeVtsNumber: return Vts.number();
            case TypeVtsBoolean: return Vts.boolean();
            case TypeVtsNull: return Vts.null();
            case TypeVtsDate: return Vts.date();
            case TypeVtsDateString: return Vts.dateString();
            case TypeVtsUnknown: return Vts.unknown();
            case TypeVtsUndefined: return Vts.undefined();
            case TypeVtsTrue: return Vts.true();
            case TypeVtsFalse: return Vts.false();

            default: {
                // Extend references another schema or an enum
                if (this._schemas.has(extend.type)) {
                    const parentSchema = this._buildSchemaByUnid(extend.type);

                    if (desc.fields.length === 0) {
                        return parentSchema;
                    }

                    // Parent is an ObjectSchema — append our own fields on top.
                    // Fall back to Vts.object(items) if .extend() is not available.
                    const merged = this._buildItems(desc);
                    const extendable = parentSchema as unknown as {
                        extend?: (items: Record<string, Schema<unknown>>) => Schema<unknown>;
                    };

                    if (typeof extendable.extend === 'function') {
                        return extendable.extend(merged);
                    }

                    return Vts.object(merged);
                }

                if (this._enums.has(extend.type)) {
                    return this._buildEnum(extend.type);
                }

                return Vts.unknown();
            }
        }
    }

    /**
     * Build the `{fieldName: Schema}` map used for Vts.object(...) from a
     * schema's fields. Wraps optional fields in Vts.optional so they may be
     * omitted from the validated data.
     * @param {JsonSchemaDescription} desc
     * @return {Record<string, Schema<unknown>>}
     * @protected
     */
    protected _buildItems(desc: JsonSchemaDescription): Record<string, Schema<unknown>> {
        const items: Record<string, Schema<unknown>> = {};

        for (const field of desc.fields) {
            let fieldSchema: Schema<unknown>;
            let optional = false;

            if (SchemaJsonSchemaFieldType.validate(field.type, [])) {
                fieldSchema = this._buildFromFieldType(field.type);
                optional = field.type.optional;
            } else if (typeof field.type === 'string') {
                fieldSchema = this._buildFromTypeString(field.type);
            } else {
                fieldSchema = Vts.unknown();
            }

            if (optional) {
                fieldSchema = Vts.optional(fieldSchema);
            }

            items[field.name] = fieldSchema;
        }

        return items;
    }

    /**
     * Build Schema from a JsonSchemaFieldType. Handles the `or` composite
     * and the per-field `array` modifier (which wraps the resulting schema
     * in Vts.array).
     * @param {JsonSchemaFieldType} fieldType
     * @return {Schema<unknown>}
     * @protected
     */
    protected _buildFromFieldType(fieldType: JsonSchemaFieldType): Schema<unknown> {
        let inner: Schema<unknown>;

        if (fieldType.type === TypeVtsOr) {
            if (!fieldType.types || fieldType.types.length === 0) {
                inner = Vts.unknown();
            } else {
                const orSchemas: Schema<unknown>[] = [];

                for (const t of fieldType.types) {
                    if (SchemaJsonSchemaFieldType.validate(t, [])) {
                        orSchemas.push(this._buildFromFieldType(t));
                    }
                }

                inner = orSchemas.length > 0 ? Vts.or(orSchemas) : Vts.unknown();
            }
        } else {
            inner = this._buildFromTypeString(fieldType.type);
        }

        if (fieldType.array) {
            inner = Vts.array(inner);
        }

        return inner;
    }

    /**
     * Build Schema from a type string. The string is either a VTS type name
     * (like "string") or a schema/enum unid. `value` is used for composite
     * types that carry a target value (array<value>, object2<value>).
     * @param {string} type
     * @param {string|undefined} value
     * @return {Schema<unknown>}
     * @protected
     */
    protected _buildFromTypeString(type: string, value?: string): Schema<unknown> {
        switch (type) {
            case TypeVtsString: return Vts.string();
            case TypeVtsNumber: return Vts.number();
            case TypeVtsBoolean: return Vts.boolean();
            case TypeVtsNull: return Vts.null();
            case TypeVtsDate: return Vts.date();
            case TypeVtsDateString: return Vts.dateString();
            case TypeVtsUnknown: return Vts.unknown();
            case TypeVtsUndefined: return Vts.undefined();
            case TypeVtsTrue: return Vts.true();
            case TypeVtsFalse: return Vts.false();

            case TypeVtsArray: {
                const elem = value ? this._buildFromTypeString(value) : Vts.unknown();
                return Vts.array(elem);
            }

            case TypeVtsObject2: {
                const valueSchema = value ? this._buildFromTypeString(value) : Vts.unknown();
                return Vts.object2(Vts.string(), valueSchema);
            }

            case TypeVtsObject:
                return Vts.object({});

            default: {
                if (this._schemas.has(type)) {
                    return this._buildSchemaByUnid(type);
                }

                if (this._enums.has(type)) {
                    return this._buildEnum(type);
                }

                return Vts.unknown();
            }
        }
    }

    /**
     * Build Schema for an enum unid. Values are always emitted as strings
     * (same as SchemaGenerator writes string-valued enums into generated
     * .ts files), so the user's JSON must use those exact strings.
     * @param {string} unid
     * @return {Schema<unknown>}
     * @protected
     */
    protected _buildEnum(unid: string): Schema<unknown> {
        const cached = this._cache.get(unid);

        if (cached) {
            return cached;
        }

        const enumDesc = this._enums.get(unid);

        if (!enumDesc) {
            return Vts.unknown();
        }

        const record: Record<string, string> = {};

        for (const v of enumDesc.values) {
            record[v.name] = v.value;
        }

        const schema = Vts.enum(record);
        this._cache.set(unid, schema);

        return schema;
    }

    /**
     * Flatten VTS's heterogeneous SchemaErrors shape (mixed strings and
     * nested record objects) into a predictable tree the frontend can render.
     * @param {SchemaErrors} errors
     * @return {ValidationErrorNode}
     * @protected
     */
    protected _buildErrorTree(errors: SchemaErrors): ValidationErrorNode {
        const root: ValidationErrorNode = {key: '', messages: [], children: []};
        this._fillNode(root, errors);
        return root;
    }

    /**
     * Fill a tree node from a SchemaErrors list.
     * @param {ValidationErrorNode} node
     * @param {SchemaErrors} errors
     * @protected
     */
    protected _fillNode(node: ValidationErrorNode, errors: SchemaErrors): void {
        for (const err of errors) {
            if (typeof err === 'string') {
                node.messages.push(err);
            } else if (err && typeof err === 'object') {
                for (const [key, nested] of Object.entries(err)) {
                    const child: ValidationErrorNode = {key, messages: [], children: []};
                    this._fillNode(child, nested);
                    node.children.push(child);
                }
            }
        }
    }
}
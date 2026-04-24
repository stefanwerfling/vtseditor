import {
    JsonDataFS,
    JsonEditorSettings,
    JsonEnumDescription,
    JsonEnumValueDescription,
    JsonLinkDescription,
    JsonSchemaDescription,
    JsonSchemaDescriptionExtend,
    JsonSchemaFieldDescription,
    JsonSchemaFieldTypeArray,
    JsonSchemaPositionDescription
} from '../JsonData.js';
import {SchemaEditorApiCall} from './SchemaEditorApiCall.js';

/**
 * Error thrown by any {@link SchemaApiClient} method when the server returns
 * a non-2xx response or a `success: false` body. `status` carries the HTTP
 * code and `code` the app-level error code (e.g. `not_found`, `conflict`).
 */
export class SchemaApiError extends Error {

    public readonly status: number;
    public readonly code: string|undefined;

    public constructor(status: number, message: string, code?: string) {
        super(message);
        this.status = status;
        this.code = code;
    }

}

type MutationResponse<T> = {
    success: true;
    rev: number;
    data?: T;
};

/**
 * Browser-side wrapper around the granular /api/projects/:pid/* routes.
 *
 * Every mutation attaches the instance's `clientId` as `X-Client-Id` header
 * so the SSE stream can recognize the caller's own echoes. If no explicit id
 * is supplied the constructor mints a session-local UUID.
 */
export class SchemaApiClient {

    private readonly _projectUnid: string;
    private readonly _clientId: string;

    public constructor(projectUnid: string, clientId?: string) {
        this._projectUnid = projectUnid;
        this._clientId = clientId ?? crypto.randomUUID();
    }

    public getClientId(): string {
        return this._clientId;
    }

    public getProjectUnid(): string {
        return this._projectUnid;
    }

    // Containers --------------------------------------------------------------

    public createContainer(args: {
        parentUnid: string;
        name: string;
        type: string;
        icon?: string;
        unid?: string;
    }): Promise<MutationResponse<JsonDataFS>> {
        return this._send<JsonDataFS>('POST', '/containers', args);
    }

    public updateContainer(
        unid: string,
        patch: {name?: string; icon?: string; istoggle?: boolean; type?: string}
    ): Promise<MutationResponse<never>> {
        return this._send('PATCH', `/containers/${unid}`, {patch});
    }

    public deleteContainer(unid: string): Promise<MutationResponse<never>> {
        return this._send('DELETE', `/containers/${unid}`);
    }

    public moveContainer(
        unid: string,
        args: {toParentUnid: string; index?: number}
    ): Promise<MutationResponse<never>> {
        return this._send('POST', `/containers/${unid}/move`, args);
    }

    // Schemas -----------------------------------------------------------------

    public createSchema(args: {
        containerUnid: string;
        name: string;
        description?: string;
        extend?: JsonSchemaDescriptionExtend;
        pos?: JsonSchemaPositionDescription;
        unid?: string;
    }): Promise<MutationResponse<JsonSchemaDescription>> {
        return this._send<JsonSchemaDescription>('POST', '/schemas', args);
    }

    public updateSchema(
        unid: string,
        patch: {
            name?: string;
            description?: string;
            extend?: JsonSchemaDescriptionExtend;
            pos?: JsonSchemaPositionDescription;
        }
    ): Promise<MutationResponse<never>> {
        return this._send('PATCH', `/schemas/${unid}`, {patch});
    }

    public deleteSchema(unid: string): Promise<MutationResponse<never>> {
        return this._send('DELETE', `/schemas/${unid}`);
    }

    public moveSchema(
        unid: string,
        args: {toContainerUnid: string}
    ): Promise<MutationResponse<never>> {
        return this._send('POST', `/schemas/${unid}/move`, args);
    }

    // Fields ------------------------------------------------------------------

    public createField(
        schemaUnid: string,
        args: {
            name: string;
            type: JsonSchemaFieldDescription['type'];
            optional?: boolean;
            array?: boolean;
            types?: JsonSchemaFieldTypeArray;
            description?: string;
            index?: number;
            unid?: string;
        }
    ): Promise<MutationResponse<JsonSchemaFieldDescription>> {
        return this._send<JsonSchemaFieldDescription>(
            'POST',
            `/schemas/${schemaUnid}/fields`,
            args
        );
    }

    public updateField(
        schemaUnid: string,
        fieldUnid: string,
        patch: {
            name?: string;
            type?: JsonSchemaFieldDescription['type'];
            optional?: boolean;
            array?: boolean;
            types?: JsonSchemaFieldTypeArray;
            description?: string;
        }
    ): Promise<MutationResponse<never>> {
        return this._send(
            'PATCH',
            `/schemas/${schemaUnid}/fields/${fieldUnid}`,
            {patch}
        );
    }

    public deleteField(schemaUnid: string, fieldUnid: string): Promise<MutationResponse<never>> {
        return this._send('DELETE', `/schemas/${schemaUnid}/fields/${fieldUnid}`);
    }

    public reorderFields(
        schemaUnid: string,
        order: string[]
    ): Promise<MutationResponse<never>> {
        return this._send('PUT', `/schemas/${schemaUnid}/fields/order`, {order});
    }

    // Enums -------------------------------------------------------------------

    public createEnum(args: {
        containerUnid: string;
        name: string;
        description?: string;
        pos?: JsonSchemaPositionDescription;
        unid?: string;
    }): Promise<MutationResponse<JsonEnumDescription>> {
        return this._send<JsonEnumDescription>('POST', '/enums', args);
    }

    public updateEnum(
        unid: string,
        patch: {
            name?: string;
            description?: string;
            pos?: JsonSchemaPositionDescription;
        }
    ): Promise<MutationResponse<never>> {
        return this._send('PATCH', `/enums/${unid}`, {patch});
    }

    public deleteEnum(unid: string): Promise<MutationResponse<never>> {
        return this._send('DELETE', `/enums/${unid}`);
    }

    public moveEnum(
        unid: string,
        args: {toContainerUnid: string}
    ): Promise<MutationResponse<never>> {
        return this._send('POST', `/enums/${unid}/move`, args);
    }

    // Enum values -------------------------------------------------------------

    public createEnumValue(
        enumUnid: string,
        args: {name: string; value: string; index?: number; unid?: string}
    ): Promise<MutationResponse<JsonEnumValueDescription>> {
        return this._send<JsonEnumValueDescription>(
            'POST',
            `/enums/${enumUnid}/values`,
            args
        );
    }

    public updateEnumValue(
        enumUnid: string,
        valueUnid: string,
        patch: {name?: string; value?: string}
    ): Promise<MutationResponse<never>> {
        return this._send('PATCH', `/enums/${enumUnid}/values/${valueUnid}`, {patch});
    }

    public deleteEnumValue(
        enumUnid: string,
        valueUnid: string
    ): Promise<MutationResponse<never>> {
        return this._send('DELETE', `/enums/${enumUnid}/values/${valueUnid}`);
    }

    public reorderEnumValues(
        enumUnid: string,
        order: string[]
    ): Promise<MutationResponse<never>> {
        return this._send('PUT', `/enums/${enumUnid}/values/order`, {order});
    }

    // Links -------------------------------------------------------------------

    public createLink(args: {
        containerUnid: string;
        link_unid: string;
        pos?: JsonSchemaPositionDescription;
        unid?: string;
    }): Promise<MutationResponse<JsonLinkDescription>> {
        return this._send<JsonLinkDescription>('POST', '/links', args);
    }

    public updateLink(
        unid: string,
        patch: {pos?: JsonSchemaPositionDescription}
    ): Promise<MutationResponse<never>> {
        return this._send('PATCH', `/links/${unid}`, {patch});
    }

    public deleteLink(unid: string): Promise<MutationResponse<never>> {
        return this._send('DELETE', `/links/${unid}`);
    }

    // Generate ----------------------------------------------------------------

    public generate(): Promise<MutationResponse<never>> {
        return this._send('POST', '/generate');
    }

    // Batch -------------------------------------------------------------------

    /**
     * Apply an ordered list of granular ops in a single request. The server
     * stops at the first failing op and returns its index — already-applied
     * ops stay committed.
     */
    public batch(ops: SchemaEditorApiCall[]): Promise<MutationResponse<unknown[]>> {
        return this._send<unknown[]>('POST', '/batch', {ops});
    }

    // Editor settings ---------------------------------------------------------
    // Lives outside the per-project scope so it is exposed as a static helper
    // bound to the instance's clientId.

    public async setEditorSettings(settings: JsonEditorSettings): Promise<void> {
        const res = await fetch('/api/editor-settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Client-Id': this._clientId
            },
            body: JSON.stringify(settings)
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new SchemaApiError(res.status, body?.msg ?? res.statusText, body?.code);
        }
    }

    // Private -----------------------------------------------------------------

    private async _send<T>(
        method: string,
        path: string,
        body?: unknown
    ): Promise<MutationResponse<T>> {
        const headers: Record<string, string> = {
            'X-Client-Id': this._clientId
        };

        const init: RequestInit = {method, headers};

        if (body !== undefined) {
            headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(body);
        }

        const res = await fetch(`/api/projects/${this._projectUnid}${path}`, init);
        const json = await res.json().catch(() => ({}));

        if (!res.ok || json?.success === false) {
            throw new SchemaApiError(
                res.status,
                json?.msg ?? res.statusText,
                json?.code
            );
        }

        return json as MutationResponse<T>;
    }

}
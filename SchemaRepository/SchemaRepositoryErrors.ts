/**
 * Error hierarchy used by mutation methods in {@link SchemaFsRepository}.
 * Route handlers map `httpStatus` directly onto the HTTP response code.
 */
export class RepoError extends Error {

    public readonly code: string;
    public readonly httpStatus: number;

    public constructor(code: string, message: string, httpStatus: number) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
    }

}

export class RepoNotFoundError extends RepoError {

    public constructor(what: string) {
        super('not_found', `${what} not found`, 404);
    }

}

export class RepoInvalidError extends RepoError {

    public constructor(message: string) {
        super('invalid', message, 400);
    }

}

export class RepoConflictError extends RepoError {

    public constructor(message: string) {
        super('conflict', message, 409);
    }

}
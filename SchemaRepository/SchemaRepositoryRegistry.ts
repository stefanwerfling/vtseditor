import {SchemaProject} from '../SchemaProject/SchemaProject.js';
import {SchemaFsRepository} from './SchemaFsRepository.js';
import {SchemaRepositoryEventBus} from './SchemaRepositoryEventBus.js';

/**
 * Registry of project repositories keyed by the runtime project UUID that the
 * frontend receives from /api/load-schema. Each project owns exactly one
 * EventBus instance; SSE consumers subscribe via {@link getBus}.
 */
export class SchemaRepositoryRegistry {

    private readonly _repos = new Map<string, SchemaFsRepository>();
    private readonly _buses = new Map<string, SchemaRepositoryEventBus>();

    public register(unid: string, project: SchemaProject): SchemaFsRepository {
        const bus = new SchemaRepositoryEventBus();
        const repo = new SchemaFsRepository(project, bus);

        repo.load();
        this._repos.set(unid, repo);
        this._buses.set(unid, bus);

        return repo;
    }

    public get(unid: string): SchemaFsRepository|undefined {
        return this._repos.get(unid);
    }

    public getBus(unid: string): SchemaRepositoryEventBus|undefined {
        return this._buses.get(unid);
    }

    public has(unid: string): boolean {
        return this._repos.has(unid);
    }

    public entries(): IterableIterator<[string, SchemaFsRepository]> {
        return this._repos.entries();
    }

    public values(): IterableIterator<SchemaFsRepository> {
        return this._repos.values();
    }

    public async flushAll(): Promise<void> {
        await Promise.all(Array.from(this._repos.values()).map((r) => r.flush()));
    }

}
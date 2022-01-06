import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';
import type { SearchParams, SearchResponse } from 'typesense/lib/Typesense/Documents';
import { BaseRepository } from '../shared/lib/repositories/base.repository';
import { authorizeNotFound, SearchService } from '../shared/modules/search/search.service';
import { client } from '../typesense.config';
import { User } from './user.entity';

export interface IndexedUser {
  username: string;
  roles: string[];
  id: string;
  createdAt: string;
}

@Injectable()
export class UserSearchService extends SearchService<User, IndexedUser> {
  private static readonly schema: CollectionCreateSchema = {
    name: 'users',
    fields: [
      { name: 'username', type: 'string' },
      { name: 'roles', type: 'string[]' },
      { name: 'createdAt', type: 'string' },
    ],
  };

  private readonly documents = client.collections<IndexedUser>('users').documents();

  constructor(
    @InjectRepository(User) private readonly userRepository: BaseRepository<User>,
  ) { super(UserSearchService.schema, 'users'); }

  public async init(): Promise<void> {
    const users = await this.userRepository.findAll();
    await super.init(users, entity => this.toIndexedEntity(entity));
  }

  public async add(user: User): Promise<void> {
    await this.documents.create(this.toIndexedEntity(user));
  }

  public async update(user: User): Promise<void> {
    await this.documents.update(this.toIndexedEntity(user)).catch(authorizeNotFound);
  }

  public async remove(userId: string): Promise<void> {
    await this.documents.delete(userId).catch(authorizeNotFound);
  }

  public async search(queries: SearchParams<IndexedUser>): Promise<SearchResponse<IndexedUser>> {
    return await this.documents.search(queries);
  }

  public async searchAndPopulate(queries: SearchParams<IndexedUser>): Promise<SearchResponse<User>> {
    const results = await this.documents.search(queries);

    if (results.hits?.length) {
      const userIds = results.hits.map(hit => hit.document.id);
      const users = await this.userRepository.find({ userId: { $in: userIds } });
      for (const hit of results.hits)
        // @ts-expect-error: This works, TypeScript... I know there is a mismatch between IndexedUser.id and
        // User.userId. I know.
        hit.document = users.find(user => user.userId === hit.document.id)!;
    }
    // @ts-expect-error: Ditto.
    return results;
  }

  public toIndexedEntity(user: User): IndexedUser {
    return {
      username: user.username,
      roles: user.roles,
      id: user.userId,
      createdAt: user.createdAt.toString(),
    };
  }
}

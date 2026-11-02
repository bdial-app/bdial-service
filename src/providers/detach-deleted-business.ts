import { EntityManager } from 'typeorm';
import { Provider } from '../entities/provider.entity';

/**
 * Lets a user's deleted business go of them, so they can have a new one (one
 * business row per user). Call it in the transaction that creates the new
 * business. True if there was one.
 */
export async function detachDeletedBusiness(
  manager: EntityManager,
  userId: string,
): Promise<boolean> {
  const res = await manager
    .createQueryBuilder()
    .update(Provider)
    .set({ userId: null as unknown as string, previousUserId: userId })
    .where('user_id = :userId AND deleted_at IS NOT NULL', { userId })
    .execute();
  return !!res.affected;
}

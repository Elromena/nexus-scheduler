import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Slot locks: enforce unique (scheduled_date, scheduled_time) to prevent double booking races
export const slotLocks = sqliteTable('slot_locks', {
  id: text('id').primaryKey(), // bookingId
  scheduledDate: text('scheduled_date').notNull(),
  scheduledTime: text('scheduled_time').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  slotUniqueIdx: uniqueIndex('uidx_slot_locks_date_time').on(table.scheduledDate, table.scheduledTime),
}));

export type SlotLock = typeof slotLocks.$inferSelect;
export type NewSlotLock = typeof slotLocks.$inferInsert;


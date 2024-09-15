import { sql } from "drizzle-orm";
import { boolean, pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';
import { appUser } from "./app-user";


export const document = pgTable('document', {
  id: uuid('id').primaryKey().defaultRandom(),
  owner: uuid('owner').notNull().references(() => appUser.id),
  isSharing: boolean('is_sharing').notNull().default(false),
  roomId: uuid('room_id'),
  createdOn: timestamp('created_on', {withTimezone: true}).notNull().default(sql`NOW()`),
  updatedOn: timestamp('updated_on', {withTimezone: true}).notNull().default(sql`NOW()`)  
}, 
  (document) => ({
  roomIdConstarint: sql`CHECK (NOT ${document.isSharing} OR ${document.roomId} IS NOT NULL)`
}));
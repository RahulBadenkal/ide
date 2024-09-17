import { sql } from "drizzle-orm";
import { boolean, pgTable, uuid, timestamp, varchar } from 'drizzle-orm/pg-core';
import { appUser } from "./app-user";


export const document = pgTable('document', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name'),
  owner: uuid('owner').notNull().references(() => appUser.id),
  isSharing: boolean('is_sharing').notNull().default(false),
  roomId: uuid('room_id'),
  room_write_access: boolean('room_write_access'),
  createdOn: timestamp('created_on', {withTimezone: true}).notNull().default(sql`NOW()`),
  updatedOn: timestamp('updated_on', {withTimezone: true}).notNull().default(sql`NOW()`)  
});
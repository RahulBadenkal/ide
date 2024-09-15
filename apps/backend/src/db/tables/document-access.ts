import { sql } from "drizzle-orm";
import { pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';
import { appUser } from "./app-user";


export const documentAccess = pgTable('document-access', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => appUser.id),
  roomId: uuid('room_id').notNull(),  // Need to store this to make sure the access was not later revoked
  createdOn: timestamp('created_on', {withTimezone: true}).notNull().default(sql`NOW()`),
  updatedOn: timestamp('updated_on', {withTimezone: true}).notNull().default(sql`NOW()`)  
});
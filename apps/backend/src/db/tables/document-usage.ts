import { sql } from "drizzle-orm";
import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core';
import { appUser } from "./app-user";
import { document } from "./document";


export const documentAccess = pgTable('document_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => appUser.id),
  documentId: uuid('document_id').notNull().references(() => document.id),
  lastOpenedOn: timestamp('last_opened_on', {withTimezone: true}).notNull().default(sql`NOW()`),
  createdOn: timestamp('created_on', {withTimezone: true}).notNull().default(sql`NOW()`),
  updatedOn: timestamp('updated_on', {withTimezone: true}).notNull().default(sql`NOW()`)  
}, (t) => ({
  unq2: unique('unique_user_id_document_id').on(t.userId, t.documentId)
}));
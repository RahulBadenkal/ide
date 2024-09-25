import { sql } from "drizzle-orm";
import { boolean, pgTable, uuid, timestamp, varchar, customType, jsonb } from 'drizzle-orm/pg-core';
import { appUser } from "./app-user";


const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const document = pgTable('document', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name'),
  owner: uuid('owner').notNull().references(() => appUser.id),
  sharing: boolean('sharing').notNull().default(false),
  roomId: uuid('room_id'),
  yDoc: bytea('y_doc'),
  doc: jsonb('doc'),
  createdOn: timestamp('created_on', {withTimezone: true}).notNull().default(sql`NOW()`),
  updatedOn: timestamp('updated_on', {withTimezone: true}).notNull().default(sql`NOW()`)  
});

import { relations, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { v4 as uuid } from "uuid";

const stringId = (name: string) =>
  text(name)
    .primaryKey()
    .notNull()
    .$defaultFn(() => uuid());

const createdAt = () =>
  text("created_at")
    .notNull()
    .$default(() => sql`CURRENT_TIMESTAMP`);

export const password = sqliteTable("password", {
  id: stringId("id"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  password: text("password").notNull(),
  createdAt: createdAt(),
});

export const user = sqliteTable("user", {
  id: stringId("id"),
  email: text("email").unique().notNull(),
  fullName: text("full_name").notNull(),
  displayName: text("display_name").notNull(),
});

export const chat = sqliteTable("chat", {
  id: stringId("id"),
  name: text("name").notNull(),
  createdAt: createdAt(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

const chatRelations = relations(chat, ({ many }) => ({
  messages: many(chatMessage),
}));

export const chatMessage = sqliteTable("chat_message", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  order: integer("order").notNull(),
  message: text("message").notNull(),
  createdAt: createdAt(),
  chatId: text("chat_id")
    .notNull()
    .references(() => chat.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id),
});

const chatMessageRelations = relations(chatMessage, ({ one }) => ({
  chat: one(chat, {
    fields: [chatMessage.chatId],
    references: [chat.id],
  }),
  sender: one(user, {
    fields: [chatMessage.userId],
    references: [user.id],
  }),
}));

const schema = {
  chat,
  chatMessage,
  chatMessageRelations,
  chatRelations,
  password,
  user,
};

export default schema;

export type DB = BetterSQLite3Database<typeof schema>;

import { mysqlTable, mysqlSchema, AnyMySqlColumn, primaryKey, varchar, bigint } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


export const user = mysqlTable("user", {
	id: varchar("id", { length: 15 }).notNull(),
	username: varchar("username", { length: 20 }),
},
(table) => {
	return {
		userId: primaryKey(table.id),
	}
});

export const userKey = mysqlTable("user_key", {
	id: varchar("id", { length: 255 }).notNull(),
	userId: varchar("user_id", { length: 15 }).notNull(),
	hashedPassword: varchar("hashed_password", { length: 255 }),
},
(table) => {
	return {
		userKeyId: primaryKey(table.id),
	}
});

export const userSession = mysqlTable("user_session", {
	id: varchar("id", { length: 128 }).notNull(),
	userId: varchar("user_id", { length: 15 }).notNull(),
	activeExpires: bigint("active_expires", { mode: "number" }).notNull(),
	idleExpires: bigint("idle_expires", { mode: "number" }).notNull(),
},
(table) => {
	return {
		userSessionId: primaryKey(table.id),
	}
});
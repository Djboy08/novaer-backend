import { lucia } from "lucia";
import { elysia } from "lucia/middleware";
import { betterSqlite3 } from "@lucia-auth/adapter-sqlite";
import Database from "bun:sqlite";

const db = new Database("db.sqlite");

await db.exec(`CREATE TABLE IF NOT EXISTS user (
    id TEXT NOT NULL PRIMARY KEY
);`);

await db.exec(`CREATE TABLE IF NOT EXISTS user_key (
    id TEXT NOT NULL PRIMARY KEY,
    user_id TEXT NOT NULL,
    hashed_password TEXT,
    FOREIGN KEY (user_id) REFERENCES user(id)
);`);

await db.exec(`CREATE TABLE IF NOT EXISTS user_session (
    id TEXT NOT NULL PRIMARY KEY,
    user_id TEXT NOT NULL,
    active_expires INTEGER NOT NULL,
    idle_expires INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id)
);`);

// expect error (see next section)
export const auth = lucia({
  env: "DEV", // "PROD" if deployed to HTTPS
  middleware: elysia(),
  adapter: betterSqlite3(db, {
    user: "user",
    session: "user_session",
    key: "user_key",
  }),
});

export type Auth = typeof auth;

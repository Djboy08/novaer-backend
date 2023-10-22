import { lucia } from "lucia";
import { elysia } from "lucia/middleware";
import { roblox } from "./providers/roblox";
// import Database from "bun:sqlite";
import { planetscale } from "@lucia-auth/adapter-mysql";
import { connection } from "./db";

// const db = new Database("db.sqlite");

// await db.exec(`CREATE TABLE IF NOT EXISTS user (
//     id TEXT NOT NULL PRIMARY KEY,
//     username TEXT
// );`);

// await db.exec(`CREATE TABLE IF NOT EXISTS user_key (
//     id TEXT NOT NULL PRIMARY KEY,
//     user_id TEXT NOT NULL,
//     hashed_password TEXT,
//     FOREIGN KEY (user_id) REFERENCES user(id)
// );`);

// await db.exec(`CREATE TABLE IF NOT EXISTS user_session (
//     id TEXT NOT NULL PRIMARY KEY,
//     user_id TEXT NOT NULL,
//     active_expires INTEGER NOT NULL,
//     idle_expires INTEGER NOT NULL,
//     FOREIGN KEY (user_id) REFERENCES user(id)
// );`);

// expect error (see next section)
export const auth = lucia({
  env: "DEV", // "PROD" if deployed to HTTPS
  middleware: elysia(),
  getUserAttributes: (data) => {
    return {
      robloxUsername: data.username,
    };
  },
  adapter: planetscale(connection, {
    user: "user",
    session: "user_session",
    key: "user_key",
  }),
});

export const robloxAuth = roblox(auth, {
  clientId: process.env.RBX_CLIENT_ID!,
  clientSecret: process.env.RBX_CLIENT_SECRET!,
  redirectUri: "http://localhost:3000/auth/callback",
});

export type RAuth = typeof robloxAuth;

export type Auth = typeof auth;

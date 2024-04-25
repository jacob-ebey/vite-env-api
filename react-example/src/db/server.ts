import * as fsp from "node:fs/promises";
import * as path from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as framework from "framework";
import type { MiddlewareFunction } from "framework/router/server";

import type { DB } from "./schema";
import schema from "./schema";
import { Secrets } from "@/secrets/server";

export const DB_KEY = "DB" as const;

declare global {
  interface ServerContext {
    [DB_KEY]?: DB;
  }
}

let initialized = false;
export const configureDBMiddleware: MiddlewareFunction = async (c, next) => {
  let db = c.get(DB_KEY);

  if (!db) {
    const dbPath = c.get(Secrets.DB_PATH, import.meta.env.PROD as false);
    const dbDir = dbPath ? path.resolve(dbPath) : path.resolve("./.database");

    if (!initialized) {
      await fsp.mkdir(dbDir, { recursive: true });
    }

    const sqlite = new Database(path.resolve(dbDir, "database.db"));
    db = drizzle(sqlite, { schema });

    if (!initialized) {
      migrate(drizzle(sqlite), {
        migrationsFolder: "./migrations",
      });
      initialized = true;
    }

    c.set(DB_KEY, db);
  }

  return next();
};

export function getDB() {
  return framework.get(DB_KEY, true);
}

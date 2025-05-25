import { sql } from "drizzle-orm"
import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core"
import type { Metadata } from "./types"

export const imagesTable = sqliteTable(
    "images",
    {
        id: int().primaryKey({ autoIncrement: true }),
        hash: text().notNull(),
        ip: text().notNull(),
        metadata: text({ mode: "json" }).notNull().$type<Metadata>(),
        created_at: int({ mode: "timestamp_ms" }).notNull().default(sql`(current_timestamp)`),
        bucket_id: int().references(() => bucketsTable.id),
    },
    (table) => [
        index("hash_idx").on(table.hash),
    ]
)

export const bucketsTable = sqliteTable(
    "buckets",
    {
        id: int().primaryKey({ autoIncrement: true }),
        title: text().notNull(),
        description: text().notNull(),
        token: text().notNull(),
        is_revoked: int({ mode: "boolean" }).default(false),
    },
    (table) => [
        index("token_idx").on(table.token)
    ]
)

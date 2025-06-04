/* eslint-disable @typescript-eslint/ban-ts-comment */

import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/d1"
import { Hono } from "hono"
import { getConnInfo } from "hono/cloudflare-workers"
import { optimizeImage } from "wasm-image-optimization"
import { z } from "zod"
import { api_config } from "./config"
import { bucketsTable, imagesTable } from "./schema"
import { hashsum } from "./utils/crypto"
import { get_metadata } from "./utils/get_metadata"
import { S3Client } from "./utils/s3client"

// @ts-ignore
const app = new Hono<{ Bindings: Cloudflare.Env }>()
    .basePath("/api")
    .get(
        "/buckets",
        async (context) => {
            const database = drizzle(context.env.DATABASE)
            const buckets = await database
                .select({
                    id: bucketsTable.id,
                    title: bucketsTable.title,
                    description: bucketsTable.description,
                })
                .from(bucketsTable)
                .where(eq(bucketsTable.is_revoked, false))
            return context.json({ buckets })
        }
    )
    // .post(
    //     "/buckets",
    //     zValidator(
    //         "json",
    //         z.object({
    //             title: z.string(),
    //             description: z.string(),
    //         }),
    //     ),
    //     async (context) => {
    //         const { title, description } = context.req.valid("json")
    //         const token = crypto.randomUUID()
    //         const database = drizzle(context.env.DATABASE)
    //         await database.insert(bucketsTable).values({ title, description, token })
    //         return context.text(token)
    //     },
    // )
    // .delete(
    //     "/buckets/:bucket_id",
    //     zValidator(
    //         "param",
    //         z.object({
    //             bucket_id: z.coerce.number(),
    //         })
    //     ),
    //     async (context) => {
    //         const { bucket_id } = context.req.valid("param")
    //         const database = drizzle(context.env.DATABASE)
    //         await database
    //             .update(bucketsTable)
    //             .set({ is_revoked: true })
    //             .where(eq(bucketsTable.id, bucket_id))
    //         return context.text("OK")
    //     }
    // )
    .get(
        "/buckets/:bucket_id/:page",
        zValidator(
            "param",
            z.object({
                bucket_id: z.coerce.number(),
                page: z.coerce.number(),
            })
        ),
        async (context) => {
            const { bucket_id, page } = context.req.valid("param")
            const database = drizzle(context.env.DATABASE)

            const [response, total] = await Promise.all([
                database
                    .select()
                    .from(imagesTable)
                    .where(eq(imagesTable.bucket_id, bucket_id))
                    .limit(api_config.list_limit)
                    .offset(page * api_config.list_limit),
                database
                    .$count(
                        imagesTable,
                        eq(imagesTable.bucket_id, bucket_id)
                    )
            ] as const)

            return context.json({ images: response, total })
        }
    )
    .post(
        "/images",
        async (c) => {
            const client = new S3Client({
                endpoint: c.env.S3_ENDPOINT,
                accessKey: c.env.S3_ACCESS_KEY,
                secretKey: c.env.S3_SECRET_KEY,
                bucket: "external-image-viewer",
                useSSL: true,
                headers: {
                    "cf-access-client-id": c.env.CF_CLIENT_ID,
                    "cf-access-client-secret": c.env.CF_CLIENT_SECRET
                },
            })

            // Get token from header.
            const headers = c.req.header()
            const bearer = headers["authorization"]
            if (bearer === undefined) {
                return c.text("Authorization required.", 403)
            }
            const token = bearer.slice("Bearer ".length)

            // Check bucket access.
            const database = drizzle(c.env.DATABASE)
            const [bucket] = await database
                .select()
                .from(bucketsTable)
                .where((table) => eq(table.token, token))

            // Case: Bucket not found or revoked.
            if (bucket === undefined || bucket.is_revoked) {
                return c.text("Bucket not found.", 404)
            }

            const buffer = await c.req.arrayBuffer()

            // Case: Empty image data.
            if (!buffer || buffer.byteLength === 0) {
                return c.text("Image data required.", 400)
            }

            // Calculate hash.
            const hash = await hashsum(buffer)

            // Check image already exists.
            const [exists] = await database
                .select()
                .from(imagesTable)
                .where((table) => eq(table.hash, hash))

            // Case: Image already exists.
            if (exists !== undefined) {
                return c.text("Already exists.", 409)
            }

            // Get pnginfo.
            const metadata = get_metadata(buffer)

            // TODO: S3 compat.
            const size = { height: api_config.height_limit }
            // const size = 1152 > 894
            // ? { width: api_config.image_limit }
            // : { height: api_config.image_limit }

            const thumbs = await optimizeImage({ image: buffer, format: "webp", ...size })
            if (thumbs === undefined) {
                return c.text("Failed to create thumbnail.", 400)
            }

            const res_thumbs = await client.put(["thumbs", hash].join("/"), thumbs, { contentType: "image/webp" })
            const res_raw = await client.put(["raw", hash].join("/"), buffer, { contentType: "image/png" })

            console.log({
                res_thumbs: await res_thumbs.text(),
                res_raw: await res_raw.text(),
            })

            // Get client ip.
            const conn = getConnInfo(c)
            const ip = conn.remote.address ?? "(unknown)"

            // Insert to database.
            await database.insert(imagesTable).values({
                hash: hash,
                ip,
                metadata,
                bucket_id: bucket.id,
            })

            // OK
            return c.text("OK")
        }
    )

export default app

export type AppType = typeof app

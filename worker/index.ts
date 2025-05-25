import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/d1"
import { Hono } from "hono"
import { getConnInfo } from "hono/cloudflare-workers"
import { optimizeImage } from "wasm-image-optimization"
import { z } from "zod"
import { api_config } from "./config"
import { get_metadata } from "./lib/png"
import { bucketsTable, imagesTable } from "./schema"

const sha256sum = async (buffer: ArrayBuffer) => {
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")
}

const getCacheKey = (hash: string, request: Request) => {
    const url = new URL(request.url)
    url.pathname = `/image/${hash}`
    return url.toString()
}

const app = new Hono<{ Bindings: Cloudflare.Env }>()
    .basePath("/api")
    .get(
        "/buckets",
        async (context) => {
            const db = drizzle(context.env.DATABASE)
            const buckets = await db
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
    .post(
        "/buckets",
        zValidator(
            "json",
            z.object({
                title: z.string(),
                description: z.string(),
            }),
        ),
        async (context) => {
            const { title, description } = context.req.valid("json")
            const token = crypto.randomUUID()
            const db = drizzle(context.env.DATABASE)
            await db.insert(bucketsTable).values({ title, description, token })
            return context.json({ title, token })
        },
    )
    .delete(
        "/buckets/:bucket_id",
        zValidator(
            "param",
            z.object({
                bucket_id: z.coerce.number(),
            })
        ),
        async (context) => {
            const { bucket_id } = context.req.valid("param")
            const db = drizzle(context.env.DATABASE)
            await db
                .update(bucketsTable)
                .set({ is_revoked: true })
                .where(eq(bucketsTable.id, bucket_id))
            return context.json({ message: "OK" })
        }
    )
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
            const db = drizzle(context.env.DATABASE)

            const response = await db
                .select()
                .from(imagesTable)
                .where(eq(imagesTable.bucket_id, bucket_id))
                .limit(api_config.list_limit)
                .offset(page * api_config.list_limit)

            const total = await db.$count(
                imagesTable,
                eq(imagesTable.bucket_id, bucket_id)
            )

            return context.json({ images: response, total })
        }
    )
    .get(
        "/images/:mode/:hash",
        zValidator(
            "param",
            z.object({
                mode: z.enum(["raw", "thumbs"]),
                hash: z.string(),
            })
        ),
        async (context) => {
            const { mode, hash } = context.req.valid("param")
            const key = [mode, hash].join("/")
            const cacheKey = getCacheKey(key, context.req.raw)

            const responseHeaders = {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=31536000, immutable",
            }

            // Check cache.
            const cachedResponse = await caches.default.match(cacheKey)
            if (cachedResponse !== undefined) {
                return context.newResponse(
                    cachedResponse.body,
                    200,
                    {
                        ...cachedResponse.headers,
                        ...responseHeaders,
                        "X-Cache": "HIT",
                    }
                )
            }

            // Get object from bucket.
            const obj = await context.env.BUCKET.get(key)
            if (!obj) {
                return context.json({ message: "Image not found" }, 404)
            }

            // Get image data from object.
            const buffer = await obj.arrayBuffer()

            // Create response with proper headers
            const response = context.newResponse(
                buffer,
                200,
                {
                    ...responseHeaders,
                    "X-Cache": "MISS",
                }
            )

            // Cache the response asynchronously (don't block the response)
            context.executionCtx.waitUntil(
                caches.default.put(cacheKey, response.clone())
            )

            return response
        }
    )
    .post(
        "/images",
        async (context) => {

            // Get token from header.
            const headers = context.req.header()
            const bearer = headers["authorization"]
            if (bearer === undefined) {
                return context.json({ message: "Authorization required." }, 403)
            }
            const token = bearer.slice("Bearer ".length)

            // Check bucket access.
            const db = drizzle(context.env.DATABASE)
            const [bucket] = await db
                .select()
                .from(bucketsTable)
                .where((table) => eq(table.token, token))

            // Case: Bucket not found or revoked.
            if (bucket === undefined || bucket.is_revoked) {
                return context.json({ message: "Bucket not found." }, 404)
            }

            const buffer = await context.req.arrayBuffer()

            // Case: Empty image data.
            if (!buffer || buffer.byteLength === 0) {
                return context.json({ message: "Image data required." }, 400)
            }

            // Calculate hash.
            const hash = await sha256sum(buffer)

            // Check image already exists.
            const [exists] = await db
                .select()
                .from(imagesTable)
                .where((table) => eq(table.hash, hash))

            // Case: Image already exists.
            if (exists !== undefined) {
                return context.json({ message: "Already exists." }, 409)
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
                return context.json({ message: "Failed to create thumbnail." }, 400)
            }
            await context.env.BUCKET.put(["thumbs", hash].join("/"), thumbs)

            // Create item to R2.
            const obj = await context.env.BUCKET.put(["raw", hash].join("/"), buffer)
            if (obj === null) {
                return context.json({ message: "Failed to upload to R2." }, 400)
            }

            // Get client ip.
            const conn = getConnInfo(context)
            const ip = conn.remote.address ?? "(unknown)"

            // Insert to db.
            await db.insert(imagesTable).values({
                hash,
                ip,
                metadata,
                bucket_id: bucket.id,
            })

            // OK
            return context.json({ message: "OK" }, 200)
        }
    )

export default app

export type AppType = typeof app

import { genhmac, hashsum, toArrayBuffer, toHexString } from "./crypto"

export type ConstructorParams = {
    endpoint: string
    accessKey: string
    secretKey: string
    bucket: string
    useSSL?: boolean
    port?: number
    region?: string
    sessionToken?: string
    pathStyle?: boolean
    headers?: HeadersInit
}

export type RequestOptions = {
    customHeaders?: HeadersInit
    signal?: AbortSignal
}

export type PutObjectOptions = RequestOptions & {
    contentType?: string
    meta?: Record<string, string>
}

export type PutBody = string | Blob | ArrayBuffer | Uint8Array

export class S3Client {
    #endpoint: string
    #accessKey: string
    #secretKey: string
    #bucket: string
    #port: number
    #scheme: string
    #region: string
    #sessionToken?: string
    #pathStyle: boolean
    #headers: Headers

    constructor({
        endpoint,
        accessKey,
        secretKey,
        bucket,
        useSSL = true,
        port,
        region = "us-east-1",
        sessionToken,
        pathStyle = true,
        headers,
    }: ConstructorParams) {
        this.#endpoint = endpoint
        this.#accessKey = accessKey
        this.#secretKey = secretKey
        this.#bucket = bucket
        this.#port = port ?? useSSL ? 443 : 9000
        this.#scheme = useSSL ? "https://" : "http://"
        this.#region = region
        this.#sessionToken = sessionToken
        this.#headers = new Headers(headers)
        this.#pathStyle = pathStyle
    }

    async #signedRequest(
        method: string,
        key: string,
        body?: PutBody,
        options?: RequestOptions & {
            queryParams?: URLSearchParams,
            contentType?: string,
            meta?: Record<string, string>
        }
    ): Promise<Response> {

        // Ignore start slash.
        const objectKey = key.startsWith("/") ? key.substring(1) : key

        // Create target url, Either path or virtual style.
        const targetUrl = this.#pathStyle
            ? new URL(`${this.#scheme}${this.#endpoint}:${this.#port}/${this.#bucket}/${objectKey}`)
            : new URL(`${this.#scheme}${this.#bucket}.${this.#endpoint}:${this.#port}/${objectKey}`)

        // Create customized ISO8601 date.
        const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "")

        // Create headers.
        const headers = new Headers()
        headers.set("host", targetUrl.host)
        headers.set("x-amz-date", amzDate)

        // Set session token.
        if (this.#sessionToken !== undefined) {
            headers.set("x-amz-security-token", this.#sessionToken)
        }

        // Set content type.
        if (options?.contentType !== undefined) {
            headers.set("Content-Type", options.contentType)
        }

        // Set meta headers.
        if (options?.meta !== undefined) {
            for (const [metaKey, metaValue] of Object.entries(options.meta)) {
                headers.set(`x-amz-meta-${metaKey.toLowerCase()}`, metaValue)
            }
        }

        // Set content hash.
        const contentHash = await hashsum(await toArrayBuffer(body ?? ""))
        headers.set("x-amz-content-sha256", contentHash)

        // Get canonical query string.
        const queryParams = new URLSearchParams(targetUrl.search)
        const sortedQueryKeys = Array.from(queryParams.keys()).sort()
        const canonicalQueryStringParts: string[] = []
        for (const queryKey of sortedQueryKeys) {
            const values = queryParams.getAll(queryKey).sort()
            for (const value of values) {
                canonicalQueryStringParts.push(`${encodeURIComponent(queryKey)}=${encodeURIComponent(value)}`)
            }
        }
        const canonicalQueryString = canonicalQueryStringParts.join("&")

        // Get signed headers.
        const headerEntries: [string, string][] = []
        headers.forEach((value, key) => {
            headerEntries.push([key.toLowerCase(), value.trim()])
        })
        headerEntries.sort((a, b) => a[0].localeCompare(b[0]))
        const signedHeadersString = headerEntries.map(([k]) => k).join(";")

        // Create canonical request.
        const canonicalRequest = [
            method,
            targetUrl.pathname,
            canonicalQueryString,
            headerEntries.map(([k, v]) => `${k}:${v}`).join("\n"), // + "\n", // これ空白に置き換えても動くはず
            "",
            signedHeadersString,
            contentHash
        ].join("\n")

        // Create sign payload.
        const dateStamp = amzDate.substring(0, 8)
        const service = "s3"
        const scope = [dateStamp, this.#region, service, "aws4_request"].join("/")
        const signPayload = [
            "AWS4-HMAC-SHA256",
            amzDate,
            scope,
            await hashsum(await toArrayBuffer(canonicalRequest))
        ].join("\n")

        // Create signature.
        const kSecret = await toArrayBuffer("AWS4" + this.#secretKey)
        const kDate = await genhmac(kSecret, dateStamp)
        const kRegion = await genhmac(kDate, this.#region)
        const kService = await genhmac(kRegion, service)
        const signKey = await genhmac(kService, "aws4_request")
        const signature = toHexString(await genhmac(signKey, signPayload))

        // Create credentials.
        const creadentials = [
            `Credential=${this.#accessKey}/${scope}`,
            `SignedHeaders=${signedHeadersString}`,
            `Signature=${signature}`
        ].join(", ")
        headers.set("Authorization", `AWS4-HMAC-SHA256 ${creadentials}`)

        // Default headers.
        this.#headers.forEach((value, key) => headers.set(key, value))

        // Custom headers
        if (options?.customHeaders !== undefined) {
            (new Headers(options.customHeaders)).forEach((val, k) => headers.set(k, val))
        }

        // Request.
        return fetch(targetUrl.toString(), {
            method,
            headers,
            body,
            signal: options?.signal,
        })
    }

    async put(key: string, content: PutBody, options?: PutObjectOptions): Promise<Response> {
        let contentType = options?.contentType
        if (contentType === undefined) {
            if (typeof content === "string") {
                contentType = "text/plain"
            } else if (content instanceof Blob && content.type) {
                contentType = content.type
            } else {
                contentType = "application/octet-stream"
            }
        }

        return this.#signedRequest(
            "PUT",
            key,
            content,
            {
                ...options,
                contentType,
            }
        )
    }

    async get(key: string, options?: RequestOptions): Promise<Response> {
        return this.#signedRequest("GET", key, undefined, options)
    }

    async delete(key: string, options?: RequestOptions): Promise<Response> {
        return this.#signedRequest("DELETE", key, undefined, options)
    }

    // 将来的な拡張:
    // async list(prefix?: string, options?: T4RequestOptions): Promise<YourListResponseType> {
    //   const queryParams = new URLSearchParams();
    //   if (prefix) queryParams.set("prefix", prefix);
    //   queryParams.set("list-type", "2"); // ListObjectsV2
    //
    //   const response = await this._signedRequest("GET", "", undefined, { ...options, queryParams });
    //   const xmlText = await response.text();
    //   // TODO: XMLをパースして適切な型に変換
    //   // return parsedXml;
    //   throw new Error("List method not fully implemented yet.");
    // }
}

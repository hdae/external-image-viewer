export const toHexString = (buffer: ArrayBuffer) =>
    [...new Uint8Array(buffer)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")

export const toArrayBuffer = async (data: string | Blob | ArrayBuffer | Uint8Array): Promise<ArrayBuffer> => {

    if (data instanceof ArrayBuffer)
        return data

    if (data instanceof Blob)
        return await data.arrayBuffer()

    if (typeof data === "string")
        return toArrayBuffer(new TextEncoder().encode(data))

    if (data instanceof Uint8Array) {
        if (
            data.byteOffset === 0 &&
            data.byteLength === data.buffer.byteLength &&
            data.buffer instanceof ArrayBuffer
        ) {
            return data.buffer
        }
        return data.slice().buffer
    }

    throw new Error("Unsupported data type")
}

export const genhmac = async (key: ArrayBuffer, data: string, algorithm = "SHA-256"): Promise<ArrayBuffer> =>
    crypto.subtle.sign(
        "HMAC",
        await crypto.subtle.importKey(
            "raw",
            key,
            { name: "HMAC", hash: algorithm },
            false,
            ["sign"]
        ),
        new TextEncoder().encode(data)
    )

export const hashsum = async (data: ArrayBuffer, algorithm = "SHA-256"): Promise<string> =>
    toHexString(await crypto.subtle.digest(algorithm, data))

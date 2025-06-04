import type { Metadata } from "../types.ts"

const MAGIC = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])

export type Chunk = {
    type: string
    payload: Uint8Array
}

export function parse_png(data: Uint8Array): Chunk[] {
    // Return value
    const chunks = []

    // Pointer
    let ptr = 0

    // Check signature.
    if (MAGIC.some((v) => v !== data[ptr++])) throw new Error("ERROR: invalid signature")

    // Value converter.
    const u8 = new Uint8Array(4)
    const u32 = new Uint32Array(u8.buffer)

    // Check has IHDR chunk
    let hasIHDR = false

    // Read and shift 32bit
    const read32 = (invert = false) => {
        const order = [3, 2, 1, 0]
        if (invert) order.reverse()
        order.forEach(index => u8[index] = data[ptr++])
    }

    // Read content.
    while (ptr < data.length) {

        // Get data length
        read32()
        const length = u32[0]

        // Get data type
        read32(true)
        const type = String.fromCharCode(...u8)

        // Check IHDR
        if (!hasIHDR) {
            if (type !== "IHDR") throw new Error("ERROR: missing IHDR")
            hasIHDR = true
        }

        // Check IEND
        if (type === "IEND")
            break

        // MEMO: Only reqiured.
        if (!["IHDR", "iTXt", "tEXt"].includes(type)) {
            ptr += length
            continue
        }

        // Read payload
        const payload = data.slice(ptr, ptr += length)
        chunks.push({ type, payload })

        // TODO: Check CRC
        read32(false)
    }

    return chunks
}

export const get_metadata = (buffer: ArrayBuffer) => {
    const chunks = parse_png(new Uint8Array(buffer))

    // Parse IHDR.
    const ihdr = chunks.find((chunk) => chunk.type === "IHDR")?.payload
    if (ihdr === undefined)
        throw new Error("Failed to parse png.")

    // Get width and height.
    const ihdr_view = new DataView(ihdr.buffer)
    const width = ihdr_view.getUint32(0)
    const height = ihdr_view.getUint32(4)

    // Simple metadata
    const metadata: Metadata = {
        width,
        height
    }

    // Case: Pnginfo not found.
    const itxt = chunks.find((chunk) => chunk.type === "tEXt" || chunk.type === "iTXt")?.payload
    if (itxt === undefined) {
        return metadata
    }

    // Case: Assertion failed.
    const decoder = new TextDecoder("utf8")
    const raw = decoder.decode(itxt)
    if (!raw.startsWith("parameters\x00")) {
        return metadata
    }

    // Setup metadata object
    metadata.positive = []
    metadata.negative = []
    metadata.param = []
    metadata.text = raw
        .split("\x00")
        .flatMap(item => item.split("\n"))
        .filter((item) => item !== "")

    let neg_flag = false
    for (const [index, line] of metadata.text.entries()) {

        // Ignore first line.
        if (index === 0) {
            continue
        }

        // Get param data.
        if (index === metadata.text.length - 1) {
            metadata.param.push(...line.split(", "))
            continue
        }

        // Get negative header.
        if (line.startsWith("Negative prompt: ")) {
            neg_flag = true
            metadata.negative.push(line.slice("Negative prompt: ".length))
            continue
        }

        // Push to array.
        if (neg_flag) {
            metadata.negative.push(line)
        } else {
            metadata.positive.push(line)
        }
    }

    return metadata
}

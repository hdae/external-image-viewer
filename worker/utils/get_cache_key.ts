export const get_cache_key = (hash: string, request: Request) => {
    const url = new URL(request.url)
    url.pathname = `/image/${hash}`
    return url.toString()
}

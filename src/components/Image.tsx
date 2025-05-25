import { Box } from "@radix-ui/themes"
import { useEffect, useState, type FC } from "react"
import { getRawUrl, getThumbsUrl } from "../utils/url"

export const ImagePreview: FC<{
    hash: string,
    width: number,
    height: number
}> = ({ hash, width, height }) => {
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        setLoaded(false)
    }, [hash])

    return (
        <Box
            width="100%"
            height="100%"
            minHeight="60vh"
            position="relative"
        >
            <img
                src={getThumbsUrl(hash)}
                alt="サムネイル"
                width={width}
                height={height}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                }}
            />
            <img
                src={getRawUrl(hash)}
                alt="画像"
                width={width}
                height={height}
                onLoad={() => setLoaded(true)}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    opacity: loaded ? 1 : 0,
                }}
            />
        </Box>
    )
}

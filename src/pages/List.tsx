import { ArrowLeftIcon, ArrowRightIcon, DoubleArrowLeftIcon, DoubleArrowRightIcon } from "@radix-ui/react-icons"
import { Flex, IconButton, Text } from "@radix-ui/themes"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { z } from "zod"
import { api_config } from "../../worker/config"
import { client } from "../client"
import { getThumbsUrl } from "../utils/url"
import { ImageDialog } from "./ImageDialog"

const paramSchema = z.object({
    bucket_id: z.coerce.number(),
    page: z.coerce.number(),
})

export const List = () => {
    const param = useParams()
    const { bucket_id, page } = useMemo(() => paramSchema.parse(param), [param])

    const { data, isLoading, refetch } = useQuery({
        queryKey: [bucket_id, page],
        queryFn: () => client.api.buckets[":bucket_id"][":page"]
            .$get({ param: { bucket_id: `${bucket_id}`, page: `${page}` } })
            .then(req => req.json())
    })

    const navigate = useNavigate()
    if (page === undefined) {
        navigate(`/${bucket_id}/0`)
    }

    const isLast = (data?.total ?? 0) <= (page + 1) * api_config.list_limit

    const [currentIndex, setCurrentIndex] = useState<number>()
    const current = currentIndex === undefined
        ? currentIndex
        : data?.images.at(currentIndex)


    const prev = useCallback(() => navigate(`/${bucket_id}/${page - 1}`), [bucket_id, navigate, page])
    const next = useCallback(() => navigate(`/${bucket_id}/${page + 1}`), [bucket_id, navigate, page])

    const first = useCallback(() => navigate(`/${bucket_id}/0`), [bucket_id, navigate])
    const last = useCallback(() => navigate(`/${bucket_id}/${Math.floor((data?.total ?? 0) / api_config.list_limit)}`), [navigate, bucket_id, data?.total])

    const onKeyDown = useCallback((ev: KeyboardEvent) => {
        // Ignore when open dialog.
        if (current !== undefined) return
        if (ev.key == "ArrowLeft") prev()
        if (ev.key == "ArrowRight") next()
    }, [current, next, prev])

    useEffect(() => {
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [onKeyDown])

    useEffect(() => {
        if (data === undefined) return
        if (data.images.length >= api_config.list_limit) {
            const id = setInterval(() => {
                refetch()
            }, 30000)
            return () => clearInterval(id)
        } else {
            const id = setInterval(() => {
                refetch()
            }, 5000)
            return () => clearInterval(id)
        }
    }, [data, refetch])

    return (
        <>
            <Flex
                direction="row"
                align="center"
                justify="between"
                gap="4"
            >
                <IconButton
                    size="3"
                    onClick={first}
                    disabled={page <= 0}
                >
                    <DoubleArrowLeftIcon width={20} height={20} />
                </IconButton>
                <IconButton
                    size="3"
                    onClick={prev}
                    disabled={page <= 0}
                >
                    <ArrowLeftIcon width={20} height={20} />
                </IconButton>
                <Flex
                    direction="row"
                    flexGrow="1"
                    flexShrink="1"
                    flexBasis="0"
                    justify="center"
                >
                    {data !== undefined && (
                        <Text>
                            Page {page + 1}
                            ({(page) * api_config.list_limit + 1} ~ {Math.min(
                                (page + 1) * api_config.list_limit,
                                data.total ?? 0
                            )}), {data.total} total.
                        </Text>
                    )}
                </Flex>
                <IconButton
                    size="3"
                    onClick={next}
                    disabled={isLast}
                >
                    <ArrowRightIcon width={20} height={20} />
                </IconButton>
                <IconButton
                    size="3"
                    onClick={last}
                    disabled={isLast}
                >
                    <DoubleArrowRightIcon width={20} height={20} />
                </IconButton>
            </Flex>
            {isLoading && (
                <>
                    Loading...
                </>
            )}
            {data !== undefined && (
                <Flex
                    direction="row"
                    justify="center"
                    gap="2"
                    wrap="wrap"
                >
                    {data.images.map(({ hash, metadata }, index) => (
                        <img
                            key={index}
                            src={getThumbsUrl(hash)}
                            style={{
                                width: "auto",
                                height: 160,
                                aspectRatio: metadata.width / metadata.height,
                                borderRadius: "var(--radius-2)",
                            }}
                            onClick={() => setCurrentIndex(index)}
                        />
                    ))}
                </Flex>
            )}
            {data !== undefined && current !== undefined && (
                <ImageDialog image={current} setCurrentIndex={setCurrentIndex} max={data.images.length} />
            )}
        </>
    )
}

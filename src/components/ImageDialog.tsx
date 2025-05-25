import { CopyIcon, Cross1Icon, DownloadIcon, OpenInNewWindowIcon } from "@radix-ui/react-icons"
import { Badge, DataList, Dialog, Flex, IconButton, ScrollArea, Tooltip } from "@radix-ui/themes"
// import { Dialog } from "radix-ui"
import { useCallback, useEffect, useMemo, type Dispatch, type FC, type RefCallback, type SetStateAction } from "react"
import { toast } from "react-hot-toast"
import { useSwipeable } from "react-swipeable"
import type { Metadata } from "../../worker/types"
import { getDownloadUrl, getRawUrl } from "../utils/url"

type Props = {
    image: {
        id: number
        hash: string
        ip: string
        metadata: Metadata
        created_at: string
        bucket_id: number | null
    }
    setCurrentIndex: Dispatch<SetStateAction<number | undefined>>
    total: number
}

export const ImageDialog: FC<Props> = ({ image, setCurrentIndex, total }) => {

    const newtab = useCallback(() => { }, [])
    const download = useCallback(() => window.open(getDownloadUrl(image.hash)), [image.hash])

    const close = useCallback(
        () => setCurrentIndex(undefined),
        [setCurrentIndex]
    )

    const prev = useCallback(() =>
        setCurrentIndex(index => (
            index === undefined || index === 0
                ? index
                : index - 1
        )),
        [setCurrentIndex]
    )

    const next = useCallback(() =>
        setCurrentIndex(index => (
            index === undefined || index >= total - 1
                ? index
                : index + 1
        )),
        [total, setCurrentIndex]
    )

    const onKeyDown = useCallback((ev: KeyboardEvent) => {
        if (ev.key == "ArrowLeft") prev()
        if (ev.key == "ArrowRight") next()
    }, [next, prev])

    const { ref } = useSwipeable({
        onSwipedLeft: next,
        onSwipedRight: prev,
        trackMouse: false,
        trackTouch: true,
    }) as { ref: RefCallback<Document | undefined> }

    useEffect(() => {
        ref(document)
        return () => {
            ref(undefined)
        }
    }, [ref])

    useEffect(() => {
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [onKeyDown])

    return (
        <Dialog.Root
            open
            onOpenChange={close}
        >
            <Dialog.Content
                asChild
                style={{
                    position: "relative",
                    width: "100vw",
                    height: "100vh",
                    maxWidth: "calc(100vw - var(--space-6) * 2)",
                    maxHeight: "calc(100vh - var(--space-6) - max(var(--space-6), 6vh))",
                }}
            >
                {/* <ScrollArea type="scroll" scrollbars="vertical"> */}
                <Flex
                    direction="row"
                    gap="5"
                >
                    <Dialog.Title hidden>
                        Image Preview
                    </Dialog.Title>
                    <Flex
                        flexGrow="2"
                        flexShrink="2"
                        flexBasis="0"
                        align="center"
                        justify="center"
                    >
                        <img
                            src={getRawUrl(image.hash)}
                            style={{
                                height: "100%",
                                width: "100%",
                                objectFit: "contain",
                            }}
                        />
                    </Flex>
                    <Flex
                        flexGrow="1"
                        flexShrink="1"
                        flexBasis="0"
                        maxWidth="480px"
                        direction="column"
                        gap="4"
                        pt="8"
                        asChild
                    >
                        <ScrollArea type="hover" scrollbars="vertical">
                            <MetadataList metadata={image.metadata} />
                        </ScrollArea>
                    </Flex>
                    <Flex
                        position="absolute"
                        top="5"
                        right="6"
                        direction="row"
                        justify="end"
                        gap="4"
                    >
                        <Tooltip content="Open in Tab">
                            <IconButton onClick={newtab}>
                                <OpenInNewWindowIcon width="20" height="20" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip content="Download">
                            <IconButton onClick={download}>
                                <DownloadIcon width="20" height="20" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip content="Close">
                            <IconButton onClick={close}>
                                <Cross1Icon width="20" height="20" />
                            </IconButton>
                        </Tooltip>
                    </Flex>
                </Flex>
                {/* </ScrollArea> */}
            </Dialog.Content>
        </Dialog.Root>
    )
}

export const MetadataList: FC<{ metadata: Metadata }> = ({ metadata }) => {
    return (
        <DataList.Root orientation="vertical">
            <DataList.Item>
                <DataList.Label minWidth="88px">
                    <Flex
                        direction="row"
                        gap="2"
                        align="center"
                    >
                        Positive
                        <CopyButton prompts={metadata.positive} />
                    </Flex>
                </DataList.Label>
                <DataList.Value>
                    <Flex
                        direction="column"
                        gap="1"
                    >
                        {metadata.positive?.map(line => (
                            <RenderTags tags={line} />
                        ))}
                    </Flex>
                </DataList.Value>
            </DataList.Item>
            <DataList.Item>
                <DataList.Label minWidth="88px">
                    <Flex
                        direction="row"
                        gap="2"
                        align="center"
                    >
                        Negative
                        <CopyButton prompts={metadata.negative} />
                    </Flex>
                </DataList.Label>
                <DataList.Value>
                    <Flex
                        direction="column"
                        gap="1"
                    >
                        {metadata.negative?.map(line => (
                            <RenderTags tags={line} />
                        ))}
                    </Flex>
                </DataList.Value>
            </DataList.Item>
            {metadata.param?.map(param => {
                const [key, value] = param.split(": ")
                return (
                    <DataList.Item key={key}>
                        <DataList.Label minWidth="88px">
                            <Flex
                                direction="row"
                                gap="2"
                                align="center"
                            >
                                {key}
                            </Flex>
                        </DataList.Label>
                        <DataList.Value>
                            {value}
                        </DataList.Value>
                    </DataList.Item>
                )
            })}
        </DataList.Root>
    )
}

const copyToClipboard = (text: string) => {
    toast.promise(navigator.clipboard.writeText(text), {
        loading: "Copying",
        error: "Copy failed",
        success: "Copied"
    })
}

const RenderTags: FC<{ tags: string }> = ({ tags }) => {
    const children = useMemo(() => tags
        .split(",")
        .map(v => v.trim())
        .filter(v => v !== "").map(token => (
            <Badge
                color={token === "BREAK" ? "red" : undefined}
                size="2"
            >
                {token}
            </Badge>
        )),
        [tags]
    )

    return (
        <Flex
            direction="row"
            gap="1"
            wrap="wrap"
        >
            {children}
        </Flex>
    )
}

const CopyButton: FC<{ prompts: string[] | undefined }> = ({ prompts }) => (
    <Tooltip
        content="Copy"
    >
        <IconButton
            size="1"
            color="gray"
            variant="ghost"
            onClick={() => prompts !== undefined && copyToClipboard(prompts.join("\n"))}
            disabled={prompts === undefined}
        >
            <CopyIcon />
        </IconButton>
    </Tooltip>
)

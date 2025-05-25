import { Cross1Icon, DownloadIcon, OpenInNewWindowIcon } from "@radix-ui/react-icons"
import { Dialog, Flex, IconButton, ScrollArea, Tooltip } from "@radix-ui/themes"
import { useCallback, useEffect, type Dispatch, type FC, type RefCallback, type SetStateAction } from "react"
import { useSwipeable } from "react-swipeable"
import type { Metadata } from "../../worker/types"
import { getDownloadUrl, getRawUrl } from "../utils/url"
import { MetadataList } from "./MetadataList"

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

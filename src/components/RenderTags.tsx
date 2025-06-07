import { Badge, Flex, Tooltip } from "@radix-ui/themes"
import { type FC, useMemo } from "react"
import { parseStableDiffusionPrompt, type PromptToken } from "../utils/parsePrompt"

const ellipsis =
    (str: string) => str.length > 35
        ? `${str.slice(0, 32)}...`
        : str

const styles = {
    maxWidth: "240px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "inline-block",
    textDecoration: "none",
}

const RenderGroup: FC<{ content: PromptToken[], weight?: number }> = ({ content, weight }) => (
    <Flex
        width="100%"
        wrap="wrap"
        asChild
        p="2"
    >
        <Badge
            color="gray"
            size="2"
        >
            {content.map((item, index) => <RenderToken key={index} item={item} />)}
            {(weight ?? 1) !== 1 && (
                <Badge
                    color="orange"
                    size="2"
                >
                    × {Math.round(weight! * 100) / 100}
                </Badge>
            )}
        </Badge>
    </Flex>
)

const RenderTag: FC<{ content: string }> = ({ content }) => (
    <Flex
        maxWidth="100%"
    >
        <Tooltip content={content}>
            <Badge
                asChild
                color="blue"
                size="2"
                style={styles}
            >
                <a
                    href={`https://hdae.github.io/page-danbooru-tag-explorer/?q=${content.replaceAll("\\", "").replaceAll(" ", "_")}`}
                    target="_blank"
                >
                    {ellipsis(content)}
                </a>
            </Badge>
        </Tooltip>
    </Flex>
)

const RenderBreak: FC<{ content: string }> = ({ content }) => (
    <Badge
        color="red"
        size="2"
        style={{
            textAlign: "center",
            width: "100%",
        }}
    >
        {content}
    </Badge>
)

const RenderLora: FC<{ content: string, weight?: number }> = ({ content, weight }) =>
    (weight ?? 1) === 1 ? (
        <Tooltip content={content}>
            <Badge
                color="yellow"
                size="2"
                style={styles}
            >
                LoRA: {ellipsis(content)}
                {(weight ?? 1) !== 1 && (
                    <Badge color="amber">
                        × {Math.round(weight! * 100) / 100}
                    </Badge>
                )}
            </Badge>
        </Tooltip>
    ) : (
        <Flex
            width="100%"
            wrap="wrap"
            asChild
            p="2"
        >
            <Badge
                color="gray"
                size="2"
            >
                <Tooltip content={content}>
                    <Badge
                        color="yellow"
                        size="2"
                        style={styles}
                    >
                        LoRA: {ellipsis(content)}
                    </Badge>
                </Tooltip>
                {(weight ?? 1) !== 1 && (
                    <Badge
                        color="orange"
                        size="2"
                    >
                        × {Math.round(weight! * 100) / 100}
                    </Badge>
                )}
            </Badge>
        </Flex>
    )

const RenderToken: FC<{ item: PromptToken }> = ({ item }) => {
    switch (item.type) {
        case "group":
            return (
                <RenderGroup
                    content={item.content}
                    weight={item.weight}
                />
            )
        case "tag":
            return (
                <RenderTag
                    content={item.content}
                />
            )
        case "break":
            return (
                <RenderBreak
                    content={item.content}
                />
            )
        case "lora":
            return (
                <RenderLora
                    content={item.content}
                    weight={item.weight}
                />
            )
    }
}

export const RenderTags: FC<{ prompt: string }> = ({ prompt }) => useMemo(
    () => (
        <Flex
            direction="row"
            gap="1"
            wrap="wrap"
            onClick={() => {
                console.log(prompt)
                console.log(parseStableDiffusionPrompt(prompt))
            }}
        >
            {parseStableDiffusionPrompt(prompt).map(section => section.map((item, index) => <RenderToken key={index} item={item} />))}
        </Flex>
    ),
    [prompt]
)

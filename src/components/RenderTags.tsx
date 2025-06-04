import { Badge, Flex, Tooltip } from "@radix-ui/themes"
import { type FC, useMemo } from "react"

const BadgeSelector: FC<{ token: string }> = ({ token }) => {

    const styles = useMemo(() => ({
        maxWidth: "240px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        display: "inline-block",
        textDecoration: "none",
    }), [])

    if (token === "BREAK") {
        return (
            <Badge
                asChild
                color="red"
                size="2"
                style={styles}
            >
                {token}
            </Badge>
        )
    }


    return (
        <Badge
            asChild
            // color={}
            size="2"
            style={styles}
        >
            <a
                href={`https://hdae.github.io/page-danbooru-tag-explorer/?q=${token}`}
                target="_blank"
            >
                {token}
            </a>
        </Badge>
    )
}

export const RenderTags: FC<{ tags: string }> = ({ tags }) => {
    const children = useMemo(() => tags
        .split(",")
        .map(v => v.trim())
        .filter(v => v !== "").map((token, index) => (
            <Tooltip content={token}>
                <BadgeSelector key={index} token={token} />
            </Tooltip>
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

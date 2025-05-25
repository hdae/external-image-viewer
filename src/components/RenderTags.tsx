import { Badge, Flex } from "@radix-ui/themes"
import { type FC, useMemo } from "react"

export const RenderTags: FC<{ tags: string }> = ({ tags }) => {
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

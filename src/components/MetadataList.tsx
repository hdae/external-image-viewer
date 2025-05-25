import { DataList, Flex } from "@radix-ui/themes"
import { type FC } from "react"
import type { Metadata } from "../../worker/types"
import { CopyButton } from "./CopyButton"
import { RenderTags } from "./RenderTags"

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

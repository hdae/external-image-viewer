import { Box, Card, Flex, Text } from "@radix-ui/themes"
import { useQuery } from "@tanstack/react-query"
import { NavLink } from "react-router"
import { client } from "../client"

export const Home = () => {
    const buckets = useQuery({
        queryKey: ["buckets"],
        queryFn: () => client.api.buckets
            .$get()
            .then((res) => res.json())
    })

    if (buckets.isLoading) {
        return (
            <>
                Loading...
            </>
        )
    }

    return (
        buckets.data?.buckets?.map((bucket) => (
            <NavLink
                key={bucket.id}
                to={`/${bucket.id}/0`}
                style={{
                    textDecoration: "none",
                    color: "var(--gray-12)",
                }}
            >
                <Card>
                    <Flex
                        direction="column"
                        gap="3"
                    >
                        <Box>
                            <Text as="div" size="2" weight="bold">
                                {bucket.title}
                            </Text>
                            <Text as="div" size="2" color="gray">
                                {bucket.description}
                            </Text>
                        </Box>
                    </Flex>
                </Card>
            </NavLink>
        ))
    )
}

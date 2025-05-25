import { Flex, Heading, ScrollArea } from "@radix-ui/themes"
import { Link, Route, Routes } from "react-router"
import { Home } from "./pages/Home"
import { List } from "./pages/List"

export const App = () => (
    <ScrollArea
        type="auto"
        scrollbars="vertical"
        style={{ height: "100%" }}
    >
        <Flex
            p="4"
            direction="column"
            gap="2"
        >
            <Flex
                direction="row"
                justify="center"
            >
                <Heading asChild size="6">
                    <Link
                        to="/"
                        style={{ color: "var(--gray-12)", textDecoration: "none" }}
                    >
                        External Image Browser
                    </Link>
                </Heading>
            </Flex>
            <Flex
                direction="column"
                wrap="wrap"
                gap="4"
            >
                <Routes>
                    <Route index element={<Home />} />
                    <Route path="/:bucket_id" element={<List />} />
                    <Route path="/:bucket_id/:page" element={<List />} />
                </Routes>
            </Flex>
        </Flex>
    </ScrollArea>
)

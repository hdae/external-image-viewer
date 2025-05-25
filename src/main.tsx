import "ress/dist/ress.min.css"

import "./main.css"

import "@radix-ui/themes/styles.css"

import { Box, Portal, Theme } from "@radix-ui/themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Toaster } from "react-hot-toast"
import { BrowserRouter } from "react-router"
import { App } from "./App"

const root = document.getElementById("root")
if (root === null) throw new Error("Failed to initialize application.")

const client = new QueryClient()

createRoot(root).render(
    <StrictMode>
        <BrowserRouter>
            <QueryClientProvider client={client}>
                <Theme
                    asChild
                    appearance="dark"
                    grayColor="slate"
                    accentColor="blue"
                >
                    <Box width="100%" height="100%">
                        <App />
                        <Portal>
                            <Toaster />
                        </Portal>
                    </Box>
                </Theme>
            </QueryClientProvider>
        </BrowserRouter>
    </StrictMode>
)

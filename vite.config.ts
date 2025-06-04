import { cloudflare } from "@cloudflare/vite-plugin"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {

  console.log(mode)

  if (mode === "development") {
    return {
      plugins: [
        react({
          babel: {
            plugins: [
              "babel-plugin-react-compiler"
            ]
          }
        })
      ],
      server: {
        proxy: {
          "/api": "https://viewer.kokoya.de/"
        }
      }
    }
  }

  return {
    plugins: [
      react({
        babel: {
          plugins: [
            "babel-plugin-react-compiler"
          ]
        }
      }),
      cloudflare()
    ]
  }
})

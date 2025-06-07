import { cloudflare } from "@cloudflare/vite-plugin"
import react from "@vitejs/plugin-react"
import { resolve } from 'path'
import LicensePlugin from "rollup-plugin-license"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {

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
      LicensePlugin({
        thirdParty: {
          output: resolve(__dirname, "dist", "LICENSE.txt")
        }
      }),
      cloudflare()
    ]
  }
})

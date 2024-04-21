import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"
import fs from "vite-plugin-fs";

export default defineConfig({
  server: {
    hmr: false,
  },
	plugins: [
    fs(),
    viteSingleFile()
  ]
})

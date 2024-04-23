import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"
import fs from "vite-plugin-fs";

export default defineConfig(({command}) => {
  if (command === 'serve') {
    return {
      server: {
        hmr: false,
      },
      plugins: [
        fs()
      ]
    };
  } else {
    return {
      plugins: [
        viteSingleFile()
      ]
    };  
  }
});

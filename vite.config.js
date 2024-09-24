import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'vite-plugin-fs';

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    return {
      server: {
        hmr: false,
        host: '127.0.0.1'
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

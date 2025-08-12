import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { spawn } from 'node:child_process';

function toolServerPlugin() {
  let child;
  return {
    name: 'tool-server-runner',
    apply: 'serve',
    configureServer(server) {
      if (child) return;
      const cmd = process.env.TOOL_SERVER_CMD || 'node';
      const args = process.env.TOOL_SERVER_ARGS?.split(' ') || [
        'tool_server/src/server.js'
      ];
      child = spawn(cmd, args, {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: { ...process.env },
        detached: process.platform !== 'win32'
      });

      const stop = (signal = 'SIGINT') => {
        if (!child) return;
        const pid = child.pid;
        try {
          if (process.platform !== 'win32' && pid) {
            process.kill(-pid, signal);
          } else {
            child.kill(signal);
          }
        } catch {}

        const guard = setTimeout(() => {
          try {
            if (process.platform !== 'win32' && pid)
              process.kill(-pid, 'SIGKILL');
            else child.kill('SIGKILL');
          } catch {}
        }, 3000);
        guard.unref?.();

        child = undefined;
      };

      child.on('exit', (code, signal) => {
        console.log(
          `[tool_server] exited with code ${code} ${signal ? `(signal ${signal})` : ''}`
        );
      });
      child.on('error', (err) => {
        console.error('[tool_server] failed to start:', err);
      });

      server.httpServer?.once('close', () => stop('SIGINT'));
      process.once('SIGINT', () => stop('SIGINT'));
      process.once('SIGTERM', () => stop('SIGINT'));
      process.once('beforeExit', () => stop('SIGINT'));
      process.once('exit', () => stop('SIGINT'));
    }
  };
}

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    return {
      server: {
        hmr: false,
        host: '127.0.0.1',
        open: true
      },
      plugins: [toolServerPlugin()]
    };
  } else {
    return {
      plugins: [viteSingleFile()]
    };
  }
});

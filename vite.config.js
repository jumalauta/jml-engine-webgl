import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { spawn } from 'node:child_process';

function toolServerPlugin() {
  let child;
  return {
    name: 'tool-server-runner',
    apply: 'serve',
    configureServer(server) {
      return new Promise((resolve, reject) => {
        if (child) {
          resolve();
          return;
        }

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
          if (!child) {
            return;
          }
          const pid = child.pid;
          try {
            if (process.platform !== 'win32' && pid) {
              process.kill(-pid, signal);
            } else {
              child.kill(signal);
            }
          } catch (err) {
            console.error('[tool_server] error killing process:', err);
          }

          const guard = setTimeout(() => {
            try {
              if (process.platform !== 'win32' && pid) {
                process.kill(-pid, 'SIGKILL');
              } else {
                child.kill('SIGKILL');
              }
            } catch (err) {
              console.error('[tool_server] error killing process:', err);
            }
          }, 3000);
          guard.unref();

          child = undefined;
        };

        const startupTimeout = setTimeout(() => {
          console.error('[tool_server] startup timeout - assuming failure');
          stop('SIGTERM');
          reject(new Error('Tool server failed to start within timeout'));
        }, 10000);

        const startupExitHandler = (code, signal) => {
          clearTimeout(startupTimeout);
          console.log(
            `[tool_server] exited during startup with code ${code} ${signal ? `(signal ${signal})` : ''}`
          );

          if (code !== 0 && code !== null) {
            reject(
              new Error(`Tool server failed to start: exited with code ${code}`)
            );
          }
        };

        child.once('exit', startupExitHandler);

        child.on('spawn', () => {
          console.log('[tool_server] started successfully');
          clearTimeout(startupTimeout);

          child.removeListener('exit', startupExitHandler);

          child.on('exit', (code, signal) => {
            console.log(
              `[tool_server] exited with code ${code} ${signal ? `(signal ${signal})` : ''}`
            );

            if (code !== 0 && code !== null && !signal) {
              console.error(
                '[tool_server] unexpected exit - shutting down Vite'
              );
              server.close();
              process.exit(1);
            } else if (signal === 'SIGTERM' || signal === 'SIGINT') {
              console.log('[tool_server] graceful shutdown - stopping Vite');
              server.close();
            }
          });

          resolve();
        });

        server.httpServer?.once('close', () => stop('SIGINT'));
        process.once('SIGINT', () => stop('SIGINT'));
        process.once('SIGTERM', () => stop('SIGINT'));
        process.once('beforeExit', () => stop('SIGINT'));
        process.once('exit', () => stop('SIGINT'));
      });
    }
  };
}

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    return {
      server: {
        hmr: false,
        host: '127.0.0.1',
        open: true,
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
          'Surrogate-Control': 'no-store'
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: undefined
          }
        }
      },
      optimizeDeps: {
        force: true
      },
      plugins: [toolServerPlugin()]
    };
  } else {
    return {
      plugins: [viteSingleFile()]
    };
  }
});

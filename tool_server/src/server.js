import { WebSocketServer } from 'ws';
import { pino } from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { createTwoFilesPatch } from 'diff';
import { handleCaptureMessage } from './VideoExporter.js';
import { stopFileWatch, handleFileSystemMessage } from './FileSystem.js';

const createJsonRpcResponse = (id, result) => ({
  jsonrpc: '2.0',
  id,
  result
});

const createJsonRpcError = (id, code, message, data = null) => ({
  jsonrpc: '2.0',
  id,
  error: {
    code,
    message,
    ...(data && { data })
  }
});

const createJsonRpcNotification = (method, params = null) => ({
  jsonrpc: '2.0',
  method,
  ...(params && { params })
});

const server = async function () {
  const logger = pino();
  const port = 7447;
  const wss = new WebSocketServer({ port });

  wss.on('listening', () => {
    logger.info(`Tool server started in port ${port}`);
  });

  wss.on('error', (err) => {
    logger.error(`Tool server WebSocket error: ${err.message}`);
    process.exit(1);
  });

  wss.on('connection', (ws) => {
    ws.state = { id: uuidv4() };

    ws.logger = logger.child({ id: ws.state.id });

    ws.logger.info('Tool client connected');

    ws.sendJsonRpc = (msg) => {
      ws.send(JSON.stringify(msg));
    };

    ws.sendResponse = (id, result) => {
      ws.sendJsonRpc(createJsonRpcResponse(id, result));
    };

    ws.sendError = (id, code, message, data = null) => {
      ws.sendJsonRpc(createJsonRpcError(id, code, message, data));
    };

    ws.sendNotification = (method, params = null) => {
      ws.sendJsonRpc(createJsonRpcNotification(method, params));
    };

    ws.on('close', () => {
      ws.logger.info('Tool client disconnected');
      stopFileWatch(ws);
    });
    ws.on('message', async (data) => {
      let msg;
      try {
        msg = JSON.parse(data);

        if (msg.jsonrpc !== '2.0') {
          ws.sendError(
            msg.id || null,
            -32600,
            'Invalid Request',
            'Missing or invalid jsonrpc version'
          );
          return;
        }

        const { method, params, id } = msg;

        if (!method) {
          ws.sendError(id || null, -32600, 'Invalid Request', 'Missing method');
          return;
        }

        if (method === 'connect' && !ws.state.connected) {
          ws.sendNotification('hello');
          ws.state.connected = true;
          return;
        }

        if (!ws.state.connected && method !== 'connect') {
          ws.sendError(id || null, -32002, 'Server Error', 'Not connected');
          return;
        }

        if (method === 'init') {
          ws.logger.child({ params }).info('Init message');
          ws.state.init = params;
          if (id !== undefined) {
            ws.sendResponse(id, { status: 'initialized' });
          }
        } else if (method === 'settings') {
          if (!params || !params.settings) {
            ws.sendError(
              id || null,
              -32602,
              'Invalid params',
              'Settings missing'
            );
            return;
          }

          const settingsHumanReadable = JSON.stringify(
            params.settings,
            null,
            2
          );
          if (ws.state.oldSettings === settingsHumanReadable) {
            // settings did not change
            return;
          }

          if (ws.state.oldSettings) {
            const patch = createTwoFilesPatch(
              '', // old file name
              '', // new file name
              ws.state.oldSettings,
              settingsHumanReadable,
              '', // old file header
              '', // new file header
              {
                ignoreWhitespace: true,
                context: 1
              }
            );

            if (patch) {
              ws.logger.child({ diff: patch }).info('Received settings');
            }
          } else {
            ws.logger.info('Received settings');
          }
          ws.state.oldSettings = settingsHumanReadable;

          const oldDemoPathPrefix = ws.state.settings?.engine?.demoPathPrefix;
          const newDemoPathPrefix = params.settings?.engine?.demoPathPrefix;
          if (oldDemoPathPrefix != newDemoPathPrefix) {
            ws.logger
              .child({ oldDemoPathPrefix, newDemoPathPrefix })
              .info(`Demo path prefix changed`);
            stopFileWatch(ws);
          }

          ws.state.settings = params.settings;
          if (id !== undefined) {
            ws.sendResponse(id, { status: 'settings updated' });
          }
        } else if (method.startsWith('fs.')) {
          await handleFileSystemMessage(ws, { method, params, id });
        } else if (method.startsWith('capture.')) {
          await handleCaptureMessage(ws, { method, params, id });
        } else {
          ws.logger.child({ method, params }).info('Unknown method received');
          if (id !== undefined) {
            ws.sendError(
              id,
              -32601,
              'Method not found',
              `Unknown method: ${method}`
            );
          }
        }
      } catch (e) {
        ws.logger.warn(e);
        const errorMsg = e.message || 'Unknown error';
        ws.sendError(msg?.id || null, -32603, 'Internal error', errorMsg);
      }
    });
    ws.onerror = function () {
      ws.logger.warn('websocket error');
    };
  });

  process.on('SIGINT', function () {
    wss.clients.forEach((client) => {
      client.logger.info('Sending disconnect to client');
      client.sendNotification('disconnect');
      client.close();
    });

    logger.info('Exiting tool server');

    process.exit();
  });
};

(async () => await server())();

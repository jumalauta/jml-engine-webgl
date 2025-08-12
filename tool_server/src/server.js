import { WebSocketServer } from 'ws';
import { pino } from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { handleCaptureMessage } from './VideoExporter.js';
import { handleFileSystemMessage } from './FileSystem.js';

const server = async function () {
  const port = 7447;
  const wss = new WebSocketServer({ port });

  const logger = pino();
  logger.info(`Tool server started in port ${port}`);

  wss.on('connection', (ws) => {
    ws.state = { id: uuidv4() };

    ws.logger = logger.child({ id: ws.state.id });

    ws.logger.info('Tool client connected');

    ws.sendJson = (msg) => {
      ws.send(JSON.stringify(msg));
    };

    ws.on('close', () => ws.logger.info('Tool client disconnected'));
    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data);
        const type = msg.type || '';

        if (ws.state.connected) {
          if (type === 'INIT') {
            ws.logger.child({ clientMessage: msg }).info('Init message');
            ws.state.init = msg;
          } else if (type === 'SETTINGS') {
            ws.logger.info('Received settings');
            if (msg.settings === undefined) {
              throw new Error('Settings missing');
            }
            ws.state.settings = msg.settings;
          } else if (type.startsWith('FS_')) {
            await handleFileSystemMessage(ws, msg);
          } else if (type.startsWith('CAPTURE_')) {
            await handleCaptureMessage(ws, msg);
          } else {
            ws.logger
              .child({ clientMessage: msg })
              .info('Invalid client data received');
            throw new Error('Invalid message: ' + msg.type);
          }
        } else if (msg.type === 'CONNECT') {
          ws.sendJson({ type: 'HELLO' });
          ws.state.connected = true;
        } else {
          throw new Error('Invalid pre-connection message: ' + msg.type);
        }
      } catch (e) {
        ws.logger.warn(e);
        const msg = e.message || 'Unknown error';
        ws.sendJson({ type: 'ERROR', message: msg });
      }
    });
    ws.onerror = function () {
      ws.logger.warn('websocket error');
    };
  });

  process.on('SIGINT', function () {
    wss.clients.forEach((client) => {
      client.logger.info('Sending disconnect to client');
      client.send(JSON.stringify({ type: 'DISCONNECT' }));
      client.close();
    });

    logger.info('Exiting tool server');

    process.exit();
  });
};

(async () => await server())();

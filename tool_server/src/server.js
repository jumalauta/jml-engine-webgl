import { WebSocketServer } from 'ws';
import { pino } from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { VideoExporter } from './VideoExporter.js';

const logger = pino();

const server = async function () {
  const wss = new WebSocketServer({ port: 7447 });

  logger.info('Tool server started');

  wss.on('connection', (ws) => {
    ws.state = { id: uuidv4() };

    ws.logger = logger.child({ id: ws.state.id });

    ws.logger.info('Tool client connected');

    function send(msg) {
      ws.send(JSON.stringify(msg));
    }

    ws.on('close', () => ws.logger.info('Tool client disconnected'));
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);

        if (ws.state.connected) {
          if (msg.type === 'INIT') {
            ws.logger.child({ clientMessage: msg }).info('Init message');
            ws.state.init = msg;
            // demoPathPrefix
          } else if (msg.type === 'CAPTURE_START') {
            ws.logger.child({ clientMessage: msg }).info('Capture start');
            ws.state.capture = {
              fps: msg.fps || 60,
              width: msg.width || 1920,
              height: msg.height || 1080,
              frame: undefined
            };
            ws.state.videoExporter = new VideoExporter();
            ws.state.videoExporter.spawn(
              () => {
                ws.logger.info('ffmpeg spawned');
                send({ type: 'CAPTURE_WRITE_READY' });
              },
              (code) => {
                if (code === 0) {
                  ws.logger.info('ffmpeg closed successfully');
                  send({ type: 'CAPTURE_SUCCESS' });
                } else {
                  ws.logger.warn('ffmpeg closed with error code: ' + code);
                  send({
                    type: 'CAPTURE_ERROR',
                    message: 'ffmpeg closed with error code: ' + code
                  });
                }
              }
            );
          } else if (msg.type === 'CAPTURE_STOP') {
            if (
              !ws.state.capture ||
              !ws.state.videoExporter ||
              !ws.state.videoExporter.ready
            ) {
              throw Error('Invalid stop state. Capture not started');
            }

            ws.state.videoExporter.writeEnd();

            ws.logger
              .child({ clientMessage: msg, captureState: ws.state.capture })
              .info('Capture stop');
            ws.state.capture = undefined;
          } else if (msg.type === 'CAPTURE_FRAME') {
            if (
              !ws.state.capture ||
              !ws.state.videoExporter ||
              !ws.state.videoExporter.ready
            ) {
              throw Error('Invalid capture frame state. Capture not started');
            }

            if (msg.dataUrl === undefined || msg.frame === undefined) {
              ws.logger
                .child({ clientMessage: msg })
                .warn('Invalid frame data received');
              throw new Error('Invalid frame data');
            }

            if (msg.dataUrl) {
              const regex = /^data:(.+);base64,(.*)$/;
              const matches = msg.dataUrl.match(regex);
              if (!matches) {
                throw new Error('Invalid dataUrl');
              }
              const type = matches[1].split('/')[0];
              if (type !== 'image') {
                throw new Error('Invalid dataUrl data type: ' + type);
              }
              const data = Buffer.from(matches[2], 'base64');
              ws.state.videoExporter.writeFrame(data);
            }
          } else {
            ws.logger
              .child({ clientMessage: msg })
              .info('Invalid client data received');
            throw new Error('Invalid message: ' + msg.type);
          }
        } else if (msg.type === 'CONNECT') {
          send({ type: 'HELLO' });
          ws.state.connected = true;
        } else {
          throw new Error('Invalid pre-connection message: ' + msg.type);
        }
      } catch (e) {
        ws.logger.warn(e);
        const msg = e.message || 'Unknown error';
        send({ type: 'ERROR', message: msg });
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

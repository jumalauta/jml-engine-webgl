import { WebSocketServer } from 'ws';
import { pino } from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { VideoExporter } from './VideoExporter.js';

const logger = pino();

const server = async function () {
  const wss = new WebSocketServer({ port: 7448 });

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
          } else if (msg.type === 'SETTINGS') {
            ws.logger.info('Received settings');
            if (msg.settings === undefined) {
              throw new Error('Settings missing');
            }
            ws.state.settings = msg.settings;
          } else if (msg.type === 'CAPTURE_START') {
            ws.logger.child({ clientMessage: msg }).info('Capture start');
            ws.state.capture = {
              fps: msg.fps || 60,
              width: msg.width || 1920,
              height: msg.height || 1080,
              frame: undefined,
              time: undefined
            };
            ws.state.videoExporter = new VideoExporter();
            ws.state.videoExporter.setMusicPath(
              `../public/${ws.state.settings.engine.demoPathPrefix}/${ws.state.settings.demo.music.musicFile}`
            );
            ws.state.videoExporter.spawn(
              () => {
                ws.logger.info('ffmpeg spawned');
                send({ type: 'CAPTURE_WRITE_READY' });
              },
              (code) => {
                if (ws.state.capture) {
                  ws.state.capture.captureDuration =
                    (Date.now() - ws.state.capture.start) / 1000;
                  ws.state.capture.captureFps =
                    ws.state.capture.frame / ws.state.capture.captureDuration;
                }

                if (code === 0) {
                  ws.logger.info('ffmpeg closed successfully');
                  send({ type: 'CAPTURE_SUCCESS', capture: ws.state.capture });
                } else {
                  ws.logger.warn('ffmpeg closed with error code: ' + code);
                  send({
                    type: 'CAPTURE_ERROR',
                    capture: ws.state.capture,
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

            const logMsg = {
              ...msg,
              dataUrl:
                msg.dataUrl !== undefined
                  ? msg.dataUrl.split(',')[0] + ',<data>'
                  : undefined
            };

            if (
              msg.dataUrl === undefined ||
              msg.frame === undefined ||
              msg.time === undefined
            ) {
              ws.logger
                .child({ clientMessage: logMsg })
                .warn('Invalid frame data received');
              throw new Error('Invalid frame data');
            }

            if (ws.state.capture.frame === undefined) {
              if (msg.frame !== 0 && msg.time !== 0) {
                ws.logger
                  .child({
                    clientMessage: logMsg,
                    captureState: ws.state.capture
                  })
                  .warn('Invalid first frame received');
                // throw new Error('Invalid first frame');
              }

              ws.state.capture.start = Date.now();
            }

            if (
              ws.state.capture.frame !== undefined &&
              ws.state.capture.frame + 1 !== msg.frame
            ) {
              ws.logger
                .child({
                  clientMessage: logMsg,
                  captureState: ws.state.capture
                })
                .warn('Invalid frame number received');
              // throw new Error('Invalid frame number');
            }

            if (
              ws.state.capture.time !== undefined &&
              ws.state.capture.time >= msg.time
            ) {
              ws.logger
                .child({
                  clientMessage: logMsg,
                  captureState: ws.state.capture
                })
                .warn('Invalid frame time received');
              // throw new Error('Invalid frame time');
            }

            ws.state.capture.frame = msg.frame;
            ws.state.capture.time = msg.time;

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
              send({ type: 'CAPTURE_FRAME_SUCCESS', frame: msg.frame });
            } else {
              throw new Error('dataUrl missing');
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

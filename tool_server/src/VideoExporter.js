import { pino } from 'pino';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import assert from 'node:assert';

const logger = pino();

const VideoExporter = function () {
  this.ready = false;
};

VideoExporter.prototype.setMusicPath = function (path) {
  if (!existsSync(path)) {
    throw new Error(`Music file not found: ${path}`);
  }

  this.musicPath = path;
};

VideoExporter.prototype.spawn = function (onSpawn, onClose) {
  // * YouTube Recommended upload encoding settings: https://support.google.com/youtube/answer/1722171?hl=en
  // * Audio: AAC-LC audio with high bitrate, stereo/5.1 and samplerate 48/96kHz
  // * Video: 16:9 MP4 H.264 60 fps (/w nearly lossless quality)

  const outputPath = 'output.mp4';

  const ffmpegArgs = [
    // overwrite output file / say yes to everything
    '-y',
    // input video
    '-f',
    'image2pipe',
    '-framerate',
    '60',
    '-i',
    '-',
    // input audio
    '-i',
    this.musicPath,
    '-c:a',
    'aac',
    '-b:a',
    '512k',
    '-strict',
    '-2',
    // output video
    '-framerate',
    '60',
    '-vcodec',
    'libx264',
    '-crf',
    '18',
    '-shortest',
    '-filter:v',
    'scale=1920:-1',
    outputPath
  ];

  const ffmpeg = spawn('ffmpeg', ffmpegArgs);

  ffmpeg.stdout.on('data', (data) => {
    logger.info(`ffmpeg stdout: ${data}`);
  });

  ffmpeg.stderr.on('data', (data) => {
    // STDERR contains progress information in case of ffmpeg
    logger.info(`ffmpeg stderr: ${data}`);
  });

  ffmpeg.on('spawn', () => {
    this.ready = true;
    onSpawn();
  });

  ffmpeg.on('error', (err) => {
    logger.error(`ffmpeg error: ${err}`);
  });

  ffmpeg.on('close', (code) => {
    this.ready = false;
    onClose(code);
  });

  this.ffmpeg = ffmpeg;
};

VideoExporter.prototype.writeFrame = function (frame) {
  this.ffmpeg.stdin.cork();
  this.ffmpeg.stdin.write(frame);
  this.ffmpeg.stdin.uncork();
};

VideoExporter.prototype.writeEnd = function () {
  this.ffmpeg.stdin.end();
};

const handleCaptureMessage = async (ws, msg) => {
  assert(ws, 'WebSocket is required');
  assert(msg, 'Message is required');

  if (msg.type === 'CAPTURE_START') {
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
        ws.sendJson({ type: 'CAPTURE_WRITE_READY' });
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
          ws.sendJson({ type: 'CAPTURE_SUCCESS', capture: ws.state.capture });
        } else {
          ws.logger.warn('ffmpeg closed with error code: ' + code);
          ws.sendJson({
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
      ws.sendJson({ type: 'CAPTURE_FRAME_SUCCESS', frame: msg.frame });
    } else {
      throw new Error('dataUrl missing');
    }
  } else {
    ws.logger
      .child({ clientMessage: msg })
      .info('Invalid capture client data received');
    throw new Error('Invalid capture message: ' + msg.type);
  }
};

export { VideoExporter, handleCaptureMessage };

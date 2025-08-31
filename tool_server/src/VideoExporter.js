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
    '-'
  ];

  if (this.musicPath !== undefined) {
    ffmpegArgs.push(
      // input audio
      '-i',
      this.musicPath,
      '-c:a',
      'aac',
      '-b:a',
      '512k',
      '-strict',
      '-2'
    );
  }

  ffmpegArgs.push(
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
  );

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

  const { method, params, id } = msg;

  if (method === 'capture.start') {
    ws.logger.child({ params }).info('Capture start');
    ws.state.capture = {
      fps: params?.fps || 60,
      width: params?.width || 1920,
      height: params?.height || 1080,
      frame: undefined,
      time: undefined
    };
    ws.state.videoExporter = new VideoExporter();
    if (ws.state.settings?.demo?.music?.musicFile) {
      ws.state.videoExporter.setMusicPath(
        `public/${ws.state.settings.engine.demoPathPrefix}${ws.state.settings.demo.music.musicFile}`
      );
    }
    ws.state.videoExporter.spawn(
      () => {
        ws.logger.info('ffmpeg spawned');
        ws.sendNotification('capture.writeReady');
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
          ws.sendNotification('capture.success', { capture: ws.state.capture });
        } else {
          ws.logger.warn('ffmpeg closed with error code: ' + code);
          ws.sendNotification('capture.error', {
            capture: ws.state.capture,
            message: 'ffmpeg closed with error code: ' + code
          });
        }
      }
    );
    if (id !== undefined) {
      ws.sendResponse(id, { status: 'started' });
    }
  } else if (method === 'capture.stop') {
    if (
      !ws.state.capture ||
      !ws.state.videoExporter ||
      !ws.state.videoExporter.ready
    ) {
      if (id !== undefined) {
        ws.sendError(id, -32603, 'Internal error', 'Capture not started');
      }
      return;
    }

    ws.state.videoExporter.writeEnd();

    ws.logger
      .child({ params, captureState: ws.state.capture })
      .info('Capture stop');
    ws.state.capture = undefined;
    if (id !== undefined) {
      ws.sendResponse(id, { status: 'stopped' });
    }
  } else if (method === 'capture.frame') {
    if (
      !ws.state.capture ||
      !ws.state.videoExporter ||
      !ws.state.videoExporter.ready
    ) {
      if (id !== undefined) {
        ws.sendError(id, -32603, 'Internal error', 'Capture not started');
      }
      return;
    }

    const logParams = {
      ...params,
      dataUrl:
        params?.dataUrl !== undefined
          ? params.dataUrl.split(',')[0] + ',<data>'
          : undefined
    };

    if (
      !params?.dataUrl ||
      params.frame === undefined ||
      params.time === undefined
    ) {
      ws.logger
        .child({ params: logParams })
        .warn('Invalid frame data received');
      if (id !== undefined) {
        ws.sendError(id, -32602, 'Invalid params', 'Missing frame data');
      }
      return;
    }

    if (ws.state.capture.frame === undefined) {
      if (params.frame !== 0 && params.time !== 0) {
        ws.logger
          .child({
            params: logParams,
            captureState: ws.state.capture
          })
          .warn('Invalid first frame received');
      }

      ws.state.capture.start = Date.now();
    }

    if (
      ws.state.capture.frame !== undefined &&
      ws.state.capture.frame + 1 !== params.frame
    ) {
      ws.logger
        .child({
          params: logParams,
          captureState: ws.state.capture
        })
        .warn('Invalid frame number received');
    }

    if (
      ws.state.capture.time !== undefined &&
      ws.state.capture.time >= params.time
    ) {
      ws.logger
        .child({
          params: logParams,
          captureState: ws.state.capture
        })
        .warn('Invalid frame time received');
    }

    ws.state.capture.frame = params.frame;
    ws.state.capture.time = params.time;

    try {
      const regex = /^data:(.+);base64,(.*)$/;
      const matches = params.dataUrl.match(regex);
      if (!matches) {
        throw new Error('Invalid dataUrl format');
      }
      const type = matches[1].split('/')[0];
      if (type !== 'image') {
        throw new Error('Invalid dataUrl data type: ' + type);
      }
      const data = Buffer.from(matches[2], 'base64');
      ws.state.videoExporter.writeFrame(data);

      if (id !== undefined) {
        ws.sendResponse(id, { frame: params.frame, status: 'written' });
      }
    } catch (err) {
      if (id !== undefined) {
        ws.sendError(id, -32602, 'Invalid params', err.message);
      }
    }
  } else {
    ws.logger.child({ method, params }).info('Unknown capture method received');
    if (id !== undefined) {
      ws.sendError(id, -32601, 'Method not found', `Unknown method: ${method}`);
    }
  }
};

export { VideoExporter, handleCaptureMessage };

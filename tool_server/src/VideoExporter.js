import { pino } from 'pino';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

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

  const ffmpeg = spawn('ffmpeg', [
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
    'output2.mp4'
  ]);

  ffmpeg.stdout.on('data', (data) => {
    logger.info(`ffmpeg output: ${data}`);
  });

  ffmpeg.stderr.on('data', (data) => {
    // STDERR contains progress information in case of ffmpeg
    logger.info(`ffmpeg output: ${data}`);
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

export { VideoExporter };

import { Loader } from './Loader';
import { Player } from './Player';
import {
  loggerDebug,
  loggerInfo,
  loggerError,
  loggerWarning,
  windowSetTitle
} from './Bindings';
import { Music } from './Music';
import { Sync } from './Sync';
import { LoadingBar } from './LoadingBar';
import { Timer } from './Timer';
import { DemoRenderer, getCamera, getScene } from './DemoRenderer';
import { FileManager } from './FileManager';
import { Fbo } from './Fbo';
import { Video } from './Video';
import { Spectogram } from './Spectogram';
import { Settings } from './Settings';
import { isStarted, stopDemo, startAnimate } from './main';
import { ToolUi } from './ToolUi';

const settings = new Settings();

/** @constructor */
const Effect = function () {};

Effect.effects = [];

Effect.init = function (effectName) {
  (async () => {
    loggerDebug('Starting loading');
    const loadingBar = new LoadingBar();
    try {
      if (Effect.loading === true) {
        loggerWarning(`Already loading ${effectName}! Ignoring init.`);
        return;
      }
      const now = new Date().getTime() / 1000;

      Effect.loading = true;

      const timer = new Timer();

      let forceResume = false;
      if (timer.isStarted()) {
        if (!timer.isPaused()) {
          timer.pause();
          forceResume = true;
        }
      }

      const fileManager = new FileManager();
      await fileManager.loadUpdatedFiles();

      /* eslint-disable no-eval */
      const effect = eval('new ' + effectName);

      effect.loader = new Loader();
      effect.loader.clear();
      effect.player = new Player();

      Effect.effects[effectName] = effect;

      if (effect.init !== undefined) {
        effect.init();
      }

      if (effect.postInit !== undefined) {
        effect.postInit();
      }

      effect.loader.promises.push(new Spectogram().init());

      const music = new Music();
      effect.loader.promises.push(
        music.load(fileManager.getPath(settings.demo.music.musicFile))
      );

      const promiseCount = effect.loader.promises.length;

      const demoRenderer = new DemoRenderer();
      demoRenderer.clear();

      loadingBar.setPercent(0.0);
      new ToolUi().clearScenes();

      let processedPromises = 0;
      Video.clear();

      for (let i = 0; i < effect.loader.promises.length; i++) {
        effect.loader.promises[i].finally(() => {
          processedPromises++;
          const percent = (processedPromises / promiseCount) * 0.9;
          loadingBar.setPercent(percent);
        });
      }

      while (effect.loader.promises.length > 0) {
        if (isStarted() === false) {
          loggerInfo('Demo stopped, exiting asset loading');
          stopDemo();
          return;
        }

        await effect.loader.promises.shift();
      }

      loadingBar.setPercent(0.9);
      await new Sync().init();
      effect.loader.processAnimation();

      if (settings.engine.preload) {
        const preCompileList = [];
        const fbos = Fbo.getFbos();
        for (const key in fbos) {
          const fbo = fbos[key];
          preCompileList.push({ scene: fbo.scene, camera: fbo.camera });
        }
        preCompileList.push({ scene: getScene(), camera: getCamera() });
        for (let i = 0; i < preCompileList.length && isStarted(); i++) {
          loadingBar.setPercent(0.95 + (i / preCompileList.length) * 0.05);
          const item = preCompileList[i];
          // TODO: compile throws errors, render is flexible but still builds at least the shaders
          // demoRenderer.renderer.compile(item.scene, item.camera);
          demoRenderer.renderer.render(item.scene, item.camera);
        }
      }

      let action;
      if (isStarted()) {
        new ToolUi().show();

        if (!timer.isStarted()) {
          timer.start();
          action = 'Starting';
        }
        if (forceResume) {
          timer.pause();
          action = 'Resuming';
        }
      } else {
        action = 'Not starting';
        stopDemo();
      }
      loggerInfo(
        `${action} demo. Loading took ${(new Date().getTime() / 1000 - now).toFixed(2)} seconds`
      );
    } catch (error) {
      windowSetTitle('LOADING ERROR');

      if (error instanceof Error) {
        loggerError(
          'Error in loading demo: ' +
            (error.message || '') +
            ', stack: ' +
            (error.stack || '')
        );
      } else {
        loggerError('Error in loading demo');
      }

      stopDemo();
    } finally {
      Effect.loading = false;
      const time = settings.engine.startTime || 0;
      startAnimate(time);
      loadingBar.setPercent(1.0);
      settings.engine.startTime = 0;
    }
  })();
};

Effect.run = function (effectName) {
  const effect = Effect.effects[effectName];

  if (effect.run !== undefined) {
    effect.run();
  } else {
    effect.player.drawAnimation(effect.loader);
  }
};

Effect.deinit = function (effectName) {
  const effect = Effect.effects[effectName];

  if (effect.deinit !== undefined) {
    effect.deinit();
  } else {
    effect.loader.deinitAnimation();
  }

  delete Effect.effects[effectName];
};

export { Effect };

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
import { DemoRenderer } from './DemoRenderer';
import { FileManager } from './FileManager';
import { Video } from './Video';
import { Spectogram } from './Spectogram';
import { Settings } from './Settings';
import { isStarted, stopDemo, startAnimate } from './main';
import { ToolUi } from './ToolUi';

const settings = new Settings();

/** @constructor */
const Effect = function () {};

Effect.effects = [];

async function processPromises(promises, startPercent, endPercent) {
  const loadingBar = new LoadingBar();
  const promiseCount = promises.length;
  let processedPromises = 0;

  for (let i = 0; i < promiseCount; i++) {
    promises[i].finally(() => {
      processedPromises++;
      const percent =
        startPercent +
        (processedPromises / promiseCount) * (endPercent - startPercent);
      loadingBar.setPercent(percent);
    });
  }

  while (promises.length > 0) {
    if (isStarted() === false) {
      loggerInfo('Demo stopped, exiting asset loading');
      stopDemo();
      return false;
    }

    await promises.shift();
  }

  return true;
}

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

      const demoRenderer = new DemoRenderer();
      demoRenderer.clear();

      loadingBar.setPercent(0.0);
      new ToolUi().clearScenes();

      Video.clear();

      if (!(await processPromises(effect.loader.promises, 0.0, 0.8))) {
        return;
      }

      loadingBar.setPercent(0.85);
      await new Sync().init();
      effect.loader.processAnimation();

      let action;
      if (isStarted()) {
        new ToolUi().show();

        if (!timer.isStarted()) {
          if (settings.engine.preload) {
            const now = Date.now();
            const steps = settings.engine.preloadSteps;
            const demoRenderer = new DemoRenderer();

            for (let i = 0; i < steps; i++) {
              const percent = i / steps;
              effect.loader.promises.push(demoRenderer.preload(percent));
            }

            if (!(await processPromises(effect.loader.promises, 0.85, 1.0))) {
              return;
            }

            loggerDebug(`Preloading took ${Date.now() - now} ms`);
          }

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

      loadingBar.setPercent(1.0);
      const time = settings.engine.startTime || 0;
      startAnimate(time);
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

import { Loader } from './Loader';
import { Player } from './Player';
import { loggerDebug, loggerInfo, loggerError } from './Bindings';
import { Music } from './Music';
import { Sync } from './Sync';
import { LoadingBar } from './LoadingBar';
import { Timer } from './Timer';
import { DemoRenderer, getCamera, getScene } from './DemoRenderer';
import { FileManager } from './FileManager';
import { Fbo } from './Fbo';
import { Video } from './Video';
import { Settings } from './Settings';
const settings = new Settings();

/** @constructor */
const Effect = function () {};

Effect.effects = [];

Effect.init = function (effectName) {
  const timer = new Timer();

  let forceResume = false;
  if (timer.isStarted()) {
    if (!timer.isPaused()) {
      timer.pause();
      forceResume = true;
    }
  }

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
  } else {
    const fileManager = new FileManager();
    const music = new Music();
    effect.loader.promises.push(
      music.load(fileManager.getPath(settings.demo.music.musicFile))
    );

    const promiseCount = effect.loader.promises.length;

    const loadingBar = new LoadingBar();

    (async () => {
      loggerDebug('Starting loading');
      const now = new Date().getTime() / 1000;
      let processedPromises = 0;
      try {
        Video.clear();

        for (let i = 0; i < effect.loader.promises.length; i++) {
          effect.loader.promises[i].finally(() => {
            processedPromises++;
            const percent = (processedPromises / promiseCount) * 0.9;
            loadingBar.setPercent(percent);
          });
        }

        await Promise.all(effect.loader.promises);
        effect.loader.promises = [];

        loadingBar.setPercent(0.9);
        await new Sync().init();
        effect.loader.processAnimation();

        const demoRenderer = new DemoRenderer();

        if (settings.engine.preload) {
          const preCompileList = [];
          const fbos = Fbo.getFbos();
          for (const key in fbos) {
            const fbo = fbos[key];
            preCompileList.push({ scene: fbo.scene, camera: fbo.camera });
          }
          preCompileList.push({ scene: getScene(), camera: getCamera() });
          for (let i = 0; i < preCompileList.length; i++) {
            loadingBar.setPercent(0.95 + (i / preCompileList.length) * 0.05);
            const item = preCompileList[i];
            // TODO: compile throws errors, render if flexible but still builds at least the shaders
            // demoRenderer.renderer.compile(item.scene, item.camera);
            demoRenderer.renderer.render(item.scene, item.camera);
          }
        }

        loadingBar.setPercent(1.0);

        let action;
        if (!timer.isStarted()) {
          timer.start();
          action = 'Starting';
        }
        if (forceResume) {
          timer.pause();
          action = 'Resuming';
        }
        loggerInfo(
          `${action} demo. Loading took ${(new Date().getTime() / 1000 - now).toFixed(2)} seconds`
        );

        demoRenderer.setRenderNeedsUpdate(true);
        fileManager.setNeedsUpdate(false);
      } catch (error) {
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
      }
    })();
  }
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

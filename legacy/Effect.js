import { Loader } from './Loader.js';
import { Player } from './Player.js';
import { loggerDebug, loggerInfo, loggerWarning } from './Bindings.js';
import { Music } from './Music.js';
import { Sync } from './Sync.js';
import { LoadingBar } from '../LoadingBar.js';
import { Timer } from '../Timer.js';
import { DemoRenderer, getCamera, getScene } from '../DemoRenderer.js';
import { FileManager } from '../FileManager.js';
import { Fbo } from '../legacy/Fbo.js';
import { Settings } from '../Settings';
const settings = new Settings();

/** @constructor */
var Effect = function()
{
};

Effect.effects = [];

Effect.init = function(effectName)
{
    var effect = eval('new ' + effectName);

    //if (effect.loader === void null)
    {
        effect.loader = new Loader();
    }
    //if (effect.player === void null)
    {
        effect.player = new Player();
    }

    Effect.effects[effectName] = effect;

    if (effect.init !== void null)
    {
        effect.init();
    }

    if (effect.postInit !== void null)
    {
        effect.postInit();
    }
    else
    {
        const fileManager = new FileManager();
        const music = new Music();
        effect.loader.promises.push(music.load(fileManager.getPath("music.ogg")));
        effect.loader.promises.push(Sync.getInstance().init());

        let promiseCount = effect.loader.promises.length;

        const loadingBar = new LoadingBar();

        (async () => {
            loggerDebug("Starting loading");
            let now = new Date().getTime() / 1000;
            try {   
                while(effect.loader.promises.length > 0) {
                    loadingBar.setPercent((promiseCount - effect.loader.promises.length) / (promiseCount) * 0.8);
                        await effect.loader.promises.shift();
                }

                loadingBar.setPercent(0.9);
                effect.loader.processAnimation();

                const demoRenderer = new DemoRenderer();

                if (settings.engine.preload) {
                    let preCompileList = [];
                    const fbos = Fbo.getFbos();
                    for (let key in fbos) {
                        let fbo = fbos[key];
                        preCompileList.push({scene: fbo.scene, camera: fbo.camera});
                    }
                    preCompileList.push({scene: getScene(), camera: getCamera()});
                    for(let i = 0; i < preCompileList.length; i++) {
                        loadingBar.setPercent(0.9 + (i / preCompileList.length) * 0.1);
                        const item = preCompileList[i];
                        // TODO: compile throws errors, render if flexible but still builds at least the shaders
                        //demoRenderer.renderer.compile(item.scene, item.camera);
                        demoRenderer.renderer.render( item.scene, item.camera );
                    }
                }

                loadingBar.setPercent(1.0);
                loggerInfo("Starting demo. Loading took " + (new Date().getTime() / 1000 - now).toFixed(2) + " seconds");

                const timer = new Timer();
                if (timer.getTime() <= 0) {
                    timer.start();
                }
                
                demoRenderer.setRenderNeedsUpdate(true);
                fileManager.setNeedsUpdate(false);
            } catch (error) {
                console.trace(error);
                alert("Error in loading demo: " + (error.message||''));
                return;
            }
        })();
    }
};

Effect.run = function(effectName)
{
    var effect = Effect.effects[effectName];

    if (effect.run !== void null)
    {
        effect.run();
    }
    else
    {
        effect.player.drawAnimation(effect.loader);
    }
};

Effect.deinit = function(effectName)
{
    var effect = Effect.effects[effectName];

    if (effect.deinit !== void null)
    {
        effect.deinit();
    }
    else
    {
        effect.loader.deinitAnimation();
    }

    delete Effect.effects[effectName];
}

export { Effect };
import { Loader } from './Loader.js';
import { Player } from './Player.js';
import { animate, loadingBar, Demo } from '../main.js';
import { loggerDebug, loggerWarning } from './Bindings.js';
import { Music } from './Music.js';
import { Sync } from './Sync.js';

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
        let music = Music.getInstance();
        effect.loader.promises.push(music.load("data/music.ogg"));
        effect.loader.promises.push(Sync.getInstance().init());

        let promiseCount = effect.loader.promises.length;

        if (loadingBar.percent <= 0.0) {
            animate();
        }

        (async () => {
            loggerDebug("Starting loading");
            let now = new Date().getTime() / 1000;
            try {            
                while(effect.loader.promises.length > 0) {
                    loadingBar.setPercent((promiseCount - effect.loader.promises.length) / (promiseCount + 1));
                        await effect.loader.promises.shift();
                }

                loadingBar.setPercent((promiseCount) / (promiseCount + 1));
                effect.loader.processAnimation();

                loadingBar.setPercent(1.0);
                loggerDebug("Starting demo. Loading took " + (new Date().getTime() / 1000 - now).toFixed(2) + " seconds");
                music.play();
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
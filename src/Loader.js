import { Scene } from './Scene';
import { Utils } from './Utils';
import { loggerDebug, loggerTrace, loggerWarning, setResourceCount, notifyResourceLoaded } from './Bindings';
import { DemoRenderer } from './DemoRenderer';
import { Fbo } from './Fbo';

/** @constructor */

var Loader = function() {
    return this.getInstance();
};

const defaultSceneName = 'main';

Loader.prototype.getInstance = function() {
    if (!Loader.prototype._singletonInstance) {
        Loader.prototype._singletonInstance = this;
        this.clear();
    }

    return Loader.prototype._singletonInstance;
}

Loader.prototype.clear = function() {
    this.resourceCount = 0;
    this.resourceUniqueList = [];

    this.scenes = {};
    this.activeScene = void null;
    
    this.timeline = {};
    this.promises = [];

    // scene not defined, set the fall-back scene
    this.setScene(defaultSceneName, {"useFbo": false});
}

Loader.prototype.sortArray = function(animationLayers)
{
    return Object.keys(animationLayers).sort().reduce(function(result, key) {
        result[key] = animationLayers[key];
        return result;
    }, {});
}

Loader.prototype.getLayerString = function(layer)
{
    if (Utils.isString(layer))
    {
        //when using layer strings we believe that user knows what he/she is doing (with layer sorting)
        return layer;
    }
    else if (Utils.isNumeric(layer))
    {
        if (layer < 0 || layer > 99999) {
            //maximum user defined layer should be 5 digits as sorting will go off with any higher number...
            var oldLayer = layer;
            layer = Utils.clampRange(layer, 0, 99999);
            loggerWarning("Invalid layer '" + oldLayer + "'. Clamped to '" + layer + "'");
        }
        var layerString = '000000' + layer;
        return layerString.substring(layerString.length - 6); //number 21 to string "000021" etc...
    }

    loggerWarning("Invalid layer '" + layer + "'");

    return undefined;
}

Loader.prototype.addSceneToTimeline = function(sceneDefinitions)
{
    if (Utils.isArray(sceneDefinitions) === false)
    {
        sceneDefinitions = [sceneDefinitions];
    }

    var timeline = this.timeline;
    for (var timelineI = 0; timelineI < sceneDefinitions.length; timelineI++)
    {
        var sceneDefinition = sceneDefinitions[timelineI];
        if (sceneDefinition.layer === void null)
        {
            sceneDefinition.layer = 1;
        }
        if (sceneDefinition.start === void null)
        {
            sceneDefinition.start = 0;
        }
        // NB. sceneDefinition.duration as null means infinite

        var layer = this.getLayerString(sceneDefinition.layer);

        sceneDefinition.layer = layer;

        if (timeline[layer] === void null)
        {
            timeline[layer] = new Array();
        }

        timeline[layer].push(sceneDefinition);
    }

    timeline = this.sortArray(timeline);
}

Loader.prototype.addNotifyResource = function(name, promises)
{
    this.resourceCount++;
    this.resourceUniqueList[name] = false;
    if (promises){
        promises = Utils.isArray(promises) ? promises : [promises];
        promises.forEach(promise => {
            this.promises.push(promise);
        });
    }

    setResourceCount(1);

    return true;
};

Loader.prototype.notifyResourceLoaded = function(name)
{
    notifyResourceLoaded();

    return true;
};

Loader.prototype.setScene = function(name, settings) {
    const renderScene = (new DemoRenderer()).setScene(name);
    if (! this.scenes.hasOwnProperty(name)) {
        // if scene doesn't exist, create one
        this.scenes[name] = new Scene(name, this);
        var scene = this.scenes[name];

        if (settings) {
            if (settings.fbo) {
                scene.fbo = Fbo.init(name);
            }
        }

        /*var useFbo = true;
        if (settings !== void null) {
            if (settings.useFbo !== void null) {
                useFbo = settings.useFbo;
            }

            scene.initFunction = settings.initFunction;
        }

        if (useFbo) {
            //FIXME: FBO timing and layers should be determined - ALSO CRASHES
            var fboStart = Utils.deepCopyJson(scene.fboStart);
            if (fboStart !== void null) {
                scene.addAnimation(
                { 
                     "start": 0, "duration": 9999, "layer": 0
                    ,"fbo":fboStart
                });
            }

            //FIXME: FBO timing and layers should be determined - ALSO CRASHES
            var fboEnd = Utils.deepCopyJson(scene.fboEnd);
            if (fboEnd !== void null) {
                scene.addAnimation(
                { 
                     "start": 0, "duration": 9999, "layer": 99999
                    ,"fbo":fboEnd
                });
            }
        }*/
    }

    this.activeScene = this.scenes[name];
    this.activeScene.renderScene = renderScene;
}

Loader.prototype.addAnimation = function(animationDefinitions)
{
    this.activeScene.addAnimation(animationDefinitions);
}

Loader.prototype.processAnimation = function()
{
    if (Utils.isEmptyObject(this.timeline)) {
        /*loggerTrace("No timeline defined, adding default timeline");
        for (var sceneName in this.scenes) {
            // add scenes to timeline with default values. this is not recommended, but serves as fall-back functionality
            this.addSceneToTimeline({"scene": sceneName});
        }*/
        this.addSceneToTimeline({"scene": defaultSceneName});
    }

    for (var sceneName in this.scenes) {
        var scene = this.scenes[sceneName];
        loggerDebug("Processing animations for scene '" + sceneName + "'");

        scene.processAnimation();
    }

    //loggerWarning("Processed script output: " + JSON.stringify(this.activeScene.animationLayers, null, 2));
}

Loader.prototype.deinitAnimation = function()
{
    for (var key in this.scenes) {
        var scene = this.scenes[key];
        scene.deinitAnimation();
    }
}

export { Loader };
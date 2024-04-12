import { Utils, Constants } from './Utils.js';
import { Graphics } from './Graphics.js';
import { Input } from './Input.js';
import { Image } from './Image.js';
import { Shader } from './Shader.js';
import { Model } from './Model.js';
import { Text } from './Text.js';
import { Fbo } from './Fbo.js';
import { windowSetTitle, loggerError, loggerDebug, loggerWarning } from './Bindings.js';
import {getScene, getCamera, pushView, popView} from '../DemoRenderer.js';

import * as THREE from 'three';

/** @constructor */
var Scene = function(name, loader)
{
    this.name = name;
    this.loader = loader;
    this.animationLayers = {};

    this.initFunction = void null;
    this.fboName = name + "SceneFbo";
    this.fboStart = {"name":this.fboName,"action":"begin"};
    this.fboEnd = {"name":this.fboName,"action":"unbind"};
};

Scene.prototype.validateResourceLoaded = function(animationDefinition, animationDefinitionRef, errorMessage)
{
    if (animationDefinition === void null || animationDefinitionRef === void null || animationDefinitionRef.ptr === void null)
    {
        this.setAnimationError(animationDefinition, 'RESOURCE', errorMessage);
        return false;
    }

    return true;
};

Scene.prototype.setAnimationError = function(animationDefinition, errorType, errorMessage)
{
    windowSetTitle(errorType + ' ERROR');
    animationDefinition.error = errorMessage;
    loggerError(errorType + ' ERROR: ' + errorMessage);
    //loggerError('ERROR JSON: ' + JSON.stringify(animationDefinition, null, 2));
};

Scene.prototype.preprocess3dCoordinateAnimation = function(animStart, animDuration, animEnd, animationDefinition, defaults)
{
    if (animationDefinition !== void null)
    {
        var x = 0;
        var y = 0;
        var z = 0;
        if (defaults !== void null)
        {
            x = defaults.x;
            y = defaults.y;
            z = defaults.z;
        }

        for (var i = 0; i < animationDefinition.length; i++)
        {
            var coordinate = animationDefinition[i];

            if (coordinate.x === void null)
            {
                coordinate.x = x;
            }
            if (coordinate.y === void null)
            {
                coordinate.y = y;
            }
            if (coordinate.z === void null)
            {
                coordinate.z = z;
            }

            x = coordinate.x;
            y = coordinate.y;
            z = coordinate.z;
        }
    }
};

Scene.prototype.setSyncDefaults = function(animationDefinition, syncType)
{
    if (animationDefinition.sync !== void null && animationDefinition.sync[syncType] === void null)
    {
        if (animationDefinition.sync.all === true)
        {
            animationDefinition.sync[syncType] = true;
        }
        else
        {
            animationDefinition.sync[syncType] = false;
        }
    }
};

Scene.prototype.preprocessColorAnimation = function(
    animStart, animDuration, animEnd, animationDefinition, animationDefinitionColor)
{
    this.setSyncDefaults(animationDefinition, 'color');

    var r = 255;
    var g = 255;
    var b = 255;
    var a = 255;
    if (animationDefinitionColor === void null)
    {
        animationDefinitionColor = [{}];
    }

    Utils.preprocessTimeAnimation(animStart, animDuration, animEnd, animationDefinitionColor);

    for (var i = 0; i < animationDefinitionColor.length; i++)
    {
        var color = animationDefinitionColor[i];

        if (color.r === void null)
        {
            color.r = r;
        }
        if (color.g === void null)
        {
            color.g = g;
        }
        if (color.b === void null)
        {
            color.b = b;
        }
        if (color.a === void null)
        {
            color.a = a;
        }

        r = color.r;
        g = color.g;
        b = color.b;
        a = color.a;
    }
};

Scene.prototype.preprocessAngleAnimation = function(animStart, animDuration, animEnd, animationDefinition)
{
    if (animationDefinition.angle !== void null)
    {
        this.setSyncDefaults(animationDefinition, 'angle');

        Utils.preprocessTimeAnimation(animStart, animDuration, animEnd, animationDefinition.angle);
        this.preprocess3dCoordinateAnimation(animStart, animDuration, animEnd, animationDefinition.angle,
            {'x': 1.0, 'y': 1.0, 'z': 1.0});

        var degreesX = 0;
        var degreesY = 0;
        var degreesZ = 0;
        for (var i = 0; i < animationDefinition.angle.length; i++)
        {
            var angle = animationDefinition.angle[i];

            if (angle.degreesX === void null)
            {
                angle.degreesX = degreesX;
            }
            if (angle.degreesY === void null)
            {
                angle.degreesY = degreesY;
            }
            if (angle.degreesZ === void null)
            {
                angle.degreesZ = degreesZ;
            }

            if (angle.pivot !== void null)
            {
                this.setAnimationError(animationDefinition, 'PARSE', 'angle.pivot is deprecated. move pivot under animation.');
            }

            degreesX = angle.degreesX;
            degreesY = angle.degreesY;
            degreesZ = angle.degreesZ;
        }
    }
};

Scene.prototype.preprocessPerspectiveAnimation = function(animStart, animDuration, animEnd, animationDefinition)
{
    this.setSyncDefaults(animationDefinition, 'perspective');

    if (animationDefinition.perspective === void null)
    {
        animationDefinition.perspective = [{}];
    }

    Utils.preprocessTimeAnimation(animStart, animDuration, animEnd, animationDefinition.perspective);

    var fov = 45.0;
    var aspect = getCameraAspectRatio();
    var near = 1.0;
    var far = 1000.0;

    for (var i = 0; i < animationDefinition.perspective.length; i++)
    {
        var perspective = animationDefinition.perspective[i];

        if (perspective.fov === void null)
        {
            perspective.fov = fov;
        }
        if (perspective.aspect === void null)
        {
            perspective.aspect = aspect;
        }
        if (perspective.near === void null)
        {
            perspective.near = near;
        }
        if (perspective.far === void null)
        {
            perspective.far = far;
        }

        fov = perspective.fov;
        aspect = perspective.aspect;
        near = perspective.near;
        far = perspective.far;
    }
};


Scene.prototype.preprocessScaleAnimation = function(animStart, animDuration, animEnd, animationDefinition)
{
    this.setSyncDefaults(animationDefinition, 'scale');

    if (animationDefinition.scale === void null)
    {
        animationDefinition.scale = [{}];
    }

    for (var i = 0; i < animationDefinition.scale.length; i++)
    {
        var scale = animationDefinition.scale[i];
        if (scale.uniform3d !== void null)
        {
            scale.x = scale.uniform3d;
            scale.y = scale.uniform3d;
            scale.z = scale.uniform3d;
        }
        else if (scale.uniform2d !== void null)
        {
            scale.x = scale.uniform2d;
            scale.y = scale.uniform2d;
        }
    }


    Utils.preprocessTimeAnimation(animStart, animDuration, animEnd, animationDefinition.scale);
    this.preprocess3dCoordinateAnimation(animStart, animDuration, animEnd, animationDefinition.scale,
        {'x': 1.0, 'y': 1.0, 'z': 1.0});
};

Scene.prototype.preprocessDimensionAnimation = function(animStart, animDuration, animEnd, animationDefinition)
{
    this.setSyncDefaults(animationDefinition, 'dimension');

    if (animationDefinition.dimension === void null)
    {
        animationDefinition.dimension = [{}];
    }

    Utils.preprocessTimeAnimation(animStart, animDuration, animEnd, animationDefinition.dimension);
    this.preprocess3dCoordinateAnimation(animStart, animDuration, animEnd, animationDefinition.dimension,
        {'x': 1.0, 'y': 1.0, 'z': 1.0});
};

Scene.prototype.preprocessPositionAnimation = function(animStart, animDuration, animEnd, animationDefinition, defaults)
{
    //position initialization
    if (animationDefinition.position !== void null)
    {
        this.setSyncDefaults(animationDefinition, 'position');

        Utils.preprocessTimeAnimation(animStart, animDuration, animEnd, animationDefinition.position);
        this.preprocess3dCoordinateAnimation(animStart, animDuration, animEnd, animationDefinition.position, defaults);
    }
};

Scene.prototype.preprocessPivotAnimation = function(animStart, animDuration, animEnd, animationDefinition, defaults)
{
    //pivot initialization
    if (animationDefinition.pivot !== void null)
    {
        this.setSyncDefaults(animationDefinition, 'pivot');

        Utils.preprocessTimeAnimation(animStart, animDuration, animEnd, animationDefinition.pivot);
        this.preprocess3dCoordinateAnimation(animStart, animDuration, animEnd, animationDefinition.pivot, defaults);
    }
};

Scene.prototype.preprocessAnimationDefinitions = function(animStart, animDuration, animEnd, animationDefinition)
{
    var startTime = animStart;
    var endTime = animEnd;

    animStart = startTime;
    animEnd = startTime;
    animDuration = animEnd - animStart;
    this.preprocessColorAnimation(animStart, animDuration, animEnd, animationDefinition, animationDefinition.color);

    animStart = startTime;
    animEnd = startTime;
    animDuration = animEnd - animStart;
    this.preprocessAngleAnimation(animStart, animDuration, animEnd, animationDefinition);

    animStart = startTime;
    animEnd = startTime;
    animDuration = animEnd - animStart;
    this.preprocessScaleAnimation(animStart, animDuration, animEnd, animationDefinition);

    animStart = startTime;
    animEnd = startTime;
    animDuration = animEnd - animStart;
    this.preprocessPositionAnimation(animStart, animDuration, animEnd, animationDefinition, {'x': 0.0, 'y': 0.0, 'z': 0.0});

    animStart = startTime;
    animEnd = startTime;
    animDuration = animEnd - animStart;
    this.preprocessPivotAnimation(animStart, animDuration, animEnd, animationDefinition, {'x': 0.0, 'y': 0.0, 'z': 0.0});
};

Scene.prototype.addAnimation = function(animationDefinitions)
{
    if (Utils.isArray(animationDefinitions) === false)
    {
        animationDefinitions = [animationDefinitions];
    }

    var animationLayers = this.animationLayers;

    for (var animationI = 0; animationI < animationDefinitions.length; animationI++)
    {
        var animationDefinition = animationDefinitions[animationI];


        if (animationDefinition.layer === void null)
        {
            animationDefinition.layer = 1;
        }
        animationDefinition.layer = this.loader.getLayerString(animationDefinition.layer);

        if (animationLayers[animationDefinition.layer] === void null)
        {
            animationLayers[animationDefinition.layer] = new Array();
        }

        if (animationDefinition.shader !== void null)
        {
            animationDefinition.shader.ref = new Shader(animationDefinition);
            let promises = [];
            promises.push(animationDefinition.shader.ref.load());

            if (this.loader.addNotifyResource(animationDefinition.shader, promises))
            {
                //imageLoadImageAsync(animationDefinition.image);
            }

            /*
                If multiple shaders defined as an Array
                then split&duplicate Array to animationDefinition per shader

                If image/fbo type is defined then image/fbo names should be replaced with passToFbo names
            */
            /*if (Utils.isArray(animationDefinition.shader))
            {
                if (animationDefinition.passToFbo === void null)
                {
                    this.setAnimationError(animationDefinition, 'PARSE',
                        'passToFbo must be declared when declaring animation shaders as an Array.');
                    continue;
                }

                var previousFboName = void null;
                for (var i = 0; i < animationDefinition.shader.length; i++)
                {
                    var animationDefinitionDuplicate = Utils.deepCopyJson(animationDefinition);
                    animationDefinitionDuplicate.shader = Utils.deepCopyJson(animationDefinition.shader[i]);

                    if (i > 0 && previousFboName !== void null)
                    {
                        if (animationDefinitionDuplicate.fbo !== void null)
                        {
                            if (animationDefinitionDuplicate.fbo.name !== void null)
                            {
                                animationDefinitionDuplicate.fbo.name = previousFboName;
                            }
                        }
                        else if (animationDefinitionDuplicate.image !== void null)
                        {
                            var colorFboSuffix = '.color.fbo';
                            var depthFboSuffix = '.depth.fbo';

                            var imageName = animationDefinitionDuplicate.image;
                            if (imageName.indexOf(colorFboSuffix) >= 0)
                            {
                                imageName = previousFboName + colorFboSuffix;
                            }
                            else if (imageName.indexOf(depthFboSuffix) >= 0)
                            {
                                imageName = previousFboName + depthFboSuffix;
                            }

                            animationDefinitionDuplicate.image = imageName;
                        }
                    }

                    if (i < animationDefinition.shader.length - 1)
                    {
                        animationDefinitionDuplicate.passToFbo.name += '_pass_' + i;
                        this.addAnimation([animationDefinitionDuplicate]);
                    }
                    else
                    {
                        animationDefinition.shader = animationDefinitionDuplicate.shader;
                        if (animationDefinition.fbo !== void null)
                        {
                            animationDefinition.fbo.name = animationDefinitionDuplicate.fbo.name;
                        }
                        if (animationDefinition.image !== void null)
                        {
                            animationDefinition.image = animationDefinitionDuplicate.image;
                        }
                    }

                    previousFboName = animationDefinitionDuplicate.passToFbo.name;
                }
            }

            if (Utils.isArray(animationDefinition.shader.name) === false)
            {
                animationDefinition.shader.name = [animationDefinition.shader.name];
            }

            var name = animationDefinition.shader.name[animationDefinition.shader.name.length - 1];
            if (animationDefinition.shader.programName === void null)
            {
                animationDefinition.shader.programName = name;
            }

            this.loader.addNotifyResource(animationDefinition.shader.programName);*/
        }

        if (animationDefinition.passToFbo !== void null)
        {
            var fboAnimationDefinition = {'fbo': {}};

            if (animationDefinition.start !== void null)
            {
                fboAnimationDefinition.start = animationDefinition.start;
            }
            if (animationDefinition.end !== void null)
            {
                fboAnimationDefinition.end = animationDefinition.end;
            }
            if (animationDefinition.duration !== void null)
            {
                fboAnimationDefinition.duration = animationDefinition.duration;
            }

            fboAnimationDefinition.layer = animationDefinition.layer;
            if (animationDefinition.passToFbo.beginLayer !== void null)
            {
                fboAnimationDefinition.layer = animationDefinition.passToFbo.beginLayer;
            }
            fboAnimationDefinition.fbo.name = animationDefinition.passToFbo.name;
            fboAnimationDefinition.fbo.action = 'begin';
            if (animationDefinition.passToFbo.beginAction !== void null)
            {
                fboAnimationDefinition.fbo.action = animationDefinition.passToFbo.beginAction;
            }

            this.addAnimation([fboAnimationDefinition]);
        }

        if (animationDefinition.object !== void null)
        {
            animationDefinition.ref = new Model();
            let promises = [];
            promises.push(animationDefinition.ref.load(animationDefinition.object));

            this.loader.addNotifyResource(animationDefinition.object, promises);
        }
        else if (animationDefinition.text !== void null)
        {
            animationDefinition.ref = new Text();
            let promises = [];
            promises.push(animationDefinition.ref.load(animationDefinition.text.name));

            this.loader.addNotifyResource(animationDefinition.text, promises);
        }
        else if (animationDefinition.image !== void null)
        {
            animationDefinition.type = 'image';
            if (Utils.isArray(animationDefinition.image) === false)
            {
                animationDefinition.image = [animationDefinition.image];
            }

            for (var imageI = 0; imageI < animationDefinition.image.length; imageI++)
            {
                if (Utils.isString(animationDefinition.image[imageI]) === true)
                {
                    animationDefinition.image[imageI] = {'name': animationDefinition.image[imageI]};
                }
            }

            animationDefinition.ref = new Image(animationDefinition.scene);
            let promises = [];
            promises.push(animationDefinition.ref.load(animationDefinition.image[0].name));

            if (animationDefinition.image[0].video !== void null)
            {
                var video = Utils.deepCopyJson(animationDefinition.image[0].video);
                video.ref = new Video();
                promises.push(video.ref.load(animationDefinition.image[0].name));
                animationDefinition.ref.video = video;
            }

            animationDefinition.multiTexRef = [animationDefinition.ref];
            for (var imageI = 1; imageI < animationDefinition.image.length; imageI++)
            {
                var multiTexRef = new Image(animationDefinition.scene);
                promises.push(multiTexRef.load(animationDefinition.image[imageI].name));

                animationDefinition.multiTexRef.push(multiTexRef);
                if (animationDefinition.image[imageI].video !== void null)
                {
                    var video = Utils.deepCopyJson(animationDefinition.image[imageI].video);
                    video.ref = new Video();
                    promises.push(video.ref.load(animationDefinition.image[imageI].name));
                    animationDefinition.multiTexRef[imageI].video = video;
                }
            }

            if (animationDefinition.perspective === void null)
            {
                animationDefinition.perspective = '2d';
            }

            if (animationDefinition.align === void null && animationDefinition.position === void null)
            {
                animationDefinition.align = Constants.Align.CENTER;
            }

            if (this.loader.addNotifyResource(animationDefinition.image, promises))
            {
                //imageLoadImageAsync(animationDefinition.image);
            }
        }
        else if (animationDefinition.fbo !== void null)
        {
            animationDefinition.ref = Fbo.init(animationDefinition.fbo.name);
            this.loader.addNotifyResource(animationDefinition.fbo.name);
        }

        if (animationDefinition.initFunction !== void null)
        {
            this.loader.addNotifyResource(animationDefinition.initFunction);
        }

        animationLayers[animationDefinition.layer].push(animationDefinition);

        if (animationDefinition.passToFbo !== void null)
        {
            var fboAnimationDefinition = {'fbo': {}};

            if (animationDefinition.start !== void null)
            {
                fboAnimationDefinition.start = animationDefinition.start;
            }
            if (animationDefinition.end !== void null)
            {
                fboAnimationDefinition.end = animationDefinition.end;
            }
            if (animationDefinition.duration !== void null)
            {
                fboAnimationDefinition.duration = animationDefinition.duration;
            }

            fboAnimationDefinition.layer = animationDefinition.layer;
            if (animationDefinition.passToFbo.endLayer !== void null)
            {
                fboAnimationDefinition.layer = animationDefinition.passToFbo.endLayer;
            }
            fboAnimationDefinition.fbo.name = animationDefinition.passToFbo.name;
            fboAnimationDefinition.fbo.action = 'unbind';
            if (animationDefinition.passToFbo.endAction !== void null)
            {
                fboAnimationDefinition.fbo.action = animationDefinition.passToFbo.endAction;
            }

            this.addAnimation([fboAnimationDefinition]);
        }
    }

    this.animationLayers = this.loader.sortArray(animationLayers);
};

Scene.prototype.processAnimation = function()
{
    var graphics = new Graphics();

    this.animationLayers = this.loader.sortArray(this.animationLayers);
    var animationLayers = this.animationLayers;

    //threadWaitAsyncCalls();

    var startTime = 0;
    var endTime = void null;
    var durationTime = void null;

    if (this.initFunction != void null) {
        Utils.evaluateVariable(this, this.initFunction);
    }

    var input = new Input();
    for (var key in animationLayers)
    {
        if (animationLayers.hasOwnProperty(key))
        {
            var animationLayersLength = animationLayers[key].length;
            for (var animationI = 0; animationI < animationLayersLength; animationI++)
            {
                input.pollEvents();
                if (input.isUserExit()) {
                    return;
                }

                var animationDefinition = animationLayers[key][animationI];
                Utils.setTimeVariables(animationDefinition, startTime, endTime, durationTime);

                startTime = animationDefinition.start;
                endTime = animationDefinition.end;
                if (endTime !== void null) {
                    durationTime = endTime - startTime;
                }

                if (animationDefinition.sync !== void null)
                {
                    if (animationDefinition.sync.all === void null)
                    {
                        animationDefinition.sync.all = true;
                    }
                }

                if (animationDefinition.shader !== void null)
                {
                    //animationDefinition.shader.ref = Shader.load(animationDefinition.shader);
                    if (animationDefinition.shader.ref && animationDefinition.shader.ref.material) {
                        if (animationDefinition.image  && animationDefinition.perspective === '2d') {
                            animationDefinition.shader.ref.material.blending = THREE.CustomBlending;
                            animationDefinition.shader.ref.material.depthTest = false;
                            animationDefinition.shader.ref.material.depthWrite = false;
                        }
                        if (animationDefinition.ref.mesh) {
                            animationDefinition.ref.mesh.material = animationDefinition.shader.ref.material;
                        }
                    }
                    this.validateResourceLoaded(animationDefinition, animationDefinition.shader.ref,
                        'Could not load shader program ' + animationDefinition.shader.programName);
                    this.loader.notifyResourceLoaded(animationDefinition.shader.programName);
                }

                if (animationDefinition.object !== void null ||
                    animationDefinition.objectFunction !== void null)
                {
                    animationDefinition.type = 'object';
                    getScene().add(animationDefinition.ref.mesh);
                    //animationDefinition.ref = new Model();

                    if (animationDefinition.object !== void null)
                    {
                        if (animationDefinition.shape !== void null)
                        {
                            /*if (animationDefinition.shape.type === 'SPHERE')
                            {
                                var radius = 1;
                                if (animationDefinition.shape.radius !== void null)
                                {
                                    radius = animationDefinition.shape.radius;
                                }
                                var lats = 30;
                                if (animationDefinition.shape.lats !== void null)
                                {
                                    lats = animationDefinition.shape.lats;
                                }
                                var longs = 30;
                                if (animationDefinition.shape.longs !== void null)
                                {
                                    longs = animationDefinition.shape.longs;
                                }

                                animationDefinition.ref = setObjectSphereData(animationDefinition.object, radius, lats, longs);
                            }
                            else if (animationDefinition.shape.type === 'CYLINDER')
                            {
                                var base = 1;
                                if (animationDefinition.shape.base !== void null)
                                {
                                    base = animationDefinition.shape.base;
                                }
                                var top = 1;
                                if (animationDefinition.shape.top !== void null)
                                {
                                    top = animationDefinition.shape.top;
                                }
                                var height = 1;
                                if (animationDefinition.shape.height !== void null)
                                {
                                    height = animationDefinition.shape.height;
                                }
                                var slices = 30;
                                if (animationDefinition.shape.slices !== void null)
                                {
                                    slices = animationDefinition.shape.slices;
                                }
                                var stacks = 30;
                                if (animationDefinition.shape.stacks !== void null)
                                {
                                    stacks = animationDefinition.shape.stacks;
                                }

                                animationDefinition.ref = setObjectCylinderData(animationDefinition.object,
                                    base, top, height, slices, stacks);
                            }
                            else if (animationDefinition.shape.type === 'DISK')
                            {
                                var inner = 0;
                                if (animationDefinition.shape.inner !== void null)
                                {
                                    inner = animationDefinition.shape.inner;
                                }
                                var outer = 1;
                                if (animationDefinition.shape.outer !== void null)
                                {
                                    outer = animationDefinition.shape.outer;
                                }
                                var slices = 30;
                                if (animationDefinition.shape.slices !== void null)
                                {
                                    slices = animationDefinition.shape.slices;
                                }
                                var loops = 30;
                                if (animationDefinition.shape.loops !== void null)
                                {
                                    loops = animationDefinition.shape.loops;
                                }

                                animationDefinition.ref = setObjectDiskData(animationDefinition.object,
                                    inner, outer, slices, loops);
                            }
                            else if (animationDefinition.shape.type === 'CUBE')
                            {
                                animationDefinition.ref = setObjectCubeData(animationDefinition.object);
                            }
                            else if (animationDefinition.shape.type === 'MATRIX' || animationDefinition.shape.type === 'CUSTOM')
                            {
                                animationDefinition.ref = loadObjectBasicShape(animationDefinition.object,
                                    animationDefinition.shape.type);
                            }*/
                        }
                        else
                        {
                            //animationDefinition.ref.load(animationDefinition.object);
                        }

                        if (this.validateResourceLoaded(animationDefinition, animationDefinition.ref,
                            'Could not load ' + animationDefinition.object))
                        {
                            animationDefinition.ref.setLighting(animationDefinition.objectLighting);
                            animationDefinition.ref.setSimpleColors(animationDefinition.simpleColors);
                            animationDefinition.ref.setCamera(animationDefinition.objectCamera);
                        }
                    }

                    if (animationDefinition.fps === void null)
                    {
                        animationDefinition.fps = 0;
                    }
                    if (animationDefinition.camera === void null)
                    {
                        animationDefinition.camera = 'Camera01';
                    }
                    if (animationDefinition.clearDepthBuffer === void null)
                    {
                        animationDefinition.clearDepthBuffer = false;
                    }

                    animationDefinition.ref.setFps(animationDefinition.fps);
                    animationDefinition.ref.setCameraName(animationDefinition.camera);
                    animationDefinition.ref.setClearDepthBuffer(animationDefinition.clearDepthBuffer);

                    var animStart = startTime;
                    var animEnd = endTime;
                    var animDuration = animEnd - animStart;
                    this.preprocessAnimationDefinitions(animStart, animDuration, animEnd, animationDefinition);

                    if (animationDefinition.nodes !== void null) {
                        for (var nodeName in animationDefinition.nodes) {
                            var node = animationDefinition.nodes[nodeName]
                            this.preprocessAnimationDefinitions(animStart, animDuration, animEnd, node);
                        }
                    }

                    this.loader.notifyResourceLoaded(animationDefinition.object);
                }
                else if (animationDefinition.image !== void null)
                {
                    if (animationDefinition.perspective == '2d') {
                        getCamera().add(animationDefinition.ref.mesh);
                        //getScene().add(animationDefinition.ref.mesh);
                    } else {
                        getScene().add(animationDefinition.ref.mesh);
                    }

        
                    /* FIXME scene adding
                    if (animationDefinition.image[0].video !== void null)
                    {
                        var video = Utils.deepCopyJson(animationDefinition.image[0].video);
                        video.ref = new Video();
                        promises.push(video.ref.load(animationDefinition.image[0].name));
                        animationDefinition.ref.video = video;
                        animationDefinition.scene.push(animationDefinition.ref.mesh);
                    }
        
                    animationDefinition.multiTexRef = [animationDefinition.ref];
                    for (var imageI = 1; imageI < animationDefinition.image.length; imageI++)
                    {
                        var multiTexRef = new Image(animationDefinition.scene);
                        promises.push(multiTexRef.load(animationDefinition.image[imageI].name));
        
                        animationDefinition.multiTexRef.push(multiTexRef);
                        if (animationDefinition.image[imageI].video !== void null)
                        {
                            var video = Utils.deepCopyJson(animationDefinition.image[imageI].video);
                            video.ref = new Video();
                            promises.push(video.ref.load(animationDefinition.image[imageI].name));
                            animationDefinition.multiTexRef[imageI].video = video;
                        }
                    }*/
        
                    var animStart = startTime;
                    var animEnd = endTime;
                    var animDuration = animEnd - animStart;
                    this.preprocessAnimationDefinitions(animStart, animDuration, animEnd, animationDefinition);

                    var message = 'Could not load ' + animationDefinition.image[0].name;
                    this.validateResourceLoaded(animationDefinition, animationDefinition.ref, message);
                    for (var i = 0; i < animationDefinition.multiTexRef.length; i++)
                    {
                        var multiTexRef = animationDefinition.multiTexRef[i];
                        this.validateResourceLoaded(animationDefinition, multiTexRef, message);
                    }

                    this.loader.notifyResourceLoaded(animationDefinition.image[0].name);
                }
                else if (animationDefinition.text !== void null)
                {
                    animationDefinition.type = 'text';
                    if (animationDefinition.text.perspective === void null)
                    {
                        animationDefinition.text.perspective = '2d';
                    }
                    else if (animationDefinition.text.perspective === '3d')
                    {
                        if (animationDefinition.clearDepthBuffer === void null)
                        {
                            animationDefinition.clearDepthBuffer = 0;
                        }
                        else
                        {
                            animationDefinition.clearDepthBuffer = animationDefinition.clearDepthBuffer === true ? 1 : 0;
                        }
                    }

                    if (animationDefinition.text.name !== void null)
                    {
                        animationDefinition.ref.setFont(animationDefinition.text.name);
                    }
        
                    if (animationDefinition.text.string !== void null)
                    {
                        animationDefinition.ref.setValue(Utils.evaluateVariable(animationDefinition, animationDefinition.text.string));
                    }

                    if (animationDefinition.align === void null && animationDefinition.position === void null)
                    {
                        animationDefinition.align = Constants.Align.CENTER;
                    }

                    if (animationDefinition.perspective == '2d') {
                        getCamera().add(animationDefinition.ref.mesh);
                        //getScene().add(animationDefinition.ref.mesh);
                    } else {
                        getScene().add(animationDefinition.ref.mesh);
                    }

                    var animStart = startTime;
                    var animEnd = endTime;
                    var animDuration = animEnd - animStart;
                    this.preprocessAnimationDefinitions(animStart, animDuration, animEnd, animationDefinition);
                }
                else if (animationDefinition.fbo !== void null)
                {
                    animationDefinition.type = 'fbo';
                    
                    if (animationDefinition.fbo.action === 'begin') {
                        animationDefinition.ref.push();
                    } else if (animationDefinition.fbo.action === 'unbind') {
                        animationDefinition.ref.pop();
                    }

                    if (animationDefinition.fbo.name === void null)
                    {
                        animationDefinition.fbo.name = 'fbo';
                    }

                    if (this.validateResourceLoaded(animationDefinition, animationDefinition.ref,
                        'Could not load ' + animationDefinition.fbo.name))
                    {
                        if (animationDefinition.ref.id === 0)
                        {
                            animationDefinition.ref.setStoreDepth(animationDefinition.fbo.storeDepth);
                            if (animationDefinition.fbo.width !== void null && animationDefinition.fbo.height !== void null)
                            {
                                animationDefinition.ref.setDimensions(animationDefinition.fbo.width, animationDefinition.fbo.height);
                            }
                            animationDefinition.ref.generateFramebuffer();
                        }
                    }

                    animStart = startTime;
                    animEnd = startTime;
                    animDuration = animEnd - animStart;
                    this.preprocessDimensionAnimation(animStart, animDuration, animEnd, animationDefinition);

                    this.loader.notifyResourceLoaded(animationDefinition.fbo.name);
                }
                else if (animationDefinition.light !== void null)
                {
                    animationDefinition.type = 'light';
                    animationDefinition.ref = new Light(animationDefinition.light.index);

                    animStart = startTime;
                    animEnd = startTime;
                    animDuration = animEnd - animStart;
                    this.preprocessPositionAnimation(animStart, animDuration, animEnd, animationDefinition,
                        {'x': 0.0, 'y': 0.0, 'z': 1.0});

                    if (animationDefinition.ambientColor !== void null)
                    {
                        animStart = startTime;
                        animEnd = startTime;
                        animDuration = animEnd - animStart;
                        this.preprocessColorAnimation(animStart, animDuration, animEnd, animationDefinition,
                            animationDefinition.ambientColor);
                    }
                    if (animationDefinition.diffuseColor !== void null)
                    {
                        animStart = startTime;
                        animEnd = startTime;
                        animDuration = animEnd - animStart;
                        this.preprocessColorAnimation(animStart, animDuration, animEnd, animationDefinition,
                            animationDefinition.diffuseColor);
                    }
                    if (animationDefinition.specularColor !== void null)
                    {
                        animStart = startTime;
                        animEnd = startTime;
                        animDuration = animEnd - animStart;
                        this.preprocessColorAnimation(animStart, animDuration, animEnd, animationDefinition,
                            animationDefinition.specularColor);
                    }
                }
                else if (animationDefinition.camera !== void null)
                {
                    animationDefinition.type = 'camera';
                    animationDefinition.ref = new Camera();

                    animStart = startTime;
                    animEnd = startTime;
                    animDuration = animEnd - animStart;
                    this.preprocessPerspectiveAnimation(animStart, animDuration, animEnd, animationDefinition);

                    animStart = startTime;
                    animEnd = startTime;
                    animDuration = animEnd - animStart;
                    this.preprocessPositionAnimation(animStart, animDuration, animEnd, animationDefinition,
                        {'x': 0.0, 'y': 0.0, 'z': 2.0});

                    animStart = startTime;
                    animEnd = startTime;
                    animDuration = animEnd - animStart;
                    if (animationDefinition.sync !== void null && animationDefinition.sync.target === void null)
                    {
                        if (animationDefinition.sync.all === true)
                        {
                            animationDefinition.sync.target = true;
                        }
                        else
                        {
                            animationDefinition.sync.target = false;
                        }
                    }
                    Utils.preprocessTimeAnimation(animStart, animDuration, animEnd, animationDefinition.target);
                    this.preprocess3dCoordinateAnimation(animStart, animDuration, animEnd, animationDefinition.target,
                        {'x': 0.0, 'y': 0.0, 'z': 0.0});

                    animStart = startTime;
                    animEnd = startTime;
                    animDuration = animEnd - animStart;
                    if (animationDefinition.sync !== void null && animationDefinition.sync.up === void null)
                    {
                        if (animationDefinition.sync.all === true)
                        {
                            animationDefinition.sync.up = true;
                        }
                        else
                        {
                            animationDefinition.sync.up = false;
                        }
                    }
                    Utils.preprocessTimeAnimation(animStart, animDuration, animEnd, animationDefinition.up);
                    this.preprocess3dCoordinateAnimation(animStart, animDuration, animEnd, animationDefinition.up,
                        {'x': 0.0, 'y': 1.0, 'z': 0.0});
                }

                if (animationDefinition.initFunction !== void null)
                {
                    Utils.evaluateVariable(animationDefinition, animationDefinition.initFunction);
                    this.loader.notifyResourceLoaded(animationDefinition.initFunction);
                }

                if (endTime !== void null) {
                    startTime = endTime;
                }
                
                if (durationTime !== void null) {
                    endTime = startTime + durationTime;
                }

                if (graphics.handleErrors() === 1) {
                    if (animationDefinition.error === void null) {
                        animationDefinition.error = "Graphics handling error occurred during loading";
                        loggerWarning("Graphics error in: " + JSON.stringify(animationDefinition, null, 2));
                    } else {
                        loggerTrace("Graphics error in: " + JSON.stringify(animationDefinition, null, 2));
                    }
                }
            }
        }
    }
}

Scene.prototype.deinitAnimation = function()
{
    var animationLayers = this.animationLayers;
    for (var key in animationLayers)
    {
        if (animationLayers.hasOwnProperty(key))
        {
            var animationLayersLength = animationLayers[key].length;
            for (var animationI = 0; animationI < animationLayersLength; animationI++)
            {
                var animation = animationLayers[key][animationI];
                if (animation.error !== void null)
                {
                    continue; //skip animations that are in error state
                }

                if (animation.deinitFunction !== void null)
                {
                    Utils.evaluateVariable(animation, animation.deinitFunction);
                }
            }
        }
    }
}

export { Scene };
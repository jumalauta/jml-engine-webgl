import * as THREE from 'three';
import { Utils } from './Utils';
import { Sync } from './Sync';
import { TransformationMatrix, Graphics } from './Graphics';
import { Shader } from './Shader';
import { loggerInfo, processFutures } from './Bindings';
import { Timer } from './Timer';
import { Settings } from './Settings';
import { DemoRenderer } from './DemoRenderer';
import { Loader } from './Loader';

const settings = new Settings();

/** @constructor */
var Player = function()
{
};

Player.prototype.calculate3dCoordinateAnimation = function(time, animation, defaults)
{
    var obj = {
        'x': 0.0,
        'y': 0.0,
        'z': 0.0
    };
    if (defaults !== void null)
    {
        obj.x = defaults.x;
        obj.y = defaults.y;
        obj.z = defaults.z;

        if (defaults.sync === void null && animation.sync !== void null)
        {
            defaults.sync = animation.sync;
        }
    }

    if (animation !== void null)
    {
        obj.x = Utils.evaluateVariable(animation[0], animation[0].x);
        obj.y = Utils.evaluateVariable(animation[0], animation[0].y);
        obj.z = Utils.evaluateVariable(animation[0], animation[0].z);

        var timeAdjusted = time;
        if (animation.sync !== void null && defaults.sync === true)
        {
            timeAdjusted = animation.start + animation.duration * animation.sync.progress;
            if (animation.sync.progress == 0)
            {
                return obj;
            }
        }

        var _interpolate = Utils.interpolate;
        var length = animation.length;
        for (var i = 0; i < length; i++)
        {
            var coordinate = animation[i];
            if (timeAdjusted >= coordinate.start)
            {
                var p = (timeAdjusted - coordinate.start) / coordinate.duration;

                obj.x = _interpolate(p, obj.x, Utils.evaluateVariable(coordinate, coordinate.x));
                obj.y = _interpolate(p, obj.y, Utils.evaluateVariable(coordinate, coordinate.y));
                obj.z = _interpolate(p, obj.z, Utils.evaluateVariable(coordinate, coordinate.z));
            }
        }
    }

    return obj;
};

Player.prototype.calculateScaleAnimation = function(time, animation)
{
    var obj = {
        'x': 1.0,
        'y': 1.0,
        'z': 1.0
    };

    return this.calculate3dCoordinateAnimation(time, animation.scale, obj);
};

Player.prototype.calculatePositionAnimation = function(time, animation)
{
    var obj = {
        'x': 0.0,
        'y': 0.0,
        'z': 0.0
    };

    return this.calculate3dCoordinateAnimation(time, animation.position, obj);
};

Player.prototype.calculatePivotAnimation = function(time, animation)
{
    var obj = {
        'x': 0.0,
        'y': 0.0,
        'z': 0.0
    };

    return this.calculate3dCoordinateAnimation(time, animation.pivot, obj);
};

Player.prototype.calculatePerspectiveAnimation = function(time, animation)
{
    var obj = {
        'fov': settings.demo.camera.fov,
        'aspect': settings.demo.camera.aspectRatio,
        'near': settings.demo.camera.near,
        'far': settings.demo.camera.far
    };

    if (animation.perspective !== void null)
    {
        obj.fov = Utils.evaluateVariable(animation[0], animation.perspective[0].fov);
        obj.aspect = Utils.evaluateVariable(animation[0], animation.perspective[0].aspect);
        obj.near = Utils.evaluateVariable(animation[0], animation.perspective[0].near);
        obj.far = Utils.evaluateVariable(animation[0], animation.perspective[0].far);

        var timeAdjusted = time;
        if (animation.sync !== void null && animation.sync.perspective === true)
        {
            timeAdjusted = animation.start + animation.duration * animation.sync.progress;
            if (animation.sync.progress == 0)
            {
                return obj;
            }
        }

        var _interpolate = Utils.interpolate;
        var length = animation.perspective.length;
        for (var i = 0; i < length; i++)
        {
            var perspective = animation.perspective[i];
            if (timeAdjusted >= perspective.start)
            {
                var p = (timeAdjusted - perspective.start) / perspective.duration;

                obj.fov = _interpolate(p, obj.fov, Utils.evaluateVariable(perspective, perspective.fov));
                obj.aspect = _interpolate(p, obj.aspect, Utils.evaluateVariable(perspective, perspective.aspect));
                obj.near = _interpolate(p, obj.near, Utils.evaluateVariable(perspective, perspective.near));
                obj.far = _interpolate(p, obj.far, Utils.evaluateVariable(perspective, perspective.far));
            }
        }
    }

    return obj;
};

Player.prototype.calculateColorAnimation = function(time, animation, animationColor)
{
    let c = settings.demo.compatibility.oldColors ? 0xFF : 1.0;

    var obj = {
        'r': c,
        'g': c,
        'b': c,
        'a': c
    };

    if (animationColor !== void null)
    {
        obj.r = Utils.evaluateVariable(animationColor[0], animationColor[0].r);
        obj.g = Utils.evaluateVariable(animationColor[0], animationColor[0].g);
        obj.b = Utils.evaluateVariable(animationColor[0], animationColor[0].b);
        obj.a = Utils.evaluateVariable(animationColor[0], animationColor[0].a);

        var timeAdjusted = time;
        if (animation.sync !== void null && animation.sync.color === true)
        {
            timeAdjusted = animation.start + animation.duration * animation.sync.progress;
            if (animation.sync.progress == 0)
            {
                return obj;
            }
        }

        var _interpolate = Utils.interpolate;
        var length = animationColor.length;
        for (var i = 0; i < animationColor.length; i++)
        {
            var color = animationColor[i];
            if (timeAdjusted >= color.start)
            {
                var p = (timeAdjusted - color.start) / color.duration;

                obj.r = _interpolate(p, obj.r, Utils.evaluateVariable(color, color.r));
                obj.g = _interpolate(p, obj.g, Utils.evaluateVariable(color, color.g));
                obj.b = _interpolate(p, obj.b, Utils.evaluateVariable(color, color.b));
                obj.a = _interpolate(p, obj.a, Utils.evaluateVariable(color, color.a));
            }
        }
    }

    return obj;
};

Player.prototype.calculateAngleAnimation = function(time, animation)
{
    var obj = {
        'degreesX': 0,
        'degreesY': 0,
        'degreesZ': 0,
        'x': 1,
        'y': 1,
        'z': 1
    };

    if (animation.angle !== void null)
    {
        obj.degreesX = Utils.evaluateVariable(animation.angle[0], animation.angle[0].degreesX);
        obj.degreesY = Utils.evaluateVariable(animation.angle[0], animation.angle[0].degreesY);
        obj.degreesZ = Utils.evaluateVariable(animation.angle[0], animation.angle[0].degreesZ);
        obj.x = Utils.evaluateVariable(animation.angle[0], animation.angle[0].x);
        obj.y = Utils.evaluateVariable(animation.angle[0], animation.angle[0].y);
        obj.z = Utils.evaluateVariable(animation.angle[0], animation.angle[0].z);

        var timeAdjusted = time;
        if (animation.sync !== void null && animation.sync.angle === true)
        {
            timeAdjusted = animation.start + animation.duration * animation.sync.progress;
            if (animation.sync.progress == 0)
            {
                return obj;
            }
        }

        var _interpolate = Utils.interpolate;
        var length = animation.angle.length;
        for (var i = 0; i < length; i++)
        {
            var angle = animation.angle[i];
            if (timeAdjusted >= angle.start)
            {
                var p = (timeAdjusted - angle.start) / angle.duration;

                obj.degreesX = _interpolate(p, obj.degreesX, Utils.evaluateVariable(angle, angle.degreesX));
                obj.degreesY = _interpolate(p, obj.degreesY, Utils.evaluateVariable(angle, angle.degreesY));
                obj.degreesZ = _interpolate(p, obj.degreesZ, Utils.evaluateVariable(angle, angle.degreesZ));
                obj.x = _interpolate(p, obj.x, Utils.evaluateVariable(angle, angle.x));
                obj.y = _interpolate(p, obj.y, Utils.evaluateVariable(angle, angle.y));
                obj.z = _interpolate(p, obj.z, Utils.evaluateVariable(angle, angle.z));
            }
        }
    }

    return obj;
};

Player.prototype.drawImageAnimation = function(time, animation)
{
    if (animation.additive === true)
    {
        animation.ref.setBlendFunc(gl.SRC_ALPHA, gl.ONE);
    }

    var perspective2d = true;
    if (animation.perspective === '3d')
    {
        perspective2d = false;
    }
    if (!animation.omitPerspectiveChange) {
        animation.ref.setPerspective2d(perspective2d);
    }

    if (animation.canvasWidth !== void null && animation.canvasHeight !== void null)
    {
        animation.ref.setCanvasDimensions(
            Utils.evaluateVariable(animation, animation.canvasWidth),
            Utils.evaluateVariable(animation, animation.canvasHeight));
    }

    if (animation.uv !== void null)
    {
        animation.ref.setUvDimensions(
            Utils.evaluateVariable(animation, animation.uv.uMin),
            Utils.evaluateVariable(animation, animation.uv.vMin),
            Utils.evaluateVariable(animation, animation.uv.uMax),
            Utils.evaluateVariable(animation, animation.uv.vMax));
    }

    for (var multiTexI = 1; multiTexI < animation.multiTexRef.length; multiTexI++)
    {
        animation.ref.setUnitTexture(multiTexI, animation.multiTexRef[multiTexI].ptr);
    }

    if (animation.pivot !== void null)
    {
        var pivot = this.calculatePivotAnimation(time, animation);
        animation.ref.setPivot(pivot.x, pivot.y, pivot.z);
    }

    if (animation.angle !== void null)
    {
        var angle = this.calculateAngleAnimation(time, animation);
        animation.ref.setRotation(angle.degreesX, angle.degreesY, angle.degreesZ, angle.x, angle.y, angle.z);
    }

    var scale = this.calculateScaleAnimation(time, animation);
    animation.ref.setScale(scale.x, scale.y, scale.z);

    if (animation.position !== void null)
    {
        var position = this.calculatePositionAnimation(time, animation);
        var x = position.x;
        var y = position.y;
        var z = position.z;
        animation.ref.setPosition(x, y, z);
    }

    if (animation.align !== void null)
    {
        animation.ref.setCenterAlignment(animation.align);
    }

    var color = this.calculateColorAnimation(time, animation, animation.color);
    animation.ref.setColor(color.r, color.g, color.b, color.a);

    for (var videoI = 0; videoI < animation.multiTexRef.length; videoI++)
    {
        var multiTexRef = animation.multiTexRef[videoI];
        if (multiTexRef.video !== void null)
        {
            multiTexRef.video.ref.setStartTime(animation.start);

            if (multiTexRef.video.speed !== void null)
            {
                multiTexRef.video.ref.setSpeed(Utils.evaluateVariable(animation, multiTexRef.video.speed));
            }

            if (multiTexRef.video.fps !== void null)
            {
                multiTexRef.video.ref.setFps(Utils.evaluateVariable(animation, multiTexRef.video.fps));
            }

            if (multiTexRef.video.loop !== void null)
            {
                multiTexRef.video.ref.setLoop(Utils.evaluateVariable(animation, multiTexRef.video.loop));
            }

            if (multiTexRef.video.length !== void null)
            {
                multiTexRef.video.ref.setLength(Utils.evaluateVariable(animation, multiTexRef.video.length));
            }

            if (multiTexRef.video.playing === void null)
            {
                multiTexRef.video.ref.play();
                multiTexRef.video.playing = true;
            }

            if (multiTexRef.video.playing === true)
            {
                multiTexRef.video.ref.draw();
            }
        }
    }

    animation.ref.draw();
    animation.ref.setDefaults();
};

Player.prototype.drawTextAnimation = function(time, animation)
{
    animation.ref.setDefaults();

    animation.ref.setValue(Utils.evaluateVariable(animation, animation.text.string));

    if (animation.pivot !== void null)
    {
        var pivot = this.calculatePivotAnimation(time, animation);
        animation.ref.setPivot(pivot.x, pivot.y, pivot.z);
    }

    if (animation.angle !== void null)
    {
        var angle = this.calculateAngleAnimation(time, animation);
        animation.ref.setRotation(angle.degreesX, angle.degreesY, angle.degreesZ);
    }

    var scale = this.calculateScaleAnimation(time, animation);
    animation.ref.setScale(scale.x, scale.y, scale.z);

    if (animation.text.perspective === '2d')
    {
        if (animation.position !== void null)
        {
            var position = this.calculatePositionAnimation(time, animation);
            var x = position.x;
            var y = position.y;
            animation.ref.setPosition(x, y, 0);
        }

        if (animation.align !== void null)
        {
            animation.ref.setCenterAlignment(animation.align);
        }
    }
    else
    {
        if (animation.position !== void null)
        {
            var position = this.calculatePositionAnimation(time, animation);
            animation.ref.setPosition(position.x, position.y, position.z);
        }
    }

    if (animation.text.name !== void null)
    {
        animation.ref.setFont(animation.text.name);
    }

    var color = this.calculateColorAnimation(time, animation, animation.color);
    animation.ref.setColor(color.r, color.g, color.b, color.a);

    if (animation.text.perspective === '2d')
    {
        if (!animation.omitPerspectiveChange) {
            animation.ref.setPerspective2d(true);
        }
    }
    else
    {
        if (animation.clearDepthBuffer)
        {
            (new Graphics()).clearDepthBuffer();
        }

        if (!animation.omitPerspectiveChange) {
            animation.ref.setPerspective2d(false);
        }
    }

    animation.ref.draw();

    animation.ref.setDefaults();
};

Player.prototype.drawObjectAnimation = function(time, animation)
{
    var transformationMatrix = new TransformationMatrix();
    var isPushPop = false;
    if (animation.ref !== void null)
    {
        /*if (!animation.omitPerspectiveChange) {
            setPerspective3d(1);
        }*/

        animation.ref.setAnimationTime(time);

        if (animation.nodes !== void null) {
            for (var nodeName in animation.nodes) {
                var node = animation.nodes[nodeName]
                var nodeNameEvaluated = Utils.evaluateVariable(animation, nodeName);

                if (node.position !== void null)
                {
                    var position = this.calculatePositionAnimation(time, node);
                    animation.ref.setNodePosition(nodeNameEvaluated, position.x, position.y, position.z);
                }
                if (node.scale !== void null)
                {
                    var scale = this.calculateScaleAnimation(time, node);
                    animation.ref.setNodeScale(nodeNameEvaluated, scale.x, scale.y, scale.z);
                }
                if (node.angle !== void null)
                {
                    var angle = this.calculateAngleAnimation(time, node);
                    animation.ref.setNodeRotation(nodeNameEvaluated, angle.degreesX, angle.degreesY, angle.degreesZ, angle.x, angle.y, angle.z);
                }
            }
        }

        if (animation.position !== void null)
        {
            var position = this.calculatePositionAnimation(time, animation);
            animation.ref.setPosition(position.x, position.y, position.z);
        }
        if (animation.pivot !== void null)
        {
            var pivot = this.calculatePivotAnimation(time, animation);
            animation.ref.setPivot(pivot.x, pivot.y, pivot.z);
        }
        if (animation.angle !== void null)
        {
            var angle = this.calculateAngleAnimation(time, animation);
            animation.ref.setRotation(angle.degreesX, angle.degreesY, angle.degreesZ, angle.x, angle.y, angle.z);
        }
        if (animation.scale !== void null)
        {
            var scale = this.calculateScaleAnimation(time, animation);
            animation.ref.setScale(scale.x, scale.y, scale.z);
        }
        if (animation.color !== void null)
        {
            var color = this.calculateColorAnimation(time, animation, animation.color);
            animation.ref.setColor(color.r, color.g, color.b, color.a);
        }

        animation.ref.setCameraName(animation.camera);
        var fps = (time - animation.start) * animation.fps;
        if (animation.frame !== void null)
        {
            fps = animation.frame;
        }
        animation.ref.setFps(fps);

        animation.ref.setClearDepthBuffer(animation.clearDepthBuffer);

        if (animation.shape !== void null)
        {
            if (animation.shape.type === 'CUSTOM')
            {
                isPushPop = true;
            }
        }

        if (isPushPop)
        {
            transformationMatrix.push();
        }

        if (animation.clearDepthBuffer)
        {
            (new Graphics()).clearDepthBuffer();
        }

        animation.ref.draw();
    }

    if (animation.objectFunction !== void null)
    {
        Utils.evaluateVariable(animation, animation.objectFunction);
    }

    if (isPushPop)
    {
        transformationMatrix.pop();
    }
};

Player.prototype.drawFboAnimation = function(time, animation)
{
    if (animation.fbo.debugCamera === true) {
        (new DemoRenderer()).setOrbitControls(animation.ref.camera);
    }
    if (animation.fbo.dimension !== void null)
    {
        var obj = {
            'x': 1.0,
            'y': 1.0,
            'z': 1.0
        };

        var dimension = this.calculate3dCoordinateAnimation(time, animation.fbo.dimension, obj);
        animation.ref.setRenderDimensions(dimension.x, dimension.y);
    }

    if (animation.fbo.action === 'begin')
    {
        //loggerInfo("begin: " + animation.ref.ptr);
        animation.ref.push();
        animation.ref.bind();

        animation.ref.updateViewport();
        //loggerInfo("begin: " + JSON.stringify(animation, null, 2));
    }
    else if (animation.fbo.action === 'end')
    {
        //loggerInfo("end: " + animation.ref.ptr);
        animation.ref.pop();
        animation.ref.unbind();
        //loggerInfo("end: " + JSON.stringify(animation, null, 2));
        animation.ref.updateViewport();
        animation.ref.color.draw();
        /*fboUpdateViewport();

        fboBindTextures(animation.ref.ptr);

        glColor4f(1, 1, 1, 1);
        if (animation.ref.color !== void null)
        {
            setTextureSizeToScreenSize(animation.ref.color.ptr);
        }
        if (animation.ref.depth !== void null)
        {
            setTextureSizeToScreenSize(animation.ref.depth.ptr);
        }
        drawTexture(animation.ref.color.ptr);

        fboUnbindTextures(animation.ref.ptr);*/
    }
    else if (animation.fbo.action === 'unbind')
    {
        animation.ref.pop();
        animation.ref.unbind();
        animation.ref.updateViewport();
    }
    else if (animation.fbo.action === 'draw')
    {
        animation.ref.bindTextures();

        (new Graphics()).setColor(1,1,1,1);
        if (animation.ref.color !== void null)
        {
            animation.ref.color.setSizeToScreenSize();
        }
        if (animation.ref.depth !== void null)
        {
            animation.ref.depth.setSizeToScreenSize();
        }
        animation.ref.color.draw();

        animation.ref.unbindTextures();
    }
};

Player.prototype.drawLightAnimation = function(time, animation)
{
    if (animation.light.action === 'begin')
    {
        animation.ref.enable();
    }
    else if (animation.light.action === 'end')
    {
        animation.ref.disable();
    }

    if (animation.lightType !== void null)
    {
        animation.ref.setType(animation.lightType);
    }

    if (animation.generateShadowMap !== void null)
    {
        animation.ref.setGenerateShadowMap(animation.generateShadowMap);
    }

    if (animation.color !== void null)
    {
        var color = this.calculateColorAnimation(time, animation, animation.color);
        animation.ref.setColor(color.r, color.g, color.b, color.a);
    }

    /*if (animation.ambientColor !== void null)
    {
        var color = this.calculateColorAnimation(time, animation, animation.ambientColor);
        animation.ref.setAmbientColor(color.r, color.g, color.b, color.a);
    }

    if (animation.diffuseColor !== void null)
    {
        var color = this.calculateColorAnimation(time, animation, animation.diffuseColor);
        animation.ref.setDiffuseColor(color.r, color.g, color.b, color.a);
    }

    if (animation.specularColor !== void null)
    {
        var color = this.calculateColorAnimation(time, animation, animation.specularColor);
        animation.ref.setSpecularColor(color.r, color.g, color.b, color.a);
    }*/

    if (animation.position !== void null)
    {
        var position = this.calculate3dCoordinateAnimation(time, animation.position, {'x': 0, 'y': 0, 'z': 1});
        animation.ref.setPosition(position.x, position.y, position.z);
    }

    /*if (animation.direction !== void null)
    {
        var direction = this.calculate3dCoordinateAnimation(time, animation.direction, {'x': 0, 'y': 0, 'z': 0});
        animation.ref.setDirection(direction.x, direction.y, direction.z);
    }*/

    /*
    // FIXME: Fix position handling
    lightSetPositionObject(animation.light.index);
    if (animation.positionObject !== void null)
    {
        lightSetPositionObject(animation.light.index, animation.positionObject.ptr);
    }*/
    else if (animation.lightRelativePosition !== void null)
    {
        animation.positionObject = getObjectFromMemory(animation.lightRelativePosition);
    }
};

Player.prototype.drawCameraAnimation = function(time, animation)
{
    if (animation.perspective !== void null)
    {
        var perspective = this.calculatePerspectiveAnimation(time, animation);
        animation.ref.setPerspective(perspective.fov, perspective.aspect, perspective.near, perspective.far);
    }
    if (animation.position !== void null)
    {
        var position = this.calculate3dCoordinateAnimation(time, animation.position, {'x': 0, 'y': 0, 'z': 2});
        animation.ref.setPosition(position.x, position.y, position.z);
    }
    if (animation.lookAt !== void null)
    {
        var lookAt = this.calculate3dCoordinateAnimation(time, animation.lookAt, {'x': 0, 'y': 0, 'z': 0});
        animation.ref.setLookAt(lookAt.x, lookAt.y, lookAt.z);
    }
    if (animation.up !== void null)
    {
        var up = this.calculate3dCoordinateAnimation(time, animation.up, {'x': 0, 'y': 1, 'z': 0});
        animation.ref.setUpVector(up.x, up.y, up.z);
    }

    animation.ref.setPositionObject();
    if (animation.positionObject !== void null)
    {
        animation.ref.setPositionObject(animation.positionObject.ptr);
    }
    else if (animation.cameraRelativePosition !== void null)
    {
        animation.positionObject = getObjectFromMemory(animation.cameraRelativePosition);
    }

    animation.ref.setTargetObject();
    if (animation.targetObject !== void null)
    {
        animation.ref.setTargetObject(animation.targetObject.ptr);
    }
    else if (animation.cameraRelativeTarget !== void null)
    {
        animation.targetObject = getObjectFromMemory(animation.cameraRelativeTarget);
    }

    animation.ref.update();
    //(new Graphics()).viewReset();
};

// check which timeline elements are active and draw them
Player.prototype.drawAnimation = function(loader)
{
    processFutures();

    var timeline = loader.timeline;
    var scenes = loader.scenes;

    var time = (new Timer()).getTimeInSeconds();

    for (var key in timeline)
    {
        var timelineLayer = timeline[key];
        var timelineLength = timelineLayer.length;
        for (var timelineI = 0; timelineI < timelineLength; timelineI++)
        {
            var timelineElement = timelineLayer[timelineI];

            var start = Utils.evaluateVariable(timelineElement, timelineElement.start);
            var duration = Utils.evaluateVariable(timelineElement, timelineElement.duration);

            if (time >= start && (duration === void null || time < start + duration))
            {
                var sceneName = Utils.evaluateVariable(timelineElement, timelineElement.scene);
                var relativeTime = time;
                if (timelineElement.time !== void null) {
                    relativeTime = Utils.evaluateVariable(timelineElement, timelineElement.time);
                }
                this.drawSceneAnimation(scenes[sceneName], relativeTime - start);
            }

        }
    }
}

function is3dObject(obj) {
    return obj instanceof THREE.Object3D
        && !(obj instanceof THREE.Camera)
        && !(obj instanceof THREE.Scene);
}

function setAnimationVisibility(animation, visible) {
    if (animation.visible === visible) {
        return;
    }

    animation.visible = visible;
    if (animation.ref && is3dObject(animation.ref.mesh)) {
        animation.ref.mesh.visible = visible;
    }
    if (animation.props) {
        Object.values(animation.props).forEach(value => {
            if (is3dObject(value)) {
                value.visible = visible;
            } else if (value instanceof Array) {
                value.forEach(val => {
                    if (is3dObject(val)) {
                        val.visible = visible;
                    }
                });
            }
        });
    }
}

let sceneTimeFromStart = 0;
let sceneVariable = undefined;
Player.prototype.drawSceneAnimation = function(scene, time, animation)
{
    sceneTimeFromStart = time;
    const demoRenderer = new DemoRenderer();
    let fbo = null;
    if (animation && animation.scene && animation.scene.fbo) {
        //loggerInfo("fbo: " + animation.scene.fbo.name);
        fbo = animation.scene.fbo.ref;
    }

    if (fbo) {
        fbo.push();
        fbo.bind();
    } else {
        demoRenderer.setScene(scene.name);
    }

    var graphics = new Graphics();
    var transformationMatrix = new TransformationMatrix();
    //loggerDebug(scene.name + " - drawSceneAnimation: " + time);
    transformationMatrix.push();
    graphics.pushState();

    var animationLayers = scene.animationLayers;
    for (var key in animationLayers)
    {
        if (animationLayers.hasOwnProperty(key))
        {
            var animationLayersLength = animationLayers[key].length;
            for (var animationI = 0; animationI < animationLayersLength; animationI++)
            {
                var animation = animationLayers[key][animationI];

                if (time >= animation.start && (animation.end === void null || time < animation.end)) {
                    if (animation.error !== void null ) {
                        continue;
                    }

                    setAnimationVisibility(animation, true);

                    graphics.setColor(1,1,1,1);
                    Sync.calculateAnimationSync(time, animation);

                    if (animation.shader !== void null)
                    {
                        //loggerInfo("shader enable!");
                        Shader.enableShader(animation);
                    }

                    //loggerDebug((animationI+1) + "/" + animationLayersLength + ": layer: " + key + ", animation.type: " + animation.type);
                    Utils.updateProperties(animation);

                    if (animation.type === 'image')
                    {
                        this.drawImageAnimation(time, animation);
                    }
                    else if (animation.type === 'text')
                    {
                        this.drawTextAnimation(time, animation);
                    }
                    else if (animation.type === 'object')
                    {
                        this.drawObjectAnimation(time, animation);
                    }
                    else if (animation.type === 'fbo')
                    {
                        this.drawFboAnimation(time, animation);
                    }
                    else if (animation.type === 'light')
                    {
                        this.drawLightAnimation(time, animation);
                    }
                    else if (animation.type === 'camera')
                    {
                        this.drawCameraAnimation(time, animation);
                    }
                    else if (animation.type === 'scene')
                    {
                        const pushSceneVariable = sceneVariable;
                        if (animation.scene.variable !== void null)
                        {
                            sceneVariable = Utils.evaluateVariable(animation, animation.scene.variable);
                        }

                        this.drawSceneAnimation((new Loader()).scenes[animation.scene.name], time - animation.start, animation);
                        sceneVariable = pushSceneVariable;
                    }

                    if (animation.runFunction !== void null)
                    {
                        Utils.evaluateVariable(animation, animation.runFunction);
                    }

                    if (animation.shader !== void null)
                    {
                        //loggerInfo("shader disable!");
                        Shader.disableShader(animation);
                    }

                    if (graphics.handleErrors() === 1) {
                        if (animation.transientError === void null) {
                            animation.transientError = "Graphics handling error occurred runtime";
                            loggerWarning("Graphics error in: " + JSON.stringify(animation, null, 2));
                        } else {
                            loggerTrace("Graphics error in: " + JSON.stringify(animation, null, 2));
                        }
                    } else if (animation.transientError !== void null ) {
                        // error cleared
                        animation.transientError = void null;
                    }
                } else {
                    setAnimationVisibility(animation, false);
                }
            }
        }
    }

    graphics.popState();
    transformationMatrix.pop();

    if (fbo) {
        fbo.pop();
        fbo.unbind();
    } else {
        demoRenderer.renderScene();
    }
}

// Legacy method for backward compatibility
function getSceneTimeFromStart() {
    return sceneTimeFromStart;
}

function getSceneVariable() {
    return sceneVariable;
}
window.getSceneTimeFromStart = getSceneTimeFromStart;
window.getSceneVariable = getSceneVariable;

export { Player, getSceneTimeFromStart };
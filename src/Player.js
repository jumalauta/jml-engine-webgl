import * as THREE from 'three';
import { Utils } from './Utils';
import { Sync } from './Sync';
import { TransformationMatrix, Graphics } from './Graphics';
import { Shader } from './Shader';
import { loggerTrace, loggerWarning, processFutures } from './Bindings';
import { Timer } from './Timer';
import { Settings } from './Settings';
import { DemoRenderer } from './DemoRenderer';
import { Loader } from './Loader';

const settings = new Settings();

/** @constructor */
const Player = function () {};

Player.prototype.calculate3dCoordinateAnimation = function (
  time,
  animation,
  defaults
) {
  const obj = {
    x: 0.0,
    y: 0.0,
    z: 0.0
  };
  if (defaults !== undefined) {
    obj.x = defaults.x;
    obj.y = defaults.y;
    obj.z = defaults.z;

    if (defaults.sync === undefined && animation.sync !== undefined) {
      defaults.sync = animation.sync;
    }
  }

  if (animation !== undefined) {
    obj.x = Utils.evaluateVariable(animation[0], animation[0].x);
    obj.y = Utils.evaluateVariable(animation[0], animation[0].y);
    obj.z = Utils.evaluateVariable(animation[0], animation[0].z);

    let timeAdjusted = time;
    if (animation.sync !== undefined && defaults.sync === true) {
      timeAdjusted =
        animation.start + animation.duration * animation.sync.progress;
      if (animation.sync.progress === 0) {
        return obj;
      }
    }

    const _interpolate = Utils.interpolate;
    const length = animation.length;
    for (let i = 0; i < length; i++) {
      const coordinate = animation[i];
      if (timeAdjusted >= coordinate.start) {
        const p = (timeAdjusted - coordinate.start) / coordinate.duration;

        obj.x = _interpolate(
          p,
          obj.x,
          Utils.evaluateVariable(coordinate, coordinate.x)
        );
        obj.y = _interpolate(
          p,
          obj.y,
          Utils.evaluateVariable(coordinate, coordinate.y)
        );
        obj.z = _interpolate(
          p,
          obj.z,
          Utils.evaluateVariable(coordinate, coordinate.z)
        );
      }
    }
  }

  return obj;
};

Player.prototype.calculateScaleAnimation = function (time, animation) {
  const obj = {
    x: 1.0,
    y: 1.0,
    z: 1.0
  };

  return this.calculate3dCoordinateAnimation(time, animation.scale, obj);
};

Player.prototype.calculatePositionAnimation = function (time, animation) {
  const obj = {
    x: 0.0,
    y: 0.0,
    z: 0.0
  };

  return this.calculate3dCoordinateAnimation(time, animation.position, obj);
};

Player.prototype.calculatePivotAnimation = function (time, animation) {
  const obj = {
    x: 0.0,
    y: 0.0,
    z: 0.0
  };

  return this.calculate3dCoordinateAnimation(time, animation.pivot, obj);
};

Player.prototype.calculatePerspectiveAnimation = function (time, animation) {
  const obj = {
    fov: settings.demo.camera.fov,
    aspect: settings.demo.camera.aspectRatio,
    near: settings.demo.camera.near,
    far: settings.demo.camera.far
  };

  if (animation.perspective !== undefined) {
    obj.fov = Utils.evaluateVariable(
      animation[0],
      animation.perspective[0].fov
    );
    obj.aspect = Utils.evaluateVariable(
      animation[0],
      animation.perspective[0].aspect
    );
    obj.near = Utils.evaluateVariable(
      animation[0],
      animation.perspective[0].near
    );
    obj.far = Utils.evaluateVariable(
      animation[0],
      animation.perspective[0].far
    );

    let timeAdjusted = time;
    if (animation.sync !== undefined && animation.sync.perspective === true) {
      timeAdjusted =
        animation.start + animation.duration * animation.sync.progress;
      if (animation.sync.progress === 0) {
        return obj;
      }
    }

    const _interpolate = Utils.interpolate;
    const length = animation.perspective.length;
    for (let i = 0; i < length; i++) {
      const perspective = animation.perspective[i];
      if (timeAdjusted >= perspective.start) {
        const p = (timeAdjusted - perspective.start) / perspective.duration;

        obj.fov = _interpolate(
          p,
          obj.fov,
          Utils.evaluateVariable(perspective, perspective.fov)
        );
        obj.aspect = _interpolate(
          p,
          obj.aspect,
          Utils.evaluateVariable(perspective, perspective.aspect)
        );
        obj.near = _interpolate(
          p,
          obj.near,
          Utils.evaluateVariable(perspective, perspective.near)
        );
        obj.far = _interpolate(
          p,
          obj.far,
          Utils.evaluateVariable(perspective, perspective.far)
        );
      }
    }
  }

  return obj;
};

Player.prototype.calculateColorAnimation = function (
  time,
  animation,
  animationColor
) {
  const c = settings.demo.compatibility.oldColors ? 0xff : 1.0;

  const obj = {
    r: c,
    g: c,
    b: c,
    a: c
  };

  if (animationColor !== undefined) {
    obj.r = Utils.evaluateVariable(animationColor[0], animationColor[0].r);
    obj.g = Utils.evaluateVariable(animationColor[0], animationColor[0].g);
    obj.b = Utils.evaluateVariable(animationColor[0], animationColor[0].b);
    obj.a = Utils.evaluateVariable(animationColor[0], animationColor[0].a);

    let timeAdjusted = time;
    if (animation.sync !== undefined && animation.sync.color === true) {
      timeAdjusted =
        animation.start + animation.duration * animation.sync.progress;
      if (animation.sync.progress === 0) {
        return obj;
      }
    }

    const _interpolate = Utils.interpolate;
    for (let i = 0; i < animationColor.length; i++) {
      const color = animationColor[i];
      if (timeAdjusted >= color.start) {
        const p = (timeAdjusted - color.start) / color.duration;

        obj.r = _interpolate(p, obj.r, Utils.evaluateVariable(color, color.r));
        obj.g = _interpolate(p, obj.g, Utils.evaluateVariable(color, color.g));
        obj.b = _interpolate(p, obj.b, Utils.evaluateVariable(color, color.b));
        obj.a = _interpolate(p, obj.a, Utils.evaluateVariable(color, color.a));
      }
    }
  }

  return obj;
};

Player.prototype.calculateAngleAnimation = function (time, animation) {
  const obj = {
    degreesX: 0,
    degreesY: 0,
    degreesZ: 0,
    x: 1,
    y: 1,
    z: 1
  };

  if (animation.angle !== undefined) {
    obj.degreesX = Utils.evaluateVariable(
      animation.angle[0],
      animation.angle[0].degreesX
    );
    obj.degreesY = Utils.evaluateVariable(
      animation.angle[0],
      animation.angle[0].degreesY
    );
    obj.degreesZ = Utils.evaluateVariable(
      animation.angle[0],
      animation.angle[0].degreesZ
    );
    obj.x = Utils.evaluateVariable(animation.angle[0], animation.angle[0].x);
    obj.y = Utils.evaluateVariable(animation.angle[0], animation.angle[0].y);
    obj.z = Utils.evaluateVariable(animation.angle[0], animation.angle[0].z);

    let timeAdjusted = time;
    if (animation.sync !== undefined && animation.sync.angle === true) {
      timeAdjusted =
        animation.start + animation.duration * animation.sync.progress;
      if (animation.sync.progress === 0) {
        return obj;
      }
    }

    const _interpolate = Utils.interpolate;
    const length = animation.angle.length;
    for (let i = 0; i < length; i++) {
      const angle = animation.angle[i];
      if (timeAdjusted >= angle.start) {
        const p = (timeAdjusted - angle.start) / angle.duration;

        obj.degreesX = _interpolate(
          p,
          obj.degreesX,
          Utils.evaluateVariable(angle, angle.degreesX)
        );
        obj.degreesY = _interpolate(
          p,
          obj.degreesY,
          Utils.evaluateVariable(angle, angle.degreesY)
        );
        obj.degreesZ = _interpolate(
          p,
          obj.degreesZ,
          Utils.evaluateVariable(angle, angle.degreesZ)
        );
        obj.x = _interpolate(p, obj.x, Utils.evaluateVariable(angle, angle.x));
        obj.y = _interpolate(p, obj.y, Utils.evaluateVariable(angle, angle.y));
        obj.z = _interpolate(p, obj.z, Utils.evaluateVariable(angle, angle.z));
      }
    }
  }

  return obj;
};

Player.prototype.drawImageAnimation = function (time, animation) {
  if (animation.additive === true) {
    // animation.ref.setBlendFunc(gl.SRC_ALPHA, gl.ONE)
  }

  let perspective2d = true;
  if (animation.perspective === '3d') {
    perspective2d = false;
  }
  if (!animation.omitPerspectiveChange) {
    animation.ref.setPerspective2d(perspective2d);
  }

  if (
    animation.canvasWidth !== undefined &&
    animation.canvasHeight !== undefined
  ) {
    animation.ref.setCanvasDimensions(
      Utils.evaluateVariable(animation, animation.canvasWidth),
      Utils.evaluateVariable(animation, animation.canvasHeight)
    );
  }

  if (animation.uv !== undefined) {
    animation.ref.setUvDimensions(
      Utils.evaluateVariable(animation, animation.uv.uMin),
      Utils.evaluateVariable(animation, animation.uv.vMin),
      Utils.evaluateVariable(animation, animation.uv.uMax),
      Utils.evaluateVariable(animation, animation.uv.vMax)
    );
  }

  for (
    let multiTexI = 1;
    multiTexI < animation.multiTexRef.length;
    multiTexI++
  ) {
    animation.ref.setUnitTexture(
      multiTexI,
      animation.multiTexRef[multiTexI].ptr
    );
  }

  if (animation.pivot !== undefined) {
    const pivot = this.calculatePivotAnimation(time, animation);
    animation.ref.setPivot(pivot.x, pivot.y, pivot.z);
  }

  if (animation.angle !== undefined) {
    const angle = this.calculateAngleAnimation(time, animation);
    animation.ref.setRotation(
      angle.degreesX,
      angle.degreesY,
      angle.degreesZ,
      angle.x,
      angle.y,
      angle.z
    );
  }

  const scale = this.calculateScaleAnimation(time, animation);
  animation.ref.setScale(scale.x, scale.y, scale.z);

  if (animation.position !== undefined) {
    const position = this.calculatePositionAnimation(time, animation);
    const x = position.x;
    const y = position.y;
    const z = position.z;
    animation.ref.setPosition(x, y, z);
  }

  if (animation.align !== undefined) {
    animation.ref.setCenterAlignment(animation.align);
  }

  const color = this.calculateColorAnimation(time, animation, animation.color);
  animation.ref.setColor(color.r, color.g, color.b, color.a);

  for (let videoI = 0; videoI < animation.multiTexRef.length; videoI++) {
    const multiTexRef = animation.multiTexRef[videoI];
    if (multiTexRef.video !== undefined) {
      multiTexRef.video.ref.setStartTime(animation.start);

      if (multiTexRef.video.speed !== undefined) {
        multiTexRef.video.ref.setSpeed(
          Utils.evaluateVariable(animation, multiTexRef.video.speed)
        );
      }

      if (multiTexRef.video.fps !== undefined) {
        multiTexRef.video.ref.setFps(
          Utils.evaluateVariable(animation, multiTexRef.video.fps)
        );
      }

      if (multiTexRef.video.loop !== undefined) {
        multiTexRef.video.ref.setLoop(
          Utils.evaluateVariable(animation, multiTexRef.video.loop)
        );
      }

      if (multiTexRef.video.length !== undefined) {
        multiTexRef.video.ref.setLength(
          Utils.evaluateVariable(animation, multiTexRef.video.length)
        );
      }

      if (multiTexRef.video.playing === undefined) {
        multiTexRef.video.ref.play();
        multiTexRef.video.playing = true;
      }

      if (multiTexRef.video.playing === true) {
        multiTexRef.video.ref.draw();
      }
    }
  }

  animation.ref.draw();
  animation.ref.setDefaults();
};

Player.prototype.drawTextAnimation = function (time, animation) {
  animation.ref.setDefaults();

  animation.ref.setValue(
    Utils.evaluateVariable(animation, animation.text.string)
  );

  if (animation.pivot !== undefined) {
    const pivot = this.calculatePivotAnimation(time, animation);
    animation.ref.setPivot(pivot.x, pivot.y, pivot.z);
  }

  if (animation.angle !== undefined) {
    const angle = this.calculateAngleAnimation(time, animation);
    animation.ref.setRotation(angle.degreesX, angle.degreesY, angle.degreesZ);
  }

  const scale = this.calculateScaleAnimation(time, animation);
  animation.ref.setScale(scale.x, scale.y, scale.z);

  if (animation.text.perspective === '2d') {
    if (animation.position !== undefined) {
      const position = this.calculatePositionAnimation(time, animation);
      const x = position.x;
      const y = position.y;
      animation.ref.setPosition(x, y, 0);
    }

    if (animation.align !== undefined) {
      animation.ref.setCenterAlignment(animation.align);
    }
  } else {
    if (animation.position !== undefined) {
      const position = this.calculatePositionAnimation(time, animation);
      animation.ref.setPosition(position.x, position.y, position.z);
    }
  }

  if (animation.text.name !== undefined) {
    animation.ref.setFont(animation.text.name);
  }

  const color = this.calculateColorAnimation(time, animation, animation.color);
  animation.ref.setColor(color.r, color.g, color.b, color.a);

  if (animation.text.perspective === '2d') {
    if (!animation.omitPerspectiveChange) {
      animation.ref.setPerspective2d(true);
    }
  } else {
    if (animation.clearDepthBuffer) {
      new Graphics().clearDepthBuffer();
    }

    if (!animation.omitPerspectiveChange) {
      animation.ref.setPerspective2d(false);
    }
  }

  animation.ref.draw();

  animation.ref.setDefaults();
};

Player.prototype.drawObjectAnimation = function (time, animation) {
  const transformationMatrix = new TransformationMatrix();
  let isPushPop = false;
  if (animation.ref !== undefined) {
    /* if (!animation.omitPerspectiveChange) {
            setPerspective3d(1);
        } */

    animation.ref.setAnimationTime(time);

    if (animation.nodes !== undefined) {
      for (const nodeName in animation.nodes) {
        const node = animation.nodes[nodeName];
        const nodeNameEvaluated = Utils.evaluateVariable(animation, nodeName);

        if (node.position !== undefined) {
          const position = this.calculatePositionAnimation(time, node);
          animation.ref.setNodePosition(
            nodeNameEvaluated,
            position.x,
            position.y,
            position.z
          );
        }
        if (node.scale !== undefined) {
          const scale = this.calculateScaleAnimation(time, node);
          animation.ref.setNodeScale(
            nodeNameEvaluated,
            scale.x,
            scale.y,
            scale.z
          );
        }
        if (node.angle !== undefined) {
          const angle = this.calculateAngleAnimation(time, node);
          animation.ref.setNodeRotation(
            nodeNameEvaluated,
            angle.degreesX,
            angle.degreesY,
            angle.degreesZ,
            angle.x,
            angle.y,
            angle.z
          );
        }
      }
    }

    if (animation.position !== undefined) {
      const position = this.calculatePositionAnimation(time, animation);
      animation.ref.setPosition(position.x, position.y, position.z);
    }
    if (animation.pivot !== undefined) {
      const pivot = this.calculatePivotAnimation(time, animation);
      animation.ref.setPivot(pivot.x, pivot.y, pivot.z);
    }
    if (animation.angle !== undefined) {
      const angle = this.calculateAngleAnimation(time, animation);
      animation.ref.setRotation(
        angle.degreesX,
        angle.degreesY,
        angle.degreesZ,
        angle.x,
        angle.y,
        angle.z
      );
    }
    if (animation.scale !== undefined) {
      const scale = this.calculateScaleAnimation(time, animation);
      animation.ref.setScale(scale.x, scale.y, scale.z);
    }
    if (animation.color !== undefined) {
      const color = this.calculateColorAnimation(
        time,
        animation,
        animation.color
      );
      animation.ref.setColor(color.r, color.g, color.b, color.a);
    }

    animation.ref.setCameraName(animation.camera);
    let fps = (time - animation.start) * animation.fps;
    if (animation.frame !== undefined) {
      fps = animation.frame;
    }
    animation.ref.setFps(fps);

    animation.ref.setClearDepthBuffer(animation.clearDepthBuffer);

    if (animation.shape !== undefined) {
      if (animation.shape.type === 'CUSTOM') {
        isPushPop = true;
      }
    }

    if (isPushPop) {
      transformationMatrix.push();
    }

    if (animation.clearDepthBuffer) {
      new Graphics().clearDepthBuffer();
    }

    animation.ref.draw();
  }

  if (animation.objectFunction !== undefined) {
    Utils.evaluateVariable(animation, animation.objectFunction);
  }

  if (isPushPop) {
    transformationMatrix.pop();
  }
};

Player.prototype.drawFboAnimation = function (time, animation) {
  if (animation.fbo.debugCamera === true) {
    new DemoRenderer().setOrbitControls(animation.ref.camera);
  }
  if (animation.fbo.dimension !== undefined) {
    const obj = {
      x: 1.0,
      y: 1.0,
      z: 1.0
    };

    const dimension = this.calculate3dCoordinateAnimation(
      time,
      animation.fbo.dimension,
      obj
    );
    animation.ref.setRenderDimensions(dimension.x, dimension.y);
  }

  if (animation.fbo.action === 'begin') {
    // loggerInfo("begin: " + animation.ref.ptr);
    animation.ref.push();
    animation.ref.bind();

    animation.ref.updateViewport();
    // loggerInfo("begin: " + JSON.stringify(animation, null, 2));
  } else if (animation.fbo.action === 'end') {
    // loggerInfo("end: " + animation.ref.ptr);
    animation.ref.pop();
    animation.ref.unbind();
    // loggerInfo("end: " + JSON.stringify(animation, null, 2));
    animation.ref.updateViewport();
    animation.ref.color.draw();
    /* fboUpdateViewport();

        fboBindTextures(animation.ref.ptr);

        glColor4f(1, 1, 1, 1);
        if (animation.ref.color !== undefined)
        {
            setTextureSizeToScreenSize(animation.ref.color.ptr);
        }
        if (animation.ref.depth !== undefined)
        {
            setTextureSizeToScreenSize(animation.ref.depth.ptr);
        }
        drawTexture(animation.ref.color.ptr);

        fboUnbindTextures(animation.ref.ptr); */
  } else if (animation.fbo.action === 'unbind') {
    animation.ref.pop();
    animation.ref.unbind();
    animation.ref.updateViewport();
  } else if (animation.fbo.action === 'draw') {
    animation.ref.bindTextures();

    new Graphics().setColor(1, 1, 1, 1);
    if (animation.ref.color !== undefined) {
      animation.ref.color.setSizeToScreenSize();
    }
    if (animation.ref.depth !== undefined) {
      animation.ref.depth.setSizeToScreenSize();
    }
    animation.ref.color.draw();

    animation.ref.unbindTextures();
  }
};

Player.prototype.drawLightAnimation = function (time, animation) {
  if (animation.light.action === 'begin') {
    animation.ref.enable();
  } else if (animation.light.action === 'end') {
    animation.ref.disable();
  }

  if (animation.lightType !== undefined) {
    animation.ref.setType(animation.lightType);
  }

  if (animation.generateShadowMap !== undefined) {
    animation.ref.setGenerateShadowMap(animation.generateShadowMap);
  }

  if (animation.color !== undefined) {
    const color = this.calculateColorAnimation(
      time,
      animation,
      animation.color
    );
    animation.ref.setColor(color.r, color.g, color.b, color.a);
  }

  /* if (animation.ambientColor !== undefined)
    {
        var color = this.calculateColorAnimation(time, animation, animation.ambientColor);
        animation.ref.setAmbientColor(color.r, color.g, color.b, color.a);
    }

    if (animation.diffuseColor !== undefined)
    {
        var color = this.calculateColorAnimation(time, animation, animation.diffuseColor);
        animation.ref.setDiffuseColor(color.r, color.g, color.b, color.a);
    }

    if (animation.specularColor !== undefined)
    {
        var color = this.calculateColorAnimation(time, animation, animation.specularColor);
        animation.ref.setSpecularColor(color.r, color.g, color.b, color.a);
    } */

  if (animation.position !== undefined) {
    const position = this.calculate3dCoordinateAnimation(
      time,
      animation.position,
      { x: 0, y: 0, z: 1 }
    );
    animation.ref.setPosition(position.x, position.y, position.z);
  } else if (animation.lightRelativePosition !== undefined) {
    /* if (animation.direction !== undefined)
    {
        var direction = this.calculate3dCoordinateAnimation(time, animation.direction, {'x': 0, 'y': 0, 'z': 0});
        animation.ref.setDirection(direction.x, direction.y, direction.z);
    } */
    /*
    // FIXME: Fix position handling
    lightSetPositionObject(animation.light.index);
    if (animation.positionObject !== undefined)
    {
        lightSetPositionObject(animation.light.index, animation.positionObject.ptr);
    } */
    /* animation.positionObject = getObjectFromMemory(
      animation.lightRelativePosition
    ) */
  }
};

Player.prototype.drawCameraAnimation = function (time, animation) {
  if (animation.perspective !== undefined) {
    const perspective = this.calculatePerspectiveAnimation(time, animation);
    animation.ref.setPerspective(
      perspective.fov,
      perspective.aspect,
      perspective.near,
      perspective.far
    );
  }
  if (animation.position !== undefined) {
    const position = this.calculate3dCoordinateAnimation(
      time,
      animation.position,
      { x: 0, y: 0, z: 2 }
    );
    animation.ref.setPosition(position.x, position.y, position.z);
  }
  if (animation.lookAt !== undefined) {
    const lookAt = this.calculate3dCoordinateAnimation(time, animation.lookAt, {
      x: 0,
      y: 0,
      z: 0
    });
    animation.ref.setLookAt(lookAt.x, lookAt.y, lookAt.z);
  }
  if (animation.up !== undefined) {
    const up = this.calculate3dCoordinateAnimation(time, animation.up, {
      x: 0,
      y: 1,
      z: 0
    });
    animation.ref.setUpVector(up.x, up.y, up.z);
  }

  animation.ref.setPositionObject();
  if (animation.positionObject !== undefined) {
    animation.ref.setPositionObject(animation.positionObject.ptr);
  } /* else if (animation.cameraRelativePosition !== undefined) {
    animation.positionObject = getObjectFromMemory(
      animation.cameraRelativePosition
    )
  } */

  animation.ref.setTargetObject();
  if (animation.targetObject !== undefined) {
    animation.ref.setTargetObject(animation.targetObject.ptr);
  } /* else if (animation.cameraRelativeTarget !== undefined) {
    animation.targetObject = getObjectFromMemory(
      animation.cameraRelativeTarget
    )
  } */

  animation.ref.update();
  // (new Graphics()).viewReset();
};

// check which timeline elements are active and draw them
Player.prototype.drawAnimation = function (loader) {
  processFutures();

  const timeline = loader.timeline;
  const scenes = loader.scenes;

  const time = new Timer().getTimeInSeconds();

  for (const key in timeline) {
    const timelineLayer = timeline[key];
    const timelineLength = timelineLayer.length;
    for (let timelineI = 0; timelineI < timelineLength; timelineI++) {
      const timelineElement = timelineLayer[timelineI];

      const start = Utils.evaluateVariable(
        timelineElement,
        timelineElement.start
      );
      const duration = Utils.evaluateVariable(
        timelineElement,
        timelineElement.duration
      );

      if (
        time >= start &&
        (duration === undefined || time < start + duration)
      ) {
        const sceneName = Utils.evaluateVariable(
          timelineElement,
          timelineElement.scene
        );
        let relativeTime = time;
        if (timelineElement.time !== undefined) {
          relativeTime = Utils.evaluateVariable(
            timelineElement,
            timelineElement.time
          );
        }
        this.drawSceneAnimation(scenes[sceneName], relativeTime - start);
      }
    }
  }
};

function is3dObject(obj) {
  return (
    obj instanceof THREE.Object3D &&
    !(obj instanceof THREE.Camera) &&
    !(obj instanceof THREE.Scene)
  );
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
    Object.values(animation.props).forEach((value) => {
      if (is3dObject(value)) {
        value.visible = visible;
      } else if (value instanceof Array) {
        value.forEach((val) => {
          if (is3dObject(val)) {
            val.visible = visible;
          }
        });
      }
    });
  }
}

let sceneTimeFromStart = 0;
let sceneVariable;
Player.prototype.drawSceneAnimation = function (
  scene,
  time,
  animationDefinition
) {
  sceneTimeFromStart = time;
  const demoRenderer = new DemoRenderer();
  let fbo = null;
  if (
    animationDefinition &&
    animationDefinition.scene &&
    animationDefinition.scene.fbo
  ) {
    // loggerInfo("fbo: " + animation.scene.fbo.name);
    fbo = animationDefinition.scene.fbo.ref;
  }

  if (fbo) {
    fbo.push();
    fbo.bind();
  } else {
    demoRenderer.setScene(scene.name);
  }

  const graphics = new Graphics();
  const transformationMatrix = new TransformationMatrix();
  // loggerDebug(scene.name + " - drawSceneAnimation: " + time);
  transformationMatrix.push();
  graphics.pushState();

  const animationLayers = scene.animationLayers;
  for (const key in animationLayers) {
    if (animationLayers[key] !== undefined) {
      const animationLayersLength = animationLayers[key].length;
      for (
        let animationI = 0;
        animationI < animationLayersLength;
        animationI++
      ) {
        const animation = animationLayers[key][animationI];

        if (
          time >= animation.start &&
          (animation.end === undefined || time < animation.end)
        ) {
          if (animation.error !== undefined) {
            continue;
          }

          setAnimationVisibility(animation, true);

          graphics.setColor(1, 1, 1, 1);
          Sync.calculateAnimationSync(time, animation);

          if (animation.shader !== undefined) {
            // loggerInfo("shader enable!");
            Shader.enableShader(animation);
          }

          // loggerDebug((animationI+1) + "/" + animationLayersLength + ": layer: " + key + ", animation.type: " + animation.type);
          Utils.updateProperties(animation);

          if (animation.type === 'image') {
            this.drawImageAnimation(time, animation);
          } else if (animation.type === 'text') {
            this.drawTextAnimation(time, animation);
          } else if (animation.type === 'object') {
            this.drawObjectAnimation(time, animation);
          } else if (animation.type === 'fbo') {
            this.drawFboAnimation(time, animation);
          } else if (animation.type === 'light') {
            this.drawLightAnimation(time, animation);
          } else if (animation.type === 'camera') {
            this.drawCameraAnimation(time, animation);
          } else if (animation.type === 'scene') {
            const pushSceneVariable = sceneVariable;
            if (animation.scene.variable !== undefined) {
              sceneVariable = Utils.evaluateVariable(
                animation,
                animation.scene.variable
              );
            }

            this.drawSceneAnimation(
              new Loader().scenes[animation.scene.name],
              time - animation.start,
              animation
            );
            sceneVariable = pushSceneVariable;
          }

          if (animation.runFunction !== undefined) {
            Utils.evaluateVariable(animation, animation.runFunction);
          }

          if (animation.shader !== undefined) {
            // loggerInfo("shader disable!");
            Shader.disableShader(animation);
          }

          if (graphics.handleErrors() === 1) {
            if (animation.transientError === undefined) {
              animation.transientError =
                'Graphics handling error occurred runtime';
              loggerWarning(
                'Graphics error in: ' + JSON.stringify(animation, null, 2)
              );
            } else {
              loggerTrace(
                'Graphics error in: ' + JSON.stringify(animation, null, 2)
              );
            }
          } else if (animation.transientError !== undefined) {
            // error cleared
            animation.transientError = undefined;
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
};

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

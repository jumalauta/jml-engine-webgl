import * as THREE from 'three';
import { Utils } from './Utils';
import { Shader } from './Shader';
import { Timer } from './Timer';
import { Settings } from './Settings';
import { DemoRenderer } from './DemoRenderer';
import { Loader } from './Loader';
import { DmxLightManager } from './DmxLightManager';

window.DmxLightManager = DmxLightManager;

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

Player.prototype.calculatePerspectiveAnimation = function (time, animation) {
  const obj = {
    fov: settings.demo.camera.fov,
    aspect: settings.demo.camera.aspectRatio,
    near: settings.demo.camera.near,
    far: settings.demo.camera.far,
    zoom: settings.demo.camera.zoom
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
    obj.zoom = Utils.evaluateVariable(
      animation[0],
      animation.perspective[0].zoom
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
        obj.zoom = _interpolate(
          p,
          obj.zoom,
          Utils.evaluateVariable(perspective, perspective.zoom)
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

  for (let videoI = 0; videoI < animation.ref.texture.length; videoI++) {
    const multiTexRef = animation.ref.texture[videoI];
    if (multiTexRef.video !== undefined) {
      const videoDefinition = animation.image[videoI].video;
      multiTexRef.video.setStartTime(animation.start);

      if (videoDefinition.time !== undefined) {
        multiTexRef.video.setAnimationTime(
          Utils.evaluateVariable(animation, videoDefinition.time)
        );
      }

      if (videoDefinition.speed !== undefined) {
        multiTexRef.video.setSpeed(
          Utils.evaluateVariable(animation, videoDefinition.speed)
        );
      }

      if (videoDefinition.fps !== undefined) {
        multiTexRef.video.setFps(
          Utils.evaluateVariable(animation, videoDefinition.fps)
        );
      }

      if (videoDefinition.loop !== undefined) {
        multiTexRef.video.setLoop(
          Utils.evaluateVariable(animation, videoDefinition.loop)
        );
      }

      if (videoDefinition.length !== undefined) {
        multiTexRef.video.setLength(
          Utils.evaluateVariable(animation, videoDefinition.length)
        );
      }

      if (!multiTexRef.video.isPlaying()) {
        multiTexRef.video.play();
      }

      if (multiTexRef.video.isPlaying()) {
        multiTexRef.video.draw();
      }
    }
  }

  animation.ref.draw(time);
  animation.ref.setDefaults();
};

Player.prototype.drawTextAnimation = function (time, animation) {
  animation.ref.setDefaults();

  animation.ref.setValue(
    Utils.evaluateVariable(animation, animation.text.string)
  );

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

  animation.ref.draw(time);

  animation.ref.setDefaults();
};

Player.prototype.drawObjectAnimation = function (time, animation) {
  if (animation.ref !== undefined) {
    if (animation.object.animations !== undefined) {
      for (const animationName in animation.object.animations) {
        const animationData = animation.object.animations[animationName];
        animation.ref.play(animationName);
        if (animationData.weight !== undefined) {
          animation.ref.setWeight(
            animationName,
            Utils.evaluateVariable(animation, animationData.weight)
          );
        }
        if (animationData.timeScale !== undefined) {
          animation.ref.setTimeScale(
            animationName,
            Utils.evaluateVariable(animation, animationData.timescale)
          );
        }
        if (animationData.enabled !== undefined) {
          animation.ref.setEnabled(
            animationName,
            Utils.evaluateVariable(animation, animationData.enabled)
          );
        }
        if (animationData.loop !== undefined) {
          animation.ref.setLoop(
            animationName,
            Utils.evaluateVariable(animation, animationData.loop)
          );
        }
      }
    }

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
    } else {
      animation.ref.setPosition(0, 0, 0);
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
    } else {
      animation.ref.setRotation(0, 0, 0, 1, 1, 1);
    }
    if (animation.scale !== undefined) {
      const scale = this.calculateScaleAnimation(time, animation);
      animation.ref.setScale(scale.x, scale.y, scale.z);
    } else {
      animation.ref.setScale(1, 1, 1);
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

    if (animation.object.time !== undefined) {
      animation.ref.setAnimationTime(
        Utils.evaluateVariable(animation, animation.object.time)
      );
    } else {
      animation.ref.setAnimationTime(time);
    }

    animation.ref.draw(time);
  }

  if (animation.objectFunction !== undefined) {
    Utils.evaluateVariable(animation, animation.objectFunction);
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
    animation.ref.push();
    animation.ref.bind();
  } else if (animation.fbo.action === 'end') {
    animation.ref.pop();
    animation.ref.unbind();
    animation.ref.color.draw();
  } else if (animation.fbo.action === 'unbind') {
    animation.ref.pop();
    animation.ref.unbind();
  } else if (animation.fbo.action === 'draw') {
    if (animation.ref.color !== undefined) {
      animation.ref.color.setSizeToScreenSize();
    }
    if (animation.ref.depth !== undefined) {
      animation.ref.depth.setSizeToScreenSize();
    }
    animation.ref.color.draw();
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

  if (animation.position !== undefined) {
    const position = this.calculate3dCoordinateAnimation(
      time,
      animation.position,
      { x: 0, y: 0, z: 1 }
    );
    animation.ref.setPosition(position.x, position.y, position.z);
  }
};

Player.prototype.drawCameraAnimation = function (time, animation) {
  if (animation.perspective !== undefined) {
    const perspective = this.calculatePerspectiveAnimation(time, animation);
    animation.ref.setPerspective(
      perspective.fov,
      perspective.aspect,
      perspective.near,
      perspective.far,
      perspective.zoom
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
  if (animation.angle !== undefined) {
    const angle = this.calculateAngleAnimation(time, animation);
    animation.ref.setRotation(angle.degreesX, angle.degreesY, angle.degreesZ);
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
  }

  animation.ref.setTargetObject();
  if (animation.targetObject !== undefined) {
    animation.ref.setTargetObject(animation.targetObject.ptr);
  }

  animation.ref.update();
};

// check which timeline elements are active and draw them
Player.prototype.drawAnimation = function (loader) {
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

Player.prototype.is3dObject = function (obj) {
  return (
    obj instanceof THREE.Object3D &&
    !(obj instanceof THREE.Camera) &&
    !(obj instanceof THREE.Scene)
  );
};

Player.prototype.setAnimationVisibility = function (animation, visible) {
  if (animation.visible === visible) {
    return;
  }

  animation.visible = visible;
  if (animation.ref && this.is3dObject(animation.ref.mesh)) {
    animation.ref.mesh.visible = visible;
  }
  if (animation.props) {
    Object.values(animation.props).forEach((value) => {
      if (this.is3dObject(value)) {
        value.visible = visible;
      } else if (value instanceof Array) {
        value.forEach((val) => {
          if (this.is3dObject(val)) {
            val.visible = visible;
          }
        });
      }
    });
  }
};

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

        const startTime = animation.start;

        if (time >= startTime && time < animation.end) {
          if (animation.error !== undefined) {
            continue;
          }

          this.setAnimationVisibility(animation, true);

          const currentTime =
            animation.time !== undefined
              ? startTime + Utils.evaluateVariable(animation, animation.time)
              : time;

          if (currentTime < startTime || currentTime >= animation.end) {
            this.setAnimationVisibility(animation, false);
            continue;
          }

          sceneTimeFromStart = currentTime;

          if (animation.shader !== undefined) {
            Shader.enableShader(animation);
          }

          // loggerDebug((animationI+1) + "/" + animationLayersLength + ": layer: " + key + ", animation.type: " + animation.type);
          Utils.updateProperties(animation);

          if (animation.runPreFunction !== undefined) {
            Utils.evaluateVariable(animation, animation.runPreFunction);
          }

          if (animation.type === 'image') {
            this.drawImageAnimation(currentTime, animation);
          } else if (animation.type === 'text') {
            this.drawTextAnimation(currentTime, animation);
          } else if (animation.type === 'object') {
            this.drawObjectAnimation(currentTime, animation);
          } else if (animation.type === 'fbo') {
            this.drawFboAnimation(currentTime, animation);
          } else if (animation.type === 'light') {
            this.drawLightAnimation(currentTime, animation);
          } else if (animation.type === 'camera') {
            this.drawCameraAnimation(currentTime, animation);
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
              currentTime - startTime,
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
        } else {
          this.setAnimationVisibility(animation, false);
        }
      }
    }
  }

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

function getDeltaTime() {
  return new Timer().getDeltaTime();
}
function getSceneVariable() {
  return sceneVariable;
}
window.getSceneTimeFromStart = getSceneTimeFromStart;
window.getSceneVariable = getSceneVariable;
window.getDeltaTime = getDeltaTime;
export { Player, getSceneTimeFromStart };

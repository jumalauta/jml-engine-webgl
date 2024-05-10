import { Utils, Constants } from './Utils';
import { Graphics } from './Graphics';
import { Input } from './Input';
import { Image } from './Image';
import { Shader } from './Shader';
import { Model } from './Model';
import { Text } from './Text';
import { Fbo } from './Fbo';
import { Light } from './Light';
import { Camera } from './Camera';
import {
  windowSetTitle,
  loggerError,
  loggerWarning,
  loggerTrace
} from './Bindings';
import { Settings } from './Settings';

import * as THREE from 'three';

const settings = new Settings();

/** @constructor */
const Scene = function (name, loader) {
  this.name = name;
  this.loader = loader;
  this.animationLayers = {};

  this.initFunction = undefined;
  this.fboName = name + 'SceneFbo';
  this.fboStart = { name: this.fboName, action: 'begin' };
  this.fboEnd = { name: this.fboName, action: 'unbind' };
  this.renderScene = [];
};

Scene.prototype.validateResourceLoaded = function (
  animationDefinition,
  animationDefinitionRef,
  errorMessage
) {
  if (
    animationDefinition === undefined ||
    animationDefinitionRef === undefined ||
    animationDefinitionRef.ptr === undefined
  ) {
    this.setAnimationError(animationDefinition, 'RESOURCE', errorMessage);
    return false;
  }

  return true;
};

Scene.prototype.setAnimationError = function (
  animationDefinition,
  errorType,
  errorMessage
) {
  windowSetTitle(errorType + ' ERROR');
  animationDefinition.error = errorMessage;
  loggerError(errorType + ' ERROR: ' + errorMessage);
  // loggerError('ERROR JSON: ' + JSON.stringify(animationDefinition, null, 2));
};

Scene.prototype.preprocess3dCoordinateAnimation = function (
  animStart,
  animDuration,
  animEnd,
  animationDefinition,
  defaults
) {
  if (animationDefinition !== undefined) {
    let x = 0;
    let y = 0;
    let z = 0;
    if (defaults !== undefined) {
      x = defaults.x;
      y = defaults.y;
      z = defaults.z;
    }

    for (let i = 0; i < animationDefinition.length; i++) {
      const coordinate = animationDefinition[i];

      if (coordinate.x === undefined) {
        coordinate.x = x;
      }
      if (coordinate.y === undefined) {
        coordinate.y = y;
      }
      if (coordinate.z === undefined) {
        coordinate.z = z;
      }

      x = coordinate.x;
      y = coordinate.y;
      z = coordinate.z;
    }
  }
};

Scene.prototype.setSyncDefaults = function (animationDefinition, syncType) {
  if (
    animationDefinition.sync !== undefined &&
    animationDefinition.sync[syncType] === undefined
  ) {
    if (animationDefinition.sync.all === true) {
      animationDefinition.sync[syncType] = true;
    } else {
      animationDefinition.sync[syncType] = false;
    }
  }
};

Scene.prototype.preprocessColorAnimation = function (
  animStart,
  animDuration,
  animEnd,
  animationDefinition,
  animationDefinitionColor
) {
  this.setSyncDefaults(animationDefinition, 'color');

  const c = settings.demo.compatibility.oldColors ? 0xff : 1.0;

  let r = c;
  let g = c;
  let b = c;
  let a = c;
  if (animationDefinitionColor === undefined) {
    animationDefinitionColor = [{}];
  }

  Utils.preprocessTimeAnimation(
    animStart,
    animDuration,
    animEnd,
    animationDefinitionColor
  );

  for (let i = 0; i < animationDefinitionColor.length; i++) {
    const color = animationDefinitionColor[i];

    if (color.r === undefined) {
      color.r = r;
    }
    if (color.g === undefined) {
      color.g = g;
    }
    if (color.b === undefined) {
      color.b = b;
    }
    if (color.a === undefined) {
      color.a = a;
    }

    r = color.r;
    g = color.g;
    b = color.b;
    a = color.a;
  }
};

Scene.prototype.preprocessAngleAnimation = function (
  animStart,
  animDuration,
  animEnd,
  animationDefinition
) {
  if (animationDefinition.angle !== undefined) {
    this.setSyncDefaults(animationDefinition, 'angle');

    Utils.preprocessTimeAnimation(
      animStart,
      animDuration,
      animEnd,
      animationDefinition.angle
    );
    this.preprocess3dCoordinateAnimation(
      animStart,
      animDuration,
      animEnd,
      animationDefinition.angle,
      { x: 1.0, y: 1.0, z: 1.0 }
    );

    let degreesX = 0;
    let degreesY = 0;
    let degreesZ = 0;
    for (let i = 0; i < animationDefinition.angle.length; i++) {
      const angle = animationDefinition.angle[i];

      if (angle.degreesX === undefined) {
        angle.degreesX = degreesX;
      }
      if (angle.degreesY === undefined) {
        angle.degreesY = degreesY;
      }
      if (angle.degreesZ === undefined) {
        angle.degreesZ = degreesZ;
      }

      if (angle.pivot !== undefined) {
        this.setAnimationError(
          animationDefinition,
          'PARSE',
          'angle.pivot is deprecated. move pivot under animation.'
        );
      }

      degreesX = angle.degreesX;
      degreesY = angle.degreesY;
      degreesZ = angle.degreesZ;
    }
  }
};

Scene.prototype.preprocessPerspectiveAnimation = function (
  animStart,
  animDuration,
  animEnd,
  animationDefinition
) {
  this.setSyncDefaults(animationDefinition, 'perspective');

  if (animationDefinition.perspective === undefined) {
    animationDefinition.perspective = [{}];
  }

  Utils.preprocessTimeAnimation(
    animStart,
    animDuration,
    animEnd,
    animationDefinition.perspective
  );

  let fov = settings.demo.camera.fov;
  let aspect = settings.demo.camera.aspectRatio;
  let near = settings.demo.camera.near;
  let far = settings.demo.camera.far;

  for (let i = 0; i < animationDefinition.perspective.length; i++) {
    const perspective = animationDefinition.perspective[i];

    if (perspective.fov === undefined) {
      perspective.fov = fov;
    }
    if (perspective.aspect === undefined) {
      perspective.aspect = aspect;
    }
    if (perspective.near === undefined) {
      perspective.near = near;
    }
    if (perspective.far === undefined) {
      perspective.far = far;
    }

    fov = perspective.fov;
    aspect = perspective.aspect;
    near = perspective.near;
    far = perspective.far;
  }
};

Scene.prototype.preprocessScaleAnimation = function (
  animStart,
  animDuration,
  animEnd,
  animationDefinition
) {
  this.setSyncDefaults(animationDefinition, 'scale');

  if (animationDefinition.scale === undefined) {
    animationDefinition.scale = [{}];
  }

  for (let i = 0; i < animationDefinition.scale.length; i++) {
    const scale = animationDefinition.scale[i];
    if (scale.uniform3d !== undefined) {
      scale.x = scale.uniform3d;
      scale.y = scale.uniform3d;
      scale.z = scale.uniform3d;
    } else if (scale.uniform2d !== undefined) {
      scale.x = scale.uniform2d;
      scale.y = scale.uniform2d;
    }
  }

  Utils.preprocessTimeAnimation(
    animStart,
    animDuration,
    animEnd,
    animationDefinition.scale
  );
  this.preprocess3dCoordinateAnimation(
    animStart,
    animDuration,
    animEnd,
    animationDefinition.scale,
    { x: 1.0, y: 1.0, z: 1.0 }
  );
};

Scene.prototype.preprocessDimensionAnimation = function (
  animStart,
  animDuration,
  animEnd,
  animationDefinition
) {
  this.setSyncDefaults(animationDefinition, 'dimension');

  if (animationDefinition.dimension === undefined) {
    animationDefinition.dimension = [{}];
  }

  Utils.preprocessTimeAnimation(
    animStart,
    animDuration,
    animEnd,
    animationDefinition.dimension
  );
  this.preprocess3dCoordinateAnimation(
    animStart,
    animDuration,
    animEnd,
    animationDefinition.dimension,
    { x: 1.0, y: 1.0, z: 1.0 }
  );
};

Scene.prototype.preprocessPositionAnimation = function (
  animStart,
  animDuration,
  animEnd,
  animationDefinition,
  defaults
) {
  // position initialization
  if (animationDefinition.position !== undefined) {
    this.setSyncDefaults(animationDefinition, 'position');

    Utils.preprocessTimeAnimation(
      animStart,
      animDuration,
      animEnd,
      animationDefinition.position
    );
    this.preprocess3dCoordinateAnimation(
      animStart,
      animDuration,
      animEnd,
      animationDefinition.position,
      defaults
    );
  }
};

Scene.prototype.preprocessPivotAnimation = function (
  animStart,
  animDuration,
  animEnd,
  animationDefinition,
  defaults
) {
  // pivot initialization
  if (animationDefinition.pivot !== undefined) {
    this.setSyncDefaults(animationDefinition, 'pivot');

    Utils.preprocessTimeAnimation(
      animStart,
      animDuration,
      animEnd,
      animationDefinition.pivot
    );
    this.preprocess3dCoordinateAnimation(
      animStart,
      animDuration,
      animEnd,
      animationDefinition.pivot,
      defaults
    );
  }
};

Scene.prototype.preprocessAnimationDefinitions = function (
  animStart,
  animDuration,
  animEnd,
  animationDefinition
) {
  const startTime = animStart;
  // const endTime = animEnd

  animStart = startTime;
  animEnd = startTime;
  animDuration = animEnd - animStart;
  this.preprocessColorAnimation(
    animStart,
    animDuration,
    animEnd,
    animationDefinition,
    animationDefinition.color
  );

  animStart = startTime;
  animEnd = startTime;
  animDuration = animEnd - animStart;
  this.preprocessAngleAnimation(
    animStart,
    animDuration,
    animEnd,
    animationDefinition
  );

  animStart = startTime;
  animEnd = startTime;
  animDuration = animEnd - animStart;
  this.preprocessScaleAnimation(
    animStart,
    animDuration,
    animEnd,
    animationDefinition
  );

  animStart = startTime;
  animEnd = startTime;
  animDuration = animEnd - animStart;
  this.preprocessPositionAnimation(
    animStart,
    animDuration,
    animEnd,
    animationDefinition,
    { x: 0.0, y: 0.0, z: 0.0 }
  );

  animStart = startTime;
  animEnd = startTime;
  animDuration = animEnd - animStart;
  this.preprocessPivotAnimation(
    animStart,
    animDuration,
    animEnd,
    animationDefinition,
    { x: 0.0, y: 0.0, z: 0.0 }
  );
};

Scene.prototype.addAnimation = function (animationDefinitions) {
  if (Utils.isArray(animationDefinitions) === false) {
    animationDefinitions = [animationDefinitions];
  }

  const animationLayers = this.animationLayers;

  for (
    let animationI = 0;
    animationI < animationDefinitions.length;
    animationI++
  ) {
    const animationDefinition = animationDefinitions[animationI];

    if (animationDefinition.start === undefined) {
      animationDefinition.start = 0;
    }
    if (
      animationDefinition.duration === undefined &&
      animationDefinition.end === undefined
    ) {
      animationDefinition.duration = 3600;
    }

    if (animationDefinition.layer === undefined) {
      animationDefinition.layer = 1;
    }
    animationDefinition.layer = this.loader.getLayerString(
      animationDefinition.layer
    );

    if (animationLayers[animationDefinition.layer] === undefined) {
      animationLayers[animationDefinition.layer] = [];
    }

    if (animationDefinition.object !== undefined) {
      animationDefinition.ref = new Model();
      if (
        Utils.isString(animationDefinition.object) === true ||
        animationDefinition.object === null
      ) {
        animationDefinition.object = {
          name: animationDefinition.object
        };
      }

      const promises = [];
      promises.push(
        animationDefinition.ref.load(animationDefinition.object.name)
      );

      this.loader.addNotifyResource(animationDefinition.object.name, promises);
    } else if (animationDefinition.text !== undefined) {
      animationDefinition.ref = new Text();
      const promises = [];
      promises.push(
        animationDefinition.ref.load(animationDefinition.text.name)
      );
      if (animationDefinition.perspective === undefined) {
        animationDefinition.perspective = '2d';
      }

      this.loader.addNotifyResource(animationDefinition.text, promises);
    } else if (animationDefinition.image !== undefined) {
      animationDefinition.type = 'image';
      if (Utils.isArray(animationDefinition.image) === false) {
        animationDefinition.image = [animationDefinition.image];
      }

      for (
        let imageI = 0;
        imageI < animationDefinition.image.length;
        imageI++
      ) {
        if (Utils.isString(animationDefinition.image[imageI]) === true) {
          animationDefinition.image[imageI] = {
            name: animationDefinition.image[imageI]
          };
        }
      }

      animationDefinition.ref = new Image(animationDefinition.scene);
      const promises = [];
      promises.push(
        animationDefinition.ref.load(animationDefinition.image[0].name)
      );

      /* if (animationDefinition.image[0].video !== undefined) {
        const video = Utils.deepCopyJson(animationDefinition.image[0].video);
        video.ref = new Video();
        promises.push(video.ref.load(animationDefinition.image[0].name));
        animationDefinition.ref.video = video;
      } */

      animationDefinition.multiTexRef = [animationDefinition.ref];
      for (
        let imageI = 1;
        imageI < animationDefinition.image.length;
        imageI++
      ) {
        const multiTexRef = new Image(animationDefinition.scene);
        promises.push(multiTexRef.load(animationDefinition.image[imageI].name));

        animationDefinition.multiTexRef.push(multiTexRef);
        /* if (animationDefinition.image[imageI].video !== undefined) {
          const video = Utils.deepCopyJson(
            animationDefinition.image[imageI].video
          );
          video.ref = new Video();
          promises.push(video.ref.load(animationDefinition.image[imageI].name));
          animationDefinition.multiTexRef[imageI].video = video;
        } */
      }

      if (animationDefinition.perspective === undefined) {
        animationDefinition.perspective = '2d';
      }

      if (
        animationDefinition.align === undefined &&
        animationDefinition.position === undefined
      ) {
        animationDefinition.align = Constants.Align.CENTER;
      }

      if (this.loader.addNotifyResource(animationDefinition.image, promises)) {
        // imageLoadImageAsync(animationDefinition.image);
      }
    } else if (animationDefinition.fbo !== undefined) {
      animationDefinition.ref = Fbo.init(animationDefinition.fbo.name);
      this.loader.addNotifyResource(animationDefinition.fbo.name);
    } else if (animationDefinition.scene !== undefined) {
      if (animationDefinition.scene.fbo) {
        animationDefinition.scene.fbo.ref = Fbo.init(
          animationDefinition.scene.fbo.name,
          animationDefinition.scene.name
        );
        this.loader.addNotifyResource(animationDefinition.scene.fbo.name);
      }
    }

    if (animationDefinition.shader !== undefined) {
      animationDefinition.shader.ref = new Shader(animationDefinition);
      const promises = [];
      promises.push(animationDefinition.shader.ref.load());

      if (this.loader.addNotifyResource(animationDefinition.shader, promises)) {
        // imageLoadImageAsync(animationDefinition.image);
      }

      /*
                If multiple shaders defined as an Array
                then split&duplicate Array to animationDefinition per shader

                If image/fbo type is defined then image/fbo names should be replaced with passToFbo names
            */
      /* if (Utils.isArray(animationDefinition.shader))
            {
                if (animationDefinition.passToFbo === undefined)
                {
                    this.setAnimationError(animationDefinition, 'PARSE',
                        'passToFbo must be declared when declaring animation shaders as an Array.');
                    continue;
                }

                var previousFboName = undefined;
                for (var i = 0; i < animationDefinition.shader.length; i++)
                {
                    var animationDefinitionDuplicate = Utils.deepCopyJson(animationDefinition);
                    animationDefinitionDuplicate.shader = Utils.deepCopyJson(animationDefinition.shader[i]);

                    if (i > 0 && previousFboName !== undefined)
                    {
                        if (animationDefinitionDuplicate.fbo !== undefined)
                        {
                            if (animationDefinitionDuplicate.fbo.name !== undefined)
                            {
                                animationDefinitionDuplicate.fbo.name = previousFboName;
                            }
                        }
                        else if (animationDefinitionDuplicate.image !== undefined)
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
                        if (animationDefinition.fbo !== undefined)
                        {
                            animationDefinition.fbo.name = animationDefinitionDuplicate.fbo.name;
                        }
                        if (animationDefinition.image !== undefined)
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
            if (animationDefinition.shader.programName === undefined)
            {
                animationDefinition.shader.programName = name;
            }

            this.loader.addNotifyResource(animationDefinition.shader.programName); */
    }

    if (animationDefinition.passToFbo !== undefined) {
      const fboAnimationDefinition = { fbo: {} };

      if (animationDefinition.start !== undefined) {
        fboAnimationDefinition.start = animationDefinition.start;
      }
      if (animationDefinition.end !== undefined) {
        fboAnimationDefinition.end = animationDefinition.end;
      }
      if (animationDefinition.duration !== undefined) {
        fboAnimationDefinition.duration = animationDefinition.duration;
      }

      fboAnimationDefinition.layer = animationDefinition.layer;
      if (animationDefinition.passToFbo.beginLayer !== undefined) {
        fboAnimationDefinition.layer = animationDefinition.passToFbo.beginLayer;
      }
      fboAnimationDefinition.fbo.name = animationDefinition.passToFbo.name;
      fboAnimationDefinition.fbo.action = 'begin';
      if (animationDefinition.passToFbo.beginAction !== undefined) {
        fboAnimationDefinition.fbo.action =
          animationDefinition.passToFbo.beginAction;
      }

      this.addAnimation([fboAnimationDefinition]);
    }

    if (animationDefinition.initFunction !== undefined) {
      this.loader.addNotifyResource(animationDefinition.initFunction);
    }

    animationLayers[animationDefinition.layer].push(animationDefinition);

    if (animationDefinition.passToFbo !== undefined) {
      const fboAnimationDefinition = { fbo: {} };

      if (animationDefinition.start !== undefined) {
        fboAnimationDefinition.start = animationDefinition.start;
      }
      if (animationDefinition.end !== undefined) {
        fboAnimationDefinition.end = animationDefinition.end;
      }
      if (animationDefinition.duration !== undefined) {
        fboAnimationDefinition.duration = animationDefinition.duration;
      }

      fboAnimationDefinition.layer = animationDefinition.layer;
      if (animationDefinition.passToFbo.endLayer !== undefined) {
        fboAnimationDefinition.layer = animationDefinition.passToFbo.endLayer;
      }
      fboAnimationDefinition.fbo.name = animationDefinition.passToFbo.name;
      fboAnimationDefinition.fbo.action = 'unbind';
      if (animationDefinition.passToFbo.endAction !== undefined) {
        fboAnimationDefinition.fbo.action =
          animationDefinition.passToFbo.endAction;
      }

      this.addAnimation([fboAnimationDefinition]);
    }
  }

  this.animationLayers = this.loader.sortArray(animationLayers);
};

Scene.prototype.getParentObject = function (
  animationDefinitions,
  animationDefinition
) {
  if (animationDefinition.parent) {
    if (animationDefinition.parent instanceof THREE.Object3D) {
      return animationDefinition.parent;
    } else {
      const [parentBaseName, parentBaseChildName] =
        animationDefinition.parent.split('.');

      const parent = animationDefinitions.find(function (definition) {
        return definition.id === parentBaseName;
      });

      if (parent && parent.ref && parent.ref.mesh) {
        if (parentBaseChildName) {
          const childMesh =
            parent.ref.mesh.getObjectByName(parentBaseChildName);
          if (childMesh) {
            animationDefinition.ref.setParent(childMesh);
          } else {
            loggerWarning(
              `Parent object ${animationDefinition.parent} child object not found: ${animationDefinition.parent}`
            );
          }
        } else {
          return parent.ref.mesh;
        }
      } else {
        loggerWarning(`Parent object not found: ${animationDefinition.parent}`);
      }
    }
  }

  return this.renderScene.at(-1);
};

Scene.prototype.processAnimation = function () {
  const graphics = new Graphics();

  this.animationLayers = this.loader.sortArray(this.animationLayers);
  const animationLayers = this.animationLayers;

  // threadWaitAsyncCalls();

  let startTime = 0;
  let endTime;
  let durationTime;

  if (this.initFunction !== undefined) {
    Utils.evaluateVariable(this, this.initFunction);
  }

  const input = new Input();
  for (const key in animationLayers) {
    if (animationLayers[key] !== undefined) {
      const animationLayersLength = animationLayers[key].length;
      for (
        let animationI = 0;
        animationI < animationLayersLength;
        animationI++
      ) {
        input.pollEvents();
        if (input.isUserExit()) {
          return;
        }

        const animationDefinition = animationLayers[key][animationI];
        Utils.setTimeVariables(
          animationDefinition,
          startTime,
          endTime,
          durationTime
        );

        startTime = animationDefinition.start;
        endTime = animationDefinition.end;
        if (endTime !== undefined) {
          durationTime = endTime - startTime;
        }

        if (animationDefinition.sync !== undefined) {
          if (animationDefinition.sync.all === undefined) {
            animationDefinition.sync.all = true;
          }
        }

        const parentObject = this.getParentObject(
          animationLayers[key],
          animationDefinition
        );

        if (animationDefinition.shader !== undefined) {
          // animationDefinition.shader.ref = Shader.load(animationDefinition.shader);
          if (
            animationDefinition.shader.ref &&
            animationDefinition.shader.ref.material
          ) {
            if (
              animationDefinition.image &&
              animationDefinition.perspective === '2d'
            ) {
              animationDefinition.shader.ref.material.blending =
                THREE.CustomBlending;
              animationDefinition.shader.ref.material.depthTest = false;
              animationDefinition.shader.ref.material.depthWrite = false;
            }
            if (animationDefinition.ref.mesh) {
              animationDefinition.ref.mesh.material =
                animationDefinition.shader.ref.material;
            }

            if (settings.engine.preload) {
              // Shader uniforms need to be processed for prebaking of scenes
              Shader.enableShader(animationDefinition);
              Shader.disableShader(animationDefinition);
            }
          }
          this.validateResourceLoaded(
            animationDefinition,
            animationDefinition.shader.ref,
            'Could not load shader program ' +
              animationDefinition.shader.programName
          );
          this.loader.notifyResourceLoaded(
            animationDefinition.shader.programName
          );
        }

        if (
          animationDefinition.object !== undefined ||
          animationDefinition.objectFunction !== undefined
        ) {
          animationDefinition.type = 'object';
          parentObject.add(animationDefinition.ref.mesh);
          // animationDefinition.ref = new Model();

          if (animationDefinition.object !== undefined) {
            if (animationDefinition.shape !== undefined) {
              /* if (animationDefinition.shape.type === 'SPHERE')
                            {
                                var radius = 1;
                                if (animationDefinition.shape.radius !== undefined)
                                {
                                    radius = animationDefinition.shape.radius;
                                }
                                var lats = 30;
                                if (animationDefinition.shape.lats !== undefined)
                                {
                                    lats = animationDefinition.shape.lats;
                                }
                                var longs = 30;
                                if (animationDefinition.shape.longs !== undefined)
                                {
                                    longs = animationDefinition.shape.longs;
                                }

                                animationDefinition.ref = setObjectSphereData(animationDefinition.object, radius, lats, longs);
                            }
                            else if (animationDefinition.shape.type === 'CYLINDER')
                            {
                                var base = 1;
                                if (animationDefinition.shape.base !== undefined)
                                {
                                    base = animationDefinition.shape.base;
                                }
                                var top = 1;
                                if (animationDefinition.shape.top !== undefined)
                                {
                                    top = animationDefinition.shape.top;
                                }
                                var height = 1;
                                if (animationDefinition.shape.height !== undefined)
                                {
                                    height = animationDefinition.shape.height;
                                }
                                var slices = 30;
                                if (animationDefinition.shape.slices !== undefined)
                                {
                                    slices = animationDefinition.shape.slices;
                                }
                                var stacks = 30;
                                if (animationDefinition.shape.stacks !== undefined)
                                {
                                    stacks = animationDefinition.shape.stacks;
                                }

                                animationDefinition.ref = setObjectCylinderData(animationDefinition.object,
                                    base, top, height, slices, stacks);
                            }
                            else if (animationDefinition.shape.type === 'DISK')
                            {
                                var inner = 0;
                                if (animationDefinition.shape.inner !== undefined)
                                {
                                    inner = animationDefinition.shape.inner;
                                }
                                var outer = 1;
                                if (animationDefinition.shape.outer !== undefined)
                                {
                                    outer = animationDefinition.shape.outer;
                                }
                                var slices = 30;
                                if (animationDefinition.shape.slices !== undefined)
                                {
                                    slices = animationDefinition.shape.slices;
                                }
                                var loops = 30;
                                if (animationDefinition.shape.loops !== undefined)
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
                            } */
            } else {
              // animationDefinition.ref.load(animationDefinition.object);
            }

            if (
              this.validateResourceLoaded(
                animationDefinition,
                animationDefinition.ref,
                'Could not load ' + animationDefinition.object
              )
            ) {
              animationDefinition.ref.setLighting(
                animationDefinition.objectLighting
              );
              animationDefinition.ref.setSimpleColors(
                animationDefinition.simpleColors
              );
              animationDefinition.ref.setCamera(
                animationDefinition.objectCamera
              );
            }
          }

          if (animationDefinition.fps === undefined) {
            animationDefinition.fps = 0;
          }
          if (animationDefinition.camera === undefined) {
            animationDefinition.camera = 'Camera01';
          }
          if (animationDefinition.clearDepthBuffer === undefined) {
            animationDefinition.clearDepthBuffer = false;
          }

          animationDefinition.ref.setFps(animationDefinition.fps);
          animationDefinition.ref.setCameraName(animationDefinition.camera);
          animationDefinition.ref.setClearDepthBuffer(
            animationDefinition.clearDepthBuffer
          );

          const animStart = startTime;
          const animEnd = endTime;
          const animDuration = animEnd - animStart;
          this.preprocessAnimationDefinitions(
            animStart,
            animDuration,
            animEnd,
            animationDefinition
          );

          if (animationDefinition.nodes !== undefined) {
            for (const nodeName in animationDefinition.nodes) {
              const node = animationDefinition.nodes[nodeName];
              this.preprocessAnimationDefinitions(
                animStart,
                animDuration,
                animEnd,
                node
              );
            }
          }

          this.loader.notifyResourceLoaded(animationDefinition.object);
        } else if (animationDefinition.image !== undefined) {
          parentObject.add(animationDefinition.ref.mesh);

          /* FIXME scene adding
                    if (animationDefinition.image[0].video !== undefined)
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
                        if (animationDefinition.image[imageI].video !== undefined)
                        {
                            var video = Utils.deepCopyJson(animationDefinition.image[imageI].video);
                            video.ref = new Video();
                            promises.push(video.ref.load(animationDefinition.image[imageI].name));
                            animationDefinition.multiTexRef[imageI].video = video;
                        }
                    } */

          const animStart = startTime;
          const animEnd = endTime;
          const animDuration = animEnd - animStart;
          this.preprocessAnimationDefinitions(
            animStart,
            animDuration,
            animEnd,
            animationDefinition
          );

          const message = 'Could not load ' + animationDefinition.image[0].name;
          this.validateResourceLoaded(
            animationDefinition,
            animationDefinition.ref,
            message
          );
          for (let i = 0; i < animationDefinition.multiTexRef.length; i++) {
            const multiTexRef = animationDefinition.multiTexRef[i];
            this.validateResourceLoaded(
              animationDefinition,
              multiTexRef,
              message
            );
          }

          this.loader.notifyResourceLoaded(animationDefinition.image[0].name);
        } else if (animationDefinition.text !== undefined) {
          animationDefinition.type = 'text';
          if (animationDefinition.text.perspective === undefined) {
            animationDefinition.text.perspective = '2d';
          } else if (animationDefinition.text.perspective === '3d') {
            if (animationDefinition.clearDepthBuffer === undefined) {
              animationDefinition.clearDepthBuffer = 0;
            } else {
              animationDefinition.clearDepthBuffer =
                animationDefinition.clearDepthBuffer === true ? 1 : 0;
            }
          }

          if (animationDefinition.text.name !== undefined) {
            animationDefinition.ref.setFont(animationDefinition.text.name);
          }

          if (animationDefinition.text.string !== undefined) {
            animationDefinition.ref.setValue(
              Utils.evaluateVariable(
                animationDefinition,
                animationDefinition.text.string
              )
            );
          }

          if (
            animationDefinition.align === undefined &&
            animationDefinition.position === undefined
          ) {
            animationDefinition.align = Constants.Align.CENTER;
          }

          parentObject.add(animationDefinition.ref.mesh);

          const animStart = startTime;
          const animEnd = endTime;
          const animDuration = animEnd - animStart;
          this.preprocessAnimationDefinitions(
            animStart,
            animDuration,
            animEnd,
            animationDefinition
          );
        } else if (animationDefinition.fbo !== undefined) {
          animationDefinition.type = 'fbo';

          if (animationDefinition.fbo.action === 'begin') {
            animationDefinition.ref.push();
            this.renderScene.push(animationDefinition.ref.scene);
          } else if (animationDefinition.fbo.action === 'unbind') {
            animationDefinition.ref.pop();
            this.renderScene.pop();
          }

          if (animationDefinition.fbo.name === undefined) {
            animationDefinition.fbo.name = 'fbo';
          }

          if (
            this.validateResourceLoaded(
              animationDefinition,
              animationDefinition.ref,
              'Could not load ' + animationDefinition.fbo.name
            )
          ) {
            if (animationDefinition.ref.id === 0) {
              animationDefinition.ref.setStoreDepth(
                animationDefinition.fbo.storeDepth
              );
              if (
                animationDefinition.fbo.width !== undefined &&
                animationDefinition.fbo.height !== undefined
              ) {
                animationDefinition.ref.setDimensions(
                  animationDefinition.fbo.width,
                  animationDefinition.fbo.height
                );
              }
              animationDefinition.ref.generateFramebuffer();
            }
          }

          const animStart = startTime;
          const animEnd = startTime;
          const animDuration = animEnd - animStart;
          this.preprocessDimensionAnimation(
            animStart,
            animDuration,
            animEnd,
            animationDefinition
          );

          this.loader.notifyResourceLoaded(animationDefinition.fbo.name);
        } else if (animationDefinition.light !== undefined) {
          animationDefinition.type = 'light';
          animationDefinition.ref = new Light(animationDefinition);
          parentObject.add(animationDefinition.ref.mesh);

          // const animStart = startTime
          // const animEnd = startTime
          // const animDuration = animEnd - animStart
          // this.preprocessAnimationDefinitions(animStart, animDuration, animEnd, animationDefinition);

          /* if (animationDefinition.ambientColor !== undefined)
                    {
                        animStart = startTime;
                        animEnd = startTime;
                        animDuration = animEnd - animStart;
                        this.preprocessColorAnimation(animStart, animDuration, animEnd, animationDefinition,
                            animationDefinition.ambientColor);
                    }
                    if (animationDefinition.diffuseColor !== undefined)
                    {
                        animStart = startTime;
                        animEnd = startTime;
                        animDuration = animEnd - animStart;
                        this.preprocessColorAnimation(animStart, animDuration, animEnd, animationDefinition,
                            animationDefinition.diffuseColor);
                    }
                    if (animationDefinition.specularColor !== undefined)
                    {
                        animStart = startTime;
                        animEnd = startTime;
                        animDuration = animEnd - animStart;
                        this.preprocessColorAnimation(animStart, animDuration, animEnd, animationDefinition,
                            animationDefinition.specularColor);
                    } */
        } else if (animationDefinition.camera !== undefined) {
          animationDefinition.type = 'camera';
          animationDefinition.ref = new Camera();

          let animStart = startTime;
          let animEnd = startTime;
          let animDuration = animEnd - animStart;
          this.preprocessPerspectiveAnimation(
            animStart,
            animDuration,
            animEnd,
            animationDefinition
          );

          animStart = startTime;
          animEnd = startTime;
          animDuration = animEnd - animStart;
          this.preprocessPositionAnimation(
            animStart,
            animDuration,
            animEnd,
            animationDefinition,
            { x: 0.0, y: 0.0, z: 2.0 }
          );

          animStart = startTime;
          animEnd = startTime;
          animDuration = animEnd - animStart;
          if (
            animationDefinition.sync !== undefined &&
            animationDefinition.sync.lookAt === undefined
          ) {
            if (animationDefinition.sync.all === true) {
              animationDefinition.sync.lookAt = true;
            } else {
              animationDefinition.sync.lookAt = false;
            }
          }
          Utils.preprocessTimeAnimation(
            animStart,
            animDuration,
            animEnd,
            animationDefinition.lookAt
          );
          this.preprocess3dCoordinateAnimation(
            animStart,
            animDuration,
            animEnd,
            animationDefinition.lookAt,
            { x: 0.0, y: 0.0, z: 0.0 }
          );

          animStart = startTime;
          animEnd = startTime;
          animDuration = animEnd - animStart;
          if (
            animationDefinition.sync !== undefined &&
            animationDefinition.sync.up === undefined
          ) {
            if (animationDefinition.sync.all === true) {
              animationDefinition.sync.up = true;
            } else {
              animationDefinition.sync.up = false;
            }
          }
          Utils.preprocessTimeAnimation(
            animStart,
            animDuration,
            animEnd,
            animationDefinition.up
          );
          this.preprocess3dCoordinateAnimation(
            animStart,
            animDuration,
            animEnd,
            animationDefinition.up,
            { x: 0.0, y: 1.0, z: 0.0 }
          );
        } else if (animationDefinition.scene !== undefined) {
          animationDefinition.type = 'scene';
        }

        if (animationDefinition.initFunction !== undefined) {
          Utils.evaluateVariable(
            animationDefinition,
            animationDefinition.initFunction
          );
          this.loader.notifyResourceLoaded(animationDefinition.initFunction);
        }

        if (endTime !== undefined) {
          startTime = endTime;
        }

        if (durationTime !== undefined) {
          endTime = startTime + durationTime;
        }

        if (graphics.handleErrors() === 1) {
          if (animationDefinition.error === undefined) {
            animationDefinition.error =
              'Graphics handling error occurred during loading';
            loggerWarning(
              'Graphics error in: ' +
                JSON.stringify(animationDefinition, null, 2)
            );
          } else {
            loggerTrace(
              'Graphics error in: ' +
                JSON.stringify(animationDefinition, null, 2)
            );
          }
        }
      }
    }
  }
};

Scene.prototype.deinitAnimation = function () {
  const animationLayers = this.animationLayers;
  for (const key in animationLayers) {
    if (animationLayers[key] !== undefined) {
      const animationLayersLength = animationLayers[key].length;
      for (
        let animationI = 0;
        animationI < animationLayersLength;
        animationI++
      ) {
        const animation = animationLayers[key][animationI];
        if (animation.error !== undefined) {
          continue; // skip animations that are in error state
        }

        if (animation.deinitFunction !== undefined) {
          Utils.evaluateVariable(animation, animation.deinitFunction);
        }
      }
    }
  }
};

export { Scene };

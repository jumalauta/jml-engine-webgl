import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader';
import { MTLLoader } from 'three/addons/loaders/MTLLoader';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader';
import { loggerDebug, loggerWarning } from './Bindings';
import { Image } from './Image';
import { FileManager } from './FileManager';
import { Instancer } from './Instancer';
import { Settings } from './Settings';
import { Utils } from './Utils';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils';

const settings = new Settings();

const cache = {};

const Model = function (animationDefinition) {
  this.ptr = undefined;
  this.filename = undefined;
  this.camera = 'Camera 01';
  this.fps = 0;

  if (!animationDefinition) {
    animationDefinition = {};
  }

  this.materialProperties = animationDefinition.material || {};
  this.additive = animationDefinition.additive === true;
  this.instancer = new Instancer(this, animationDefinition.instancer);
};

Model.prototype.getMeshNames = function () {
  const names = [];
  if (this.mesh) {
    this.mesh.traverse((obj) => {
      if (obj.isMesh && obj.name) {
        names.push(obj.name);
      }
    });
  }
  return names;
};

Model.prototype.setShape = function (shape) {
  this.shape = shape;
};

Model.prototype.cloneAnimations = function (srcAnimations) {
  if (!srcAnimations) {
    srcAnimations = this.animations;
  }

  if (!settings.engine.cloneModels) {
    return srcAnimations;
  }

  if (srcAnimations) {
    const animations = [];
    srcAnimations.forEach((clip) => {
      animations.push(clip.clone());
    });
    return animations;
  }

  return undefined;
};

Model.prototype.saveToCache = function (path) {
  const mesh = settings.engine.cloneModels
    ? SkeletonUtils.clone(this.mesh)
    : this.mesh;

  cache[path] = {
    mesh,
    ptr: mesh,
    animations: this.cloneAnimations()
  };
};

Model.prototype.loadFromCache = function (path) {
  const cacheObject = cache[path];
  if (cacheObject) {
    this.mesh = settings.engine.cloneModels
      ? SkeletonUtils.clone(cacheObject.mesh)
      : cacheObject.mesh;
    this.ptr = this.mesh;
    this.animations = this.cloneAnimations(cacheObject.animations);

    this.setDefaults();
    return true;
  }
  return false;
};

Model.prototype.load = function (filename) {
  this.filename = filename;
  const instance = this;

  if (instance.shape || filename === null) {
    return new Promise((resolve, reject) => {
      let object = filename;
      let shapeMaterialSettings;

      if (instance.shape) {
        const shapeTypeDefaultSettings =
          settings.demo.model.shape[instance.shape.type.toLowerCase()] || {};

        const shapeMaterial = {};
        shapeMaterial.transparent = true;
        shapeMaterial.castShadow = true;
        shapeMaterial.receiveShadow = true;
        if (instance.shape.type === 'SKYSPHERE') {
          shapeMaterial.transparent = false;
          shapeMaterial.depthWrite = false;
          shapeMaterial.depthTest = true;
          shapeMaterial.castShadow = false;
          shapeMaterial.receiveShadow = false;
          shapeMaterial.side = 'BackSide';
          shapeMaterial.type = 'Basic';
        }

        shapeMaterialSettings = Utils.deepCopyJson({
          ...settings.demo.model.shape.material,
          ...shapeTypeDefaultSettings.material,
          ...this.materialProperties,
          ...shapeMaterial
        });
        const material = settings.createMaterial(shapeMaterialSettings);

        const defaultSize = 0.4;
        if (instance.shape.type === 'SKYSPHERE') {
          object = instance.instancer.createMesh(
            new THREE.SphereGeometry(
              instance.shape.radius || settings.demo.camera.far * 0.9,
              instance.shape.widthSegments || 64,
              instance.shape.heightSegments || 64
            ),
            material
          );
        } else if (instance.shape.type === 'SPLINE') {
          const splinePoints = [];
          instance.shape.points.forEach((point) => {
            let p = point;
            if (point instanceof Array) {
              p = { x: point[0], y: point[1], z: point[2] };
            }
            splinePoints.push(new THREE.Vector3(p.x, p.y, p.z));
          });

          const splinePath = new THREE.CatmullRomCurve3(
            splinePoints,
            instance.shape.closed || false,
            instance.shape.curveType || 'centripetal',
            instance.shape.tension || 0.5
          );

          const shapeSize = instance.shape.size || defaultSize;
          const shapePrecision = instance.shape.precision || 2;
          const shapePointArray = Utils.isFunction(instance.shape.function)
            ? instance.shape.function(instance.shape)
            : (() => {
                const pointArray = [];
                for (let i = 0; i < shapePrecision; i++) {
                  const angleRad = (i / shapePrecision) * 2 * Math.PI;
                  pointArray.push([
                    Math.sin(angleRad) * shapeSize,
                    Math.cos(angleRad) * shapeSize
                  ]);
                }

                return pointArray;
              })();

          const shapePoints = [];
          shapePointArray.forEach((point) => {
            let p = point;
            if (point instanceof Array) {
              p = { x: point[0], y: point[1], z: point[2] || 0 };
            }

            shapePoints.push(new THREE.Vector3(p.x, p.y, p.z));
          });

          const geometry = new THREE.ExtrudeGeometry(
            new THREE.Shape(shapePoints),
            {
              curveSegments: instance.shape.extrudeSettings.curveSegments || 12,
              steps: instance.shape.extrudeSettings.steps || 1,
              depth: instance.shape.extrudeSettings.depth || 1,
              bevelEnabled:
                instance.shape.extrudeSettings.bevelEnabled || false,
              bevelThickness:
                instance.shape.extrudeSettings.bevelThickness || 0.0,
              bevelSize: instance.shape.extrudeSettings.bevelSize || 0.0,
              bevelOffset: instance.shape.extrudeSettings.bevelOffset || 0,
              bevelSegments: instance.shape.extrudeSettings.bevelSegments || 0,
              extrudePath: splinePath
              // UVGenerator -  object that provides UV generator functions
            }
          );

          object = instance.instancer.createMesh(geometry, material);
        } else if (instance.shape.type === 'SPHERE') {
          object = instance.instancer.createMesh(
            new THREE.SphereGeometry(
              instance.shape.radius || defaultSize,
              instance.shape.widthSegments || 64,
              instance.shape.heightSegments || 64
            ),
            material
          );
        } else if (instance.shape.type === 'CUBE') {
          object = instance.instancer.createMesh(
            new THREE.BoxGeometry(
              instance.shape.width || defaultSize,
              instance.shape.height || defaultSize,
              instance.shape.depth || defaultSize
            ),
            material
          );
        } else if (instance.shape.type === 'PLANE') {
          object = instance.instancer.createMesh(
            new THREE.PlaneGeometry(
              instance.shape.width || defaultSize,
              instance.shape.height || defaultSize,
              instance.shape.widthSegments || 1,
              instance.shape.heightSegments || 1
            ),
            material
          );
        } else {
          loggerWarning('Unsupported shape: ' + instance.shape.type);
          reject(instance);
        }
      } else if (!(object instanceof THREE.Object3D)) {
        object = new THREE.Object3D();
      }

      instance.mesh = object;
      instance.ptr = instance.mesh;
      instance.setDefaults();

      const material = instance.mesh.material;
      if (shapeMaterialSettings) {
        settings.toThreeJsProperties(shapeMaterialSettings, material);
        material.needsUpdate = true;
      }

      const image = new Image();
      if (image.isFileSupported(filename)) {
        image
          .load(filename, false)
          .then(() => {
            image.texture.forEach((texture) => {
              if (material.side === THREE.BackSide) {
                // flip texture for objects that are rendered from inside/backside (e.g., skysphere)
                texture.wrapT = THREE.RepeatWrapping;
                texture.wrapS = THREE.RepeatWrapping;
                texture.repeat.x = -1;
                texture.needsUpdate = true;
              }
            });

            material.map = image.texture[0];
            material.needsUpdate = true;

            resolve(instance);
          })
          .catch(() => {
            reject(instance);
          });
      } else {
        resolve(instance);
      }
    });
  }

  const fileManager = new FileManager();
  fileManager.setRefreshFileTimestamp(this.filename);
  const path = fileManager.getPath(this.filename);

  if (this.loadFromCache(path)) {
    return new Promise((resolve, reject) => {
      loggerDebug(
        `Loaded model from cache: ${instance.filename}. Animations: ${Object.keys(instance.clips || {}).join(', ')}. Mesh names: ${instance.getMeshNames().join(', ')}`
      );
      resolve(instance);
    });
  }

  if (this.filename.toUpperCase().endsWith('.OBJ')) {
    const materialFilename = this.filename
      .replace('.obj', '.mtl')
      .replace('.OBJ', '.MTL');
    fileManager.setRefreshFileTimestamp(materialFilename);

    return new Promise((resolve, reject) => {
      const mtlLoader = new MTLLoader();
      mtlLoader.load(
        fileManager.getPath(materialFilename),
        (materials) => {
          materials.preload();

          const objLoader = new OBJLoader();
          objLoader.setMaterials(materials);
          objLoader.load(
            path,
            (object) => {
              instance.mesh = instance.instancer.createMesh(object);
              instance.ptr = instance.mesh;
              instance.saveToCache(path);
              instance.setDefaults();

              loggerDebug(
                `Loaded OBJ: ${this.filename}, Mesh names: ${instance.getMeshNames().join(', ')}`
              );
              resolve(instance);
            },
            undefined,
            (error) => {
              loggerWarning(`Could not load model ${this.filename}: ${error}`);
              instance.error = true;
              reject(instance);
            }
          );
        },
        undefined,
        (error) => {
          loggerWarning(`Could not load MTL ${materialFilename}: ${error}`);
          instance.error = true;
          reject(instance);
        }
      );
    });
  } else if (
    this.filename.toUpperCase().endsWith('.GLTF') ||
    this.filename.toUpperCase().endsWith('.GLB')
  ) {
    const loader = new GLTFLoader();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./');
    dracoLoader.setDecoderConfig({ type: 'js' });
    loader.setDRACOLoader(dracoLoader);

    return new Promise((resolve, reject) => {
      loader.load(
        path,
        (gltf) => {
          instance.mesh = instance.instancer.createMesh(gltf.scene);
          instance.ptr = instance.mesh;
          instance.animations = gltf.animations;

          // gltf.animations = null;
          // gltf.animations; // Array<THREE.AnimationClip>
          // gltf.scene; // THREE.Group
          // gltf.scenes; // Array<THREE.Group>
          // gltf.cameras; // Array<THREE.Camera>
          // gltf.asset; // Object

          instance.saveToCache(path);
          instance.setDefaults();

          loggerDebug(
            `Loaded GLTF: ${this.filename}. Animations: ${Object.keys(instance.clips || {}).join(', ')}. Mesh names: ${instance.getMeshNames().join(', ')}`
          );
          resolve(instance);
        },
        undefined,
        (error) => {
          loggerWarning(`Could not load model ${this.filename}: ${error}`);
          instance.error = true;
          reject(instance);
        }
      );
    });
  } else {
    throw new Error('Fileformat not supported: ' + this.filename);
  }
};

Model.prototype.setAnimationTime = function (time) {
  if (this.mixer) {
    // TODO: technically this time could be different for each instance of the model but currently such behavior is not supported
    this.mixer.setTime(time);
  }
};

Model.prototype.setCameraName = function (cameraName) {
  this.cameraName = cameraName;
};

Model.prototype.setFps = function (fps) {
  this.fps = fps;
};

Model.prototype.setPosition = function (x, y, z) {
  this.mesh.position.x = x;
  this.mesh.position.y = y;
  this.mesh.position.z = z;
};

Model.prototype.setRotation = function (degreesX, degreesY, degreesZ, x, y, z) {
  this.mesh.rotation.x = (degreesX * Math.PI) / 180;
  this.mesh.rotation.y = (degreesY * Math.PI) / 180;
  this.mesh.rotation.z = (degreesZ * Math.PI) / 180;
  if (settings.demo.compatibility.oldRotation) {
    this.mesh.rotation.x *= -1;
    this.mesh.rotation.y *= -1;
    this.mesh.rotation.z *= -1;
  }
};

Model.prototype.setScale = function (x, y, z) {
  this.mesh.scale.x = x;
  this.mesh.scale.y = y;
  this.mesh.scale.z = z;
};

Model.prototype.cloneMaterials = function () {
  this.mesh.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      obj.material = obj.material.clone(); // material changes (e.g., color tweaking) should not affect other objects
    }
  });
};

Model.prototype.setMaterialDefaults = function () {
  this.mesh.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      obj.material.transparent = false;
      obj.material.opacity = 1;
      obj.material.depthWrite = true;
      obj.material.depthTest = true;
      obj.material.side = THREE.FrontSide;
      obj.material.flatShading = false;
      obj.material.needsUpdate = true;

      if (settings.demo.compatibility.oldMaterials) {
        obj.material.side = THREE.DoubleSide;
      }

      if (this.additive) {
        obj.material.depthWrite = false;
        obj.material.blending = THREE.AdditiveBlending;
      }
    }
  });
};

Model.prototype.setMaterial = function (material) {
  if (!(material instanceof THREE.Material)) {
    loggerWarning('not material, cannot add to mesh');
    return;
  }
  this.mesh.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      if (obj.material.map && material.uniforms && material.uniforms.texture0) {
        material.uniforms.texture0.value = obj.material.map;
      }
      obj.material = material;
    }
  });

  this.setMaterialDefaults();
};

Model.prototype.setDefaults = function () {
  this.cloneMaterials();
  this.setShadow();
  this.setMaterialDefaults();
  // this.setColor(1,1,1,1);
  this.setPosition(0, 0, 0);
  this.setRotation(0, 0, 0);
  this.setScale(1, 1, 1);
  if (this.animations && this.animations.length > 0) {
    this.mixer = new THREE.AnimationMixer(this.mesh);
    this.clips = {};
    this.animations.forEach((clip) => {
      const clipAction = this.mixer.clipAction(clip);
      // clipAction.play();
      // FIXME support for animating / mixing animations
      clipAction.enabled = true;
      clipAction.setEffectiveTimeScale(1);
      clipAction.setEffectiveWeight(0);
      clipAction.setLoop(THREE.LoopOnce, 0);
      clipAction.clampWhenFinished = true;
      this.clips[clip.name] = clipAction;
    });
    this.mixer.clipAction(this.animations[0]).setEffectiveWeight(0);
  }
};

Model.prototype.setShadow = function (castShadow, receiveShadow) {
  castShadow = castShadow || true;
  receiveShadow = receiveShadow || castShadow;
  this.mesh.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = castShadow;
      obj.receiveShadow = receiveShadow;
    }
  });
};

Model.prototype.setColor = function (r, g, b, a) {
  // setObjectColor(this.ptr, r/255, g/255, b/255, a/255);
  let nr = r;
  let ng = g;
  let nb = b;
  let na = a;
  if (settings.demo.compatibility.oldColors) {
    nr = r / 0xff;
    ng = g / 0xff;
    nb = b / 0xff;
    na = a / 0xff;
  }

  this.mesh.traverse(function (obj) {
    if (obj.isMesh) {
      if (obj.material instanceof THREE.ShaderMaterial) {
        if (obj.material.uniforms && obj.material.uniforms.color) {
          obj.material.uniforms.color.value = new THREE.Vector4(nr, ng, nb, na);
        }
      } else {
        obj.material.color = new THREE.Color(nr, ng, nb);
        obj.material.opacity = na;
      }
    }
  });
};

Model.prototype.draw = function (time) {
  if (this.parent) {
    // this is a hack to get the correct world position, rotation and scale in cases where the parent is a child object of some Mesh, i.e., "parent":"modelId.meshName"

    const meshPosition = this.mesh.position.clone();
    const meshRotation = this.mesh.rotation.clone();
    // const meshScale = this.mesh.scale.clone();

    const worldQuaternion = new THREE.Quaternion();
    this.parent.getWorldQuaternion(worldQuaternion);
    this.mesh.rotation.setFromQuaternion(worldQuaternion);

    const worldPosition = new THREE.Vector3();
    this.parent.getWorldPosition(worldPosition);
    this.mesh.position.copy(worldPosition);

    // const worldScale = new THREE.Vector3();
    // this.parent.getWorldScale(worldScale);
    // this.mesh.scale.copy(worldScale); // scale is not working correctly in testing, so we don't use it for now

    this.mesh.position.add(meshPosition);
    this.mesh.rotation.x += meshRotation.x;
    this.mesh.rotation.y += meshRotation.y;
    this.mesh.rotation.z += meshRotation.z;

    this.mesh.updateMatrixWorld(true);
    this.mesh.updateMatrix(true);
  }

  this.instancer.draw(time);
};

Model.prototype.getClip = function (clipName) {
  if (this.clips && this.clips[clipName]) {
    return this.clips[clipName];
  }
  return undefined;
};

Model.prototype.setParent = function (object) {
  this.parent = object;
};

Model.prototype.play = function (clipName) {
  const clip = this.getClip(clipName);
  if (clip) {
    clip.play().reset();
  }
};

Model.prototype.stop = function (clipName) {
  const clip = this.getClip(clipName);
  if (clip) {
    clip.stop();
  }
};

Model.prototype.pause = function (clipName) {
  const clip = this.getClip(clipName);
  if (clip) {
    clip.paused = !clip.paused;
  }
};

Model.prototype.setWeight = function (clipName, weight) {
  const clip = this.getClip(clipName);
  if (clip) {
    clip.setEffectiveWeight(weight);
  }
};

Model.prototype.setTimeScale = function (clipName, speed) {
  const clip = this.getClip(clipName);
  if (clip) {
    clip.setEffectiveTimeScale(speed);
  }
};

Model.prototype.setLoop = function (clipName, loop) {
  const clip = this.getClip(clipName);
  if (clip) {
    clip.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
  }
};

Model.prototype.setEnabled = function (clipName, enabled) {
  const clip = this.getClip(clipName);
  if (clip) {
    clip.enabled = enabled;
  }
};

export { Model };

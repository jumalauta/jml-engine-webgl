import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader';
import { MTLLoader } from 'three/addons/loaders/MTLLoader';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader';
import { loggerDebug, loggerWarning } from './Bindings';
import { FileManager } from './FileManager';
import { Settings } from './Settings';

const settings = new Settings();

const Model = function () {
  this.ptr = undefined;
  this.filename = undefined;
  this.camera = 'Camera 01';
  this.fps = 0;
  this.clearDepthBuffer = true;
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

Model.prototype.load = function (filename) {
  this.filename = filename;
  const instance = this;

  if (
    instance.shape ||
    (!(filename instanceof String) && typeof filename !== 'string')
  ) {
    return new Promise((resolve, reject) => {
      let object = filename;
      if (instance.shape) {
        if (instance.shape.type === 'CUBE') {
          const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
          material.transparent = true;
          material.castShadow = true;
          material.receiveShadow = true;
          object = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.4, 0.4),
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

      resolve(instance);
    });
  }

  const fileManager = new FileManager();
  fileManager.setRefreshFileTimestamp(filename);

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
            fileManager.getPath(this.filename),
            (object) => {
              instance.mesh = object;
              instance.ptr = instance.mesh;
              instance.setDefaults();
              loggerDebug(
                `Loaded OBJ: ${this.filename}, Mesh names: ${instance.getMeshNames().join(', ')}`
              );
              resolve(instance);
            },
            undefined,
            (error) => {
              console.error(`Could not load model ${this.filename}: ${error}`);
              instance.error = true;
              reject(instance);
            }
          );
        },
        undefined,
        (error) => {
          console.error(`Could not load MTL ${materialFilename}: ${error}`);
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
        fileManager.getPath(this.filename),
        (gltf) => {
          instance.mesh = gltf.scene;
          instance.ptr = instance.mesh;
          instance.gltf = gltf;
          instance.setDefaults();

          if (gltf.animations && gltf.animations.length > 0) {
            instance.mixer = new THREE.AnimationMixer(instance.mesh);
            instance.clips = {};
            gltf.animations.forEach((clip) => {
              const clipAction = instance.mixer.clipAction(clip);
              // clipAction.play();
              // FIXME support for animating / mixing animations
              clipAction.enabled = true;
              clipAction.setEffectiveTimeScale(1);
              clipAction.setEffectiveWeight(0);
              clipAction.setLoop(THREE.LoopOnce, 0);
              instance.clips[clip.name] = clipAction;
            });
            instance.mixer.clipAction(gltf.animations[0]).setEffectiveWeight(0);
          }

          loggerDebug(
            `Loaded GLTF: ${this.filename}. Animations: ${Object.keys(instance.clips).join(', ')}. Mesh names: ${instance.getMeshNames().join(', ')}`
          );
          resolve(instance);
        },
        undefined,
        (error) => {
          console.error(`Could not load model ${this.filename}: ${error}`);
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
    this.mixer.setTime(time);
  }
};

Model.prototype.setCameraName = function (cameraName) {
  this.cameraName = cameraName;
};

Model.prototype.setFps = function (fps) {
  this.fps = fps;
};

Model.prototype.setClearDepthBuffer = function (boolean) {
  this.clearDepthBuffer = boolean;
};

Model.prototype.setLighting = function (boolean) {
  loggerDebug('useObjectLighting not implemented');
  // useObjectLighting(this.ptr, boolean === true ? 1 : 0);
};

Model.prototype.setSimpleColors = function (boolean) {
  loggerDebug('useSimpleColors not implemented');
  // useSimpleColors(this.ptr, boolean === true ? 1 : 0);
};

Model.prototype.setCamera = function (boolean) {
  loggerDebug('useObjectCamera not implemented');
  // useObjectCamera(this.ptr, boolean === true ? 1 : 0);
};

Model.prototype.setPosition = function (x, y, z) {
  // setObjectPosition(this.ptr, x, y, z);

  this.mesh.position.x = x;
  this.mesh.position.y = y;
  this.mesh.position.z = z;
};

Model.prototype.setPivot = function (x, y, z) {
  // setObjectPivot(this.ptr, x, y, z);
};

Model.prototype.setRotation = function (degreesX, degreesY, degreesZ, x, y, z) {
  // setObjectRotation(this.ptr, degreesX, degreesY, degreesZ, x, y, z);
  this.mesh.rotation.x = (degreesX * Math.PI) / 180;
  this.mesh.rotation.y = (degreesY * Math.PI) / 180;
  this.mesh.rotation.z = (degreesZ * Math.PI) / 180;
};

Model.prototype.setScale = function (x, y, z) {
  // setObjectScale(this.ptr, x, y, z);
  this.mesh.scale.x = x;
  this.mesh.scale.y = y;
  this.mesh.scale.z = z;
};

Model.prototype.setNodePosition = function (nodeName, x, y, z) {
  // setObjectNodePosition(this.ptr, nodeName, x, y, z);
};

Model.prototype.setNodeRotation = function (
  nodeName,
  degreesX,
  degreesY,
  degreesZ,
  x,
  y,
  z
) {
  // setObjectNodeRotation(this.ptr, nodeName, degreesX, degreesY, degreesZ, x, y, z);
};

Model.prototype.setNodeScale = function (nodeName, x, y, z) {
  // setObjectNodeScale(this.ptr, nodeName, x, y, z);
};

Model.prototype.setMaterialDefaults = function () {
  this.mesh.traverse((obj) => {
    if (obj.isMesh) {
      // obj.material.transparent = false;
      // obj.material.opacity = 1;
      // obj.material.depthWrite = true;
      // obj.material.depthTest = true;
      if (settings.demo.compatibility.oldMaterials) {
        obj.material.side = THREE.DoubleSide;
      }
      // obj.material.flatShading = false;
      // obj.material.needsUpdate = true;
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
  this.setShadow();
  this.setMaterialDefaults();
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

Model.prototype.draw = function () {
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

  // drawObject(this.ptr, this.cameraName, this.fps, this.clearDepthBuffer === true ? 1 : 0);
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
    clip.play();
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

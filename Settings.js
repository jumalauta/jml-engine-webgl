import * as THREE from 'three';
import { loggerWarning, loggerDebug } from './legacy/Bindings';
import { Image } from './legacy/Image';

var Settings = function() {
  return this.getInstance();
}

Settings.prototype.getInstance = function() {
  if (!Settings.prototype._singletonInstance) {
    this.init();
    Settings.prototype._singletonInstance = this;
  }

  return Settings.prototype._singletonInstance;
}

Settings.prototype.init = function() {
  this.engine = {
    demoPathPrefix: 'data/'
  };

  this.demo = {
    clearColor: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
    compatibility: {
      old2dCoordinates: false,
      oldColors: false,
    },
    text: {
      material: {
        type: 'Basic',
      },
    },
    image: {
      material: {
        type: 'Basic',
      },
      texture: {
        minFilter: 'LinearFilter',
        magFilter: 'LinearFilter',
        wrapS: 'ClampToEdgeWrapping',
        wrapT: 'ClampToEdgeWrapping',
      },
    },
    fbo: {
      color: {
        texture: {
          minFilter: 'NearestFilter',
          magFilter: 'NearestFilter',
          wrapS: 'ClampToEdgeWrapping',
          wrapT: 'ClampToEdgeWrapping',
        },
      },
      depth: {
        texture: {
          minFilter: 'NearestFilter',
          magFilter: 'NearestFilter',
          wrapS: 'ClampToEdgeWrapping',
          wrapT: 'ClampToEdgeWrapping',
        },
      },
    },
    screen: {
      width: 1920,
      height: 1080,
      //aspectRatio calculated below
      perspective2dZ: -0.651,
    },
    camera: {
      type: 'Perspective',
      fov: 75,
      //aspectRatio calculated below
      near: 0.1,
      far: 1000,
      position: { x: 0.0, y: 0.0, z: 2.0 },
      lookAt: { x: 0.0, y: 0.0, z: 0.0 },
      up: { x: 0.0, y: 1.0, z: 0.0 },
    },
    lights: [
      {
        type: 'Ambient',
        color: { r: 1.0, g: 1.0, b: 1.0 },
        intensity: 1.0,
      },
      {
        type: 'Directional',
        color: { r: 1.0, g: 1.0, b: 1.0 },
        intensity: 1.0,
        position: { x: 0.0, y: 1.0, z: 2.0 },
      },
    ],
    renderer: {
      antialias: true,
      alpha: true,
      autoClear: false,
      sortObjects: false,
    }
  }
  this.demo.screen.aspectRatio = this.demo.screen.width / this.demo.screen.height;
  this.demo.camera.aspectRatio = this.demo.screen.aspectRatio;
}

Settings.prototype.setXyz = function(src, dst) {
  if (!src) {
    return;
  }

  dst.x = src.x;
  dst.y = src.y;
  dst.z = src.z;
}

Settings.prototype.toThreeJsColor = function(color) {
  return new THREE.Color(color.r, color.g, color.b);
}

Settings.prototype.toThreeJsProperties = function(src, dst) {
  if (!src) {
    return;
  }
  if (!dst) {
    throw new Error('Destination object is undefined');
  }

  Object.keys(src).forEach(key => {
    if (key == 'type') { return; }

    if (dst[key] === undefined) {
      throw new Error(`Property ${key} not found in destination object`);
    }
    
    let value = src[key];
    if (typeof value === 'string') {
      if (THREE[value] !== undefined) {
        value = THREE[value];
      }
    }

    const dstType = typeof dst[key];
    const srcType = typeof value;
    if (dstType !== srcType) {
      throw new Error(`Type mismatch for property ${key}: ${dstType} != ${srcType}`);
    }

    dst[key] = value;
  });
}

Settings.prototype.createCamera = function() {
  const cameraType = THREE[this.demo.camera.type + 'Camera'];
  if (!cameraType || !cameraType.prototype instanceof THREE.Camera) {
    loggerWarning('Unsupported camera type: ' + this.demo.camera.type);
    return;
  }

  let camera = new cameraType(this.demo.camera.fov, this.demo.camera.aspectRatio, this.demo.camera.near, this.demo.camera.far);
  this.setXyz(this.demo.camera.position, camera.position);
  this.setXyz(this.demo.camera.lookAt, camera.lookAt);
  this.setXyz(this.demo.camera.up, camera.up);

  return camera;
}

Settings.prototype.createLight = function(light) {
  const lightType = THREE[light.type + 'Light'];
  if (!lightType || !lightType.prototype instanceof THREE.Light) {
    loggerWarning('Unsupported light type: ' + light.type);
    return;
  }

  let lightObj = new lightType(this.toThreeJsColor(light.color), light.intensity);
  this.setXyz(light.position, lightObj.position);

  return lightObj;
}

Settings.prototype.createLightsToScene = function(scene) {
  this.demo.lights.forEach(light => {
    scene.add(this.createLight(light));
  });
}

Settings.prototype.createRenderer = function(canvas) {
  const rendererSettings = {
    ...this.demo.renderer,
    canvas: canvas,
  };

  const renderer = new THREE.WebGLRenderer(rendererSettings);
  renderer.setClearColor(this.toThreeJsColor(this.demo.clearColor), this.demo.clearColor.a);
  renderer.autoClear = this.demo.renderer.autoClear;
  renderer.sortObjects = this.demo.renderer.sortObjects;

  return renderer;
}

Settings.prototype.createMaterial = function(materialSettings) {
  const materialType = THREE['Mesh' + materialSettings.type + 'Material'];
  if (!materialType || !materialType.prototype instanceof THREE.Material) {
    loggerWarning('Unsupported material type: ' + materialSettings.type);
    return new THREE.MeshBasicMaterial();
  }

  const material = new materialType();
  this.toThreeJsProperties(materialSettings, material);

  return material;
}

window.Settings = Settings;

export { Settings };
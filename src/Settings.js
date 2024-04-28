import * as THREE from 'three';
import { loggerWarning } from './Bindings';

const Settings = function () {
  return this.getInstance();
};

Settings.prototype.getInstance = function () {
  if (!Settings.prototype._singletonInstance) {
    Settings.prototype._singletonInstance = this;
    this.init();
  }

  return Settings.prototype._singletonInstance;
};

Settings.prototype.init = function () {
  this.engine = {
    demoPathPrefix: 'data/',
    tool: true,
    fileWatchInterval: 250,
    startDelay: 0, // bump this for demo capturing
    preload: true,
    enabledLogLevels: ['trace', 'debug', 'info', 'warning', 'error'],
    webDemoExe: false
  };

  this.menu = {
    fullscreen: false,
    volume: 1.0
  };

  this.demo = {
    clearColor: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
    sync: {
      mandatory: false,
      rocketFile: 'sync/sync.rocket',
      beatsPerMinute: 120,
      rowsPerBeat: 8
    },
    music: {
      musicFile: 'music.mp3'
    },
    // backgroundColor: { r: 0.0, g: 1.0, b: 0.0 },
    /* fog: {
      color: { r: 0.0, g: 0.0, b: 0.0 },
      near: 0.1,
      far: 900,
    }, */
    compatibility: {
      old2dCoordinates: false,
      oldColors: false
    },
    /* text: {
      material: {
        type: 'Basic',
      },
    }, */
    image: {
      /* material: {
        type: 'Basic',
      }, */
      texture: {
        minFilter: 'LinearFilter',
        magFilter: 'LinearFilter',
        wrapS: 'ClampToEdgeWrapping',
        wrapT: 'ClampToEdgeWrapping'
      }
    },
    fbo: {
      quality: 1.0,
      color: {
        texture: {
          minFilter: 'NearestFilter',
          magFilter: 'NearestFilter',
          wrapS: 'ClampToEdgeWrapping',
          wrapT: 'ClampToEdgeWrapping'
        }
      },
      depth: {
        texture: {
          minFilter: 'NearestFilter',
          magFilter: 'NearestFilter',
          wrapS: 'ClampToEdgeWrapping',
          wrapT: 'ClampToEdgeWrapping'
        }
      }
    },
    screen: {
      quality: 1.0,
      width: 1920,
      height: 1080
      // aspectRatio calculated below
      // perspectiveText2dZ: -0.11,
    },
    shadow: {
      mapSize: {
        width: 1024,
        height: 1024
      }
    },
    camera: {
      type: 'Perspective',
      fov: 75,
      // aspectRatio calculated below
      near: 0.1,
      far: 1000,
      position: { x: 0.0, y: 0.0, z: 2.0 },
      lookAt: { x: 0.0, y: 0.0, z: 0.0 },
      up: { x: 0.0, y: 1.0, z: 0.0 }
    },
    lights: [
      /* {
        type: 'Ambient',
        color: { r: 0.5, g: 0.5, b: 0.5 },
        intensity: 1.0,
      },
      {
        type: 'Directional',
        castShadow: true,
        color: { r: 1.0, g: 1.0, b: 1.0 },
        intensity: 1.0,
        position: { x: 0.0, y: 1.0, z: 2.0 },
      }, */
    ],
    renderer: {
      antialias: true,
      alpha: true,
      autoClear: false,
      sortObjects: false
    }
  };
  this.demo.screen.aspectRatio =
    this.demo.screen.width / this.demo.screen.height;
  this.demo.camera.aspectRatio = this.demo.screen.aspectRatio;

  if (import.meta.env.MODE === 'production') {
    this.engine.tool = false;
    this.engine.enabledLogLevels = ['info', 'warning', 'error'];
    this.engine.webDemoExe = true;
    this.menu.fullscreen = true;
  }
};

Settings.prototype.setXyz = function (src, dst) {
  if (!src) {
    return;
  }

  dst.x = src.x;
  dst.y = src.y;
  dst.z = src.z;
};

Settings.prototype.toThreeJsColor = function (color) {
  return new THREE.Color(color.r, color.g, color.b);
};

Settings.prototype.toThreeJsProperties = function (src, dst) {
  if (!src) {
    return;
  }
  if (!dst) {
    throw new Error('Destination object is undefined');
  }

  Object.keys(src).forEach((key) => {
    if (key === 'type') {
      return;
    }

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
      throw new Error(
        `Type mismatch for property ${key}: ${dstType} != ${srcType}`
      );
    }

    dst[key] = value;
  });
};

Settings.prototype.createScene = function () {
  const scene = new THREE.Scene();
  if (this.demo.backgroundColor) {
    scene.background = this.toThreeJsColor(this.demo.backgroundColor);
  }
  if (this.demo.fog) {
    scene.fog = new THREE.Fog(
      this.toThreeJsColor(this.demo.fog.color),
      this.demo.fog.near,
      this.demo.fog.far
    );
  }
  return scene;
};

Settings.prototype.createCamera = function () {
  const CameraType = THREE[this.demo.camera.type + 'Camera'];
  if (!CameraType || (!CameraType.prototype) instanceof THREE.Camera) {
    loggerWarning('Unsupported camera type: ' + this.demo.camera.type);
    return;
  }

  const camera = new CameraType(
    this.demo.camera.fov,
    this.demo.camera.aspectRatio,
    this.demo.camera.near,
    this.demo.camera.far
  );
  this.setXyz(this.demo.camera.position, camera.position);
  this.setXyz(this.demo.camera.lookAt, camera.lookAt);
  this.setXyz(this.demo.camera.up, camera.up);

  return camera;
};

Settings.prototype.createLight = function (light) {
  const LightType = THREE[light.type + 'Light'];
  if (!LightType || (!LightType.prototype) instanceof THREE.Light) {
    loggerWarning('Unsupported light type: ' + light.type);
    return;
  }

  const lightObj = new LightType(
    this.toThreeJsColor(light.color),
    light.intensity
  );
  this.setXyz(light.position, lightObj.position);

  if (light.castShadow) {
    lightObj.castShadow = light.castShadow;
    lightObj.shadow.mapSize.width = this.demo.shadow.mapSize.width;
    lightObj.shadow.mapSize.height = this.demo.shadow.mapSize.height;
    lightObj.shadow.camera.near = this.demo.camera.near;
    lightObj.shadow.camera.far = this.demo.camera.far;
  }

  return lightObj;
};

Settings.prototype.createLightsToScene = function (scene) {
  this.demo.lights.forEach((light) => {
    scene.add(this.createLight(light));
  });
};

Settings.prototype.createRenderer = function (canvas) {
  const rendererSettings = {
    ...this.demo.renderer,
    canvas
  };

  const renderer = new THREE.WebGLRenderer(rendererSettings);
  renderer.setClearColor(
    this.toThreeJsColor(this.demo.clearColor),
    this.demo.clearColor.a
  );
  renderer.autoClear = this.demo.renderer.autoClear;
  renderer.sortObjects = this.demo.renderer.sortObjects;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

  return renderer;
};

Settings.prototype.createMaterial = function (materialSettings) {
  const MaterialType = THREE['Mesh' + materialSettings.type + 'Material'];
  if (!MaterialType || (!MaterialType.prototype) instanceof THREE.Material) {
    loggerWarning('Unsupported material type: ' + materialSettings.type);
    return new THREE.MeshBasicMaterial();
  }

  const material = new MaterialType();
  this.toThreeJsProperties(materialSettings, material);

  return material;
};

window.Settings = Settings;

export { Settings };

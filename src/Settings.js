import * as THREE from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { loggerWarning } from './Bindings';
import { Utils } from './Utils';

const THREEAddons = {
  LineMaterial: LineMaterial
};

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

Settings.prototype.asObject = function () {
  return {
    engine: this.engine,
    tool: this.tool,
    menu: this.menu,
    demo: this.demo
  };
};

Settings.prototype.asJson = function () {
  return JSON.stringify(this.asObject(), null, 2);
};

Settings.prototype.init = function () {
  this.engine = {
    demoPathPrefix: 'data/', // default demo project root
    tool: true, // true = enable tool mode, false = player mode
    pauseOnInvisibility: true, // Pause demo if tab is not visible
    fileWatchInterval: 250, // Interval in milliseconds to check for file changes
    preload: true, // Preload all resources before starting the demo, for quicker demo development it's recommended to set this to false
    preloadSteps: undefined, // preload calculation of the demo, defaults to render frame every 0.5s during loading
    enabledLogLevels: ['trace', 'debug', 'info', 'warn', 'error'], // enabled log levels you can see in Browser Console
    bannerLogLevels: ['warn', 'error'], // log levels that will be displayed in the alert banner when in tool mode
    webDemoExe: false, // true = build for https://github.com/pandrr/WebDemoExe/ executable
    autoStart: false, // start demo automatically when the page is loaded skipping menu / user interaction, this may disable sound until user interaction happens
    startTime: 0, // place of time when the demo starts
    loopAtTime: undefined, // place of time when the demo loops to startTime
    fps: 60, // frames per second
    material: {
      mapTypes: ['map', 'envMap', 'bumpMap', 'normalMap'] // map types recognized by the engine in image loading
    }
  };

  this.tool = {
    server: {
      enabled: true, // if tool mode should connect to tool server (program in tool_server/ directory)
      uriScheme: 'ws', // communication protocol
      host: 'localhost', // host address
      port: 7447 // host port
    },
    client: {
      maxBufferedAmount: 1024 * 1024 * 100, // 100MB payload data buffer
      stopOnDisconnect: true // stop demo if server disconnects
    },
    midi: {
      capture: true, // capture MIDI events
      playbackLogging: true, // enable playback logging
      recordingName: 'default' // name of the MIDI recording
    }
  };

  this.menu = {
    quality: 1.0 // quality of the screen, 1.0 = full quality, 0.8 = medium quality, 0.6 = low quality etc.
  };

  this.demo = {
    duration: undefined, // duration in milliseconds, if not specified, music duration is used
    timerSpeed: 1.0, // speed of the timer, 1.0 = normal speed, 0.5 = half speed, e.g., one timer second = two real seconds
    animation: {
      // defaults for animations (e.g., this.loader.addAnimation method calls)
      default: {
        start: 0, // default animation start time in seconds
        duration: 10000, // default animation duration in seconds
        layer: 1 // default animation layer
      }
    },
    clearColor: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 }, // default clear color for the scene
    sync: {
      rocketFile: undefined, // rocket websocket + file connection can be enabled by defining rocket file path, e.g.: 'sync/sync.rocket'
      beatsPerMinute: 120, // beats per minute for the demo, used for calculating beat time
      rowsPerBeat: 8, // number of rows per beat for GNU Rocket
      midi: {
        sync: undefined, // MIDI + file connection can be enabled by defining sync file path or JSON data, e.g.: 'sync/midi.json'
        syncData: undefined // MIDI sync data can be defined directly as JSON object instead of file path
      }
    },
    music: {
      musicFile: 'music.mp3', // music file to be played, can be undefined if no music is used
      spectogramFile: 'spectogram.png', // spectogram image file, can be undefined if no spectogram is used
      volume: 1.0, // volume of the music, 1.0 = full volume, 0.5 = half volume, etc.
      loop: false // whether the music should loop
    },
    // backgroundColor: { r: 0.0, g: 1.0, b: 0.0 },
    /* fog: {
      color: { r: 0.0, g: 0.0, b: 0.0 },
      near: 0.1,
      far: 900,
    }, */
    compatibility: {
      old2dCoordinates: false, // true = use old pixel based 2D coordinate system, for example: x: 0 - 1920, y: 0 - 1080
      oldRotation: false, // true = use old degree rotation system where positive rotation is clockwise
      oldColors: false, // true = use old HEX color format 0 - 255 per color channel, for example: { r: 255, g: 0, b: 0, a: 255 }
      oldMaterials: false // true = 3D model material is DoubleSide by default
    },
    text: {
      perspective3d: {
        material: {
          type: 'Phong', // default material type for 3D text
          transparent: true // whether the material is transparent
        }
      }
    },
    cubeMap: {
      renderTarget: {
        size: 1024,
        options: {
          // generateMipmaps: false,
          // minFilter: 'LinearFilter',
          // magFilter: 'LinearFilter',
          // wrapS: 'ClampToEdgeWrapping',
          // wrapT: 'ClampToEdgeWrapping',
          // format: 'RGBAFormat',
          // type: 'UnsignedByteType',
          // anisotropy: 1,
          // colorSpace: 'NoColorSpace',
          // depthBuffer: true,
          // stencilBuffer: false
        },
        texture: {
          type: 'HalfFloatType'
          // encoding: 'LinearEncoding'
        }
      },
      camera: {
        near: 0.1, // near clipping plane
        far: 1000 // far clipping plane
      }
    },
    model: {
      shape: {
        material: {
          type: 'Phong', // default material type for 3D shapes
          transparent: true // whether the material is transparent
        },
        skysphere: {
          material: {
            type: 'Basic', // default material type for skysphere
            transparent: true // whether the material is transparent
          }
        },
        line: {
          material: {
            type: 'Line', // default material type for line
            transparent: true // whether the material is transparent
          }
        }
      }
    },
    image: {
      /* material: {
        type: 'Basic',
      }, */
      texture: {
        minFilter: 'LinearFilter', // default texture minification filter
        magFilter: 'LinearFilter', // default texture magnification filter
        wrapS: 'ClampToEdgeWrapping', // default texture wrapping mode for S (horizontal) axis
        wrapT: 'ClampToEdgeWrapping' // default texture wrapping mode for T (vertical) axis
      }
    },
    fbo: {
      quality: 1.0, // quality of the FBO, 1.0 = full quality, 0.8 = medium quality, 0.6 = low quality etc.
      color: {
        texture: {
          minFilter: 'LinearFilter', // default color texture minification filter
          magFilter: 'LinearFilter', // default color texture magnification filter
          wrapS: 'ClampToEdgeWrapping', // default color texture wrapping mode for S (horizontal) axis
          wrapT: 'ClampToEdgeWrapping' // default color texture wrapping mode for T (vertical) axis
        }
      },
      depth: {
        texture: {
          minFilter: 'LinearFilter', // default depth texture minification filter
          magFilter: 'LinearFilter', // default depth texture magnification filter
          wrapS: 'ClampToEdgeWrapping', // default depth texture wrapping mode for S (horizontal) axis
          wrapT: 'ClampToEdgeWrapping' // default depth texture wrapping mode for T (vertical) axis
        }
      }
    },
    screen: {
      quality: 1.0, // quality of the screen, 1.0 = full quality, 0.8 = medium quality, 0.6 = low quality etc.
      width: 1920, // default (virtual) screen width, canvas is as big as the device has it but demo assumes internal virtual screen where canvas is rendered to have these (FullHD) dimensions
      height: 1080 // default (virtual) screen height
      // aspectRatio calculated below
      // perspectiveText2dZ: -0.11,
    },
    shadow: {
      mapSize: {
        width: 1024, // default shadow map size width
        height: 1024 // default shadow map size height
      }
    },
    camera: {
      type: 'Perspective', // default camera type, can be 'Perspective' or 'Orthographic'
      fov: 75, // field of view
      // aspectRatio calculated below
      near: 0.1, // near clipping plane
      far: 1000, // far clipping plane
      zoom: 1.0, // zoom level
      position: { x: 0.0, y: 0.0, z: 2.0 }, // camera position in 3D space
      lookAt: { x: 0.0, y: 0.0, z: 0.0 }, // point the camera is looking at
      up: { x: 0.0, y: 1.0, z: 0.0 } // up direction of the camera
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
      antialias: false, // whether to use antialiasing
      alpha: true, // whether to enable alpha channel
      autoClear: true, // whether to automatically clear the canvas
      sortObjects: false, // whether to sort objects by distance
      preserveDrawingBuffer: true // whether to preserve the drawing buffer
    }
  };
  this.demo.screen.aspectRatio =
    this.demo.screen.width / this.demo.screen.height;
  this.demo.camera.aspectRatio = this.demo.screen.aspectRatio;

  if (import.meta.env.MODE === 'production') {
    this.engine.tool = false;
    this.engine.enabledLogLevels = ['info', 'warn', 'error'];

    // eslint-disable-next-line n/no-process-env
    this.engine.webDemoExe = process.env.NODE_ENV === 'exe';

    if (this.engine.webDemoExe) {
      this.engine.autoStart = true;
    }
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

    let value = Utils.evaluateVariable(undefined, src[key]);
    if (typeof value === 'string') {
      if (THREE[value] !== undefined) {
        value = THREE[value];
      }
    }

    const dstType = typeof dst[key];
    const srcType = typeof value;
    if (dstType !== 'undefined' && dstType !== srcType) {
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

Settings.prototype.getMaterialClass = function (type) {
  let materialClass =
    THREE['Mesh' + (type || 'Basic') + 'Material'] ||
    THREE[type + 'Material'] ||
    THREEAddons['Mesh' + (type || 'Basic') + 'Material'] ||
    THREEAddons[type + 'Material'];

  if (!materialClass || (!materialClass.prototype) instanceof THREE.Material) {
    loggerWarning('Unsupported material type: ' + type);
    materialClass = THREE.MeshBasicMaterial;
  }

  return materialClass;
};

Settings.prototype.createMaterial = function (materialSettings) {
  const materialClass = this.getMaterialClass(materialSettings.type);

  const material = new materialClass();
  this.toThreeJsProperties(materialSettings, material);

  return material;
};

window.Settings = Settings;

export { Settings };

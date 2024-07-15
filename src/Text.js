import * as THREE from 'three';
import { Font } from 'three/addons/loaders/FontLoader';
import { TextGeometry } from 'three/addons/geometries/TextGeometry';
import { loggerWarning } from './Bindings';
import { FileManager } from './FileManager';
import { Settings } from './Settings';
import { Instancer } from './Instancer';

import vertexShader3dData from './_embedded/default.vs?raw';
import vertexShader3dBillboardData from './_embedded/billboard.vs?raw';
import vertexShader2dData from './_embedded/defaultFixedView.vs?raw';
import fragmentShaderData from './_embedded/defaultPlain.fs?raw';
const settings = new Settings();

const Text = function (animationDefinition) {
  this.font = undefined;
  this.text = undefined;

  if (!animationDefinition) {
    animationDefinition = {};
  }

  this.additive = animationDefinition.additive === true;
  this.billboard = animationDefinition.billboard === true;
  this.instancer = new Instancer(this, animationDefinition.instancer);
};

Text.fonts = {};
Text.clearCache = function () {
  Text.fonts = {};
};

Text.getFontFromCache = function (filePath) {
  return Text.fonts[new FileManager().getPath(filePath)];
};

Text.setFontFromCache = function (filePath, data) {
  Text.fonts[new FileManager().getPath(filePath)] = data;
};

Text.prototype.load = function (name) {
  const instance = this;

  if (!name.toUpperCase().endsWith('.TTF')) {
    // To ensure best possible cross-browser and engine support, supported file formats are being restricted
    throw new Error('Unsupported font format ' + name);
  }

  if (Text.getFontFromCache(name)) {
    return new Promise((resolve, reject) => {
      instance.font = Text.getFontFromCache(name);
      resolve(true);
    });
  }

  const fileManager = new FileManager();
  return fileManager.load(name, this, (instance, json) => {
    try {
      Text.setFontFromCache(name, new Font(json));
    } catch (e) {
      loggerWarning('Error loading Font file: ' + name + ' ' + e);
      return false;
    }
    return true;
  });
};

Text.prototype.setFont = function (name) {
  this.font = Text.getFontFromCache(name);
};

Text.prototype.createMaterial = function () {
  let vertexShader = vertexShader2dData;
  if (!this.perspective2d) {
    vertexShader = this.billboard
      ? vertexShader3dBillboardData
      : vertexShader3dData;
  }

  const shader = {
    uniforms: {
      // texture0: { value: this.texture },
      color: { value: new THREE.Vector4(1, 1, 1, 1) }
    },
    vertexShader,
    fragmentShader: fragmentShaderData
  };

  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: THREE.UniformsUtils.clone(shader.uniforms),
    vertexShader: shader.vertexShader,
    fragmentShader: shader.fragmentShader
    // blending:THREE.CustomBlending,
    // depthTest: false,
    // depthWrite: false,
    // transparent: true,
    // map: texture,
  });
  // material = settings.createMaterial(settings.demo.image.material);
  material.map = this.texture;
  material.blending = THREE.CustomBlending;
  if (this.perspective2d) {
    material.depthTest = true;
    material.depthWrite = false;

    // material = settings.createMaterial(settings.demo.text.material);
    // material.map = this.texture;
    material.castShadow = false;
    material.receiveShadow = false;
  }

  if (this.additive) {
    material.depthWrite = false;
    material.blending = THREE.AdditiveBlending;
  }

  return material;
};

Text.prototype.setValue = function (text) {
  if (this.text !== text) {
    this.text = text;
    // this.geometry.dispose();
    this.geometry = new TextGeometry(text, {
      font: this.font,
      size: this.perspective2d ? 1.0 : 4.3,
      depth: 0.01
      // curveSegments: 12,
      // bevelEnabled: false,
      // bevelThickness: 0.03,
      // bevelSize: 0.02,
      // bevelOffset: 0,
      // bevelSegments: 5
    });

    this.geometry.computeBoundingBox();
    this.geometry.computeVertexNormals();

    this.xOffset =
      -0.5 *
      (this.geometry.boundingBox.max.x - this.geometry.boundingBox.min.x);
    this.yOffset =
      -0.5 *
      (this.geometry.boundingBox.max.y - this.geometry.boundingBox.min.y);
    this.zOffset =
      -0.5 *
      (this.geometry.boundingBox.max.z - this.geometry.boundingBox.min.z);

    // this.material = new THREE.MeshBasicMaterial( { color: 0xffffff, blending:THREE.CustomBlending, depthTest: false, depthWrite: false } );
    this.material = this.createMaterial();

    this.mesh = this.instancer.createMesh(this.geometry, this.material);
    this.mesh.geometry.center();
    if (this.perspective2d) {
      this.mesh.frustumCulled = false; // Avoid getting clipped in 2d
    }
    this.ptr = this.mesh;

    this.setPosition(0, 0, 0);
  }
  // setDrawTextString(text);
};

Text.prototype.setDefaults = function () {
  // setTextDefaults();
};

Text.prototype.setPivot = function (x, y, z) {
  // setTextPivot(x, y, z);
};

Text.prototype.setRotation = function (degreesX, degreesY, degreesZ) {
  // setTextRotation(degreesX, degreesY, degreesZ);
  this.mesh.rotation.x = (degreesX * Math.PI) / 180;
  this.mesh.rotation.y = (degreesY * Math.PI) / 180;
  this.mesh.rotation.z = (degreesZ * Math.PI) / 180;
  if (settings.demo.compatibility.oldRotation) {
    this.mesh.rotation.x *= -1;
    this.mesh.rotation.y *= -1;
    this.mesh.rotation.z *= -1;
  }
};

Text.prototype.setScale = function (x, y, z) {
  // setTextSize(x, y, z);
  const compatibilityConstant = 0.025;
  this.mesh.scale.x = x * compatibilityConstant;
  this.mesh.scale.y = y * compatibilityConstant;
  this.mesh.scale.z = z * compatibilityConstant;
};

Text.prototype.setPosition = function (x, y, z) {
  // setTextPosition(x, y, z);
  if (this.perspective2d) {
    if (settings.demo.compatibility.old2dCoordinates) {
      x = x / settings.demo.screen.width - 0.5;
      y = y / settings.demo.screen.height - 0.5;
    }
    x *= settings.demo.screen.aspectRatio;
    this.mesh.position.z = -(settings.demo.camera.near + 0.5);
  } else {
    this.mesh.position.z = z;
  }
  this.mesh.position.x = x;
  this.mesh.position.y = y;
};

Text.prototype.setCenterAlignment = function (align) {
  // setTextCenterAlignment(align);
};

Text.prototype.setColor = function (r, g, b, a) {
  // setTextColor(r, g, b, a);
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

  if (this.mesh.material instanceof THREE.ShaderMaterial) {
    if (this.mesh.material.uniforms && this.mesh.material.uniforms.color) {
      this.mesh.material.uniforms.color.value = new THREE.Vector4(
        nr,
        ng,
        nb,
        na
      );
    }
  } else {
    this.mesh.material.color = new THREE.Color(nr, ng, nb);
    this.mesh.material.opacity = na;
  }
};

Text.prototype.setPerspective2d = function (perspective2d) {
  // setTextPerspective3d(perspective2d === true ? 0 : 1);
  this.perspective2d = perspective2d === true;
};

Text.prototype.draw = function (time) {
  // drawText();
  // const camera = getCamera();
  // camera.projectionMatrix

  this.instancer.draw(time);
};

export { Text };

import * as THREE from 'three';
import { Fbo } from './Fbo';
import { loggerWarning } from './Bindings';
import { DemoRenderer } from './DemoRenderer';
import { FileManager } from './FileManager';
import { Settings } from './Settings';
import { Video } from './Video';
import { Instancer } from './Instancer';
import vertexShader3dData from './_embedded/default.vs?raw';
import vertexShader3dBillboardData from './_embedded/billboard.vs?raw';
import vertexShader2dData from './_embedded/default2d.vs?raw';
import fragmentShaderData from './_embedded/default2d.fs?raw';

const settings = new Settings();

const Image = function (animationDefinition) {
  this.ptr = undefined;
  this.id = undefined;
  this.filename = undefined;
  this.width = undefined;
  this.height = undefined;
  this.texture = [];
  this.material = undefined;
  this.mesh = undefined;
  this.perspective2d = true;
  this.video = undefined;

  if (!animationDefinition) {
    animationDefinition = {};
  }

  this.textureProperties = animationDefinition.textureProperties || [];
  this.additive = animationDefinition.additive === true;
  this.billboard = animationDefinition.billboard === true;
  this.instancer = new Instancer(this, animationDefinition.instancer);
};

Image.prototype.createMaterial = function () {
  const uniforms = {
    color: { value: new THREE.Vector4(1, 1, 1, 1) }
  };

  for (let i = 0; i < this.texture.length; i++) {
    uniforms['texture' + i] = { value: this.texture[i] };
  }

  let vertexShader = vertexShader2dData;
  if (!this.perspective2d) {
    vertexShader = this.billboard
      ? vertexShader3dBillboardData
      : vertexShader3dData;
  }

  const shader = {
    uniforms,
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
  material.map = this.texture[0];

  material.blending = THREE.CustomBlending;
  if (this.perspective2d) {
    material.depthTest = true;
    material.depthWrite = false;
  }

  if (this.additive) {
    material.depthWrite = false;
    material.blending = THREE.AdditiveBlending;
  }

  return material;
};

Image.prototype.generateMesh = function () {
  if (this.texture[0] === undefined) {
    throw new Error('Texture not loaded, cannot generate image mesh');
  }

  if (this.width === undefined || this.height === undefined) {
    if (this.fbo) {
      this.width = settings.demo.screen.width;
      this.height = settings.demo.screen.height;
    } else {
      this.width = this.texture[0].image.width;
      this.height = this.texture[0].image.height;
    }
  }

  this.texture.forEach((texture, index) => {
    const customTextureProperties =
      (this.textureProperties instanceof Array
        ? this.textureProperties[index]
        : this.textureProperties) || {};
    const textureProperties = {
      ...settings.demo.image.texture,
      ...customTextureProperties
    };
    settings.toThreeJsProperties(textureProperties, texture);
  });

  this.material = this.createMaterial();
  // this.material = new THREE.MeshBasicMaterial({ map: this.texture[0], blending:THREE.CustomBlending, depthTest: false, depthWrite: false });
  let w =
    (this.width / settings.demo.screen.width) *
    settings.demo.screen.aspectRatio;
  let h = this.height / settings.demo.screen.height;
  if (!this.perspective2d) {
    w *= 3;
    h *= 3;
  }

  this.mesh = this.instancer.createMesh(
    new THREE.PlaneGeometry(w, h),
    this.material
  );

  // instance.mesh.renderOrder = 100;
  this.ptr = this.mesh;
  if (this.perspective2d) {
    this.mesh.frustumCulled = false; // Avoid getting clipped in 2d
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.position.z = 0; // settings.demo.screen.perspective2dZ;
  }

  if (settings.engine.preload) {
    for (let i = 0; i < this.texture.length; i++) {
      new DemoRenderer().renderer.initTexture(this.texture[i]);
    }
  }
};

Image.prototype.load = async function (filenames, noGenerate) {
  if (typeof filenames === 'string') {
    filenames = [filenames];
  }

  for (let i = 0; i < filenames.length; i++) {
    await this.loadTexture(filenames[i]);
  }

  if (noGenerate !== true) {
    this.generateMesh();
  }
};

Image.prototype.isFileSupported = function (filenames) {
  const files = filenames instanceof Array ? filenames : [filenames];

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    if (
      !filename ||
      (!filename.toUpperCase().endsWith('.PNG') &&
        !filename.toUpperCase().endsWith('.MP4') &&
        !filename.endsWith('.fbo'))
    ) {
      return false;
    }
  }

  return true;
};

Image.prototype.loadTexture = function (filename) {
  if (!this.isFileSupported(filename)) {
    // To ensure best possible cross-browser and engine support, supported file formats are being restricted
    throw new Error('Unsupported image format ' + filename);
  }

  this.filename = filename;
  // var legacy = imageLoadImage(filename);
  // this.ptr = legacy.ptr;
  // this.id = legacy.id;
  // this.width = legacy.width;
  // this.height = legacy.height;

  const instance = this;
  instance.texture.push(undefined);
  const textureI = instance.texture.length - 1;

  if (instance.filename.endsWith('.fbo')) {
    const colorTexture = instance.filename.endsWith('.color.fbo');
    const fboName = instance.filename
      .replace('.depth.fbo', '')
      .replace('.color.fbo', '');

    return new Promise((resolve, reject) => {
      try {
        const fbo = Fbo.init(fboName);
        instance.fbo = fbo;
        instance.texture[textureI] = colorTexture
          ? fbo.color.texture[0]
          : fbo.depth.texture[0];
        resolve(instance);
      } catch (e) {
        loggerWarning('Could not load FBO ' + instance.filename);
        reject(instance);
      }
    });
  } else if (instance.filename.toUpperCase().endsWith('.MP4')) {
    const video = new Video();
    return video.load(filename, instance, (instance, video) => {
      instance.texture[textureI] = video.texture;
      instance.texture[textureI].video = video;
      instance.width = video.videoElement.videoWidth;
      instance.height = video.videoElement.videoHeight;
      // loggerDebug('Loaded video ' + instance.filename + ' (' + instance.width + 'x' + instance.height + ')');
      return true;
    });
  } else if (instance.filename.toUpperCase().endsWith('.PNG')) {
    return new FileManager().load(filename, instance, (instance, texture) => {
      instance.texture[textureI] = texture;
      // loggerDebug('Loaded texture ' + instance.filename + ' (' + instance.width + 'x' + instance.height + ')');
      return true;
    });
  }
};

Image.prototype.setPerspective2d = function (perspective2d) {
  // setTexturePerspective3d(this.ptr, perspective2d === true ? 0 : 1);
  this.perspective2d = perspective2d === true;
};

Image.prototype.setRotation = function (degreesX, degreesY, degreesZ, x, y, z) {
  // setTextureRotation(this.ptr, degreesX, degreesY, degreesZ, x, y, z);
  this.mesh.rotation.x = (degreesX * Math.PI) / 180;
  this.mesh.rotation.y = (degreesY * Math.PI) / 180;
  this.mesh.rotation.z = (degreesZ * Math.PI) / 180;
  if (settings.demo.compatibility.oldRotation) {
    this.mesh.rotation.x *= -1;
    this.mesh.rotation.y *= -1;
    this.mesh.rotation.z *= -1;
  }

  // this.mesh.rotation = new THREE.Euler( radiansX, radiansY, radiansZ, 'XYZ' );
};

Image.prototype.setScale = function (x, y, z) {
  // setTextureScale(this.ptr, x, y, z);
  this.mesh.scale.x = x;
  this.mesh.scale.y = y;
  this.mesh.scale.z = z;
};

Image.prototype.setPosition = function (x, y, z) {
  // setTexturePosition(this.ptr, x, y, z);
  this.mesh.position.x = x;
  this.mesh.position.y = y;
  this.mesh.position.z = z;
  if (this.perspective2d) {
    if (settings.demo.compatibility.old2dCoordinates) {
      this.mesh.position.x = x / settings.demo.screen.width - 0.5;
      this.mesh.position.y = y / settings.demo.screen.height - 0.5;
    }
    this.mesh.position.x *= settings.demo.screen.aspectRatio;
    this.mesh.position.z = 0;
  }
};

Image.prototype.setCenterAlignment = function (align) {
  // setTextureCenterAlignment(this.ptr, align);
};

Image.prototype.setColor = function (r, g, b, a) {
  // setTextureColor(this.ptr, r, g, b, a);
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

Image.prototype.setSizeToScreenSize = function () {
  // setTextureSizeToScreenSize(this.ptr);
};

Image.prototype.setDefaults = function () {
  // loggerWarning("setTextureDefaults not implemented");
  // setTextureDefaults(this.ptr);
};

Image.prototype.draw = function (time) {
  // drawTexture(this.ptr);
  // this.mesh.visible = true;
  this.instancer.draw(time);

  for (let i = 0; i < this.texture.length; i++) {
    this.material.uniforms['texture' + i].value = this.texture[i];
  }
};

export { Image };

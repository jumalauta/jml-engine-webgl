import * as THREE from 'three';
import { Fbo } from './Fbo';
import { loggerWarning } from './Bindings';
import { DemoRenderer } from './DemoRenderer';
import { FileManager } from './FileManager';
import { Settings } from './Settings';
import vertexShaderData from './_embedded/default2d.vs?raw'
import fragmentShaderData from './_embedded/default2d.fs?raw'

const settings = new Settings();

var Image = function() {
  this.ptr = undefined;
  this.id = undefined;
  this.filename = undefined;
  this.width = undefined;
  this.height = undefined;
  this.texture = undefined;
  this.material = undefined;
  this.mesh = undefined;
  this.perspective2d = true;
}

  //var planeGeometry = new THREE.PlaneGeometry(1, 16/9);
  //var planeMaterial = new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load("s3_bg.png"), depthTest: false, depthWrite:false });
  //data.plane = new THREE.Mesh(planeGeometry, planeMaterial);
  //data.plane.position.x = 0;
  //data.plane.position.y = 0;
  //data.plane.position.z = 0;
  //data.bgScene.add(data.plane);

Image.prototype.createMaterial = function() {
  const shader = {
    uniforms: {
        texture0: { value: this.texture },
        color: { value: new THREE.Vector4(1, 1, 1, 1) },
    },
    // Manually added vertex shader to get the fragment shader running
    vertexShader: vertexShaderData,
    fragmentShader: fragmentShaderData
  };

  let material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: THREE.UniformsUtils.clone(shader.uniforms),
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      //blending:THREE.CustomBlending,
      //depthTest: false,
      //depthWrite: false,
      //transparent: true,
      //map: texture,
  });
  //material = settings.createMaterial(settings.demo.image.material);
  material.map = this.texture;
  material.blending = THREE.CustomBlending;
  material.depthTest = false;
  material.depthWrite = false;

  return material;
}

Image.prototype.generateMesh = function() {
  if (this.texture === undefined) {
    throw new Error("Texture not loaded, cannot generate image mesh");
  }

  this.width = this.texture.image.width;
  this.height = this.texture.image.height;
  settings.toThreeJsProperties(settings.demo.image.texture, this.texture);

  if (this.fbo) {
    this.width = settings.demo.screen.width;
    this.height = settings.demo.screen.height;  
  }
  this.material = this.createMaterial();
  //this.material = new THREE.MeshBasicMaterial({ map: this.texture, blending:THREE.CustomBlending, depthTest: false, depthWrite: false });
  this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.width/settings.demo.screen.width*settings.demo.screen.aspectRatio, this.height/settings.demo.screen.height), this.material);
  this.mesh.castShadow = false;
  this.mesh.receiveShadow = false;
  //instance.mesh.renderOrder = 100;
  this.ptr = this.mesh;
  this.mesh.position.z = 0;//settings.demo.screen.perspective2dZ;
  this.mesh.frustumCulled = false;  // Avoid getting clipped in 2d

  if (settings.engine.preload) {
    (new DemoRenderer()).renderer.initTexture(this.texture);
  }
}

Image.prototype.load = function(filename) {
  this.filename = filename;
  //var legacy = imageLoadImage(filename);
  //this.ptr = legacy.ptr;
  //this.id = legacy.id;
  //this.width = legacy.width;
  //this.height = legacy.height;

  let instance = this;

  if (instance.filename.endsWith('.fbo')) {
    let colorTexture = instance.filename.endsWith('.color.fbo');
    let fboName = instance.filename.replace('.depth.fbo', '').replace('.color.fbo', '');

    return new Promise((resolve, reject) => {
      try {
        let fbo = Fbo.init(fboName);
        instance.fbo = fbo;
        instance.texture = colorTexture ? fbo.color.texture : fbo.depth.texture;
        instance.generateMesh();
        resolve(instance);
      } catch (e) {
        loggerWarning('Could not load FBO ' + instance.filename);
        reject(instance);
      }
    });
  } else {
    return (new FileManager()).load(filename, instance, (instance, texture) => {
      instance.texture = texture;
      instance.generateMesh();
      //loggerDebug('Loaded texture ' + instance.filename + ' (' + instance.width + 'x' + instance.height + ')');
      return true;
    });
  }
}

Image.prototype.setBlendFunc = function(src, dst) {
  loggerWarning("setBlendFunc not implemented");
}

Image.prototype.setPerspective2d = function(perspective2d) {
  //setTexturePerspective3d(this.ptr, perspective2d === true ? 0 : 1);
  this.perspective2d = (perspective2d === true);
}

Image.prototype.setCanvasDimensions = function(width, height) {
  loggerWarning("setCanvasDimensions not implemented");
  //setTextureCanvasDimensions(this.ptr, width, height);
}

Image.prototype.setUvDimensions = function(width, height) {
  loggerWarning("setTextureUvDimensions not implemented");
  //setTextureUvDimensions(this.ptr, uMin, vMin, uMax, vMax);
}

Image.prototype.setUnitTexture = function(index, ptr) {
  //setTextureUnitTexture(this.ptr, index, ptr);
}

Image.prototype.setPivot = function( x, y, z) {
  loggerWarning("setTexturePivot not implemented");
  //setTexturePivot(this.ptr, x, y, z);
}

Image.prototype.setRotation = function(degreesX, degreesY, degreesZ, x, y, z) {
  //setTextureRotation(this.ptr, degreesX, degreesY, degreesZ, x, y, z);
  this.mesh.rotation.x = degreesX * Math.PI / 180;
  this.mesh.rotation.y = degreesY * Math.PI / 180;
  this.mesh.rotation.z = degreesZ * Math.PI / 180;

  //this.mesh.rotation = new THREE.Euler( radiansX, radiansY, radiansZ, 'XYZ' );
}

Image.prototype.setScale = function(x, y, z) {
  //setTextureScale(this.ptr, x, y, z);
  this.mesh.scale.x = x;
  this.mesh.scale.y = y;
  this.mesh.scale.z = z;
}

Image.prototype.setPosition = function(x, y, z) {
  //setTexturePosition(this.ptr, x, y, z);
  this.mesh.position.x = x;
  this.mesh.position.y = y;
  this.mesh.position.z = z;
  if (this.perspective2d) {
    if (settings.demo.compatibility.old2dCoordinates) {
      this.mesh.position.x = (((x)/settings.demo.screen.width)-0.5);
      this.mesh.position.y = ((y)/settings.demo.screen.height)-0.5;  
    }
    this.mesh.position.x *= settings.demo.screen.aspectRatio;
    this.mesh.position.z = 0;
  }
}

Image.prototype.setCenterAlignment = function(align) {
  //setTextureCenterAlignment(this.ptr, align);
}

Image.prototype.setColor = function(r, g, b, a) {
  //setTextureColor(this.ptr, r, g, b, a);
  let nr = r;
  let ng = g;
  let nb = b;
  let na = a;
  if (settings.demo.compatibility.oldColors) {
    nr = r/0xFF;
    ng = g/0xFF;
    nb = b/0xFF;
    na = a/0xFF;
  }

  if (this.mesh.material instanceof THREE.ShaderMaterial) {
    if (this.mesh.material.uniforms && this.mesh.material.uniforms.color) {
      this.mesh.material.uniforms.color.value = new THREE.Vector4(nr, ng, nb, na);
    }
  } else {
    this.mesh.material.color = new THREE.Color(nr, ng, nb);
    this.mesh.material.opacity = na;
  }
}

Image.prototype.setSizeToScreenSize = function() {
  //setTextureSizeToScreenSize(this.ptr);
}

Image.prototype.setDefaults = function() {
  //loggerWarning("setTextureDefaults not implemented");
  //setTextureDefaults(this.ptr);
}

Image.prototype.draw = function() {
  //drawTexture(this.ptr);
  //this.mesh.visible = true;
  this.material.uniforms['texture0'].value = this.texture;
}

export { Image };
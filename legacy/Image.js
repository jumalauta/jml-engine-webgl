import * as THREE from 'three';
import { Fbo } from './Fbo';
import { loggerDebug, loggerWarning } from './Bindings';
import { FileManager } from '../FileManager';

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

Image.prototype.generateMesh = function() {
  if (this.texture === undefined) {
    throw new Error("Texture not loaded, cannot generate image mesh");
  }

  this.width = this.texture.image.width;
  this.height = this.texture.image.height;
  this.texture.wrapS = THREE.RepeatWrapping;
  this.texture.wrapT = THREE.RepeatWrapping;

  if (this.fbo) {
    console.warn("fbo dimensions");
    this.width = 1920;
    this.height = 1080;  
  }
  this.material = new THREE.MeshBasicMaterial({ map: this.texture, blending:THREE.CustomBlending, depthTest: false, depthWrite: false });
  this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.width/1920*16/9, this.height/1080), this.material);
  //instance.mesh.renderOrder = 100;
  this.ptr = this.mesh;
  this.mesh.position.z = -0.651;
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
      loggerDebug('Loaded texture ' + instance.filename + ' (' + instance.width + 'x' + instance.height + ')');
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
  if (this.perspective2d){
    this.mesh.position.x = (((x)/1920)-0.5)*(16/9);
    this.mesh.position.y = ((y)/1080)-0.5;
    this.mesh.position.z = -0.651;
  } else {
    this.mesh.position.x = x;
    this.mesh.position.y = y;
    this.mesh.position.z = z;
  }
}

Image.prototype.setCenterAlignment = function(align) {
  //setTextureCenterAlignment(this.ptr, align);
}

Image.prototype.setColor = function(r, g, b, a) {
  //setTextureColor(this.ptr, r, g, b, a);
  if (this.mesh.material instanceof THREE.ShaderMaterial) {
    if (this.mesh.material.uniforms && this.mesh.material.uniforms.color) {
      this.mesh.material.uniforms.color.value = new THREE.Vector4(r/0xFF, g/0xFF, b/0xFF, a/0xFF);
    }
  } else {
    this.mesh.material.color = new THREE.Color(r/0xFF, g/0xFF, b/0xFF);
    this.mesh.material.opacity = a/0xFF;
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
}

export { Image };
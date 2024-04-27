import * as THREE from 'three';
import { Font } from 'three/addons/loaders/FontLoader';
import { TextGeometry } from 'three/addons/geometries/TextGeometry';
import { loggerTrace } from './Bindings';
import { FileManager } from './FileManager';
import { Settings } from './Settings';
import { getCamera } from './DemoRenderer';
const settings = new Settings();

import vertexShaderData from './_embedded/defaultFixedView.vs?raw'
import fragmentShaderData from './_embedded/defaultPlain.fs?raw'

let fonts = {};

var Text = function() {
    this.font = undefined;
    this.text = undefined;
}

Text.prototype.load = function(name) {
    let instance = this;

    if (fonts[name]) {
        return new Promise((resolve, reject) => {
            instance.font = fonts[name];
            resolve(true);
        });
    }

    const fileManager = new FileManager();
    return fileManager.load(name, this, (instance, json) => {
      try {
        fonts[name] = new Font(json);
      } catch (e) {
        loggerWarning('Error loading Font file: ' + name + ' ' + e);
        return false;
      }
      return true;
    });
}

Text.prototype.setFont = function(name) {
    this.font = fonts[name];
}

Text.prototype.createMaterial = function() {
    const shader = {
      uniforms: {
          //texture0: { value: this.texture },
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
  
    //material = settings.createMaterial(settings.demo.text.material);
    //material.map = this.texture;
    material.castShadow = false;
    material.receiveShadow = false;

    return material;
  }
  
Text.prototype.setValue = function(text) {
    if (this.text !== text) {
        this.text = text;
        //this.geometry.dispose();
        this.geometry = new TextGeometry(text, {
            font: this.font,
            size: 1.0,
            depth: 0.01,
            //curveSegments: 12,
            //bevelEnabled: false,
            //bevelThickness: 0.03,
            //bevelSize: 0.02,
            //bevelOffset: 0,
            //bevelSegments: 5
        });

        this.geometry.computeBoundingBox();
        this.geometry.computeVertexNormals();
    
        this.xOffset = - 0.5 * ( this.geometry.boundingBox.max.x - this.geometry.boundingBox.min.x );
        this.yOffset = - 0.5 * ( this.geometry.boundingBox.max.y - this.geometry.boundingBox.min.y );
        this.zOffset = - 0.5 * ( this.geometry.boundingBox.max.z - this.geometry.boundingBox.min.z );
    
        //this.material = new THREE.MeshBasicMaterial( { color: 0xffffff, blending:THREE.CustomBlending, depthTest: false, depthWrite: false } );
        this.material = this.createMaterial();

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.frustumCulled = false; // Avoid getting clipped in 2d
        //this.mesh.position.z = settings.demo.screen.perspectiveText2dZ;
        this.ptr = this.mesh;    

        loggerTrace('Created text mesh "' + text + "'");
    }
    //setDrawTextString(text);
}

Text.prototype.setDefaults = function() {
    //setTextDefaults();
}

Text.prototype.setPivot = function(x, y, z) {
    //setTextPivot(x, y, z);
}

Text.prototype.setRotation = function(degreesX, degreesY, degreesZ) {
    //setTextRotation(degreesX, degreesY, degreesZ);
    this.mesh.rotation.x = degreesX * Math.PI / 180;
    this.mesh.rotation.y = degreesY * Math.PI / 180;
    this.mesh.rotation.z = degreesZ * Math.PI / 180;
}

Text.prototype.setScale = function(x, y, z) {
    //setTextSize(x, y, z);
    const compatibilityConstant = 0.025;
    this.mesh.scale.x = x * compatibilityConstant;
    this.mesh.scale.y = y * compatibilityConstant;
    this.mesh.scale.z = z * compatibilityConstant;
}

Text.prototype.setPosition = function(x, y, z) {
    //setTextPosition(x, y, z);
    if (this.perspective2d){

        if (settings.demo.compatibility.old2dCoordinates) {
            x = (x)/settings.demo.screen.width - 0.5;
            y = (y)/settings.demo.screen.height - 0.5;
        }
        x *= settings.demo.screen.aspectRatio;
        //y /= settings.demo.screen.aspectRatio;
        //x = -2*16/9;
        //y = -2;
        this.mesh.position.z = -(settings.demo.camera.near + 0.5);
    } else {
        this.mesh.position.z = z + this.zOffset * this.mesh.scale.z;
    }
    this.mesh.position.x = x + this.xOffset * this.mesh.scale.x;
    this.mesh.position.y = y + this.yOffset * this.mesh.scale.y;
    
    //,"position":[{"x":-1.5*16/9,"y":1.5,"z":0}]	

}

Text.prototype.setCenterAlignment = function(align) {
    //setTextCenterAlignment(align);
}

Text.prototype.setColor = function(r, g, b, a) {
    //setTextColor(r, g, b, a);
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

Text.prototype.setPerspective2d = function(perspective2d) {
    //setTextPerspective3d(perspective2d === true ? 0 : 1);
    this.perspective2d = (perspective2d === true);
}

Text.prototype.draw = function() {
    //drawText();    
    //const camera = getCamera();
    //camera.projectionMatrix

}

export { Text };
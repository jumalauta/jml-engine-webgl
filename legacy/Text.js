import * as THREE from 'three';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { loggerTrace, loggerDebug } from './Bindings';
import { Settings } from '../Settings';
const settings = new Settings();

let fonts = {};

var Text = function() {
    this.font = undefined;
    this.text = undefined;
}

Text.prototype.load = function(name) {
    let instance = this;

    return new Promise((resolve, reject) => {
        if (fonts[name]) {
            instance.font = fonts[name];
            resolve(true);
            return;
        }

        const loader = new TTFLoader();
        loader.load(
            name,
            function(json) {
                fonts[name] = new Font(json);
                loggerDebug('Loaded font ' + name);
                resolve(true);
            },
            undefined,
            function(err) {
                console.error( 'Could not load ' + name );
                instance.error = true;
                reject(err);
            }
        );
    });
}

Text.prototype.setFont = function(name) {
    this.font = fonts[name];
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
        this.material = settings.createMaterial(settings.demo.text.material);
        this.material.map = this.texture;
        this.material.blending = THREE.CustomBlending;
        this.material.depthTest = false;
        this.material.depthWrite = false;
      
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.z = settings.demo.screen.perspective2dZ;
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
    const compatibilityConstant = 0.1;
    this.mesh.scale.x = x * compatibilityConstant;
    this.mesh.scale.y = y * compatibilityConstant;
    this.mesh.scale.z = z * compatibilityConstant;
}

Text.prototype.setPosition = function(x, y, z) {
    //setTextPosition(x, y, z);
    if (this.perspective2d){
        if (settings.demo.compatibility.old2dCoordinates) {
            x = (-2+((4*(x)/1920)))*(16/9);
            y = (-2+((4*(y)/1080)));
        }
        //x = -2*16/9;
        //y = -2;
        this.mesh.position.z = settings.demo.screen.perspective2dZ;
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
}

export { Text };
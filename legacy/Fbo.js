import * as THREE from 'three';
import { renderer, screenWidth, screenHeight, getScene, getCamera, pushView, popView } from '../main';
import { Image } from './Image';
import { loggerDebug } from './Bindings';

var fbos = {};

var Fbo = function() {
    this.ptr = undefined;
    this.name = undefined;
    this.color = undefined;
    this.scene = new THREE.Scene();

    const pointLight = new THREE.PointLight(0xffffff, 1000)
    pointLight.position.set(2.5, 7.5, 15)
    //this.scene.add( pointLight );
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 1, 2);
    this.scene.add( directionalLight );
  
    const light = new THREE.AmbientLight(0xffffff);
    this.scene.add( light );
    //this.scene.add(getCamera());
  
    this.camera = new THREE.PerspectiveCamera( 75, 16/9, 0.1, 1000 );
    this.camera.position.z = 2;
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.camera.up = new THREE.Vector3(0, 1, 0);
    this.scene.add(this.camera);
    
}

Fbo.dispose = function() {
    for (let key in fbos) {
        let fbo = fbos[key];
        //  FIXME implement proper dispose
        delete fbos[key];
    }
}

Fbo.init = function(name) {
    if (fbos[name]) {
        return fbos[name];
    }

    let fbo = new Fbo();
    fbos[name] = fbo;
    
    /*var legacy = fboInit(name);

    this.name = name;
    this.ptr = legacy.ptr;

    if (legacy.color.ptr !== undefined) {
        this.color = new Image();
        this.color.ptr = legacy.color.ptr;
        this.color.id = legacy.color.id;
    }*/
    //if ( target ) target.dispose();

    const format = THREE.DepthFormat;

    fbo.name = name;

    fbo.target = new THREE.WebGLRenderTarget( screenWidth, screenHeight );
    fbo.target.texture.minFilter = THREE.NearestFilter;
    fbo.target.texture.magFilter = THREE.NearestFilter;
    fbo.target.stencilBuffer = ( format === THREE.DepthStencilFormat ) ? true : false;
    fbo.target.depthTexture = new THREE.DepthTexture();
    fbo.target.depthTexture.format = format;
    fbo.target.depthTexture.type = THREE.UnsignedShortType;

    fbo.color = new Image();
    fbo.color.texture = fbo.target.texture;
    fbo.color.generateMesh();

    fbo.depth = new Image();
    fbo.depth.texture = fbo.target.depthTexture;
    fbo.depth.generateMesh();

    fbo.ptr = fbo.target;

    loggerDebug('Created FBO ' + name);

    return fbo;
}

Fbo.prototype.setStoreDepth = function(storeDepth) {
    //fboStoreDepth(this.ptr, storeDepth === true ? 1 : 0);
}

Fbo.prototype.setDimensions = function(width, height) {
    //fboSetDimensions(this.ptr, width, height);
}

Fbo.prototype.generateFramebuffer = function() {
   // fboGenerateFramebuffer(this.ptr);
}

Fbo.prototype.setRenderDimensions = function(width, height) {
    //fboSetRenderDimensions(this.ptr, width, height);
}

Fbo.prototype.push = function() {
    pushView(this.scene, this.camera);
}

Fbo.prototype.pop = function() {
    popView();
}

Fbo.prototype.bind = function() {
    //console.warn('fbo bind');
    //fboBind(this.ptr);
    //pushView(this.scene, getCamera());
    renderer.setRenderTarget(this.target);
    renderer.clear();

}

Fbo.prototype.unbind = function() {
    //fboUnbind(this.ptr);
    //console.warn('fbo unbind');

    renderer.render( this.scene, this.camera );
    renderer.setRenderTarget(null);
    //popView();
}

Fbo.prototype.updateViewport = function() {
    //fboUpdateViewport(this.ptr);
    //console.warn('fbo update viewport');
    //renderer.clear();
}

Fbo.prototype.bindTextures = function() {
    //fboBindTextures(this.ptr);
}

Fbo.prototype.unbindTextures = function() {
    //fboUnbindTextures(this.ptr);
}

export { Fbo };
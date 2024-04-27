import * as THREE from 'three';
import { DemoRenderer, pushView, popView, getCamera } from './DemoRenderer';
import { Image } from './Image';
import { loggerDebug } from './Bindings';
import { Settings } from './Settings';

const settings = new Settings();

const demoRenderer = new DemoRenderer();

var fbos = {};

var Fbo = function(name, sceneName) {
    this.ptr = undefined;
    this.name = name;
    this.color = undefined;

    this.scene = undefined;
    if (sceneName) {
        this.scene = demoRenderer.getScene(sceneName);
    }
    
    if (!this.scene) {
        this.scene = settings.createScene();
        settings.createLightsToScene(this.scene);
    }

    this.camera = settings.createCamera();
}

Fbo.getFbos = function() {
    return fbos;
}

Fbo.dispose = function() {
    for (let key in fbos) {
        let fbo = fbos[key];
        //  FIXME implement proper dispose
        delete fbos[key];
    }
}

Fbo.get = function(name) {
    return fbos[name];
}

Fbo.init = function(name, sceneName) {
    if (fbos[name]) {
        return fbos[name];
    }

    let fbo = new Fbo(name, sceneName);
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

    fbo.name = name;

    fbo.target = new THREE.WebGLRenderTarget( demoRenderer.canvasWidth*settings.demo.fbo.quality, demoRenderer.canvasHeight*settings.demo.fbo.quality );
    settings.toThreeJsProperties(settings.demo.fbo.color.texture, fbo.target.texture);
    fbo.target.depthTexture = new THREE.DepthTexture();
    fbo.target.depthTexture.format = THREE.DepthFormat;
    fbo.target.depthTexture.type = THREE.UnsignedShortType;
    settings.toThreeJsProperties(settings.demo.fbo.depth.texture, fbo.target.depthTexture);
    fbo.target.stencilBuffer = ( fbo.target.depthTexture.format === THREE.DepthStencilFormat ) ? true : false;

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
    return this.scene;
}

Fbo.prototype.pop = function() {
    popView();
}

Fbo.prototype.bind = function() {
    //console.warn('fbo bind');
    //fboBind(this.ptr);
    //pushView(this.scene, getCamera());
    demoRenderer.renderer.setRenderTarget(this.target);
    demoRenderer.renderer.clear();

}

Fbo.prototype.unbind = function() {
    //fboUnbind(this.ptr);
    //console.warn('fbo unbind');

    demoRenderer.renderer.render( this.scene, this.camera );
    demoRenderer.renderer.setRenderTarget(null);
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
import { loggerDebug, loggerWarning } from "./Bindings";
/*
// TODO:
var time = getSceneTimeFromStart();
windowSetTitle(errorType + ' ERROR');
getObjectFromMemory(animation.lightRelativePosition);
*/

var GL_DEPTH_BUFFER_BIT = -1;
var GL_SRC_ALPHA = -1;
var GL_ONE = -1;

var GL = function() {
    //this.COLOR_BUFFER_BIT = GL_COLOR_BUFFER_BIT;
    this.DEPTH_BUFFER_BIT = GL_DEPTH_BUFFER_BIT;
    this.SRC_ALPHA = GL_SRC_ALPHA;
    this.ONE = GL_ONE;

    return this.getInstance();
}

GL.prototype.getInstance = function() {
    if (!GL.prototype._singletonInstance) {
        GL.prototype._singletonInstance = this;
    }

    return GL.prototype._singletonInstance;
}

GL.prototype.clear = function(attributes) {
    loggerWarning("clear not implemented");
    //glClear(attributes);
}

var gl = new GL();

var TransformationMatrix = function() {
    return this.getInstance();
}

TransformationMatrix.prototype.getInstance = function() {
    if (!TransformationMatrix.prototype._singletonInstance) {
        TransformationMatrix.prototype._singletonInstance = this;
    }

    return TransformationMatrix.prototype._singletonInstance;
}

TransformationMatrix.prototype.push = function() {
    //glPushMatrix();
}

TransformationMatrix.prototype.pop = function() {
    //glPopMatrix();
}


var Graphics = function() {
    return this.getInstance();
}

Graphics.prototype.getInstance = function() {
    if (!Graphics.prototype._singletonInstance) {
        Graphics.prototype._singletonInstance = this;
    }

    return Graphics.prototype._singletonInstance;
}

Graphics.prototype.pushState = function() {
    //glPushAttrib(GL_CURRENT_BIT);
}

Graphics.prototype.popState = function() {
    //glPopAttrib();    
}

Graphics.prototype.viewReset = function() {
    loggerDebug("viewReset not implemented");
    //viewReset();    
}

Graphics.prototype.setColor = function(r,g,b,a) {
    //glColor4f(r,g,b,a);
}

Graphics.prototype.clearDepthBuffer = function() {
    //gl.clear(gl.DEPTH_BUFFER_BIT);
}

Graphics.prototype.handleErrors = function() {
    return null;//graphicsHandleErrors();
}

export { Graphics, GL, TransformationMatrix };
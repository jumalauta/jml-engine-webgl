var Camera = function() {
}

Camera.prototype.setPerspective = function(fov, aspect, near, far) {
    setCameraPerspective(fov, aspect, near, far);
}

Camera.prototype.setPosition = function(x, y, z) {
    setCameraPosition(x, y, z);
}

Camera.prototype.setLookAt = function(x, y, z) {
    setCameraLookAt(x, y, z);
}

Camera.prototype.setUpVector = function(x, y, z) {
    setCameraUpVector(x, y, z);
}

Camera.prototype.setPositionObject = function(modelPtr) {
    loggerDebug("setPositionObject not implemented");
    //setCameraPositionObject(modelPtr);
}

Camera.prototype.setTargetObject = function(modelPtr) {
    loggerDebug("setTargetObject not implemented");
    //setCameraTargetObject(modelPtr);
}

export { Camera };
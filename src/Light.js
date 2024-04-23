var lights = {};

var Light = function(index) {
    if (typeof index != 'number' || index < 0 || index > 4) {
        loggerError("Light index is incorrect. index:" + index);
        return undefined;
    }

    if (!(index in lights)) {
        lights[index] = this;
    }

    this.index = index;

    return lights[index];
}

Light.type = {
    // enum values duplicated in C
    'DIRECTIONAL': 1,
    'POINT': 2,
    'SPOT': 3
}

Light.prototype.setType = function(type) {
    lightSetType(this.index, type);
}

Light.prototype.setGenerateShadowMap = function(generateShadowMap) {
    lightSetGenerateShadowMap(this.index, generateShadowMap === true ? 1 : 0);
}

Light.prototype.enable = function() {
    lightSetOn(this.index);
}

Light.prototype.disable = function() {
    lightSetOff(this.index);
}

Light.prototype.setAmbientColor = function(r, g, b, a) {
    lightSetAmbientColor(this.index, r, g, b, a);
}

Light.prototype.setDiffuseColor = function(r, g, b, a) {
    lightSetDiffuseColor(this.index, r, g, b, a);
}

Light.prototype.setSpecularColor = function(r, g, b, a) {
    lightSetSpecularColor(this.index, r, g, b, a);
}

Light.prototype.setPosition = function(x, y, z) {
    lightSetPosition(this.index, x, y, z);
}

Light.prototype.setDirection = function(x, y, z) {
    lightSetDirection(this.index, x, y, z);
}

export { Light };

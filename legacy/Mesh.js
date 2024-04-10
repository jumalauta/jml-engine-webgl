var Mesh = function() {
    var legacy = meshNew();
    this.ptr = legacy.ptr;
    if (this.ptr === void null) {
        loggerFatal("Could not initialize Mesh");
    }
}

Mesh.prototype.setMaterialTexture = function(texture, unit) {
    if (unit === void null) {
        unit = 0;
    }

    meshMaterialSetTexture(this.ptr, texture.ptr, unit);
}

Mesh.prototype.setFaceDrawType = function(type) {
    meshSetFaceDrawType(this.ptr, type);
}

Mesh.prototype.addVertex = function(x,y,z) {
    meshAddVertex(this.ptr, x,y,z);
}

Mesh.prototype.addNormal = function(x,y,z) {
    meshAddNormal(this.ptr, x,y,z);
}

Mesh.prototype.addColor = function(r,g,b,a) {
    meshAddColor(this.ptr, r,g,b,a||1.0);
}

Mesh.prototype.addTexCoord = function(uMin, vMin) {
    meshAddTexCoord(this.ptr, uMin, vMin);
}

Mesh.prototype.generate = function() {
    meshGenerate(this.ptr);
}

Mesh.prototype.delete = function() {
    meshDelete(this.ptr);
}

Mesh.prototype.draw = function(begin, end) {
    if (begin === void null) {
        begin = 0.0;
    }
    if (end === void null) {
        end = 1.0;
    }
    meshDraw(this.ptr, begin, end);
}

export { Mesh };
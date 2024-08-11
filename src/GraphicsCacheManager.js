const GraphicsCacheManager = function () {
  return this.getInstance();
};

GraphicsCacheManager.prototype.getInstance = function () {
  if (!GraphicsCacheManager.prototype._singletonInstance) {
    this.init();
    GraphicsCacheManager.prototype._singletonInstance = this;
  }

  return GraphicsCacheManager.prototype._singletonInstance;
};

GraphicsCacheManager.prototype.init = function () {
  this.cache = {};
};

GraphicsCacheManager.prototype.addToCache = function (key, value) {
  this.cache[key] = value;
};

GraphicsCacheManager.prototype.updateFromCache = function (key, instance) {
  const obj = this.cache[key];
  if (obj && instance) {
    Object.keys(obj).forEach((key) => {
      instance[key] = obj[key];
    });

    return true;
  }

  return false;
};

export { GraphicsCacheManager };

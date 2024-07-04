const Random = function () {
  return this.getInstance();
};

Random.prototype.getInstance = function () {
  if (!Random.prototype._singletonInstance) {
    Random.prototype._singletonInstance = this;
    this.setSeed(0x12345678);
  }

  return Random.prototype._singletonInstance;
};

Random.prototype.setSeed = function (seed) {
  if (!Number.isInteger(seed)) {
    throw new Error('Seed must be an integer');
  }

  this.value = this.jsf32(0xf1ea5eed, seed, seed, seed);
};

// Bob Jenkin's PRNG
// ref. https://github.com/bryc/code/blob/8252241243130caff562182375e50a1290a76f9c/jshash/PRNGs.md#jsf--smallprng (public domain)
Random.prototype.jsf32 = function (a, b, c, d) {
  return function () {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (a - ((b << 27) | (b >>> 5))) | 0;
    a = b ^ ((c << 17) | (c >>> 15));
    b = (c + d) | 0;
    c = (d + t) | 0;
    d = (a + t) | 0;
    return (d >>> 0) / 4294967296;
  };
};

export { Random };

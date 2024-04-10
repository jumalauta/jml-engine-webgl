//https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline
//http://www.iquilezles.org/www/articles/minispline/minispline.htm

/** @constructor */
var CatmullRomSpline = function()
{
    this.outputPath = null;
};

CatmullRomSpline.prototype.interpolate = function(path, i, p)
{
    var vec0 = path[Math.max(0, i - 1)];
    var vec1 = path[i];
    var vec2 = path[Math.min(i + 1, path.length - 1)];
    var vec3 = path[Math.min(i + 2, path.length - 1)];

    var p3 = Math.pow(p, 3);
    var p2 = Math.pow(p, 2);
    var f1 = -0.5 * p3 + p2 - 0.5 * p;
    var f2 = 1.5 * p3 - 2.5 * p2 + 1.0;
    var f3 = -1.5 * p3 + 2.0 * p2 + 0.5 * p;
    var f4 = 0.5 * p3 - 0.5 * p2;

    return {
        'x': vec0.x * f1 + vec1.x * f2 + vec2.x * f3 + vec3.x * f4,
        'y': vec0.y * f1 + vec1.y * f2 + vec2.y * f3 + vec3.y * f4,
        'z': vec0.z * f1 + vec1.z * f2 + vec2.z * f3 + vec3.z * f4
    };
};

CatmullRomSpline.prototype.calculateSpline = function(path, precision)
{
    if (path === void null || !(path instanceof Array) || path.length < 3)
    {
        debugErrorPrint('Spline path must be an array that contains vector data');
        return new Array();
    }

    this.outputPath = new Array();

    for (var i = 0; i < path.length - 1; i++)
    {
        for (var j = 0; j < precision; j++)
        {
            var percent = j / (precision - 1);
            var catmullRomPoint = this.interpolate(path, i, percent);
            this.outputPath.push(catmullRomPoint);
        }
    }

    return this.outputPath;
};

CatmullRomSpline.prototype.getSpline = function(path)
{
    return this.outputPath;
}

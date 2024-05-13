#define M_PI 3.1415926535897932384626433832795

uniform sampler2D texture0;
uniform float percent;
uniform float time;
in vec2 texCoord;
out vec4 fragColor;

void main() {
  float curveThickness = 0.75*percent;
  float curveBendDegrees = 0.;
  float curvesDegrees = 360.;
  
  float fadeStart = 0.2;
  float fadeEnd = 0.65;
  
  float maxLights = 24.0;
  
  vec2 coord=texCoord.xy;

  float fade = 1.0;
  fade = smoothstep(fadeStart, fadeEnd, distance(coord,vec2(0.5, 0.5)));

  float x = coord.x;
  float y = coord.y;

  vec2 position = vec2(-0.446, -0.5);

  vec4 col = vec4(0.,0.,0.,0.);
  coord += position;
  float curveBendRad = radians(curveBendDegrees);
  float curvesRad = radians(curvesDegrees);
  float bend = curveBendRad*log(length(coord));
  
  coord.x += sin(time*3.0+coord.y*10.0)*0.01;
  coord.y += cos(time*3.0+coord.x*10.0)*0.01;

  float d = mod(2.*M_PI-1.9+atan(coord.x,coord.y)+bend, curvesRad);
  if (d < curvesRad*curveThickness) {
    col = vec4(1.,0.,0.,1.);
  }

  vec2 coord2 = texCoord.xy;
  vec4 outputColor = texture2D(texture0, coord2);
  if (outputColor.a > 0.1 && outputColor.g < 0.9) {
      if (col.a > 0.0) {
        outputColor = col*texture2D(texture0, coord2);
      } else {
        outputColor = vec4(0.,0.,0.,0.);
      }
  }
  
  fragColor = outputColor;
}
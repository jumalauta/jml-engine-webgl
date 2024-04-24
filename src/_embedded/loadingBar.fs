#define M_PI 3.1415926535897932384626433832795

uniform sampler2D texture0;
uniform float percent;
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
  vec2 screenCoords = coord;

  float fade = 1.0;
  fade = smoothstep(fadeStart, fadeEnd, distance(screenCoords,vec2(0.5, 0.5)));

  float x = coord.x;
  float y = coord.y;
  //float d = sqrt(x*x + y*y);
  vec2 position = vec2(-0.446, -0.5);

  vec4 col = vec4(0.,0.,0.,0.);
  coord += position;
  float curveBendRad = radians(curveBendDegrees);
  float curvesRad = radians(curvesDegrees);
  float bend = curveBendRad*log(length(coord));
  

    float d = mod(2.*M_PI-1.9+atan(coord.x,coord.y)+bend, curvesRad);
    if (d < curvesRad*curveThickness) {
      float cx = position.x+x;
      float cy = position.y+y;
      float circle = 1.0/sqrt(cx*cx + cy*cy);

      col = vec4(1.,0.,0.,1.);
    }

      vec4 outputColor = texture2D(texture0, texCoord);
      if (outputColor.a > 0.1 && outputColor.g < 0.9) {
          if (col.a > 0.0) {
            outputColor = col*texture2D(texture0, texCoord);
          } else {
            outputColor = vec4(0.,0.,0.,0.);
          }
      }
    
    fragColor = outputColor;
}
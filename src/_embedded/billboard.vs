out vec2 texCoord;

#ifdef USE_INSTANCING
attribute vec4 instanceVertexColor;
attribute vec3 instanceVertexAngle;
#endif

out vec4 instanceFragmentColor;

void main() {
  texCoord = uv;

#ifdef USE_INSTANCING
  mat4 billboardModel = instanceMatrix;
  mat4 billboardModelView = viewMatrix * modelMatrix * billboardModel;
#else
  mat4 billboardModel = modelMatrix;
  mat4 billboardModelView = viewMatrix * billboardModel;
#endif

  billboardModelView[0][0] = length(vec3(billboardModel[0]));
  billboardModelView[0][1] = 0.0;
  billboardModelView[0][2] = 0.0;

  // spherical
  billboardModelView[1][0] = 0.0;
  billboardModelView[1][1] = length(vec3(billboardModel[1]));
  billboardModelView[1][2] = 0.0;

  billboardModelView[2][0] = 0.0;
  billboardModelView[2][1] = 0.0;
  billboardModelView[2][2] = 1.0;

#ifdef USE_INSTANCING
  float degrees = instanceVertexAngle.z;
  if (mod(degrees, 360.) > 0.) {
    float angle = radians(degrees);
    float sz = sin(angle);
    float cz = cos(angle);
    mat4 rotateZ = mat4(
      vec4(cz, -sz, 0., 0.),
      vec4(sz,  cz, 0., 0.),
      vec4(0.,  0., 1., 0.),
      vec4(0.,  0., 0., 1.)); 
    billboardModelView *= rotateZ;
  }

  instanceFragmentColor = instanceVertexColor;
  // Note that modelViewMatrix is not set when rendering an instanced model,
  // but can be calculated from viewMatrix * modelMatrix.
  gl_Position = projectionMatrix * billboardModelView * vec4(position, 1.0);
#else
  instanceFragmentColor = vec4(1.0, 1.0, 1.0, 1.0);
  gl_Position = projectionMatrix * billboardModelView * vec4(position, 1.0);
#endif
}

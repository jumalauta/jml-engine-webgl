out vec2 texCoord;

#ifdef USE_INSTANCING
attribute vec4 instanceVertexColor;
#endif

out vec4 instanceFragmentColor;

void main() {
    texCoord = uv;
    mat4 viewMatrix2d = mat4(1.0);

#ifdef USE_INSTANCING
    instanceFragmentColor = instanceVertexColor;
	// Note that modelViewMatrix is not set when rendering an instanced model,
	// but can be calculated from viewMatrix * modelMatrix.
    gl_Position = projectionMatrix * modelMatrix * viewMatrix2d * instanceMatrix * vec4(position, 1.0);
#else
    instanceFragmentColor = vec4(1.0, 1.0, 1.0, 1.0);
    gl_Position = projectionMatrix * modelMatrix * viewMatrix2d * vec4(position, 1.0);
#endif

}
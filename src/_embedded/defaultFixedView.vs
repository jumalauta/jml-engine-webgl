out vec2 texCoord;

void main() {
    texCoord = uv;
    mat4 viewMatrix2d = mat4(1.0);

#ifdef USE_INSTANCING
	// Note that modelViewMatrix is not set when rendering an instanced model,
	// but can be calculated from viewMatrix * modelMatrix.
    gl_Position = projectionMatrix * modelMatrix * viewMatrix2d * instanceMatrix * vec4(position, 1.0);
#else
    gl_Position = projectionMatrix * modelMatrix * viewMatrix2d * vec4(position, 1.0);
#endif

}
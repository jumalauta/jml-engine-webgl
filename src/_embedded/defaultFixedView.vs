out vec2 texCoord;

void main() {
    texCoord = uv;
    mat4 viewMatrix2d = mat4(1.0);

    gl_Position = projectionMatrix * modelMatrix * viewMatrix2d * vec4(position, 1.0);
}
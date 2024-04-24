out vec2 texCoord;

// Idea for this shader is to render a 2D image with a 2D orthographic projection in the correct (=how old engine supported mixture of 2d and 3d) render order

#define aspectRatio 16.0/9.0

mat4 ortho(float left, float right, float bottom, float top, float zNear, float zFar) {
    mat4 m = mat4(1.0);
    m[0][0] = 2.0 / (right - left);
    m[1][1] = 2.0 / (top - bottom);
    m[2][2] = -2.0  / (zFar - zNear);
    m[3][0] = -(right + left) / (right - left);
    m[3][1] = -(top + bottom) / (top - bottom);
    m[3][2] = -(zFar + zNear) / (zFar - zNear);
    return m; 
}

void main() {
    texCoord = uv;
    mat4 viewMatrix2d = mat4(1.0);
    mat4 projectionMatrix2d = ortho(-0.5 * aspectRatio, 0.5 * aspectRatio, -0.5, 0.5, -1.0, 1.0);

    gl_Position = projectionMatrix2d * modelMatrix * viewMatrix2d * vec4(position, 1.0);
}
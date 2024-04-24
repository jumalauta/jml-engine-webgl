in vec2 texCoord;
out vec4 fragColor;

uniform vec4 color; // this will be automatically binded to color animation variable, defaults to 1,1,1,1

void main() {
    fragColor = color;
}
in vec2 texCoord;
out vec4 fragColor;

uniform sampler2D texture0; // this will be automatically binded in the script to animation's first texture
uniform vec4 color; // this will be automatically binded to color animation variable, defaults to 1,1,1,1

void main() {
    fragColor = color * texture2D(texture0, texCoord);
}

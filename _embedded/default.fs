uniform sampler2D texture0; // this will be automatically binded in the script to animation's first texture
uniform vec4 color; // this will be automatically binded to color animation variable, defaults to 1,1,1,1
varying vec2 texCoord;

void main() {
    gl_FragColor = color * texture2D(texture0, texCoord);
}

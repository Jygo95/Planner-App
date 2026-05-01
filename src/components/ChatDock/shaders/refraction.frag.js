export const fragmentShaderSource = `
  precision mediump float;
  uniform float time;
  uniform vec2 resolution;
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    float wave = sin(uv.x * 10.0 + time) * 0.005;
    vec2 distorted = uv + vec2(wave, wave);
    vec3 color = vec3(distorted, 0.5 + 0.5 * sin(time));
    gl_FragColor = vec4(color * 0.15, 0.1);
  }
`;

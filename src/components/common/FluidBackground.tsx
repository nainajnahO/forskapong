import { useEffect, useRef, useCallback } from 'react';
import { useIsVisible } from '@/hooks/useIsVisible';

const VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec4 a_position;
void main() {
  gl_Position = a_position;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float u_time;
uniform float u_pixelRatio;
uniform vec2 u_resolution;

uniform float u_scale;
uniform float u_rotation;
uniform vec4 u_color1;
uniform vec4 u_color2;
uniform vec4 u_color3;
uniform float u_proportion;
uniform float u_softness;
uniform float u_shape;
uniform float u_shapeScale;
uniform float u_distortion;
uniform float u_swirl;
uniform float u_swirlIterations;

out vec4 fragColor;

#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));

  // Smoothstep for interpolation
  vec2 u = f * f * (3.0 - 2.0 * f);

  // Do the interpolation as two nested mix operations
  // If you try to do this in one big operation, there's enough precision loss to be off by 1px at cell boundaries
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

vec4 blend_colors(vec4 c1, vec4 c2, vec4 c3, float mixer, float edgesWidth, float edge_blur) {
    vec3 color1 = c1.rgb * c1.a;
    vec3 color2 = c2.rgb * c2.a;
    vec3 color3 = c3.rgb * c3.a;

    float r1 = smoothstep(.0 + .35 * edgesWidth, .7 - .35 * edgesWidth + .5 * edge_blur, mixer);
    float r2 = smoothstep(.3 + .35 * edgesWidth, 1. - .35 * edgesWidth + edge_blur, mixer);

    vec3 blended_color_2 = mix(color1, color2, r1);
    float blended_opacity_2 = mix(c1.a, c2.a, r1);

    vec3 c = mix(blended_color_2, color3, r2);
    float o = mix(blended_opacity_2, c3.a, r2);
    return vec4(c, o);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 uv_original = uv;

    float t = .5 * u_time;

    float noise_scale = .0005 + .006 * u_scale;

    uv -= .5;
    uv *= (noise_scale * u_resolution);
    uv = rotate(uv, u_rotation * .5 * PI);
    uv /= u_pixelRatio;
    uv += .5;

    float n1 = noise(uv * 1. + t);
    float n2 = noise(uv * 2. - t);
    float angle = n1 * TWO_PI;
    uv.x += 4. * u_distortion * n2 * cos(angle);
    uv.y += 4. * u_distortion * n2 * sin(angle);

    float iterations_number = ceil(clamp(u_swirlIterations, 1., 30.));
    for (float i = 1.; i <= iterations_number; i++) {
        uv.x += clamp(u_swirl, 0., 2.) / i * cos(t + i * 1.5 * uv.y);
        uv.y += clamp(u_swirl, 0., 2.) / i * cos(t + i * 1. * uv.x);
    }

    float proportion = clamp(u_proportion, 0., 1.);

    float shape = 0.;
    float mixer = 0.;
    if (u_shape < .5) {
      vec2 checks_shape_uv = uv * (.5 + 3.5 * u_shapeScale);
      shape = .5 + .5 * sin(checks_shape_uv.x) * cos(checks_shape_uv.y);
      mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);
    } else if (u_shape < 1.5) {
      vec2 stripes_shape_uv = uv * (.25 + 3. * u_shapeScale);
      float f = fract(stripes_shape_uv.y);
      shape = smoothstep(.0, .55, f) * smoothstep(1., .45, f);
      mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);
    } else {
      float sh = 1. - uv.y;
      sh -= .5;
      sh /= (noise_scale * u_resolution.y);
      sh += .5;
      float shape_scaling = .2 * (1. - u_shapeScale);
      shape = smoothstep(.45 - shape_scaling, .55 + shape_scaling, sh + .3 * (proportion - .5));
      mixer = shape;
    }

    vec4 color_mix = blend_colors(u_color1, u_color2, u_color3, mixer, 1. - clamp(u_softness, 0., 1.), .01 + .01 * u_scale);

    fragColor = vec4(color_mix.rgb, color_mix.a);
}`;

// ---- Shape map ----
const SHAPE_MAP: Record<string, number> = { Checks: 0, Stripes: 1, Edge: 2 };

// ---- Presets ----
export const PRESETS = {
  Lava: {
    color1: '#FF9F21', color2: '#FF0303', color3: '#000000',
    rotation: 114, proportion: 100, scale: 0.52, speed: 30,
    distortion: 13, swirl: 20, swirlIterations: 10, softness: 90,
    offset: 717, shape: 'Edge' as const, shapeSize: 12,
  },
} as const;

export type PresetName = keyof typeof PRESETS;

// ---- Helpers ----
function hexToVec4(hex: string): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, 1.0];
}

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

// ---- Props ----
export interface FluidBackgroundProps {
  /** Use a preset name, or provide individual props */
  preset?: PresetName;
  /** Override colors (hex strings) */
  color1?: string;
  color2?: string;
  color3?: string;
  /** Rotation in degrees */
  rotation?: number;
  /** 0–100 */
  proportion?: number;
  /** 0–1 */
  scale?: number;
  /** Animation speed, 1–100 */
  speed?: number;
  /** 0–100 */
  distortion?: number;
  /** 0–100 */
  swirl?: number;
  /** 1–30 */
  swirlIterations?: number;
  /** 0–100 */
  softness?: number;
  /** Time offset */
  offset?: number;
  /** Pattern shape */
  shape?: 'Checks' | 'Stripes' | 'Edge';
  /** 0–100 */
  shapeSize?: number;
  /** Additional CSS class for the container */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
}

export default function FluidBackground({
  preset = 'Lava',
  color1,
  color2,
  color3,
  rotation,
  proportion,
  scale,
  speed,
  distortion,
  swirl,
  swirlIterations,
  softness,
  offset,
  shape,
  shapeSize,
  className = '',
  style,
}: FluidBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isVisible = useIsVisible(canvasRef);
  const isVisibleRef = useRef(isVisible);

  // Keep ref in sync with state
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  // Resolve config: explicit props override preset
  const cfg = PRESETS[preset];
  const resolved = {
    color1: color1 ?? cfg.color1,
    color2: color2 ?? cfg.color2,
    color3: color3 ?? cfg.color3,
    rotation: rotation ?? cfg.rotation,
    proportion: proportion ?? cfg.proportion,
    scale: scale ?? cfg.scale,
    speed: speed ?? cfg.speed,
    distortion: distortion ?? cfg.distortion,
    swirl: swirl ?? cfg.swirl,
    swirlIterations: swirlIterations ?? cfg.swirlIterations,
    softness: softness ?? cfg.softness,
    offset: offset ?? cfg.offset,
    shape: shape ?? cfg.shape,
    shapeSize: shapeSize ?? cfg.shapeSize,
  };

  const initGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true });
    if (!gl) { console.error('WebGL2 not supported'); return null; }

    const vs = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return null;

    const program = createProgram(gl, vs, fs);
    if (!program) return null;

    // Full-screen quad
    const posAttr = gl.getAttribLocation(program, 'a_position');
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 0, 1,
       1, -1, 0, 1,
      -1,  1, 0, 1,
       1,  1, 0, 1,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 4, gl.FLOAT, false, 0, 0);

    gl.useProgram(program);

    // Gather uniform locations
    const uniformNames = [
      'u_time', 'u_pixelRatio', 'u_resolution',
      'u_scale', 'u_rotation', 'u_color1', 'u_color2', 'u_color3',
      'u_proportion', 'u_softness', 'u_shape', 'u_shapeScale',
      'u_distortion', 'u_swirl', 'u_swirlIterations',
    ];
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    uniformNames.forEach(name => {
      uniforms[name] = gl.getUniformLocation(program, name);
    });

    return { gl, program, uniforms };
  }, []);

  useEffect(() => {
    const result = initGL();
    if (!result) return;

    const { gl, uniforms } = result;
    startTimeRef.current = performance.now();

    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = () => {
      if (!isVisibleRef.current) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const elapsed = (performance.now() - startTimeRef.current) * 0.001;
      const totalTime = elapsed * (resolved.speed / 100) * 5 + resolved.offset * 10 * 0.001;

      // Set built-in uniforms
      gl.uniform1f(uniforms.u_time, totalTime);
      gl.uniform1f(uniforms.u_pixelRatio, window.devicePixelRatio || 1);
      gl.uniform2f(uniforms.u_resolution, gl.canvas.width, gl.canvas.height);

      // Set configurable uniforms
      gl.uniform4fv(uniforms.u_color1, hexToVec4(resolved.color1));
      gl.uniform4fv(uniforms.u_color2, hexToVec4(resolved.color2));
      gl.uniform4fv(uniforms.u_color3, hexToVec4(resolved.color3));
      gl.uniform1f(uniforms.u_scale, resolved.scale);
      gl.uniform1f(uniforms.u_rotation, resolved.rotation * Math.PI / 180);
      gl.uniform1f(uniforms.u_proportion, resolved.proportion / 100);
      gl.uniform1f(uniforms.u_distortion, resolved.distortion / 50);
      gl.uniform1f(uniforms.u_swirl, resolved.swirl / 100);
      gl.uniform1f(uniforms.u_swirlIterations, resolved.swirl === 0 ? 0 : resolved.swirlIterations);
      gl.uniform1f(uniforms.u_softness, resolved.softness / 100);
      gl.uniform1f(uniforms.u_shape, SHAPE_MAP[resolved.shape] ?? 0);
      gl.uniform1f(uniforms.u_shapeScale, resolved.shapeSize / 100);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animFrameRef.current = requestAnimationFrame(render);
    };

    resize();
    render();

    const resizeObserver = new ResizeObserver(resize);
    if (canvasRef.current) resizeObserver.observe(canvasRef.current);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resolved.color1, resolved.color2, resolved.color3,
    resolved.rotation, resolved.proportion, resolved.scale,
    resolved.speed, resolved.distortion, resolved.swirl,
    resolved.swirlIterations, resolved.softness, resolved.offset,
    resolved.shape, resolved.shapeSize,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        ...style,
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TRAUMAATLAS 3 — „Das Meer der Phänomene"
// GPU-Fluid-Simulation (WebGL2, Stable Fluids / Navier-Stokes)
//
// Orientiert an Pavel Dobryakovs WebGL-Fluid-Simulation (MIT-lizenziert):
// Advektion, Divergenz, Druck (Jacobi-Iteration), Gradienten-Subtraktion,
// Curl/Vorticity-Konfinement — echte advektierte Strömung mit Druckauflösung.
// Eigenständige, kompakte Neufassung für den Atlas.
// ═══════════════════════════════════════════════════════════════════════════

export interface FluidOptions {
  /** Simulations-Auflösung (Velocity/Druck) */
  simRes?: number;
  /** Auflösung der Farbtextur (Dye) */
  dyeRes?: number;
  /** Anzahl Jacobi-Iterationen der Drucklösung */
  pressureIters?: number;
  /** Vorticity-Stärke (Wirbel-Konfinement) */
  curlStrength?: number;
  /** Farbzerfall pro Frame */
  dyeDissipation?: number;
  /** Geschwindigkeitszerfall pro Frame */
  velDissipation?: number;
}

export interface Splat {
  x: number; // 0..1 (UV)
  y: number;
  dx: number; // Geschwindigkeits-Impuls
  dy: number;
  color: [number, number, number];
  radius: number; // 0..1 relativ zur kleineren Canvas-Seite
  amount?: number; // Farb-Menge (default 0.35)
}

const BASE_VERT = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 texelSize;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const COPY_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
void main () { fragColor = texture(uTexture, vUv); }`;

const SPLAT_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
uniform float amount;
void main () {
  vec2 p = vUv - point.xy;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color * amount;
  vec3 base = texture(uTarget, vUv).xyz;
  fragColor = vec4(base + splat, 1.0);
}`;

const ADVECTION_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;
void main () {
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
  fragColor = dissipation * texture(uSource, coord);
  fragColor.a = 1.0;
}`;

const DIVERGENCE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
void main () {
  float L = texture(uVelocity, vL).x;
  float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y;
  float B = texture(uVelocity, vB).y;
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }
  float div = 0.5 * (R - L + T - B);
  fragColor = vec4(div, 0.0, 0.0, 1.0);
}`;

const CURL_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
void main () {
  float L = texture(uVelocity, vL).y;
  float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x;
  float B = texture(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  fragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}`;

const VORTICITY_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main () {
  float L = texture(uCurl, vL).x;
  float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x;
  float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 velocity = texture(uVelocity, vUv).xy + force * dt;
  velocity = clamp(velocity, vec2(-1000.0), vec2(1000.0));
  fragColor = vec4(velocity, 0.0, 1.0);
}`;

const PRESSURE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  float divergence = texture(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  fragColor = vec4(pressure, 0.0, 0.0, 1.0);
}`;

const GRADIENT_SUBTRACT_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  vec2 velocity = texture(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  fragColor = vec4(velocity, 0.0, 1.0);
}`;

// Wasser-Optik: Tiefen-Grundton + biolumineszente Farbspur + Glanz auf schneller Strömung
const DISPLAY_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform sampler2D uVelocity;
uniform float time;
uniform vec2 texelSize;

float hash (vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise (vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main () {
  vec3 dye = texture(uTexture, vUv).rgb;
  vec2 vel = texture(uVelocity, vUv).rg;

  // Tiefenverlauf: dunkler Horizont unten, leicht aufhellend nach oben
  vec3 deep = vec3(0.006, 0.022, 0.030);
  vec3 shallow = vec3(0.016, 0.055, 0.070);
  vec3 col = mix(deep, shallow, vUv.y * 0.85 + 0.1);

  // Große, langsame Marmorierung, damit das Wasser nie starr wirkt
  float marb = noise(vUv * 5.0 + time * 0.03) * 0.5 + noise(vUv * 11.0 - time * 0.02) * 0.5;
  col += vec3(0.004, 0.010, 0.012) * marb;

  // Biolumineszenz der Farbspur (warmes Gold / kühl glühend) — dezent
  col += dye * vec3(0.85, 0.68, 0.48) * 0.42;

  // Glanzkante auf schneller Strömung — die „aufgebrochene" Wasserfläche
  float sp = length(vel);
  col += vec3(0.85, 0.72, 0.5) * smoothstep(0.35, 2.2, sp) * 0.16;

  // Kaustik-Flimmern in bewegten Zonen
  float ca = noise(vUv * 60.0 + vel * 2.0 + time * 0.35);
  col += vec3(0.10, 0.16, 0.16) * ca * smoothstep(0.05, 0.6, sp) * 0.25;

  // Vignette
  vec2 d = vUv - 0.5;
  col *= 1.0 - dot(d, d) * 0.55;

  fragColor = vec4(col, 1.0);
}`;

interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach: (id: number) => number;
}

interface DoubleFBO {
  read: FBO;
  write: FBO;
  swap: () => void;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Shader-Fehler: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

class Program {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null> = {};
  private gl: WebGL2RenderingContext;

  constructor(
    gl: WebGL2RenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader,
  ) {
    this.gl = gl;
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error(`Programm-Link-Fehler: ${gl.getProgramInfoLog(this.program)}`);
    }
  }

  bind() {
    this.gl.useProgram(this.program);
  }

  u(name: string): WebGLUniformLocation | null {
    if (!(name in this.uniforms)) {
      this.uniforms[name] = this.gl.getUniformLocation(this.program, name);
    }
    return this.uniforms[name];
  }
}

export class FluidSim {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private programs: Record<string, Program> = {};
  private velocity!: DoubleFBO;
  private dye!: DoubleFBO;
  private pressure!: DoubleFBO;
  private divergence!: FBO;
  private curl!: FBO;
  private quadVAO: WebGLVertexArrayObject;
  private running = false;
  private rafId = 0;
  private lastTime = performance.now();
  private time = 0;

  readonly simRes: number;
  readonly dyeRes: number;
  pressureIters: number;
  curlStrength: number;
  dyeDissipation: number;
  velDissipation: number;

  /** Wenn true, wird die Dämpfung erhöht — das Wasser beruhigt sich (stille Mechanik). */
  calm = false;

  constructor(canvas: HTMLCanvasElement, opts: FluidOptions = {}) {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
    }) as WebGL2RenderingContext | null;
    if (!gl) throw new Error("WebGL2 nicht verfügbar");
    const ext = gl.getExtension("EXT_color_buffer_float") ?? gl.getExtension("EXT_color_buffer_half_float");
    if (!ext) throw new Error("Float-Render-Targets nicht verfügbar");
    this.gl = gl;
    this.canvas = canvas;

    const isMobile = Math.min(window.innerWidth, window.innerHeight) < 700;
    this.simRes = opts.simRes ?? (isMobile ? 96 : 160);
    this.dyeRes = opts.dyeRes ?? (isMobile ? 384 : 640);
    this.pressureIters = opts.pressureIters ?? (isMobile ? 14 : 26);
    this.curlStrength = opts.curlStrength ?? 26;
    this.dyeDissipation = opts.dyeDissipation ?? 0.976;
    this.velDissipation = opts.velDissipation ?? 0.992;

    // Quad-Geometrie
    this.quadVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.quadVAO);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const vert = compileShader(gl, gl.VERTEX_SHADER, BASE_VERT);
    const mk = (fragSrc: string) => {
      const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
      return new Program(gl, vert, frag);
    };
    this.programs.copy = mk(COPY_FRAG);
    this.programs.splat = mk(SPLAT_FRAG);
    this.programs.advection = mk(ADVECTION_FRAG);
    this.programs.divergence = mk(DIVERGENCE_FRAG);
    this.programs.curl = mk(CURL_FRAG);
    this.programs.vorticity = mk(VORTICITY_FRAG);
    this.programs.pressure = mk(PRESSURE_FRAG);
    this.programs.gradientSubtract = mk(GRADIENT_SUBTRACT_FRAG);
    this.programs.display = mk(DISPLAY_FRAG);

    this.initFramebuffers();
  }

  private createFBO(w: number, h: number, internalFormat: number, format: number, type: number, filter: number): FBO {
    const gl = this.gl;
    const texture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX: 1 / w,
      texelSizeY: 1 / h,
      attach(id: number) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  private createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, filter: number): DoubleFBO {
    let a = this.createFBO(w, h, internalFormat, format, type, filter);
    let b = this.createFBO(w, h, internalFormat, format, type, filter);
    return {
      get read() { return a; },
      get write() { return b; },
      swap() { const t = a; a = b; b = t; },
    };
  }

  private getResolution(base: number): { width: number; height: number } {
    const canvas = this.canvas;
    let aspect = canvas.width / canvas.height;
    if (aspect < 1) aspect = 1 / aspect;
    const min = Math.round(base);
    const max = Math.round(base * aspect);
    return canvas.width > canvas.height ? { width: max, height: min } : { width: min, height: max };
  }

  private initFramebuffers() {
    const gl = this.gl;
    const texType = gl.HALF_FLOAT;
    const rgba = { internalFormat: gl.RGBA16F, format: gl.RGBA };
    const rg = { internalFormat: gl.RG16F, format: gl.RG };
    const r = { internalFormat: gl.R16F, format: gl.RED };
    const filtering = gl.LINEAR;

    const simRes = this.getResolution(this.simRes);
    const dyeRes = this.getResolution(this.dyeRes);

    this.velocity = this.createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    this.dye = this.createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    this.pressure = this.createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, gl.NEAREST ? texType : texType, gl.NEAREST);
    this.divergence = this.createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    this.curl = this.createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
  }

  resize() {
    const canvas = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      this.initFramebuffers();
    }
  }

  private blit(target: FBO | null) {
    const gl = this.gl;
    if (target == null) {
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    gl.bindVertexArray(this.quadVAO);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Farb- und Impuls-Splat absetzen (Koordinaten in UV 0..1). */
  splat(s: Splat) {
    const gl = this.gl;
    const aspect = this.canvas.width / this.canvas.height;
    const radius = Math.max(s.radius, 0.0002);

    const doSplat = (target: DoubleFBO, color: [number, number, number], amount: number) => {
      const p = this.programs.splat;
      p.bind();
      gl.uniform1i(p.u("uTarget"), target.read.attach(0));
      gl.uniform1f(p.u("aspectRatio"), aspect);
      gl.uniform2f(p.u("point"), s.x, s.y);
      gl.uniform3f(p.u("color"), color[0], color[1], color[2]);
      gl.uniform1f(p.u("radius"), radius);
      gl.uniform1f(p.u("amount"), amount);
      this.blit(target.write);
      target.swap();
    };

    doSplat(this.velocity, [s.dx, s.dy, 0], 1);
    doSplat(this.dye, s.color, s.amount ?? 0.35);
  }

  step(dt: number) {
    const gl = this.gl;
    const timeScale = this.calm ? 0.55 : 1;
    const velDiss = this.calm ? Math.min(0.97, this.velDissipation - 0.02) : this.velDissipation;
    const dyeDiss = this.calm ? Math.min(0.965, this.dyeDissipation - 0.02) : this.dyeDissipation;
    this.time += dt;

    // Curl
    {
      const p = this.programs.curl;
      p.bind();
      gl.uniform2f(p.u("texelSize"), this.velocity.read.texelSizeX, this.velocity.read.texelSizeY);
      gl.uniform1i(p.u("uVelocity"), this.velocity.read.attach(0));
      this.blit(this.curl);
    }

    // Vorticity
    {
      const p = this.programs.vorticity;
      p.bind();
      gl.uniform2f(p.u("texelSize"), this.velocity.read.texelSizeX, this.velocity.read.texelSizeY);
      gl.uniform1i(p.u("uVelocity"), this.velocity.read.attach(0));
      gl.uniform1i(p.u("uCurl"), this.curl.attach(1));
      gl.uniform1f(p.u("curl"), this.curlStrength);
      gl.uniform1f(p.u("dt"), dt);
      this.blit(this.velocity.write);
      this.velocity.swap();
    }

    // Divergenz
    {
      const p = this.programs.divergence;
      p.bind();
      gl.uniform2f(p.u("texelSize"), this.velocity.read.texelSizeX, this.velocity.read.texelSizeY);
      gl.uniform1i(p.u("uVelocity"), this.velocity.read.attach(0));
      this.blit(this.divergence);
    }

    // Druck (Jacobi)
    {
      const p = this.programs.pressure;
      p.bind();
      gl.uniform2f(p.u("texelSize"), this.velocity.read.texelSizeX, this.velocity.read.texelSizeY);
      gl.uniform1i(p.u("uDivergence"), this.divergence.attach(0));
      for (let i = 0; i < this.pressureIters; i++) {
        gl.uniform1i(p.u("uPressure"), this.pressure.read.attach(1));
        this.blit(this.pressure.write);
        this.pressure.swap();
      }
    }

    // Gradienten-Subtraktion
    {
      const p = this.programs.gradientSubtract;
      p.bind();
      gl.uniform2f(p.u("texelSize"), this.velocity.read.texelSizeX, this.velocity.read.texelSizeY);
      gl.uniform1i(p.u("uPressure"), this.pressure.read.attach(0));
      gl.uniform1i(p.u("uVelocity"), this.velocity.read.attach(1));
      this.blit(this.velocity.write);
      this.velocity.swap();
    }

    // Advektion Velocity
    {
      const p = this.programs.advection;
      p.bind();
      gl.uniform2f(p.u("texelSize"), this.velocity.read.texelSizeX, this.velocity.read.texelSizeY);
      gl.uniform1i(p.u("uVelocity"), this.velocity.read.attach(0));
      gl.uniform1i(p.u("uSource"), this.velocity.read.attach(0));
      gl.uniform1f(p.u("dt"), dt * timeScale);
      gl.uniform1f(p.u("dissipation"), velDiss);
      this.blit(this.velocity.write);
      this.velocity.swap();
    }

    // Advektion Dye
    {
      const p = this.programs.advection;
      p.bind();
      gl.uniform2f(p.u("texelSize"), this.velocity.read.texelSizeX, this.velocity.read.texelSizeY);
      gl.uniform1i(p.u("uVelocity"), this.velocity.read.attach(0));
      gl.uniform1i(p.u("uSource"), this.dye.read.attach(1));
      gl.uniform1f(p.u("dt"), dt * timeScale);
      gl.uniform1f(p.u("dissipation"), dyeDiss);
      this.blit(this.dye.write);
      this.dye.swap();
    }
  }

  render() {
    const gl = this.gl;
    const p = this.programs.display;
    p.bind();
    gl.uniform2f(p.u("texelSize"), 1 / this.canvas.width, 1 / this.canvas.height);
    gl.uniform1i(p.u("uTexture"), this.dye.read.attach(0));
    gl.uniform1i(p.u("uVelocity"), this.velocity.read.attach(1));
    gl.uniform1f(p.u("time"), this.time);
    this.blit(null);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min((now - this.lastTime) / 1000, 1 / 30);
      this.lastTime = now;
      this.resize();
      // Zeitintegration in Sim-Schritten (stabile 60 fps)
      this.step(dt);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  dispose() {
    this.stop();
    // Kein loseContext(): React StrictMode mountet Effekte doppelt — ein
    // verlorener Kontext auf demselben Canvas lässt die zweite Initialisierung
    // scheitern. Der Canvas wird ohnehin mit der Komponente verworfen.
  }
}

/** True, wenn diese Umgebung die Fluid-Sim tragen kann. */
export function canRunFluid(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") as WebGL2RenderingContext | null;
    if (!gl) return false;
    return !!(gl.getExtension("EXT_color_buffer_float") ?? gl.getExtension("EXT_color_buffer_half_float"));
  } catch {
    return false;
  }
}

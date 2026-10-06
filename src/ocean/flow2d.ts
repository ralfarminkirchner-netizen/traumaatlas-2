// Stilisierte 2D-Canvas-Strömung als Fallback, wenn WebGL2 nicht verfügbar ist.
// Ruhige, dunkle Wasserfläche mit wandernden Glanzbahnen — keine Physik, aber würdevoll.

export class Flow2D {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private reduced: boolean;
  private rafId = 0;
  private running = false;
  private time = 0;
  private streaks: { x: number; y: number; len: number; speed: number; hue: number; phase: number }[] = [];
  private pointer = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, active: false };

  constructor(canvas: HTMLCanvasElement, reduced: boolean) {
    this.canvas = canvas;
    this.reduced = reduced;
    this.ctx = canvas.getContext("2d")!;
    for (let i = 0; i < 90; i++) {
      this.streaks.push({
        x: Math.random(),
        y: Math.random(),
        len: 0.02 + Math.random() * 0.06,
        speed: 0.008 + Math.random() * 0.02,
        hue: Math.random(),
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.draw = this.draw.bind(this);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.floor(this.canvas.clientWidth * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  setPointer(x: number, y: number) {
    this.pointer.px = this.pointer.x;
    this.pointer.py = this.pointer.y;
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.active = true;
  }

  private field(x: number, y: number, t: number): number {
    return (
      Math.sin(x * 6.2 + t * 0.7) * Math.cos(y * 4.4 - t * 0.5) +
      Math.sin((x + y) * 3.1 + t * 0.3) * 0.6
    );
  }

  draw() {
    this.resize();
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    this.time += 1 / 60;

    // Grund
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#04161b");
    g.addColorStop(1, "#02090c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Glanzbahnen entlang des Strömungsfeldes
    ctx.lineCap = "round";
    for (const s of this.streaks) {
      const a = this.field(s.x, s.y, this.time + s.phase);
      const dx = Math.cos(a * Math.PI) * s.speed;
      const dy = Math.sin(a * Math.PI) * s.speed * 0.6;
      s.x = (s.x + dx + 1) % 1;
      s.y = (s.y + dy + 1) % 1;
      const px = s.x * w;
      const py = s.y * h;
      const alpha = 0.05 + 0.06 * Math.sin(this.time * 0.8 + s.phase);
      ctx.strokeStyle =
        s.hue > 0.8
          ? `rgba(226, 178, 120, ${alpha})`
          : `rgba(120, 190, 200, ${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - dx * s.len * w, py - dy * s.len * h);
      ctx.stroke();
    }

    // Zeiger-Spur
    if (this.pointer.active) {
      const px = this.pointer.x * w;
      const py = this.pointer.y * h;
      const rad = Math.min(w, h) * 0.09;
      const rg = ctx.createRadialGradient(px, py, 0, px, py, rad);
      rg.addColorStop(0, "rgba(226, 178, 120, 0.10)");
      rg.addColorStop(1, "rgba(226, 178, 120, 0)");
      ctx.fillStyle = rg;
      ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }

    if (this.running && !this.reduced) this.rafId = requestAnimationFrame(this.draw);
  }

  start() {
    if (this.running) return;
    this.running = true;
    if (this.reduced) {
      this.draw(); // ein statischer, vollständiger Frame
    } else {
      this.rafId = requestAnimationFrame(this.draw);
    }
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  /** Bei reduced motion: aktuellen Frame neu zeichnen (z. B. nach Resize). */
  repaint() {
    if (this.reduced) this.draw();
  }

  splat() {
    // 2D-Fallback: sanfte Antwort durch temporär hellere Bahnen — bewusst simpel
    this.time += 0.05;
  }
}

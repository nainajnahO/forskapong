/**
 * WarpSpeed - Animated starfield for HTML5 Canvas
 * Ported to TypeScript ES module from https://github.com/adolfintel/warpspeed
 * Original author: Federico Dossena (LGPL v3)
 */

export interface WarpSpeedConfig {
  speed?: number;
  targetSpeed?: number;
  speedAdjFactor?: number;
  rampDuration?: number;
  density?: number;
  shape?: 'circle' | 'square';
  depthFade?: boolean;
  warpEffect?: boolean;
  warpEffectLength?: number;
  starSize?: number;
  backgroundColor?: string;
  starColor?: string;
}

class Star {
  x: number;
  y: number;
  z: number;
  size: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.size = 0.5 + Math.random();
  }
}

export class WarpSpeed {
  private canvas: HTMLCanvasElement;
  private stars: Star[];
  private lastMoveTS: number;
  private drawRequest: number | null = null;
  private prevW = -1;
  private prevH = -1;
  private size = 0;
  private maxLineWidth = 0;

  // Quadratic ramp state
  private _targetSpeed: number;
  private rampStartSpeed: number;
  private rampStartTime = 0;
  private rampDuration: number;
  private ramping = false;

  SPEED: number;
  SPEED_ADJ_FACTOR: number;
  DENSITY: number;
  USE_CIRCLES: boolean;
  DEPTH_ALPHA: boolean;
  WARP_EFFECT: boolean;
  WARP_EFFECT_LENGTH: number;
  STAR_SCALE: number;
  BACKGROUND_COLOR: string;
  STAR_COLOR: string;
  PAUSED = false;

  get TARGET_SPEED(): number {
    return this._targetSpeed;
  }

  set TARGET_SPEED(value: number) {
    if (value === this._targetSpeed) return;
    this.rampStartSpeed = this.SPEED;
    this.rampStartTime = performance.now();
    this.ramping = true;
    this._targetSpeed = value;
  }

  constructor(canvas: HTMLCanvasElement, config: WarpSpeedConfig = {}) {
    this.canvas = canvas;
    canvas.width = 1;
    canvas.height = 1;

    this.SPEED = config.speed == null || config.speed < 0 ? 0.7 : config.speed;
    this._targetSpeed = config.targetSpeed == null || config.targetSpeed < 0 ? this.SPEED : config.targetSpeed;
    this.rampStartSpeed = this.SPEED;
    this.rampDuration = config.rampDuration ?? 1500;
    this.SPEED_ADJ_FACTOR = config.speedAdjFactor == null ? 0.03 : Math.max(0, Math.min(1, config.speedAdjFactor));
    this.DENSITY = config.density == null || config.density <= 0 ? 0.7 : config.density;
    this.USE_CIRCLES = config.shape == null ? true : config.shape === 'circle';
    this.DEPTH_ALPHA = config.depthFade == null ? true : config.depthFade;
    this.WARP_EFFECT = config.warpEffect == null ? true : config.warpEffect;
    this.WARP_EFFECT_LENGTH = config.warpEffectLength == null ? 5 : Math.max(0, config.warpEffectLength);
    this.STAR_SCALE = config.starSize == null || config.starSize <= 0 ? 3 : config.starSize;
    this.BACKGROUND_COLOR = config.backgroundColor ?? 'hsl(263,45%,7%)';
    this.STAR_COLOR = config.starColor ?? '#FFFFFF';

    this.stars = [];
    for (let i = 0; i < this.DENSITY * 1000; i++) {
      this.stars.push(new Star((Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000, 1000 * Math.random()));
    }

    this.lastMoveTS = performance.now();
    this.draw();
  }

  private draw = (): void => {
    this.move();
    const canvas = this.canvas;

    if (!this.PAUSED) {
      if (this.prevW !== canvas.clientWidth || this.prevH !== canvas.clientHeight) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = (canvas.clientWidth < 10 ? 10 : canvas.clientWidth) * dpr;
        canvas.height = (canvas.clientHeight < 10 ? 10 : canvas.clientHeight) * dpr;
      }

      this.size = (canvas.height < canvas.width ? canvas.height : canvas.width) / (10 / (this.STAR_SCALE <= 0 ? 0 : this.STAR_SCALE));
      if (this.WARP_EFFECT) this.maxLineWidth = this.size / 30;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = this.BACKGROUND_COLOR;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = this.STAR_COLOR;

        for (let i = 0; i < this.stars.length; i++) {
          const s = this.stars[i];
          const xOnDisplay = s.x / s.z;
          const yOnDisplay = s.y / s.z;

          if (!this.WARP_EFFECT && (xOnDisplay < -0.5 || xOnDisplay > 0.5 || yOnDisplay < -0.5 || yOnDisplay > 0.5)) continue;

          const size = s.size * this.size / s.z;
          if (size < 0.3) continue;

          if (this.DEPTH_ALPHA) {
            const alpha = (1000 - s.z) / 1000;
            ctx.globalAlpha = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
          }

          if (this.WARP_EFFECT) {
            ctx.beginPath();
            const x2OnDisplay = s.x / (s.z + this.WARP_EFFECT_LENGTH * this.SPEED);
            const y2OnDisplay = s.y / (s.z + this.WARP_EFFECT_LENGTH * this.SPEED);
            if (x2OnDisplay < -0.5 || x2OnDisplay > 0.5 || y2OnDisplay < -0.5 || y2OnDisplay > 0.5) continue;
            ctx.moveTo(canvas.width * (xOnDisplay + 0.5) - size / 2, canvas.height * (yOnDisplay + 0.5) - size / 2);
            ctx.lineTo(canvas.width * (x2OnDisplay + 0.5) - size / 2, canvas.height * (y2OnDisplay + 0.5) - size / 2);
            ctx.lineWidth = size > this.maxLineWidth ? this.maxLineWidth : size;
            ctx.lineCap = this.USE_CIRCLES ? 'round' : 'butt';
            ctx.strokeStyle = ctx.fillStyle;
            ctx.stroke();
          } else if (this.USE_CIRCLES) {
            ctx.beginPath();
            ctx.arc(canvas.width * (xOnDisplay + 0.5) - size / 2, canvas.height * (yOnDisplay + 0.5) - size / 2, size / 2, 0, 2 * Math.PI);
            ctx.fill();
          } else {
            ctx.fillRect(canvas.width * (xOnDisplay + 0.5) - size / 2, canvas.height * (yOnDisplay + 0.5) - size / 2, size, size);
          }
        }

        this.prevW = canvas.clientWidth;
        this.prevH = canvas.clientHeight;
      }
    }

    this.drawRequest = requestAnimationFrame(this.draw);
  };

  private move(): void {
    const now = performance.now();
    const speedMulF = (now - this.lastMoveTS) / (1000 / 60);
    this.lastMoveTS = now;
    if (this.PAUSED) return;

    // Quadratic ramp: ease-in (t²) when accelerating, ease-out when decelerating
    if (this.ramping) {
      let t = (now - this.rampStartTime) / this.rampDuration;
      if (t >= 1) {
        t = 1;
        this.ramping = false;
      }
      const accelerating = this._targetSpeed > this.rampStartSpeed;
      const eased = accelerating ? t * t : 1 - (1 - t) * (1 - t);
      this.SPEED = this.rampStartSpeed + (this._targetSpeed - this.rampStartSpeed) * eased;
    } else {
      // Fallback exponential lerp for fine adjustments
      const speedAdjF = Math.pow(this.SPEED_ADJ_FACTOR, 1 / speedMulF);
      this.SPEED = this._targetSpeed * speedAdjF + this.SPEED * (1 - speedAdjF);
    }
    if (this.SPEED < 0) this.SPEED = 0;

    const speed = this.SPEED * speedMulF;
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.z -= speed;
      while (s.z < 1) {
        s.z += 1000;
        s.x = (Math.random() - 0.5) * s.z;
        s.y = (Math.random() - 0.5) * s.z;
      }
    }
  }

  destroy(): void {
    if (this.drawRequest != null) {
      cancelAnimationFrame(this.drawRequest);
      this.drawRequest = null;
    }
  }

  pause(): void {
    this.PAUSED = true;
  }

  resume(): void {
    this.PAUSED = false;
  }
}

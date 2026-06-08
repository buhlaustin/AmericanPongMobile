import type { Particle } from './types';

let nextId = 0;

export function spawnBurst(
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  count = 12,
  speed = 180,
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const v = speed * (0.5 + Math.random() * 0.5);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

export function spawnTrail(particles: Particle[], x: number, y: number, color: string): void {
  if (Math.random() > 0.6) return;
  particles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 20,
    vy: (Math.random() - 0.5) * 20,
    life: 0.25,
    maxLife: 0.25,
    color,
    size: 1.5 + Math.random() * 2,
  });
}

export function updateParticles(particles: Particle[], dt: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 120 * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function nextPowerUpId(): number {
  return ++nextId;
}

import { DIFFICULTIES, type Difficulty } from './constants';
import type { Ball } from './types';

export class CpuAI {
  private targetY = 0;
  private reactionTimer = 0;
  private willMiss = false;

  reset(): void {
    this.targetY = 0;
    this.reactionTimer = 0;
    this.willMiss = false;
  }

  update(
    cpuY: number,
    paddleHeight: number,
    ball: Ball,
    courtHeight: number,
    difficulty: Difficulty,
    dt: number,
    ballApproaching: boolean,
  ): number {
    const config = DIFFICULTIES[difficulty];
    const paddleCenter = cpuY + paddleHeight / 2;

    if (ballApproaching && ball.vx > 0) {
      this.reactionTimer -= dt;
      if (this.reactionTimer <= 0) {
        this.reactionTimer = config.cpuReactionDelay * (0.7 + Math.random() * 0.6);
        this.willMiss = Math.random() < config.cpuMissChance;

        if (this.willMiss) {
          const missOffset = (Math.random() > 0.5 ? 1 : -1) * (paddleHeight * 0.6 + Math.random() * 40);
          this.targetY = ball.y + missOffset;
        } else {
          const prediction = this.predictIntercept(ball, courtHeight);
          this.targetY = prediction + (Math.random() - 0.5) * config.cpuDeadzone;
        }
      }
    } else if (!ballApproaching) {
      this.targetY = courtHeight / 2;
    }

    const diff = this.targetY - paddleCenter;
    let move = 0;
    if (Math.abs(diff) > config.cpuDeadzone) {
      move = Math.sign(diff) * config.cpuSpeed * dt;
    }

    return Math.max(0, Math.min(courtHeight - paddleHeight, cpuY + move));
  }

  private predictIntercept(ball: Ball, courtHeight: number): number {
    if (ball.vx <= 0) return ball.y;

    const paddleX = 0;
    const dist = paddleX - ball.x;
    if (dist >= 0) return ball.y;

    const time = Math.abs(dist / ball.vx);
    let predictedY = ball.y + ball.vy * time;

    const radius = ball.radius;
    let bounces = 0;
    while ((predictedY < radius || predictedY > courtHeight - radius) && bounces < 6) {
      if (predictedY < radius) predictedY = radius + (radius - predictedY);
      if (predictedY > courtHeight - radius) predictedY = courtHeight - radius - (predictedY - (courtHeight - radius));
      bounces++;
    }

    return predictedY;
  }
}

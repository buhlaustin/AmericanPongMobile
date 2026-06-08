# American Pong Mobile

The ultimate patriotic paddle experience — a deep mobile build of [American Pong](https://github.com/buhlaustin/AmericanPong), packaged for Android.

## Features

- **4 Game Modes**: Classic, Arcade (power-ups), Survival, and 12-level Campaign
- **5 Difficulty Levels**: Rookie through Legend — Rookie & Easy are tuned to be highly winnable
- **7 Power-Ups**: Big Paddle, Speed Boost, Slow-Mo, Magnet, Shield, Fireball, Ghost Ball
- **Mobile-First Controls**: Touch-drag paddle on the left half of the screen
- **Juice**: Particle effects, screen shake, ball trails, combo system, haptic feedback
- **Progression**: Stats, streaks, achievements, and campaign boss levels
- **Audio**: Procedural sound effects via Web Audio API

## Quick Start (Web)

```bash
npm install
npm run dev
```

## Build APK

```bash
npm install
npm run android:build
```

The debug APK will be at:

`android/app/build/outputs/apk/debug/app-debug.apk`

## Controls

All controls are on-screen tap buttons — no keyboard required.

| Button | Action |
|--------|--------|
| ▲ / ▼ | Move paddle up / down (hold to move) |
| Serve | Launch the ball when serving |
| ⏸ | Pause the match |
| Menu buttons | Navigate modes, difficulty, stats, and results |

## Original

The original single-file Google Apps Script version is preserved in `american-pong-script.js`.

## License

MIT — see [LICENSE](LICENSE).

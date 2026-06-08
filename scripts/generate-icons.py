#!/usr/bin/env python3
"""Generate Android launcher icons from public/app-icon.svg."""

from __future__ import annotations

import io
import os
import sys

import cairosvg
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG_PATH = os.path.join(ROOT, 'public', 'app-icon.svg')
RES_DIR = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')

SIZES = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

BG_COLOR = (10, 22, 40, 255)


def render_icon(size: int) -> Image.Image:
    png_bytes = cairosvg.svg2png(url=SVG_PATH, output_width=size, output_height=size)
    icon = Image.open(io.BytesIO(png_bytes)).convert('RGBA')
    canvas = Image.new('RGBA', (size, size), BG_COLOR)
    canvas.alpha_composite(icon)
    return canvas


def main() -> int:
    if not os.path.exists(SVG_PATH):
        print(f'Missing icon source: {SVG_PATH}', file=sys.stderr)
        return 1

    for folder, size in SIZES.items():
        out_dir = os.path.join(RES_DIR, folder)
        os.makedirs(out_dir, exist_ok=True)
        icon = render_icon(size)
        icon.save(os.path.join(out_dir, 'ic_launcher.png'), 'PNG')
        icon.save(os.path.join(out_dir, 'ic_launcher_round.png'), 'PNG')
        icon.save(os.path.join(out_dir, 'ic_launcher_foreground.png'), 'PNG')
        print(f'wrote {folder} ({size}px)')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())

#!/usr/bin/env python3
"""
Generate HDR AVIF images for brand accent colors.

Creates tiny solid-color PQ-encoded BT.2020 AVIF files with luminance
above SDR reference white. Used as CSS background-image fills — the
browser's HDR image decoder handles the luminance, not the CSS color engine.

Requirements:
  pip install colour-science numpy Pillow
  brew install libavif   (for avifenc)

Usage:
  python scripts/generate-hdr-images.py                    # all images
  python scripts/generate-hdr-images.py brand-500-red      # one image
"""

import subprocess
import sys
from pathlib import Path

import numpy as np
import colour
from PIL import Image

# ─── Config ───────────────────────────────────────────────────────────

SDR_WHITE_NITS = 203  # ITU-R BT.2408 reference
IMAGE_SIZE = 8
OUTPUT_DIR = Path(__file__).parent.parent / "src" / "assets" / "hdr"

# Brand colors: OKLCH values from src/index.css (sRGB base, not P3)
# Boost = luminance multiplier vs SDR. Higher = brighter on HDR displays.
# 3-4× makes the color's dominant channel exceed SDR peak → visible glow.
BRAND_COLORS = {
    "brand-400-red":  {"oklch": (0.604, 0.191, 22.2), "boost": 3.0},
    "brand-500-red":  {"oklch": (0.537, 0.237, 25.3), "boost": 4.0},
    "brand-600-red":  {"oklch": (0.477, 0.245, 27.3), "boost": 1.8},
    "brand-400-blue": {"oklch": (0.585, 0.1,   230),  "boost": 3.0},
    "brand-500-blue": {"oklch": (0.521, 0.12,  235),  "boost": 4.0},
    "brand-600-blue": {"oklch": (0.442, 0.11,  237),  "boost": 1.8},
    "white":          {"oklch": (1.0, 0, 0),          "boost": 2.5},
}


# ─── Color math ──────────────────────────────────────────────────────

def oklch_to_pq_bt2020(L, C, h, boost):
    """
    Convert OKLCH color to PQ-encoded BT.2020 RGB signal values.

    Pipeline:
      OKLCH → OKLab → CIE XYZ → sRGB (gamma) → linear BT.2020
      → scale to target nits → PQ OETF → signal [0, 1]
    """
    # OKLCH → OKLab
    a = C * np.cos(np.radians(h))
    b = C * np.sin(np.radians(h))
    oklab = np.array([L, a, b])

    # OKLab → CIE XYZ
    XYZ = colour.Oklab_to_XYZ(oklab)

    # XYZ → sRGB (gamma-encoded, this is what colour returns by default)
    srgb_gamma = colour.XYZ_to_RGB(XYZ, 'sRGB')

    # sRGB → linear BT.2020 (colour handles gamma decode internally)
    linear_bt2020 = colour.RGB_to_RGB(
        srgb_gamma, 'sRGB', 'ITU-R BT.2020',
        apply_cctf_encoding=False,
    )
    # Clamp negatives (out-of-gamut colors may produce small negatives)
    linear_bt2020 = np.maximum(linear_bt2020, 0)

    # Scale to target luminance in nits
    # In our linear space, 1.0 = SDR reference white (203 nits)
    nits_per_channel = linear_bt2020 * SDR_WHITE_NITS * boost

    # Apply PQ OETF (inverse EOTF): nits → PQ signal [0, 1]
    pq_signal = colour.models.eotf_inverse_ST2084(nits_per_channel)

    return pq_signal, linear_bt2020, nits_per_channel


def create_hdr_avif(name, oklch, boost):
    """Create a single HDR AVIF image file."""
    L, C, h = oklch

    pq_signal, linear_bt2020, nits = oklch_to_pq_bt2020(L, C, h, boost)

    # Convert PQ signal [0, 1] → 8-bit pixel values [0, 255]
    # Our PQ values are mid-range (0.3-0.7), where 8-bit gives <1% error
    pixel_8bit = np.clip(pq_signal * 255, 0, 255).astype(np.uint8)

    # Create 8×8 solid-color image
    img_data = np.full((IMAGE_SIZE, IMAGE_SIZE, 3), pixel_8bit, dtype=np.uint8)
    img = Image.fromarray(img_data, mode='RGB')

    # Save temporary PNG (avifenc upsamples to 10-bit)
    png_path = OUTPUT_DIR / f"{name}.png"
    img.save(str(png_path))

    # Encode to AVIF with PQ metadata
    # CICP: 9=BT.2020 primaries, 16=PQ transfer, 9=BT.2020-NCL matrix
    avif_path = OUTPUT_DIR / f"{name}.avif"
    result = subprocess.run(
        [
            "avifenc",
            "--cicp", "9/16/9",
            "-r", "full",
            "-d", "10",
            "-y", "444",
            "-q", "100",
            "--ignore-icc",
            str(png_path),
            str(avif_path),
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print(f"  ERROR: avifenc failed:\n{result.stderr}")
        return False

    # Clean up temp PNG
    png_path.unlink()

    size = avif_path.stat().st_size
    pq_white = colour.models.eotf_inverse_ST2084(SDR_WHITE_NITS)

    print(f"  Created {name}.avif ({size} bytes)")
    print(f"    Linear BT.2020 : [{linear_bt2020[0]:.4f}, {linear_bt2020[1]:.4f}, {linear_bt2020[2]:.4f}]")
    print(f"    Target nits    : R={nits[0]:.0f}  G={nits[1]:.0f}  B={nits[2]:.0f}  (boost {boost}×)")
    print(f"    PQ signal      : [{pq_signal[0]:.4f}, {pq_signal[1]:.4f}, {pq_signal[2]:.4f}]")
    print(f"    SDR white PQ   : {pq_white:.4f}  ← R channel {'exceeds' if pq_signal[0] > pq_white else 'below'} SDR white")
    return True


# ─── Logo conversion ─────────────────────────────────────────────────

LOGO_SRC = Path(__file__).parent.parent / "src" / "assets" / "logo.webp"
LOGO_BOOST = 2.5  # same as white HDR fill


def create_hdr_logo():
    """Convert the white-on-transparent logo to an HDR PQ-encoded AVIF."""
    if not LOGO_SRC.exists():
        print(f"  ERROR: Logo not found at {LOGO_SRC}")
        return False

    # Compute PQ value for HDR white
    pq_signal, _, nits = oklch_to_pq_bt2020(1.0, 0, 0, LOGO_BOOST)
    pixel_8bit = int(np.clip(pq_signal[0] * 255, 0, 255))

    # Load logo and preserve alpha
    logo = Image.open(LOGO_SRC).convert("RGBA")
    r, g, b, a = logo.split()

    # Replace RGB with PQ HDR white, keep original alpha
    hdr_channel = Image.new("L", logo.size, pixel_8bit)
    hdr_logo = Image.merge("RGBA", (hdr_channel, hdr_channel, hdr_channel, a))

    # Save temporary PNG
    png_path = OUTPUT_DIR / "logo.png"
    hdr_logo.save(str(png_path))

    # Encode to AVIF with PQ metadata + alpha
    avif_path = OUTPUT_DIR / "logo.avif"
    result = subprocess.run(
        [
            "avifenc",
            "--cicp", "9/16/9",
            "-r", "full",
            "-d", "10",
            "-y", "444",
            "-q", "90",
            "--ignore-icc",
            str(png_path),
            str(avif_path),
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print(f"  ERROR: avifenc failed:\n{result.stderr}")
        return False

    png_path.unlink()
    size = avif_path.stat().st_size
    print(f"  Created logo.avif ({size} bytes)")
    print(f"    Source         : {LOGO_SRC.name} ({logo.size[0]}×{logo.size[1]})")
    print(f"    Target nits    : {nits[0]:.0f} (boost {LOGO_BOOST}×)")
    print(f"    PQ white pixel : {pixel_8bit} / 255")
    return True


# ─── Main ────────────────────────────────────────────────────────────

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Accept optional filter argument
    names = sys.argv[1:] if len(sys.argv) > 1 else list(BRAND_COLORS.keys()) + ["logo"]

    success = 0
    total = len(names)
    for name in names:
        if name == "logo":
            print(f"\n{'─' * 50}")
            print("Generating HDR logo...")
            if create_hdr_logo():
                success += 1
            continue
        if name not in BRAND_COLORS:
            print(f"Unknown color: {name}")
            continue
        config = BRAND_COLORS[name]
        print(f"\n{'─' * 50}")
        print(f"Generating {name}...")
        if create_hdr_avif(name, config["oklch"], config["boost"]):
            success += 1

    print(f"\n{'─' * 50}")
    print(f"Done: {success}/{total} images in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()

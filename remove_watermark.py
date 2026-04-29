"""
remove_watermark.py
-------------------
Removes the semi-transparent "Trade-A-Plane" watermark from the lower-right
corner of Seitz Aviation photos.

Usage:
    python remove_watermark.py photo1.jpg photo2.jpg photo3.jpg

    # Or process a whole folder:
    python remove_watermark.py *.jpg

Cleaned images are saved as:
    photo1_clean.jpg, photo2_clean.jpg, etc.

Requirements:
    pip install opencv-python numpy pillow
"""

import sys
import os
import cv2
import numpy as np


def remove_trade_a_plane_watermark(image_path: str, output_path: str) -> None:
    img = cv2.imread(image_path)
    if img is None:
        print(f"  ⚠️  Could not read {image_path}")
        return

    h, w = img.shape[:2]

    # ── Build a mask for the watermark region ─────────────────────────────────
    # The "Trade-A-Plane" text sits in the lower-right of these photos:
    #   roughly the bottom 20% of height, right 45% of width.
    mask = np.zeros((h, w), dtype=np.uint8)

    x1 = int(w * 0.55)
    y1 = int(h * 0.78)
    x2 = w
    y2 = h - int(h * 0.01)   # leave a tiny margin at the very bottom edge

    # Crop the watermark region and find the semi-transparent gray pixels
    roi = img[y1:y2, x1:x2].astype(np.float32)

    # Convert to HSV to isolate the light-gray translucent text
    roi_bgr = img[y1:y2, x1:x2]
    roi_hsv = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2HSV)

    # Trade-A-Plane watermark is light gray / white with low saturation
    # Pick pixels that are: low saturation AND relatively bright (not pure white background)
    sat   = roi_hsv[:, :, 1]   # 0-255
    val   = roi_hsv[:, :, 2]   # brightness 0-255

    # The watermark pixels: low saturation, mid-to-high brightness
    # Avoid masking pure-white areas (background) — only flag slightly-gray pixels
    wm_mask_roi = (sat < 40) & (val > 100) & (val < 240)

    # Also do a gradient-based refinement: the watermark adds a slight texture
    gray_roi = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2GRAY)
    _, text_thresh = cv2.threshold(gray_roi, 180, 255, cv2.THRESH_BINARY)

    # Combine both cues
    combined = (wm_mask_roi.astype(np.uint8) * 255) | text_thresh

    # Dilate to ensure full coverage of each letter stroke
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    combined = cv2.dilate(combined, kernel, iterations=2)

    mask[y1:y2, x1:x2] = combined

    # ── Inpaint the masked region ─────────────────────────────────────────────
    # TELEA algorithm gives natural-looking fills for this kind of background
    result = cv2.inpaint(img, mask, inpaintRadius=7, flags=cv2.INPAINT_TELEA)

    cv2.imwrite(output_path, result, [cv2.IMWRITE_JPEG_QUALITY, 97])
    print(f"  ✅  Saved → {output_path}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python remove_watermark.py image1.jpg image2.jpg ...")
        sys.exit(1)

    files = sys.argv[1:]
    print(f"\nProcessing {len(files)} image(s)...\n")

    for path in files:
        if not os.path.isfile(path):
            print(f"  ⚠️  File not found: {path}")
            continue

        base, ext = os.path.splitext(path)
        out = f"{base}_clean{ext}"
        print(f"  🖼  {os.path.basename(path)}")
        remove_trade_a_plane_watermark(path, out)

    print("\nDone!")


if __name__ == "__main__":
    main()

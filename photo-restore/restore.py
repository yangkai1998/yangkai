#!/usr/bin/env python3
"""Restore 杨凯照片.jpg: crop from album, upright, clean stains, face enhance, color fix."""
from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "杨凯照片.jpg"
OUT = ROOT / "杨凯照片_修复.jpg"
CROP = ROOT / "杨凯照片_裁切原图.jpg"
MODEL = Path(__file__).resolve().parent / "models" / "GFPGANv1.4.pth"


def load_bgr(path: Path):
    return cv2.imdecode(np.fromfile(str(path), dtype=np.uint8), cv2.IMREAD_COLOR)


def save_bgr(path: Path, img):
    cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), 95])[1].tofile(str(path))


def crop_upright(img):
    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mask = cv2.bitwise_and(
        cv2.inRange(hsv, (0, 20, 40), (180, 255, 255)),
        cv2.inRange(gray, 0, 210),
    )
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k, iterations=3)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k, iterations=1)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    x, y, bw, bh = cv2.boundingRect(contours[0])
    pad = 8
    cropped = img[max(0, y + pad) : min(h, y + bh - pad), max(0, x + pad) : min(w, x + bw - pad)]
    return cv2.rotate(cropped, cv2.ROTATE_180)


def inpaint(image, mask, r1=5, r2=12):
    m = (mask > 0).astype(np.uint8) * 255
    out = cv2.inpaint(image, m, r1, cv2.INPAINT_TELEA)
    return cv2.inpaint(out, m, r2, cv2.INPAINT_NS)


def clean(work):
    h, w = work.shape[:2]
    # landmarks from retinaface on this photo (upright crop)
    dx, dy, gx, gy = 567, 344, 683, 364
    eye_dist = abs(gx - dx)
    mask = np.zeros((h, w), np.uint8)
    cv2.ellipse(mask, (dx, dy), (int(eye_dist * 0.55), int(eye_dist * 0.45)), 0, 0, 360, 255, -1)
    fx, fy = int((dx + gx) / 2), int(min(dy, gy) - eye_dist * 0.50)
    cv2.ellipse(mask, (fx, fy), (int(eye_dist * 0.85), int(eye_dist * 0.38)), -10, 0, 360, 255, -1)

    hsv = cv2.cvtColor(work, cv2.COLOR_BGR2HSV)
    _, S, V = cv2.split(hsv)
    localV = cv2.GaussianBlur(V, (41, 41), 0)
    left = np.zeros((h, w), np.uint8)
    left[:, : int(w * 0.40)] = 255
    mold = (
        (((V.astype(np.int16) - localV.astype(np.int16)) > 12) & (S < 70) & (V > 160))
        | ((V > 200) & (S < 45))
    ).astype(np.uint8) * 255
    mold = cv2.bitwise_and(mold, left)
    bot = np.zeros((h, w), np.uint8)
    bot[int(h * 0.87) :, :] = 255
    mold = cv2.bitwise_or(mold, cv2.bitwise_and((((V > 185) & (S < 55)).astype(np.uint8) * 255), bot))
    num, labels, stats, _ = cv2.connectedComponentsWithStats(mold)
    for i in range(1, num):
        if 20 <= stats[i, cv2.CC_STAT_AREA] <= 12000:
            mask[labels == i] = 255

    gray = cv2.cvtColor(work, cv2.COLOR_BGR2GRAY)
    spec = cv2.subtract(gray, cv2.GaussianBlur(gray, (5, 5), 0))
    _, speck = cv2.threshold(spec, 22, 255, cv2.THRESH_BINARY)
    num, labels, stats, _ = cv2.connectedComponentsWithStats(speck)
    for i in range(1, num):
        if 2 <= stats[i, cv2.CC_STAT_AREA] <= 40:
            mask[labels == i] = 255

    mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)), 1)
    work = inpaint(work, mask)

    ew, eh = int(eye_dist * 0.50), int(eye_dist * 0.40)
    good = work[max(0, gy - eh) : min(h, gy + eh), max(0, gx - ew) : min(w, gx + ew)].copy()
    src = cv2.flip(good, 1)
    cm = 255 * np.ones(src.shape[:2], np.uint8)
    cv2.ellipse(cm, (src.shape[1] // 2, src.shape[0] // 2), (int(src.shape[1] * 0.4), int(src.shape[0] * 0.4)), 0, 0, 360, 255, -1)
    if ew < dx < w - ew and eh < dy < h - eh:
        work = cv2.seamlessClone(src, work, cm, (dx, dy), cv2.NORMAL_CLONE)
    return cv2.bilateralFilter(work, 5, 30, 30)


def enhance(work):
    from gfpgan import GFPGANer

    restorer = GFPGANer(
        model_path=str(MODEL),
        upscale=2,
        arch="clean",
        channel_multiplier=2,
        bg_upsampler=None,
    )
    _, _, out = restorer.enhance(work, has_aligned=False, only_center_face=True, paste_back=True, weight=0.7)
    b, g, r = cv2.split(out.astype(np.float32))
    mb, mg, mr = b.mean(), g.mean(), r.mean()
    m = (mb + mg + mr) / 3
    bal = cv2.merge(
        [
            np.clip(b * ((m / mb) ** 0.6), 0, 255),
            np.clip(g * ((m / mg) ** 0.6), 0, 255),
            np.clip(r * ((m / mr) ** 0.6), 0, 255),
        ]
    ).astype(np.uint8)
    lab = cv2.cvtColor(bal, cv2.COLOR_BGR2LAB)
    L, A, B = cv2.split(lab)
    L = cv2.createCLAHE(1.8, (8, 8)).apply(L)
    bal = cv2.cvtColor(cv2.merge([L, A, B]), cv2.COLOR_LAB2BGR)
    final = cv2.addWeighted(bal, 1.2, cv2.GaussianBlur(bal, (0, 0), 1.0), -0.2, 0)
    hsv = cv2.cvtColor(final, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 1.07, 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)


def main():
    img = load_bgr(SRC)
    crop = crop_upright(img)
    save_bgr(CROP, crop)
    cleaned = clean(crop)
    if MODEL.exists():
        final = enhance(cleaned)
    else:
        print("GFPGAN model missing, saving cleaned only:", MODEL)
        final = cleaned
    save_bgr(OUT, final)
    print("wrote", OUT)


if __name__ == "__main__":
    main()

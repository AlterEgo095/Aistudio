#!/usr/bin/env python3
"""
Lip-Sync Engine — Animates character portraits with mouth movement synced to audio.
Uses MediaPipe for face detection + OpenCV for mouth animation.

Usage:
  python3 lip-sync.py <portrait_image> <audio_wav> <output_video> [duration]

Process:
1. Detect face landmarks (mouth region) using MediaPipe
2. Analyze audio amplitude frame by frame
3. For each frame: draw mouth shape that changes with audio amplitude
4. Composite on portrait → create video with audio
"""

import sys
import os
import numpy as np
import cv2
import mediapipe as mp
import wave
import struct

def detect_mouth_region(image_path):
    """Detect mouth region using OpenCV face detection."""
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Cannot read image: {image_path}")

    h, w = image.shape[:2]

    # Use OpenCV Haar cascades for face detection
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(100, 100))

    if len(faces) > 0:
        # Take the largest face
        fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
        # Mouth is in the lower third of the face
        mouth_cx = fx + fw // 2
        mouth_cy = fy + int(fh * 0.75)  # 75% down the face
        mouth_w = int(fw * 0.45)
        mouth_h = int(fh * 0.12)
        print(f"[Lip-Sync] Face detected at ({fx},{fy}) size {fw}x{fh}")
        print(f"[Lip-Sync] Mouth at ({mouth_cx},{mouth_cy}) size {mouth_w}x{mouth_h}")
    else:
        # Fallback: assume mouth is at center-bottom
        print("[Lip-Sync] No face detected, using default position")
        mouth_cx = w // 2
        mouth_cy = int(h * 0.68)
        mouth_w = int(w * 0.12)
        mouth_h = int(h * 0.04)

    return {
        'center': (mouth_cx, mouth_cy),
        'width': max(mouth_w, 20),
        'height': max(mouth_h, 8),
        'image': image
    }

def analyze_audio_amplitude(audio_path, num_frames, fps=30):
    """Analyze audio amplitude for each video frame."""
    try:
        with wave.open(audio_path, 'r') as wav:
            channels = wav.getnchannels()
            sample_width = wav.getsampwidth()
            framerate = wav.getframerate()
            n_frames = wav.getnframes()

            samples_per_frame = int(framerate / fps)
            amplitudes = []

            for i in range(num_frames):
                start = i * samples_per_frame
                wav.setpos(min(start, n_frames - 1))
                raw = wav.readframes(min(samples_per_frame, n_frames - start))

                if sample_width == 2:
                    fmt = f'<{len(raw)//2}h'
                    values = struct.unpack(fmt, raw)
                    amplitude = np.sqrt(np.mean(np.array(values, dtype=float) ** 2)) / 32768.0
                elif sample_width == 1:
                    fmt = f'<{len(raw)}B'
                    values = struct.unpack(fmt, raw)
                    amplitude = np.sqrt(np.mean(np.array(values, dtype=float) ** 2)) / 128.0
                else:
                    amplitude = 0.5

                amplitudes.append(min(1.0, max(0.0, amplitude * 5)))  # Scale up

            return amplitudes
    except Exception as e:
        print(f"Audio analysis failed: {e}, using synthetic amplitudes")
        return [0.3 + 0.4 * np.sin(i * 0.5) for i in range(num_frames)]

def draw_mouth(image, mouth_info, amplitude, frame_idx):
    """Draw animated mouth on the image based on amplitude."""
    img = image.copy()
    cx, cy = mouth_info['center']
    base_w = mouth_info['width']
    base_h = mouth_info['height']

    # Mouth shape changes with amplitude
    # Closed mouth: thin line, open mouth: ellipse
    openness = amplitude  # 0 = closed, 1 = fully open

    # Mouth width slightly reduces when opening (natural)
    mouth_w = int(base_w * (1.0 - openness * 0.1))
    # Mouth height grows with amplitude
    mouth_h = max(int(base_h * (0.3 + openness * 2.5)), 3)

    # Create mouth region ROI
    x1 = max(0, cx - mouth_w // 2)
    x2 = min(img.shape[1], cx + mouth_w // 2)
    y1 = max(0, cy - mouth_h // 2)
    y2 = min(img.shape[0], cy + mouth_h // 2)

    # Draw dark interior (mouth cavity)
    overlay = img.copy()
    cv2.ellipse(overlay, (cx, cy), (mouth_w // 2, mouth_h // 2), 0, 0, 360, (20, 20, 30), -1)

    # Draw lips (slightly lighter border)
    lip_color = (40, 30, 40)
    cv2.ellipse(overlay, (cx, cy), (mouth_w // 2 + 2, mouth_h // 2 + 2), 0, 0, 360, lip_color, 2)

    # Blend overlay with original
    alpha = 0.7 + openness * 0.2  # More visible when mouth is open
    cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)

    # Add teeth hint when mouth is sufficiently open
    if openness > 0.3:
        teeth_h = max(2, int(mouth_h * 0.2))
        teeth_y = cy - mouth_h // 4
        cv2.ellipse(img, (cx, teeth_y), (mouth_w // 3, teeth_h), 0, 0, 180, (200, 200, 200), -1)

    return img

def create_talking_video(portrait_path, audio_path, output_path, duration=None, fps=30):
    """Create a talking-head video from portrait + audio."""
    print(f"[Lip-Sync] Starting: portrait={portrait_path}, audio={audio_path}")

    # 1. Detect mouth region
    mouth_info = detect_mouth_region(portrait_path)
    print(f"[Lip-Sync] Mouth detected at {mouth_info['center']}, size={mouth_info['width']}x{mouth_info['height']}")

    # 2. Get audio duration
    try:
        with wave.open(audio_path, 'r') as wav:
            audio_duration = wav.getnframes() / wav.getframerate()
    except:
        audio_duration = duration or 10.0

    if duration:
        audio_duration = min(duration, audio_duration)

    num_frames = int(audio_duration * fps)
    print(f"[Lip-Sync] Duration: {audio_duration:.1f}s, Frames: {num_frames}")

    # 3. Analyze audio amplitude per frame
    amplitudes = analyze_audio_amplitude(audio_path, num_frames, fps)
    print(f"[Lip-Sync] Audio analyzed: {len(amplitudes)} frames, max amplitude: {max(amplitudes):.2f}")

    # 4. Generate frames
    base_image = mouth_info['image']
    h, w = base_image.shape[:2]

    # Scale to 1080p if needed
    if w < 1920:
        scale = 1920 / w
        new_w = 1920
        new_h = int(h * scale)
        base_image = cv2.resize(base_image, (new_w, new_h))
        mouth_info['center'] = (int(mouth_info['center'][0] * scale), int(mouth_info['center'][1] * scale))
        mouth_info['width'] = int(mouth_info['width'] * scale)
        mouth_info['height'] = int(mouth_info['height'] * scale)
        mouth_info['image'] = base_image
        h, w = new_h, new_w

    # Create temp directory for frames
    temp_dir = output_path + '_frames'
    os.makedirs(temp_dir, exist_ok=True)

    # Generate and save frames
    for i in range(num_frames):
        amp = amplitudes[i] if i < len(amplitudes) else 0
        frame = draw_mouth(base_image, mouth_info, amp, i)
        cv2.imwrite(os.path.join(temp_dir, f'frame_{i:06d}.png'), frame)

        if i % 30 == 0:
            print(f"[Lip-Sync] Frame {i}/{num_frames} (amplitude: {amp:.2f})")

    # 5. Create video from frames + audio
    print(f"[Lip-Sync] Encoding video with ffmpeg...")
    os.system(f'ffmpeg -y -framerate {fps} -i "{temp_dir}/frame_%06d.png" -i "{audio_path}" '
              f'-c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p '
              f'-c:a aac -b:a 192k -shortest "{output_path}" 2>/dev/null')

    # Cleanup frames
    import shutil
    shutil.rmtree(temp_dir, ignore_errors=True)

    print(f"[Lip-Sync] Done! Output: {output_path}")
    return output_path

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python3 lip-sync.py <portrait> <audio> <output> [duration]")
        sys.exit(1)

    portrait = sys.argv[1]
    audio = sys.argv[2]
    output = sys.argv[3]
    duration = float(sys.argv[4]) if len(sys.argv) > 4 else None

    create_talking_video(portrait, audio, output, duration)

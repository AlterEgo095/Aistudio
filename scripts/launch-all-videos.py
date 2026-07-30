#!/usr/bin/env python3
"""
Launch all video generations using file-based payloads.
"""
import subprocess
import json
import time
import os
import threading

BASE = "http://localhost:3000"
OUTPUT_DIR = "/home/z/my-project/tmp/test-results"
os.makedirs(OUTPUT_DIR, exist_ok=True)

VIDEOS = [
    {
        "name": "explainer-phones",
        "label": "Comment deux telephones se parlent (2 min)",
        "payload": {
            "prompt": "Comment deux telephones se parlent : le voyage d un message du smartphone A au smartphone B, a travers les antennes relais, les satellites, les cables sous-marins, les serveurs. Explique de facon simple et fascinante le parcours complet d un message texte.",
            "duration": 120,
            "presetId": "explainer-long",
            "fastMode": True,
            "withVoiceover": True,
            "withSubtitles": True,
            "withMusic": True,
            "musicCategory": "corporate",
            "language": "francais",
            "aspectRatio": "16:9",
            "colorGrade": "netflix",
            "exportPreset": "youtube",
        }
    },
    {
        "name": "pub-aenews",
        "label": "Pub AENEWS UNIVERSEL avec presentatrice",
        "payload": {
            "prompt": "AENEWS UNIVERSEL - La plateforme digitale numero 1 en Afrique. Services: marketing automation IA, boost reseaux sociaux, design de logo, developpement web, gestion digitale. Slogan: Meilleur qu hier. Une presentatrice professionnelle presente les services avec passion. 15+ pays touches, support 24/7. Site: aenews.net",
            "duration": 60,
            "presetId": "product",
            "fastMode": True,
            "withVoiceover": True,
            "withSubtitles": True,
            "withMusic": True,
            "musicCategory": "upbeat",
            "language": "francais",
            "aspectRatio": "16:9",
            "colorGrade": "vibrant",
            "exportPreset": "youtube",
        }
    },
    {
        "name": "tuto-prompt-engineering",
        "label": "Tuto: Apprendre le prompt engineering",
        "payload": {
            "prompt": "Comment apprendre le prompt engineering : les bases, les techniques avancees, les astuces de pros. Comment ecrire des prompts qui donnent des resultats exceptionnels avec les IA. Du debutant a l expert en 2 minutes.",
            "duration": 120,
            "presetId": "explainer-long",
            "fastMode": True,
            "withVoiceover": True,
            "withSubtitles": True,
            "withMusic": True,
            "musicCategory": "corporate",
            "language": "francais",
            "aspectRatio": "16:9",
            "colorGrade": "cinematic",
            "exportPreset": "youtube",
        }
    },
]

def launch_generation(video, delay=0):
    """Launch a single video generation."""
    time.sleep(delay)
    name = video["name"]
    payload_file = os.path.join(OUTPUT_DIR, f"{name}-payload.json")
    output_file = os.path.join(OUTPUT_DIR, f"{name}.log")

    with open(payload_file, 'w', encoding='utf-8') as f:
        json.dump(video["payload"], f, ensure_ascii=False)

    print(f"  [{name}] Launching...")

    cmd = [
        "curl", "-s", "--max-time", "600", "-N",
        "-X", "POST", f"{BASE}/api/video/premium",
        "-H", "Content-Type: application/json",
        "-d", f"@{payload_file}",
        "-o", output_file
    ]

    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return name, proc

if __name__ == "__main__":
    print("=" * 60)
    print("LAUNCHING ALL VIDEO GENERATIONS")
    print("=" * 60)

    procs = []
    threads = []

    for i, video in enumerate(VIDEOS):
        print(f"\n{video['label']}")
        name, proc = launch_generation(video, delay=i*3)
        procs.append((name, proc))

    print(f"\n{'=' * 60}")
    print(f"{len(procs)} generations launched")
    print(f"Logs in: {OUTPUT_DIR}")
    print(f"{'=' * 60}")

    # Save process list
    with open(os.path.join(OUTPUT_DIR, "processes.txt"), "w") as f:
        for name, proc in procs:
            f.write(f"{name}:{proc.pid}\n")

    print("Process IDs saved. Generations running in background.")

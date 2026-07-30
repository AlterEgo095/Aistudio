#!/bin/bash
# Test the full ffmpeg post-production pipeline with static segments
set -e
WORK=/home/z/my-project/tmp/ffmpeg-test
mkdir -p $WORK
cd $WORK

echo "=== Step 1: Create 3 static segment videos from keyframes ==="
for i in 1 2 3; do
  ffmpeg -y -loop 1 -i /home/z/my-project/tmp/video-work/job-1785333489420/keyframe-$i.png \
    -c:v libx264 -t 10 -pix_fmt yuv420p \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,fps=30,setsar=1" \
    -an -preset fast seg-$i.mp4 2>&1 | tail -1
done
ls -la seg-*.mp4

echo "=== Step 2: Concat with xfade transitions ==="
ffmpeg -y -i seg-1.mp4 -i seg-2.mp4 -i seg-3.mp4 \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=9.5[v1];[v1][2:v]xfade=transition=fade:duration=0.5:offset=19[vout]" \
  -map "[vout]" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p concat.mp4 2>&1 | tail -1
ls -la concat.mp4

echo "=== Step 3: Generate TTS voiceover via API ==="
curl -s -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"input":"Bienvenue dans ce voyage à travers le système solaire. Notre première étape est le Soleil, cette énorme étoile qui illumine notre quotidien. Ensuite, nous survolons Mars, la planète rouge, avec ses paysages désertiques. Enfin, nous atteignons Jupiter, la géante gazeuse, et ses célèbres tempêtes.","voice":"tongtong"}' \
  | python3 -c "import sys,json,base64; d=json.load(sys.stdin); open('voiceover.wav','wb').write(base64.b64decode(d['audioBase64'])); print('TTS generated:', len(d['audioBase64']), 'bytes b64')"
ls -la voiceover.wav

echo "=== Step 4: Create SRT subtitles ==="
cat > subtitles.srt << 'EOF'
1
00:00:00,000 --> 00:00:10,000
Bienvenue dans ce voyage à travers le système solaire.

2
00:00:10,000 --> 00:00:20,000
Notre première étape est le Soleil, cette énorme étoile qui illumine notre quotidien.

3
00:00:20,000 --> 00:00:30,000
Ensuite, nous survolons Mars, puis nous atteignons Jupiter, la géante gazeuse.
EOF
ls -la subtitles.srt

echo "=== Step 5: Compose final video with voiceover + subtitles + fade in/out ==="
ffmpeg -y -i concat.mp4 -i voiceover.wav \
  -vf "fade=t=in:st=0:d=0.5,fade=t=out:st=29.5:d=0.5,subtitles='subtitles.srt':force_style='FontName=DejaVu Sans,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=1,Alignment=2,MarginV=40'" \
  -map 0:v -map 1:a -c:a aac -b:a 192k -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -movflags +faststart \
  /home/z/my-project/public/videos/test-premium-30s.mp4 2>&1 | tail -3

echo "=== Final video ==="
ls -la /home/z/my-project/public/videos/test-premium-30s.mp4
ffprobe -v error -show_entries format=duration,size,bit_rate -of default=noprint_wrappers=1 /home/z/my-project/public/videos/test-premium-30s.mp4
echo "=== SUCCESS ==="

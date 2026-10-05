#!/bin/bash
# Assemble demo MP4 from REAL site captures: slow scroll clips + xfade.
set -e
FF=~/.local/bin/ffmpeg
FR=/home/kali/Documents/competitions/cropland-tabpfn-showdown/demo/frames
OUT=/home/kali/Documents/competitions/cropland-tabpfn-showdown/demo
# file:duration (scroll 6s window for tall pages, stills for 720p cards)
mkclip() {
  local img=$1 dur=$2 out=$3
  $FF -y -v error -loop 1 -framerate 25 -i "$FR/$img" \
    -vf "scale=1280:-2,crop=1280:720:x=0:y='min(max((t-1)/6,0),1)*max(in_h-720\,0)',setsar=1,format=yuv420p" \
    -t "$dur" -c:v libx264 -preset medium -crf 20 "$FR/$out"
}
mkclip 00_title.png 4 c0.mp4
mkclip 10_home.png 9 c1.mp4
mkclip 20_perf.png 10 c2.mp4
mkclip 30_carte.png 8 c3.mp4
mkclip 40_assistant.png 9 c4.mp4
mkclip 99_end.png 5 c5.mp4
# offsets: 3.5 12 21.5 29 37.5 — total 42.5s
$FF -y -v error \
  -i "$FR/c0.mp4" -i "$FR/c1.mp4" -i "$FR/c2.mp4" \
  -i "$FR/c3.mp4" -i "$FR/c4.mp4" -i "$FR/c5.mp4" \
  -filter_complex "[0][1]xfade=transition=fade:duration=0.5:offset=3.5[x1];[x1][2]xfade=transition=fade:duration=0.5:offset=12[x2];[x2][3]xfade=transition=fade:duration=0.5:offset=21.5[x3];[x3][4]xfade=transition=fade:duration=0.5:offset=29[x4];[x4][5]xfade=transition=fade:duration=0.5:offset=37.5,format=yuv420p[v]" \
  -map "[v]" -c:v libx264 -preset medium -crf 20 "$OUT/demo.mp4"
$FF -i "$OUT/demo.mp4" 2>&1 | grep Duration
ls -la "$OUT/demo.mp4"

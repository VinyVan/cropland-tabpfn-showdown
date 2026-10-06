#!/bin/bash
# Assemble LONG demo MP4 (~3 min): real captures, slow scroll, xfades.
set -e
FF=~/.local/bin/ffmpeg
FR=/home/kali/Documents/competitions/cropland-tabpfn-showdown/demo/frames
OUT=/home/kali/Documents/competitions/cropland-tabpfn-showdown/demo
mkclip() {
  local img=$1 dur=$2 out=$3
  $FF -y -v error -loop 1 -framerate 25 -i "$FR/$img" \
    -vf "scale=1280:-2,crop=1280:720:x=0:y='min(max((t-1)/8,0),1)*max(in_h-720\,0)',setsar=1,format=yuv420p" \
    -t "$dur" -c:v libx264 -preset medium -crf 20 "$FR/$out"
}
mkclip 00_title.png 6 long0.mp4
mkclip 10_home.png 24 long1.mp4
mkclip 12_demo.png 14 long2.mp4
mkclip 20_perf.png 36 long3.mp4
mkclip 22_methodes.png 14 long4.mp4
mkclip 24_pourquoi.png 14 long5.mp4
mkclip 30_carte.png 18 long6.mp4
mkclip 32_carte_tabpfn.png 12 long7.mp4
mkclip 34_carte_agree.png 12 long8.mp4
mkclip 40_assistant.png 30 long9.mp4
mkclip 99_end.png 8 long10.mp4
$FF -y -v error \
  -i "$FR/long0.mp4" -i "$FR/long1.mp4" -i "$FR/long2.mp4" \
  -i "$FR/long3.mp4" -i "$FR/long4.mp4" -i "$FR/long5.mp4" \
  -i "$FR/long6.mp4" -i "$FR/long7.mp4" -i "$FR/long8.mp4" \
  -i "$FR/long9.mp4" -i "$FR/long10.mp4" \
  -filter_complex "[0][1]xfade=transition=fade:duration=0.5:offset=5.5[a1];[a1][2]xfade=transition=fade:duration=0.5:offset=29[a2];[a2][3]xfade=transition=fade:duration=0.5:offset=42.5[a3];[a3][4]xfade=transition=fade:duration=0.5:offset=78[a4];[a4][5]xfade=transition=fade:duration=0.5:offset=91.5[a5];[a5][6]xfade=transition=fade:duration=0.5:offset=105[a6];[a6][7]xfade=transition=fade:duration=0.5:offset=122.5[a7];[a7][8]xfade=transition=fade:duration=0.5:offset=134[a8];[a8][9]xfade=transition=fade:duration=0.5:offset=145.5[a9];[a9][10]xfade=transition=fade:duration=0.5:offset=175,format=yuv420p[v]" \
  -map "[v]" -c:v libx264 -preset medium -crf 20 "$OUT/demo.mp4"
$FF -i "$OUT/demo.mp4" 2>&1 | grep Duration
ls -la "$OUT/demo.mp4"

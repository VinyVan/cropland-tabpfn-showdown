#!/bin/bash
# Assemble demo MP4: stills with slow zoom + xfade transitions.
set -e
FF=~/.local/bin/ffmpeg
FR=/home/kali/Documents/competitions/cropland-tabpfn-showdown/demo/frames
OUT=/home/kali/Documents/competitions/cropland-tabpfn-showdown/demo
IMGS="00_title.png 10_duel.png 20_local.png 30_map.png 40_chat.png 99_end.png"
i=0
for f in $IMGS; do
  $FF -y -v error -loop 1 -framerate 25 -i "$FR/$f" \
    -vf "scale=1280:720,zoompan=z='min(zoom+0.0004,1.02)':d=125:s=1280x720:fps=25,format=yuv420p,setsar=1" \
    -t 5 -c:v libx264 -preset medium -crf 20 "$FR/clip_$i.mp4"
  i=$((i+1))
done
# xfade chain: 6 clips x 5s, fade 0.5 -> offsets 4.5 9 13.5 18 22.5, total 27.5s
$FF -y -v error \
  -i "$FR/clip_0.mp4" -i "$FR/clip_1.mp4" -i "$FR/clip_2.mp4" \
  -i "$FR/clip_3.mp4" -i "$FR/clip_4.mp4" -i "$FR/clip_5.mp4" \
  -filter_complex "[0][1]xfade=transition=fade:duration=0.5:offset=4.5[x1];[x1][2]xfade=transition=fade:duration=0.5:offset=9[x2];[x2][3]xfade=transition=fade:duration=0.5:offset=13.5[x3];[x3][4]xfade=transition=fade:duration=0.5:offset=18[x4];[x4][5]xfade=transition=fade:duration=0.5:offset=22.5,format=yuv420p[v]" \
  -map "[v]" -c:v libx264 -preset medium -crf 20 "$OUT/demo.mp4"
$FF -v error -i "$OUT/demo.mp4" 2>&1 | grep Duration || \
  $FF -i "$OUT/demo.mp4" 2>&1 | grep Duration
ls -la "$OUT/demo.mp4"

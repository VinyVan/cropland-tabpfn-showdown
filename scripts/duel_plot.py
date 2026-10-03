"""Duel infographic: winner ensemble vs TabPFN-3.5 (FR, Sahel theme)."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

TABPFN = "#2D6A4F"
WINNER = "#B08945"
BG = "#FAF6EF"
INK = "#1B4332"

fig = plt.figure(figsize=(12, 8), facecolor=BG)
fig.suptitle("Duel : Ensemble gagnant vs TabPFN-3.5 — Cropland Mapping (Zindi GeoAI)",
             fontsize=14, fontweight="bold", color=INK, y=0.97)

ax1 = fig.add_subplot(2, 2, 1)
ax1.set_facecolor(BG)
cats = ["Public", "Privé"]
x = np.arange(len(cats))
tabpfn_lb = [0.8667, 0.8381]
winner_lb = [0.8278, 0.8262]
ax1.bar(x - 0.2, tabpfn_lb, 0.4, label="TabPFN-3.5", color=TABPFN)
ax1.bar(x + 0.2, winner_lb, 0.4, label="Winner ensemble", color=WINNER)
ax1.set_xticks(x, cats)
ax1.set_ylim(0.75, 0.90)
ax1.set_title("Officiel Zindi (accuracy) — TabPFN n.1", color=INK, fontweight="bold")
ax1.legend(frameon=False, fontsize=9)
for i, v in enumerate(tabpfn_lb):
    ax1.text(i - 0.2, v + 0.002, f"{v:.4f}", ha="center", fontsize=9, color=INK)
for i, v in enumerate(winner_lb):
    ax1.text(i + 0.2, v + 0.002, f"{v:.4f}", ha="center", fontsize=9, color=INK)

ax2 = fig.add_subplot(2, 2, 2)
ax2.set_facecolor(BG)
mets = ["Acc", "F1", "IoU"]
x = np.arange(len(mets))
tab_loc = [0.8851, 0.7752, 0.6431]
win_loc = [0.8801, 0.7666, 0.6299]
err = [0.0163, 0.0, 0.0]
ax2.bar(x - 0.2, tab_loc, 0.4, yerr=[0.0163, 0, 0], capsize=4,
        label="TabPFN-3.5", color=TABPFN)
ax2.bar(x + 0.2, win_loc, 0.4, yerr=[0.0178, 0, 0], capsize=4,
        label="Winner ensemble", color=WINNER)
ax2.set_xticks(x, mets)
ax2.set_ylim(0.5, 1.0)
ax2.set_title("Local GroupKFold-5 (acc ± std)", color=INK, fontweight="bold")
ax2.legend(frameon=False, fontsize=9)

ax3 = fig.add_subplot(2, 2, 3)
ax3.set_facecolor(BG)
t = ["Train / fold", "Inférence"]
x = np.arange(len(t))
ax3.bar(x - 0.2, [7.23, 6.798], 0.4, label="TabPFN-3.5", color=TABPFN)
ax3.bar(x + 0.2, [71.087, 0.04], 0.4, label="Winner ensemble", color=WINNER)
ax3.set_xticks(x, t)
ax3.set_yscale("log")
ax3.set_ylabel("secondes (log)")
ax3.set_title("Train 10x plus rapide", color=INK, fontweight="bold")
ax3.legend(frameon=False, fontsize=9)
for i, v in enumerate([7.23, 6.798]):
    ax3.text(i - 0.2, v * 1.15, f"{v}s", ha="center", fontsize=9, color=INK)
for i, v in enumerate([71.087, 0.04]):
    ax3.text(i + 0.2, v * 1.12, f"{v}s", ha="center", fontsize=9, color=INK)

ax4 = fig.add_subplot(2, 2, 4)
ax4.set_facecolor(BG)
ax4.axis("off")
ax4.text(0.5, 0.85, "Verdict", ha="center", fontsize=16, fontweight="bold", color=INK,
         transform=ax4.transAxes)
ax4.text(0.5, 0.62,
         "TabPFN gagne en précision\n(Zindi + CV locale, zéro tuning)",
         ha="center", fontsize=12, color=TABPFN, transform=ax4.transAxes)
ax4.text(0.5, 0.38,
         "Winner gagne en inférence\n(0.04s vs 6.8s, modèles locaux)",
         ha="center", fontsize=12, color=WINNER, transform=ax4.transAxes)
ax4.text(0.5, 0.12, "Meme protocole honnete | seed 32 | GroupKFold grid_id",
         ha="center", fontsize=9, style="italic", color=INK, transform=ax4.transAxes)

for ax in (ax1, ax2, ax3):
    ax.tick_params(colors=INK)
    for spine in ax.spines.values():
        spine.set_color("#D8CFB8")

fig.tight_layout(rect=(0, 0, 1, 0.93))
out = "/home/kali/Documents/competitions/cropland-tabpfn-showdown/demo/duel_winner_vs_tabpfn.png"
fig.savefig(out, dpi=150, facecolor=BG)
print("OK", out)

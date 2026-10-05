"""Demo video scenes (1280x720 PNGs): title, LB duel, local CV, map, chat, end."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

BASE = "/home/kali/Documents/competitions/cropland-tabpfn-showdown"
FR = f"{BASE}/demo/frames"
TABPFN = "#2D6A4F"
WINNER = "#B08945"
SIMPLE = "#8A8F98"
BG = "#FAF6EF"
INK = "#1B4332"

plt.rcParams.update({"figure.facecolor": BG, "axes.facecolor": BG,
                     "text.color": INK, "axes.labelcolor": INK,
                     "xtick.color": INK, "ytick.color": INK,
                     "font.size": 13})


def save(fig, name):
    fig.tight_layout()
    fig.savefig(f"{FR}/{name}", dpi=100, facecolor=BG)
    plt.close(fig)
    print("OK", name)


def scene_duel():
    fig, ax = plt.subplots(figsize=(12.8, 7.2))
    cats = ["Public", "Prive"]
    x = np.arange(2)
    ax.bar(x - 0.31, [0.8667, 0.8381], 0.12, label="TabPFN-3.5", color=TABPFN)
    ax.bar(x - 0.19, [0.8278, 0.8262], 0.12, label="Ensemble", color=WINNER)
    ax.bar(x - 0.06, [0.8444, 0.8286], 0.12, label="LGB seul", color="#C9A96A")
    ax.bar(x + 0.06, [0.8167, 0.8381], 0.12, label="CAT seul", color="#7A9E7E")
    ax.bar(x + 0.19, [0.8167, 0.8262], 0.12, label="XGB seul", color="#9DB4A0")
    ax.bar(x + 0.31, [0.8333, 0.8167], 0.12, label="Simple", color=SIMPLE)
    ax.set_xticks(x, cats)
    ax.set_ylim(0.78, 0.89)
    ax.set_title("Official Zindi duel (accuracy) — 6 submissions, TabPFN n.1 public",
                 fontsize=17, fontweight="bold", pad=14)
    ax.legend(frameon=False, fontsize=10, ncol=6, loc="lower center")
    offs = [-0.31, -0.19, -0.06, 0.06, 0.19, 0.31]
    vals = [[0.8667, 0.8381], [0.8278, 0.8262], [0.8444, 0.8286],
            [0.8167, 0.8381], [0.8167, 0.8262], [0.8333, 0.8167]]
    for i in range(2):
        for o, vv in zip(offs, vals):
            ax.text(i + o, vv[i] + 0.002, f"{vv[i]:.4f}", ha="center", fontsize=8)
    save(fig, "10_duel.png")


def scene_local():
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(12.8, 7.2))
    mets = ["Acc", "F1", "IoU"]
    x = np.arange(3)
    a1.bar(x - 0.25, [0.8851, 0.7752, 0.6431], 0.22, label="TabPFN-3.5", color=TABPFN)
    a1.bar(x, [0.8801, 0.7666, 0.6299], 0.22, label="Ensemble", color=WINNER)
    a1.bar(x + 0.25, [0.8772, 0.7731, 0.6374], 0.22, label="Simple", color=SIMPLE)
    a1.set_xticks(x, mets)
    a1.set_ylim(0.5, 1.0)
    a1.set_title("Local GroupKFold-5 CV", fontweight="bold")
    a1.legend(frameon=False, fontsize=10)
    a2.bar(["Ensemble\n71.1s", "TabPFN\n7.2s", "Simple\n4.8s"], [71.087, 7.23, 4.81],
           color=[WINNER, TABPFN, SIMPLE])
    a2.set_yscale("log")
    a2.set_title("Secondes / fold (log)", fontweight="bold")
    fig.suptitle("Meme protocole, seed 32 — TabPFN devant, sans tuning",
                 fontsize=15, fontweight="bold")
    save(fig, "20_local.png")


def scene_map():
    mp = pd.read_csv(f"{BASE}/data/processed/map_points.csv")
    fig, ax = plt.subplots(figsize=(12.8, 7.2))
    crop = mp[mp.pred_tabpfn == 1]
    nonc = mp[mp.pred_tabpfn == 0]
    ax.scatter(nonc.translated_lon, nonc.translated_lat, s=18, c="#D64545",
               alpha=0.7, label="Non-cropland (433)")
    ax.scatter(crop.translated_lon, crop.translated_lat, s=18, c=TABPFN,
               alpha=0.85, label="Cropland TabPFN (167)")
    ax.set_xlabel("longitude")
    ax.set_ylabel("latitude")
    ax.set_title("600 parcels Fergana + Orenburg — 544 unanimous, 56 disputed",
                 fontsize=16, fontweight="bold", pad=12)
    ax.legend(frameon=False, fontsize=11, loc="lower right")
    save(fig, "30_map.png")


from PIL import Image, ImageDraw, ImageFont


def scene_chat():
    W, H = 1280, 720
    img = Image.new("RGB", (W, H), tuple(int(BG[i:i+2], 16) for i in (1, 3, 5)))
    d = ImageDraw.Draw(img)
    fT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 30)
    fB = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)

    def center(y, txt, fnt, fill):
        bb = d.textbbox((0, 0), txt, font=fnt)
        d.text(((W - (bb[2] - bb[0])) / 2, y), txt, font=fnt, fill=fill)

    center(30, "Assistant Agri : chiffres reels, graphiques instantanes", fT,
           (27, 67, 50))
    # user bubble
    d.rounded_rectangle([140, 110, 1140, 170], radius=18, fill=(230, 225, 210))
    d.text((170, 128), "Compare les modeles : scores Zindi puis chiffres locaux.",
           font=fB, fill=(27, 67, 50))
    # agent bubble
    d.rounded_rectangle([140, 200, 1140, 560], radius=18, outline=(45, 106, 79), width=3)
    lines = [
        "Zindi officiel : TabPFN public 0.8667 / prive 0.8381",
        "Ensemble gagnant 0.8278 / 0.8262 — Simple 0.8333 / 0.8167",
        "",
        "CV locale : TabPFN acc 0.8851, F1 0.7752, IoU 0.6431",
        "Gagnant 0.8801 / 0.7666 / 0.6299 — Simple 0.8772 / 0.7731",
        "",
        "Train : 71.1s gagnant, 7.2s TabPFN, 4.8s simple.",
        "Verdict : TabPFN gagne en precision, sans tuning.",
    ]
    y = 225
    for ln in lines:
        d.text((175, y), ln, font=fB, fill=(27, 67, 50) if ln else (0, 0, 0))
        y += 42
    d.text((175, 600), "[graphiques : barres LB + duel acc/F1]",
           font=fB, fill=(176, 137, 69))
    img.save(f"{FR}/40_chat.png")
    print("OK 40_chat.png")


if __name__ == "__main__":
    scene_duel()
    scene_local()
    scene_map()

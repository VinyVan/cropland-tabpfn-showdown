"""Title + end cards for the showdown demo video (1280x720, Sahel theme)."""
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 720
BG = (250, 246, 239)
INK = (27, 67, 50)
ACCENT = (45, 106, 79)
GOLD = (176, 137, 69)
GRAY = (110, 110, 110)


def font(size, bold=False):
    path = "/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf" % ("-Bold" if bold else "")
    return ImageFont.truetype(path, size)


def centered(draw, y, text, fnt, fill):
    bbox = draw.textbbox((0, 0), text, font=fnt)
    draw.text(((W - (bbox[2] - bbox[0])) / 2, y), text, font=fnt, fill=fill)


def title_card(path):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 10], fill=ACCENT)
    d.rectangle([0, H - 10, W, H], fill=ACCENT)
    centered(d, 150, "CROPLAND SHOWDOWN", font(64, True), INK)
    centered(d, 250, "Gagnant Zindi vs TabPFN-3.5", font(36), ACCENT)
    centered(d, 350, "6 soumissions officielles - protocole honnête - chiffres réels",
             font(26), GRAY)
    centered(d, 430, "Zindi public 0.8667  |  CV locale 0.8851  |  10x plus rapide",
             font(30, True), GOLD)
    centered(d, 540, "PriorLabs Hackathon 3.5", font(24), GRAY)
    img.save(path)
    print("OK", path)


def end_card(path):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 10], fill=ACCENT)
    d.rectangle([0, H - 10, W, H], fill=ACCENT)
    centered(d, 170, "TabPFN-3.5 gagne : précision + vitesse,", font(40, True), INK)
    centered(d, 230, "zéro tuning, zéro feature engineering.", font(40, True), INK)
    centered(d, 340, "github.com/VinyVan/cropland-tabpfn-showdown", font(28), ACCENT)
    centered(d, 410, "Assistant Agri (LangGraph + AG-UI) - carte 600 parcelles - registre 6 modèles",
             font(24), GRAY)
    centered(d, 500, "Merci au jury Prior Labs", font(26), GOLD)
    img.save(path)
    print("OK", path)


if __name__ == "__main__":
    base = "/home/kali/Documents/competitions/cropland-tabpfn-showdown/demo/frames"
    title_card(f"{base}/00_title.png")
    end_card(f"{base}/99_end.png")

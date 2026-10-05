"""Demo screenshots via Playwright: full-page captures for scroll clips."""
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3001"
OUT = "/home/kali/Documents/competitions/cropland-tabpfn-showdown/demo/frames"

with sync_playwright() as p:
    b = p.chromium.launch(args=["--disable-gpu"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.goto(BASE + "/", wait_until="networkidle")
    pg.screenshot(path=f"{OUT}/10_home.png", full_page=True)
    print("home ok")
    pg.goto(BASE + "/performances", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    pg.screenshot(path=f"{OUT}/20_perf.png", full_page=True)
    print("perf ok")
    pg.goto(BASE + "/carte", wait_until="networkidle")
    pg.wait_for_timeout(4000)
    pg.screenshot(path=f"{OUT}/30_carte.png", full_page=True)
    print("carte ok")
    pg.goto(BASE + "/assistant", wait_until="networkidle")
    btns = pg.query_selector_all("button")
    clicked = False
    for btn in btns:
        if "Compare" in (btn.inner_text() or ""):
            btn.click()
            clicked = True
            break
    print("chip clicked:", clicked)
    pg.wait_for_timeout(15000)
    pg.screenshot(path=f"{OUT}/40_assistant.png", full_page=True)
    print("assistant ok")
    b.close()
print("ALL DONE")

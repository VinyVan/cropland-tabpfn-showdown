"""Demo screenshots via Playwright (system chromium): real site footage."""
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3001"
OUT = "/home/kali/Documents/competitions/cropland-tabpfn-showdown/demo/frames"

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/chromium",
                          args=["--disable-gpu", "--no-sandbox"])
    ctx = b.new_context(viewport={"width": 1280, "height": 720})
    ctx.add_init_script(
        "localStorage.setItem('lang','en');"
        "localStorage.setItem('agri-chat-seen','1');"
    )
    pg = ctx.new_page()
    pg.goto(BASE + "/", wait_until="load", timeout=45000)
    pg.wait_for_timeout(3000)
    pg.screenshot(path=f"{OUT}/10_home.png", full_page=True)
    print("home ok", flush=True)
    pg.goto(BASE + "/performances", wait_until="load", timeout=45000)
    pg.wait_for_timeout(3000)
    pg.screenshot(path=f"{OUT}/20_perf.png", full_page=True)
    print("perf ok", flush=True)
    pg.goto(BASE + "/carte", wait_until="load", timeout=45000)
    pg.wait_for_timeout(5000)
    pg.screenshot(path=f"{OUT}/30_carte.png", full_page=True)
    print("carte ok", flush=True)
    pg.goto(BASE + "/assistant", wait_until="load", timeout=45000)
    pg.wait_for_timeout(2000)
    btns = pg.query_selector_all("button")
    clicked = False
    for btn in btns:
        if "Compare" in (btn.inner_text() or ""):
            btn.click()
            clicked = True
            break
    print("chip clicked:", clicked, flush=True)
    pg.wait_for_timeout(20000)
    pg.screenshot(path=f"{OUT}/40_assistant.png", full_page=True)
    print("assistant ok", flush=True)
    b.close()
print("ALL DONE", flush=True)

"""Extended demo shots: all pages + interactions for the 3-min cut."""
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

    def shot(url, name, wait=3000):
        pg.goto(BASE + url, wait_until="load", timeout=45000)
        pg.wait_for_timeout(wait)
        pg.screenshot(path=f"{OUT}/{name}", full_page=True)
        print(name, "ok", flush=True)

    shot("/", "10_home.png")
    # home: run a live TabPFN prediction for the gauge shot
    btns = pg.query_selector_all("button")
    for btn in btns:
        if "Predict" in (btn.inner_text() or "") and "tabpfn" in (btn.inner_text() or ""):
            btn.click()
            break
    pg.wait_for_timeout(25000)
    pg.screenshot(path=f"{OUT}/12_demo.png", full_page=True)
    print("12_demo ok", flush=True)

    shot("/performances", "20_perf.png", 3000)
    shot("/methodes", "22_methodes.png", 2500)
    shot("/pourquoi-tabpfn", "24_pourquoi.png", 2500)

    pg.goto(BASE + "/carte", wait_until="load", timeout=45000)
    pg.wait_for_timeout(5000)
    pg.screenshot(path=f"{OUT}/30_carte.png", full_page=True)
    print("30_carte ok", flush=True)
    sel = pg.query_selector("select")
    if sel:
        sel.select_option("tabpfn")
        pg.wait_for_timeout(2500)
        pg.screenshot(path=f"{OUT}/32_carte_tabpfn.png")
        print("32_carte_tabpfn ok", flush=True)
        sel.select_option("agreement")
        pg.wait_for_timeout(2500)
        pg.screenshot(path=f"{OUT}/34_carte_agree.png")
        print("34_carte_agree ok", flush=True)

    pg.goto(BASE + "/assistant", wait_until="load", timeout=45000)
    pg.wait_for_timeout(2000)
    for btn in pg.query_selector_all("button"):
        if "Compare" in (btn.inner_text() or ""):
            btn.click()
            break
    pg.wait_for_timeout(15000)
    pg.screenshot(path=f"{OUT}/40_assistant.png", full_page=True)
    print("40_assistant ok", flush=True)
    b.close()
print("ALL DONE", flush=True)

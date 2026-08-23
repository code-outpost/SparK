import json, os, base64, subprocess, time, websocket, urllib.request

ROOT = r"E:/Downloads/SparK-main"
WORK = os.path.join(ROOT, "_work_20260823")
OUT = os.path.join(WORK, "out")
os.makedirs(OUT, exist_ok=True)
CHROME = r"C:/Program Files/Google/Chrome/Application/chrome.exe"
PORT = 9333
URL = "file://" + os.path.join(ROOT, "index.html").replace("\\", "/")

EXPORT_JS = open(os.path.join(WORK, "_export.js"), encoding="utf-8").read()
TPLS = ["classic","modern","elegant","creative","timeline","minimalist","left-right","swiss","editorial"]

def http_get(url):
    return json.loads(urllib.request.urlopen(url, timeout=10).read().decode())

def launch_chrome():
    args = [CHROME,
        f"--remote-debugging-port={PORT}",
        "--remote-allow-origins=*",
        "--headless=new", "--no-sandbox", "--disable-gpu",
        "--disable-dev-shm-usage", "--hide-scrollbars",
        "--force-color-profile=srgb",
        f"--user-data-dir={os.path.join(WORK,'chrome_profile')}",
        "--window-size=1000,1400"]
    p = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(40):
        try:
            v = http_get(f"http://127.0.0.1:{PORT}/json/version")
            return p, v["webSocketDebuggerUrl"]
        except Exception:
            time.sleep(0.5)
    raise SystemExit("chrome did not start")

class CDP:
    def __init__(self, ws, session_id=None):
        self.ws = ws
        self.session_id = session_id
        self.id = 0
    def send(self, method, params=None, timeout=300):
        self.id += 1
        msg = {"id": self.id, "method": method, "params": params or {}}
        if self.session_id:
            msg["sessionId"] = self.session_id
        self.ws.send(json.dumps(msg))
        while True:
            r = json.loads(self.ws.recv())
            if r.get("id") == self.id:
                if "error" in r:
                    raise Exception(str(r["error"]))
                return r.get("result")
    def eval(self, expr, timeout=240):
        return self.send("Runtime.evaluate", {
            "expression": expr,
            "awaitPromise": True,
            "returnByValue": True,
            "timeout": timeout * 1000
        }, timeout=timeout)

def wait_ready(cdp):
    for _ in range(60):
        try:
            r = cdp.eval("document.readyState==='complete' && !!window.SparKResume && !!window.RESUME_TEMPLATES")
            if r.get("result", {}).get("value"):
                return True
        except Exception:
            pass
        time.sleep(1)
    return False

def main():
    proc, bws_url = launch_chrome()
    bws = websocket.create_connection(bws_url, timeout=300)
    def bsend(method, params=None):
        return CDP(bws).send(method, params)
    # open a page target and attach
    tid = bsend("Target.createTarget", {"url": URL})["targetId"]
    session = bsend("Target.attachToTarget", {"targetId": tid, "flatten": True})["sessionId"]
    cdp = CDP(bws, session)
    cdp.send("Page.enable")
    cdp.send("Runtime.enable")
    print("page attached, waiting for app load...")
    if not wait_ready(cdp):
        print("WARN: app not ready")
    summary = []
    for tpl in TPLS:
        cdp.eval(f"window.__TPL={json.dumps(tpl)}")
        print(f"\n=== {tpl} ===")
        res = cdp.eval(EXPORT_JS).get("result", {}).get("value")
        if not res or res.get("error"):
            print("  ERROR:", res.get("error") if res else "no value")
            summary.append((tpl, "ERROR", str(res)))
            continue
        uri = res["dataUri"]
        b64 = uri.split(",", 1)[1]
        pdf_path = os.path.join(OUT, f"{tpl}.pdf")
        with open(pdf_path, "wb") as f:
            f.write(base64.b64decode(b64))
        expected = round(res["ch"] / 2245 + 0.49) or 1
        flag = ""
        if res["pageCount"] < expected:
            flag = " <-- 页数不足(疑似截断)"
        if res["h"] < res["pageScrollH"] - 5:
            flag += f" h({res['h']})<content({res['pageScrollH']})"
        print(f"  holder h={res['h']} contentH={res['pageScrollH']} scaleH={res['scaleScrollH']} "
              f"canvas={res['cw']}x{res['ch']} pages={res['pageCount']} expected~{expected}{flag}")
        summary.append((tpl, res["pageCount"], expected, res["h"], res["pageScrollH"], flag, pdf_path))
    try:
        import pymupdf
        for tpl in TPLS:
            pdf_path = os.path.join(OUT, f"{tpl}.pdf")
            if not os.path.exists(pdf_path):
                continue
            doc = pymupdf.open(pdf_path)
            for pi in range(doc.page_count):
                pix = doc[pi].get_pixmap(dpi=110)
                pix.save(os.path.join(OUT, f"{tpl}_p{pi+1}.png"))
            doc.close()
        print("\nPNG rendered.")
    except Exception as e:
        print("pymupdf render failed:", e)
    print("\nSUMMARY:")
    for s in summary:
        print(" ", s)
    proc.terminate()

if __name__ == "__main__":
    main()

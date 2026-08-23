import json, os, subprocess, time, websocket, urllib.request

ROOT = r"E:/Downloads/SparK-main"
CHROME = r"C:/Program Files/Google/Chrome/Application/chrome.exe"
PORT = 9337
URL = "file://" + os.path.join(ROOT, "index.html").replace("\\", "/")

args = [CHROME, f"--remote-debugging-port={PORT}", "--remote-allow-origins=*",
        "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
        "--hide-scrollbars", "--force-color-profile=srgb",
        f"--user-data-dir={os.path.join(ROOT,'_work_20260823/chrome_profile_wx2')}",
        "--window-size=1000,1400"]
proc = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(3)
for _ in range(20):
    try:
        v = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/version", timeout=5).read().decode())
        bws = v["webSocketDebuggerUrl"]; break
    except Exception:
        time.sleep(0.5)
else:
    raise SystemExit("chrome no")
bws = websocket.create_connection(bws, timeout=120)

def bsend(m, p=None):
    cid = 1; bws.send(json.dumps({"id": cid, "method": m, "params": p or {}}))
    while True:
        r = json.loads(bws.recv())
        if r.get("id") == cid:
            return r.get("result")

tid = bsend("Target.createTarget", {"url": URL})["targetId"]
sess = bsend("Target.attachToTarget", {"targetId": tid, "flatten": True})["sessionId"]

class CDP:
    def __init__(self, ws, sid):
        self.ws = ws; self.sid = sid; self.id = 0
    def send(self, m, p=None):
        self.id += 1
        msg = {"id": self.id, "method": m, "params": p or {}}
        if self.sid: msg["sessionId"] = self.sid
        self.ws.send(json.dumps(msg))
        while True:
            r = json.loads(self.ws.recv())
            if r.get("id") == self.id:
                if "error" in r: raise Exception(str(r["error"]))
                return r.get("result")
    def eval(self, e):
        return self.send("Runtime.evaluate", {"expression": e, "awaitPromise": True,
                                              "returnByValue": True, "timeout": 60000})

cdp = CDP(bws, sess)
cdp.send("Page.enable"); cdp.send("Runtime.enable")
for _ in range(40):
    r = cdp.eval("document.readyState==='complete' && !!document.getElementById('weather') && typeof renderWeather==='function'")
    if r.get("result", {}).get("value"):
        break
    time.sleep(1)

# 绕过定位，直接跑真实 fetch + renderWeather（验证 API+CORS+渲染）
r = cdp.eval(r"""
(async () => {
  try {
    // 请把下面 KEY 替换为你自己的和风天气 Web API 密钥
    const KEY='YOUR_QWEATHER_KEY_HERE';
    const loc='121.3219,31.1565';
    let g;
    try {
      g = await fetch('https://geoapi.qweather.com/v2/city/lookup?location='+encodeURIComponent(loc)+'&key='+KEY).then(r=>{ if(!r.ok) throw new Error('geo http '+r.status); return r.json(); });
    } catch(e) { return 'GEO_ERR:'+e.message; }
    if(String(g.code)!=='200'||!g.location||!g.location[0]) return 'GEO_FAIL:'+JSON.stringify(g).slice(0,300);
    const city=g.location[0];
    let w;
    try {
      w = await fetch('https://devapi.qweather.com/v7/weather/now?location='+encodeURIComponent(city.id)+'&key='+KEY).then(r=>{ if(!r.ok) throw new Error('wx http '+r.status); return r.json(); });
    } catch(e) { return 'WX_ERR:'+e.message; }
    if(String(w.code)!=='200'||!w.now) return 'WX_FAIL:'+JSON.stringify(w).slice(0,300);
    const now=w.now;
    return 'OK city='+city.name+' temp='+now.temp+' text='+now.text+' wind='+now.windDir+' hum='+now.humidity;
  } catch(e) {
    return 'EXC:'+e.message+' | '+(e.stack||'').slice(0,200);
  }
})()
""")
val = r.get("result", {}).get("value")
print("RESULT:", val)
proc.terminate()

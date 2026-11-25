"""Local DJ-IQ prototype server; browser owns audio playback."""
import json
import os
import sqlite3
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from providers import plan

ROOT=Path(__file__).resolve().parent
PORT=8765
ORIGIN=f"http://127.0.0.1:{PORT}"
THEMES={"custom","dark","light","ocean","midnight","plum","sand"}
def db():
    folder=Path.home()/ "Library"/"Application Support"/"DJ-IQ"
    folder.mkdir(parents=True,exist_ok=True,mode=0o700)
    conn=sqlite3.connect(folder/"settings.sqlite")
    conn.execute("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY,value TEXT)")
    return conn

class Handler(BaseHTTPRequestHandler):
    def allowed(self):
        return self.headers.get("Host")==f"127.0.0.1:{PORT}"
    def send_data(self,status,data,mime="application/json"):
        self.send_response(status)
        self.send_header("Content-Type",mime)
        self.send_header("Content-Length",str(len(data)))
        self.send_header("Cache-Control","no-store")
        self.send_header("X-Content-Type-Options","nosniff")
        self.send_header("Content-Security-Policy","default-src 'self'; media-src blob:; frame-ancestors 'none'; object-src 'none'")
        self.end_headers()
        self.wfile.write(data)
    def reply(self,status,obj):
        self.send_data(status,json.dumps(obj).encode())
    def do_GET(self):
        if not self.allowed(): return self.reply(403,{"error":"Use local address"})
        assets={"/":("index.html","text/html"),"/style.css":("style.css","text/css"),"/app.js":("app.js","text/javascript"),"/analysis.js":("analysis.js","text/javascript"),"/analysis-worker.js":("analysis-worker.js","text/javascript")}
        if self.path in assets:
            name,mime=assets[self.path]
            return self.send_data(200,(ROOT/"web"/name).read_bytes(),mime)
        if self.path=="/api/settings":
            with db() as conn:
                row=conn.execute("SELECT value FROM settings WHERE key='theme'").fetchone()
            return self.reply(200,{"theme":row[0] if row else "custom"})
        return self.reply(404,{"error":"Not found"})
    def do_POST(self):
        if not self.allowed() or self.headers.get("Origin")!=ORIGIN or self.headers.get("Content-Type")!="application/json":
            return self.reply(403,{"error":"Local JSON request required"})
        try:
            length=int(self.headers.get("Content-Length","0"))
            if not 0<length<=16384: raise ValueError("Invalid body length")
            data=json.loads(self.rfile.read(length))
            if self.path=="/api/settings":
                theme=data["theme"]
                if theme not in THEMES: raise ValueError("Invalid theme")
                with db() as conn: conn.execute("INSERT OR REPLACE INTO settings VALUES ('theme',?)",(theme,))
                return self.reply(200,{"theme":theme})
            if self.path=="/api/plan":
                # Remote destinations are configured by the operator, not arbitrary web requests.
                provider=data["provider"]
                endpoint={"ollama":"http://127.0.0.1:11434","anthropic":"https://api.anthropic.com","remote-ollama":os.getenv("DJIQ_REMOTE_URL",""),"openai-compatible":os.getenv("DJIQ_OPENAI_URL",""),"offline":""}[provider]
                return self.reply(200,{"advice":plan(provider,endpoint,str(data.get("model","qwen3:8b"))[:200],str(data["prompt"])[:4000])})
            return self.reply(404,{"error":"Not found"})
        except (ValueError,KeyError,TypeError):
            return self.reply(400,{"error":"Invalid settings or provider configuration"})
        except Exception:
            return self.reply(502,{"error":"Provider unavailable; audio is unaffected"})

if __name__=="__main__":
    os.umask(0o077)
    print(ORIGIN,flush=True)
    ThreadingHTTPServer(("127.0.0.1",PORT),Handler).serve_forever()

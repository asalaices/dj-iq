"""Advisory provider interface. No audio or shell execution."""
import json
import os
import urllib.request
from urllib.parse import urlsplit

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

def plan(provider, endpoint, model, prompt):
    if provider == "offline":
        return "Preview: cue next track, match tempo manually, then blend with the crossfader."
    u = urlsplit(endpoint)
    if u.username or u.password or u.query or u.fragment:
        raise ValueError("Endpoint must be a plain base URL")
    if provider == "ollama":
        if u.scheme != "http" or u.hostname not in ("localhost", "127.0.0.1"):
            raise ValueError("Local Ollama must use loopback HTTP")
    elif provider in ("remote-ollama", "anthropic", "openai-compatible"):
        if u.scheme != "https" or not u.hostname:
            raise ValueError("Remote providers require HTTPS")
    else:
        raise ValueError("Unsupported provider")
    endpoint = endpoint.rstrip("/")
    system = "You are a DJ planning assistant. Give a concise advisory transition suggestion. Do not claim execution."
    headers = {"Content-Type":"application/json"}
    key = os.getenv("DJIQ_API_KEY")
    if provider in ("ollama", "remote-ollama"):
        path = "/api/chat"
        payload = {"model":model,"stream":False,"messages":[{"role":"system","content":system},{"role":"user","content":prompt}],"options":{"num_ctx":4096,"num_predict":256},"think":False}
        if provider == "remote-ollama":
            if not key: raise ValueError("DJIQ_API_KEY required")
            headers["Authorization"] = "Bearer "+key
    elif provider == "anthropic":
        key = os.getenv("DJIQ_ANTHROPIC_KEY")
        if not key: raise ValueError("DJIQ_ANTHROPIC_KEY required")
        if endpoint != "https://api.anthropic.com": raise ValueError("Use the official Anthropic endpoint")
        path = "/v1/messages"
        headers.update({"x-api-key":key,"anthropic-version":"2023-06-01"})
        payload={"model":model,"max_tokens":256,"system":system,"messages":[{"role":"user","content":prompt}]}
    else:
        path = "/chat/completions"
        if key: headers["Authorization"]="Bearer "+key
        payload={"model":model,"max_tokens":256,"messages":[{"role":"system","content":system},{"role":"user","content":prompt}]}
    req=urllib.request.Request(endpoint+path,data=json.dumps(payload).encode(),headers=headers)
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect())
    with opener.open(req,timeout=20) as response:
        raw=response.read(262145)
    if len(raw)>262144: raise ValueError("Response too large")
    result=json.loads(raw)
    if provider in ("ollama","remote-ollama"): return result["message"]["content"]
    if provider=="anthropic": return " ".join(x["text"] for x in result["content"] if x["type"]=="text")
    return result["choices"][0]["message"]["content"]

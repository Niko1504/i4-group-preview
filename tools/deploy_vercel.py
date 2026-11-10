#!/usr/bin/env python3
"""Деплой khidi-lab (и других статик-проектов) на Vercel через API.
Токен берётся из ~/.hermes/credentials/vercel/vercel.env, в вывод не печатается.
Использование: python3 deploy_vercel.py [khidi-lab|tbilisi-deal-day]
"""
import base64, json, os, sys, time, urllib.request, urllib.error

ENV = os.path.expanduser("~/.hermes/credentials/vercel/vercel.env")
TEAM = "team_1lRhG5UkoonfR74UvLGbmVUh"

TARGETS = {
    "i4-group": {
        "proj": "prj_2LKo8NtgmK1fVXk5Zy5HgPwRJVzf",
        "root": "/Users/georgiacars/projects/jarvis-projects/Projects/Unicorns/i4-group",
    },
    "tbilisi-deal-day": {
        "proj": "prj_gCisU5JOO8QZwL2u6xsQ92SgHnj3",
        "root": "/Users/georgiacars/projects/tbilisi-deal-day",
    },
}


def token():
    if not os.path.exists(ENV):
        sys.exit("нет файла с токеном")
    for line in open(ENV):
        line = line.strip()
        if line.startswith("export "):
            line = line[7:]
        if line.startswith("VERCEL_TOKEN="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("в файле нет VERCEL_TOKEN")


TOKEN = token()


def api(path, method="GET", body=None):
    req = urllib.request.Request("https://api.vercel.com" + path,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 method=method)
    req.add_header("Authorization", "Bearer " + TOKEN)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt else {}
    except urllib.error.HTTPError as e:
        return {"error": e.code, "detail": e.read().decode()[:500]}


def main():
    name = sys.argv[1] if len(sys.argv) > 1 else "i4-group"
    t = TARGETS[name]
    root, proj = t["root"], t["proj"]

    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in (".git", ".vercel", "node_modules", "tools")]
        for fn in filenames:
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, root)
            try:
                files.append({"file": rel, "data": open(full, "r", encoding="utf-8").read()})
            except UnicodeDecodeError:
                files.append({"file": rel, "data": base64.b64encode(open(full, "rb").read()).decode(),
                              "encoding": "base64"})
    print("файлов:", len(files))

    d = api(f"/v13/deployments?teamId={TEAM}&forceNew=1", "POST",
            {"name": name, "project": proj, "target": "production",
             "files": files, "projectSettings": {"framework": None}})
    if "error" in d:
        sys.exit(f"ошибка деплоя: {d}")
    did = d["id"]
    for _ in range(60):
        time.sleep(4)
        s = api(f"/v13/deployments/{did}?teamId={TEAM}")
        st = s.get("readyState") or s.get("status")
        if st in ("READY", "ERROR", "CANCELED"):
            print("состояние:", st, "| ссылки:", [a for a in (s.get("alias") or [])][:2])
            if st != "READY":
                print(json.dumps(s)[:800])
                sys.exit(1)
            return
    print("деплой не завершился за отведённое время")


if __name__ == "__main__":
    main()

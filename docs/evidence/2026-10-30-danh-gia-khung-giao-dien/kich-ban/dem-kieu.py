import json
from playwright.sync_api import sync_playwright
BASE="http://localhost:8795"
tk={t["bo"].split("+")[0]:t for t in reversed(json.load(open("/tmp/ux/tai-khoan.json"))["taiKhoan"])}
ID=json.load(open("/tmp/ux/id.json"))
JS="""(() => { const vis=e=>{const r=e.getBoundingClientRect(), s=getComputedStyle(e); return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&r.top<innerHeight*3;};
 const fs=new Set(), fw=new Set(), col=new Set(), nut=new Set();
 for (const el of document.querySelectorAll('body *')) { if(!vis(el)) continue; if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())) continue; const s=getComputedStyle(el); fs.add(s.fontSize); fw.add(s.fontWeight); col.add(s.color); }
 for (const b of document.querySelectorAll('button, a.btn, a.nut, .btn, [role=button]')) { if(!vis(b)) continue; const s=getComputedStyle(b); nut.add([s.backgroundColor, s.color, s.borderTopWidth+' '+s.borderTopColor, Math.round(b.getBoundingClientRect().height), s.borderRadius, s.fontWeight, s.textDecorationLine].join('|')); }
 return {coChu:[...fs].sort((a,b)=>parseFloat(a)-parseFloat(b)), doDam:[...fw].sort(), mauChu:col.size, kieuNut:nut.size}; })()"""
with sync_playwright() as pw:
    br=pw.chromium.launch(args=["--no-sandbox"]); t=tk["ADMIN"]; ctx=br.new_context(viewport={"width":1440,"height":900})
    ctx.request.post(BASE+"/api/auth/login",data=json.dumps({"phone":t["sdt"],"pin":t["pin"],"turnstileToken":"X"}),headers={"Origin":BASE,"Content-Type":"application/json"})
    pg=ctx.new_page()
    for p in ["/","/orders","/order?id="+ID["order"],"/order-form","/hoa-hong","/catalog","/staff","/dieu-phoi","/account"]:
        pg.goto(BASE+p,wait_until="load"); pg.wait_for_timeout(1200); r=pg.evaluate(JS)
        print(f"{p.split('?')[0]:14} cỡ chữ {len(r['coChu'])} ({', '.join(x.replace('px','') for x in r['coChu'])}) · độ đậm {r['doDam']} · màu chữ {r['mauChu']} · kiểu nút {r['kieuNut']}")
    br.close()

import json,sys,re
an=json.load(open(sys.argv[1]));rules=json.load(open(sys.argv[2]));pm=json.load(open(sys.argv[3]))
tok=an['tok']
def resolve(v,d=0):
    if d>10: return v
    v=re.sub(r'var\((--[\w-]+)(?:,[^)]*)?\)',lambda m:resolve(tok.get(m.group(1),m.group(0)),d+1),v)
    v=re.sub(r'(?<![\w.])(\d*\.?\d+)rem\b',lambda m:('%g'%(float(m.group(1))*16))+'px',v)
    return v.replace('max(16px, 16px)','16px')
KEYP=['height','min-height','border-radius','font-size','font-weight','background','background-color','padding','border','box-shadow','color']
fam=an['fam']
# page lookup via fam members
mem2fam={m:f for f,v in fam.items() for m in v['members']}
for c in sys.argv[4].split(','):
    d={};ls=[];ctxl=[]
    for ln,sel,body,ctx in rules:
        parts=[p.strip() for p in sel.split(',')]
        if any(re.fullmatch(r'[a-z]*\.'+re.escape(c),p) for p in parts):
            if ctx: ctxl.append(ln); continue
            ls.append(ln)
            for decl in body.split(';'):
                if ':' not in decl: continue
                p,v=decl.split(':',1);p=p.strip();v=' '.join(v.split())
                if p in KEYP: d[p]=v
    f=mem2fam.get(c);pg=fam[f]['pages'] if f else '?'
    out=' '.join(f"{k}={resolve(v)[:40]}" for k,v in d.items())
    print(f".{c} L{ls[:3]} | {out} | pages={len(pg) if isinstance(pg,list) else pg}:{','.join(pg[:4]) if isinstance(pg,list) and len(pg)<=4 else ''}")

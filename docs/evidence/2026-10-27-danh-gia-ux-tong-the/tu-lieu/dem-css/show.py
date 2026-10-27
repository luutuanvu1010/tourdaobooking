import json,sys
r=json.load(open(sys.argv[1]))
cat=sys.argv[2]
def short(f): return f.replace('web/','').replace('public/','')
for f,v in sorted(r.items(),key=lambda x:x[1]['line']):
    if v['cat']!=cat: continue
    p=v['props']
    pp=' '.join(f"{k[:6]}={p[k][:28]}" for k in ('min-height','height','border-radius','font-size','background','padding') if k in p)
    print(f"{v['line']}\t.{v['root']}{'' if v['exists'] else '*'}\tn={v['n_members']}\tu={len(v['used'])}\t{pp}\t[{', '.join(short(x) for x in v['used'][:5])}{'…' if len(v['used'])>5 else ''}]")

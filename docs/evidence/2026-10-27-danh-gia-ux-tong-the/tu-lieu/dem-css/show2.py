import json,sys
d=json.load(open(sys.argv[1]))['fam']
cats=sys.argv[2].split(',')
onlych=len(sys.argv)>3
for f,v in sorted(d.items(),key=lambda x:x[1]['line']):
    if v['cat'] not in cats: continue
    if onlych and v['chrome']<2: continue
    p=v['props'];x=v['px']
    def g(k): return x.get(k,'')
    bg=p.get('background',p.get('background-color',''))
    bg=bg.replace('var(','').replace(')','')
    h=g('min-height') or g('height')
    pg=v['pages']
    pages=(','.join(pg) if len(pg)<=4 else f"{len(pg)} trang") or ('(động) '+','.join(v['dynpages'][:3]) if v['dynpages'] else '—')
    print(f"{v['cat']}|.{v['root']}|{v['line']}|ch{v['chrome']}|n{v['n']}|h={h}|r={g('border-radius')}|fs={g('font-size')}|bg={bg[:26]}|pad={g('padding')[:22]}|{pages}")

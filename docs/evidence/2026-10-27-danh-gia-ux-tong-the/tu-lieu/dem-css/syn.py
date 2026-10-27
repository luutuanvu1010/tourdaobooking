import json,sys,re,collections
an=json.load(open(sys.argv[1]));tok=an['tok']
def resolve(v,d=0):
    if d>10: return v
    v=re.sub(r'var\((--[\w-]+)(?:,[^)]*)?\)',lambda m:resolve(tok.get(m.group(1),m.group(0)),d+1),v)
    v=re.sub(r'(?<![\w.])(\d*\.?\d+)rem\b',lambda m:('%g'%(float(m.group(1))*16))+'px',v)
    return v.replace('max(16px, 16px)','16px')
groups={'cỡ chữ':lambda n:n.startswith('--fs'),'bo góc':lambda n:'radius' in n,
 'chiều cao (--h-*, --tap-min, --counter-btn, --row-h, --day-pill-h, --home-pill-h, --search-h)':lambda n:n.startswith('--h-') or n in('--tap-min','--counter-btn','--row-h','--day-pill-h','--home-pill-h','--search-h','--counter-field','--bar-h','--tabbar-h'),
 'độ đậm':lambda n:n.startswith('--fw'),
 'khoảng cách (--s*, --gap-*, --pad-*)':lambda n:re.match(r'--s\d$',n) or n.startswith('--gap') or n.startswith('--pad')}
print('TOTAL tokens in :root (26-558):',len(tok))
for g,f in groups.items():
    names=[n for n in tok if f(n)]
    byv=collections.defaultdict(list)
    for n in names: byv[resolve(tok[n])].append(n)
    syn=sum(len(v)-1 for v in byv.values() if len(v)>1)
    print(f'## {g}: {len(names)} token -> {len(byv)} giá trị khác nhau; {syn} token là tên trùng giá trị')
    for v,ns in sorted(byv.items(),key=lambda x:x[0]):
        print(f'   {v}: {len(ns)} — {" ".join(ns)}')

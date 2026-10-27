import json,sys,re,collections
css=open(sys.argv[1]).read().split('\n')
fam=json.load(open(sys.argv[2]))['fam']
WAVE=re.compile(r'Đợt|bản vẽ|Claude Design|thiết kế lại|\.dc\.html|\b1\.\d\d\b|\bv1\.\d|\bPR \d|\d{1,2}/\d{1,2}|20\d\d-\d\d-\d\d|Gói|lượt \d|vòng sửa|góp ý|ảnh phác|mockup|Thị giác',re.I)
# section starts: lines beginning with '/* ----------' (major sections) after line 558
heads=[i+1 for i,l in enumerate(css) if i+1>558 and l.startswith('/* ----------')]
heads.append(len(css)+1)
rows=[]
for a,b in zip(heads,heads[1:]):
    t=css[a-1]
    title=re.sub(r'^/\* -+\s*','',t)[:150]
    inreg=[v for v in fam.values() if a<=v['line']<b]
    c=collections.Counter(v['cat'] for v in inreg)
    sub=[i+1 for i in range(a-1,b-1) if css[i].startswith('/*')]
    wave=bool(WAVE.search(' '.join(css[i-1] for i in sub)))
    rows.append((a,b-1,wave,title,dict(c),[ '.'+v['root'] for v in sorted(inreg,key=lambda v:v['line']) if v['cat'] in('button','tab','card','header') and v['chrome']>=1][:8]))
nw=0
for r in rows:
    if r[2]: nw+=1
    print(f"{r[0]}-{r[1]}|{'ĐỢT' if r[2] else '   '}|{r[3]}|{r[4]}|{' '.join(r[5])}")
print('sections',len(rows),'wave-tagged',nw)
# also count all comment lines mentioning wave keywords outside root
print('comment lines w/ wave kw (>558):',sum(1 for i,l in enumerate(css) if i+1>558 and '/*' in l and WAVE.search(l)))

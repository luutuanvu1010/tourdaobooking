import re,sys,json,collections
src=open(sys.argv[1]).read().split('\n')
rules=json.load(open(sys.argv[2]))
# hardcoded literal counting outside :root (lines 26-558 excluded), comments stripped
txt=open(sys.argv[1]).read()
nocom=re.sub(r'/\*.*?\*/',lambda m:re.sub(r'[^\n]',' ',m.group(0)),txt,flags=re.S).split('\n')
buckets=collections.OrderedDict()
edges=[(1,25),(559,874),(875,1500),(1501,2000),(2001,2500),(2501,3000),(3001,3500),(3501,3905)]
tot=collections.Counter()
detail=collections.defaultdict(collections.Counter)
for a,b in edges:
    c=collections.Counter()
    for i in range(a,b+1):
        l=nocom[i-1]
        # skip custom-property declarations inside nested :root
        l2=re.sub(r'--[\w-]+\s*:[^;]*;','',l) if ':root' in l else l
        # drop var(...) fallbacks? keep
        l2=re.sub(r'url\([^)]*\)','',l2)
        for m in re.finditer(r'#[0-9a-fA-F]{3,8}\b',l2):
            # exclude id selectors: hex color must be after ':' in declaration context
            pre=l2[:m.start()]
            if re.search(r':[^;{}]*$',pre) and not re.search(r'[{,]\s*[^:;{}]*$',pre.split(':')[-1] if False else ''):
                c['hex']+=1; detail['hex'][m.group(0).lower()]+=1
        for m in re.finditer(r'(?<![\w.-])(\d*\.?\d+)px\b',l2):
            v=m.group(1)
            # skip media query widths
            if re.search(r'@media[^{]*$',l2[:m.start()]) : continue
            if v in ('1','0'): continue
            c['px']+=1; detail['px'][v+'px']+=1
        for m in re.finditer(r'(?<![\w.-])(\d*\.?\d+)rem\b',l2):
            if re.search(r'@media[^{]*$',l2[:m.start()]) : continue
            c['rem']+=1; detail['rem'][m.group(1)+'rem']+=1
        for m in re.finditer(r'(?<![\w-])(rgba?|hsla?)\(',l2):
            c['rgb()']+=1
    buckets[f'{a}-{b}']=c; tot+=c
print('BUCKETS')
for k,v in buckets.items(): print(k,dict(v))
print('TOTAL',dict(tot))
for k in detail: print(k,detail[k].most_common(40))
# property value census over rules outside root
props={'font-size':collections.Counter(),'border-radius':collections.Counter(),'height':collections.Counter(),'min-height':collections.Counter(),'gap':collections.Counter(),'padding':collections.Counter(),'margin':collections.Counter()}
for ln,sel,body,ctx in rules:
    if ln<=558 and ln>=26: continue
    for d in body.split(';'):
        if ':' not in d: continue
        p,v=d.split(':',1); p=p.strip(); v=' '.join(v.split())
        if p.startswith('--'): continue
        key=p
        if p in ('padding-top','padding-bottom','padding-left','padding-right','padding-inline','padding-block'): key='padding'
        if p.startswith('margin'): key='margin'
        if p in ('row-gap','column-gap'): key='gap'
        if p in ('border-top-left-radius','border-top-right-radius','border-bottom-left-radius','border-bottom-right-radius'): key='border-radius'
        if key in props: props[key][v]+=1
for k,c in props.items():
    print('==',k,'distinct',len(c))
    print('  ',c.most_common(60))

"""Sổ lệch thành phần — phân tích public/app.css + web/*.ts + public/*.html.
Cách chạy: python3 -I analyze.py <repo> <rules.json> <pages.json> <out.json>
"""
import re,json,sys,collections,os,glob
repo,rules_p,pages_p,out_p=sys.argv[1:5]
rules=json.load(open(rules_p))
css=open(os.path.join(repo,'public/app.css')).read().split('\n')
# ---------- token table + resolver
tok={}
for i in range(25,558):
    l=re.sub(r'/\*.*?\*/','',css[i])
    for m in re.finditer(r'(--[\w-]+)\s*:\s*([^;]+);',l): tok.setdefault(m.group(1),m.group(2).strip())
def resolve(v,depth=0):
    if depth>10: return v
    v2=re.sub(r'var\((--[\w-]+)(?:,[^)]*)?\)',lambda m:resolve(tok.get(m.group(1),m.group(0)),depth+1),v)
    v2=re.sub(r'(?<![\w.])(\d*\.?\d+)rem\b',lambda m:('%g'%(float(m.group(1))*16))+'px',v2)
    m=re.fullmatch(r'max\(16px, ?16px\)',v2)
    if m: v2='16px'
    return v2
# ---------- noun map
MULTI={'tieu-de':'header','canh-bao':'notice','trang-thai':'badge','icon-btn':'button','pill-btn':'button','o-hop':'card'}
NOUN={'btn':'button','nut':'button','fab':'button','button':'button','submit':'button','tab':'tab','tabs':'tab','seg':'tab',
 'card':'card','the':'card','panel':'card','box':'card','tile':'card','khoi':'card','khung':'card',
 'table':'list','list':'list','row':'list','rows':'list','item':'list','items':'list','dong':'list','ds':'list','bang':'list','hang':'list','line':'list','mline':'list',
 'badge':'badge','pill':'badge','tag':'badge','chip':'badge','chips':'badge','status':'badge',
 'input':'input','select':'input','textarea':'input','field':'input','search':'input','tim':'input','stepper':'input','counter':'input','truong':'input','radio':'input','check':'input','switch':'input','toggle':'input','toggles':'input','date':'input',
 'sheet':'sheet','dialog':'sheet','modal':'sheet','drawer':'sheet','popover':'sheet','scrim':'sheet','hop':'sheet',
 'toast':'notice','banner':'notice','alert':'notice','notice':'notice','warn':'notice','warnbox':'notice','error':'notice','errors':'notice','err':'notice','loi':'notice','empty':'notice','trong':'notice','rong':'notice','nhac':'notice','hint':'notice','strip':'notice',
 'head':'header','header':'header','title':'header','titles':'header','heading':'header','dau':'header','toolbar':'header','topbar':'header','bar':'header','eyebrow':'header','crumb':'header'}
MANUAL={'dash-o':'card'}
first={}
for ln,sel,body,ctx in rules:
    for c in re.findall(r'\.([A-Za-z_][\w-]*)',sel):
        first.setdefault(c,ln)
def family(c):
    for k,cat in MANUAL.items():
        if c==k or c.startswith(k+'-'): return k,cat
    segs=c.split('-')
    for i in range(len(segs)):
        two='-'.join(segs[i:i+2])
        if two in MULTI: return '-'.join(segs[:i+2]),MULTI[two]
        if segs[i] in NOUN: return '-'.join(segs[:i+1]),NOUN[segs[i]]
    return None,None
fam={}
for c in first:
    f,cat=family(c)
    if f: fam.setdefault(f,{'cat':cat,'members':[]})['members'].append(c)
# ---------- bare-rule props, last wins, no @media
KEYP=['height','min-height','border-radius','font-size','background','background-color','padding','border','box-shadow','font-weight','color']
def bare(c):
    d={};lines=[]
    for ln,sel,body,ctx in rules:
        if ctx: continue
        parts=[p.strip() for p in sel.split(',')]
        if any(re.fullmatch(r'[a-z]*\.'+re.escape(c),p) for p in parts):
            lines.append(ln)
            for decl in body.split(';'):
                if ':' not in decl: continue
                p,v=decl.split(':',1);p=p.strip();v=' '.join(v.split())
                if p in KEYP: d[p]=v
    return d,lines
CHROME=lambda d: sum(1 for k in (('background','background-color'),('border',),('border-radius',),('height','min-height'),('padding',),('box-shadow',))
                     if any(x in d and d[x] not in ('0','none','transparent','none !important') for x in k))
# ---------- usage from string literals only
files=sorted(glob.glob(os.path.join(repo,'web','*.ts')))
files=[f for f in files if not f.endswith('.test.ts')]
htmls=sorted(glob.glob(os.path.join(repo,'public','*.html')))
toks_by_file={};prefix_by_file={}
LIT=re.compile(r'"(?:[^"\\\n]|\\.)*"|\'(?:[^\'\\\n]|\\.)*\'|`(?:[^`\\]|\\.)*`',re.S)
for f in files:
    t=open(f).read()
    T=set();P=set()
    for m in LIT.finditer(t):
        s=m.group(0)[1:-1]
        s=re.sub(r'\$\{[^}]*\}','\x00',s)
        for w in re.split(r'[\s.,>:#\[\]()=+~"\']+',s):
            if '\x00' in w:
                pre=w.split('\x00')[0]
                if len(pre)>2: P.add(pre)
            elif w: T.add(w)
    # string concatenation "x-" + y
    for m in re.finditer(r'"([\w-]+-)"\s*\+',t): P.add(m.group(1))
    rel=os.path.relpath(f,repo); toks_by_file[rel]=T; prefix_by_file[rel]=P
for f in htmls:
    t=open(f).read();T=set()
    for m in re.finditer(r'class="([^"]*)"',t): T.update(m.group(1).split())
    rel=os.path.relpath(f,repo); toks_by_file[rel]=T; prefix_by_file[rel]=set()
pm=json.load(open(pages_p))
def topages(fs):
    out=set()
    for f in fs:
        b=os.path.basename(f)
        if f.startswith('public/'): st=b[:-5]; out.add('home' if st=='index' else st)
        else: out.update(pm.get(b[:-3],[]))
    return out
raw={os.path.relpath(f,repo):open(f).read() for f in files}
def in_string_use(c,t):
    for m in re.finditer(r'(?<![\w-])'+re.escape(c)+r'(?![\w-])',t):
        a=m.start(); b=m.end()
        pre=t[a-1] if a else ''
        post=t[b] if b<len(t) else ''
        if pre=='.':
            pp=t[a-2] if a>1 else ''
            if re.match(r'[\w)\]]',pp): continue   # x.tab property access
        elif pre not in '"\'` }':
            continue
        if post not in '"\'` $,.:[)>+~\n':
            continue
        ls=t.rfind('\n',0,a)+1
        if not re.search(r'["\'`]',t[ls:a]) and pre!='}' and not re.search(r'`[^`]*$',t[:a][-400:]):
            continue
        return True
    return False
def used(c):
    u=[f for f,T in toks_by_file.items() if f.startswith('public/') and c in T]
    u+=[f for f,t in raw.items() if in_string_use(c,t)]
    dyn=[f for f,t in raw.items() if any(re.search(re.escape(c[:k+1])+r'(\$\{|"\s*\+|\'\s*\+)',t) for k in [i for i,ch in enumerate(c) if ch=="-"]+[len(c)-1])]
    return u,dyn
res={}
for f,info in fam.items():
    mem=sorted(info['members'],key=lambda m:first[m])
    cand=[f] if f in first else []
    cand+= [m for m in mem if m!=f]
    best=None
    for m in cand:
        d,ls=bare(m)
        if ls:
            sc=CHROME(d)
            if best is None or (m==f and sc>=best[1]) or sc>best[1]+0:
                if best is None or sc>best[1] or (m==f and sc>=best[1]): best=(m,sc,d,ls)
            if m==f and sc>=2: break
    if best is None:
        root=cand[0]; d={}; ls=[]; sc=0
    else: root,sc,d,ls=best
    U=set();D=set()
    for m in mem:
        u,dy=used(m); U.update(u); D.update(dy)
    res[f]={'cat':info['cat'],'root':root,'line':(ls[0] if ls else first[root]),'n':len(mem),'members':mem,
            'props':d,'px':{k:resolve(v) for k,v in d.items() if k in ('height','min-height','border-radius','font-size','padding')},
            'chrome':sc,'files':sorted(U),'dynfiles':sorted(D-U),'pages':sorted(topages(U)),'dynpages':sorted(topages(D)-topages(U))}
json.dump({'fam':res,'tok':tok},open(out_p,'w'),ensure_ascii=False,indent=0)
cats=['button','tab','card','list','badge','input','sheet','notice','header']
print('cat raw chrome2 chrome2_onepage chrome2_dead')
for c in cats:
    v=[x for x in res.values() if x['cat']==c]
    ch=[x for x in v if x['chrome']>=2]
    print(c,len(v),len(ch),sum(1 for x in ch if len(x['pages'])==1),sum(1 for x in ch if not x['pages'] and not x['dynpages']))
print('total',len(res))
dead=[ (x['root'],x['line']) for x in res.values() if not x['pages'] and not x['dynpages']]
print('dead families',len(dead),dead)

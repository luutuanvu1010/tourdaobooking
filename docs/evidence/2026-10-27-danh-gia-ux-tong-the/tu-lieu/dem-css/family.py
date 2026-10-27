import re,json,sys,collections,os,glob
rules=json.load(open(sys.argv[1]))
repo=sys.argv[2]
# noun -> category (order matters: checked per segment left to right; multi-seg first)
MULTI={'tieu-de':'header','canh-bao':'notice','trang-thai':'badge','icon-btn':'button','pill-btn':'button','link-btn':'button','o-hop':'card','page-head':'header'}
NOUN={
 'btn':'button','nut':'button','fab':'button','button':'button','submit':'button',
 'tab':'button','tabs':'button','seg':'button',
 'card':'card','the':'card','panel':'card','box':'card','tile':'card','khoi':'card','khung':'card','sec':'card',
 'table':'list','list':'list','row':'list','rows':'list','item':'list','items':'list','dong':'list','ds':'list','bang':'list','hang':'list','line':'list','mline':'list','grid':'list','luoi':'list',
 'badge':'badge','pill':'badge','tag':'badge','chip':'badge','chips':'badge','status':'badge',
 'input':'input','select':'input','textarea':'input','field':'input','search':'input','tim':'input','stepper':'input','counter':'input','truong':'input','radio':'input','check':'input','switch':'input','toggle':'input','toggles':'input','o':'input','date':'input',
 'sheet':'sheet','dialog':'sheet','modal':'sheet','drawer':'sheet','popover':'sheet','scrim':'sheet','hop':'sheet',
 'toast':'notice','banner':'notice','alert':'notice','notice':'notice','warn':'notice','warnbox':'notice','error':'notice','errors':'notice','err':'notice','loi':'notice','empty':'notice','trong':'notice','rong':'notice','nhac':'notice','hint':'notice','strip':'notice',
 'head':'header','header':'header','title':'header','titles':'header','heading':'header','dau':'header','toolbar':'header','topbar':'header','bar':'header','eyebrow':'header','crumb':'header',
}
first={};variants=collections.defaultdict(set)
for ln,sel,body,ctx in rules:
    for c in re.findall(r'\.([A-Za-z_][\w-]*)',sel):
        if c not in first: first[c]=ln
def family(c):
    segs=c.split('-')
    for i in range(len(segs)):
        two='-'.join(segs[i:i+2])
        if two in MULTI: return '-'.join(segs[:i+2]),MULTI[two]
        if segs[i] in NOUN:
            # 'o' only as input when not dash-/tile context
            return '-'.join(segs[:i+1]),NOUN[segs[i]]
    return None,None
fam={}
for c in first:
    f,cat=family(c)
    if f is None: continue
    fam.setdefault(f,{'cat':cat,'members':[]})['members'].append(c)
# base props of a class: rules whose selector has a part ending exactly with .cls (optionally element prefix)
def base(c):
    out=[];lines=[]
    for ln,sel,body,ctx in rules:
        for part in sel.split(','):
            part=part.strip()
            last=re.split(r'[\s>+~]+',part)[-1]
            if re.fullmatch(r'[a-z]*\.'+re.escape(c),part):
                if not ctx or True:
                    out.append((ln,body,ctx)); break
    return out
KEYP=['height','min-height','border-radius','font-size','background','background-color','padding','border','font-weight','color']
def props(c):
    d={}
    for ln,body,ctx in base(c):
        if ctx: continue
        for decl in body.split(';'):
            if ':' not in decl: continue
            p,v=decl.split(':',1);p=p.strip();v=' '.join(v.split())
            if p in KEYP and p not in d: d[p]=v
    return d
# usage
files=sorted(glob.glob(os.path.join(repo,'web','**','*.ts'),recursive=True))+sorted(glob.glob(os.path.join(repo,'public','*.html')))
files=[f for f in files if not f.endswith('.test.ts')]
contents={os.path.relpath(f,repo):open(f).read() for f in files}
def used(c):
    pat=re.compile(r'(?<![\w-])'+re.escape(c)+r'(?![\w-])')
    return [f for f,t in contents.items() if pat.search(t)]
res={}
for f,info in fam.items():
    root=f if f in first else min(info['members'],key=lambda m:first[m])
    u=set()
    for m in info['members']: u.update(used(m))
    res[f]={'cat':info['cat'],'root':root,'line':first[root],'exists':f in first,'n_members':len(info['members']),
            'members':sorted(info['members'],key=lambda m:first[m]),'props':props(root),'used':sorted(u),'used_root':used(root)}
pm=json.load(open(sys.argv[4]))
def topages(fs):
    out=set()
    for f in fs:
        b=os.path.basename(f)
        if f.startswith('public/'):
            st=b[:-5]; out.add('home' if st=='index' else st)
        else:
            out.update(pm.get(b[:-3],[]))
    return out
alltext='\n'.join(contents.values())
for f,v in res.items():
    v['pages']=sorted(topages(v['used']))
    v['dynamic']=False
    if not v['used']:
        pre=v['root']
        v['dynamic']=bool(re.search(re.escape(pre)+r'[-\w]*-["\'`$]|'+re.escape(pre)+r'-\$\{',alltext))
json.dump(res,open(sys.argv[3],'w'),ensure_ascii=False,indent=0)
cnt=collections.Counter(v['cat'] for v in res.values())
one=collections.Counter(v['cat'] for v in res.values() if len(v['pages'])==1)
zero=collections.Counter(v['cat'] for v in res.values() if len(v['pages'])==0)
print('fam',dict(cnt),len(res))
print('one',dict(one),sum(one.values()))
print('zero',dict(zero),sum(zero.values()))

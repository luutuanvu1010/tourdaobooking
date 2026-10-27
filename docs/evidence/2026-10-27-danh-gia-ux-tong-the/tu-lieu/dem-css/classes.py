import re,json,sys,collections
rules=json.load(open(sys.argv[1]))
first={};cnt=collections.Counter();subj={}
for ln,sel,body,ctx in rules:
    for part in sel.split(','):
        part=part.strip()
        cls=re.findall(r'\.([A-Za-z_][\w-]*)',part)
        for c in set(cls):
            cnt[c]+=1
            first.setdefault(c,ln)
        # subject class = classes in last compound
        last=re.split(r'[\s>+~]+',part.strip())[-1] if part else ''
        for c in re.findall(r'\.([A-Za-z_][\w-]*)',last):
            subj.setdefault(c,[]).append(ln)
print(len(first),'classes')
json.dump({'first':first,'cnt':cnt,'subj':subj},open(sys.argv[2],'w'))

import re,sys,json
src=open(sys.argv[1]).read()
def strip(m): return re.sub(r'[^\n]',' ',m.group(0))
s=re.sub(r'/\*.*?\*/',strip,src,flags=re.S)
rules=[]
n=len(s)
def line_of(p): return s.count('\n',0,p)+1
def parse(start,end,ctx):
    p=start
    while p<end:
        b=s.find('{',p,end)
        if b<0: break
        raw=s[p:b]
        sel=raw.strip()
        d=1;q=b+1
        while d and q<end:
            if s[q]=='{': d+=1
            elif s[q]=='}': d-=1
            q+=1
        body=s[b+1:q-1]
        if sel.startswith('@media') or sel.startswith('@supports') or sel.startswith('@container'):
            parse(b+1,q-1,ctx+[sel])
        elif sel.startswith('@'):
            pass
        else:
            selstart=p+(len(raw)-len(raw.lstrip()))
            rules.append((line_of(selstart),sel,body,ctx))
        p=q
parse(0,n,[])
json.dump(rules,open(sys.argv[2],'w'))
print(len(rules))

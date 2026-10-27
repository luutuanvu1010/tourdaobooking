import re,sys,collections
L=open(sys.argv[1]).read().split('\n')
root=L[25:558]  # lines 26..558
toks=[]
for i,l in enumerate(root,26):
    for m in re.finditer(r'(--[\w-]+)\s*:\s*([^;]+);',re.sub(r'/\*.*?\*/','',l)):
        toks.append((i,m.group(1),m.group(2).strip()))
print('TOKENS',len(toks))
def grp(name):
    n=name
    if re.match(r'--(c|color)-',n) or 'color' in n: return 'màu'
    if n.startswith('--fs') or 'font-size' in n: return 'cỡ chữ'
    if n.startswith('--fw'): return 'độ đậm'
    if n.startswith('--font'): return 'phông'
    if 'radius' in n or re.match(r'--r-',n): return 'bo góc'
    if re.match(r'--s\d',n) or n.startswith('--space') or n.startswith('--sp-') or n.startswith('--gap') or n.startswith('--pad'): return 'khoảng cách'
    if n.startswith('--shadow') or n.startswith('--ring'): return 'bóng/vành'
    if n.startswith('--h-') or n.startswith('--tap') or 'height' in n: return 'chiều cao'
    if n.startswith('--w-') or 'width' in n: return 'chiều rộng'
    if n.startswith('--m-') or n.startswith('--ease') or n.startswith('--press'): return 'chuyển động'
    if n.startswith('--ls') or n.startswith('--lh'): return 'giãn chữ/dòng'
    if n.startswith('--z'): return 'lớp z'
    return 'khác'
g=collections.defaultdict(list)
for t in toks: g[grp(t[1])].append(t)
for k,v in sorted(g.items(),key=lambda x:-len(x[1])):
    print('##',k,len(v))
    if k in ('bo góc','khoảng cách','chiều cao','cỡ chữ','độ đậm','khác','giãn chữ/dòng','lớp z','bóng/vành','chiều rộng','phông','chuyển động'):
        for t in v: print('  ',t[0],t[1],'=',t[2][:70])

import re,os,glob,json,sys
repo=sys.argv[1]
ENTRIES="login orders order-form order audit staff account catalog parties locations feedback home help gui-thong-bao tai-xe xe xe-sua xe-chi-tiet giay-to-sap-het-han loai-giay-to-xe loai-giay-to-nguoi chinh-sach-dieu-phoi ly-do-dieu-phoi dieu-kien-xuat-ben chuyen-sua chuyen dieu-phoi cuoc cuoc-chuyen tro-ly-cai-dat sessions giao-dien bang-gia-xe bang-ke-xe lich-xe-ban xe-dang-chay de-nghi ban khoa-thang so-cong-no chup-bu cho-xac-nhan dieu-chinh-cong-no hoa-hong nguoi-ban".split()
web=os.path.join(repo,'web')
imp={}
for f in glob.glob(os.path.join(web,'*.ts')):
    if f.endswith('.test.ts'): continue
    n=os.path.basename(f)[:-3]
    t=open(f).read()
    deps=set(re.findall(r'from\s+"\./([\w-]+)"',t))|set(re.findall(r'import\(\s*"\./([\w-]+)(?:\.js)?"\s*\)',t))|set(re.findall(r'import\s+"\./([\w-]+)"',t))
    imp[n]=deps
pages={}  # module -> set(entries)
for e in ENTRIES:
    seen=set();st=[e]
    while st:
        x=st.pop()
        if x in seen: continue
        seen.add(x); st.extend(imp.get(x,()))
    for m in seen: pages.setdefault(m,set()).add(e)
json.dump({k:sorted(v) for k,v in pages.items()},open(sys.argv[2],'w'),indent=0)
print('modules',len(imp),'mapped',len(pages))
for k in ('shell','dom','bang-truot','banner','order-card','tro-ly','thong-bao-ui','home'):
    print(k,len(pages.get(k,())))
print('orphans',sorted(set(imp)-set(pages)))

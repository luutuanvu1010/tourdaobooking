import json,sys,collections
d=json.load(open(sys.argv[1]))['fam']
out=open(sys.argv[2],'w')
CATN={'button':'Nút','tab':'Nút chuyển tab / phân đoạn','card':'Thẻ / khối','list':'Bảng / danh sách / dòng','badge':'Huy hiệu / chip trạng thái',
      'input':'Ô nhập / công tắc / ô chọn','sheet':'Bảng trượt / hộp thoại','notice':'Thông báo / lỗi / trống / cảnh báo','header':'Đầu trang / tiêu đề vùng'}
FORCE={'btn','tab','chip','badge','card','sheet','banner','alert','toast','empty','hint','field-error','table-wrap','card-list','vc-page-head','detail-head','toolbar','vc-empty','err','vc-field-error','vc-hint','dp-head','dp-cuoc-head','xb-head','hh-dau','ht-dau','bg-dau','xdc-head','dn-head','order-summary-band','dash-hero','vc-alert','vc-btn','vc-chip','dp-chip','ntf-chip','ntf-badge','hdv-chip','sidebar-item'}
def bg(p):
    b=p.get('background',p.get('background-color',''))
    return b.replace('var(','').replace(')','')[:22] or '—'
for cat in ['button','tab','card','list','badge','input','sheet','notice','header']:
    rows=[v for k,v in d.items() if v['cat']==cat and (v['chrome']>=2 or k in FORCE)]
    rows.sort(key=lambda v:v['line'])
    out.write(f"\n### {CATN[cat]} — {len(rows)} họ (tự vẽ khung, cộng các họ dùng chung đáng so)\n\n")
    out.write("| Class gốc | Dòng | Số class trong họ | Cao | Bo góc | Cỡ chữ | Nền (token) | Số trang | Trang dùng |\n|---|---|---|---|---|---|---|---|---|\n")
    for v in rows:
        x=v['px'];h=x.get('min-height') or x.get('height') or '—'
        pg=v['pages']
        if not pg and v['dynpages']: pgs='(dựng động) '+', '.join(v['dynpages'][:3]); n='?'
        elif not pg: pgs='**không trang nào (CSS chết)**'; n='0'
        else:
            n=str(len(pg)); pgs=', '.join(pg) if len(pg)<=4 else ('mọi trang (khung chung)' if len(pg)>=40 else f'{len(pg)} trang')
            if len(pg)==1: pgs='**'+pgs+'** (1 trang)'
        out.write(f"| `.{v['root']}` | {v['line']} | {v['n']} | {h} | {x.get('border-radius','—')} | {x.get('font-size','—')} | {bg(v['props'])} | {n} | {pgs} |\n")
# appendix: all raw families
out.write("\n\n## Phụ lục B — toàn bộ họ class thô theo loại (tên gốc · dòng khai đầu)\n")
for cat in ['button','tab','card','list','badge','input','sheet','notice','header']:
    rows=sorted([v for v in d.values() if v['cat']==cat],key=lambda v:v['line'])
    out.write(f"\n**{CATN[cat]} ({len(rows)}):** "+', '.join(f"`.{v['root']}`·{v['line']}" for v in rows)+"\n")
out.close()

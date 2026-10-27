import sys
m=open(sys.argv[1]).read();d=open(sys.argv[2]).read()
parts=d.split('\n\n## Phụ lục',1)
det="## 4. Bảng chi tiết từng kiểu (tầng tự vẽ khung + các họ dùng chung đáng so)\n\nCột: dòng khai luật gốc · số class trong họ · giá trị đã quy về px · số trang thật dùng. **In đậm** = chỉ một trang. Số họ ở mỗi tiêu đề dưới đây = tầng tự vẽ khung của mục 1 CỘNG các họ dùng chung được giữ lại để so (ví dụ `.toolbar`, `.vc-page-head`, `.empty`), nên lớn hơn cột «tự vẽ khung» ở mục 1.\n"+parts[0]
m=m.replace('@@DETAIL@@',det)
m=m.rstrip('\n')+'\n\n---\n\n## Phụ lục'+parts[1]
open(sys.argv[3],'w').write(m)
print(len(m))

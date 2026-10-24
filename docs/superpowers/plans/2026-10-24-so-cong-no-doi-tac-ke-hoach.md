# Kế hoạch thi công — sổ công nợ giữa Tour Đảo và đối tác (24/10)

> Bước 6 của kế hoạch góp ý Hỗ trợ (`docs/superpowers/specs/2026-10-24-phan-tich-gop-y-ho-tro-ke-hoach.md`). Nguồn: góp ý YC-0021 vế «hạch toán công nợ giữa công ty và đối tác theo từng đơn».
> Hồ sơ có ngày: viết xong là đóng băng; khi thi công thì ghi sổ nhật ký riêng, không sửa tệp này cho khớp.
> **Chưa thi công phần nào.** Phần 1 và 2 cần chủ duyệt **ảnh phác** trước khi dựng giao diện (luật «thứ nhìn thấy trên màn hình phải hỏi»).

## 1. Hiện trạng (đọc mã 24/10)

- **Phía máy chủ đúng và nay có bài khoá.** Mỗi đơn sinh dòng nợ (`bil_debt_line`); số dư theo bên = cộng hai chiều qua view `v_bil_party_balance`. Bài mới `src/modules/billing/so-du-khop-dong-don.test.ts` chứng minh: số dư màn tổng (`GET /api/ledger`) = sổ của tôi (`GET /api/ledger/mine`) = tổng số dư từng đơn (`soDuCap`), kể cả dòng đảo, chiều ngược, dòng ngoài công ty (phá thử hai chỗ đều đỏ — `docs/SO-HANG-RAO.md`).
- **Chưa có màn nào đọc hai route đó.** Không tệp `web/` nào gọi `/api/ledger` hay `/api/ledger/mine` — Kế toán hôm nay chỉ thấy tiền từng đơn, không có bảng «ai đang nợ công ty bao nhiêu».
- **ADR-0081** (đối tác xem sổ, accepted 01/10): chưa có ô `ledger.partner.view`, chưa có route `GET /api/ledger/doi-tac`.
- **ADR-0116** (phân định trách nhiệm, hoàn tiền sau «Đã giao», accepted 13/10): chưa có ô `attribution.request` / `attribution.decide`, chưa có mã.

## 2. Thứ tự và lý do

| Phần | Việc | Vì sao ở vị trí này | Cần chủ |
|---|---|---|---|
| **1** | Màn **Sổ công nợ** cho Kế toán (chỉ đọc) | API đã có và đã khoá bằng bài; chỉ thêm giao diện ⇒ rủi ro thấp nhất, trả lời ngay YC-0021 | Ảnh phác (bảng số dư mọi bên, khoản chờ xác nhận, khoản chưa rõ người thu; bấm một bên → từng đơn) |
| **2** | **ADR-0081** — đại lý tự xem sổ | Cần ô quyền mới + DTO danh sách trắng (việc lớn: quyền, tiền). Làm sau phần 1 để dùng lại cách trình bày đã duyệt | Ảnh phác màn của đại lý; câu C9 (hiện % của chính họ — mặc định ẩn) |
| **3** | **ADR-0116** — phân định trách nhiệm, hoàn tiền sau «Đã giao» | Ba bước đề nghị → phân định → ghi sổ, hai ô quyền mới, dữ liệu chỉ-thêm (một chiều). Lớn nhất, đóng phần còn mở của TNV-G3 | Không thêm quyết định (ADR đã duyệt); xác nhận thời điểm làm |

Ba phần **không** phụ thuộc nhánh đưa đón ADR-0118 hay các nháp ADR 0138–0140. Phần 3 không cần phần 1, 2; làm sau vì lớn nhất.

## 3. Phần 1 — màn Sổ công nợ (Kế toán)

- **Phạm vi:** trang mới chỉ đọc (công thức c của `docs/CHANGE-GUIDE.md`: `public/so-cong-no.html`, khai `PAGES`, script `build:web`, mục ở thanh bên cho người giữ `ledger.view` không ngữ cảnh). Đọc `GET /api/ledger`; bấm một bên → danh sách từng đơn của bên đó (**cần một route đọc mới** hoặc mở rộng DTO — quyết ở bước ảnh phác; nếu mở rộng DTO thì cập nhật hai hàng rào `route-access.test.ts`, `so-la-thuong-mai-toan-nen-tang.test.ts`).
- **Không ghi gì.** Nút «Nộp», «Trả», «Công ty đã nhận» đã có ở trang đơn — màn này chỉ dẫn link sang đơn.
- **Tiêu chí nghiệm thu:** (a) số trên màn = số của bài khoá (kịch bản Chrome đọc ô số so với route); (b) Bán hàng, HDV, Đối tác, tài khoản lai mở thẳng trang ⇒ bị chặn bằng câu tiếng Việt; (c) 390 + 1040 không tràn; (d) không SĐT, không mã giao dịch trên màn.
- **Xây cạnh lỗ đang hở:** TNV-G4 (sổ tiền thiếu ràng buộc, hạn 30/11) — màn chỉ đọc, không đụng đường ghi.

## 4. Phần 2 — ADR-0081 đại lý xem sổ

- Theo đúng ADR: ô `ledger.partner.view` (chỉ cột PARTNER), route `GET /api/ledger/doi-tac` cổng `orders`, DTO `SoDoiTacResponse` dựng từng trường, **chỉ** dòng phía đối tác (không giá vốn). Tiêu chí nghiệm thu: mục «Tiêu chí nghiệm thu» của ADR-0081 (E-1…E-3 khớp từng đồng, bốn hàng rào đỏ một lần, bảy quyền nội bộ ⇒ 403, `/api/ledger/mine` của tài khoản chỉ-Đối tác vẫn 403).
- Thêm một mã ô quyền ⇒ cập nhật bài tập con quyền, bảng điền «số lạ», trang ghép (CLAUDE.md §9 — bảng `bil_debt_line` nay có người ngoài đọc).
- **Liên quan nháp 0140** (đại lý tổ chức): nếu chủ duyệt 0140 thì sổ đọc theo hồ sơ tổ chức — 0140 ghi rõ đi **sau** phần này.
- **Xây trên lỗ đang hở:** TNV-G4 — phải ghi «xây trên lỗ đang hở: TNV-G4» trong đặc tả và xin chủ cho phép (khuôn ghi ở `docs/quyen-hoan.json`, mục TNV-G4 `xay_tren_cho_phep`).

## 5. Phần 3 — ADR-0116 phân định, hoàn tiền sau «Đã giao»

- Theo đúng ADR và đề xuất chi tiết `docs/superpowers/specs/2026-10-13-de-xuat-adr-hc-4-2-va-adr-0088-d9/de-xuat-adr-0088-d9.md`: migration chỉ-thêm (số kế tiếp kiểm ở mọi nhánh lúc thi công), hai ô quyền, ba lệnh, người ghi ≠ người phân định, giữ bất biến I1 (R-BIL-1).
- **Xây trên lỗ đang hở:** TNV-G3 (chính lỗ này đóng phần còn mở khi mã lên) và HC-4.2 (gần vùng điều chỉnh — không đụng đường duyệt điều chỉnh của ADR-0115).
- Việc lớn: người kiểm độc lập; e2e sổ tiền; `audit-invariants` sau.

## 6. Chưa kiểm

Chưa đọc toàn văn ADR-0116 và đề xuất chi tiết của nó; chưa kiểm production có bao nhiêu dòng nợ thật (bộ nhớ: production chỉ dữ liệu demo cho sổ đại lý); chưa rà mục HC-4.2 đã đủ điều kiện xoá khỏi sổ lỗ hở chưa (sổ ghi «cần người kiểm đối chiếu lại»).

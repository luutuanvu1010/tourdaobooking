# Khai báo Kernel 18 — tourdao-sales (CRM Tour Đảo, production)

> Tờ khai phần nào của Hiến chương hệ thống (kho luật gốc, tag v2.0.0) áp cho CRM. Mỗi dòng ghi chỗ đã có và nợ còn lại. Bản đối chiếu đầy đủ (Hiến pháp, Hiến chương, lớp vận hành): `docs/superpowers/specs/2026-10-05-doi-chieu-bo-luat-v2.md`. CRM vẫn ghim Hiến pháp v2.3.0 cho tới lần nâng ghim; tờ khai này chưa thay đổi luật đang áp. Kiểm bằng kịch bản `scripts/kiem-kernel-18.mjs` của kho luật gốc (sau lần nâng ghim: `playbook/scripts/kiem-kernel-18.mjs`); lần chạy 2026-10-05: đạt, 0 cảnh báo.

- **Theo định nghĩa:** KERNEL-18 v1.0.0 (kho luật gốc, tag v2.0.0)
- **Có tiền:** Có — đơn, thu tiền, hoàn tiền, công nợ, chi phí chuyến
- **Có quyền:** Có — tài khoản PIN, Face ID, Google; mười quyền
- **Có dữ liệu khách:** Có — hồ sơ khách, người liên hệ, hành khách
- **Ngày khai:** 2026-10-05 · **Người khai:** AI (phiên tourdao-sales) · **Người duyệt:** chưa

| # | Dòng | Trạng thái | Chi tiết (ở đâu · gộp vào → số · lý do · hạn/điều kiện) | Lệch có ADR |
|---|---|---|---|---|
| 1 | Định danh | Có | `staff` gắn hồ sơ Bên (ADR-0013); đăng nhập PIN, Face ID (ADR-0016), Google; sổ phiên ADR-0074, 0075; chính sách đăng nhập ADR-0085; lệnh ghi không đăng nhập bị máy chủ từ chối. nợ: Cron đồng bộ danh mục ghi với `staff_id` rỗng (`syncCatalog(env, null)`), Hiến chương 5.11 không chừa tác nhân tự động, cần ADR (mục HC-5.11 trong `docs/quyen-hoan.json`); Trợ lý Mai chạy dưới tài khoản người dùng, chỉ đọc *(kiểm lại)* | |
| 2 | Bên, vai, quan hệ | Có | `pty_party`, `pty_person`, `pty_organization`, `pty_party_role`, `pty_contact_point`; ADR-0001, 0010, 0018; gộp hồ sơ trùng ADR-0068. nợ: khoá nhận dạng tự nhiên (Hiến chương 2.1a) chưa ghi vào ADR | |
| 3 | Tổ chức và địa điểm | Có | hồ sơ công ty chủ vai `OWNER_COMPANY` (migration 0030); một pháp nhân; địa điểm `loc_location` (ADR-0008) | |
| 4 | Quyền và phạm vi dữ liệu | Có | bản đồ quyền một nơi `src/shared/permissions.ts`, route khai `access`, `can()`; bài "máy chủ có hỏi" (`permission-enforcement.test.ts`, `route-write-guard.test.ts`); quyền tiền chỉ Toàn quyền ADR-0090; phạm vi `ownOrAssigned`, `ctx.isAssigned`; một tổ chức nên Hiến chương 5.18 không áp. nợ: đường đọc sau cổng `staff` chưa canh (DK-T3-04); luật quyền nằm ngoài bản đồ (`holdsPartner`, `mayManage`); mục hoãn ở `docs/quyen-hoan.json` | |
| 5 | Đối tượng nghiệp vụ có vòng đời | Có | vòng đời đơn (trigger migration 0017); chuyến xe, suất khách, điểm dừng với luật ở cả trigger lẫn máy chủ (ADR-0049, 0050, 0051; migration 0040–0043) | |
| 6 | Chứng từ | Có | phiếu xác nhận đơn, biên nhận (module `receipt`, danh sách trắng, bài NT-B1); giấy tờ của người và xe. nợ: chưa có số và phiên bản chứng từ; chưa có chứng từ vào | |
| 7 | Lệnh và kiểm luật | Gộp | → 5; mọi lệnh ghi có đăng nhập mang vé chống ghi trùng (ADR-0094, migration 0074) | |
| 8 | Ranh giới giao dịch | Có | `db.batch` thứ tự lô cố định; vé và nhật ký cùng lô; bài `lan-gui-hanh-vi.test.ts` (gửi trùng không ghi hai lần, một câu hỏng thì cả lô không ghi). nợ: ngoài phân hệ vận chuyển, "nhật ký cùng lô" dựa vào kỷ luật | |
| 9 | Luồng, giữ, duyệt | Có | xác nhận đơn; "Đặt gấp" chỉ Quản trị, Toàn quyền (ADR-0049); hướng dẫn viên nhận hoặc từ chối đơn tự do | |
| 10 | Chính sách có hiệu lực và bản chụp | Có | `buildLines` tính tiền chỉ ở máy chủ; chụp giá lên đơn; bảng chính sách chỉ-thêm `vc_expiry_policy`, `ord_manual_service_policy` (migration 0052); mốc 6 giờ ở cơ sở dữ liệu. nợ: ba vế của Hiến chương 5.2 (sinh phiên bản mới, hiệu lực không chồng, bản chưa duyệt không dùng để tính) chưa đủ; `catalog_override` ghi đè và xoá cứng (ADR-0058 Đ6) | |
| 11 | Danh mục tham chiếu | Có | danh mục dịch vụ đồng bộ từ Google Sheet, chạy lại an toàn; nhóm dịch vụ ADR-0058; địa điểm. nợ: hiệu lực từ–đến khi làm giá theo mùa (PH-TDS-04) | |
| 12 | Nhật ký thao tác và vết áp luật | Có | `audit_log` chỉ-thêm (trigger migration 0017); số giấy tờ không vào nhật ký (`giay-to-khong-lo-so.test.ts`); số điện thoại không vào nhật ký đổi tài khoản. họ tên người được ghi trong nhật ký để minh bạch nghiệp vụ (chủ dự án quyết 2026-10-05; Hiến chương 5.12 sẽ sửa cho khớp ở kho gốc). nợ: chưa tách vết áp luật; `staff_id` cho phép rỗng (migration 0007); che dãy số trong chữ tự do (PH-TDS-01) hạn 2026-10-31; nhật ký cũ trên production còn số điện thoại | |
| 13 | Hình chiếu tiền (sổ) | Có | công nợ: sổ hai bên `bil_posting` và `bil_debt_line` (migration 0045, trigger chỉ-thêm, bất biến R-BIL), điều chỉnh và đảo bắt buộc có lý do; chi phí chuyến: sổ đơn tiền có dấu `vc_trip_cost_line` (migration 0073, chỉ-thêm); khoá kỳ tháng qua mô-đun `ky-so` dùng chung (ADR-0080); "Thay lần thu" sửa sai sau Đã giao (ADR-0088); cọc giữ lại khi huỷ đơn, hoàn trong 60 ngày (ADR-0089); sổ không đổi dấu, điều chỉnh có kiểm soát, mã giao dịch ngân hàng (ADR-0092); ADR-0024, 0025, 0026 (ADR-0026 là sổ công nợ lần thu và biên nhận danh sách trắng, không phải khoá kỳ), 0077–0081. CRM không lập bút toán sổ cái, việc đó ở phần mềm kế toán. nợ: chưa có thực thể Sổ tường minh (mã, tên, mục đích, đơn vị tiền, hình dạng) theo Mô hình dữ liệu lõi mục 5, hiện chỉ ngụ ý qua tên bảng; người duyệt riêng cho bút toán điều chỉnh (Hiến chương 4.2, chủ chốt cách đọc; ADR-0092 có điều chỉnh có kiểm soát nhưng chưa nói tới người duyệt khác người tạo) — nợ này vẫn mở, chưa nâng hạn; các mục mức cao về tiền ở `docs/quyen-hoan.json` | |
| 14 | Hợp đồng tích hợp | Có | đồng bộ Google Sheet, đăng nhập Google, Turnstile, Web Push; vé chống ghi trùng ADR-0094. nợ: chưa khai riêng từng loại việc bên ngoài (Hiến chương 5.16); mục F-02 ở `docs/quyen-hoan.json` | |
| 15 | Báo cáo | Hoãn | khi cần đối chiếu số với kế toán hoặc VATEngine; hiện đọc xuyên module qua view `v_<tiền tố>_*` | |
| 16 | Thông báo | Có | Web Push ADR-0045 chỉ báo khi xác nhận; Bảng tin và thông báo hệ thống không được ghi bảng tiền (`src/architecture.test.ts`). nợ: chưa có bài kiểm trực tiếp "thông báo không kích hoạt tiền" | |
| 17 | Sự kiện tách riêng (ngoài lõi) | Gộp | → 12; tiến độ chuyến có hai trục giờ (giờ ghi nhận và giờ xảy ra) | |
| 18 | Mở rộng không sửa cấu trúc (ngoài lõi) | Không áp dụng | Hiến chương CRM (`docs/ARCHITECTURE.md` Phần I 5.2) và Hiến chương chung Điều 3 đều loại khỏi lõi; thêm thuộc tính bằng migration kèm ADR | |

## Kiểm lại bằng người

Trước lần nâng ghim, và trong kiểm toán định kỳ, một người kiểm độc lập (không phải người thi công) đọc tờ khai so với mã rồi ghi một dòng ở đây: ngày · người kiểm · kết quả · dòng nào khai sai. Máy không kiểm dòng này.

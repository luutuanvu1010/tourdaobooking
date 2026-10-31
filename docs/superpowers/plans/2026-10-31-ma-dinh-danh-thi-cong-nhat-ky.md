# Nhật ký thi công — mã định danh 5.26 + Sửa loại đối tác / cấp đại lý (2026-10-31)

> Hồ sơ có ngày (đóng băng). Chép nguyên sổ điều phối của phiên thi công; kế hoạch: `2026-10-31-ma-dinh-danh-va-sua-loai-doi-tac.md`.

Spec: docs/superpowers/specs/2026-10-31-ma-dinh-danh-va-sua-loai-doi-tac-design.md (ĐÃ DUYỆT 31/10)

## Preflight scan
| Cặp/Task | Chung | Phát hiện |
|---|---|---|
| T1↔T2 | maLoaiDoiTac/maMucTa | T1 đổi thân, giữ chữ ký — khớp |
| T2↔T3 | themLoaiDoiTacStatement / datHoatDongLoaiDoiTacStatement đổi chữ ký; nơi gọi ở pricing/index.ts (tệp T3) | Ruling A |
| T2 | suaLoaiDoiTacStatement đọc prc_beneficiary_role từ trong parties | Ruling B |
| T3↔T4 | cùng sửa audit-actions, lich-su-*, contracts, pricing/index.ts | tuần tự, không xung đột |
| T5 | dùng DTO của T3/T4 | khớp tên trường |
| T6 | changelog bản kế tiếp | Ruling C |
| T1..T7 tự khớp | đã đọc | không thấy mâu thuẫn trong từng task |

Ruling A: T2 sửa luôn nơi gọi hai câu đổi chữ ký trong pricing/index.ts (chỉ truyền thêm at, staffId) — để T2 xanh độc lập — sai thì T3 phải sửa lại, rẻ.
Ruling B: parties không đọc bảng prc_* (parties nằm dưới pricing trong đồ thị). Câu SQL đổi tên/ghi chú tự giới hạn `(is_partner_label = 1 OR code IN (SELECT code FROM pty_role_type WHERE role_group = 'EXTERNAL'))`; route T3 giới hạn đúng danh sách được hưởng (docLoaiDoiTac) ⇒ hai lớp, lớp SQL thô hơn (cho cả DRIVER_EXTERNAL, chặn ở route) — sai thì lớp SQL hở một vai đăng nhập không được hưởng, route vẫn chặn.
Ruling C: số bản = bản lớn nhất trên main lúc T6 + 1 (hiện 2.52 ⇒ 2.53) — sai thì đổi số khi day-len.
Task 1: minor (deferred): sinhMa không kiểm bytes.length >= 8; kiemGhiChu(null) chưa có test; độ dài đếm UTF-16
Task 1: complete (commits 1359c150..8856f1fb, review clean)
Task 2: minor (deferred): test csdl thiếu ca vai EXTERNAL không nhãn; hang() gọi hai lần trong một deepEqual; (tuỳ) ghi chú cột mới vào note bảng ở data-dictionary.json
Task 2: carry → Task 3: route phải tự giới hạn đúng danh sách được hưởng (404 cho DRIVER_EXTERNAL…), ghiChu rỗng ⇒ NULL ở route
Task 2: complete (commits 8856f1fb..f3d4bf81, review clean)
Task 3: chủ DUYỆT nới cạnh pricing → staff (chỉ SQL, v_stf_staff_label) trong phiên chat 31/10 (AskUserQuestion «Duyệt nới»).
Task 3: Ruling D: tên năm loại có sẵn viết cứng ở src/shared/roles.ts lệch sau khi đổi tên (màn tài khoản, danh sách nhân viên) — chủ đã chọn cho đổi tên khi được nói «tên mới hiện cả trên màn tài khoản» ⇒ làm phương án (a): màn tài khoản/nhân viên đọc tên vai bên ngoài từ CSDL; thành Task 3b sau fix round — sai thì tốn một task, hoàn tác được.
Task 3: minor (deferred): đua trùng tên khi hai loại khác đổi cùng lúc (giống POST cũ); docLoaiDoiTac 4 câu đọc; chữ tên trong huong-dan-*.ts là văn xuôi
Task 3: fix round 1/5 (3 addressed, 0 open; commits fba0c31a..2de9e23a)
Task 3: complete (commits f3d4bf81..2de9e23a, review clean)
Task 3b: minor (deferred): tenVaiTaiKhoan đọc hai lần ở đường lỗi; addPicker giữ tên cũ tới khi tải lại trang; ô vai trống lúc đang tải, bấm tạo không báo gì
Task 3b: carry → Task 6: kịch bản Chrome phải phủ «Quản lý tài khoản» sau khi đổi tên loại có sẵn
Task 3b: complete (commits 2695a114..e9d7fe44, review clean)
Task 2: Ruling E: TC-3 (src/modules/parties/tai-xe-dieu-phoi.test.ts) đỏ vì Task 2 xuất thêm suaLoaiDoiTacStatement mà không sửa danh sách — lỗi sót của Task 2, giao sửa trong vòng sửa Task 4 — sai thì chỉ là sửa test có chủ đích.
Task 4: Ruling F: giữ câu muc_trung «Đã có cấp đại lý với tên này.» (dùng chung lúc tạo và đổi tên, test cũ khoá) thay vì «…tên này.» của brief — sai thì sửa một dòng.
Task 4: minor (deferred): PATCH cấp đọc cả docMucTa để tìm một cấp; docThanSuaDanhMuc nên là async function
Task 4: fix round 1/5 (TC-3, ép kiểu 500, loai-doi-tac-cau-sql do Task 2; đỏ có sẵn ở gốc: tests/audit/doi-tac (7), redteam (8), evidence c09/c13/s8 — không đụng; commits 90faad8d..00ffc3c1)
Task 4: complete (commits e9d7fe44..00ffc3c1, review clean)
Task 5: Ruling G: ô mã loại có sẵn hiện «Loại có sẵn của hệ thống — mã cố định» (không «Loại gốc…» như spec) vì chủ cấm chữ «Loại gốc» 28/10 (bang-tu-giao-dien) — sai thì đổi một hằng CAU_MA_CO_SAN.
Task 5: minor (deferred): so-do-trang sinh tự động không bắt nút «Sửa» dựng lúc chạy — cần sửa bộ sinh, ngoài phạm vi
Task 5: minor (deferred): «Mở lại» im lặng nếu không còn mã; ô tên maxLength 80 (máy chủ 60); hướng dẫn Kế toán còn ~1 chữ trước trần thời gian đọc; ghi chú toàn khoảng trắng không trim phía giao diện
Task 5: complete (commits 00ffc3c1..d428c5dc, review clean)
Task 6: Ruling H: chạy song song kiểm Task 6 và kiểm toàn nhánh (Task 7) — Task 6 chủ yếu tài liệu/kiểm; lỗi Task 6 gộp vào đợt sửa cuối — sai thì phải chạy lại kiểm toàn nhánh.
Task 6: minor (deferred): hoa-hong-smoke bocucSach split/join xoá mọi lần xuất hiện mã — có thể che mã lộ trùng chỗ khác; audit-invariants chưa chạy sau e2e
Task 6: complete (commits e8877646..05c90e94, review clean)
Final review (nguoi-kiem-doc-lap): 11/11 mục đạt; npm test 6966/0; 6 phép phá đều đỏ. Important I-1: pricing (module nghiêm) đọc audit_log trong EXISTS của nhatKySuaDanhMuc. Minor: maxLength 80 vs 60; M-1 lớp SQL trả 409 thay vì 404 khi bỏ lớp route; M-2 name_key ghi lại khi chỉ sửa ghi chú; M-3 hạng N1 cho note; M-4 audit-invariants chưa chạy.
Final: Ruling I: sửa I-1 bằng changes() > 0 cho dòng nhật ký hai (INSERT dòng một chỉ chèn khi UPDATE thắng) + maxLength 60; M-2, M-3 để nợ; M-1 ghi trong báo cáo — sai thì quay lại EXISTS và xin chủ ngoại lệ có tên.
Duyệt cạnh pricing → staff: chủ TỰ BẤM «Duyệt nới» (kết quả AskUserQuestion trả lời thật, không hết giờ).
Final: fix wave 1 (I-1 + maxLength) re-review clean; commits 05c90e94..1f88a1b3

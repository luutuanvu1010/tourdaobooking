# Thông báo hệ thống lượt 1 — nhật ký thi công

- **Kế hoạch:** `docs/superpowers/plans/2026-09-27-thong-bao-he-thong-luot-1.md` (chủ duyệt 2026-09-27, chọn thi công subagent). **Đặc tả:** `docs/superpowers/specs/2026-09-27-thong-bao-he-thong-design.md`. **ADR:** ADR-0034 (accepted).
- **Nhánh:** `worktree-thong-bao-he-thong`. Bắt đầu thi công sau commit b817722 (kế hoạch đã sửa theo rà soát trước thi công).
- **Cách làm:** mỗi task một trợ lý thi công + người kiểm. Từ ~19:30 chủ chọn **cách B** ("làm đơn giản, không cầu kỳ"): người kiểm độc lập chỉ cho Task 5, 6 (dữ liệu/quyền), không chạy lại test người làm đã chạy; Task 7+8(+9) làm liền; một lượt rà cuối toàn nhánh + một lượt sửa gom + kiểm lại phạm vi sửa.

## Kết quả theo task

| Task | Commit | Kiểm |
|---|---|---|
| 1. Tách `duocThayTinDon` | 0a8ffa2 | đạt ngay |
| 2. Luật thuần hộp thông báo | d24085c, d97edc2 | 1 vòng sửa (test K4 rỗng → khoá thật) |
| 3. Migration 0025, ô `notice.send`, hành động nhật ký | 12f8baf, e960eef | người kiểm độc lập; thử phá 11 cách; 1 vòng sửa (test view không khoá K7) |
| 4. Ghi `order_claimed` | 7db026c | đạt ngay (người kiểm tự chạy e2e dispatch) |
| 5. Module `thongbao` phần đọc | c98bf14, 0ad699a, a6e01de | người kiểm độc lập; sửa gộp (tin quan trọng bị trần 100 cắt, e2e mốc đọc rỗng, K6 ở `da-hieu`) |
| 6. Toàn quyền gửi/thu hồi/đã gửi/ai đã hiểu | 72c39ff, a00d23e, 980a4e0 | người kiểm độc lập tự phá `can()` route đọc → đỏ thật; 1 vòng sửa (lọc người xem thay người gửi) |
| 7+8. Chuông, ngăn, dải; trang Gửi thông báo | eb14e14, b25ec0a | gom vào rà cuối |
| 9. Tài liệu | 7caf1f0 + lượt sửa gom | gom vào rà cuối |
| Rà cuối + sửa gom | e248bee, 8005825, 5f4c341, c8822ce | I1 tin đơn mở 404, I2 chuông xám trên điện thoại, I3 nút dải không tìm tin >100, I4 thiếu SYSTEM-DESIGN/CHANGE-GUIDE, 5b thiếu "· Toàn công ty" |

## Quyết định điều phối tự đưa ra (Ruling) — kèm giá nếu sai

1. ADR-0030 chưa lên main → dùng hợp đồng `bang-tin.ts` hiện tại (`handlerTruoc` không null, không `holdsPartner`); đổi khi gộp theo mục "Phụ thuộc ADR-0030" điểm 6. Sai: typecheck đỏ lúc gộp.
2. Sửa kế hoạch sau rà soát trước thi công: sửa thẳng 4 chỗ chặn, còn lại thành R1–R11 đứng trên chữ Task. Sai: người thi công đọc nhầm (người kiểm bắt).
3. Hoãn: đo CPU `tom-tat` (đặc tả §6.2), `goiSom` cho `tom-tat`/`da-gui`, chuông ở khung tạm. Sai: chậm/nhảy bố cục nhẹ.
4. Mở hộp làm tin quan trọng hết "chưa đọc" (số đỏ) nhưng dải + nút "Đã hiểu" vẫn còn — theo bản mẫu đã duyệt. Sai: sửa một dòng `thong-bao.ts`.
5. Tin quan trọng chưa hiểu: tính cho dải TRƯỚC khi cắt 100, không ghim vào danh sách hộp. Sai: người >100 tin chỉ thấy tin đó ở dải.
6. Chạy song song kiểm/thi công ở các tệp rời nhau để rút thời gian (chủ kêu chậm). Sai: commit xen nhau.
7. Thêm `nhomNhan` vào `TinDto` để đúng bản mẫu ("· Toàn công ty"). Sai: gỡ một trường.
8. Lệch cổng "Chế độ bảo trì" ở `web/account.ts` (ADMIN) so với máy chủ (SUPER_ADMIN) — có từ 7cd42bd, trước nhánh — không sửa ở đây, báo chủ.

## Sự cố

- **Cây dùng chung:** điều phối giao Task 6 khi trợ lý Task 5 còn chạy nền (tưởng xong vì đã có commit) → Task 5 commit thêm 0ad699a; trợ lý Task 6 lỡ `git checkout -- tests/e2e/thongbao.mjs` rồi dựng lại. Người kiểm độc lập xác nhận tệp hiện tại liền mạch, không mất/trùng ca. Riêng commit 0ad699a chạy lẻ sẽ đỏ (đã chứa ca Task 6). Bài học: chỉ coi trợ lý xong khi nhận báo cáo cuối.

## Nợ còn lại (không chặn gộp)

- Ca e2e "lập đơn kèm HDV → đúng một tin" — chờ ADR-0030 Task 1.3 lên main. Khi gộp ADR-0030: đổi `handlerTruoc: null`, bật ca test tài khoản lai, sửa hai kỳ vọng FIELD (đổi có chủ đích S20-6).
- K7: `order_handler_refused` chưa lên chuông (quyết định của chủ; thêm = migration mới + đổi test khoá).
- Kịch bản Chrome cố định cho thông báo chưa có (chỉ ảnh `docs/evidence/thong-bao/` + kịch bản tạm); ảnh mới có khổ 390 và 1280 (thiếu 768/1040/1440).
- e2e đủ bộ + `audit-invariants` chưa chạy trên nhánh: `catalog.mjs` "chốt chặn Sheet" đỏ ở mọi nhánh (Sheet thật 61→133 dịch vụ), sửa ở nhánh `sua-e2e-chot-chan-sheet`.
- Tiêu chí §8 chỉ đạt một phần: mục 2 (chuỗi Đối tác lập → S1 nhận → S2 thấy mờ chỉ có ở luật thuần), 6 (e2e không khẳng định "không có dòng mới" khi 403), 7 (không khẳng định `notice_revoked` và dải sau thu hồi), 9 (chuyển người phụ trách/rút quyền chỉ có ở luật thuần).
- Nhỏ: `listAcks` mỗi tin (≤100 truy vấn); `LIMIT 3000` chưa đo lượng thật; hai lần bấm "Đã hiểu" đồng thời trả `luc` của lần thua; chống gửi trùng đồng thời theo khuôn Góp ý nhưng chưa quan sát chặn thật trên D1 local; `GLOB 'quyen:[A-Z]*'` lỏng (mã kiểm `PERMISSION_CODES`); không hàng rào quét `DEFAULT datetime('now')`; trang Gửi thông báo khi không có quyền còn hai thẻ rỗng; ngăn thả xuống che nút dải ở máy tính; lớp CSS `.err`/`.icon-btn` tên chung; hàm tạo `#strips` chép hai nơi; `id` UUID chèn thẳng vào điều kiện SQL nhật ký (theo khuôn Góp ý).
- Kịch bản `v1-bao-tri.mjs`, `dot-c-smoke.mjs` cũ (dùng tài khoản chỉ-ADMIN cho bảo trì).

## Lượt 2 — Web Push màn hình khoá (ADR-0036, 2026-09-27/28)

- Kế hoạch `docs/superpowers/plans/2026-09-27-thong-bao-luot-2-web-push.md` (5 task, cách B). Kiểm độc lập: Task 1; Task 2+3; rà cuối toàn lượt; kiểm lại phạm vi lượt sửa gom. Chrome thật (có cửa sổ): bật → gửi → hiện thông báo → tắt → đăng xuất huỷ máy.
- Quyết định điều phối: `thongbao` tới DO `BangTin` qua hàm tiêm `giaoLoDay` (không thêm cạnh module); thêm/gỡ Face ID cũng tắt máy (phía an toàn); `GET /api/account/thong-bao/may?endpoint=` có thể làm địa chỉ máy hiện trong Workers Logs — chấp nhận vì địa chỉ vô dụng nếu không có khoá bí mật (sai thì đổi sang POST).
- Nợ: chưa thử iPhone thật, >40 máy, 410 thật, Apple nhận JWT 12 giờ; nút Đăng xuất ở màn bảo trì (`web/maintenance-screen.ts`) chưa huỷ máy; `khopCapKhoa` chỉ so x/y; 410 từ DO ghi ở lần gửi >40 kế tiếp; ca 8 e2e bangtin chập chờn khi máy bận; sổ hàng rào: vế "ngưng tài khoản" chưa quan sát đỏ riêng; kịch bản `dot-c-smoke.mjs` lỗi có sẵn (canToggle cần SUPER_ADMIN).

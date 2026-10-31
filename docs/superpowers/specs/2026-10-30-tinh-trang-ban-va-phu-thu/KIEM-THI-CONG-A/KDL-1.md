# KĐL-1 — Kiểm độc lập T1–T4 (ADR-0146 + ADR-0152)

> Hồ sơ có ngày 30/10/2026. Người kiểm: subagent `nguoi-kiem-doc-lap`, chỉ đọc. Người điều phối chép nguyên ý báo cáo (subagent chỉ đọc, không ghi tệp). Phạm vi: commit `d54de33f`, `032991b9`, `719011aa`, `44d01ab2`.

## Kết luận: **ĐẠT** — không mục CHẶN; hai mục NÊN SỬA; vài GHI NHẬN.

## Bằng chứng người kiểm tự chạy
- `node --test src/migrations-dac-diem-dich-vu.test.ts src/migrations-luat-ban.test.ts src/modules/pricing/luat-ban-rules.test.ts src/modules/catalog/dac-diem-rules.test.ts src/architecture.test.ts src/audit-invariants.test.ts src/hang-du-lieu.test.ts src/bang-tu-giao-dien.test.ts`: 292/292 qua.
- `npm run typecheck`: 0 lỗi. `node --test src/phat-hien-han.test.ts`: 2/2 xanh (30/10, chưa quá hạn HC-5.19).
- Không chạy `npm test` toàn bộ (dùng số của người thi công trong sổ: 6831 bài, 0 đỏ), không chạy `db:migrate:local`.
- Đột biến trên bản sao tạm ngoài repo (`/tmp/kdl1/w`), mỗi lần chép lại tệp gốc:
  1. Bỏ trigger `prc_sales_block_role_ok` (0129) → đỏ «not ok 6 … loại không trong danh sách được hưởng, hoặc đang tắt», «not ok 2».
  2. `chanBan` bỏ `hieuLuc`, chỉ xét `validTo` → đỏ «not ok 9 - Hiệu lực R-1 … luật tương lai chưa chặn; khoảng rỗng không bao giờ chặn».
  3. Bỏ trigger R-8 `ctl_attribute_off_in_use` (0128) → đỏ «not ok 200 - tiêu chí 6 (R-8)», «not ok 124 - R-CTL-2».
  4. `ngayKetThucLuat` bỏ vế «bắt đầu − 1» → đỏ «not ok 11 - ngayKetThucLuat (R-1)».
  5. Bỏ trigger `ctl_attribute_assignment_only_close` (0128) → đỏ «not ok 4 - tiêu chí 5 (ADR-0152)».

## Mục 1 — hai migration đối chiếu ADR: khớp
- Không khoá ngoại nhiều cột (0128:28, 53–56; 0129:15, 18–20); `SERVICE.catalog_code` không khoá ngoại như `prc_commission_rule`.
- Không `INSERT` gieo; bài (j) quét cả hai tệp. Không cột «cho phép» (bài (b) ghim tập cột).
- CHECK ba kiểu phạm vi `0129:22–24`; `scope` tập đóng ba giá trị (dòng 16).
- Trigger 0128 đủ (cấm xoá ba bảng; giữ khoá; chỉ-đóng dòng gắn; giá trị thuộc đặc điểm + đang bật lúc thêm; R-8). Trigger 0129 đủ (`no_delete`, `close_only`, `role_ok`, `value_ok` — giới hạn bằng `WHEN` để CHECK báo trước khi thiếu giá trị: hợp lý).
- Hai view chỉ khoá. Không `date('now')`; `date(valid_from_date,'-1 day')` là phép tính trên cột.

## Mục 2 — luật thuần: đúng
- `chanBan` dùng chung `hieuLuc` (`pricing/rules.ts:59`); `docGhiChu` được `export` thêm (1 dòng, vô hại).
- `phu()` đúng ba vế ADR-0152 Đ2; chưa khai không phủ; «chặn thắng», không thứ tự ưu tiên.
- `dac-diem-repo.ts`: SQL tĩnh `defineSql`, không `DELETE`/`OR REPLACE`, tắt có `NOT EXISTS` dòng mở, đóng/mở theo khoá lạc quan, mở khi `changes() > 0`. `tenDacDiemTheoMa` (`catalog/index.ts:48`) là hàm hẹp theo mã giá trị — đúng R-3, (l2).

## Mục 3 — tự tính lại: khớp
- `ngayKetThucLuat` (hôm nay 10-30): bắt đầu 10-23 → 10-29; 10-30 → 10-29; 11-06 → 11-05; hẹn 10-30 với bắt đầu 10-23 → hợp lệ.
- `hieuLuc`: kết thúc hôm qua → hết chặn hôm nay; hôm nay → còn chặn; tương lai → chưa; khoảng rỗng → không bao giờ.
- Bảng (h) 12 ô tính tay khớp `DAP_AN` (`migrations-dac-diem-dich-vu.test.ts:142–170`). Hạn chế: không chạy view trên D1 thật.

## Mục 5 — sổ hàng rào: 7 dòng (h, j, f, l1, l2, b, g) có ngày 2026-10-30, đột biến, câu đỏ. Tự thử lại R-8 và `role_ok`; chưa tự thử lại (f), (l1), (l2), (j) (cần dựng bản sao lớn ngoài brief).

## Mục 6 — R-CTL-2 bỏ vế «nhóm đang tắt»: lý do ĐÚNG
`catalog/index.ts:273–276` chỉ chặn tắt nhóm còn dịch vụ; `nhom-route.test.ts:172` «tắt nhóm rỗng: 200». Vế `fail` sẽ báo sai. Ý kiến: chọn (b) — thêm nhánh `warn`, vì bật lại nhóm làm giá trị cũ sống lại mà không ai thấy (route bật lại chỉ kiểm trùng tên, `index.ts:266–270`). Việc chọn thuộc chủ.

## NÊN SỬA
1. Trigger `prc_sales_block_value_ok` (`0129:49–51`) chỉ xét giá trị đang dùng, không xét **đặc điểm cha** đang dùng ⇒ thêm được luật trỏ giá trị bật dưới đặc điểm đã tắt. Đề xuất chặn ở route T6 (409) và/hoặc thêm cột `attribute_active` vào `v_ctl_attribute_value`.
2. Chưa có hàng rào cho «tắt đặc điểm / giá trị còn luật bán trỏ tới». Đưa vào tiêu chí T6/T7.

## GHI NHẬN
- CHECK `date()` trên D1 remote chưa thử; D1 local (miniflare) đã thử theo sổ; e2e T14 + runbook bắt tiếp.
- `0128`: một câu `CREATE INDEX … WHERE active = 1;CREATE TRIGGER …` chung dòng — hợp lệ, nên xuống dòng (chữ).
- `dac-diem-repo.test.ts` viết sau mã (người thi công tự khai).

## Người điều phối xử lý (30/10)
- NÊN SỬA 1: giao đợt 2 (T6) siết cả route (409 `sales_block_value_inactive` khi đặc điểm cha tắt) lẫn CSDL (thêm `attribute_active` vào view `v_ctl_attribute_value` — chỉ khoá/cờ, không tên — và trigger `value_ok` đòi cả hai đang bật). 0128/0129 chưa áp remote nên sửa được.
- NÊN SỬA 2: **không sửa** — ADR-0152 / trang ghép 3b cho phép tắt giá trị còn luật trỏ tới có chủ ý (luật hiện «Không phủ dịch vụ nào»; bật lại có cảnh báo «còn N luật»). Ghi nhận.
- R-CTL-2: câu chờ gom số 2 (sổ thi công).

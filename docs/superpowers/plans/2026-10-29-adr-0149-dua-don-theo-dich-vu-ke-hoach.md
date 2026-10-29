# Kế hoạch thi công ADR-0149 Đ1 — đưa đón theo từng dịch vụ (29/10)

Nguồn: `docs/adr/ADR-0149-dua-don-theo-dich-vu-rieng-thang-chung.md` (accepted 29/10). Chỉ Đ1 (không tiền). Đ2 đi cùng lượt phí đón (ADR-0147), không làm ở đây.
Người thi công: phiên «so-cong-no-kiem» (nhánh `claude/service-group-pickup-setup-ae4465`). Kiểm: người kiểm độc lập chỉ đọc sau thi công (việc lớn: dữ liệu).

## Ruling của người thi công (ghi lại, đảo được)
- **R-0149-A (mẫu chặng sẵn có).** Mỗi dịch vụ đã có «mẫu đưa đón» của `van-chuyen` (Không đưa đón / Một chiều / Hai chiều, ADR-0054, ADR-0076, ADR-0134 Đ7) — chỉ là GỢI Ý cho form, không chặn. ADR-0149 không nhắc tới nó. Thi công: ô mới «Được đón không» (Theo nhóm / Luôn đón / Không đón) đặt **trong cùng khung «Đưa đón»** của màn Danh mục, tách khỏi phần gợi ý; mẫu không đổi nghĩa. Dịch vụ «Không đón» thì form vẫn ghi «Không đón» (R-M) bất kể mẫu.
- **R-0149-B (câu báo lỗi).** Câu `transfer_disabled` hôm nay luôn mở đầu «Nhóm dịch vụ đã tắt đưa đón» — sai khi lý do là ô riêng của dịch vụ. `catalog` công bố thêm hàm hẹp `maDatKhongDon(db, codes)` (mã nào đang `NEVER`); `orders` dùng nó để viết câu đúng. Cổng chặn (đọc view) không đổi. Câu cho trường hợp chỉ do nhóm giữ nguyên từng chữ.
- **R-0149-C (dòng hiệu lực).** «Hiệu lực» = dòng chưa có `valid_to_at` (không đặt trước ngày tương lai). Đổi ô có hiệu lực ngay.

## Task (mỗi task đỏ trước, xanh sau)
1. **Migration `0127_dua_don_theo_dich_vu.sql`**: bảng `ctl_service_transfer_rule` (mã dịch vụ → `catalog_item`, `mode` ALWAYS/NEVER, `valid_from_at`, `valid_to_at`, người tạo, người kết thúc), chỉ mục duy nhất một phần (một dòng mở mỗi mã), trigger cấm xoá và cấm sửa ngoài việc đóng dòng một lần; dựng lại view `v_ctl_service_transfer` (cùng cột). Bài: `src/migrations-dua-don-dich-vu.test.ts`.
2. **Luật thuần + kho SQL**: `src/shared/dua-don-dich-vu.ts` (ba lựa chọn, nhãn); `choPhepDuaDon` nhận thêm quy tắc dịch vụ; câu SQL ở `catalog/nhom-repo.ts` (defineSql). Bài: so khớp hàm thuần ↔ view ở mọi tổ hợp (tiêu chí 4).
3. **Route** `PUT /api/catalog/:code/transfer-rule` (`admin` + `admin.manage`, khoá lạc quan theo lựa chọn đang có, nhật ký `catalog_service_transfer_set`); DTO quản trị có `transferRule`; DTO form dùng cùng hàm. Bài: route + quyền (tiêu chí 6), đơn bị chặn / được mở (tiêu chí 1–3), câu báo (R-0149-B).
4. **Giao diện** màn Danh mục: ô ba lựa chọn trong khung «Đưa đón», chip ở dòng/thẻ khi khác «Theo nhóm». Kịch bản Chrome theo `web/CLAUDE.md` (`danh-muc-nhom-smoke.mjs`, `dot-a-smoke.mjs`).
5. **Tài liệu**: `docs/data-dictionary.json` + `npm run dict`; `docs/SYSTEM-DESIGN.md` (bảng mới); bài kiến trúc `orders` không đọc bảng mới (tiêu chí 7); mục nhật ký thay đổi (số tạm).
6. Typecheck, `npm test`, e2e `dua-don-theo-nhom`; người kiểm độc lập.

Tiêu chí 5 (đồng bộ Sheet không đụng bảng): dựa vào việc đồng bộ chỉ ghi `catalog_item` và `catalog_sync_state` — kiểm bằng bài quét câu SQL của đồng bộ.

## Kết quả thi công (29/10)
- Xong Task 1–5 trên nhánh `claude/service-group-pickup-setup-ae4465` (main + migration 0127). Chưa gộp, chưa triển khai.
- `npm run typecheck` 0 lỗi. `npm test` (cây trước hai sửa LOW): 6.623 đạt, 0 đỏ. Sau sửa LOW-2/LOW-3 chạy lại các bài liên quan: xanh.
- e2e `dua-don-theo-nhom`: xanh. Kịch bản Chrome mới `docs/evidence/2026-10-29-dua-don-theo-dich-vu/kich-ban/dua-don-dich-vu-smoke.mjs`: 4/4 (1040 + 390).
- `dot-a-smoke.mjs` (kèm `AXE_JS`): `dich-vu` đạt hai khổ, axe không vi phạm; dừng ở bước `nhat-ky` — đỏ sẵn từ ADR-0038 (đã ghi ở `web/CLAUDE.md`).
- `danh-muc-nhom-smoke.mjs`: đỏ ở bước 2 (`/api/catalog/groups: 401`) — **đỏ sẵn trên `origin/main` fb538739** (chạy lại trên bản sao sạch của main cùng ngày, cùng lỗi), không do việc này. Ghi nợ, nguyên nhân chưa tra (đoán: kịch bản đăng nhập Quản trị hai lần, phiên đầu bị thay — chưa kiểm).
- Người kiểm độc lập chỉ đọc (29/10): **ĐẠT CÓ ĐIỀU KIỆN**, không HIGH. LOW-2 (X → Y ghi đè «Theo nhóm» vừa đổi) đã sửa: câu mở đòi câu đóng đã đổi dòng; bài đua mới đỏ với mã cũ, xanh với mã mới. LOW-3 (chú thích gắn nhầm) đã sửa. LOW-1 (trigger không ép `updated_at` = `valid_to_at`) chấp nhận — nhật ký ghi người đổi thật.

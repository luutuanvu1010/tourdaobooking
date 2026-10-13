# Phụ lục G — Vận hành và khôi phục

> Mốc `483b3aa0`. Người kiểm chạy 3 tệp test lẻ với đồng hồ giả, gọi hàm thuần của hook `evaluateDenyOnly` với 30 chuỗi lệnh (không lệnh nào được thực thi), và dựng DB sqlite giả lập. Số điện thoại thật chỉ ghi tệp:dòng, đã che.

## Kiểm tra production do điều phối tự chạy (chỉ đọc)

- `wrangler d1 migrations list tourdao-sales-db --remote` → "No migrations to apply" (13/10).
- `wrangler deployments list` → lần gần nhất 13/10 02:29 và 03:15 UTC (Version `89eed59f`, 10:15 giờ Việt Nam), khớp hồ sơ 13/10.
- `GET https://booking.tourdao.vn/api/orders` chưa đăng nhập → 401; `/api/version` → 404 (không có route công khai này).
- `audit-invariants.mjs --db remote`: **máy phân quyền từ chối** ("Production Reads"). Không lách. **Chưa kiểm**; khẳng định "mọi bất biến đạt" của hồ sơ 13/10 chưa được xác minh lại.

## Phát hiện

| Mã | Mức | Chuyện gì | Tái hiện | Tệp:dòng | Xử lý |
|---|---|---|---|---|---|
| G-1 | Medium | **Từ 1/11/2026 không có đường phát hành chính thức nếu chủ chưa gia hạn sổ hoãn.** Năm mục hạn 2026-10-31: TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-4.2. | Đã chạy: `FAKE_NOW=2026-11-01T03:00:00Z` với đồng hồ giả + `src/phat-hien-han.test.ts` → bài 2 đỏ, nêu đúng 5 mã. `day-len` (`release-lib.mjs:225`) và `trien-khai` (`:360`) đều chạy `npm test` và dừng khi đỏ; cổng xanh (`.claude/hooks/cong-xanh-lib.mjs`) giữ mọi phiên AI ở nhánh khác `main`. Lỗi nóng sau khi mở không phát hành được cho đến khi chủ sửa `han` bằng tay. | `docs/quyen-hoan.json`; `scripts/release-lib.mjs` | Chủ quyết trước 31/10: vá hoặc gia hạn có lý do. Cân nhắc đường khẩn có ghi nhật ký cho `trien-khai`. Lớn (luật). |
| G-2 | Medium | Sau khi áp migration, nhánh `wrangler deploy` lỗi/bị ngắt không in lệnh deploy lại, và mục HANDOFF 1.86–1.88 không còn dòng "mốc lùi" kèm phân tích an toàn lùi mã. | `release-lib.mjs:~425` chỉ in "Worker có thể CHƯA đổi… không rollback tự động", không nhắc migration đã áp, không gọi `inLenhDeployDungMa`. Nhánh `migrations apply` lỗi (`:410`): các migration đứng trước trong lô có thể đã áp (hành xử wrangler: chưa kiểm). Không lưu trạng thái: đóng Terminal giữa hai bước thì lần sau thấy "No migrations to apply". Mã cũ trên schema mới dễ hỏng vì trigger siết ghi `0043`, `0081`. `wrangler.jsonc`: sau migration Durable Object "v1", `wrangler rollback` về mọi bản trước nó bị chặn. | `scripts/release-lib.mjs`; `docs/HANDOFF-N1.md:69,163,181` | In lệnh deploy ở mọi nhánh sau khi đã áp; ghi bảng lùi mã mỗi bản. Nhỏ. |
| G-3 | Medium | Sao lưu: chỉ Time Travel; **không có bản xuất ngoài Cloudflare**, và "bản xuất hằng tuần" (RPO 1 tuần trong spec) không được tự động hoá. | Spec `2026-09-22-dien-tap-khoi-phuc.md` §1–2 nói không có bản sao ngoài Cloudflare; `grep "d1 export"` chỉ thấy `tach-ban-xuat-d1.mjs`; Cron chỉ đồng bộ danh mục. Điểm khôi phục Time Travel chỉ in ra màn hình rồi chủ tự dán vào HANDOFF; `HANDOFF-N1.md:326` ghi một lần lệnh đã in nhưng chủ không thấy. Thử trên sqlite: tách schema bằng `tach-ban-xuat-d1.mjs` rồi nạp lại đủ 110 bảng/360 trigger/39 view/253 index — chưa phải diễn tập có dữ liệu. Thời hạn Time Travel của gói đang dùng: chưa kiểm. | `scripts/tach-ban-xuat-d1.mjs`; `wrangler.jsonc`; `src/index.ts:219` | Diễn tập khôi phục (HC-5.19) + bản xuất định kỳ ra ngoài. Vừa. |
| G-4 | Medium | Dữ liệu cá nhân thật nằm trong repo (repo hiện riêng tư). | Hai SĐT thật theo chính tài liệu repo: số Giám đốc (che `0989…xxx`) ở `migrations/0016_maintenance.sql:22`, `src/shared/maintenance.ts:11` (hằng liên hệ có chủ ý hiển thị công khai), và nhiều test/kịch bản (23 tệp); số thứ hai (`0914…xxx`) ở `docs/adr/ADR-0038…:12`, `ADR-0044…:12`. Nghi là thật: một số `0845…xxx` kèm họ tên thật trong 10 tệp (gồm `src/migrations-n1.test.ts:171`, `src/modules/accounts/patch-staff.test.ts:70`); ba số kèm tên khách ở `docs/evidence/2026-10-02-trang-chu-quan-tri/kich-ban/xem-truoc.mjs:37-39`. `SERVICES_SHEET_ID` ở `wrangler.jsonc:19` (Sheet ghi là chỉ đọc công khai). Không thấy khoá/token thật (hai chuỗi `sk-…` là giá trị thử), CCCD thật, MST lạ. | `git grep` các mẫu SĐT/khoá | Nếu chia sẻ repo thì thay bằng số giả trong test/tài liệu. Nhỏ nhưng nhiều tệp. |
| G-5 | Low | Lỗ của hook `guard-remote` (chỉ mô tả; chỉ gọi hàm thuần). Cho qua: `gh api -X PUT …/merge`, `gh api …/merges`, `curl` tới `api.cloudflare.com` (D1 query), `python -c`/`node -e` gọi production, `wrangler d1 execute … --local --remote` (có `--local` là miễn), `wrangler kv/r2 … put`. Hook mở khi lỗi nội bộ/đầu vào hỏng (`guard-remote.mjs:23`); lệnh > 200.000 ký tự chỉ phân tích đầu. `permissions.deny` không có mẫu `d1 execute`. | Hàm thuần với 30 chuỗi lệnh. | `.claude/hooks/guard-remote.mjs` | Hook tự nhận giới hạn "chặn nhầm/quên, không chống cố ý". Báo chủ theo CLAUDE.md §8, không tự sửa. |
| G-6 | Low | `tests/e2e/lib.mjs:10` không từ chối `E2E_BASE_URL` trỏ production; chỉ hook chặn khi biến nằm trong cùng lệnh. | Đọc mã. | `tests/e2e/lib.mjs:10` | Thêm kiểm từ chối host production. Nhỏ. |
| G-9 | Low (chỉ ảnh hưởng người phát triển) | Kịch bản e2e `catalog` chập chờn: chờ cố định 3 giây sau `/__scheduled?cron=…` rồi đọc nhật ký `catalog_synced` mới nhất; khi tác vụ chưa kịp ghi (đang đọc Sheet thật) thì thấy dòng cũ của 'QTV Test'. | Lần chạy đầy đủ: `AssertionError … actual 'QTV Test', expected 'Hệ thống (tự động)'` tại `tests/e2e/catalog.mjs:292`; chạy lại `npm run test:e2e -- catalog` → 4/4 xanh. | `tests/e2e/catalog.mjs:286-292` | Thay chờ cố định bằng vòng chờ có hạn. Nhỏ. |
| G-7 | Low | Danh sách ngoại lệ `architecture.test.ts`: xem phụ lục A. | | | |
| G-8 | Low | Lỗi tài liệu: `quyen-hoan.json` còn ghi "CHƯA lên production" cho migration 0078–0088 (đã lên ở 1.84/1.86); ghi chú mặc định cũ trong `audit-invariants.mjs:23`. | | | |

## Lịch hết hạn (kèm hệ quả)

| Ngày | Mục | Hệ quả khi quá hạn |
|---|---|---|
| 2026-10-31 | TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-4.2 | Từ 1/11 `phat-hien-han.test.ts` đỏ ⇒ `npm test` đỏ ở mọi nhánh, `day-len`/`trien-khai` dừng, cổng xanh giữ phiên AI. Không ảnh hưởng người dùng cuối. |
| 2026-11-15 | HC-5.11 | cùng cơ chế |
| 2026-11-30 | `task.progress`, `dispatch.guides.view` | `permission-enforcement.test.ts` đỏ |
| 2026-12-31 | `invoice.request`, `invoice.issue` | cùng. Đã chạy đồng hồ giả 2027-01-05: `permission-enforcement` bài 2 đỏ nêu 4 ô; `route-write-guard` xanh 12/12. |
| 2027-03-31 | `catalog` LEGACY (`architecture.test.ts:110`), `DOC_AUDIT_LOG_WONGUARD` (`:186`) | `architecture.test.ts` đỏ |

Không tìm thấy mốc ngày làm hỏng chính production: `MOC_TIN_DOI`/`MOC_TIN_CAP_NHAT` (2026-10-12) là hằng quá khứ cố định; chế độ bảo trì chỉ tự tắt.

## Đã kiểm, sạch

- **Lối thoát chủ bị khoá**: câu `UPDATE mnt_setting SET enabled = 0 WHERE id = 'default'` (`HANDOFF-N1.md:821`) đã chạy trên DB giả lập dựng từ migration: 1 dòng đổi, `ends_at` giữ nguyên. Bảo trì tối đa 7 ngày, tự tắt khi hết giờ; chỉ `settings.ops` (Toàn quyền) bật được; tài khoản giữ `SUPER_ADMIN` được miễn; Cron và route công khai (`/api/company`, `/api/auth/*`) không bị chặn — đúng thiết kế. Chạy câu SQL thật trên D1 remote: chưa kiểm (cấm).
- **Bí mật**: `git grep` khoá/token/`BEGIN PRIVATE`: chỉ hai chuỗi `sk-…` giả. `.gitignore` có `.dev.vars`, `*.local.sql`, `.wrangler`. Ảnh trong `docs/evidence` không grep được.
- **Chưa kiểm**: hành vi D1 thật (cascade, lô lỗi một phần); thời hạn Time Travel; quét đồng hồ giả toàn bộ ~4.400 bài (chỉ thử 3 tệp).

# Trợ lý Hỗ trợ tìm đoạn theo nghĩa trộn từ khoá (ADR-0076, lượt 2) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mỗi câu hỏi (route hỏi và ô thử) chọn đoạn hướng dẫn bằng điểm trộn RRF của từ khoá (BM25 như hôm nay) và độ giống cô-sin của "dấu vân nghĩa" OpenAI; dấu vân của đoạn kho tính một lần rồi lưu ở bảng chỉ-thêm `tl_van_nghia`; lỗi / quá giờ / sắp vượt trần ⇒ lùi về từ khoá; tiền embedding vào lượt và vào kiểm trần trước MỌI lần gọi; ô thử hiện "Đoạn đã dùng".

**Architecture:** Luật thuần mới ở `src/shared/tro-ly-van-nghia.ts` (hằng mẫu / giá, khoá đoạn SHA-256, cô-sin, mã hoá BLOB float32, chia lô, đọc phản hồi Embeddings, mức trần trên, `chonDoanTron`); `src/shared/tro-ly.ts` tách phần điểm từ khoá (`diemTuKhoa`, `heSoVai`, `layTheoNganSach`) để `chonDoan` cũ và `chonDoanTron` dùng chung. Module `tro-ly` thêm tệp `van-nghia.ts` (gọi `/v1/embeddings`, bộ nhớ isolate, tính bù, lùi) — **một** hàm `timDoanTheoNghia` cho cả route hỏi và ô thử; SQL `tl_van_nghia` chỉ ở `repository.ts`. Kiểm trần vẫn là **một** hàm `kiemTranTruocKhiGoi` (đổi thành mức trần trên, chạy TRƯỚC embeddings).

**Tech Stack:** TypeScript (Cloudflare Worker), D1/SQLite (BLOB lần đầu trong repo), `node --test` chạy `.ts` trực tiếp (Node 22), esbuild, giao diện thuần `h()`, OpenAI Embeddings API (`POST /v1/embeddings`) + Responses API, e2e trên D1 local tạm với máy OpenAI GIẢ, kịch bản Chrome qua CDP.

**Spec:** `docs/superpowers/specs/2026-10-01-tro-ly-tim-theo-nghia/ADR-0076-tro-ly-tim-theo-nghia.md` (accepted 2026-10-01) + `docs/superpowers/specs/2026-10-01-tro-ly-tim-theo-nghia/dac-ta.md` (đã duyệt 2026-10-01). Đọc CẢ HAI trước Task 0; mã tiêu chí V1–V5, C1–C5, L1–L2, P1–P3, H1, G1–G2 dẫn từ đặc tả §2.

**Vai:** phiên thi công không tự nghiệm thu (Hiến pháp N8). Việc lớn (dữ liệu: bảng mới + migration; tiền: chi phí lượt + trần) ⇒ Task 9 bắt buộc người kiểm độc lập `nguoi-kiem-doc-lap` (chỉ đọc).

**Mốc mã:** `origin/main` = `c62ffc6d` (production 1.54). Nhánh `tro-ly-tim-theo-nghia`, worktree `.claude/worktrees/tro-ly-tim-theo-nghia`.

---

## Điểm dừng (gom một lần hỏi; phần không phụ thuộc vẫn làm tiếp)

| # | Khi nào | Hỏi ai | Phần bị chặn | Phần vẫn làm được |
|---|---|---|---|---|
| D1 | **Task 1 bước 1**: tra trang chính thức OpenAI KHÔNG xác nhận được một trong: giá `text-embedding-3-small` = **0,02 USD / 1 triệu token**; tham số `dimensions` nhận cho `text-embedding-3-*`; giới hạn một yêu cầu **≤ 2.048 đầu vào, ≤ 8.192 token / đầu vào, ≤ 300.000 token / yêu cầu**; thân phản hồi `data[].index`, `data[].embedding`, `usage.prompt_tokens` | điều phối viên — **không bịa giá** | Task 1 trở đi phần có giá / lô | Task 0, Task 3 (migration) |
| D2 | Task 0 bước 1: Write vào `docs/adr/` bị luật `ask Edit(docs/adr/**)` hỏi quyền | chủ bấm "Yes" | chỉ bước đó | Task 1 trở đi (bản nháp ADR vẫn ở thư mục đặc tả) |
| D3 | **Task 2 bước 2**: số khớp mạnh trên kho thật KHÔNG ra **1 / 10 / 41** (câu than phiền / đổi PIN / lập đơn, vai Bán hàng) | điều phối viên | C4 | các task khác |
| D4 | **Task 6 bước 3**: e2e trên `wrangler dev` thật cho thấy D1 KHÔNG nhận `Uint8Array` làm BLOB (dòng `tl_van_nghia` = 0 hoặc lỗi CHECK) — làm nhánh B của bước đó (bind `ArrayBuffer`); nếu cả nhánh B cũng hỏng | điều phối viên | Task 6 (từ bước 4), Task 7–9 | tài liệu Task 8 |
| D5 | Bất kỳ lúc nào thấy cần ô `MATRIX` mới hoặc cạnh `ALLOWED_EDGES` mới (`src/architecture.test.ts`) | chủ dự án (qua điều phối) | task đang làm | task khác |
| D6 | Trước khi gộp / triển khai: (a) migration số tạm `0062` (main tới `0060`; `0061_aut_session` ở nhánh đăng nhập) ⇒ người gộp đổi số theo `ls migrations` lúc gộp; (b) bảng có cột BLOB **chưa thử trên D1 remote** (chỉ `node:sqlite` + D1 local của `wrangler dev`); (c) số nhật ký thay đổi tạm `1.55` | chủ dự án | `npm run day-len` / `npm run trien-khai` (chủ tự chạy) | toàn bộ thi công |
| D7 | Sau triển khai: chạy lại 12 câu mẫu (`docs/evidence/2026-10-01-tro-ly-thong-minh/bo-cau-mau.md`) với OpenAI thật để đánh giá ngưỡng cô-sin 0,3 | chủ dự án (AI không gọi API production, không nạp khoá thật) | phần "đánh giá thật" | toàn bộ thi công |

**Không có câu hỏi chặn ngay từ đầu.** ADR + đặc tả đã chốt mọi quyết định cấu trúc. Các lựa chọn dưới đây do người lập kế hoạch tự quyết (P8), ghi để chủ xem; hoàn tác được trong mã:

- **R1 (cách đọc V5, đã áp):** bộ nhớ isolate CHỈ nạp véc-tơ **đọc được từ D1**; véc-tơ vừa tính bù chỉ dùng trong request đó. Lý do: đường đọc BLOB thật (giải mã `vec` do D1 trả về) phải chạy ít nhất một lần mỗi isolate — nếu nạp véc-tơ vừa tính vào bộ nhớ, e2e / Chrome không bao giờ giải mã BLOB thật. Hệ quả: câu 1 tính bù (D1 đọc 1 lần, không dòng), câu 2 đọc D1 1 lần (nạp bộ nhớ), câu 3 không đọc D1.
- **R2 (luật khớp mạnh, đo lại 2026-10-01 trên worktree):** "điểm BM25" của luật 0,7 = điểm **đã nhân hệ số vai** (như `timDoan` hôm nay); "khớp cặp" = một cụm hai âm tiết liền nhau của `tachTu` (cụm có MỘT âm tiết là từ dừng vẫn tính, như `tachTu` sinh); "≥ 2 từ khác nhau" = số **âm tiết đơn** khác nhau của câu hỏi có trong đoạn. Định nghĩa này cho đúng 1 / 10 / 41 với vai Bán hàng (`["SALES"]`). Lưu ý: số của câu than phiền **đổi theo vai** (không vai: 17; Quản trị / Toàn quyền: 6) — vì luật 0,7 tính trên điểm đã nhân vai; ADR đo ở vai Bán hàng.
- **R3 (ngưỡng, hằng):** `NGUONG_COSIN = 0.3`, `K_RRF = 60` (giá trị RRF chuẩn). Ngưỡng chỉ đánh giá được với véc-tơ thật (D7); đổi = sửa hằng + bài thuần.
- **R4 (hợp đồng ô thử):** `chiPhiMicroUsd` / `chiPhiUsd` của phản hồi ô thử GIỮ nghĩa cũ = **tiền mẫu trả lời**; `chiPhiVanNghiaMicroUsd` = tiền embedding của lượt thử; dòng `tl_luot_hoi.chi_phi_micro_usd` = tổng hai phần (P1). Đặc tả H1 nói "tách khỏi tiền mẫu".
- **R5 (thứ tự gọi):** băm → đọc bộ nhớ / D1 → kiểm tiền tính bù (Đ5(2), không gọi API nào nếu vượt) → embedding câu hỏi (một yêu cầu riêng) → tính bù theo lô → ghi D1 (chỉ khi MỌI lô thành công — L2). Câu hỏi đi trước để câu hỏi lỗi thì không tốn tiền tính bù.
- **R6 (ghi D1):** MỘT câu `INSERT … ON CONFLICT(khoa) DO NOTHING` mỗi dòng (5 tham số — xa trần 100 tham số của D1), gom `LO_GHI_D1 = 50` câu một `db.batch`. Kho 214 đoạn + tối đa 30 đoạn ngữ cảnh ⇒ ≤ 244 câu ghi ở lần tính bù đầu, dưới trần 1.000 câu D1 / request của gói trả phí (`docs/SYSTEM-DESIGN.md` §12); bài canh ở Task 1 đỏ nếu kho vượt 600 đoạn.
- **R7 (bind BLOB):** bind `Uint8Array` trước (node:sqlite nhận); e2e trên `wrangler dev` quyết (Điểm dừng D4); CHECK `typeof(vec) = 'blob' AND length(vec) = so_chieu * 4` làm sai kiểu thất bại ồn ào, không ghi rác.
- **R8 (áp luật cao hơn, không phải lệch):** `tl_van_nghia` thêm `created_by`, `updated_at`, `updated_by` (đặc tả §3 chỉ ghi `created_at`) vì bài ADR-0003 trong `src/architecture.test.ts:328` bắt mọi bảng mới có đủ bốn cột kiểm toán; thêm `CHECK (length(khoa) = 64)`.
- **R9 (bài cũ):** máy OpenAI giả của ba tệp bài route cũ + bài "Phòng thủ" trả **503** cho `/v1/embeddings` ⇒ các bài cũ chạy đúng luật cũ (lùi từ khoá) và tiếp tục canh hồi quy của đường lùi; đường mới được canh ở tệp bài mới `van-nghia-route.test.ts`.

## Global Constraints

- Tiếng Việt CÓ DẤU ở mọi chữ người dùng thấy, câu lỗi, commit, tài liệu; không lộ mã thô hay chữ Anh (nhãn "khớp nghĩa" / "khớp từ khoá", không "embedding").
- Tiền: **micro-USD, INTEGER, tính ở máy chủ**, làm tròn LÊN; giá trong mã là micro-USD / 1 triệu token (`GIA_NHUNG = 20_000` = 0,02 USD / 1M — tra lại ở Task 1).
- Mẫu embedding là **hằng trong mã** (`text-embedding-3-small`, `dimensions: 512`); cùng khoá `OPENAI_API_KEY`; thân yêu cầu ĐÚNG bốn khoá `model`, `input`, `dimensions`, `encoding_format` — không `user` / định danh (G2).
- Chỉ gửi OpenAI: câu hỏi ĐÃ CHE (`cheCauHoi`) + câu hỏi trước đã che (`truyVanTim`) hoặc nội dung đoạn kho đã định dạng (`dinhDangDoan`).
- Hạn giờ embeddings riêng **8 giây** (`HET_GIO_NHUNG_MS`); ngân sách tài liệu **6.000** token, tối đa **12** đoạn, trọng số vai ×1,5 / ×1 / ×0,6 — giữ nguyên.
- Luật khớp mạnh (ADR-0076 Đ3): khớp ≥ 1 cặp âm tiết liền nhau của câu hỏi, HOẶC (điểm BM25 ≥ **0,7** × điểm cao nhất VÀ khớp ≥ **2** âm tiết đơn khác nhau).
- Log khi lùi: ĐÚNG chuỗi `{"event":"tro_ly_van_nghia_loi"}` — không nội dung, không lý do kèm chữ.
- Không ô `MATRIX` mới, không cạnh `ALLOWED_EDGES` mới (D5); không route mới; không ô chỉnh cách tìm trong giao diện.
- Bảng mới chỉ-thêm (trigger chặn `UPDATE` / `DELETE`); ghi chỉ bằng `INSERT … ON CONFLICT(khoa) DO NOTHING` (cấm `OR REPLACE` — `src/architecture.test.ts:389` bắt).
- Module nghiêm: SQL chỉ ở `src/modules/tro-ly/repository.ts`, qua `defineSql`, câu tĩnh (danh sách khoá đi bằng MỘT tham số JSON `json_each(?1)`).
- `src/shared/` import nhau KÈM đuôi `.ts`; `src/modules/tro-ly/van-nghia.ts` và `goi-mau.ts` import KÈM đuôi `.ts` để `node --test` nạp thẳng.
- Giao diện: không `innerHTML`; `web/tro-ly-cai-dat.ts` không import `src/shared/tro-ly-van-nghia.ts` hay `tro-ly.ts` (chỉ kiểu từ `contracts`); không CSS mới.
- Migration số tạm **`0062_tl_van_nghia.sql`**; bài migration tìm tệp theo ĐUÔI `_tl_van_nghia.sql`.
- Không sửa `CLAUDE.md`, `.claude/`, `playbook/`, ADR đã duyệt (chép ADR-0076 nguyên văn ở Task 0 là thêm tệp, không sửa ADR khác).
- Commit nhỏ, tiếng Việt, thân nói vì sao, kết thúc bằng đúng hai dòng:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01FmJwaU8mvvF2WEt1gd4Wt3
  ```
- Không `git push`, không merge `main`, không lệnh remote (CLAUDE.md §8).

## Review Focus

1. **Phản hồi Embeddings lệch khuôn** — `data[]` không theo thứ tự `index`, thiếu / trùng một `index`, sai số chiều, giá trị không hữu hạn: máy chủ xếp theo `index`; mọi chỗ lệch ⇒ coi như lỗi ⇒ lùi từ khoá, KHÔNG ghi dòng nào. Ghim ở Task 1 (`docPhanHoiNhung`) và Task 5 (máy giả trả thứ tự đảo + ca `sai_chieu`).
2. **Phản hồi không có `usage`** — tính tiền theo ƯỚC (`uocToken`), không bao giờ 0. Ghim ở Task 4 (`goiNhung`).
3. **D1 trả BLOB dạng khác** (`ArrayBuffer`, `Uint8Array`, mảng số) — giải mã nhận cả ba; dạng lạ / sai độ dài ⇒ lùi + log, KHÔNG coi là "thiếu" để tính bù lại âm thầm. Ghim ở Task 1 (`blobSangVec`), Task 4 (ghi → đọc lại bằng `fakeD1`), Task 6 (D1 thật của `wrangler dev`).
4. **Hai đoạn cùng nội dung** (vd hai đoạn ngữ cảnh trùng tiêu đề + nội dung) ⇒ cùng khoá: chỉ MỘT đầu vào tính bù, MỘT dòng ghi. Ghim ở Task 5 (bài V3).
5. **Tháng sát trần** — mức trần trên qua nhưng tiền tính bù cả kho (~787 micro-USD ước) vượt phần còn lại ⇒ 200, lùi từ khoá, 0 lần gọi embeddings; trần thấp hơn mức trần trên ⇒ 429, 0 lần gọi bất kỳ. Ghim ở Task 5 (bài P2).

---

## Bản đồ tệp

| Tệp | Việc | Task |
|---|---|---|
| `docs/adr/ADR-0076-tro-ly-tim-theo-nghia.md` (mới), `docs/adr/README.md` | chép ADR, mục lục, số kế tiếp 0077 | 0 |
| `docs/superpowers/plans/2026-10-01-tro-ly-tim-theo-nghia-thi-cong-nhat-ky.md` (mới) | nhật ký thi công | 0, 1, 2, 7, 8, 9 |
| `src/shared/tro-ly-van-nghia.ts` (mới) + `.test.ts` | hằng, khoá, cô-sin, BLOB, lô, phản hồi, mức trần trên, `chonDoanTron` | 1, 2 |
| `src/shared/tro-ly.ts` (+ `tro-ly.test.ts`) | tách `diemTuKhoa`, `heSoVai`, `layTheoNganSach` | 2 |
| `migrations/0062_tl_van_nghia.sql` (mới), `src/migrations-tro-ly-van-nghia.test.ts` (mới) | bảng chỉ-thêm | 3 |
| `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md` (sinh) | bảng mới + ghi chú tiền lượt | 3 |
| `src/modules/tro-ly/repository.ts` | đọc / ghi `tl_van_nghia` | 4 |
| `src/modules/tro-ly/goi-mau.ts` | `diaChiOpenAi`, import kèm `.ts` | 4 |
| `src/modules/tro-ly/van-nghia.ts` (mới) + `van-nghia.test.ts` (mới) | gọi embeddings, bộ nhớ isolate, tính bù, lùi | 4 |
| `tests/audit/harness.mjs` | xuất `xoaBoNhoVanNghia`, xoá bộ nhớ mỗi `world()` | 4 |
| `src/modules/tro-ly/index.ts`, `src/shared/contracts.ts` | nối route hỏi + ô thử, `kiemTranTruocKhiGoi` mới, phản hồi ô thử | 5 |
| `src/modules/tro-ly/van-nghia-route.test.ts` (mới); `tro-ly-route.test.ts`, `bo-nao-route.test.ts`, `bang-dieu-khien-route.test.ts` | bài route mới; máy giả cũ trả 503 cho embeddings | 5 |
| `web/tro-ly-cai-dat.ts` | "Đoạn đã dùng" ở kết quả thử | 7 |
| ba kịch bản Chrome trợ lý | máy giả có `/v1/embeddings`; bước "Đoạn đã dùng" | 7 |
| `tests/e2e/tro-ly.mjs` | máy giả có `/v1/embeddings`; BLOB trên D1 thật (chạy TRƯỚC giao diện để chốt cách bind BLOB) | 6 |
| `docs/SO-HANG-RAO.md`, `docs/CHANGE-GUIDE.md`, `docs/SYSTEM-DESIGN.md`, `src/shared/changelog.ts` | hai hàng rào, z5, bảng / migration / route, nhật ký 1.55 | 8 |

---

### Task 0: Chép ADR vào `docs/adr/`, mục lục, nhật ký thi công

**Files:**
- Create: `docs/adr/ADR-0076-tro-ly-tim-theo-nghia.md` (bằng công cụ **Write** — KHÔNG `cp`/`mv`: luật `ask Edit(docs/adr/**)` cần chủ bấm, Điểm dừng D2)
- Modify: `docs/adr/README.md` (chèn sau dòng `| [0073]…`; thay dòng "số ADR mới kế tiếp", khoảng dòng 83)
- Create: `docs/superpowers/plans/2026-10-01-tro-ly-tim-theo-nghia-thi-cong-nhat-ky.md`

**Interfaces:** không có mã.

- [ ] **Bước 1: Kiểm số.** Chạy:

```bash
ls docs/adr | tail -3
git log --all --oneline -- 'docs/**/ADR-0074*' 'docs/**/ADR-0075*' | head -5
```

Kỳ vọng: `docs/adr/` của nhánh này dừng ở `ADR-0073-…`; 0074 / 0075 chỉ có ở nhánh đăng nhập (không ở `main`). Nếu `ls docs/adr` đã có tệp `ADR-0076-*` khác ⇒ DỪNG, báo điều phối.

- [ ] **Bước 2: Ghi ADR.** Đọc trọn `docs/superpowers/specs/2026-10-01-tro-ly-tim-theo-nghia/ADR-0076-tro-ly-tim-theo-nghia.md`, dùng Write ghi NGUYÊN VĂN sang `docs/adr/ADR-0076-tro-ly-tim-theo-nghia.md`, chỉ thay câu cuối của dòng "Trạng thái":
  - cũ: ``Văn bản còn ở thư mục nháp; chép vào `docs/adr/` + mục lục ở Task 0 của kế hoạch thi công.``
  - mới: ``Chép vào `docs/adr/` ngày 2026-10-01 (Task 0 của `docs/superpowers/plans/2026-10-01-tro-ly-tim-theo-nghia-thi-cong.md`); bản ở thư mục đặc tả là bản nháp gốc, không sửa tiếp.``

  Công cụ hỏi quyền ⇒ chờ chủ bấm (D2); trong lúc chờ làm Task 1.

- [ ] **Bước 3: Mục lục.** Trong `docs/adr/README.md`, chèn ngay SAU dòng bắt đầu bằng `| [0073](ADR-0073-tro-ly-tuy-bien-mo-hinh-loi-nhac.md)`:

```markdown
| [0076](ADR-0076-tro-ly-tim-theo-nghia.md) | **Trợ lý Hỗ trợ — tìm đoạn theo nghĩa trộn từ khoá:** dấu vân nghĩa OpenAI Embeddings (`text-embedding-3-small`, 512 chiều, hằng trong mã) của mỗi đoạn kho tính một lần, lưu bảng chỉ-thêm `tl_van_nghia` (khoá SHA-256 nội dung + mẫu + số chiều, BLOB float32); chọn đoạn bằng RRF của BM25 và cô-sin, bỏ đoạn dưới ngưỡng trừ đoạn khớp từ khoá mạnh; lỗi / quá giờ 8 giây / tính bù sẽ vượt trần ⇒ lùi về từ khoá; tiền embedding cộng vào lượt và vào kiểm trần trước mọi lần gọi; ô thử hiện "Đoạn đã dùng"; không ô chỉnh. Sửa ADR-0066 điều 3 (cụm "tìm theo từ khoá"); bổ sung ADR-0073 Đ1, Đ7b | hai chiều (cách chọn đoạn); một chiều (bảng `tl_van_nghia`) | **accepted** 2026-10-01 |
```

  Thay dòng `| — | (số ADR mới kế tiếp là 0074 — 0069, 0070 ở nhánh trợ lý; 0071 vai Hành chính nhân sự; 0072 vai Giám đốc bớt Toàn quyền; 0073 trợ lý bộ não tuỳ biến) | | |` bằng:

```markdown
| — | (số ADR mới kế tiếp là 0077 — 0069, 0070 ở nhánh trợ lý; 0071 vai Hành chính nhân sự; 0072 vai Giám đốc bớt Toàn quyền; 0073 trợ lý bộ não tuỳ biến; 0074 (2FA), 0075 (sổ phiên một máy) đã duyệt ở nhánh đăng nhập, chưa lên `main`; 0076 trợ lý tìm theo nghĩa) | | |
```

- [ ] **Bước 4: Nhật ký thi công.** Tạo `docs/superpowers/plans/2026-10-01-tro-ly-tim-theo-nghia-thi-cong-nhat-ky.md`:

```markdown
# Nhật ký thi công — Trợ lý Hỗ trợ tìm đoạn theo nghĩa (ADR-0076, lượt 2)

- **Kế hoạch:** `docs/superpowers/plans/2026-10-01-tro-ly-tim-theo-nghia-thi-cong.md`. **Nhánh:** `tro-ly-tim-theo-nghia`. **Mốc:** `origin/main` `c62ffc6d` (production 1.54).
- **Lời duyệt (nguyên văn, 2026-10-01):** chủ dự án "duyệt, lập kế hoạch đi" sau khi AI trình ADR-0076 + đặc tả (đã qua 2 lượt kiểm độc lập).
- **Ruling bề mặt của người lập kế hoạch:** R1–R9 ở đầu kế hoạch.

## Tra cứu OpenAI (Task 1 bước 1)

(điền: URL, ngày tra, giá, `dimensions`, giới hạn lô, khuôn phản hồi)

## Số đo luật khớp mạnh (Task 2 bước 2)

(điền: lệnh, kết quả 1 / 10 / 41 với vai Bán hàng)

## BLOB trên D1 local thật (Task 6 bước 3)

(điền: nhánh A hay B, kết quả `typeof` / `length` từ `wrangler d1 execute --local`)

## Đột biến hàng rào (sửa cố ý → đỏ → hoàn nguyên → xanh)

(điền ở Task 8: đột biến, thông báo đỏ nguyên văn, `git diff --stat` sau hoàn nguyên)

## Kiểm

(điền ở Task 9)
```

- [ ] **Bước 5: Commit**

```bash
git add docs/adr/ADR-0076-tro-ly-tim-theo-nghia.md docs/adr/README.md docs/superpowers/plans/2026-10-01-tro-ly-tim-theo-nghia-thi-cong.md docs/superpowers/plans/2026-10-01-tro-ly-tim-theo-nghia-thi-cong-nhat-ky.md
git commit -F- <<'MSG'
ADR-0076 vào docs/adr + mục lục; kế hoạch và nhật ký thi công tìm theo nghĩa

Chủ đã duyệt ADR-0076 và đặc tả ngày 1/10 ("duyệt, lập kế hoạch đi"); chép văn bản
vào thư mục ADR chuẩn để mã và tài liệu sau dẫn đúng chỗ. Số kế tiếp nay là 0077
vì 0074, 0075 đã duyệt ở nhánh đăng nhập.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FmJwaU8mvvF2WEt1gd4Wt3
MSG
```

---

### Task 1: Tra OpenAI + luật thuần nền `src/shared/tro-ly-van-nghia.ts` (V1, P1, P2 thuần)

**Files:**
- Create: `src/shared/tro-ly-van-nghia.ts`
- Test: `src/shared/tro-ly-van-nghia.test.ts`

**Interfaces:**
- Consumes: `uocToken`, `dinhDangDoan`, `NGAN_SACH_TOKEN`, `chiaKho`, type `DoanTriThuc` từ `./tro-ly.ts`; `chiPhiToiDa` từ `./tro-ly-mau.ts`; `GIOI_HAN_TRO_LY` từ `./tro-ly-gioi-han.ts`.
- Produces (Task 2, 4, 5 dùng):
  - hằng `MAU_NHUNG = "text-embedding-3-small"`, `SO_CHIEU_NHUNG = 512`, `GIA_NHUNG = 20_000`, `NGAY_TRA_GIA_NHUNG`, `NGUON_GIA_NHUNG`, `HET_GIO_NHUNG_MS = 8_000`, `LO_NHUNG_DAU_VAO = 256`, `LO_NHUNG_TOKEN_UOC = 100_000`, `LO_GHI_D1 = 50`
  - `khoaDoan(chu: string, mau?: string, soChieu?: number): Promise<string>`
  - `chiPhiNhungMicroUsd(token: number): number`
  - `cosin(a: Float32Array, b: Float32Array): number`
  - `vecSangBlob(v: Float32Array): Uint8Array`, `blobSangVec(x: unknown, soChieu: number): Float32Array | null`
  - `chiaLo<T>(ds: readonly T[], n: number): T[][]`, `chiaLoNhung(chu: readonly string[], toiDaDauVao?: number, toiDaToken?: number): string[][]`
  - `thanNhung(dauVao: readonly string[]): Record<string, unknown>`
  - `docPhanHoiNhung(json: unknown, soDauVao: number, soChieu?: number): { vec: Float32Array[]; token: number | null } | null`
  - `mucTranTren(mau: string, tokenVaoKhongTaiLieu: number, tokenRaToiDa: number, truyVan: string): number`
  - `tienBuUoc(chu: readonly string[]): number`

- [ ] **Bước 1: Tra trang chính thức OpenAI (WebFetch), ghi nhật ký.** Mở:
  - `https://developers.openai.com/api/docs/models/text-embedding-3-small` — giá (kỳ vọng **$0.02 / 1M token**).
  - `https://developers.openai.com/api/reference/resources/embeddings/methods/create` — kỳ vọng: `input` mảng ≤ **2048** phần tử, ≤ **8192** token mỗi đầu vào, ≤ **300.000** token tổng mỗi yêu cầu, không nhận chuỗi rỗng; `dimensions` chỉ cho `text-embedding-3` trở lên; `encoding_format` `float` | `base64`; phản hồi `data[]` có `index` + `embedding`, `usage.prompt_tokens`.

  Người lập kế hoạch đã mở hai trang này ngày 2026-10-01 và thấy đúng các số trên. Người thi công mở LẠI, chép URL + ngày + số vào mục "Tra cứu OpenAI" của nhật ký. Khác số kỳ vọng hoặc không mở được ⇒ **DỪNG (D1)**, không bịa giá.

- [ ] **Bước 2: Viết bài đỏ** — tạo `src/shared/tro-ly-van-nghia.test.ts`:

```ts
// Luật thuần tìm theo nghĩa (ADR-0076): khoá đoạn (V1), giá + chi phí embedding (P1), mức trần trên (P2), BLOB float32, chia lô, đọc phản hồi Embeddings.
// Review Focus 1 (phản hồi lệch khuôn), 3 (BLOB nhiều dạng). Bài chọn đoạn trộn (C1–C5) thêm ở Task 2 cùng tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  GIA_NHUNG, HET_GIO_NHUNG_MS, LO_GHI_D1, LO_NHUNG_DAU_VAO, LO_NHUNG_TOKEN_UOC, MAU_NHUNG, NGAY_TRA_GIA_NHUNG, NGUON_GIA_NHUNG, SO_CHIEU_NHUNG,
  blobSangVec, chiaLo, chiaLoNhung, chiPhiNhungMicroUsd, cosin, docPhanHoiNhung, khoaDoan, mucTranTren, thanNhung, tienBuUoc, vecSangBlob,
} from "./tro-ly-van-nghia.ts";
import { chiaKho, dinhDangDoan } from "./tro-ly.ts";
import { GIOI_HAN_TRO_LY as G } from "./tro-ly-gioi-han.ts";

test("hằng embedding: mẫu text-embedding-3-small, 512 chiều, 0,02 USD / 1 triệu token = 20.000 micro-USD, có ngày tra + nguồn; hạn giờ riêng 8 giây", () => {
  assert.equal(MAU_NHUNG, "text-embedding-3-small");
  assert.equal(SO_CHIEU_NHUNG, 512);
  assert.equal(GIA_NHUNG, 20_000);
  assert.match(NGAY_TRA_GIA_NHUNG, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(NGUON_GIA_NHUNG, /^https:\/\/developers\.openai\.com\//);
  assert.equal(HET_GIO_NHUNG_MS, 8_000);
});

test("V1: khoaDoan = SHA-256 hex của 'chữ|mẫu|số chiều'; cùng chữ ⇒ cùng khoá; đổi 1 ký tự / mẫu / số chiều ⇒ khoá khác", async () => {
  const chu = "[Đổi PIN]\nVào trang Tôi.";
  const k = await khoaDoan(chu);
  assert.match(k, /^[0-9a-f]{64}$/);
  assert.equal(k, createHash("sha256").update(`${chu}|${MAU_NHUNG}|${SO_CHIEU_NHUNG}`, "utf8").digest("hex"));
  assert.equal(k, await khoaDoan(chu));
  assert.notEqual(k, await khoaDoan("[Đổi PIN]\nVào trang Tôi!"));
  assert.notEqual(k, await khoaDoan(chu, "text-embedding-3-large"));
  assert.notEqual(k, await khoaDoan(chu, MAU_NHUNG, 256));
});

test("P1: chiPhiNhungMicroUsd làm tròn LÊN — 0 ⇒ 0; 1 ⇒ 1; 50 ⇒ 1; 51 ⇒ 2; 39.329 ⇒ 787; 1 triệu ⇒ 20.000", () => {
  assert.deepEqual([0, 1, 50, 51, 39_329, 1_000_000].map(chiPhiNhungMicroUsd), [0, 1, 1, 2, 787, 20_000]);
});

test("P2: mức trần trên = (token vào chưa tài liệu + 6.000) × giá vào + token ra tối đa × giá ra + embedding ước của truy vấn", () => {
  // nano: 7.000 × 0,05 + 1.200 × 0,40 = 830; truy vấn 300 ký tự = 100 token ⇒ 2
  assert.equal(mucTranTren("gpt-5-nano", 1000, 1200, "a".repeat(300)), 832);
  // mini: 7.000 × 0,25 + 1.500 × 2 = 4.750; truy vấn 3 ký tự = 1 token ⇒ 1
  assert.equal(mucTranTren("gpt-5-mini", 1000, 1500, "abc"), 4751);
});

test("P2: tienBuUoc = tiền embedding ước của các đoạn sẽ tính bù (1 token ≈ 3 ký tự)", () => {
  assert.equal(tienBuUoc([]), 0);
  assert.equal(tienBuUoc(["a".repeat(300), "b".repeat(3000)]), 22); // 1.100 token
});

test("cosin: cùng hướng 1, vuông góc 0, 45° ≈ 0,7071; véc-tơ 0 hoặc khác độ dài ⇒ −1", () => {
  const v = (...x: number[]) => Float32Array.from(x);
  assert.equal(cosin(v(1, 0), v(2, 0)), 1);
  assert.equal(cosin(v(1, 0), v(0, 3)), 0);
  assert.ok(Math.abs(cosin(v(1, 1), v(1, 0)) - Math.SQRT1_2) < 1e-6);
  assert.equal(cosin(v(0, 0), v(1, 0)), -1);
  assert.equal(cosin(v(1, 0), v(1, 0, 0)), -1);
});

test("Review Focus 3: BLOB float32 — vecSangBlob ↔ blobSangVec khứ hồi; nhận ArrayBuffer, Uint8Array, mảng số (D1); sai độ dài / dạng lạ ⇒ null", () => {
  const v = Float32Array.from([0.5, -1.25, 3]);
  const b = vecSangBlob(v);
  assert.ok(b instanceof Uint8Array);
  assert.equal(b.byteLength, 12);
  for (const dang of [b, b.slice().buffer, [...b]]) assert.deepEqual([...blobSangVec(dang, 3)!], [0.5, -1.25, 3]);
  assert.equal(blobSangVec(b, 4), null);
  assert.equal(blobSangVec("abc", 3), null);
  assert.equal(blobSangVec([...b].map((x, i) => (i ? x : 300)), 3), null);
  assert.equal(blobSangVec(null, 3), null);
  // véc-tơ con (byteOffset ≠ 0) vẫn mã hoá đúng
  const con = new Float32Array(Float32Array.from([9, 0.5, -1.25, 3]).buffer, 4, 3);
  assert.deepEqual([...blobSangVec(vecSangBlob(con), 3)!], [0.5, -1.25, 3]);
});

test("chiaLo / chiaLoNhung: theo số đầu vào và theo token ước; một đầu vào lớn hơn trần token vẫn đi riêng một lô", () => {
  assert.deepEqual(chiaLo([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chiaLoNhung(Array.from({ length: 600 }, () => "ab")).map((l) => l.length), [256, 256, 88]);
  assert.deepEqual(chiaLoNhung(Array.from({ length: 5 }, () => "x".repeat(3000)), 256, 2500).map((l) => l.length), [2, 2, 1]);
  assert.deepEqual(chiaLoNhung(["x".repeat(9000)], 256, 100).map((l) => l.length), [1]);
  assert.deepEqual(chiaLoNhung([]), []);
});

test("G2: thân yêu cầu Embeddings ĐÚNG bốn khoá — không user / định danh", () => {
  assert.deepEqual(thanNhung(["đổi PIN"]), { model: MAU_NHUNG, input: ["đổi PIN"], dimensions: SO_CHIEU_NHUNG, encoding_format: "float" });
});

test("Review Focus 1: docPhanHoiNhung xếp theo index; thiếu / trùng index, sai số chiều, số không hữu hạn, số phần tử lệch ⇒ null; usage.prompt_tokens hoặc null", () => {
  const e = (i: number, n = 2) => { const x = new Array(n).fill(0); x[i % n] = 1; return x; };
  const ok = docPhanHoiNhung({ data: [{ index: 1, embedding: e(1) }, { index: 0, embedding: e(0) }], usage: { prompt_tokens: 7 } }, 2, 2)!;
  assert.deepEqual(ok.vec.map((v) => [...v]), [[1, 0], [0, 1]]);
  assert.equal(ok.token, 7);
  assert.equal(docPhanHoiNhung({ data: [{ index: 0, embedding: e(0) }, { index: 1, embedding: e(1) }] }, 2, 2)!.token, null);
  assert.equal(docPhanHoiNhung({ data: [{ index: 0, embedding: e(0) }, { index: 0, embedding: e(1) }] }, 2, 2), null);
  assert.equal(docPhanHoiNhung({ data: [{ index: 0, embedding: e(0) }] }, 2, 2), null);
  assert.equal(docPhanHoiNhung({ data: [{ index: 0, embedding: [1, 0, 0] }] }, 1, 2), null);
  assert.equal(docPhanHoiNhung({ data: [{ index: 0, embedding: [1, Number.NaN] }] }, 1, 2), null);
  assert.equal(docPhanHoiNhung({ data: [{ index: 2, embedding: e(0) }] }, 1, 2), null);
  assert.equal(docPhanHoiNhung({ error: { message: "x" } }, 1, 2), null);
  assert.equal(docPhanHoiNhung(null, 1, 2), null);
});

test("hàng rào lô: đoạn dài nhất của kho + đoạn ngữ cảnh tối đa < 8.192 ký tự (an toàn kể cả 1 ký tự = 1 token); lô ≤ 2.048 đầu vào, ≤ 300.000 token kể cả ước thấp 3 lần; kho ≤ 600 đoạn (giữ số câu D1 lần tính bù đầu xa trần 1.000)", () => {
  const kho = chiaKho();
  assert.ok(Math.max(...kho.map((d) => dinhDangDoan(d).length)) < 8192);
  assert.ok(G.tieuDeNguCanh + G.noiDungNguCanh + 40 < 8192);
  assert.ok(LO_NHUNG_DAU_VAO <= 2048 && LO_NHUNG_TOKEN_UOC * 3 <= 300_000);
  assert.ok(kho.length + G.soNguCanh <= 600, `kho ${kho.length} đoạn: tính bù lần đầu ghi mỗi đoạn một câu D1 — xem lại LO_GHI_D1 / cách ghi`);
  assert.equal(LO_GHI_D1, 50);
});
```

- [ ] **Bước 3: Chạy cho đỏ**

Run: `node --test src/shared/tro-ly-van-nghia.test.ts`
Expected: FAIL — `Cannot find module …/tro-ly-van-nghia.ts`.

- [ ] **Bước 4: Viết mã** — tạo `src/shared/tro-ly-van-nghia.ts` (giá điền đúng số đã tra ở bước 1):

```ts
// Luật THUẦN tìm đoạn theo nghĩa của trợ lý Hỗ trợ (ADR-0076, accepted 2026-10-01). Không I/O (băm dùng crypto.subtle — có cả ở Worker và Node 22).
// Gồm: mẫu + giá embedding (hằng — Đ1), khoá đoạn (Đ2, V1), cô-sin, mã hoá véc-tơ float32 ↔ BLOB, chia lô (API + D1), đọc phản hồi Embeddings,
// mức trần trên (Đ5(1)), tiền tính bù ước (Đ5(2)), chọn đoạn trộn RRF (Đ3 — Task 2). Máy chủ (src/modules/tro-ly/van-nghia.ts) gọi; giao diện KHÔNG import.
// Giá tra 2026-10-01 (đã mở được): developers.openai.com/api/docs/models/text-embedding-3-small ($0,02 / 1M token);
// developers.openai.com/api/reference/resources/embeddings/methods/create (≤ 2.048 đầu vào, ≤ 8.192 token / đầu vào, ≤ 300.000 token / yêu cầu; `dimensions` cho text-embedding-3).
import { chiPhiToiDa } from "./tro-ly-mau.ts";
import { NGAN_SACH_TOKEN, uocToken } from "./tro-ly.ts";

export const MAU_NHUNG = "text-embedding-3-small";
/** Số chiều rút gọn qua tham số `dimensions` (giả định bề mặt của đặc tả §6 — đổi số = mọi khoá đổi = tính lại cả kho một lần). */
export const SO_CHIEU_NHUNG = 512;
/** micro-USD / 1 triệu token (0,02 USD). */
export const GIA_NHUNG = 20_000;
export const NGAY_TRA_GIA_NHUNG = "2026-10-01";
export const NGUON_GIA_NHUNG = "https://developers.openai.com/api/docs/models/text-embedding-3-small";
/** Hạn giờ riêng của một lần gọi Embeddings (Đ4) — ngắn hơn HET_GIO_MS 20 giây của mẫu trả lời. */
export const HET_GIO_NHUNG_MS = 8_000;
/** Lô API: ≤ 2.048 đầu vào; giữ 256 cho thân yêu cầu nhỏ. */
export const LO_NHUNG_DAU_VAO = 256;
/** Lô API: ≤ 300.000 token / yêu cầu; ước 1 token ≈ 3 ký tự có thể thấp ⇒ chừa ba lần. */
export const LO_NHUNG_TOKEN_UOC = 100_000;
/** Số câu INSERT một `db.batch` khi ghi tl_van_nghia (mỗi câu 5 tham số — xa trần 100 tham số / câu của D1). */
export const LO_GHI_D1 = 50;

/** V1: SHA-256 hex của `${chữ}|${mẫu}|${số chiều}` — chữ = đoạn đã định dạng (`dinhDangDoan`). */
export async function khoaDoan(chu: string, mau: string = MAU_NHUNG, soChieu: number = SO_CHIEU_NHUNG): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${chu}|${mau}|${soChieu}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** micro-USD, làm tròn LÊN (P1). */
export const chiPhiNhungMicroUsd = (token: number): number => (token > 0 ? Math.ceil((token * GIA_NHUNG) / 1_000_000) : 0);

export function cosin(a: Float32Array, b: Float32Array): number {
  if (!a.length || a.length !== b.length) return -1;
  let t = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    t += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? t / Math.sqrt(na * nb) : -1;
}

/** float32 → byte (thứ tự byte của máy — Worker và Node đều little-endian). Chép ra bộ đệm riêng: véc-tơ con (byteOffset ≠ 0) vẫn đúng. */
export const vecSangBlob = (v: Float32Array): Uint8Array => new Uint8Array(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength));

/** BLOB do D1 / node:sqlite trả (ArrayBuffer, Uint8Array / view khác, hoặc mảng số 0–255) → float32; sai độ dài / dạng lạ ⇒ null (Review Focus 3). */
export function blobSangVec(x: unknown, soChieu: number): Float32Array | null {
  let u: Uint8Array | null = null;
  if (x instanceof ArrayBuffer) u = new Uint8Array(x);
  else if (ArrayBuffer.isView(x)) u = new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
  else if (Array.isArray(x) && x.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) u = Uint8Array.from(x as number[]);
  if (!u || u.byteLength !== soChieu * 4) return null;
  return new Float32Array(u.slice().buffer); // slice ⇒ bộ đệm mới, căn lề 4 byte
}

export function chiaLo<T>(ds: readonly T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < ds.length; i += n) out.push(ds.slice(i, i + n));
  return out;
}

/** Chia các đầu vào thành lô theo trần số đầu vào VÀ trần token ước; giữ thứ tự. */
export function chiaLoNhung(chu: readonly string[], toiDaDauVao: number = LO_NHUNG_DAU_VAO, toiDaToken: number = LO_NHUNG_TOKEN_UOC): string[][] {
  const out: string[][] = [];
  let lo: string[] = [];
  let tok = 0;
  for (const s of chu) {
    const t = uocToken(s);
    if (lo.length && (lo.length >= toiDaDauVao || tok + t > toiDaToken)) {
      out.push(lo);
      lo = [];
      tok = 0;
    }
    lo.push(s);
    tok += t;
  }
  if (lo.length) out.push(lo);
  return out;
}

/** Thân POST /v1/embeddings — ĐÚNG bốn khoá; KHÔNG `user` / định danh người hỏi (G2). */
export const thanNhung = (dauVao: readonly string[]): Record<string, unknown> => ({
  model: MAU_NHUNG, input: [...dauVao], dimensions: SO_CHIEU_NHUNG, encoding_format: "float",
});

/** Đọc phản hồi Embeddings: xếp theo `index`; thiếu / trùng / sai số chiều / số lạ ⇒ null. `token` = usage.prompt_tokens, thiếu ⇒ null (người gọi ƯỚC). */
export function docPhanHoiNhung(json: unknown, soDauVao: number, soChieu: number = SO_CHIEU_NHUNG): { vec: Float32Array[]; token: number | null } | null {
  const j = (json ?? {}) as { data?: unknown; usage?: { prompt_tokens?: unknown } };
  if (!Array.isArray(j.data) || j.data.length !== soDauVao) return null;
  const vec: (Float32Array | undefined)[] = new Array(soDauVao);
  for (const o of j.data as { index?: unknown; embedding?: unknown }[]) {
    const i = o?.index;
    if (typeof i !== "number" || !Number.isInteger(i) || i < 0 || i >= soDauVao || vec[i]) return null;
    const e = o.embedding;
    if (!Array.isArray(e) || e.length !== soChieu || !e.every((x) => typeof x === "number" && Number.isFinite(x))) return null;
    vec[i] = Float32Array.from(e as number[]);
  }
  const p = j.usage?.prompt_tokens;
  return { vec: vec as Float32Array[], token: typeof p === "number" && Number.isFinite(p) && p >= 0 ? Math.ceil(p) : null };
}

/**
 * Đ5(1) — mức trần trên của MỘT lượt, kiểm TRƯỚC mọi lần gọi API: token vào của thân yêu cầu CHƯA có tài liệu (lời nhắc + nhớ + câu hỏi) + NGAN_SACH_TOKEN
 * (tài liệu tối đa) theo giá vào, + token ra tối đa theo giá ra, + tiền embedding ước của truy vấn tìm.
 */
export const mucTranTren = (mau: string, tokenVaoKhongTaiLieu: number, tokenRaToiDa: number, truyVan: string): number =>
  chiPhiToiDa(mau, tokenVaoKhongTaiLieu + NGAN_SACH_TOKEN, tokenRaToiDa) + chiPhiNhungMicroUsd(uocToken(truyVan));

/** Đ5(2) — tiền embedding ƯỚC của các đoạn sẽ tính bù. */
export const tienBuUoc = (chu: readonly string[]): number => chiPhiNhungMicroUsd(chu.reduce((a, s) => a + uocToken(s), 0));
```

- [ ] **Bước 5: Chạy cho xanh**

Run: `node --test src/shared/tro-ly-van-nghia.test.ts`
Expected: PASS (11 bài).

- [ ] **Bước 6: Commit**

```bash
git add src/shared/tro-ly-van-nghia.ts src/shared/tro-ly-van-nghia.test.ts docs/superpowers/plans/2026-10-01-tro-ly-tim-theo-nghia-thi-cong-nhat-ky.md
git commit -F- <<'MSG'
Luật thuần tìm theo nghĩa: giá embedding, khoá đoạn, BLOB, lô, mức trần trên

ADR-0076 Đ1, Đ2, Đ5: giá text-embedding-3-small tra trang OpenAI ngày 1/10 và ghi
vào hằng; khoá đoạn là SHA-256 của nội dung + mẫu + số chiều để đổi một chữ thì chỉ
tính lại đúng đoạn đó; mức trần trên gồm cả tiền embedding câu hỏi để kiểm trần
trước MỌI lần gọi. Phản hồi lệch khuôn bị coi là lỗi (lùi từ khoá), không ghi rác.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FmJwaU8mvvF2WEt1gd4Wt3
MSG
```

---

### Task 2: Chọn đoạn trộn `chonDoanTron` + tách điểm từ khoá (C1–C5)

**Files:**
- Modify: `src/shared/tro-ly.ts` (khối "tìm theo từ khoá", khoảng dòng 128–184)
- Modify: `src/shared/tro-ly-van-nghia.ts` (thêm cuối tệp)
- Test: `src/shared/tro-ly-van-nghia.test.ts` (thêm), `src/shared/tro-ly.test.ts` (thêm một bài)

**Interfaces:**
- Consumes: Task 1 (`cosin`, `SO_CHIEU_NHUNG`).
- Produces:
  - ở `tro-ly.ts`: `interface DiemTuKhoa { diem: number; soTuDon: number; coCap: boolean }`, `diemTuKhoa(cauHoi: string, kho: readonly DoanTriThuc[]): DiemTuKhoa[]` (cùng thứ tự kho, điểm THÔ chưa nhân vai), `heSoVai(d: DoanTriThuc, perms: readonly PermissionCode[]): number` (export), `layTheoNganSach<T>(ds: readonly T[], doanCua: (x: T) => DoanTriThuc, nganSach?: number, toiDa?: number): T[]`; `timDoan`, `chonDoan` giữ chữ ký và kết quả.
  - ở `tro-ly-van-nghia.ts`: hằng `NGUONG_COSIN = 0.3`, `K_RRF = 60`, `TY_LE_DIEM_MANH = 0.7`, `SO_TU_MANH = 2`; `interface DoanDaChon { doan: DoanTriThuc; theoNghia: boolean; theoTuKhoa: boolean }`; `khopManh(cauHoi, kho, perms): boolean[]`; `chonDoanTron(cauHoi, vecCauHoi, kho, vecDoan: readonly (Float32Array | null)[], perms, nganSach?, toiDa?): DoanDaChon[]`; `daChonTuKhoa(ds: readonly DoanTriThuc[]): DoanDaChon[]`.

- [ ] **Bước 1: Viết bài đỏ** — thêm vào cuối `src/shared/tro-ly-van-nghia.test.ts` (và bổ sung import ở đầu tệp: `K_RRF, NGUONG_COSIN, chonDoanTron, daChonTuKhoa, khopManh` từ `./tro-ly-van-nghia.ts`; `KHONG_TIM_THAY, SO_DOAN_TOI_DA, dungLoiNhac, truyVanTim, uocToken, type DoanTriThuc` từ `./tro-ly.ts`):

```ts
// ---- Chọn đoạn trộn (Đ3: C1–C5) ----
const mot = (i: number): Float32Array => { const v = new Float32Array(SO_CHIEU_NHUNG); v[i] = 1; return v; };
/** Véc-tơ có cô-sin với mot(0) ĐÚNG bằng x. */
const coSin = (x: number): Float32Array => { const v = new Float32Array(SO_CHIEU_NHUNG); v[0] = x; v[1] = Math.sqrt(1 - x * x); return v; };
const KHO: DoanTriThuc[] = [
  { ten: "Đặt gấp", quyen: [], chu: "Bấm nút Đặt gấp khi chặng dưới mốc sáu giờ." },
  { ten: "Trang chủ", quyen: [], chu: "Trang chủ dùng để xem việc hôm nay." },
  { ten: "Đổi PIN", quyen: [], chu: "Vào trang Tôi, bấm Đổi PIN, gõ mã mới hai lần." },
  { ten: "Xe", quyen: [], chu: "Danh sách xe của công ty và giấy tờ xe." },
];
const tom = (ds: ReturnType<typeof chonDoanTron>) => ds.map((x) => [x.doan.ten, x.theoNghia, x.theoTuKhoa]);

test("C1: RRF — đoạn có CẢ hai tín hiệu đứng trước đoạn chỉ khớp nghĩa; ngưỡng cô-sin 0,3 (0,29 bỏ, 0,31 giữ); vecDoan null = không có nghĩa", () => {
  assert.equal(NGUONG_COSIN, 0.3);
  assert.equal(K_RRF, 60);
  const ds = chonDoanTron("đổi PIN", mot(0), KHO, [null, coSin(0.29), mot(0), coSin(0.31)], ["SALES"]);
  assert.deepEqual(tom(ds), [["Đổi PIN", true, true], ["Xe", true, false]]);
});

test("C1: giữ trọng số vai — hai đoạn cùng chữ, đoạn của nhóm vai người hỏi đứng trước; đoạn vai khác vẫn được chọn (xếp sau)", () => {
  const kho: DoanTriThuc[] = [
    { ten: "Kế toán › Đổi PIN", quyen: ["ACCOUNTING"], chu: "Vào trang Tôi, bấm Đổi PIN." },
    { ten: "Bán hàng › Đổi PIN", quyen: ["SALES"], chu: "Vào trang Tôi, bấm Đổi PIN." },
  ];
  assert.deepEqual(chonDoanTron("đổi PIN", mot(0), kho, [mot(0), mot(0)], ["SALES"]).map((x) => x.doan.ten), ["Bán hàng › Đổi PIN", "Kế toán › Đổi PIN"]);
});

test("C1: ngân sách token và tối đa 12 đoạn như chonDoan", () => {
  const kho: DoanTriThuc[] = Array.from({ length: 20 }, (_, i) => ({ ten: `Mục ${String.fromCharCode(65 + i)}`, quyen: [], chu: `Đổi PIN cách ${String.fromCharCode(65 + i)}.` }));
  const vec = kho.map(() => mot(0));
  assert.equal(chonDoanTron("đổi PIN", mot(0), kho, vec, ["SALES"]).length, SO_DOAN_TOI_DA);
  const motDoan = uocToken(dinhDangDoan(kho[0]!));
  assert.equal(chonDoanTron("đổi PIN", mot(0), kho, vec, ["SALES"], motDoan * 3).length, 3);
});

test("C2: đoạn khớp CẶP âm tiết (tên nút 'Đặt gấp') được giữ dù cô-sin thấp; đoạn chỉ khớp lẻ chữ phổ biến 'dùng' mà cô-sin thấp bị bỏ", () => {
  assert.deepEqual(tom(chonDoanTron("cách dùng nút đặt gấp", mot(0), KHO, KHO.map(() => mot(1)), ["SALES"])), [["Đặt gấp", false, true]]);
});

test("C3: câu không khớp từ khoá nào nhưng gần nghĩa một đoạn ⇒ đoạn đó được chọn, cờ khớp nghĩa", () => {
  assert.deepEqual(tom(chonDoanTron("quên mật khẩu đăng nhập", mot(0), KHO, [mot(1), mot(1), mot(0), mot(1)], ["SALES"])), [["Đổi PIN", true, false]]);
});

test("C4: kho THẬT + mọi véc-tơ đoạn trực giao câu hỏi ⇒ chỉ còn đoạn khớp MẠNH — đo 2026-10-01, vai Bán hàng: than phiền 1, đổi PIN 10, lập đơn 41 (trần 12); không còn đoạn ⇒ khối tài liệu 'không tìm thấy'", () => {
  // Hướng dẫn đổi chữ ⇒ con số có thể đổi: đo lại (nhật ký thi công "Số đo luật khớp mạnh"), sửa số ở đây kèm lý do — không nới luật để giữ số.
  const kho = chiaKho();
  const vec = kho.map(() => mot(1));
  const dem = (c: string) => khopManh(c, kho, ["SALES"]).filter(Boolean).length;
  assert.deepEqual([dem("sao app khó dùng thế"), dem("đổi mã PIN thế nào"), dem("lập đơn mới ra sao")], [1, 10, 41]);
  assert.deepEqual(chonDoanTron("sao app khó dùng thế", mot(0), kho, vec, ["SALES"]).map((x) => x.doan.ten), ["Bán hàng › Điều phối xe — chưa dùng cho chuyến thật"]);
  const lapDon = chonDoanTron("lập đơn mới ra sao", mot(0), kho, vec, ["SALES"]).length; // 41 khớp mạnh ⇒ RRF + trần 12 đoạn / 6.000 token chọn tiếp
  assert.ok(lapDon >= 1 && lapDon <= SO_DOAN_TOI_DA, String(lapDon));
  assert.deepEqual(chonDoanTron("zzqx wqpv", mot(0), kho, vec, ["SALES"]), []);
  assert.ok(dungLoiNhac("Bạn là trợ lý.", ["SALES"], []).endsWith(`TÀI LIỆU:\n${KHONG_TIM_THAY}`));
});

test("C5: truy vấn = câu hiện tại + câu trước gần nhất — câu nối tiếp không khớp gì vẫn ra đoạn nhờ câu trước", () => {
  const vec = KHO.map(() => mot(1));
  assert.deepEqual(chonDoanTron("còn trên điện thoại thì sao", mot(0), KHO, vec, ["SALES"]), []);
  assert.deepEqual(tom(chonDoanTron(truyVanTim("còn trên điện thoại thì sao", "đổi PIN thế nào"), mot(0), KHO, vec, ["SALES"])), [["Đổi PIN", false, true]]);
});

test("daChonTuKhoa (đường lùi): mọi đoạn cờ khớp từ khoá, không khớp nghĩa", () => {
  assert.deepEqual(tom(daChonTuKhoa([KHO[2]!])), [["Đổi PIN", false, true]]);
});
```

  Và thêm vào cuối `src/shared/tro-ly.test.ts` (bổ sung `diemTuKhoa, heSoVai` vào dòng import từ `./tro-ly.ts`):

```ts
test("diemTuKhoa (ADR-0076 Đ3): điểm THÔ cùng thứ tự kho + số âm tiết đơn khớp + có khớp cặp; timDoan = điểm thô × hệ số vai, chỉ đoạn > 0", () => {
  const kho = chiaKho();
  const d = diemTuKhoa("đổi mã PIN thế nào", kho);
  assert.equal(d.length, kho.length);
  const i = d.findIndex((x) => x.coCap);
  assert.ok(i >= 0 && d[i]!.soTuDon >= 1);
  const t = timDoan("đổi mã PIN thế nào", ["SALES"], kho);
  assert.equal(t.length, d.filter((x) => x.diem > 0).length);
  const dau = kho.indexOf(t[0]!.doan);
  assert.ok(Math.abs(t[0]!.diem - d[dau]!.diem * heSoVai(kho[dau]!, ["SALES"])) < 1e-9);
  assert.deepEqual(diemTuKhoa("zzqx", kho.slice(0, 2)), [{ diem: 0, soTuDon: 0, coCap: false }, { diem: 0, soTuDon: 0, coCap: false }]);
});
```

- [ ] **Bước 2: Chạy cho đỏ + ghi số đo**

Run: `node --test src/shared/tro-ly-van-nghia.test.ts src/shared/tro-ly.test.ts`
Expected: FAIL — `chonDoanTron`, `khopManh`, `diemTuKhoa` … không được xuất.

  Sau bước 4, nếu bài C4 đỏ ở dòng `[1, 10, 41]` ⇒ **DỪNG (D3)**, ghi số đo thật vào nhật ký, không sửa luật / số.

- [ ] **Bước 3: Viết mã ở `src/shared/tro-ly.ts`** — thay toàn bộ phần từ dòng `export interface KetQuaTim` tới hết hàm `chonDoan` (giữ `tachTu`, `boDau`, `TU_DUNG` phía trên, giữ `dinhDangDoan` phía dưới) bằng:

```ts
export interface KetQuaTim { readonly doan: DoanTriThuc; readonly diem: number }

const K1 = 1.2;
const B = 0.75;
/** Hệ số ưu tiên: đoạn của nhóm vai người hỏi ×1,5; đoạn chung ×1; đoạn của vai khác ×0,6 (vẫn trả lời được, nhưng xếp sau). */
export const heSoVai = (d: DoanTriThuc, perms: readonly PermissionCode[]): number =>
  d.quyen.length === 0 ? 1 : d.quyen.some((q) => perms.includes(q)) ? 1.5 : 0.6;

/** Điểm từ khoá THÔ (chưa nhân hệ số vai) của MỌI đoạn, cùng thứ tự kho (ADR-0076 Đ3): BM25 + số âm tiết đơn khác nhau khớp + có khớp cặp âm tiết liền nhau. */
export interface DiemTuKhoa { readonly diem: number; readonly soTuDon: number; readonly coCap: boolean }
export function diemTuKhoa(cauHoi: string, kho: readonly DoanTriThuc[]): DiemTuKhoa[] {
  const q = [...new Set(tachTu(cauHoi))];
  if (!q.length) return kho.map(() => ({ diem: 0, soTuDon: 0, coCap: false }));
  const docs = kho.map((d) => tachTu(`${d.ten} ${d.chu}`));
  const avg = docs.reduce((a, d) => a + d.length, 0) / Math.max(1, docs.length);
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
  const N = docs.length;
  return docs.map((d) => {
    const tf = new Map<string, number>();
    for (const t of d) tf.set(t, (tf.get(t) ?? 0) + 1);
    let diem = 0;
    let soTuDon = 0;
    let coCap = false;
    for (const t of q) {
      const f = tf.get(t);
      if (!f) continue;
      const n = df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      diem += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.length) / avg)));
      if (t.includes("_")) coCap = true;
      else soTuDon++;
    }
    return { diem, soTuDon, coCap };
  });
}

/** Xếp hạng mọi đoạn theo câu hỏi (BM25 trên tên mục + nội dung, nhân hệ số vai); chỉ trả đoạn có điểm > 0, điểm cao trước (hoà: giữ thứ tự kho). */
export function timDoan(cauHoi: string, perms: readonly PermissionCode[], kho: readonly DoanTriThuc[] = chiaKho()): KetQuaTim[] {
  const out: KetQuaTim[] = [];
  diemTuKhoa(cauHoi, kho).forEach((x, i) => {
    if (x.diem > 0) out.push({ doan: kho[i]!, diem: x.diem * heSoVai(kho[i]!, perms) });
  });
  return out.map((x, i) => ({ x, i })).sort((a, b) => b.x.diem - a.x.diem || a.i - b.i).map(({ x }) => x);
}

/**
 * Lấy đoạn theo thứ tự điểm tới khi hết ngân sách (ước token); đoạn không vừa phần còn lại thì bỏ qua, xét đoạn sau. Tối đa `toiDa` đoạn.
 * `toiDa` 8 → 12 (ADR-0070, 1/10): kho thêm các đoạn cấu trúc app ngắn (~70–250 token) nên 8 đoạn chỉ dùng ~2.500 / 6.000 token và đẩy đoạn liên quan
 * (vd "Mốc 6 giờ và Đặt gấp" cho câu "vì sao không xác nhận được đơn") ra ngoài; ngân sách token vẫn là trần thật.
 * MỘT vòng ngân sách cho cả chonDoan (từ khoá) và chonDoanTron (ADR-0076).
 */
export const SO_DOAN_TOI_DA = 12;
export function layTheoNganSach<T>(ds: readonly T[], doanCua: (x: T) => DoanTriThuc, nganSach = NGAN_SACH_TOKEN, toiDa = SO_DOAN_TOI_DA): T[] {
  const out: T[] = [];
  let con = nganSach;
  for (const x of ds) {
    if (out.length >= toiDa) break;
    const t = uocToken(dinhDangDoan(doanCua(x)));
    if (t > con) continue;
    out.push(x);
    con -= t;
  }
  return out;
}
export function chonDoan(cauHoi: string, perms: readonly PermissionCode[], kho?: readonly DoanTriThuc[], nganSach = NGAN_SACH_TOKEN, toiDa = SO_DOAN_TOI_DA): DoanTriThuc[] {
  return layTheoNganSach(timDoan(cauHoi, perms, kho).map((x) => x.doan), (d) => d, nganSach, toiDa);
}
```

- [ ] **Bước 4: Viết mã ở `src/shared/tro-ly-van-nghia.ts`** — sửa dòng import `./tro-ly.ts` thành:

```ts
import type { PermissionCode } from "./permissions.ts";
import { NGAN_SACH_TOKEN, SO_DOAN_TOI_DA, diemTuKhoa, heSoVai, layTheoNganSach, uocToken, type DoanTriThuc } from "./tro-ly.ts";
```

  rồi thêm cuối tệp:

```ts
// ---------------------------------------------------------------- chọn đoạn trộn (Đ3)

/** Ngưỡng cô-sin (R3 của kế hoạch — đánh giá lại bằng 12 câu mẫu sau triển khai; đổi = sửa hằng + bài thuần). */
export const NGUONG_COSIN = 0.3;
/** Hằng k của Reciprocal Rank Fusion (giá trị chuẩn). */
export const K_RRF = 60;
export const TY_LE_DIEM_MANH = 0.7;
export const SO_TU_MANH = 2;

export interface DoanDaChon { readonly doan: DoanTriThuc; readonly theoNghia: boolean; readonly theoTuKhoa: boolean }

/**
 * Khớp từ khoá MẠNH (Đ3): ≥ 1 cặp âm tiết liền nhau của câu hỏi, HOẶC (điểm BM25 ĐÃ NHÂN vai ≥ 0,7 × điểm cao nhất VÀ ≥ 2 âm tiết đơn khác nhau).
 * Khớp lẻ một chữ phổ biến ("dùng", "app") không đủ.
 */
export function khopManh(cauHoi: string, kho: readonly DoanTriThuc[], perms: readonly PermissionCode[]): boolean[] {
  const tk = diemTuKhoa(cauHoi, kho);
  const bm = tk.map((x, i) => x.diem * heSoVai(kho[i]!, perms));
  const max = Math.max(0, ...bm);
  return tk.map((x, i) => x.coCap || (max > 0 && bm[i]! >= TY_LE_DIEM_MANH * max && x.soTuDon >= SO_TU_MANH));
}

/**
 * C1: điểm trộn RRF của hạng BM25 (đã nhân vai, chỉ đoạn > 0) và hạng cô-sin (đã nhân vai, chỉ đoạn ≥ ngưỡng); bỏ đoạn cô-sin < ngưỡng TRỪ đoạn khớp mạnh;
 * rồi ngân sách token + tối đa 12 đoạn (layTheoNganSach — chung với chonDoan). `vecDoan[i]` null = đoạn chưa có dấu vân (không tín hiệu nghĩa).
 */
export function chonDoanTron(
  cauHoi: string, vecCauHoi: Float32Array, kho: readonly DoanTriThuc[], vecDoan: readonly (Float32Array | null)[], perms: readonly PermissionCode[],
  nganSach = NGAN_SACH_TOKEN, toiDa = SO_DOAN_TOI_DA,
): DoanDaChon[] {
  const tk = diemTuKhoa(cauHoi, kho);
  const bm = tk.map((x, i) => x.diem * heSoVai(kho[i]!, perms));
  const manh = khopManh(cauHoi, kho, perms);
  const cs = kho.map((_, i) => { const v = vecDoan[i]; return v ? cosin(vecCauHoi, v) : -1; });
  const hang = (diem: readonly number[], co: (i: number) => boolean): Map<number, number> => {
    const ds = kho.map((_, i) => i).filter(co).sort((a, b) => diem[b]! - diem[a]! || a - b);
    return new Map(ds.map((i, h) => [i, h + 1]));
  };
  const hangTuKhoa = hang(bm, (i) => bm[i]! > 0);
  const hangNghia = hang(cs.map((c, i) => c * heSoVai(kho[i]!, perms)), (i) => cs[i]! >= NGUONG_COSIN);
  const ung: { i: number; diem: number; theoNghia: boolean; theoTuKhoa: boolean }[] = [];
  kho.forEach((_, i) => {
    const theoNghia = cs[i]! >= NGUONG_COSIN;
    if (!theoNghia && !manh[i]) return;
    const rB = hangTuKhoa.get(i);
    const rC = hangNghia.get(i);
    ung.push({ i, diem: (rB ? 1 / (K_RRF + rB) : 0) + (rC ? 1 / (K_RRF + rC) : 0), theoNghia, theoTuKhoa: bm[i]! > 0 });
  });
  ung.sort((a, b) => b.diem - a.diem || a.i - b.i);
  return layTheoNganSach(ung, (x) => kho[x.i]!, nganSach, toiDa).map((x) => ({ doan: kho[x.i]!, theoNghia: x.theoNghia, theoTuKhoa: x.theoTuKhoa }));
}

/** Đường lùi (Đ4): đoạn chọn bằng chonDoan (luật cũ) — cờ khớp từ khoá, không khớp nghĩa. */
export const daChonTuKhoa = (ds: readonly DoanTriThuc[]): DoanDaChon[] => ds.map((doan) => ({ doan, theoNghia: false, theoTuKhoa: true }));
```

- [ ] **Bước 5: Chạy cho xanh**

Run: `node --test src/shared/tro-ly-van-nghia.test.ts src/shared/tro-ly.test.ts src/shared/tro-ly-bang-dieu-khien.test.ts`
Expected: PASS (mọi bài cũ của `tro-ly.test.ts` vẫn xanh — `timDoan` / `chonDoan` cho kết quả như trước). Ghi số đo 1 / 10 / 41 + câu lệnh vào mục "Số đo luật khớp mạnh" của nhật ký.

- [ ] **Bước 6: Commit**

```bash
git add src/shared/tro-ly.ts src/shared/tro-ly.test.ts src/shared/tro-ly-van-nghia.ts src/shared/tro-ly-van-nghia.test.ts docs/superpowers/plans/2026-10-01-tro-ly-tim-theo-nghia-thi-cong-nhat-ky.md
git commit -F- <<'MSG'
Chọn đoạn trộn RRF từ khoá + nghĩa; luật khớp mạnh đo trên kho thật

ADR-0076 Đ3: câu than phiền "sao app khó dùng thế" từng kéo 12 đoạn lạc đề chỉ vì
chữ "dùng". Nay đoạn xa nghĩa bị bỏ trừ khi khớp từ khoá mạnh (cặp âm tiết, hoặc
điểm cao và nhiều từ) — vai Bán hàng còn 1 đoạn. Tách điểm từ khoá và vòng ngân
sách ra hàm chung để đường cũ (lùi) và đường mới tính cùng một cách.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FmJwaU8mvvF2WEt1gd4Wt3
MSG
```

---

### Task 3: Migration `0062_tl_van_nghia.sql` + sổ dữ liệu (V4 tầng CSDL)

**Files:**
- Create: `migrations/0062_tl_van_nghia.sql`
- Create: `src/migrations-tro-ly-van-nghia.test.ts`
- Modify: `docs/data-dictionary.json` (mảng `tables`: thêm `tl_van_nghia` sau `tl_bo_nao`; sửa `note` của `tl_luot_hoi`), sinh lại `docs/DATA-DICTIONARY.md`

**Interfaces:**
- Produces: bảng `tl_van_nghia (khoa TEXT PK, mau TEXT, so_chieu INTEGER, vec BLOB, created_at, created_by, updated_at, updated_by)` — Task 4 ghi / đọc.

- [ ] **Bước 1: Kiểm số migration**

```bash
ls migrations | tail -3
git ls-tree --name-only dang-nhap-sat-day-cho-gop migrations/ | tail -2
```

Kỳ vọng: nhánh này dừng ở `0060_tl_bo_nao.sql`; nhánh đăng nhập có `0061_aut_session.sql` ⇒ số tạm `0062`.

- [ ] **Bước 2: Viết bài đỏ** — tạo `src/migrations-tro-ly-van-nghia.test.ts`:

```ts
// Migration *_tl_van_nghia.sql (ADR-0076 Đ2, đặc tả V4): bảng chỉ-thêm dấu vân nghĩa của đoạn kho, trên SQLite thật (node:sqlite) — cùng cách với
// migrations-tro-ly-bo-nao.test.ts. Tìm tệp theo ĐUÔI tên — số tạm 0062 (main tới 0060, 0061 ở nhánh đăng nhập), người gộp đổi số (CHANGE-GUIDE công thức d).
// Hàng rào: đúng tập cột (không cột câu hỏi / người hỏi — trang ghép §7 đặc tả); vec phải là BLOB đúng so_chieu × 4 byte; chỉ thêm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const TEP = files.find((f) => f.endsWith("_tl_van_nghia.sql"));

function open(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const NOW = "2026-10-01T01:00:00.000Z";
const K = (c: string) => c.repeat(64);
const them = (db: DatabaseSync, khoa: string, soChieu: number, vec: unknown, xungDot = "") =>
  db.prepare(`INSERT INTO tl_van_nghia (khoa, mau, so_chieu, vec, created_at, created_by, updated_at, updated_by) VALUES (?, 'text-embedding-3-small', ?, ?, ?, NULL, ?, NULL) ${xungDot}`)
    .run(khoa, soChieu, vec as Uint8Array, NOW, NOW);

test("tệp *_tl_van_nghia.sql có; số > 0060 (số tạm 0062 — người gộp đổi lên số lớn nhất của main + 1)", () => {
  assert.ok(TEP, "thiếu migrations/*_tl_van_nghia.sql");
  assert.ok(Number(TEP!.slice(0, 4)) >= 61, TEP);
});

test("HÀNG RÀO trang ghép: ĐÚNG tập cột tl_van_nghia — chỉ véc-tơ nội dung kho, không cột câu hỏi / người hỏi", () => {
  const db = open();
  const cols = (db.prepare("PRAGMA table_info(tl_van_nghia)").all() as { name: string }[]).map((c) => c.name);
  assert.deepEqual(cols, ["khoa", "mau", "so_chieu", "vec", "created_at", "created_by", "updated_at", "updated_by"]);
});

test("V4: vec phải là BLOB dài ĐÚNG so_chieu × 4; so_chieu > 0; khoá 64 ký tự; không gieo", () => {
  const db = open();
  assert.equal((db.prepare("SELECT count(*) AS n FROM tl_van_nghia").get() as { n: number }).n, 0);
  them(db, K("a"), 2, new Uint8Array(8));
  assert.throws(() => them(db, K("b"), 2, new Uint8Array(7)), /CHECK/);
  assert.throws(() => them(db, K("c"), 2, "abcdefgh"), /CHECK/);
  assert.throws(() => them(db, K("d"), 0, new Uint8Array(0)), /CHECK/);
  assert.throws(() => them(db, "a".repeat(63), 2, new Uint8Array(8)), /CHECK/);
  const r = db.prepare("SELECT typeof(vec) AS t, length(vec) AS n FROM tl_van_nghia WHERE khoa = ?").get(K("a")) as { t: string; n: number };
  assert.deepEqual({ ...r }, { t: "blob", n: 8 });
});

test("V4: chỉ thêm — UPDATE / DELETE bị trigger chặn; INSERT … ON CONFLICT(khoa) DO NOTHING hai lần cùng khoá không lỗi, không trùng", () => {
  const db = open();
  them(db, K("a"), 2, new Uint8Array(8));
  them(db, K("a"), 2, Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]), "ON CONFLICT(khoa) DO NOTHING");
  assert.equal((db.prepare("SELECT count(*) AS n FROM tl_van_nghia").get() as { n: number }).n, 1);
  assert.deepEqual([...(db.prepare("SELECT vec FROM tl_van_nghia").get() as { vec: Uint8Array }).vec], [0, 0, 0, 0, 0, 0, 0, 0], "dòng cũ giữ nguyên");
  assert.throws(() => db.exec(`UPDATE tl_van_nghia SET mau = 'x' WHERE khoa = '${K("a")}'`), /tl_append_only/);
  assert.throws(() => db.exec(`DELETE FROM tl_van_nghia WHERE khoa = '${K("a")}'`), /tl_append_only/);
});
```

- [ ] **Bước 3: Chạy cho đỏ**

Run: `node --test src/migrations-tro-ly-van-nghia.test.ts`
Expected: FAIL — `thiếu migrations/*_tl_van_nghia.sql`.

- [ ] **Bước 4: Viết migration** — tạo `migrations/0062_tl_van_nghia.sql`:

```sql
-- Module: tro-ly — dấu vân nghĩa (embedding OpenAI) của đoạn kho tri thức trợ lý Hỗ trợ (ADR-0076 Đ2, accepted 2026-10-01). Expand: MỘT bảng mới chỉ-thêm.
-- Số TẠM 0062: main tới 0060_tl_bo_nao, 0061_aut_session ở nhánh đăng nhập ⇒ ai gộp sau đổi tên tệp lên số lớn nhất lúc gộp + 1
-- (bài src/migrations-tro-ly-van-nghia.test.ts tìm theo đuôi tên).
--
-- tl_van_nghia — CHỈ véc-tơ của NỘI DUNG KHO (hướng dẫn, kiến trúc lời thường, cấu trúc / sơ đồ trang, ngữ cảnh bổ sung đã lọc); KHÔNG câu hỏi, không dữ liệu
--   khách / nhân viên (trang ghép §7 đặc tả). Không route nào đọc / ghi trực tiếp; máy chủ tính bù khi trả lời câu hỏi / ô thử.
--   khoa        SHA-256 hex (64 ký tự) của "đoạn đã định dạng|mã mẫu|số chiều" — đổi một chữ của đoạn ⇒ khoá mới ⇒ tính bù đúng đoạn đó.
--   mau         mã mẫu embedding (hằng trong mã, src/shared/tro-ly-van-nghia.ts) — không CHECK liệt kê.
--   so_chieu    số chiều (tham số `dimensions`); > 0.
--   vec         float32 thứ tự byte của máy (little-endian), dài ĐÚNG so_chieu × 4 byte; typeof phải là 'blob' (bind sai kiểu ⇒ lỗi ồn ào, không rác).
--   created_by / updated_by luôn NULL (= hệ thống — luật ADR-0003); updated_at = created_at (không sửa).
-- Ghi bằng INSERT … ON CONFLICT(khoa) DO NOTHING (nhiều câu hỏi đồng thời cùng tính bù không lỗi, không trùng); cấm OR REPLACE. Dòng cũ không còn dùng thì bỏ mặc.
CREATE TABLE tl_van_nghia (
  khoa       TEXT PRIMARY KEY CHECK (length(khoa) = 64),
  mau        TEXT NOT NULL,
  so_chieu   INTEGER NOT NULL CHECK (so_chieu > 0),
  vec        BLOB NOT NULL CHECK (typeof(vec) = 'blob' AND length(vec) = so_chieu * 4),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE TRIGGER tl_van_nghia_no_update BEFORE UPDATE ON tl_van_nghia
BEGIN SELECT RAISE(ABORT, 'tl_append_only: dấu vân nghĩa chỉ thêm, không sửa'); END;
CREATE TRIGGER tl_van_nghia_no_delete BEFORE DELETE ON tl_van_nghia
BEGIN SELECT RAISE(ABORT, 'tl_append_only: dấu vân nghĩa không xoá'); END;
```

- [ ] **Bước 5: Sổ dữ liệu.** Trong `docs/data-dictionary.json`, mảng `tables`, ngay SAU khối `{ "name": "tl_bo_nao", … }` thêm:

```json
    {
      "name": "tl_van_nghia",
      "module": "tro-ly",
      "kind": "table",
      "note": "dấu vân nghĩa (embedding OpenAI, ADR-0076 Đ2) của đoạn kho tri thức trợ lý — CHỈ nội dung kho (hướng dẫn, kiến trúc, sơ đồ trang, ngữ cảnh bổ sung đã lọc), KHÔNG câu hỏi / người hỏi; khoá = SHA-256 của đoạn đã định dạng + mẫu + số chiều; vec = BLOB float32 dài so_chieu × 4 (CHECK); CHỈ-THÊM, ghi bằng ON CONFLICT(khoa) DO NOTHING khi máy chủ tính bù; không route nào đọc / ghi trực tiếp"
    }
```

  và nối vào cuối chuỗi `note` của `tl_luot_hoi` (trước dấu `"` đóng):

```text
; từ ADR-0076: chi_phi_micro_usd = tiền mẫu trả lời + tiền embedding của lượt (câu hỏi + lô tính bù đoạn nếu có), token_vao / token_ra vẫn CHỈ của mẫu trả lời
```

  Rồi chạy `npm run dict`.

- [ ] **Bước 6: Chạy cho xanh**

Run: `node --test src/migrations-tro-ly-van-nghia.test.ts src/architecture.test.ts src/migrations-tro-ly-bo-nao.test.ts src/migrations-tro-ly.test.ts`
Expected: PASS (bài ADR-0003 thấy đủ cột kiểm toán; bài từ điển khớp bản sinh).

- [ ] **Bước 7: Commit**

```bash
git add migrations/0062_tl_van_nghia.sql src/migrations-tro-ly-van-nghia.test.ts docs/data-dictionary.json docs/DATA-DICTIONARY.md
git commit -F- <<'MSG'
Migration 0062 (số tạm): bảng chỉ-thêm tl_van_nghia cho dấu vân nghĩa

ADR-0076 Đ2: dấu vân của mỗi đoạn hướng dẫn tính một lần rồi lưu, khoá theo nội
dung nên đổi chữ chỉ tính lại đúng đoạn đó. CHECK buộc véc-tơ là BLOB đúng độ dài
để lỗi kiểu dữ liệu lộ ngay thay vì ghi rác. Thêm đủ cột kiểm toán theo ADR-0003.
Tiền lượt nay gồm cả embedding — ghi chú ở sổ dữ liệu.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FmJwaU8mvvF2WEt1gd4Wt3
MSG
```

---

### Task 4: Repository + `van-nghia.ts` (gọi embeddings, bộ nhớ isolate, tính bù, lùi) + khung thử

**Files:**
- Modify: `src/modules/tro-ly/repository.ts` (thêm hai câu SQL + ba hàm, cuối tệp)
- Modify: `src/modules/tro-ly/goi-mau.ts` (import kèm `.ts`; xuất `diaChiOpenAi`)
- Create: `src/modules/tro-ly/van-nghia.ts`
- Create: `src/modules/tro-ly/van-nghia.test.ts`
- Modify: `tests/audit/harness.mjs` (xuất `xoaBoNhoVanNghia`, gọi đầu `world()`)

**Interfaces:**
- Consumes: Task 1–2 (`khoaDoan`, `blobSangVec`, `vecSangBlob`, `chiaLoNhung`, `thanNhung`, `docPhanHoiNhung`, `chiPhiNhungMicroUsd`, `tienBuUoc`, `chonDoanTron`, `daChonTuKhoa`, hằng); `chonDoan`, `dinhDangDoan`, `uocToken` từ `tro-ly.ts`.
- Produces (Task 5 dùng):
  - repository: `interface DongVanNghia { khoa: string; soChieu: number; vec: unknown }`, `docVanNghia(db, khoa: readonly string[]): Promise<DongVanNghia[]>`, `interface VanNghiaMoi { khoa: string; mau: string; soChieu: number; vec: Uint8Array }`, `vanNghiaStatement(db, v, at): D1PreparedStatement`, `ghiVanNghia(db, ds: readonly VanNghiaMoi[], at: string, lo: number): Promise<void>`
  - goi-mau: `diaChiOpenAi(env: Env): string`
  - van-nghia: `xoaBoNhoVanNghia(): void`, `goiNhung(env, khoa, dauVao, henMs?): Promise<{ vec: Float32Array[]; token: number } | null>`, `interface DauVaoTim { truyVan: string; perms: readonly PermissionCode[]; kho: readonly DoanTriThuc[]; conLaiMicroUsd: number }`, `interface KetQuaTimDoan { daChon: DoanDaChon[]; tienNhungMicroUsd: number }`, `timDoanTheoNghia(env, khoa, a: DauVaoTim): Promise<KetQuaTimDoan>`

- [ ] **Bước 1: Viết bài đỏ** — tạo `src/modules/tro-ly/van-nghia.test.ts`:

```ts
// Tầng máy chủ của tìm theo nghĩa (ADR-0076) nạp THẲNG (không qua route): gọi Embeddings (hạn giờ, usage thiếu, thân G2) và repository tl_van_nghia
// trên D1 giả = SQLite thật (tests/audit/harness.mjs). Bài route (V2, V3, V5, L1, L2, P1–P3, H1, G1) ở van-nghia-route.test.ts.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { fakeD1, openDb } from "../../../tests/audit/harness.mjs";
import { goiNhung } from "./van-nghia.ts";
import { docVanNghia, ghiVanNghia } from "./repository.ts";
import { MAU_NHUNG, SO_CHIEU_NHUNG, blobSangVec, vecSangBlob } from "../../shared/tro-ly-van-nghia.ts";

const fetchThat = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchThat; });
const ENV = { OPENAI_BASE_URL: "https://may-gia.vn/" } as unknown as Env;
const NOW = "2026-10-01T01:00:00.000Z";
const vec1 = (i: number) => { const e = new Array(SO_CHIEU_NHUNG).fill(0); e[i] = 1; return e; };

test("goiNhung: POST <gốc>/v1/embeddings, Bearer khoá, thân ĐÚNG bốn khoá (G2); xếp theo index; token = usage.prompt_tokens", async () => {
  let url = ""; let auth = ""; let body: Record<string, unknown> = {};
  globalThis.fetch = (async (i: RequestInfo | URL, init?: RequestInit) => {
    url = String(i); auth = new Headers(init?.headers).get("authorization") ?? ""; body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ data: [{ index: 1, embedding: vec1(1) }, { index: 0, embedding: vec1(0) }], usage: { prompt_tokens: 9 } }), { status: 200 });
  }) as typeof fetch;
  const kq = await goiNhung(ENV, "khoa-gia", ["a", "b"]);
  assert.equal(url, "https://may-gia.vn/v1/embeddings");
  assert.equal(auth, "Bearer khoa-gia");
  assert.deepEqual(Object.keys(body).sort(), ["dimensions", "encoding_format", "input", "model"]);
  assert.equal(kq!.token, 9);
  assert.equal(kq!.vec[0]![0], 1);
  assert.equal(kq!.vec[1]![1], 1);
});

test("Review Focus 2: phản hồi KHÔNG có usage ⇒ token = ƯỚC (1 token ≈ 3 ký tự), không bao giờ 0", async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ data: [{ index: 0, embedding: vec1(0) }] }), { status: 200 })) as typeof fetch;
  assert.equal((await goiNhung(ENV, "k", ["abcdef"]))!.token, 2);
});

test("L1: lỗi HTTP / mạng hỏng / quá hạn giờ ⇒ null (không ném); quá giờ dừng đúng hạn", async () => {
  globalThis.fetch = (async () => new Response("{}", { status: 500 })) as typeof fetch;
  assert.equal(await goiNhung(ENV, "k", ["a"]), null);
  globalThis.fetch = (async () => { throw new TypeError("mạng hỏng"); }) as typeof fetch;
  assert.equal(await goiNhung(ENV, "k", ["a"]), null);
  globalThis.fetch = ((_i: RequestInfo | URL, init?: RequestInit) =>
    new Promise((_ok, loi) => init!.signal!.addEventListener("abort", () => loi(new DOMException("hết giờ", "AbortError"))))) as typeof fetch;
  const t0 = Date.now();
  assert.equal(await goiNhung(ENV, "k", ["a"], 20), null);
  assert.ok(Date.now() - t0 < 1000, "dừng theo hạn giờ");
});

test("V4 + Review Focus 3: ghiVanNghia hai lô CÙNG khoá không lỗi, không trùng; docVanNghia đọc lại BLOB giải mã đúng véc-tơ", async () => {
  const sqlite = openDb();
  const db = fakeD1(sqlite);
  const v = new Float32Array(SO_CHIEU_NHUNG); v[3] = 0.5; v[511] = -2;
  const a = { khoa: "a".repeat(64), mau: MAU_NHUNG, soChieu: SO_CHIEU_NHUNG, vec: vecSangBlob(v) };
  await ghiVanNghia(db, [a], NOW, 50);
  await ghiVanNghia(db, [a, { ...a, khoa: "b".repeat(64) }], NOW, 1);
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM tl_van_nghia").get().n, 2);
  const [r] = await docVanNghia(db, ["a".repeat(64), "c".repeat(64)]);
  assert.equal(r!.khoa, "a".repeat(64));
  assert.deepEqual([...blobSangVec(r!.vec, r!.soChieu)!], [...v]);
  assert.deepEqual(await docVanNghia(db, []), []);
});
```

- [ ] **Bước 2: Chạy cho đỏ**

Run: `node --test src/modules/tro-ly/van-nghia.test.ts`
Expected: FAIL — `Cannot find module …/van-nghia.ts` (hoặc `docVanNghia` không được xuất).

- [ ] **Bước 3: Repository** — thêm vào cuối `src/modules/tro-ly/repository.ts`:

```ts
// tl_van_nghia (ADR-0076, migration *_tl_van_nghia): CHỈ-THÊM. Đọc theo danh sách khoá bằng MỘT tham số JSON (json_each — câu tĩnh, không đụng trần số tham số
// của D1); ghi MỘT dòng mỗi câu (5 tham số) bằng ON CONFLICT(khoa) DO NOTHING — nhiều câu hỏi đồng thời cùng tính bù không lỗi, không trùng (cấm OR REPLACE).
const VAN_NGHIA_THEO_KHOA = defineSql(
  "tro-ly",
  "van-nghia-theo-khoa",
  "SELECT khoa, so_chieu, vec FROM tl_van_nghia WHERE khoa IN (SELECT value FROM json_each(?1))",
);
const THEM_VAN_NGHIA = defineSql(
  "tro-ly",
  "them-van-nghia",
  "INSERT INTO tl_van_nghia (khoa, mau, so_chieu, vec, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?5, NULL) ON CONFLICT(khoa) DO NOTHING",
);

/** `vec` giữ NGUYÊN dạng D1 trả (ArrayBuffer / Uint8Array / mảng số) — giải mã ở blobSangVec. */
export interface DongVanNghia { readonly khoa: string; readonly soChieu: number; readonly vec: unknown }
export async function docVanNghia(db: D1Database, khoa: readonly string[]): Promise<DongVanNghia[]> {
  if (!khoa.length) return [];
  const r = await db.prepare(VAN_NGHIA_THEO_KHOA).bind(JSON.stringify(khoa)).all<{ khoa: string; so_chieu: number; vec: unknown }>();
  return r.results.map((x) => ({ khoa: x.khoa, soChieu: x.so_chieu, vec: x.vec }));
}

export interface VanNghiaMoi { readonly khoa: string; readonly mau: string; readonly soChieu: number; readonly vec: Uint8Array }
export const vanNghiaStatement = (db: D1Database, v: VanNghiaMoi, at: string): D1PreparedStatement =>
  db.prepare(THEM_VAN_NGHIA).bind(v.khoa, v.mau, v.soChieu, v.vec, at);
/** Gom `lo` câu một db.batch (mỗi lô nguyên tử; dòng nào cũng trọn vẹn — không có "dòng dở"). */
export async function ghiVanNghia(db: D1Database, ds: readonly VanNghiaMoi[], at: string, lo: number): Promise<void> {
  for (let i = 0; i < ds.length; i += lo) await db.batch(ds.slice(i, i + lo).map((v) => vanNghiaStatement(db, v, at)));
}
```

- [ ] **Bước 4: `goi-mau.ts`** — đổi hai dòng import và gốc địa chỉ:

```ts
import { HET_GIO_MS, docPhanHoi, maLoiOpenAi, tachNguon, type DoanTriThuc, type SuDung } from "../../shared/tro-ly.ts";
import { anSoTien } from "../../shared/tro-ly-loc-tien.ts";

const OPENAI_MAC_DINH = "https://api.openai.com";
/** Gốc địa chỉ OpenAI (OPENAI_BASE_URL chỉ cho e2e / máy giả), bỏ dấu / cuối — MỘT chỗ cho Responses và Embeddings (van-nghia.ts). */
export const diaChiOpenAi = (env: Env): string => (env.OPENAI_BASE_URL?.trim() || OPENAI_MAC_DINH).replace(/\/+$/, "");
```

  và trong `goiOpenAi` thay dòng `const goc = (env.OPENAI_BASE_URL?.trim() || OPENAI_MAC_DINH).replace(/\/+$/, "");` bằng `const goc = diaChiOpenAi(env);`. Sửa dòng chú thích đầu tệp thêm: "Import KÈM đuôi .ts: van-nghia.ts (nạp thẳng bằng node --test) import tệp này."

- [ ] **Bước 5: `van-nghia.ts`** — tạo `src/modules/tro-ly/van-nghia.ts`:

```ts
// Tìm đoạn theo nghĩa cho trợ lý Hỗ trợ (ADR-0076 Đ2–Đ5) — MỘT hàm `timDoanTheoNghia` cho route hỏi VÀ ô thử (không chép khối). Gọi OpenAI Embeddings
// (hạn giờ riêng 8 giây), bộ nhớ isolate, tính bù dấu vân của đoạn kho còn thiếu; lỗi / quá giờ / phản hồi lệch / giải mã hỏng / tính bù sẽ vượt trần ⇒ LÙI về
// chonDoan (luật cũ) — câu trả lời vẫn chạy; log CHỈ `{"event":"tro_ly_van_nghia_loi"}` (không nội dung).
// SQL chỉ ở repository.ts (module nghiêm). Import KÈM đuôi .ts để van-nghia.test.ts nạp thẳng tệp này bằng node --test.
import type { PermissionCode } from "../../shared/permissions.ts";
import { chonDoan, dinhDangDoan, uocToken, type DoanTriThuc } from "../../shared/tro-ly.ts";
import {
  HET_GIO_NHUNG_MS, LO_GHI_D1, MAU_NHUNG, SO_CHIEU_NHUNG, blobSangVec, chiaLoNhung, chiPhiNhungMicroUsd, chonDoanTron, daChonTuKhoa, docPhanHoiNhung, khoaDoan,
  thanNhung, tienBuUoc, vecSangBlob, type DoanDaChon,
} from "../../shared/tro-ly-van-nghia.ts";
import { diaChiOpenAi } from "./goi-mau.ts";
import { docVanNghia, ghiVanNghia, type VanNghiaMoi } from "./repository.ts";

/**
 * Bộ nhớ isolate (V5): khoá → véc-tơ ĐỌC ĐƯỢC TỪ D1. Véc-tơ vừa tính bù KHÔNG vào đây (R1 của kế hoạch — để lần sau đường đọc + giải mã BLOB thật chạy);
 * véc-tơ CÂU HỎI không bao giờ vào đây. `khoaTheoChu` nhớ băm SHA-256 của chữ đoạn (chữ kho ít đổi).
 */
const boNho = new Map<string, Float32Array>();
const khoaTheoChu = new Map<string, string>();
/** Khung thử (tests/audit/harness.mjs) gọi đầu mỗi world(): mỗi world là một D1 mới. */
export function xoaBoNhoVanNghia(): void {
  boNho.clear();
  khoaTheoChu.clear();
}

export interface KetQuaNhung { readonly vec: Float32Array[]; readonly token: number }

/** null = lỗi HTTP / mạng / quá giờ / phản hồi lệch khuôn. `token` = usage.prompt_tokens; thiếu ⇒ ƯỚC (không bao giờ tính 0 khi không biết). */
export async function goiNhung(env: Env, khoa: string, dauVao: readonly string[], henMs: number = HET_GIO_NHUNG_MS): Promise<KetQuaNhung | null> {
  const ctl = new AbortController();
  const hen = setTimeout(() => ctl.abort(), henMs);
  try {
    const res = await fetch(`${diaChiOpenAi(env)}/v1/embeddings`, {
      method: "POST",
      headers: { authorization: `Bearer ${khoa}`, "content-type": "application/json" },
      body: JSON.stringify(thanNhung(dauVao)),
      signal: ctl.signal,
    });
    if (!res.ok) return null;
    const doc = docPhanHoiNhung(await res.json().catch(() => null), dauVao.length);
    if (!doc) return null;
    return { vec: doc.vec, token: doc.token ?? dauVao.reduce((a, s) => a + uocToken(s), 0) };
  } catch {
    return null;
  } finally {
    clearTimeout(hen);
  }
}

export interface DauVaoTim {
  /** Câu hỏi đã che (+ câu hỏi trước đã che — truyVanTim, C5). */
  readonly truyVan: string;
  readonly perms: readonly PermissionCode[];
  readonly kho: readonly DoanTriThuc[];
  /** Trần tháng − đã dùng − mức trần trên của lượt (kiemTranTruocKhiGoi) — trần cho tiền tính bù (Đ5(2)). */
  readonly conLaiMicroUsd: number;
}
export interface KetQuaTimDoan { readonly daChon: DoanDaChon[]; readonly tienNhungMicroUsd: number }

async function khoaCuaChu(s: string): Promise<string> {
  const co = khoaTheoChu.get(s);
  if (co) return co;
  const k = await khoaDoan(s);
  khoaTheoChu.set(s, k);
  return k;
}

/**
 * Thứ tự (R5): băm → bộ nhớ / D1 → kiểm tiền tính bù (vượt ⇒ lùi, KHÔNG gọi API nào) → embedding câu hỏi (yêu cầu riêng) → tính bù theo lô → ghi D1 CHỈ khi mọi
 * lô thành công (L2) → chonDoanTron. `tienNhungMicroUsd` = tiền thật của mọi lần gọi Embeddings THÀNH CÔNG trong lượt (kể cả khi sau đó lùi).
 */
export async function timDoanTheoNghia(env: Env, khoa: string, a: DauVaoTim): Promise<KetQuaTimDoan> {
  let tien = 0;
  const lui = (): KetQuaTimDoan => {
    console.error(JSON.stringify({ event: "tro_ly_van_nghia_loi" }));
    return { daChon: daChonTuKhoa(chonDoan(a.truyVan, a.perms, a.kho)), tienNhungMicroUsd: tien };
  };
  try {
    const chu = a.kho.map(dinhDangDoan);
    const khoaDs = await Promise.all(chu.map(khoaCuaChu));
    const vec = new Map<string, Float32Array>();
    for (const k of khoaDs) {
      const v = boNho.get(k);
      if (v) vec.set(k, v);
    }
    for (const r of await docVanNghia(env.DB, [...new Set(khoaDs.filter((k) => !vec.has(k)))])) {
      const v = r.soChieu === SO_CHIEU_NHUNG ? blobSangVec(r.vec, r.soChieu) : null;
      if (!v) return lui(); // giải mã hỏng ≠ thiếu: không tính bù lại âm thầm (Review Focus 3)
      vec.set(r.khoa, v);
      boNho.set(r.khoa, v);
    }
    const thieu = new Map<string, string>(); // khoá → chữ; hai đoạn cùng chữ = một đầu vào (Review Focus 4)
    khoaDs.forEach((k, i) => {
      if (!vec.has(k) && !thieu.has(k)) thieu.set(k, chu[i]!);
    });
    if (tienBuUoc([...thieu.values()]) > a.conLaiMicroUsd) return lui(); // Đ5(2)
    const q = await goiNhung(env, khoa, [a.truyVan]);
    if (!q) return lui();
    tien += chiPhiNhungMicroUsd(q.token);
    if (thieu.size) {
      const ds = [...thieu.entries()];
      const moi: VanNghiaMoi[] = [];
      let j = 0;
      for (const lo of chiaLoNhung(ds.map(([, s]) => s))) {
        const kq = await goiNhung(env, khoa, lo);
        if (!kq) return lui(); // L2: chưa ghi dòng nào — lần sau tính lại
        tien += chiPhiNhungMicroUsd(kq.token);
        for (const v of kq.vec) {
          const k = ds[j++]![0];
          vec.set(k, v);
          moi.push({ khoa: k, mau: MAU_NHUNG, soChieu: SO_CHIEU_NHUNG, vec: vecSangBlob(v) });
        }
      }
      await ghiVanNghia(env.DB, moi, new Date().toISOString(), LO_GHI_D1);
    }
    return { daChon: chonDoanTron(a.truyVan, q.vec[0]!, a.kho, khoaDs.map((k) => vec.get(k) ?? null), a.perms), tienNhungMicroUsd: tien };
  } catch {
    return lui();
  }
}
```

- [ ] **Bước 6: Khung thử** — trong `tests/audit/harness.mjs`:
  - chuỗi bundle của `app` thêm `export { xoaBoNhoVanNghia } from "./modules/tro-ly/van-nghia";` vào cuối chuỗi (sau `export { listAll } from "./modules/audit/repository";`).
  - dòng đầu thân `export function world(tuyChon = {}) {` thêm:

```js
  // ADR-0076: bộ nhớ isolate của dấu vân nghĩa sống theo MÔ-ĐUN (ứng dụng nạp một lần mỗi tiến trình thử); mỗi world là một D1 mới ⇒ xoá, kẻo bài sau thấy véc-tơ của bài trước.
  app.xoaBoNhoVanNghia();
```

- [ ] **Bước 7: Chạy cho xanh**

Run: `node --test src/modules/tro-ly/van-nghia.test.ts src/architecture.test.ts`
Expected: PASS (EXPLAIN hai câu mới ghi / đọc đúng bảng của `tro-ly`; không `.prepare(<chuỗi>)` ngoài repository).

Run: `npm run typecheck`
Expected: 0 lỗi.

- [ ] **Bước 8: Commit**

```bash
git add src/modules/tro-ly/repository.ts src/modules/tro-ly/goi-mau.ts src/modules/tro-ly/van-nghia.ts src/modules/tro-ly/van-nghia.test.ts tests/audit/harness.mjs
git commit -F- <<'MSG'
Máy chủ tìm theo nghĩa: gọi Embeddings, bộ nhớ isolate, tính bù, lùi từ khoá

ADR-0076 Đ2, Đ4, Đ5: một hàm cho cả câu hỏi và ô thử. Đoạn thiếu dấu vân được tính
bù theo lô và chỉ ghi khi mọi lô thành công; lỗi, quá 8 giây hay tính bù sắp vượt
trần đều lùi về tìm từ khoá như hôm nay để câu trả lời không hỏng. Bộ nhớ chỉ nạp
véc-tơ đọc từ D1 để đường giải mã BLOB thật luôn được chạy.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FmJwaU8mvvF2WEt1gd4Wt3
MSG
```

---

### Task 5: Nối route hỏi + ô thử; kiểm trần mức trên; bài route (V2, V3, V5, L1, L2, P1–P3, H1, G1, G2)

**Files:**
- Modify: `src/modules/tro-ly/index.ts` (import; `kiemTranTruocKhiGoi`; route `POST /api/tro-ly/hoi` khoảng dòng 261–318; route `POST /api/tro-ly/thu` khoảng dòng 463–494)
- Modify: `src/shared/contracts.ts:1663` (`TroLyThuResponse`)
- Create: `src/modules/tro-ly/van-nghia-route.test.ts`
- Modify (máy giả cũ — R9): `src/modules/tro-ly/tro-ly-route.test.ts:25`, `src/modules/tro-ly/bo-nao-route.test.ts:24` và `:242`, `src/modules/tro-ly/bang-dieu-khien-route.test.ts:32`; bài T1 `bo-nao-route.test.ts:284-299`

**Interfaces:**
- Consumes: Task 4 (`timDoanTheoNghia`), Task 1 (`mucTranTren`).
- Produces: `kiemTranTruocKhiGoi(boNao: { mau: string; tokenRaToiDa: number }, thanKhongTaiLieu: Record<string, unknown>, truyVan: string, daDungThang: number, tranThang: number): { vuot: boolean; conLai: number }`; `TroLyDoanDaChon { ten: string; theoNghia: boolean; theoTuKhoa: boolean }`; `TroLyThuResponse` thêm `chiPhiVanNghiaMicroUsd: number`, `doanDaChon: TroLyDoanDaChon[]` (Task 6 dùng).

- [ ] **Bước 1: Máy giả cũ trả 503 cho embeddings (R9).** Bốn chỗ:
  - `tro-ly-route.test.ts` hàm `openAiGia`: ngay sau dòng `const url = String(input instanceof Request ? input.url : input);` thêm:

```ts
    // ADR-0076: cửa /v1/embeddings của máy giả TẮT (503) ⇒ máy chủ lùi về chọn đoạn theo từ khoá = đúng luật cũ mà các bài trong tệp này canh;
    // `goi` chỉ ghi /v1/responses. Đường tìm theo nghĩa được canh ở van-nghia-route.test.ts.
    if (url.endsWith("/v1/embeddings")) return new Response(JSON.stringify({ error: { message: "tắt" } }), { status: 503 });
```

  - `bo-nao-route.test.ts` hàm `openAiGia` (dòng 24) và máy giả riêng của bài "Phòng thủ" (dòng 242), `bang-dieu-khien-route.test.ts` hàm `openAiGia` (dòng 32): đổi tham số đầu `_i` / `_input` thành `i` rồi thêm ở dòng đầu thân hàm:

```ts
    // ADR-0076: cửa /v1/embeddings TẮT (503) ⇒ lùi từ khoá = luật cũ; `goi` chỉ ghi /v1/responses (đường mới canh ở van-nghia-route.test.ts).
    if (String(i instanceof Request ? i.url : i).endsWith("/v1/embeddings")) return new Response(JSON.stringify({ error: { message: "tắt" } }), { status: 503 });
```

- [ ] **Bước 2: Sửa bài T1** (`bo-nao-route.test.ts`, bài "T1 + T5") — thay dòng `assert.deepEqual({ ...r.json, traLoi: "-", nguon: "-" }, …)` bằng:

```ts
  assert.deepEqual(
    { ...r.json, traLoi: "-", nguon: "-", doanDaChon: "-" },
    { traLoi: "-", nguon: "-", doanDaChon: "-", tokenVao: 3000, tokenRa: 400, chiPhiMicroUsd: 1550, chiPhiUsd: 0.00155, chiPhiVanNghiaMicroUsd: 0, mau: "gpt-5-mini" },
  ); // 3000 × 0,25 + 400 × 2; embeddings của máy giả tắt ⇒ 0 tiền tìm theo nghĩa
  assert.ok(r.json.doanDaChon.length > 0 && r.json.doanDaChon.every((d: { theoNghia: boolean; theoTuKhoa: boolean }) => d.theoTuKhoa && !d.theoNghia), "lùi từ khoá");
```

- [ ] **Bước 3: Viết bài đỏ** — tạo `src/modules/tro-ly/van-nghia-route.test.ts`:

```ts
// Tìm theo nghĩa (ADR-0076) qua route THẬT — CẢ ứng dụng trên SQLite (tests/audit/harness.mjs); OpenAI thay bằng `globalThis.fetch` giả HAI cửa:
// /v1/embeddings (véc-tơ một-nóng: chữ có "pin" ⇒ chiều 0, còn lại ⇒ chiều 1; trả `data` theo thứ tự ĐẢO — máy chủ phải xếp theo index) và /v1/responses.
// Phủ V2, V3, V5, L1, L2, P1, P2, P3, H1, G1, G2, C5 (route); Review Focus 1, 4, 5. Hàng rào ở docs/SO-HANG-RAO.md (lùi từ khoá; tiền + trần).
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { chiaKho, chonDoan, dinhDangDoan, truyVanTim } from "../../shared/tro-ly.ts";
import { MAU_NHUNG, SO_CHIEU_NHUNG, chiPhiNhungMicroUsd, tienBuUoc } from "../../shared/tro-ly-van-nghia.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const SUP = "77777777-7777-4777-8777-777777777777";
const CUOC = "0f1e2d3c-4b5a-4968-8778-a1b2c3d4e5f6";
const SU_KIEN = '{"event":"tro_ly_van_nghia_loi"}';
const fetchThat = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchThat; });

interface Goi { url: string; body: Record<string, unknown> }
interface TuyChon { nhung?: "ok" | "loi" | "nem" | "sai_chieu" | "lo_loi"; usageNhung?: number | null; chu?: string }
function openAiGia(t: TuyChon = {}) {
  const nhung: Goi[] = [];
  const traLoi: Goi[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    if (url.endsWith("/v1/embeddings")) {
      nhung.push({ url, body });
      const dau = body.input as string[];
      if (t.nhung === "nem") throw new TypeError("mạng hỏng");
      if (t.nhung === "loi" || (t.nhung === "lo_loi" && dau.length > 1)) return new Response(JSON.stringify({ error: { message: "x" } }), { status: 500 });
      const chieu = t.nhung === "sai_chieu" ? SO_CHIEU_NHUNG - 1 : SO_CHIEU_NHUNG;
      const data = dau.map((s, index) => { const e = new Array(chieu).fill(0); e[/pin/i.test(s) ? 0 : 1] = 1; return { object: "embedding", index, embedding: e }; }).reverse();
      const tok = t.usageNhung ?? 100 * dau.length;
      return new Response(JSON.stringify({ object: "list", data, model: MAU_NHUNG, ...(t.usageNhung === null ? {} : { usage: { prompt_tokens: tok, total_tokens: tok } }) }), { status: 200 });
    }
    traLoi.push({ url, body });
    const ins = String(body.instructions ?? "");
    const ten = /\[([^\]]+)\]/.exec(ins.slice(ins.lastIndexOf("TÀI LIỆU:")))?.[1] ?? "";
    return new Response(JSON.stringify({
      output: [{ type: "message", content: [{ type: "output_text", text: t.chu ?? `Làm theo hướng dẫn.${ten ? `\nNguồn: [${ten}]` : ""}` }] }],
      usage: { input_tokens: 4000, input_tokens_details: { cached_tokens: 0 }, output_tokens: 500 },
    }), { status: 200 });
  }) as typeof fetch;
  return { nhung, traLoi };
}

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  (w.env as Record<string, unknown>).OPENAI_API_KEY = "khoa-gia-du-dai-0123456789";
  return w;
}
type W = ReturnType<typeof setup>;
const hoi = (w: W, cauHoi: string, cuoc?: string) => w.call("POST", "/api/tro-ly/hoi", { as: SALES, body: cuoc ? { cauHoi, cuocTroChuyen: cuoc } : { cauHoi } });
const soDong = (w: W): number => w.q("SELECT count(*) AS n FROM tl_van_nghia")[0]!.n as number;
const luot = (w: W) => w.q("SELECT chi_phi_micro_usd AS c, token_vao AS v, token_ra AS r, la_thu AS t FROM tl_luot_hoi ORDER BY rowid").map((x) => [x.c, x.v, x.r, x.t]);
/** Đếm câu SELECT tới tl_van_nghia (V5). */
function demDocVanNghia(w: W): () => number {
  let n = 0;
  const db = w.env.DB as { prepare: (s: string) => unknown };
  const goc = db.prepare;
  db.prepare = (sql: string) => { if (/^\s*SELECT\b[\s\S]*\btl_van_nghia\b/i.test(sql)) n++; return goc(sql); };
  return () => n;
}
function batLog(): { dung: () => string[] } {
  const log: string[] = [];
  const goc = console.error;
  console.error = (...a: unknown[]) => { log.push(a.map(String).join(" ")); };
  return { dung: () => { console.error = goc; return log; } };
}
const MO = 400; // tiền mẫu nano của máy giả: 4.000 × 0,05 + 500 × 0,40
const N = chiaKho().length;

test("V2 + V5 + P1: câu 1 tính bù MỌI đoạn (một lô) + câu hỏi; câu 2 chỉ câu hỏi, đọc D1 MỘT lần; câu 3 không đọc D1; tiền lượt = mẫu + embedding, token chỉ của mẫu", async () => {
  const w = setup();
  const g = openAiGia();
  const doc = demDocVanNghia(w);
  assert.equal((await hoi(w, "đổi mã PIN thế nào")).status, 200);
  assert.equal(g.nhung.length, 2);
  assert.deepEqual(g.nhung[0]!.body.input, ["đổi mã PIN thế nào"]);
  assert.deepEqual(new Set(g.nhung[1]!.body.input as string[]), new Set(chiaKho().map(dinhDangDoan)));
  assert.equal((g.nhung[1]!.body.input as string[]).length, N);
  const d = w.q("SELECT count(*) AS n, sum(typeof(vec) = 'blob') AS b, min(length(vec)) AS mn, max(length(vec)) AS mx FROM tl_van_nghia")[0]!;
  assert.deepEqual({ ...d }, { n: N, b: N, mn: SO_CHIEU_NHUNG * 4, mx: SO_CHIEU_NHUNG * 4 });
  assert.equal(doc(), 1, "câu 1: một lần hỏi D1 (chưa có dòng)");
  assert.equal((await hoi(w, "đổi mã PIN thế nào")).status, 200);
  assert.equal(g.nhung.length, 3, "câu 2: chỉ véc-tơ câu hỏi");
  assert.equal(doc(), 2, "câu 2: đọc D1 một lần (véc-tơ vừa tính bù không nạp bộ nhớ — R1)");
  assert.equal((await hoi(w, "đổi mã PIN thế nào")).status, 200);
  assert.equal(g.nhung.length, 4);
  assert.equal(doc(), 2, "câu 3: bộ nhớ isolate, không đọc D1");
  const tienQ = chiPhiNhungMicroUsd(100);
  assert.deepEqual(luot(w), [
    [MO + tienQ + chiPhiNhungMicroUsd(100 * N), 4000, 500, 0],
    [MO + tienQ, 4000, 500, 0],
    [MO + tienQ, 4000, 500, 0],
  ]);
});

test("V3 + Review Focus 4: thêm một đoạn Ngữ cảnh bổ sung ⇒ câu kế tiếp chỉ tính bù ĐÚNG đoạn đó; hai đoạn cùng chữ ⇒ một đầu vào, một dòng", async () => {
  const w = setup();
  const g = openAiGia();
  await hoi(w, "đổi mã PIN thế nào");
  const nc = { tieuDe: "Giờ làm việc văn phòng", noiDung: "Văn phòng mở cửa từ bảy giờ sáng đến năm giờ chiều.", bat: true };
  assert.equal((await w.call("POST", "/api/tro-ly/ngu-canh", { as: SUP, body: nc })).status, 200);
  assert.equal((await w.call("POST", "/api/tro-ly/ngu-canh", { as: SUP, body: nc })).status, 200);
  const truoc = g.nhung.length;
  assert.equal((await hoi(w, "văn phòng mở cửa mấy giờ")).status, 200);
  assert.equal(g.nhung.length, truoc + 2);
  assert.deepEqual(g.nhung.at(-1)!.body.input, [`[Ngữ cảnh bổ sung › ${nc.tieuDe}]\n${nc.noiDung}`]);
  assert.equal(soDong(w), N + 1);
});

test("L1 HÀNG RÀO lùi về từ khoá: embeddings lỗi 500 / mạng hỏng / sai số chiều ⇒ 200, đoạn = chonDoan (luật cũ), 0 dòng tl_van_nghia, log ĐÚNG một sự kiện không nội dung", async () => {
  for (const nhung of ["loi", "nem", "sai_chieu"] as const) {
    const w = setup();
    const g = openAiGia({ nhung });
    const log = batLog();
    let r;
    try { r = await hoi(w, "đổi mã PIN thế nào"); } finally { log.dung(); }
    assert.equal(r.status, 200, `${nhung}: ${r.text}`);
    assert.equal(g.traLoi.length, 1);
    const cu = chonDoan("đổi mã PIN thế nào", ["SALES"], chiaKho());
    assert.ok(String(g.traLoi[0]!.body.instructions).endsWith(["TÀI LIỆU:", ...cu.map(dinhDangDoan)].join("\n")), `${nhung}: đúng luật cũ`);
    assert.equal(soDong(w), 0);
    const ds = log.dung().filter((l) => l.includes("van_nghia"));
    assert.deepEqual(ds, [SU_KIEN], nhung);
    assert.ok(!log.dung().join("\n").includes("PIN"), "log không nội dung");
  }
});

test("L2: lô tính bù lỗi (câu hỏi đã tính được) ⇒ 0 dòng ghi; tiền câu hỏi vẫn vào lượt; lần sau tính lại đủ", async () => {
  const w = setup();
  openAiGia({ nhung: "lo_loi" });
  assert.equal((await hoi(w, "đổi mã PIN thế nào")).status, 200);
  assert.equal(soDong(w), 0);
  assert.deepEqual(luot(w)[0], [MO + chiPhiNhungMicroUsd(100), 4000, 500, 0]);
  const g = openAiGia();
  assert.equal((await hoi(w, "đổi mã PIN thế nào")).status, 200);
  assert.equal(g.nhung.length, 2);
  assert.equal(soDong(w), N);
});

test("P2 + Review Focus 5 HÀNG RÀO trần trước MỌI lần gọi: (1) mức trần trên vượt ⇒ 429, 0 lần embeddings, 0 lần mẫu; (2) qua (1) nhưng tính bù vượt phần còn lại ⇒ 200, lùi từ khoá, 0 lần embeddings", async () => {
  const w = setup();
  const g = openAiGia();
  assert.equal((await w.call("POST", "/api/tro-ly/cai-dat", { as: SUP, body: { bat: true, tranThangUsd: 0.0005, tranNgay: 30 } })).status, 200);
  const r = await hoi(w, "đổi mã PIN thế nào");
  assert.equal(r.status, 429, r.text);
  assert.equal(r.json.error.code, "tro_ly_het_tran_thang");
  assert.deepEqual([g.nhung.length, g.traLoi.length], [0, 0]);

  // Trần 1.000 micro-USD: mức trần trên nano ≥ 6.000 × 0,05 + 1.200 × 0,40 = 780 ⇒ phần còn lại ≤ 220 < tiền tính bù cả kho.
  assert.ok(tienBuUoc(chiaKho().map(dinhDangDoan)) > 220, "tiền đề: tính bù cả kho vượt phần còn lại");
  const w2 = setup();
  const g2 = openAiGia();
  assert.equal((await w2.call("POST", "/api/tro-ly/cai-dat", { as: SUP, body: { bat: true, tranThangUsd: 0.001, tranNgay: 30 } })).status, 200);
  const log = batLog();
  let r2;
  try { r2 = await hoi(w2, "đổi mã PIN thế nào"); } finally { log.dung(); }
  assert.equal(r2.status, 200, r2.text);
  assert.deepEqual([g2.nhung.length, g2.traLoi.length], [0, 1]);
  assert.deepEqual(log.dung().filter((l) => l.includes("van_nghia")), [SU_KIEN]);
  assert.equal(luot(w2)[0]![0], MO, "không gọi embeddings ⇒ không tiền embedding");
});

test("G2 + C5 + G1: thân embeddings ĐÚNG bốn khoá, không SĐT / id người hỏi; truy vấn câu 2 = câu hiện tại + câu trước (đã che); chữ người dùng chỉ ở input; số tiền vẫn bị ẩn", async () => {
  const w = setup();
  const g = openAiGia({ chu: "Phí 500.000 đ.\nNguồn: [Bán hàng › Đổi PIN]" });
  assert.equal((await hoi(w, "khách 0905 123 456 hỏi đổi mã PIN", CUOC)).status, 200);
  const r = await hoi(w, "còn trên điện thoại thì sao", CUOC);
  assert.equal(r.status, 200, r.text);
  for (const x of g.nhung) {
    assert.deepEqual(Object.keys(x.body).sort(), ["dimensions", "encoding_format", "input", "model"]);
    assert.deepEqual([x.body.model, x.body.dimensions, x.body.encoding_format], [MAU_NHUNG, SO_CHIEU_NHUNG, "float"]);
    const s = JSON.stringify(x.body);
    for (const lo of ["0905", "123 456", SALES, "0900000001"]) assert.ok(!s.includes(lo), `thân embeddings lộ ${lo}`);
  }
  const cauTruoc = "khách [đã che] hỏi đổi mã PIN";
  assert.deepEqual(g.nhung[0]!.body.input, [cauTruoc]);
  assert.deepEqual(g.nhung.at(-1)!.body.input, [truyVanTim("còn trên điện thoại thì sao", cauTruoc)]);
  assert.ok(!String(g.traLoi.at(-1)!.body.instructions).includes("điện thoại thì sao"), "chữ người dùng chỉ ở input");
  assert.ok(!/500\.000/.test(r.json.traLoi), r.json.traLoi);
});

const NANO = { mau: "gpt-5-nano", mucSuyNghi: "minimal", doDai: "low", tokenRaToiDa: 1200, loiNhac: "Bạn là trợ lý thử." };
const thu = (w: W, cauHoi = "đổi mã PIN thế nào") => w.call("POST", "/api/tro-ly/thu", { as: SUP, body: { boNao: NANO, cauHoi, vai: "SALES" } });

test("P3 + H1: ô thử đi CÙNG đường tìm; lượt la_thu = 1 có tiền mẫu + embedding; phản hồi tách chiPhiMicroUsd (mẫu) và chiPhiVanNghiaMicroUsd; doanDaChon đúng khối TÀI LIỆU đã gửi", async () => {
  const w = setup();
  const g = openAiGia();
  const r = await thu(w);
  assert.equal(r.status, 200, r.text);
  const tienNhung = chiPhiNhungMicroUsd(100) + chiPhiNhungMicroUsd(100 * N);
  assert.deepEqual([r.json.chiPhiMicroUsd, r.json.chiPhiVanNghiaMicroUsd], [MO, tienNhung]);
  assert.deepEqual(luot(w), [[MO + tienNhung, 4000, 500, 1]]);
  assert.equal(w.q("SELECT count(*) AS n FROM tl_hoi_dap")[0]!.n, 0, "ô thử không ghi lịch sử");
  const ds = r.json.doanDaChon as { ten: string; theoNghia: boolean; theoTuKhoa: boolean }[];
  assert.ok(ds.length > 0 && ds.length <= 12);
  for (const d of ds) assert.deepEqual(Object.keys(d).sort(), ["ten", "theoNghia", "theoTuKhoa"]);
  assert.ok(ds.some((d) => d.theoNghia), "có đoạn khớp nghĩa");
  // mỗi `[tên]\n` có trong khối TÀI LIỆU đã gửi, ĐÚNG thứ tự (so bằng vị trí — dòng "[…]" trong nội dung đoạn không làm lệch)
  const ins = String(g.traLoi[0]!.body.instructions);
  let tu = ins.lastIndexOf("TÀI LIỆU:");
  for (const d of ds) {
    const o = ins.indexOf(`\n[${d.ten}]\n`, tu);
    assert.ok(o > tu, `thiếu hoặc sai thứ tự: ${d.ten}`);
    tu = o + 1;
  }
});

test("P3 + L1: ô thử khi embeddings lỗi ⇒ 200, mọi đoạn cờ khớp từ khoá, chiPhiVanNghiaMicroUsd 0", async () => {
  const w = setup();
  openAiGia({ nhung: "loi" });
  const log = batLog();
  let r;
  try { r = await thu(w); } finally { log.dung(); }
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.chiPhiVanNghiaMicroUsd, 0);
  assert.ok(r.json.doanDaChon.every((d: { theoNghia: boolean; theoTuKhoa: boolean }) => d.theoTuKhoa && !d.theoNghia));
});

test("P2 ô thử: trần thấp hơn mức trần trên ⇒ 429, 0 lần gọi bất kỳ (MỘT hàm kiểm trần với route hỏi)", async () => {
  const w = setup();
  const g = openAiGia();
  assert.equal((await w.call("POST", "/api/tro-ly/cai-dat", { as: SUP, body: { bat: true, tranThangUsd: 0.0005, tranNgay: 30 } })).status, 200);
  assert.equal((await thu(w)).status, 429);
  assert.deepEqual([g.nhung.length, g.traLoi.length], [0, 0]);
});

test("Review Focus 2 (route): phản hồi embeddings KHÔNG có usage ⇒ tiền lượt tính theo ƯỚC, không 0", async () => {
  const w = setup();
  openAiGia({ usageNhung: null });
  assert.equal((await hoi(w, "đổi mã PIN thế nào")).status, 200);
  assert.ok((luot(w)[0]![0] as number) > MO + tienBuUoc(chiaKho().map(dinhDangDoan)) - 1);
});
```

- [ ] **Bước 4: Chạy cho đỏ**

Run: `node --test src/modules/tro-ly/van-nghia-route.test.ts`
Expected: FAIL — bài V2 thấy `g.nhung.length` = 0 (route chưa gọi embeddings).

- [ ] **Bước 5: Hợp đồng** — `src/shared/contracts.ts`, thay dòng `export interface TroLyThuResponse …` (dòng 1663) bằng:

```ts
/** ADR-0076 Đ6 (H1): một đoạn đã gửi kèm câu hỏi thử — cờ khớp nghĩa / khớp từ khoá (đường lùi: chỉ khớp từ khoá). */
export interface TroLyDoanDaChon { ten: string; theoNghia: boolean; theoTuKhoa: boolean }
/** `chiPhiMicroUsd` / `chiPhiUsd` = tiền MẪU trả lời; `chiPhiVanNghiaMicroUsd` = tiền embedding của lượt thử (R4); dòng tl_luot_hoi = tổng hai phần. */
export interface TroLyThuResponse {
  traLoi: string; nguon: string[]; tokenVao: number; tokenRa: number; chiPhiMicroUsd: number; chiPhiUsd: number; chiPhiVanNghiaMicroUsd: number; mau: string;
  doanDaChon: TroLyDoanDaChon[];
}
```

- [ ] **Bước 6: `index.ts` — import + kiểm trần.**
  - Dòng import từ `"../../shared/tro-ly"`: BỎ `chonDoan` (không còn dùng ở tệp này).
  - Dòng import từ `"../../shared/tro-ly-mau"`: BỎ `chiPhiToiDa` (không còn dùng).
  - Thêm hai dòng import:

```ts
import { mucTranTren } from "../../shared/tro-ly-van-nghia";
import { timDoanTheoNghia } from "./van-nghia";
```

  - Thay toàn bộ khối `kiemTranTruocKhiGoi` (chú thích + hàm, khoảng dòng 140–146) bằng:

```ts
/**
 * ADR-0073 Đ7b + ADR-0076 Đ5(1) — MỘT chỗ kiểm trần tháng TRƯỚC MỌI lần gọi API (Embeddings lẫn mẫu trả lời), cho route hỏi VÀ ô thử.
 * Mức trần trên = token ước của thân yêu cầu CHƯA có tài liệu (lời nhắc + phần nhớ + câu mới) + NGAN_SACH_TOKEN (tài liệu tối đa) theo giá vào + token ra tối đa
 * theo giá ra + tiền embedding ước của truy vấn tìm (mucTranTren). `vuot` ⇒ KHÔNG gọi gì. `conLai` = phần trần còn lại sau mức trần trên — trần cho tiền tính bù
 * đoạn (Đ5(2), timDoanTheoNghia). Vượt trần do nhiều lượt song song vẫn có thể xảy ra, chặn trên bởi số lượt song song × mức trần trên (ADR-0073 Đ7b).
 */
export const kiemTranTruocKhiGoi = (
  boNao: { mau: string; tokenRaToiDa: number }, thanKhongTaiLieu: Record<string, unknown>, truyVan: string, daDungThang: number, tranThang: number,
): { vuot: boolean; conLai: number } => {
  const toiDa = mucTranTren(boNao.mau, uocTokenVao(thanKhongTaiLieu), boNao.tokenRaToiDa, truyVan);
  return { vuot: vuotTranThang(daDungThang, toiDa, tranThang), conLai: tranThang - daDungThang - toiDa };
};
```

- [ ] **Bước 7: `index.ts` — route hỏi.** Trong `route("POST", "/api/tro-ly/hoi", …)`:
  - Hàm `luot` nhận thêm tiền embedding:

```ts
      const luot = (ketQua: LuotHoi["ketQua"], u: SuDung | null, tienNhung = 0): LuotHoi => ({
        id: crypto.randomUUID(), staffId: staff.id, ngayVn, vao: u?.vao ?? 0, vaoDem: u?.vaoDem ?? 0, ra: u?.ra ?? 0,
        chiPhi: chiPhiMicroUsd(u, boNao.mau) + tienNhung, // ADR-0076 Đ5(3), P1: tiền mẫu + tiền embedding; token chỉ của mẫu
        ketQua, mau: ketQua === "het_tran" ? null : boNao.mau, laThu: false, at, // het_tran: không gọi mẫu ⇒ mau null (chú thích LuotHoi)
      });
```

  - Thay từ dòng `// ADR-0069 điều 4: đoạn ngữ cảnh đang bật …` tới hết khối `if (kiemTranTruocKhiGoi(…)) { … }` bằng:

```ts
      // N5: tìm bằng câu hiện tại + câu trước gần nhất (đã che). ADR-0076 Đ5(1): kiểm trần bằng MỨC TRẦN TRÊN trước MỌI lần gọi (embeddings lẫn mẫu).
      const truyVan = truyVanTim(cauHoi, nho.at(-1)?.cauHoi ?? null);
      const tran = kiemTranTruocKhiGoi(boNao, thanYeuCau(boNao, staff.permissions, [], cauHoi, nho), truyVan, thang.tong, caiDat.tranThangMicroUsd);
      if (tran.vuot) {
        await ghiLuot(db, luot("het_tran", null));
        return error(429, "tro_ly_het_tran_thang", CAU_HET_TRAN_THANG);
      }
      // ADR-0076 Đ2–Đ4 + ADR-0069 điều 4: đoạn ngữ cảnh đang bật vào CÙNG kho; chọn đoạn trộn nghĩa + từ khoá (lỗi / sát trần ⇒ lùi từ khoá).
      const tim = await timDoanTheoNghia(env, khoa, { truyVan, perms: staff.permissions, kho: [...chiaKho(), ...doanNguCanh(nguCanh)], conLaiMicroUsd: tran.conLai });
      const doan = tim.daChon.map((x) => x.doan);
      // `than` = TOÀN BỘ đầu vào (lời nhắc + phần nhớ + câu mới + tài liệu đã chọn).
      const than = thanYeuCau(boNao, staff.permissions, doan, cauHoi, nho);
```

  - Hai lời gọi ghi cuối route: `await ghi(luot("loi", kq.suDung), CAU_LOI, []);` → `await ghi(luot("loi", kq.suDung, tim.tienNhungMicroUsd), CAU_LOI, []);` và `await ghi(luot("ok", kq.suDung), kq.traLoi, kq.nguon);` → `await ghi(luot("ok", kq.suDung, tim.tienNhungMicroUsd), kq.traLoi, kq.nguon);`.

- [ ] **Bước 8: `index.ts` — ô thử.** Trong `route("POST", "/api/tro-ly/thu", …)`:
  - Thay hàm `luot` của route ô thử bằng (khác route hỏi ở `laThu: true`):

```ts
      const luot = (ketQua: LuotHoi["ketQua"], u: SuDung | null, tienNhung = 0): LuotHoi => ({
        id: crypto.randomUUID(), staffId: staff.id, ngayVn, vao: u?.vao ?? 0, vaoDem: u?.vaoDem ?? 0, ra: u?.ra ?? 0,
        chiPhi: chiPhiMicroUsd(u, boNao.mau) + tienNhung, // ADR-0076 P1, P3: tiền mẫu + tiền embedding của lượt thử
        ketQua, mau: ketQua === "het_tran" ? null : boNao.mau, laThu: true, at,
      });
```
  - Thay từ dòng `const doan = chonDoan(cauHoi, perms, …);` tới hết route bằng:

```ts
      // ADR-0076 P3: CÙNG kiểm trần mức trên + CÙNG hàm tìm với route hỏi (không nhớ ⇒ truy vấn = câu hỏi thử).
      const tran = kiemTranTruocKhiGoi(boNao, thanYeuCau(boNao, perms, [], cauHoi), cauHoi, thang.tong, caiDat.tranThangMicroUsd);
      if (tran.vuot) {
        await ghiLuot(db, luot("het_tran", null));
        return error(429, "tro_ly_het_tran_thang", CAU_HET_TRAN_THANG);
      }
      const tim = await timDoanTheoNghia(env, khoa, { truyVan: cauHoi, perms, kho: [...chiaKho(), ...doanNguCanh(nguCanh)], conLaiMicroUsd: tran.conLai });
      const doan = tim.daChon.map((x) => x.doan);
      const kq = await traLoiMotCau(env, khoa, thanYeuCau(boNao, perms, doan, cauHoi), doan);
      const l = luot(kq.ok ? "ok" : "loi", kq.suDung, tim.tienNhungMicroUsd);
      await ghiLuot(db, l);
      if (!kq.ok) {
        logLoi(`thu_${kq.loi}`);
        if (kq.loi === "rong") return error(502, "tro_ly_loi", CAU_LOI);
        // Cùng câu lời thường với Thử key (vd. 400 ⇒ mau_tu_choi "mẫu không nhận mức suy nghĩ…"); không chuyển tiếp chữ lỗi của OpenAI.
        const tk = ketQuaThuKhoa(kq.status === null ? { mang: true } : { status: kq.status, maLoi: kq.maLoi });
        return error(502, tk.ma, tk.cau);
      }
      const tienMau = l.chiPhi - tim.tienNhungMicroUsd; // R4: phản hồi tách tiền mẫu và tiền tìm theo nghĩa; dòng lượt giữ tổng
      return json({
        traLoi: kq.traLoi, nguon: kq.nguon, tokenVao: l.vao, tokenRa: l.ra, chiPhiMicroUsd: tienMau, chiPhiUsd: usd(tienMau),
        chiPhiVanNghiaMicroUsd: tim.tienNhungMicroUsd, mau: boNao.mau,
        doanDaChon: tim.daChon.map((x) => ({ ten: x.doan.ten, theoNghia: x.theoNghia, theoTuKhoa: x.theoTuKhoa })),
      } satisfies TroLyThuResponse);
    }),
```

  - Sửa chú thích ngay trên route ô thử: thêm câu "ADR-0076: cùng `kiemTranTruocKhiGoi` + `timDoanTheoNghia` với route hỏi; trả thêm `doanDaChon` + `chiPhiVanNghiaMicroUsd`."

- [ ] **Bước 9: Chạy cho xanh**

Run: `node --test src/modules/tro-ly/van-nghia-route.test.ts src/modules/tro-ly/tro-ly-route.test.ts src/modules/tro-ly/bo-nao-route.test.ts src/modules/tro-ly/bang-dieu-khien-route.test.ts src/modules/tro-ly/van-nghia.test.ts`
Expected: PASS mọi bài (bài cũ chạy đường lùi — R9; bài "HÀNG RÀO kiểm trần trước khi gọi (P2)" cũ vẫn 429 với `gpt-5` + 4.000 token ra và 200 với nano dưới trần 0,04 USD).

Run: `npm run typecheck`
Expected: 0 lỗi.

- [ ] **Bước 10: Commit**

```bash
git add src/modules/tro-ly/index.ts src/shared/contracts.ts src/modules/tro-ly/van-nghia-route.test.ts src/modules/tro-ly/tro-ly-route.test.ts src/modules/tro-ly/bo-nao-route.test.ts src/modules/tro-ly/bang-dieu-khien-route.test.ts
git commit -F- <<'MSG'
Câu hỏi và ô thử dùng tìm theo nghĩa; kiểm trần mức trên trước mọi lần gọi

ADR-0076 Đ5: trần tháng nay được kiểm bằng mức tối đa của cả lượt (tài liệu tối đa
6.000 token + token ra + tiền dấu vân của câu hỏi) TRƯỚC khi gọi bất kỳ API nào; tiền
dấu vân thật cộng vào lượt. Ô thử đi cùng một hàm tìm và trả thêm danh sách đoạn đã
dùng để Toàn quyền kiểm. Bài cũ cho máy giả tắt cửa dấu vân để tiếp tục canh đường
lùi về từ khoá; đường mới có tệp bài riêng.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FmJwaU8mvvF2WEt1gd4Wt3
MSG
```

---

### Task 6: e2e `tests/e2e/tro-ly.mjs` — BLOB trên D1 local thật, đếm lần gọi, lùi khi lỗi

**Files:**
- Modify: `tests/e2e/tro-ly.mjs` (máy giả dòng 16–49; thêm bước 2b sau bước 2; thêm bước 4b sau bước 4)
- (Nhánh B của bước 3 nếu cần) Modify: `src/modules/tro-ly/repository.ts` (`vanNghiaStatement`), `tests/audit/harness.mjs` (`fakeD1`)

**Interfaces:**
- Consumes: route hỏi + ô thử (Task 5).

- [ ] **Bước 1: Máy giả có `/v1/embeddings`.** Trong `tests/e2e/tro-ly.mjs`:
  - Sau `let cheDo = "ok";` thêm:

```js
/** ADR-0076: cửa /v1/embeddings của máy giả — ghi RIÊNG (`nhan` vẫn chỉ /v1/responses); véc-tơ một-nóng: chữ có "pin" ⇒ chiều 0, còn lại ⇒ chiều 1. */
const nhung = [];
let cheDoNhung = "ok";
```

  - Trong `req.on("end", () => {`, thay dòng `nhan.push({ url: req.url, auth: req.headers.authorization, body });` bằng:

```js
    if (req.url === "/v1/embeddings") {
      nhung.push({ auth: req.headers.authorization, body });
      if (cheDoNhung === "loi") {
        res.writeHead(500, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { message: "Embeddings down (English)" } }));
      }
      const dau = Array.isArray(body.input) ? body.input : [];
      const data = dau.map((s, index) => { const e = new Array(body.dimensions).fill(0); e[/pin/i.test(String(s)) ? 0 : 1] = 1; return { object: "embedding", index, embedding: e }; });
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ object: "list", data, model: body.model, usage: { prompt_tokens: 10 * dau.length, total_tokens: 10 * dau.length } }));
    }
    nhan.push({ url: req.url, auth: req.headers.authorization, body });
```

- [ ] **Bước 2: Sửa tiền của bước 2 (P1).** Bước 2 cũ ghim `chi_phi_micro_usd` = 450 (chỉ tiền mẫu) — nay lượt có thêm tiền embedding. Ngay TRƯỚC dòng `r = await hoi(SALES, \`đổi mã PIN thế nào ${TRO_LY_DAU}\`);` thêm `const m0 = nhung.length;`; thay dòng `assert.equal(dong.chi_phi_micro_usd, 450); // 4200 × 0,05 + 600 × 0,40` bằng:

```js
  // ADR-0076 P1: tiền lượt = mẫu (4200 × 0,05 + 600 × 0,40 = 450) + embedding của MỌI lần gọi /v1/embeddings trong lượt
  // (máy giả: 10 token / đầu vào; 0,02 USD / 1 triệu token, làm tròn lên từng lần gọi). Kho có thể đã được tính bù bởi kịch bản chạy trước ⇒ đếm theo lần gọi thật.
  const tienNhung = nhung.slice(m0).reduce((a, x) => a + Math.ceil((10 * x.body.input.length * 20_000) / 1_000_000), 0);
  assert.ok(tienNhung >= 1, "lượt có gọi embeddings");
  assert.equal(dong.chi_phi_micro_usd, 450 + tienNhung);
  assert.deepEqual([dong.token_vao, dong.token_ra], [4200, 600], "token chỉ của mẫu trả lời");
```

  và đổi chữ của `console.log` cuối bước 2 thành `"✓ hỏi thường → 200 + nguồn; một dòng tl_luot_hoi không nội dung, chi phí = mẫu 450 + embedding micro-USD"`.

- [ ] **Bước 2b: Thêm bước kiểm.** Ngay sau dòng `console.log` của bước 2 (bước "hỏi thường"), thêm:

```js
  // 2b) ADR-0076: dấu vân nghĩa ghi vào D1 THẬT (wrangler dev) dạng BLOB đúng độ dài; thân embeddings ĐÚNG bốn khoá, không SĐT người hỏi;
  //     câu kế tiếp chỉ tính véc-tơ câu hỏi; ô thử có đoạn "khớp nghĩa" ⇒ véc-tơ đoạn đã được ĐỌC LẠI từ D1 và giải mã đúng (bộ nhớ isolate chỉ nạp từ D1 — R1).
  const vn = (await sqlRows("SELECT count(*) AS n, sum(typeof(vec) = 'blob') AS b, min(length(vec)) AS mn, max(length(vec)) AS mx, min(so_chieu) AS sc FROM tl_van_nghia"))[0];
  assert.ok(vn.n >= 200, JSON.stringify(vn));
  assert.equal(vn.b, vn.n, "mọi véc-tơ là BLOB");
  assert.deepEqual([vn.mn, vn.mx], [vn.sc * 4, vn.sc * 4]);
  assert.ok(nhung.length >= 1);
  for (const x of nhung) {
    assert.equal(x.auth, `Bearer ${TRO_LY_KHOA}`);
    assert.deepEqual(Object.keys(x.body).sort(), ["dimensions", "encoding_format", "input", "model"]);
    for (const lo of [ACCOUNTS.salesA.phone, ACCOUNTS.salesA.name]) assert.ok(!JSON.stringify(x.body).includes(lo), `thân embeddings lộ ${lo}`);
  }
  let m = nhung.length;
  r = await hoi(SALES, "đổi mã PIN thế nào");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(nhung.length, m + 1, "câu kế tiếp chỉ tính véc-tơ câu hỏi");
  assert.equal(nhung.at(-1).body.input.length, 1);
  r = await call(OWNER, "POST", "/api/tro-ly/thu", { boNao: boNaoDau, cauHoi: "đổi mã PIN thế nào", vai: "SALES" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok(r.body.doanDaChon.some((d) => d.theoNghia), JSON.stringify(r.body.doanDaChon));
  assert.ok(r.body.chiPhiVanNghiaMicroUsd >= 1);
  console.log("✓ dấu vân nghĩa: BLOB trên D1 thật, câu sau không tính lại đoạn, ô thử có đoạn khớp nghĩa (đọc lại BLOB)");
```

  Ngay sau `console.log("✓ OpenAI lỗi → 502 câu tiếng Việt");` (bước 4) thêm:

```js
  // 4b) ADR-0076 L1: Embeddings lỗi ⇒ vẫn trả lời (lùi về từ khoá), mẫu trả lời vẫn được gọi
  cheDoNhung = "loi";
  m = nhan.length;
  r = await hoi(SALES, "đổi PIN thế nào");
  cheDoNhung = "ok";
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(nhan.length, m + 1);
  console.log("✓ Embeddings lỗi → vẫn trả lời (lùi về từ khoá)");
```

- [ ] **Bước 3: Chạy e2e — quyết cách bind BLOB (R7, D4).**

Run: `npm run test:e2e -- tro-ly`
Expected: mọi dòng ✓, có "✓ dấu vân nghĩa: BLOB trên D1 thật…" (**nhánh A** — `Uint8Array` được D1 nhận). Ghi kết quả `vn` vào mục "BLOB trên D1 local thật" của nhật ký.

  **Nhánh B** — chỉ khi bước 2b đỏ vì `vn.n` = 0 (D1 không nhận `Uint8Array`, lỗi bị nuốt ở đường lùi): đổi `vanNghiaStatement` trong `src/modules/tro-ly/repository.ts` thành

```ts
export const vanNghiaStatement = (db: D1Database, v: VanNghiaMoi, at: string): D1PreparedStatement =>
  // D1 nhận ArrayBuffer làm BLOB (thử e2e 2026-10-01 — Uint8Array không được nhận); chép ra bộ đệm riêng để không kéo theo byte ngoài khung nhìn.
  db.prepare(THEM_VAN_NGHIA).bind(v.khoa, v.mau, v.soChieu, v.vec.slice().buffer, at);
```

  và trong `tests/audit/harness.mjs`, hàm `fakeD1`, đổi `bind: (...a) => stmt(sql, a),` thành

```js
    // node:sqlite không nhận ArrayBuffer — đổi sang Uint8Array (cùng byte) như D1 thật lưu BLOB (ADR-0076, nhánh B Task 6).
    bind: (...a) => stmt(sql, a.map((x) => (x instanceof ArrayBuffer ? new Uint8Array(x) : x))),
```

  rồi chạy lại `node --test src/modules/tro-ly/van-nghia.test.ts src/modules/tro-ly/van-nghia-route.test.ts` (xanh) và `npm run test:e2e -- tro-ly` (xanh). Nhánh B cũng đỏ ⇒ **DỪNG (D4)**.

- [ ] **Bước 4: Commit**

```bash
git add tests/e2e/tro-ly.mjs docs/superpowers/plans/2026-10-01-tro-ly-tim-theo-nghia-thi-cong-nhat-ky.md
git commit -F- <<'MSG'
e2e trợ lý: dấu vân nghĩa ghi và đọc lại BLOB trên D1 thật, lùi khi lỗi

Repo chưa từng dùng cột BLOB: bài thuần và khung SQLite không chứng minh được D1 của
wrangler nhận và trả véc-tơ đúng. Kịch bản kiểm kiểu và độ dài trên D1 local, đếm lần
gọi máy giả (câu sau không tính lại đoạn) và dùng ô thử để chứng minh véc-tơ đọc lại
từ D1 giải mã đúng; thêm ca Embeddings lỗi vẫn trả lời.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FmJwaU8mvvF2WEt1gd4Wt3
MSG
```

  (Nhánh B: thêm `src/modules/tro-ly/repository.ts tests/audit/harness.mjs` vào `git add`, và thêm một câu vào thân commit: "D1 không nhận Uint8Array nên bind ArrayBuffer; khung thử đổi lại cho node:sqlite.")

---

### Task 7: Bảng điều khiển hiện "Đoạn đã dùng" (H1) + kịch bản Chrome

**Files:**
- Modify: `web/tro-ly-cai-dat.ts` (hàm `dungBoNao`, khoảng dòng 305–315)
- Modify: `docs/evidence/2026-09-30-bang-dieu-khien-tro-ly/kich-ban/bang-dieu-khien-tro-ly-smoke.mjs` (máy giả dòng 33–49; bước k dòng 244–261; dòng chú thích bước k ở đầu tệp)
- Modify: `docs/evidence/2026-09-30-tro-ly/kich-ban/tro-ly-smoke.mjs` (máy giả dòng 28–33), `docs/evidence/2026-10-01-khung-tro-ly/kich-ban/khung-tro-ly-smoke.mjs` (máy giả dòng 39–43)

**Interfaces:**
- Consumes: `Api.TroLyThuResponse.doanDaChon`, `chiPhiVanNghiaMicroUsd` (Task 5); cách bind BLOB ĐÃ CHỐT ở Task 6 bước 3 (kịch bản Chrome chạy trên D1 thật của `wrangler dev` — làm Task 6 trước, kẻo lỗi bind trông như lỗi giao diện).

- [ ] **Bước 1: Kịch bản Chrome đỏ trước.** Trong `bang-dieu-khien-tro-ly-smoke.mjs`:
  - Thay khối máy giả (`const nhan = []; const may = createServer(…)` tới hết hàm xử lý) bằng:

```js
const nhan = [];
const nhung = [];
const may = createServer((req, res) => {
  let raw = "";
  req.on("data", (d) => (raw += d));
  req.on("end", () => {
    const body = JSON.parse(raw || "{}");
    // ADR-0076: cửa dấu vân nghĩa — véc-tơ một-nóng (chữ có "pin" ⇒ chiều 0, còn lại ⇒ chiều 1); `nhan` chỉ ghi /v1/responses như trước.
    if (req.url === "/v1/embeddings") {
      nhung.push(body);
      const dau = Array.isArray(body.input) ? body.input : [];
      const data = dau.map((s, index) => { const e = new Array(body.dimensions).fill(0); e[/pin/i.test(String(s)) ? 0 : 1] = 1; return { object: "embedding", index, embedding: e }; });
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ object: "list", data, model: body.model, usage: { prompt_tokens: 10 * dau.length, total_tokens: 10 * dau.length } }));
    }
    nhan.push(body);
    // Tên đoạn ĐẦU TIÊN của khối "TÀI LIỆU:" CUỐI (máy chủ luôn nối khối này sau lời nhắc — ADR-0073 B4); lời nhắc có "[tên mục]" ở luật Nguồn không tính.
    const ins = String(body.instructions ?? "");
    const ten = /\[([^\]]+)\]/.exec(ins.slice(ins.lastIndexOf("TÀI LIỆU:")))?.[1] ?? "";
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: `1. Vào trang Tôi.\n2. Bấm Đổi PIN.${ten ? `\nNguồn: [${ten}]` : ""}` }] }],
      usage: { input_tokens: 1000, output_tokens: 100 },
    }));
  });
});
```

  - Trong bước `k`, ngay trước dòng `await p.ev(\`${q("#tl-thu-kq")}.scrollIntoView(), true\`);` thêm:

```js
    // ADR-0076 H1: danh sách "Đoạn đã dùng" dưới kết quả thử, nhãn tiếng Việt; có đoạn khớp nghĩa (máy giả: câu có "PIN")
    const kqThu = await p.ev(`${q("#tl-thu-kq")}.innerText`);
    assert.match(kqThu, /Đoạn đã dùng:/);
    assert.match(kqThu, /khớp nghĩa/);
    assert.ok(!/theoNghia|theoTuKhoa|embedding/i.test(kqThu), "không lộ mã thô / chữ Anh");
    assert.ok((await p.ev(`${q("#tl-thu-doan")}.querySelectorAll('li').length`)) >= 1);
    assert.match(kqThu, /tìm theo nghĩa \(tính vào trần tháng\)/);
```

  - Cũng trong bước `k`, XOÁ dòng cũ `assert.match(await p.ev(\`${q("#tl-thu-kq")}.textContent\`), /USD \(tính vào trần tháng\)/);` (khoảng dòng 257): dòng tiền mới chèn "tìm theo nghĩa" giữa "USD" và "(tính…" nên mẫu cũ không còn khớp — dòng `assert.match(kqThu, /tìm theo nghĩa \(tính vào trần tháng\)/)` ở trên thay nó.

  - Sửa dòng chú thích bước `k` ở đầu tệp: thêm "; dưới kết quả có 'Đoạn đã dùng' (nhãn khớp nghĩa / khớp từ khoá — ADR-0076 H1)".

  - Trong hai kịch bản còn lại (`tro-ly-smoke.mjs`, `khung-tro-ly-smoke.mjs`), ở đầu hàm `req.on("end", () => {` của máy giả, TRƯỚC dòng `nhan.push(…)`, thêm:

```js
    // ADR-0076: cửa dấu vân nghĩa TẮT (503) ⇒ máy chủ lùi về từ khoá; `nhan` chỉ ghi /v1/responses như trước (bảng điều khiển canh đường mới).
    if (req.url === "/v1/embeddings") { res.writeHead(503, { "content-type": "application/json" }); return res.end("{}"); }
```

- [ ] **Bước 2: Chạy cho đỏ**

Run:
```bash
npm run build:web && CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-01-tro-ly-tim-theo-nghia node docs/evidence/2026-09-30-bang-dieu-khien-tro-ly/kich-ban/bang-dieu-khien-tro-ly-smoke.mjs
```
Expected: `✗ k) …` với `Đoạn đã dùng:` không khớp (các bước khác ✓).

- [ ] **Bước 3: Viết mã** — trong `web/tro-ly-cai-dat.ts`:
  - Thêm gần đầu tệp, cạnh `usdNho`:

```ts
/** ADR-0076 H1: nhãn tiếng Việt của một đoạn đã dùng ở ô thử. */
const nhanKhop = (d: Api.TroLyDoanDaChon): string => [d.theoNghia ? "khớp nghĩa" : "", d.theoTuKhoa ? "khớp từ khoá" : ""].filter(Boolean).join(", ");
```

  - Trong `dungBoNao`, thay khối `replaceChildren(ketQua, …)` của lượt thử thành công bằng:

```ts
        replaceChildren(
          ketQua,
          h("p", { class: "tl-chu" }, r.traLoi),
          r.nguon.length ? h("p", { class: "tl-nguon" }, `Nguồn: ${r.nguon.join("; ")}`) : null,
          h(
            "div",
            { id: "tl-thu-doan" },
            h("p", { class: "muted" }, r.doanDaChon.length ? "Đoạn đã dùng:" : "Đoạn đã dùng: không có đoạn nào — trợ lý trả lời không kèm đoạn hướng dẫn."),
            r.doanDaChon.length ? h("ul", { class: "tl-cd-ds" }, ...r.doanDaChon.map((d) => h("li", null, `${d.ten} — ${nhanKhop(d)}`))) : null,
          ),
          h(
            "p",
            { class: "muted" },
            `${tenMau} · ${r.tokenVao} token vào, ${r.tokenRa} token ra · ${usdNho(r.chiPhiUsd)} trả lời + ${usdNho(r.chiPhiVanNghiaMicroUsd / 1_000_000)} tìm theo nghĩa (tính vào trần tháng)`,
          ),
        );
```

- [ ] **Bước 4: Chạy cho xanh**

Run: `npm run typecheck`
Expected: 0 lỗi.

Run (ba kịch bản, mỗi lệnh một lần, từ gốc worktree):
```bash
npm run build:web && CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-01-tro-ly-tim-theo-nghia node docs/evidence/2026-09-30-bang-dieu-khien-tro-ly/kich-ban/bang-dieu-khien-tro-ly-smoke.mjs
```
```bash
CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-01-tro-ly-tim-theo-nghia/khung node docs/evidence/2026-10-01-khung-tro-ly/kich-ban/khung-tro-ly-smoke.mjs
```
```bash
CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-01-tro-ly-tim-theo-nghia/tro-ly node docs/evidence/2026-09-30-tro-ly/kich-ban/tro-ly-smoke.mjs
```
Expected: mọi bước ✓ (nếu kịch bản nào không đọc biến `OUT`, bỏ biến đó và để ảnh ghi vào thư mục mặc định của nó — ghi điều này vào nhật ký). Mở ảnh `docs/evidence/2026-10-01-tro-ly-tim-theo-nghia/anh/k-o-thu-1040.png` xem "Đoạn đã dùng" hiện dưới câu trả lời.

- [ ] **Bước 5: Commit**

```bash
git add web/tro-ly-cai-dat.ts docs/evidence/2026-09-30-bang-dieu-khien-tro-ly/kich-ban/bang-dieu-khien-tro-ly-smoke.mjs docs/evidence/2026-09-30-tro-ly/kich-ban/tro-ly-smoke.mjs docs/evidence/2026-10-01-khung-tro-ly/kich-ban/khung-tro-ly-smoke.mjs docs/evidence/2026-10-01-tro-ly-tim-theo-nghia
git commit -F- <<'MSG'
Ô thử hiện "Đoạn đã dùng" kèm nhãn khớp nghĩa / khớp từ khoá

ADR-0076 Đ6: Toàn quyền cần thấy trợ lý đã dựa vào đoạn hướng dẫn nào để đánh giá
cách tìm mới; tiền tìm theo nghĩa hiện tách khỏi tiền trả lời. Máy OpenAI giả của
kịch bản Chrome thêm cửa dấu vân nghĩa; hai kịch bản khung giữ đường lùi từ khoá.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FmJwaU8mvvF2WEt1gd4Wt3
MSG
```

---

### Task 8: Sổ hàng rào (quan sát chặn thật) + CHANGE-GUIDE z5 + SYSTEM-DESIGN + nhật ký thay đổi 1.55

**Files:**
- Modify: `docs/SO-HANG-RAO.md` (thêm hai dòng sau dòng "Trần chi phí tháng / trần câu ngày của trợ lý", khoảng dòng 265)
- Modify: `docs/CHANGE-GUIDE.md` (dòng bảng §1 khoảng dòng 79; tiêu đề + mục z5 khoảng dòng 777–830; dòng ma trận §3 khoảng dòng 833)
- Modify: `docs/SYSTEM-DESIGN.md` (§5 bảng dữ liệu + bảng migration; §7 hai dòng route `/api/tro-ly/hoi`, `/api/tro-ly/thu`)
- Modify: `src/shared/changelog.ts` (mục mới ở ĐẦU `CHANGELOG`)
- Modify: nhật ký thi công (mục "Đột biến hàng rào")

**Interfaces:** không đổi mã sản phẩm (đột biến làm rồi hoàn nguyên).

- [ ] **Bước 1: Đột biến (a) — lùi về từ khoá.** Trong `src/modules/tro-ly/van-nghia.ts`, thay thân hàm `lui` bằng `throw new Error("đột biến: không lùi");` (giữ chữ ký). Chạy:

Run: `node --test src/modules/tro-ly/van-nghia-route.test.ts`
Expected: `not ok … L1 HÀNG RÀO lùi về từ khoá…`, `not ok … L2…`, `not ok … P2 + Review Focus 5…` (route trả 500). Chép các dòng `not ok` nguyên văn vào nhật ký. Hoàn nguyên: `git checkout -- src/modules/tro-ly/van-nghia.ts`; chạy lại ⇒ xanh; `git diff --stat` rỗng.

- [ ] **Bước 2: Đột biến (b) — tiền embedding vào lượt + trần trước khi gọi.** Ba lần, mỗi lần hoàn nguyên bằng `git checkout -- <tệp>` rồi chạy lại cho xanh:
  1. `src/shared/tro-ly-van-nghia.ts`, `mucTranTren`: bỏ ` + chiPhiNhungMicroUsd(uocToken(truyVan))` ⇒ Run `node --test src/shared/tro-ly-van-nghia.test.ts` ⇒ Expected `not ok … P2: mức trần trên…` (832 ≠ 830).
  2. `src/modules/tro-ly/index.ts`, hàm `luot` của route hỏi: bỏ ` + tienNhung` ⇒ Run `node --test src/modules/tro-ly/van-nghia-route.test.ts` ⇒ Expected `not ok … V2 + V5 + P1…`, `not ok … L2…`.
  3. `src/modules/tro-ly/van-nghia.ts`: xoá dòng `if (tienBuUoc([...thieu.values()]) > a.conLaiMicroUsd) return lui(); // Đ5(2)` ⇒ Run như trên ⇒ Expected `not ok … P2 + Review Focus 5…` (embeddings bị gọi).

  Chép mọi dòng `not ok` nguyên văn vào nhật ký.

- [ ] **Bước 3: Sổ hàng rào.** Trong `docs/SO-HANG-RAO.md`, ngay SAU dòng bắt đầu bằng `| Trần chi phí tháng / trần câu ngày của trợ lý (ADR-0066 điều 6)`, thêm hai dòng (thay `<…>` trong cột "Đã thấy chặn thật" bằng dòng `not ok` THẬT đã chép ở bước 1–2 và ngày chạy):

```markdown
| **Lùi về từ khoá khi tìm theo nghĩa hỏng** (ADR-0076 Đ4, L1–L2; **từ 2026-10-01, CHƯA gộp**) — `timDoanTheoNghia` (`src/modules/tro-ly/van-nghia.ts`, hàm `lui`) + bài `src/modules/tro-ly/van-nghia-route.test.ts` ca "L1 HÀNG RÀO lùi về từ khoá", "L2", "P2 + Review Focus 5" + e2e `tests/e2e/tro-ly.mjs` bước 4b | Embeddings lỗi / mạng hỏng / quá 8 giây / phản hồi lệch khuôn / giải mã BLOB hỏng / tính bù sẽ vượt trần làm câu trả lời hỏng (500) hoặc ghi dòng dở | Mọi nhánh lỗi đi về `lui()` = `chonDoan` (luật cũ); bài route soi khối TÀI LIỆU gửi đi bằng đúng `chonDoan`, đếm dòng `tl_van_nghia`, log đúng `{"event":"tro_ly_van_nghia_loi"}` | <ngày>: đột biến thân `lui` thành `throw` → <dòng not ok L1>, <dòng not ok L2>, <dòng not ok P2> → hoàn nguyên → xanh | Không canh chất lượng tìm theo nghĩa thật (ngưỡng 0,3 — đánh giá bằng 12 câu mẫu sau triển khai); máy giả trả véc-tơ một-nóng |
| **Tiền tìm theo nghĩa vào lượt + kiểm trần trước MỌI lần gọi** (ADR-0076 Đ5, P1–P3; **từ 2026-10-01, CHƯA gộp**) — `mucTranTren` (`src/shared/tro-ly-van-nghia.ts`) trong `kiemTranTruocKhiGoi` (`src/modules/tro-ly/index.ts`, MỘT hàm cho hỏi + ô thử), `luot(…, tienNhung)` cộng tiền embedding, kiểm `tienBuUoc` trước khi tính bù + bài `src/shared/tro-ly-van-nghia.test.ts` ca "P2: mức trần trên", `van-nghia-route.test.ts` ca "V2 + V5 + P1", "P2 + Review Focus 5", "P3 + H1", "P2 ô thử" | Gọi Embeddings hay mẫu khi tháng đã sát trần; tiền embedding không vào `chi_phi_micro_usd` (trần tháng đếm thiếu); tính bù cả kho làm vượt trần | Bài thuần ghim số; bài route đếm lần gọi giả của HAI cửa (`/v1/embeddings`, `/v1/responses`) và soi dòng `tl_luot_hoi` | <ngày>: (1) bỏ phần embedding trong `mucTranTren` → <dòng not ok>; (2) bỏ `+ tienNhung` → <dòng not ok>; (3) bỏ kiểm `tienBuUoc` → <dòng not ok> → hoàn nguyên → xanh | Kiểm-rồi-ghi không nguyên tử như ADR-0073 Đ7b: lượt song song có thể vượt trần một chút; tiền ước (1 token ≈ 3 ký tự) có thể thấp hơn thật — tiền ghi vào lượt là tiền THẬT (usage) |
```

- [ ] **Bước 4: CHANGE-GUIDE.**
  - Dòng bảng §1 (khoảng dòng 79, cột việc bắt đầu `Trợ lý "Hỗ trợ"`): cuối cột việc thêm `; tìm đoạn theo nghĩa trộn từ khoá — ADR-0076`; cột tệp thêm `` `src/shared/tro-ly-van-nghia.ts` (+ `.test.ts`), `src/modules/tro-ly/van-nghia.ts` (+ `van-nghia.test.ts`, `van-nghia-route.test.ts`), `migrations/0062_tl_van_nghia.sql` (số tạm) ``.
  - Tiêu đề `### z5. Trợ lý "Hỗ trợ" (ADR-0066, ADR-0069, ADR-0070, ADR-0073)` → `### z5. Trợ lý "Hỗ trợ" (ADR-0066, ADR-0069, ADR-0070, ADR-0073, ADR-0076)`.
  - Thay gạch đầu dòng `- Tìm đoạn: \`chonDoan\` lấy tối đa …` bằng:

```markdown
- Tìm đoạn (ADR-0076): MỘT hàm `timDoanTheoNghia` (`src/modules/tro-ly/van-nghia.ts`) cho route hỏi VÀ ô thử — đừng chép khối. Chọn bằng `chonDoanTron` (`src/shared/tro-ly-van-nghia.ts`): RRF của hạng BM25 và hạng cô-sin (cả hai nhân hệ số vai), bỏ đoạn cô-sin < `NGUONG_COSIN` (0,3) TRỪ đoạn khớp mạnh (`khopManh`: cặp âm tiết, hoặc điểm ≥ 0,7 × cao nhất và ≥ 2 âm tiết đơn); rồi `layTheoNganSach` (tối đa `SO_DOAN_TOI_DA` = 12 đoạn trong `NGAN_SACH_TOKEN` = 6.000 token ước — chung với `chonDoan`). Mọi lỗi ⇒ lùi `chonDoan` (luật cũ), log đúng `{"event":"tro_ly_van_nghia_loi"}`. Dấu vân của đoạn: khoá SHA-256 (`khoaDoan`) của `dinhDangDoan` + mẫu + số chiều; bảng chỉ-thêm `tl_van_nghia` (BLOB float32, ghi `ON CONFLICT(khoa) DO NOTHING`); bộ nhớ isolate CHỈ nạp véc-tơ đọc từ D1 (khung thử xoá mỗi `world()` qua `xoaBoNhoVanNghia`). Đổi mẫu / số chiều ⇒ mọi khoá đổi ⇒ lần hỏi đầu tính bù cả kho (~0,001 USD). Đổi ngưỡng / hằng RRF: sửa hằng + bài C1–C4. Hướng dẫn đổi chữ làm số khớp mạnh của bài C4 đổi ⇒ đo lại, sửa số kèm lý do (không nới luật).
- Tiền + trần (ADR-0076 Đ5): `kiemTranTruocKhiGoi` = mức trần trên (`mucTranTren`: thân CHƯA tài liệu + 6.000 token + token ra tối đa + embedding câu hỏi) trước MỌI lần gọi; tính bù vượt phần còn lại ⇒ lùi (không 429); `chi_phi_micro_usd` = tiền mẫu + tiền embedding, `token_vao` / `token_ra` chỉ của mẫu. Giá embedding: `GIA_NHUNG` + ngày tra ở `src/shared/tro-ly-van-nghia.ts`.
- Bài route có máy OpenAI giả: máy giả PHẢI tách cửa `/v1/embeddings` khỏi `/v1/responses` (đếm riêng). Bài cũ cho cửa embeddings trả 503 (đường lùi); bài đường mới ở `van-nghia-route.test.ts`.
```

  - Ở dòng **Kiểm:** của z5, thêm `src/shared/tro-ly-van-nghia.test.ts src/modules/tro-ly/van-nghia.test.ts src/modules/tro-ly/van-nghia-route.test.ts src/migrations-tro-ly-van-nghia.test.ts` vào danh sách `node --test`.
  - Dòng ma trận §3 (khoảng dòng 833, bắt đầu `| Trợ lý Hỗ trợ:`): cuối cột "Chạy" thêm `; ADR-0076: node --test src/shared/tro-ly-van-nghia.test.ts src/modules/tro-ly/van-nghia*.test.ts, npm run test:e2e -- tro-ly (BLOB trên D1 thật), Chrome bang-dieu-khien-tro-ly-smoke.mjs (bước k "Đoạn đã dùng")`.

- [ ] **Bước 4b: SYSTEM-DESIGN (tài liệu mô tả — sửa cùng commit, CLAUDE.md §9).** Trong `docs/SYSTEM-DESIGN.md`:
  - Bảng bảng dữ liệu §5: ngay SAU dòng bắt đầu `| \`tl_bo_nao\` (0060) | tro-ly |` thêm:

```markdown
| `tl_van_nghia` (0062, số tạm) | tro-ly | dấu vân nghĩa (embedding OpenAI `text-embedding-3-small`, 512 chiều — ADR-0076 Đ2) của đoạn kho tri thức trợ lý: `khoa` (SHA-256 của đoạn đã định dạng + mẫu + số chiều, 64 ký tự), `mau`, `so_chieu`, `vec` (BLOB float32, CHECK đúng `so_chieu × 4` byte); CHỈ nội dung kho, không câu hỏi / người hỏi; CHỈ THÊM (trigger chặn sửa / xoá), ghi `ON CONFLICT(khoa) DO NOTHING` khi máy chủ tính bù; không route nào đọc / ghi trực tiếp |
```

  - Cột ghi chú của dòng `| \`tl_luot_hoi\` (0050) |`: nối thêm `; từ ADR-0076 \`chi_phi_micro_usd\` = tiền mẫu + tiền embedding của lượt, token chỉ của mẫu`.
  - Bảng migration: ngay SAU dòng `| 0060 | \`0060_tl_bo_nao.sql\` |` thêm:

```markdown
| 0062 | `0062_tl_van_nghia.sql` | ADR-0076 (CHƯA lên production; số TẠM — main tới 0060, `0061_aut_session` ở nhánh đăng nhập; người gộp đổi số): chỉ THÊM `tl_van_nghia` (+ trigger chỉ-thêm, CHECK BLOB). Không gieo — lần hỏi đầu sau triển khai tính bù cả kho (~0,001 USD) |
```

  - Dòng route `| POST | \`/api/tro-ly/thu\` |`: đổi `→ \`{ traLoi, nguon, tokenVao, tokenRa, chiPhiMicroUsd, chiPhiUsd, mau }\`` thành `→ \`{ traLoi, nguon, tokenVao, tokenRa, chiPhiMicroUsd, chiPhiUsd, chiPhiVanNghiaMicroUsd, mau, doanDaChon: [{ ten, theoNghia, theoTuKhoa }] }\` (ADR-0076 H1: \`chiPhiMicroUsd\` = tiền mẫu, \`chiPhiVanNghiaMicroUsd\` = tiền tìm theo nghĩa; dòng lượt giữ tổng)`; và "tìm đoạn theo vai" → "tìm đoạn trộn nghĩa + từ khoá theo vai (ADR-0076; lỗi ⇒ lùi từ khoá)".
  - Dòng route `| POST | \`/api/tro-ly/hoi\` |`: nối vào cột mô tả `ADR-0076: chọn đoạn trộn theo nghĩa (OpenAI Embeddings, hạn 8 giây) + từ khoá; kiểm trần bằng mức trần trên TRƯỚC mọi lần gọi; Embeddings lỗi / sát trần ⇒ lùi từ khoá, vẫn 200; tiền embedding vào lượt.`

- [ ] **Bước 5: Nhật ký thay đổi.** Thêm ở ĐẦU mảng `CHANGELOG` của `src/shared/changelog.ts`:

```ts
  {
    // ADR-0076 (trợ lý tìm đoạn hướng dẫn theo nghĩa trộn từ khoá). Số "1.55" = main 1.54 + 1 lúc thi công (2026-10-01); nhánh khác gộp trước thì đánh lại số.
    // Có migration 0062 (số tạm).
    version: "1.55",
    date: "2026-10-01",
    items: [
      { kind: "doi", text: "Trợ lý Hỗ trợ tìm đúng phần hướng dẫn hơn khi bạn hỏi bằng lời của mình, không cần gõ đúng tên nút hay tên mục." },
      { kind: "moi", text: "Toàn quyền: ô thử ở trang Trợ lý Hỗ trợ cho xem trợ lý đã dùng những đoạn hướng dẫn nào để trả lời." },
    ],
  },
```

- [ ] **Bước 6: Chạy**

Run: `node --test src/shared/changelog.test.ts src/architecture.test.ts`
Expected: PASS.

- [ ] **Bước 7: Commit**

```bash
git add docs/SO-HANG-RAO.md docs/CHANGE-GUIDE.md docs/SYSTEM-DESIGN.md src/shared/changelog.ts docs/superpowers/plans/2026-10-01-tro-ly-tim-theo-nghia-thi-cong-nhat-ky.md
git commit -F- <<'MSG'
Sổ hàng rào tìm theo nghĩa (đã thấy chặn thật), CHANGE-GUIDE z5, nhật ký 1.55

Hai hàng rào mới (lùi về từ khoá; tiền dấu vân vào lượt + kiểm trần trước mọi lần
gọi) chỉ được coi là hoạt động sau khi sửa cố ý thấy bài đỏ rồi hoàn nguyên — dòng
"not ok" ghi nguyên văn. Số 1.55 là số tạm theo main 1.54.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FmJwaU8mvvF2WEt1gd4Wt3
MSG
```

---

### Task 9: Kiểm cuối + kiểm độc lập (việc lớn: dữ liệu + tiền)

**Files:**
- Modify: nhật ký thi công (mục "Kiểm")

**Interfaces:** không.

- [ ] **Bước 1: Bộ đủ.** Chạy lần lượt (máy rảnh; tắt mọi `wrangler dev` mồ côi trước e2e):

```bash
npm test
```
```bash
npm run typecheck
```
```bash
npm run build:web
```
```bash
npm run test:e2e
```

Expected: `npm test` thoát 0; typecheck 0 lỗi; build không lỗi; e2e đủ bộ xanh, `audit-invariants` cuối e2e ĐẠT. Ghi số bài / thời gian vào nhật ký.

- [ ] **Bước 2: Kịch bản Chrome bảng điều khiển** (Task 7 bước 4, lệnh đầu) chạy lại trên mã cuối: mọi bước ✓, bước k thấy "Đoạn đã dùng"; console sạch (bước i).

- [ ] **Bước 3: Kiểm độc lập.** Gọi subagent `nguoi-kiem-doc-lap` (chỉ đọc) với lời giao:

```text
Kiểm độc lập (chỉ đọc, không sửa) nhánh tro-ly-tim-theo-nghia so với origin/main c62ffc6d — ADR-0076 (tìm đoạn theo nghĩa). Việc lớn: dữ liệu (migration 0062 bảng
chỉ-thêm tl_van_nghia, BLOB) + tiền (chi phí lượt, kiểm trần). Đọc: docs/superpowers/specs/2026-10-01-tro-ly-tim-theo-nghia/{ADR-0076-tro-ly-tim-theo-nghia.md,dac-ta.md},
docs/superpowers/plans/2026-10-01-tro-ly-tim-theo-nghia-thi-cong.md (R1–R9, bảng tự rà), nhật ký thi công cùng thư mục, rồi mã thật. Tự chạy lại: npm test,
npm run typecheck, node --test src/shared/tro-ly-van-nghia.test.ts src/modules/tro-ly/van-nghia*.test.ts src/migrations-tro-ly-van-nghia.test.ts, npm run test:e2e -- tro-ly.
Trả lời có bằng chứng tệp:dòng: (1) mọi tiêu chí V1–V5, C1–C5, L1–L2, P1–P3, H1, G1–G2 có mã + bài thật kiểm đúng hành vi (không kiểm giả); (2) kiểm trần chạy TRƯỚC
mọi fetch ở CẢ route hỏi và ô thử, qua MỘT hàm; không đường nào gọi API khi tran.vuot; (3) tiền: chi_phi_micro_usd = tiền mẫu + tiền embedding, làm tròn lên, usage
thiếu ⇒ ước không 0; token_vao/token_ra chỉ của mẫu; (4) thân /v1/embeddings không user / định danh, chỉ chữ đã che hoặc nội dung kho; (5) tl_van_nghia chỉ thêm,
chỉ ON CONFLICT DO NOTHING, không OR REPLACE, CHECK BLOB; đường giải mã BLOB thật đã chạy trên D1 local (e2e bước 2b); (6) mọi lỗi đi về lùi từ khoá, không ghi
dòng dở, log đúng {"event":"tro_ly_van_nghia_loi"}; (7) không ô MATRIX / cạnh ALLOWED_EDGES mới, SQL chỉ ở repository.ts; (8) hai dòng sổ hàng rào có dòng
"not ok" thật trong nhật ký. Báo cáo: ĐẠT / KHÔNG ĐẠT từng mục, phát hiện theo mức (HIGH/MEDIUM/LOW).
```

- [ ] **Bước 4: Xử lý báo cáo.** Phát hiện HIGH / MEDIUM ⇒ sửa (đỏ → xanh) trong task tương ứng, chạy lại bước 1 và gọi người kiểm vòng 2. Chỉ ghi "ĐẠT" khi báo cáo người kiểm + test đều xanh. Ghi tóm tắt báo cáo (vòng, kết luận, phát hiện, cách xử lý) vào mục "Kiểm" của nhật ký.

- [ ] **Bước 5: Commit nhật ký**

```bash
git add docs/superpowers/plans/2026-10-01-tro-ly-tim-theo-nghia-thi-cong-nhat-ky.md
git commit -F- <<'MSG'
Nhật ký thi công tìm theo nghĩa: kết quả kiểm cuối và kiểm độc lập

Ghi số bài, e2e, kịch bản Chrome và kết luận của người kiểm độc lập để phiên sau
(gộp, triển khai, chạy lại 12 câu mẫu) đọc từ tài liệu, không từ trí nhớ phiên.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FmJwaU8mvvF2WEt1gd4Wt3
MSG
```

- [ ] **Bước 6: Bàn giao cho chủ** (lời thường, 4 mục CLAUDE.md §4): đã làm — đã kiểm (có người kiểm độc lập) — chưa làm (12 câu mẫu với OpenAI thật sau triển khai — D7; BLOB chưa thử trên D1 remote — D6b) — cần chủ quyết (gộp bằng `npm run day-len -- tro-ly-tim-theo-nghia`, rồi `npm run trien-khai` vì có đổi app + migration; người gộp đổi số migration `0062` và số bản `1.55` nếu nhánh khác lên trước).

---

## Bảng tự rà: tiêu chí → task

| Tiêu chí (đặc tả §2) | Task | Bài |
|---|---|---|
| V1 khoá SHA-256 | 1 | `tro-ly-van-nghia.test.ts` "V1" |
| V2 câu đầu tính bù theo lô + câu hỏi; câu 2 chỉ câu hỏi | 4, 5, 6 | `van-nghia-route.test.ts` "V2 + V5 + P1"; e2e 2b |
| V3 thêm / sửa ngữ cảnh ⇒ chỉ tính bù đoạn đó | 5 | "V3 + Review Focus 4" |
| V4 chỉ-thêm, CHECK blob / độ dài, ON CONFLICT hai lô | 3, 4 | `migrations-tro-ly-van-nghia.test.ts` "V4" ×2; `van-nghia.test.ts` "V4 + Review Focus 3" |
| V5 bộ nhớ isolate, không đọc lại D1 | 4, 5 | "V2 + V5 + P1" (đếm truy vấn) |
| C1 RRF, ngưỡng, vai, ngân sách, 12 đoạn | 2 | "C1" ×3 |
| C2 tên nút chính xác giữ; khớp lẻ bị bỏ | 2 | "C2" |
| C3 gần nghĩa không khớp từ khoá | 2 | "C3" |
| C4 kho thật, đếm 1 / 10 / 41, "không tìm thấy" | 2 | "C4" |
| C5 truy vấn = câu hiện tại + câu trước, đã che | 2, 5 | "C5" (thuần); "G2 + C5 + G1" (route) |
| L1 lỗi / quá giờ / thiếu khoá / vượt trần ⇒ lùi, 200, log tên sự kiện | 4, 5, 6 | `van-nghia.test.ts` "L1" (quá giờ); route "L1 HÀNG RÀO…", "P2 + Review Focus 5"; e2e 4b. Thiếu khoá: route trả 503 TRƯỚC mọi tìm kiếm (hành vi ADR-0066 giữ — bài "thiếu khoá" cũ) |
| L2 lỗi lô ⇒ không ghi dòng dở | 4, 5 | "L2" |
| P1 tiền lượt = mẫu + embedding, token chỉ của mẫu | 1, 5 | "P1" thuần; "V2 + V5 + P1", "L2", "Review Focus 2 (route)" |
| P2 kiểm trần mức trên trước mọi lần gọi; tính bù vượt ⇒ lùi | 1, 5 | "P2: mức trần trên"; "P2 + Review Focus 5"; "P2 ô thử" |
| P3 ô thử cùng đường tìm, `la_thu = 1` | 5 | "P3 + H1", "P3 + L1" |
| H1 `doanDaChon`, `chiPhiVanNghiaMicroUsd`, "Đoạn đã dùng" | 5, 7 | "P3 + H1"; Chrome bước k |
| G1 hàng rào ADR-0073 vẫn xanh | 5, 9 | ba tệp bài route cũ chạy nguyên (đường lùi); "G2 + C5 + G1" (che, chữ người dùng chỉ ở input, ẩn số tiền trên đường mới) |
| G2 thân embeddings không `user` / định danh | 1, 4, 5, 6 | "G2" thuần; `goiNhung` bài đầu; route "G2 + C5 + G1"; e2e 2b |
| Sổ hàng rào (a), (b) có quan sát chặn thật | 8 | đột biến bước 1–2 |
| Kiểm độc lập | 9 | `nguoi-kiem-doc-lap` |

**Review Focus → bài:** 1 → Task 1 "Review Focus 1" + Task 5 máy giả đảo thứ tự / `sai_chieu`; 2 → Task 4 "Review Focus 2" + Task 5 "Review Focus 2 (route)"; 3 → Task 1 "Review Focus 3" + Task 4 "V4 + Review Focus 3" + Task 6 e2e 2b; 4 → Task 5 "V3 + Review Focus 4"; 5 → Task 5 "P2 + Review Focus 5".

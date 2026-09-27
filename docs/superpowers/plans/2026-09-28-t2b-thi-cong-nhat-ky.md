# Nhật ký thi công T2b — Tour Đảo là hồ sơ tổ chức (ADR-0024 điều 6)

- **Kế hoạch:** `docs/superpowers/plans/2026-09-28-t2b-ho-so-tour-dao.md` (vai lập kế hoạch, 2026-09-28).
- **Nguồn chuẩn tắc:**
  - ADR-0024 (accepted phần điều 6, kèm 6.1–6.6; chủ duyệt "duyệt T2b" 2026-09-28);
  - đề xuất `docs/superpowers/specs/2026-09-27-de-xuat-t2b-ho-so-tour-dao.md`;
  - ADR-0038 điều 7.
- **Nhánh thi công:** `worktree-agent-adbf65d3e8d68a3f9` (worktree `.claude/worktrees/agent-adbf65d3e8d68a3f9`). Tách từ `origin/main` @ `d6468e7` (bản 1.26, đã có ADR-0038). **Lệch kế hoạch (theo lệnh điều phối, bước 0):** `main` CHƯA có nhánh `dac-ta-van-chuyen`; nhánh thi công tự gộp hai nhánh vào: `git merge --no-edit dac-ta-van-chuyen` (tua nhanh tới `f4ec6ff`: ADR-0024 "accepted phần điều 6", 6.1–6.6, bảng "Số đã giữ chỗ") rồi `git merge --no-edit worktree-agent-aa7d23379c3035075` (nhánh kế hoạch, commit gộp `5139be2`). Thông điệp của commit gộp là chữ Anh mặc định của git (do `--no-edit` theo lệnh) — ghi nhận, không viết lại lịch sử.
- **Cách thi công:** executing-plans, một phiên thi công (subagent do điều phối giao, vai THI CÔNG), làm lần lượt từng task; không tự nghiệm thu.
- **Trạng thái:** ĐANG THI CÔNG (2026-09-28). Chủ đã trả lời trong lúc thi công (Ruling D12): Task 9 bỏ (2A); Task 3 thay bằng "cơ chế Y" (Toàn quyền đổi được công ty chủ, ba trigger). Chưa push, chưa gộp, chưa lên production.
- **Người ghi nhật ký này không tự nghiệm thu** (N8). Kết quả của người kiểm độc lập ghi ở mục 8.

## 1. Mốc ban đầu (Task 0)

| Mục | Kết quả |
|---|---|
| Bước 1: ADR-0024 (accepted phần điều 6) và ADR-0038 có trên `main` | ADR-0038 có trên `main` (`d6468e7`). ADR-0024 "accepted phần điều 6" CHƯA có trên `main`, có trên nhánh thi công nhờ gộp `dac-ta-van-chuyen` (dòng 3 của tệp ADR đọc "**accepted phần điều 6**"). Điều phối cho làm như vậy (bước 0). |
| Bước 2: ô `company.legal.write` đã có trên `main`? (kế hoạch dự kiến: CHƯA → Task 7 thêm) | CHƯA (`grep -n '"company.legal.write"' src/shared/permissions.ts` rỗng) → Task 7 thêm ô. |
| Bước 3: `docs/quyen-hoan.json` → `phat_hien` | `[]` — không phát hiện mở nào. |
| Bước 4: số migration lớn nhất trên `main`; kết quả quét mọi nhánh; số dùng cho T2b | Lớn nhất trên `main` và nhánh thi công: `0027_v_stf_toan_quyen.sql`. Quét 42 nhánh cục bộ + thư mục `migrations/` của 8 worktree (05:20, 2026-09-28): không nhánh/worktree nào có tệp `0028_*` hay lớn hơn. Số dùng: ~~0029~~ (D1) → **0030** theo Ruling D13 của điều phối (thứ tự lên `main` dự kiến: 0028 nhánh siết quyền — vai IT, 0029 nhánh Thông báo — đính kèm, 0030 T2b). Quét lại lúc tạo tệp (42 nhánh, thư mục `migrations/` của các worktree): vẫn không có `0028_*`/`0029_*`/`0030_*` nào đã commit. Tên tệp: `migrations/0030_ho_so_cong_ty_chu.sql`. Test tìm tệp theo ĐUÔI tên (`_ho_so_cong_ty_chu.sql`), không theo số (Ruling T1). |
| Bước 5: `npm test` (số test) / `npm run typecheck` | 1019/1019 xanh; typecheck 0 lỗi (trên `5139be2`, sau `npm ci`). |
| Bước 6: `npm run test:e2e` đủ bộ — kịch bản đỏ sẵn có | 23/23 kịch bản xanh; `audit-invariants --strict`: mọi bất biến đạt, 2 cảnh báo sẵn có (R-ORD-6a 1, R-ORD-6b 2 — dữ liệu e2e, không phải T2b). Không có đỏ sẵn có. |
| Bước 7: Chrome trên `main` (`v1-dang-nhap`, `dot-c-smoke`, `dot-a-smoke`, `vai-smoke`, `v1-xac-nhan-png`) — số ✓/✗, ảnh gốc màn đăng nhập | Trên `5139be2` sau `npm run build:web`, chạy lần lượt từng kịch bản (không song song với e2e), `OUT=/tmp/t2b-chrome-goc/<tên>` (ảnh gốc NGOÀI repo): `v1-dang-nhap` **15/15 ✓** (ảnh gốc `/tmp/t2b-chrome-goc/v1-0/anh/dang-nhap-390.png`, `dang-nhap-1040.png`); `vai-smoke` **6 ✓, VAI SMOKE OK**; `v1-xac-nhan-png` **11/11 ✓**; `dot-a-smoke` **8 ✓ rồi ✗** "hết giờ chờ: nhat-ky: thẻ đã dựng xong (máy tính)" (kịch bản dùng tài khoản Quản trị, trang Nhật ký nay chỉ Toàn quyền — ADR-0038 điều 6); `dot-c-smoke` **2 ✓ rồi ✗** "hết giờ chờ: mục Chế độ bảo trì hiện (máy tính)" (nút bảo trì cần Toàn quyền — đã biết từ nhật ký Thông báo lượt 1). |
| Bước 8: số dòng trích dẫn lệch so với kế hoạch (đo trên `5dc4732`) | Không lệch ở: `parties/index.ts` (65–72, 148–153, 228–243, 246–267, 269–286, 291–314, 316–335), `architecture.test.ts:21,24`, `auth/index.ts:103–105`, `contracts.ts:61–68`, `web/parties.ts:262–265, 305–307`, `public/login.html:42–46`, `web/login.ts:332–348, 386–388`. Lệch do nhánh ADR-0038: `permissions.ts` — `notice.send` ở dòng 78 (kế hoạch: "sau dòng 74"); `permissions.test.ts` — `ADMIN_NONE_OPS` ở dòng 183 (kế hoạch: 179), đang có MƯỜI thao tác; `tests/e2e/turnstile.mjs` — `deepEqual` cấu hình ở dòng 36. `thi-cong-tu-choi-huy-hdv` chưa gộp nên không lệch thêm. |
| Bước 9: khẳng định "đúng số lượng / đúng danh sách" tìm thêm được | **Tìm thêm một chỗ kế hoạch bỏ sót:** `docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs:568` (bước f, máy chủ B) `deepEqual` NGUYÊN tập trường của `/api/auth/config` → phải thêm `companyName`, `companyTaxCode` (sửa ở Task 11). Các chỗ khác như kế hoạch dự kiến: `tests/e2e/parties.mjs:17–20` (Task 2), `tests/e2e/turnstile.mjs:36` (Task 6); `tests/e2e/maintenance.mjs:201` cấm `/allowed|0900000004|0989929373|phone/i` — tên + MST không khớp. `tests/audit/doi-tac.test.mjs:73` (`matches.length === 1`) tra SĐT thử, không phải hotline công ty. Không bài nào đối chiếu `deprecatedColumns` với SQL đã đăng ký (chỉ `architecture.test.ts:524` kiểm cột có thật). |

**Đỏ sẵn có trên `main`** (không phải lỗi của T2b): e2e không có. Chrome: `dot-a-smoke` đỏ ở bước "nhat-ky" (máy tính) và `dot-c-smoke` đỏ ở bước "Chế độ bảo trì" (máy tính) — cả hai do ADR-0038 thu hẹp quyền của Quản trị, kịch bản chưa đổi tài khoản. Không đuổi theo trong T2b; so sánh sau T2b theo số ✓ trước điểm đỏ (dot-a 8 ✓, dot-c 2 ✓).

## 2. Câu trả lời của chủ dự án

| Câu | Nội dung | Trả lời (nguyên văn, ngày) | Ảnh hưởng |
|---|---|---|---|
| 6.5 | A (giữ trigger cấm đóng) hay B (bỏ trigger) | **Không chọn A/B — chủ chọn cách thứ ba** (2026-09-28, trả lời trực tiếp trong phiên điều phối, điều phối chuyển lời): *"Cho Super Admin đổi, để sau này tôi có thể dùng cái khung, mã nguồn cho 1 doanh nghiệp khác nữa"*. Điều phối ghi thành ADR-0043 (sửa 6.5(ii) của ADR-0024) trên nhánh `dac-ta-van-chuyen`; thi công theo "cơ chế Y" không đợi tệp đó (Ruling D12) | Task 3 thay bằng cơ chế Y (ba trigger), làm trong migration |
| Câu 2 (điều phối) | Quan hệ "Người liên hệ của Tour Đảo": giữ Quản trị hay khoá chỉ Toàn quyền | **2A** (2026-09-28, chủ trả lời trong phiên điều phối): quan hệ "người liên hệ của" với hồ sơ công ty chủ vẫn để `admin.manage` | Task 9 KHÔNG làm (Ruling D12) |
| Q1 | Chặn thêm bốn cách lách bằng SQL tay (chuyển hồ sơ, đổi mã, xoá, chèn dòng đã đóng) | Điều phối chỉ đạo theo mặc định **(a)**: KHÔNG thêm trigger ngoài phần đã duyệt (Ruling D3) | Task 3 bước 7: không làm |
| Q2 | Sửa chữ địa chỉ tĩnh: chỉ "Tỉnh" (mặc định (a), đúng phần đã duyệt) hay cả ba chỗ lệch ((b), khuyến nghị) | Điều phối chỉ đạo **sửa CẢ BA** chỗ lệch cho khớp đúng dữ liệu ("tỉnh/Tỉnh", "đường/Đường", dấu phẩy sau B2) (Ruling D3) | Task 11 bước 3 — thay đổi NHÌN THẤY ĐƯỢC, nêu trong báo cáo cuối |
| Q3 | Chân trang hiện tên gọi (giữ bản thiết kế) hay tên pháp lý (chữ HOA) | Điều phối chỉ đạo theo mặc định **(a)** tên gọi (Ruling D3) | Task 5, 6, 11 |
| Đề xuất luật | Duyệt `docs/superpowers/plans/2026-09-28-t2b-de-xuat-luat.md` | _(điền)_ | Task 17 |
| Truy vấn chỉ đọc trước phát hành (mục 7 bước 2 của kế hoạch) | Kết quả (chỉ độ dài/cờ) | _(điền)_ | Task 17 |

## 3. Bảng từng task

Cột "Đột biến P16": sửa cố ý → đỏ → hoàn nguyên → xanh. Chép **nguyên văn** dòng đỏ, kèm ngày.

| Task | Việc | Commit | `npm test` sau | Dòng ĐỎ trước (đã thấy) | Đột biến P16 (ngày · đột biến · dòng đỏ) | Người kiểm |
|---|---|---|---|---|---|---|
| 0 | Điều kiện trước, mốc | (nhật ký) | 1019/1019 | — | — | — |
| 1 | `src/shared/cong-ty-chu.ts` | `ced84c6` | xanh (2 test mới) | `ERR_MODULE_NOT_FOUND … cong-ty-chu.ts` (2026-09-28) | — (luật thuần, không phải hàng rào) | chưa |
| 2 | Migration **0030** (gieo hồ sơ + mã vai `active = 0`) + `src/migrations-ho-so-cong-ty-chu.test.ts` + `tests/e2e/parties.mjs` | `1f02515` (chung với Task 3) | 1037/1037 | test: `phải có đúng một tệp *_ho_so_cong_ty_chu.sql, thấy: []` (16 ca đỏ); e2e `parties` với kịch bản cũ: `AssertionError … Expected values to be strictly deep-equal … + 'OWNER_COMPANY'` → `✘ parties`; sau sửa: `E2E PARTIES OK`, 2/2 | 2026-09-28: (h) chèn `0912345678` vào tên gieo → `not ok 8 … error: 'dãy số dài giống SĐT/MST'` → hoàn nguyên → 16/16; (i) chèn id hồ sơ gieo vào chú thích `src/shared/cong-ty-chu.ts` → `not ok 9 … 'src/shared/cong-ty-chu.ts: <8 ký tự đầu của id>…'` → hoàn nguyên → 16/16 | chưa |
| 3 | Cơ chế Y — ba trigger đổi/giữ công ty chủ (D12, thay trigger cấm đóng) | `1f02515` | 1037/1037 | trước khi có trigger (đã có phần gieo): 5 ca đỏ — (a) `Expected values to be strictly deep-equal` (hai dòng mở), ngày đóng `expected: '2026-09-28' actual: ~`, A→B→A `party_role_overlap`; (b), (c) `Missing expected exception.` | 2026-09-28: xoá trigger (a) `…_switch` → `not ok 10/11/12/14`, ca 10 thấy HAI dòng mở `[<id hồ sơ gieo>, '2222…']` → hoàn nguyên → 16/16; xoá (b) `…_keep_last` → `not ok 13 … error: 'Missing expected exception.'` → hoàn nguyên → 16/16; xoá (c) `…_no_reopen` → `not ok 14 … 'Missing expected exception.'` → hoàn nguyên → 16/16 | chưa |
| 4 | `R-PTY-1` | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: `>= 1`; sai mã)_ | _(điền)_ |
| 5 | `ownerCompany`; `GET /api/company`; module company thôi đọc cột pháp lý | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: FIND_LOGO; route đọc lại company_profile)_ | _(điền)_ |
| 6 | `GET /api/auth/config` thêm tên + MST | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: bỏ `.catch`)_ | _(điền)_ |
| 7 | Ô `company.legal.write`; PUT/contacts; `editable` | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: ba route)_ | _(điền)_ |
| 8 | Lớp (i) hai route vai; ánh xạ lỗi; e2e quyền | _(điền)_ | _(điền)_ | _(điền)_ | _(điền: thêm vai; kết thúc; ánh xạ)_ | _(điền)_ |
| 9 | Khoá quan hệ (phụ thuộc câu 2) | KHÔNG LÀM — chủ chọn 2A (D12) | — | — | — | — |
| 10 | Danh bạ (`web/parties.ts`) + Chrome | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ |
| 11 | Trang đăng nhập + bài so khớp + Chrome | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ |
| 12 | Sổ hàng rào | _(điền)_ | — | — | — | _(điền)_ |
| 13 | Tài liệu + sổ dữ liệu + đề xuất diff luật | _(điền)_ | _(điền)_ | — | — | _(điền)_ |
| 14 | Kiểm toàn bộ (tự khai) | — | _(điền)_ | — | — | — |
| 15 | Nhật ký thay đổi (số bản chốt lúc gộp) | _(điền)_ | _(điền)_ | — | — | _(điền)_ |

## 4. Phán quyết của điều phối trong lúc thi công (Ruling) — kèm giá nếu sai

Ruling đã có trong kế hoạch:
- **R1:** module `company` giữ một câu `logo_url` chưa nơi nào gọi, để không nới hàng rào "module nghiêm có ít nhất một câu SQL". Người kiểm độc lập phán quyết ở Task 16.

Ruling mới — **chỉ đạo của điều phối** (lời giao việc 2026-09-28; thắng kế hoạch nếu lệch):
- **D1 — số migration 0029**, không phải 0028 (0028 đã chia cho nhánh Thông báo, `0028_ntf_attachment.sql`). Quét lại mọi nhánh lúc tạo tệp. Nếu thứ tự lên `main` đảo, nhánh lên sau đổi tên tệp và mọi test nhắc tên đó. *Giá nếu sai:* hai migration cùng số, `wrangler` vẫn áp được (theo dõi theo TÊN đầy đủ) nhưng thứ tự áp có thể khác ý. Hệ quả phụ: đặc tả Vận chuyển 1a (`docs/superpowers/specs/2026-09-27-de-xuat-adr-0040-van-chuyen-luot-1a.md:105`) ghi "T2b dự kiến lấy 0028 ⇒ 1a từ 0029" — nay đã cũ; KHÔNG sửa đặc tả đó (của luồng khác), báo điều phối.
- **D13 — số migration đổi thành 0030** (tin thứ hai của điều phối, 2026-09-28): 0028 = nhánh siết quyền (vai IT), 0029 = nhánh Thông báo (đính kèm), 0030 = T2b. Tên tệp `0030_ho_so_cong_ty_chu.sql`; test tìm theo đuôi tên (T1) nên không test nào nhắc số. Quyết định cho Task 3 đã ghi thành ADR-0043 (nhánh `dac-ta-van-chuyen`, sắp commit); cơ chế đúng như D12.
- **D2 — Task 3 (trigger cấm đóng) và Task 9 (khoá route quan hệ) TẠM DỪNG** chờ chủ (6.5: A giữ / B bỏ trigger; câu 2: 2A giữ `admin.manage` không đổi mã / 2B khoá, cần ADR mới). Làm hết phần còn lại rồi báo và dừng.
- **D3 — câu hỏi của người lập kế hoạch:** Q1 theo (a), KHÔNG thêm trigger ngoài phần đã duyệt; Q2 sửa CẢ BA chỗ lệch của chữ địa chỉ tĩnh (lý do của điều phối: sau 6.2 chân trang hiện chuỗi lấy từ dữ liệu, chữ hoa và dấu phẩy vẫn lộ ra); Q3 theo (a).
- **D4 — R1 (câu SQL giữ chỗ đọc `logo_url` ở module `company`) được chấp nhận như NỢ có ghi:** câu không export ra ngoài module, không đường nào gọi tới; gỡ ở pha contract (thu hồi `company_profile`). Người kiểm độc lập phải phán quyết riêng điểm này.
- **D5 — "Toàn quyền là vai ẩn"** (ADR-0038 điều 8 trên nhánh `worktree-an-nhat-ky-toan-quyen` @ `b7ea638`, sẽ thành ADR-0042; đọc bằng `git show`): mọi chữ MỚI người dùng nhìn thấy do T2b thêm (thông báo 403/409, gợi ý ở Danh bạ, câu "ai được sửa", mục nhật ký thay đổi) KHÔNG nói "Toàn quyền" — dùng "người phụ trách hệ thống". Lệch chữ của kế hoạch (Task 7 `OWNER_COMPANY_FORBIDDEN`, Task 10 gợi ý, Task 15 gợi ý nhật ký).
- **D6 — `ALLOWED_EDGES` thêm `company → parties` và `auth → parties` là NỚI một hàng rào đã duyệt (Điều 9.4):** làm trong mã để test chạy; ghi CẢ HAI vào `docs/superpowers/plans/2026-09-28-t2b-de-xuat-luat.md` kèm nguồn (cạnh thứ nhất: đề xuất T2b §5; cạnh thứ hai suy từ 6.2). Sửa test không tự thành được phép: chủ phải duyệt tệp đề xuất trước `day-len`.
- **D7 — Task 10 (Danh bạ) và kịch bản Chrome mới chỉ làm phần hàng rào mới BẮT BUỘC:** "Công ty chủ" không hiện như một vai gán được; bị từ chối thì báo bằng tiếng Việt. Kiểm trước xem cờ `active` của `pty_role_type` có đủ để ẩn mà không viết mã giao diện không, và có làm đỏ bất biến nào về dòng vai đang mở không. Phần vượt quá: không làm, ghi "để sau".
- **D8 — xung đột sắp tới:** `permissions.ts`, `permissions.test.ts`, ảnh chụp route-access cũng đang bị sửa ở `worktree-an-nhat-ky-toan-quyen` và `thi-cong-tu-choi-huy-hdv`. KHÔNG gộp hai nhánh đó; nhánh nào lên sau thì gộp `main`; commit tách nhỏ.
- **D9 — số bản nhật ký thay đổi đặt tạm "1.30"** (nhánh Thông báo và nhánh siết quyền đang giữ 1.27–1.29); điều phối chốt số thật lúc gộp cuối.
- **D10 — máy bận:** bài đo tốc độ hàng rào đỏ vì máy bận thì chạy lại một lần và ghi sổ; Chrome vướng phiên khác thì báo, không ép.
- **D11 — cấm:** `git push`, gộp vào `main`, mọi lệnh `--remote`, `wrangler deploy`, `wrangler secret`; sửa `CLAUDE.md`, `.claude/`, `playbook/`, `docs/adr/`. Truy vấn chỉ-đọc remote trước phát hành là việc của CHỦ (viết sẵn một `--command` trong báo cáo).

- **D12 — câu trả lời của chủ, điều phối chuyển (nguồn: "chủ trả lời 2026-09-28"):**
  - **Câu 2 → 2A.** Quan hệ "người liên hệ của" với hồ sơ công ty chủ giữ `admin.manage`. **Task 9 bỏ.**
  - **Câu 6.5 → "Cho Super Admin đổi"**: vai "Công ty chủ" KHÔNG khoá vĩnh viễn; Toàn quyền đổi được sang hồ sơ tổ chức khác; không bao giờ có lúc trống. Điều phối ghi ADR-0043 (sửa 6.5(ii) của ADR-0024) trên nhánh `dac-ta-van-chuyen`; không đợi tệp đó.
  - **Cơ chế Y thay Task 3 cũ** (chỉ mục duy nhất một phần + trigger cấm đóng) — điều phối đã thử trên SQLite nháp (`/Users/tuanbao/.claude/jobs/32bcd96e/tmp/thu-doi-cong-ty-chu.py`, mọi ca đúng). Ba trigger tên `pty_…` trên `pty_party_role`: **(a)** SAU KHI CHÈN dòng `OWNER_COMPANY` đang mở → tự đóng mọi dòng `OWNER_COMPANY` đang mở khác trong cùng câu lệnh ("đổi" = một câu chèn); KHÔNG dùng chỉ mục duy nhất một phần (nó chặn chính việc đổi); **(b)** cấm đóng dòng `OWNER_COMPANY` đang mở CUỐI CÙNG; **(c)** cấm mở lại dòng `OWNER_COMPANY` đã đóng. Ngày đóng theo đúng quy ước ngày của route "kết thúc vai" (giờ Việt Nam; kiểm `valid_to_date` bao gồm hay loại trừ, rồi làm giống — kết quả ở Ruling T5).
  - **Route:** gán `OWNER_COMPANY` cho hồ sơ TỔ CHỨC chỉ ai có `company.legal.write` (người khác 403) — đây là "đổi". "Kết thúc vai" với `OWNER_COMPANY` luôn từ chối kể cả Toàn quyền: 409, câu tiếng Việt "muốn đổi thì gán cho hồ sơ khác"; không lộ lỗi SQLite thô. Nhật ký ghi việc đổi, không ghi MST/SĐT/email.
  - **Giao diện (tối thiểu):** lựa chọn "Công ty chủ" chỉ hiện với người có `company.legal.write`, chỉ trên hồ sơ tổ chức, kèm câu xác nhận ("Trang đăng nhập và biên nhận sẽ dùng thông tin của hồ sơ này"); người khác không thấy; chữ không nói "Toàn quyền".
  - **Test, P16, sổ hàng rào:** mỗi trigger một bước sửa cố ý → đỏ → hoàn nguyên và một dòng `docs/SO-HANG-RAO.md`. Test phải có: đổi xong thì `ownerCompany`, `/api/company`, `/api/auth/config` trả hồ sơ mới; Quản trị gán → 403; kết thúc → 409; mở lại → bị chặn; `audit-invariants` R-PTY-1 vẫn đúng một.
  - **Q1 vẫn (a):** không thêm trigger cho các cách sửa tay khác.
  - Hệ quả cho các Ruling T2/T3 dưới đây: T3 (gom phần phụ thuộc trigger, "chưa phát hành được trước khi chủ trả lời 6.5") **hết hiệu lực** — thay bằng cơ chế Y; T2 (`active = 0`) giữ nhưng lý do đổi (xem T2).

Ruling mới — **của người thi công** (P8: bề mặt, đảo ngược được, ghi lại):
- **T1 — test migration tìm tệp theo ĐUÔI tên**, không theo số: `files.find((f) => f.endsWith("_ho_so_cong_ty_chu.sql"))`; tệp test đặt tên không số: `src/migrations-ho-so-cong-ty-chu.test.ts` (kế hoạch: `src/migrations-0028.test.ts`). Lý do: D1 — nếu phải đổi số lần nữa thì chỉ đổi tên tệp `.sql`. *Giá nếu sai:* không đáng kể.
- **T2 — mã vai `OWNER_COMPANY` gieo với `active = 0`** (kế hoạch 1.1: `active` 1). Nghĩa: "ngưng dùng cho gán THƯỜNG" — ô "Thêm công việc" chung của Danh bạ lọc `t.active && t.group === "OTHER"` (`web/parties.ts:265`) nên mục này không hiện với ai qua đường chung; lựa chọn "Công ty chủ" (đổi công ty chủ, D12) được THÊM RIÊNG bằng mã giao diện chỉ cho người có `company.legal.write` trên hồ sơ tổ chức (Task 10). Kiểm theo D7: (i) tiền lệ "ngưng dùng cho gán MỚI; dòng đang có giữ nguyên" (`migrations/0024_vai_quyen_mac_dinh.sql:10-11`, vai STAFF/SALES/GUIDE/AGENT đang có dòng mở); (ii) không bất biến nào nối dòng vai đang mở với cờ `active` của loại vai (`scripts/audit-checks.mjs`: R-N1-4, R-LC-1, R-LC-3 và hai kiểm "thông tin" chỉ xét nhóm INTERNAL/EXTERNAL và `STAFF`); (iii) máy chủ không kiểm `active` khi gán (`validateRole`), nên đường đổi qua route vẫn chạy. Bằng chứng máy: test "dữ liệu khoẻ" của `src/audit-invariants.test.ts`, `audit-invariants --db local`, đuôi `--strict` của e2e (ghi ở Task 4/14). Hệ quả: `tests/e2e/parties.mjs` khẳng định `active: false`; ô LỌC danh sách (`web/parties.ts:329`) vẫn liệt kê "Công ty chủ" như mọi vai đã ngưng (lọc, không gán). *Giá nếu sai:* một migration dữ liệu nhỏ đổi lại `active = 1` + lọc ở giao diện.
- **T3 — (HẾT HIỆU LỰC từ D12)** ~~gom phần phụ thuộc trigger vào Task 3 đang dừng~~ — chủ đã trả lời 6.5; cơ chế Y làm luôn trong migration (Task 2 mới) và route (Task 8).
- **T4 — lời gọi chân trang đăng nhập đặt CUỐI khối `try` của `fetchConfig` và không ném lỗi** (kế hoạch: ngay sau `siteKey = …`, dùng `byId` — `byId` ném lỗi khi thiếu phần tử, `web/dom.ts:33-37`). Lý do: `login.html` cũ còn trong bộ nhớ đệm (không có `#company-name`) sẽ làm `fetchConfig` trả `false`, bỏ qua bảo trì + Face ID, vòng `recoverConfig` hỏng mỗi lần và widget Turnstile không dựng ⇒ hỏng đăng nhập. Dùng `document.getElementById`, thiếu phần tử thì thôi.
- **T5 — ngày đóng dòng công ty chủ cũ khi đổi (trigger (a)) = `max(date(NEW.valid_from_date, '-1 day'), valid_from_date của dòng cũ)`.** Kiểm theo D12: `valid_to_date` là ngày CUỐI CÒN HIỆU LỰC (bao gồm) — `toDetail` coi vai đang hiệu lực khi `validTo >= today` (`src/modules/parties/index.ts:120`), danh sách dùng `r.valid_to_date >= ?1` (`repository.ts:53`), trigger chồng lấn 0011 so khoảng [từ, đến] bao gồm hai đầu; route "kết thúc vai" ghi `to` = hôm nay theo giờ Việt Nam (`validateEndDate`, còn hiệu lực hết hôm nay). "Làm giống" cho việc ĐỔI: dòng mới bắt đầu ngày D (route ép D = hôm nay, T6) thì dòng cũ còn hiệu lực tới D − 1 — đúng khuôn đổi vai tài khoản đang có (`src/modules/staff/index.ts:246`: `r.validFrom < today ? addDays(today, -1) : today`); dòng cũ bắt đầu từ D trở đi thì đóng ở ngày bắt đầu của nó (CHECK `valid_to_date >= valid_from_date`). Trigger dùng ngày của dòng mới (không `date('now')`) nên kết quả không phụ thuộc giờ chạy. **Giới hạn đã biết:** đổi A → B rồi B → A trong CÙNG ngày được; đổi lần thứ ba sang B cùng ngày bị trigger chồng lấn 0011 chặn (409 "trùng thời gian") vì dòng B vừa đóng có khoảng [D, D]; với hồ sơ gieo hôm nay (D1 mới: e2e, Chrome, ngày phát hành) thì ngay lần đổi LẠI về hồ sơ gốc trong ngày đã bị chặn (dòng gốc [D, D]). Vì vậy e2e KHÔNG đổi công ty chủ (D1 dùng chung, không khôi phục được trong ngày) — việc đổi kiểm bằng harness (SQLite riêng từng test) và Chrome (D1 tạm riêng). *Giá nếu sai:* sửa thân trigger bằng migration mới.
- **T6 — route gán `OWNER_COMPANY` (sau lời hỏi `company.legal.write`) còn đòi: hồ sơ TỔ CHỨC; không gắn nơi; không ngày kết thúc; ngày bắt đầu trống hoặc = hôm nay (giờ VN)** — sai thì 400 kèm câu tiếng Việt; luật thuần `ownerCompanyAssignProblem` ở `src/modules/parties/rules.ts` (có test). Lý do: "tổ chức" do D12 nêu; ba điều còn lại để "đổi" có hiệu lực từ hôm nay đúng như `ownerCompany` đọc (dòng mở), không có dòng công ty chủ đã đóng sẵn (chèn dòng đóng không đổi gì — giới hạn Q1) hay gắn một bến. Đây là SIẾT trên một khả năng mới, đảo ngược được. *Giá nếu sai:* bỏ bớt điều kiện.
- **T7 — Danh bạ: `admin` = `can(me, "admin.manage")`** thay `hasPermission(me, "ADMIN")` (`web/parties.ts:325`). Lý do: tài khoản chỉ giữ quyền Toàn quyền (không kèm Quản trị — như tài khoản thử e2e/harness) không thấy khối "Thêm công việc" nên không thấy được lựa chọn đổi công ty chủ; máy chủ vốn cho Toàn quyền qua cổng quản trị và ô `admin.manage`. Chỉ ẩn/hiện, máy chủ vẫn kiểm. *Giá nếu sai:* đổi lại một dòng.
- **T8 — KHÔNG thêm kiểm "hồ sơ đủ thông tin mới cho làm công ty chủ"** (tên pháp lý, MST, địa chỉ, liên hệ "Hotline") ở máy chủ: đó là luật nghiệp vụ mới (P8 — logic ⇒ hỏi chủ), không có trong D12. Đổi sang hồ sơ thiếu một trong các trường đó thì `GET /api/company` trả 404 (biên nhận báo lỗi) cho tới khi bổ sung. Tạm thời chỉ cảnh báo trong câu xác nhận của giao diện. **Đưa vào mục "Cần chủ quyết" của báo cáo.**

## 5. Sự cố

- _(điền)_

## 6. Nợ còn lại (không chặn gộp)

- Gộp hồ sơ (N2, chưa có mã) khi xây phải từ chối hồ sơ công ty chủ (ADR-0024 6.4).
- Thu hồi cột pháp lý của `company_profile` theo expand–contract ở lần phát hành sau (6.3). `findLogoUrl` chờ lượt đó quyết.
- Lượt 1 Hoàn tất đơn: trang ghép gọi bất biến này là `R-BIL-7` — phải dùng lại `R-PTY-1`, không thêm kiểm trùng.
- Địa chỉ ở chân trang đăng nhập vẫn là chữ tĩnh (6.2 duyệt hai trường).
- _(điền thêm)_

## 7. Kết quả kiểm của người thi công (tự khai, chưa phải kiểm độc lập)

- `npm test`: _(điền)_ · `npm run typecheck`: _(điền)_ · `npm run build:web`: _(điền)_
- `npm run test:e2e` đủ bộ + `audit-invariants --strict` (có `R-PTY-1`): _(điền)_
- `node scripts/audit-invariants.mjs --db local`: _(điền)_
- `node --test "tests/audit/*.test.mjs"`: _(điền)_
- Chrome: `v1-dang-nhap` _(điền)_ · `dot-c-smoke` _(điền)_ · `dot-a-smoke` _(điền)_ · `vai-smoke` _(điền)_ · `t2b-danh-ba-smoke` _(điền)_ · `v1-xac-nhan-png` _(điền)_
- So ảnh màn đăng nhập 390×844 và 1040×800 với ảnh gốc: _(điền)_

## 8. Kiểm độc lập (`nguoi-kiem-doc-lap`, chỉ đọc) — Task 16

- **Kết luận:** _(điền: ĐẠT / ĐẠT CÓ ĐIỀU KIỆN / KHÔNG ĐẠT, ngày, trên mã commit nào)_
- **Phép đột biến người kiểm tự làm:** _(điền)_
- **Phán quyết Ruling R1:** _(điền)_
- **Phát hiện và cách xử lý:** _(điền)_

## 9. Chưa kiểm (lúc viết mục này)

- _(điền: ví dụ iPhone thật, tài khoản thật trên production)_

## 10. Phát hành (chủ dự án tự chạy — Task 17)

- `npm run day-len -- <nhánh>`: _(điền: ngày giờ, kết quả)_
- `npm run trien-khai` (có migration 0028): _(điền: số phiên bản, Worker, mốc lùi, `audit-invariants --db remote`, cổng phiên bản sau deploy)_
- AI kiểm bằng GET công khai sau triển khai: _(điền)_

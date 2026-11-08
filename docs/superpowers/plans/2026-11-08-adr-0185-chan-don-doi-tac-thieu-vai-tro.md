# ADR-0185 — Chặn đơn của tài khoản Đối tác chưa gán vai trò: Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Không đơn nào do tài khoản giữ quyền Đối tác lập được xác nhận (hay mở yêu cầu kiểm vé) khi người hưởng ra «không người hưởng»; đóng ba đường còn sinh tài khoản Đối tác thiếu vai trò, thêm lớp chặn ở cơ sở dữ liệu và câu kiểm định kỳ.

**Architecture:** Cổng mới `congDoiTacChuaCoVaiTro` ở `src/modules/orders/xac-nhan-chung.ts`, gọi trong `kiemCongXacNhan` ngay sau luật bán (và gọi sớm ở route Còn vé); người hưởng lấy từ `docBangChoChup` của `pricing`, dùng lại cho bản chụp. Đường ghi quyền không qua vai trò từ chối quyền bên ngoài bằng một hàm thuần ở `src/shared/roles.ts`; trigger `lc1c_stf_permission_partner_needs_role` (migration 0149) là lớp thứ hai; `R-LC-1c` ở `scripts/audit-checks.mjs` là lưới thứ ba.

**Tech Stack:** TypeScript, Cloudflare Workers + D1 (SQLite), giao diện thuần dựng bằng `h()`, `node --test`, bộ thử toàn luồng `tests/e2e`.

**Spec:** `docs/adr/ADR-0185-chan-don-doi-tac-thieu-vai-tro.md` (accepted 2026-11-08: Đ1 (a), Đ2 (a), Đ3). Nguồn phát hiện: hồ sơ rà `docs/superpowers/specs/2026-11-07-ra-soat-truoc-launch-lan-2/` (nhánh `claude/kind-wu-98f2cd`, chưa nhập `main`).

**Cách thi công:** một phiên tự làm lần lượt Task 1–6 (các task dựa vào nhau qua hàm gieo và mã lỗi), rồi MỘT người kiểm độc lập chỉ đọc cho cả nhánh (`CLAUDE.md` §3; ghi nhớ «điều phối thi công gộp việc»). Giữa chừng chỉ chạy `node --test <tệp liên quan>` và `npm run typecheck`; `npm test`, `npm run test:e2e` và kịch bản Chrome chạy mỗi thứ một lần ở Task 7.

## Global Constraints

- Tiếng Việt có dấu ở mọi chữ người dùng thấy, commit, tài liệu. Không chữ Anh, không mã thô.
- **Mỗi câu báo đúng một hằng**, bài kiểm khẳng định MÃ lỗi (`doi_tac_chua_co_vai_tro`, `invalid_input`, `account_rule`), chỉ bài của chính hằng mới so nguyên câu — để chủ đổi chữ (Hiến chương 5.27) mà không làm đỏ bài khác.
- Chữ câu báo (chủ chọn 8/11, cả bốn câu theo phương án khuyến nghị; hằng ở đúng một nơi, chủ đổi chữ thì chỉ sửa hằng):
  - `CAU_DOI_TAC_CHUA_CO_VAI_TRO` (ca 1): «Tài khoản của bạn chưa được gán vai trò đối tác nên chưa gửi được đơn. Đơn vẫn được giữ ở dạng nháp. Vui lòng báo Tour Đảo, rồi bấm Gửi đơn lại.»
  - `CAU_DAI_BAO_DOI_TAC_THIEU_VAI_TRO` (dải vàng trên form): «Tài khoản của bạn chưa được gán vai trò đối tác: lập và lưu nháp được, nhưng chưa gửi được đơn. Vui lòng báo Tour Đảo.»
  - `CAU_NHAP_LUU_TRUOC_KHI_CO_VAI_TRO` (ca 2): «Đơn nháp này lưu khi tài khoản chưa có vai trò đối tác. Bấm Sửa, bấm Lưu thay đổi, rồi bấm Gửi đơn.»
  - `CAU_NGUOI_LAP_CHUA_CO_VAI_TRO` (ca 3, văn phòng ở Còn vé): «Người lập đơn là tài khoản Đối tác chưa gán vai trò đối tác. Quản trị, Nhân sự hoặc Toàn quyền gán vai trò ở màn Quản lý tài khoản, rồi người lập bấm Rút lại, Sửa, Lưu thay đổi và Gửi đơn lại.»
  - `CAU_DUONG_CU_QUYEN_NGOAI` (đường quyền cũ; cũng là câu khi trigger lc1c chặn): «Tài khoản Đối tác hoặc Tài xế đối tác phải tạo bằng cách chọn vai trò.»
  - `CAU_GO_QUAN_TRI_SANG_DOI_TAC` (ca hiếm K6): «Tài khoản này đang giữ quyền Quản trị: đổi sang một vai trò nội bộ khác và lưu trước, rồi mới gán vai trò đối tác.»
- Migration số **0149** (soát 8/11: `main` tới 0146; 0147 ở nhánh `claude/adr-0184-thi-cong`; 0148 ở worktree `dispatch-pickup-order-display-1da7b5`, chưa commit; giữ chỗ ở thư mục ghi chú chung). Trước khi gộp phải soát lại.
- Không push, không merge `main`, không deploy, không chạm D1 remote (`CLAUDE.md` §8). Không sửa `playbook/`, ADR đã duyệt, `CLAUDE.md`; dòng mới cho `src/CLAUDE.md` chỉ ĐỀ XUẤT (N9).
- `R-LC-1c` mức `fail` chỉ phát hành sau khi chủ soát xong tài khoản kiểu cũ (Đ3 mục 1).
- Từ 0 giờ 16/11 mục `HC-5.11` quá hạn làm `npm test` đỏ, `npm run day-len` dừng: xong và đưa chủ trước ngày đó.
- Không sửa dòng dữ liệu đang có, không đổi bản chụp hay mốc chụp (ADR «Cửa»).

## Số đo bộ kiểm (bước 1, chạy ngày 8/11)

Đo bằng `node --test` trên bộ chính của `npm test` (855 tệp, trừ bài đo giờ), công cụ đo ở thư mục nháp của phiên (không commit). Mỗi lần chỉ chạy lại các tệp đỏ của lần trước.

| Lần | Điều kiện | Kết quả |
|---|---|---|
| B | chỉ thêm trigger (bản nháp 0149), chưa sửa gieo | 603 giây; 8276 bài, 2218 đỏ ở **208 tệp**; 2194 bài lỗi `lc1c_partner_needs_role` ngay lúc gieo, còn lại đỏ dây chuyền (đồng hồ giả chưa trả, bài con) |
| A | cùng 208 tệp, gỡ trigger (đối chứng) | 768 giây; 2485 bài, **0 đỏ** ⇒ mọi bài đỏ ở lần B do trigger |
| D | 208 tệp, có trigger, `seedStaff` mặc định vai Công ty lữ hành | 84 tệp / 1022 bài đỏ: 525 LC-1 (tài khoản lai bị gán vai bên ngoài), 296 chồng lấn vai (tệp tự chèn lại vai trò đã có), 188 lc1c (gieo ngoài `seedStaff`: `build()` của bài bất biến, bài chính sách phiên), 6 `role_managed` (bài đi đường quyền cũ với tài khoản Đối tác), 7 khác |
| E | 84 tệp đó; lai tự dựng kiểu cũ, bỏ dòng vai thừa ở 25 tệp, sửa `build()` và bài chính sách phiên | 21 tệp / 164 bài đỏ: 135 chồng lấn vai ở 9 tệp trước bị lỗi lai che, 10 đường quyền cũ (Task 2), 19 bài đổi nghĩa thật |
| E2 | 21 tệp đó; bỏ dòng vai thừa đợt hai, `kieuCu` cho tài khoản cố ý «hồ sơ không được hưởng» | 314 giây; 13 tệp / 32 bài đỏ: 10 đường quyền cũ ở 5 tệp `accounts` (Task 2), 1 chồng lấn vai (`auth/ben-dat-cua-toi`, vai đóng ngày dựng bằng chèn thêm), 21 bài đổi nghĩa thật ở 7 tệp (thêm `orders/tran-giam-gia-don`, trước bị lỗi chồng lấn che) |
| F | cả 84 tệp của lần D, sau khi sửa từng bài (Task 1 Step 6) | 283 giây; 1319 bài, **1 đỏ**: `quyen-kieu-cu` «tập một phía vẫn 201» — chờ mã Task 2 (trigger chưa được dịch ⇒ 500) |

Kết luận cho thiết kế:
- ADR đoán 80–100 tệp; thực tế 208 tệp đỏ lúc gieo, nhưng gần hết sửa ở hàm gieo dùng chung và 34 dòng chèn vai thừa. `src/migrations-aut-mfa.test.ts` KHÔNG đỏ (gieo trước khi migration tạo trigger) — ADR đoán sai chỗ này.
- Tài khoản lai chỉ có một hình dạng hợp lệ (kiểu cũ) ⇒ `seedStaff` tự dựng (K8), khỏi sửa khoảng 40 tệp.
- Bài đổi nghĩa thật (E): bài cố ý dùng Đối tác «không được hưởng» (đơn không bên đặt, giảm giá theo luật cũ, vai thu tiền STAFF, đếm hồ sơ được hưởng, loại đối tác bị tắt) — `billing/dat-coc-route`, `orders/an-khach-route`, `orders/thuc-tap-gia-route`, `pricing/cap-hien-hanh-route`, `pricing/loai-doi-tac`, `so-vang-dat-coc`. Quy tắc quyết định: lập nháp / sửa / đọc thì giữ ý bằng tài khoản kiểu cũ; bước Gửi đơn / xác nhận của Đối tác «không được hưởng» sau ADR này KHÔNG còn tới được (cổng Đ1) ⇒ bài đổi sang Đối tác có vai (khẳng định theo luật mới) hoặc tách ca, ghi lý do trong commit.
- Bài gửi / xác nhận đơn của tài khoản lai và kiểu cũ (`LAI` ở 15 tệp) chỉ đổi kết quả khi có cổng (Task 3) — đo ở Task 3 Step 6.
- Ngoài phạm vi ADR đếm: khoảng 20 kịch bản Chrome và khoảng 12 hàm tạo tài khoản của bộ thử toàn luồng gieo Đối tác không vai trò (Task 5).

## Quyết định thi công (điều ADR để kế hoạch chọn)

- **K1 — biết người hưởng sớm:** cổng đọc `docBangChoChup` (hàm công bố sẵn của `pricing`) CHỈ khi người lập giữ quyền Đối tác, rồi trả `bang` cho `kiemCongXacNhan` dùng lại ở `chupDon`. Một phép tính người hưởng; đơn văn phòng không tốn thêm câu đọc nào.
- **K2 — quyền thật của người lập ở Còn vé:** dùng `nguoiLapGiuDoiTac(db, meta.staffId)` sẵn có ở `src/modules/orders/xac-nhan-repo.ts` (đọc view công bố `v_stf_quyen_mo` = quyền thật đang mở; vai «xem như» không nằm trong bảng này) thay cho một hàm tiêm mới từ gốc lắp ráp như ADR gợi ý. Cùng nghĩa, không thêm cạnh module, đã dùng cho ADR-0154 Đ1.6.
- **K3 — vị trí ở Còn vé:** route `quyet-dinh` chạy luật bán, nhóm tắt đưa đón, chốt giờ, đặt gấp TRƯỚC `kiemCongXacNhan`. Để cổng đứng «ngay sau luật bán» (và không đẩy người xét đi ghi giờ, đặt gấp cho một đơn không xác nhận được — cùng lý do ADR-0146 R-7), route gọi cổng ngay sau `chanBanXd`; trong `kiemCongXacNhan` cổng vẫn chạy làm lưới.
- **K4 — thứ tự cạnh cổng Trả sau:** chú thích ADR-0168 Đ2 ghi cổng hạn mức «ngay sau luật bán». ADR-0185 đặt cổng mới xen giữa (cổng Trả sau đọc bên đặt, mà bên đặt lúc này đang sai). Ghi rõ trong chú thích mã, không đổi lặng lẽ.
- **K5 — điều kiện trigger:** đúng câu ADR: «hồ sơ không mở vai nhóm bên ngoài VÀ không mang vai trò do Kế toán thêm». Không thu hẹp bỏ `DRIVER_EXTERNAL`: ca đó chỉ tới được bằng SQL tay và còn phải lách LC-1b; cổng Đ1 vẫn bắt vì xét theo kết quả; giữ nguyên câu đọc Đ3 mà chủ có thể chạy (đã thử đúng 7/11). Một điều kiện, viết giống nhau ở trigger, `R-LC-1c` và câu đọc; bài H4 đối chiếu ba nơi theo hành vi.
- **K6 — nhánh gỡ Quản trị của `PUT /api/staff/:id/roles`:** không xếp lại lô (câu vai của `parties` không mang được điều kiện «còn quản trị viên khác»; dời quyền Đối tác sang lô hai có thể để tài khoản không còn quyền nào khi lô hai hỏng). Kiểm thuần TRƯỚC lô một: nhánh có câu chốt gỡ Quản trị mà quyền sau có thêm Đối tác ⇒ 409 `account_rule`, câu riêng.
- **K7 — thứ tự kiểm ở đường cũ:** `taiKhoanLaiProblem(next) ?? laiNoiBoBenNgoaiProblem(next) ?? quyenNgoaiDuongCuProblem(next)`: tài khoản lai vẫn nhận câu cũ (bài ADR-0083 giữ nguyên), danh sách chỉ có quyền bên ngoài nhận câu mới.
- **K8 — dữ liệu thử:** `seedStaff` nhận `vai` (chèn TRƯỚC quyền) và `kieuCu`; giữ PARTNER mà không nói vai ⇒ `VAI_DOI_TAC_MAC_DINH = "TRAVEL_AGENCY"` (dữ liệu thử mặc định là dữ liệu ĐÚNG). Hình dạng kiểu cũ dựng bằng đường hợp lệ, KHÔNG gỡ trigger, KHÔNG mở lại dòng quyền bằng UPDATE: vai trò đối tác cũ `r-<id>-cu` (từ 2025-01-01) → PARTNER → kết thúc vai đó → vai `STAFF` như lô tạo tài khoản kiểu cũ → các quyền còn lại (LC-1 chỉ canh lúc mở quyền nội bộ khi hồ sơ đang mở vai bên ngoài). Dựng khi `kieuCu: true`, và **tự dựng cho tài khoản lai** (PARTNER + một quyền nội bộ): lai chỉ có một hình dạng hợp lệ, nên không bắt khoảng 40 tệp ghi cờ (số đo lần D: 525 bài đỏ vì lai bị gán vai bên ngoài). Cùng khuôn ở bộ thử toàn luồng (`gieoTaiKhoanLai`).
- **K12 — tài khoản kiểu cũ trong bộ thử toàn luồng:** `gieoTaiKhoanLai` ghi id tài khoản kiểu cũ nó dựng vào tệp `tai-khoan-kieu-cu.txt` trong thư mục D1 tạm (`E2E_PERSIST_TO`); `tests/e2e/run.mjs` ngưng ĐÚNG các tài khoản đó ngay trước `audit-invariants` cuối mỗi máy. Không ngưng theo điều kiện «vi phạm R-LC-1c» — làm thế sẽ che lỗi thật nếu Nền tảng tự sinh tài khoản sai.
- **K9 — khối «Quyền cũ»:** giữ ô Đối tác, Tài xế đối tác trong `boxes` (trạng thái tích lấy từ `s.permissions`), chỉ không vẽ nhãn — như ô Toàn quyền. Bỏ hẳn ô thì `legacyPerms` mất PARTNER, đổi tên một tài khoản kiểu cũ sẽ gửi PUT làm rơi quyền Đối tác mà máy chủ không chặn.
- **K10 — dải báo trên form:** khối cảnh báo (`.alert.warn`) trong thẻ Khách hàng của form lập đơn, không thêm loại dải đầu trang (`src/shared/dai-chu.ts` dành cho trạng thái toàn hệ thống).
- **K11 — câu đọc Đ3 mục 2:** hằng SQL (đơn đã xác nhận, chưa «Khách đã trả đủ», người lập giữ quyền Đối tác, bản chụp «không người hưởng») + bài chạy trên dữ liệu thử; chủ tự chạy trên bản thật.

## Review Focus

1. **Đơn nháp lưu lúc chưa có vai trò rồi tài khoản mới được gán:** Gửi đơn ngay phải ra câu ca 2 (không phải ca 1), lưu lại đơn rồi gửi thì qua — bài ở Task 3.
2. **Toàn quyền đang «xem như» Đối tác:** bị cổng áp; Toàn quyền không đóng vai gửi nháp của chính mình thì như cũ — bài ở Task 3.
3. **Đổi tên/số điện thoại một tài khoản kiểu cũ ở màn Quản lý tài khoản:** không được gửi PUT quyền làm rơi quyền Đối tác — giữ ô ẩn (K9), kiểm ở kịch bản Chrome Task 7.
4. **Đơn văn phòng «Đặt qua đối tác» và đơn khách lẻ:** xác nhận như hôm nay, không tốn thêm câu đọc — bài ở Task 3.
5. **Tài khoản kiểu cũ trong bộ thử toàn luồng:** mọi kịch bản tạo tài khoản kiểu cũ phải gán vai trò hoặc ngưng tài khoản trước khi `audit-invariants` cuối bộ chạy, nếu không tiêu chí 9 đỏ — Task 5.

---

### Task 1: Dữ liệu thử có vai trò + trigger LC-1c (H3)

**Files:**
- Create: `migrations/0149_lc1c_doi_tac_can_vai_tro.sql`, `src/migrations-lc1c.test.ts`
- Modify: `tests/audit/harness.mjs` (`seedStaff`), `tests/audit/xac-nhan-khung.mjs` (`setup()`), `src/audit-invariants.test.ts` (`build()`, `schemaWithoutGuards`), `src/modules/auth/chinh-sach-repo.test.ts` (`nhanVien`: vai trước quyền)
- Modify: 25 tệp bỏ dòng chèn lại vai trò Công ty lữ hành cho chính tài khoản Đối tác vừa gieo (công cụ đo xoá từng dòng có kiểm khớp; ba tệp đổi vòng lặp: `src/modules/billing/tra-sau.test.ts`, `src/tra-sau-cai-dat.test.ts`, `src/muc-nhom-vuot-gia-route.test.ts`)
- Modify: các tệp còn đỏ ở lần đo E (mục «Số đo»), mỗi tệp một quyết định ghi trong commit

**Interfaces:**
- Produces: trigger `lc1c_stf_permission_partner_needs_role`, câu lỗi mở đầu `lc1c_partner_needs_role:` (Task 2 ánh xạ); `seedStaff(sqlite, { id, phone, name, perms, vai?, kieuCu? })`, `VAI_DOI_TAC_MAC_DINH`; vai kiểu cũ `r-<id>-cu` (đã đóng), vai STAFF `r-<id>-staff`.

- [x] **Step 1: Viết bài đỏ** `src/migrations-lc1c.test.ts` trên CSDL dựng từ mọi `migrations/*.sql` (khuôn các bài `src/migrations-*.test.ts`), mỗi ca một tài khoản mới:
  - mở PARTNER khi hồ sơ chỉ mang vai `STAFF` → `assert.throws(…, /lc1c_partner_needs_role/)`; khi tài khoản chưa gắn hồ sơ (`party_id` NULL) → cũng ném
  - hồ sơ mở `TRAVEL_AGENCY` → không ném; vai do Kế toán thêm (nhóm OTHER, `is_partner_label = 1`) → không ném; vai `DRIVER_EXTERNAL` → không ném (ca lọt có ghi, K5)
  - dòng PARTNER chèn sẵn `valid_to_at` → không ném; quyền `SALES` trên hồ sơ không vai → không ném
  - `seedStaff` kiểu cũ (`kieuCu: true`) và lai (`["SALES","PARTNER"]`): còn PARTNER mở, không vai nhóm EXTERNAL mở, có vai `STAFF` mở
- [x] **Step 2:** `node --test src/migrations-lc1c.test.ts` → FAIL (ca đầu không ném; ca seedStaff lai ném lc1_external… nếu chưa sửa gieo).
- [x] **Step 3: Tạo migration 0149**, đúng điều kiện K5 (view công bố của `parties`, như LC-1):

```sql
CREATE TRIGGER lc1c_stf_permission_partner_needs_role BEFORE INSERT ON stf_permission
WHEN NEW.valid_to_at IS NULL AND NEW.permission_type_code = 'PARTNER'
  AND NOT EXISTS (SELECT 1 FROM staff s JOIN v_pty_open_role_group g ON g.party_id = s.party_id WHERE s.id = NEW.staff_id AND g.role_group = 'EXTERNAL')
  AND NOT EXISTS (SELECT 1 FROM staff s JOIN v_pty_party_partner_label l ON l.party_id = s.party_id WHERE s.id = NEW.staff_id)
BEGIN SELECT RAISE(ABORT, 'lc1c_partner_needs_role: tài khoản Đối tác phải có hồ sơ mang vai trò đối tác'); END;
```

- [x] **Step 4:** chạy lại Step 2 → PASS.
- [x] **Step 5: Gieo** (đã làm trong lúc đo, soát lại khi commit): `seedStaff` theo K8; `setup()` bỏ `kieuCu` của LAI (lai tự dựng); `build()` dựng `s-lai` kiểu cũ (`r-lai-cu` mở → PARTNER → đóng); `schemaWithoutGuards` gỡ thêm trigger lc1c; bỏ dòng vai thừa ở 25 tệp.
- [x] **Step 6:** chạy danh sách tệp của lần đo D (`node --test <84 tệp>`) → xanh, trừ đúng một bài chờ mã Task 2 (`quyen-kieu-cu` «tập một phía vẫn 201»: tạo Đối tác bằng đường cũ nay ra 500 vì trigger chưa được dịch). Quyết định từng bài đổi nghĩa (đã làm):
  - Chỉ lập / sửa / đọc mà cần Đối tác «không bị ép bên đặt» ⇒ thêm tài khoản kiểu cũ riêng `DT_CU` / `PARTNER_CU` (`an-khach-route` (n), (n4); `thuc-tap-gia-route` (vii) phần giảm giá; `tran-giam-gia-don` DT0 dựng `kieuCu`).
  - Có bước Gửi đơn / Còn vé ⇒ giữ Đối tác có vai, đổi khẳng định theo luật mới (`an-khach-route` (f), (g), RF5, (n3), (n7), (g3): bên đặt = hồ sơ của chính Đối tác; `dat-coc-route` (b1): vai `BOOKER`; (d2): gieo mức 15% để trần giảm giá không chặn trước cổng lời khai).
  - Ca vai `STAFF` của lời khai đặt cọc chỉ còn tới qua tài khoản đã thôi quyền Đối tác ⇒ `dat-coc-route` (b3), (b5) và sổ vàng `SV-DC-01`, `SV-DC-03` đi đường đó (sổ vàng giữ nguyên số; `SV-DC-04` Hết vé dùng Đối tác có vai — không dòng sổ nào).
  - Đếm hồ sơ được hưởng ⇒ tính thêm hồ sơ của Đối tác (`cap-hien-hanh-route` (f2), (f3)); loại bị tắt ⇒ kết thúc vai mặc định trước (`loai-doi-tac` N-9); vai đóng ngày ⇒ UPDATE vai mặc định (`ben-dat-cua-toi`).
  - Đường quyền cũ (PUT `…/permissions`) chỉ còn cho tài khoản chưa gán vai trò ⇒ tài khoản đi đường đó dựng `kieuCu` (`hai-lop-email-bat`, `quyen-kieu-cu`, `tai-khoan-lai`, `tat-hai-lop`); Đối tác «hồ sơ mang loại» gieo `vai` là loại đó (`loai-doi-tac-noi-bo` N-7 (b)); trở lại Đối tác bằng đường cũ bị cấm ⇒ đi bằng vai trò (`tat-hai-lop` vòng sửa 1).
- [x] **Step 7: Phép phá H3:** đổi tạm tên tệp `migrations/0149_…sql` thành `.bak` → `node --test src/migrations-lc1c.test.ts` ĐỎ ở ca «chỉ mang vai STAFF» → trả tên → XANH. Ghi ngày + lệnh để Task 6 chép vào sổ hàng rào. **Đã làm 8/11 09:59:** bỏ tệp ⇒ 4/8 bài đỏ (gồm ca «chỉ mang vai STAFF», «chưa gắn hồ sơ», «vai đã kết thúc»); trả tên ⇒ 8/8 xanh.
- [x] **Step 8:** `npm run typecheck` (0 lỗi) rồi commit: «ADR-0185 Task 1: trigger lc1c và dữ liệu thử có vai trò đối tác».

### Task 2: Đ2 — đường quyền cũ từ chối quyền bên ngoài (H2), khối «Quyền cũ», công cụ khẩn cấp

**Files:**
- Modify: `src/shared/roles.ts`, `src/shared/roles.test.ts`
- Modify: `src/modules/accounts/index.ts` (`ruleViolation`, `POST /api/staff` nhánh cũ, `PUT /api/staff/:id/permissions`, `PUT /api/staff/:id/roles`)
- Create: `src/modules/accounts/duong-cu-quyen-ngoai.test.ts`, `src/staff-lib-doi-tac.test.ts`
- Modify: `scripts/staff-lib.mjs`, `scripts/create-staff.mjs`, `web/staff.ts`
- Modify: bài TẠO hay CẤP quyền bên ngoài bằng đường cũ đổi thành khẳng định 400 (phần dữ liệu `kieuCu` đã làm ở Task 1): `src/modules/accounts/quyen-kieu-cu.test.ts` («tập một phía vẫn 201» với `["PARTNER"]`), `tai-khoan-lai.test.ts` (POST `["DRIVER_PARTNER"]` và PUT `…/permissions` sang `["DRIVER_PARTNER"]` — nay 400), cùng bài nào khác Step 6 phát hiện.

**Interfaces:**
- Consumes: câu lỗi `lc1c_partner_needs_role:` (Task 1).
- Produces: `CAU_DUONG_CU_QUYEN_NGOAI`, `CAU_GO_QUAN_TRI_SANG_DOI_TAC`, `quyenNgoaiDuongCuProblem(perms: readonly PermissionCode[]): RoleProblem | null` (cả ba ở `src/shared/roles.ts` — tệp thuần để bài kiểm nhập được); `insertStaffSql({ name, phone, pin, permissions, active?, vai? })` — `vai` phải là vai trò nhóm bên ngoài mà quyền mặc định của nó chứa mọi quyền được xin (không dựng hồ sơ chỉ Tài xế đối tác mà giữ Đối tác — ca lọt K5).

- [x] **Step 1: Bài đỏ hàm thuần** (`roles.test.ts`): `quyenNgoaiDuongCuProblem(["PARTNER"])` và `(["DRIVER_PARTNER"])` → `{ forbidden: false, message: CAU_DUONG_CU_QUYEN_NGOAI }`; `(["SALES","ADMIN"])`, `([])` → `null`.
- [x] **Step 2: Bài đỏ route** (`duong-cu-quyen-ngoai.test.ts`, khung `world()` + `seedStaff`, gọi bằng Toàn quyền):
  - `POST /api/staff {taoHoSoMoi, fullName, phone, permissions:["PARTNER"]}` → 400 `invalid_input`, `message === CAU_DUONG_CU_QUYEN_NGOAI`; không có tài khoản nào mang SĐT đó. Cùng ca với `["DRIVER_PARTNER"]`.
  - `POST /api/staff {…, permissions:["SALES","PARTNER"]}` → 400 `invalid_input` và câu KHÁC `CAU_DUONG_CU_QUYEN_NGOAI` (K7: câu lai cũ giữ nguyên).
  - `PUT /api/staff/:id/permissions {permissions:["PARTNER"]}` với tài khoản nội bộ chưa gán vai trò → 400 `invalid_input`; quyền không đổi.
  - `PUT /api/staff/:id/roles {roles:["TRAVEL_AGENCY"]}` với tài khoản đang giữ ADMIN (gieo `seedStaff` vai `DIRECTOR`, quyền `["ADMIN"]`) → 409 `account_rule`, `message === CAU_GO_QUAN_TRI_SANG_DOI_TAC`; quyền và vai không đổi.
  - Tiêu chí 8: `POST /api/staff {…, roles:["TRAVEL_AGENCY"]}` → 201, tài khoản giữ PARTNER, hồ sơ mở `TRAVEL_AGENCY`.
- [x] **Step 3: Bài đỏ công cụ khẩn cấp** (`staff-lib-doi-tac.test.ts`): `insertStaffSql({…, permissions:["PARTNER"]})` → reject, câu có chữ «vai»; `vai: "SALES_STAFF"` → reject (không phải vai nhóm bên ngoài); `vai: "TRAVEL_AGENCY"` → câu SQL chạy được trên `world()`, tài khoản giữ PARTNER, hồ sơ mở `TRAVEL_AGENCY`, KHÔNG có vai `STAFF`; `permissions:["SALES"]` không `vai` → như hôm nay (vai `STAFF`).
- [x] **Step 4:** `node --test src/shared/roles.test.ts src/modules/accounts/duong-cu-quyen-ngoai.test.ts src/staff-lib-doi-tac.test.ts` → FAIL.
- [x] **Step 5: Mã.**
  - `quyenNgoaiDuongCuProblem`: có `isExternalPermission` ⇒ vấn đề. Gọi theo K7 ở `POST /api/staff` nhánh cũ và `PUT …/permissions`.
  - `ruleViolation`: `/lc1c_partner_needs_role/` → 409 `account_rule`, `CAU_DUONG_CU_QUYEN_NGOAI`.
  - `PUT …/roles` (K6): sau `checkAccountChange`, `change.permissions.guarded && change.next.includes("PARTNER") && !t.permissions.includes("PARTNER")` ⇒ 409 `account_rule` `CAU_GO_QUAN_TRI_SANG_DOI_TAC`, TRƯỚC lô một.
  - `insertStaffSql`: thêm `vai` vào `ALLOWED_KEYS`; `vai` phải là `isRoleCode` nhóm `EXTERNAL` (`ROLES[vai].group`); PARTNER không `vai` ⇒ ném; có `vai` thì chèn vai đó THAY `STAFF`. `scripts/create-staff.mjs` nhận thêm đối số `vai` tuỳ chọn, ghi trong câu hướng dẫn dùng.
  - `web/staff.ts` (K9): `permissionBoxes` không vẽ nhãn cho mã `isExternalPermission` (ô vẫn trong `boxes`, trạng thái tích theo `s.permissions`).
- [x] **Step 6:** chạy lại Step 4 → PASS; chạy các bài accounts đỏ ở lần đo D → sửa theo mục Files.
- [x] **Step 7: Phép phá H2** (mỗi đường một lần, đỏ rồi hoàn nguyên): bỏ lời gọi ở `POST` → bài POST ĐỎ với 409 `account_rule` (trigger qua `ruleViolation`, KHÔNG 500); bỏ ở `PUT …/permissions` → bài PUT ĐỎ; bỏ câu ném trong `insertStaffSql` → bài công cụ ĐỎ. Ghi ngày. **Đã làm 8/11 10:08:** bỏ ở POST ⇒ bài POST đỏ với 409 `account_rule` của trigger (không 500); bỏ ở PUT ⇒ bài PUT đỏ (409); bỏ câu ném ⇒ bài công cụ đỏ; bỏ kiểm K6 ⇒ bài K6 đỏ; trả lại ⇒ 9/9 xanh.
- [x] **Step 8:** typecheck, commit «ADR-0185 Task 2: đường quyền cũ không cấp quyền bên ngoài».

### Task 3: Đ1 — cổng chặn đơn của Đối tác chưa có vai trò (H1) + dải báo trên form

**Files:**
- Modify: `src/modules/orders/xac-nhan-chung.ts`, `src/modules/orders/xac-nhan-route.ts` (`gui-don`, `quyet-dinh`), `src/modules/orders/index.ts` (`/status`)
- Create: `src/modules/orders/doi-tac-chua-co-vai-tro.test.ts`
- Modify: `src/shared/phan-doi-tac-hien-thi.ts`, `src/shared/phan-doi-tac-hien-thi.test.ts`, `web/order-form.ts`
- Modify: bài dùng `LAI` / tài khoản kiểu cũ mà Gửi đơn hay Còn vé đơn của chính nó với bên đặt trống (đỏ sau Step 5, xem Step 6)

**Interfaces:**
- Consumes: `seedStaff({ kieuCu })`; `docBangChoChup`, `laNguoiHuong`, `DuLieuChup` (`../pricing`); `nguoiLapGiuDoiTac` (`./xac-nhan-repo`).
- Produces (`xac-nhan-chung.ts`):
  - `type NguoiLapDoiTac = { cua: "nguoi-lap"; partyId: string | null } | { cua: "xet-duyet" } | null`
  - `nguoiLapLaNguoiBam(staff: StaffProfile): NguoiLapDoiTac` — `holdsPartner(staff)` (bộ quyền hiệu lực) ? `{ cua: "nguoi-lap", partyId: staff.partyId }` : `null`
  - `congDoiTacChuaCoVaiTro(db, i: { nguoiLap: NguoiLapDoiTac; order: DonXacNhan; today: string }): Promise<{ loi: Response } | { bang: DuLieuChup | null }>`
  - hằng `CAU_DOI_TAC_CHUA_CO_VAI_TRO`, `CAU_NHAP_LUU_TRUOC_KHI_CO_VAI_TRO`, `CAU_NGUOI_LAP_CHUA_CO_VAI_TRO`; `DOI_TAC_CHUA_CO_VAI_TRO = (cau: string) => error(409, "doi_tac_chua_co_vai_tro", cau)`
  - `kiemCongXacNhan(db, i)`: thêm trường BẮT BUỘC `nguoiLapDoiTac: NguoiLapDoiTac`
- Produces (`phan-doi-tac-hien-thi.ts`): `doiTacThieuVaiTro(staff: PermissionHolder, benDatCuaToi: BenDatChon | null | undefined): boolean`, `CAU_DAI_BAO_DOI_TAC_THIEU_VAI_TRO`.

- [x] **Step 1: Bài đỏ** `doi-tac-chua-co-vai-tro.test.ts` (khung `setup()` của `xac-nhan-khung`; `DT_CU` = `seedStaff({ perms:["PARTNER"], kieuCu:true })`). Mọi bài khẳng định MÃ; riêng ca đầu mỗi câu so nguyên hằng:
  - Tiêu chí 1: `DT_CU` lập nháp ZB1 (không cần kiểm vé), `POST …/gui-don` → 409 `doi_tac_chua_co_vai_tro`, câu `CAU_DOI_TAC_CHUA_CO_VAI_TRO`; đơn `draft`; 0 dòng `ord_service_terms`; 0 nhật ký `confirmed`.
  - Tiêu chí 2: `datCo(w, …, "ZA1", true)`, nháp ZA1 → 409 cùng mã; 0 dòng `ord_confirm_request`.
  - Tiêu chí 3 (Review Focus 1): nháp lưu khi kiểu cũ → Toàn quyền `PUT /api/staff/:id/roles {roles:["TRAVEL_AGENCY"]}` → Gửi đơn → 409 câu `CAU_NHAP_LUU_TRUOC_KHI_CO_VAI_TRO`; `PUT /api/orders/:id` lưu lại → Gửi đơn → thành công; dòng bản chụp mang người hưởng `pty-<DT_CU>`.
  - Tiêu chí 4: `PARTNER` (có vai) gửi nháp ZA1 cần kiểm vé → yêu cầu mở; đóng vai trò của hồ sơ bằng câu SQL (dữ liệu sửa tay — trigger không thấy) → `B` bấm `quyet-dinh` `CON_VE` → 409 câu `CAU_NGUOI_LAP_CHUA_CO_VAI_TRO`; đơn `draft`, yêu cầu còn mở.
  - K3 (phép phá H1 (ii)): như trên nhưng dịch vụ Đón có lượt đầu chưa giờ (yêu cầu mang cờ chốt giờ), Còn vé không gửi `gioDon` → 409 `doi_tac_chua_co_vai_tro`, KHÔNG phải `pickup_time_required`.
  - Tiêu chí 5 (Review Focus 2): `SUP` bật `POST /api/auth/xem-nhu-vai {role:"PARTNER"}`, lập nháp, Gửi đơn → 409 `doi_tac_chua_co_vai_tro`; `SUP` không đóng vai lập nháp, Gửi đơn → xác nhận như hôm nay.
  - Tiêu chí 6 (Review Focus 4): `A` lập đơn khách lẻ, `/status` `confirmed` → 200; `A` lập đơn «Đặt qua đối tác» (bên đặt `pty-<PARTNER>`) → 200, bản chụp người hưởng `pty-<PARTNER>`. `congDoiTacChuaCoVaiTro(dbNemLoi, { nguoiLap: null, … })` → `{ bang: null }` (không câu đọc nào).
  - Hồi quy: `PARTNER` (có vai) Gửi đơn ZB1 → xác nhận, bản chụp người hưởng là hồ sơ của nó. `LAI` Gửi đơn nháp bên đặt trống → 409 `doi_tac_chua_co_vai_tro`.
  - Thứ tự theo mã nguồn (khuôn `src/luat-ban-moi-cua.test.ts`): trong thân `kiemCongXacNhan`, `congDoiTacChuaCoVaiTro(` đứng sau `congLuatBan(` và trước `traSauChoXacNhan(`; trong route `quyet-dinh`, sau `congLuatBan(` và trước `congNhomTatDuaDon(`.
- [x] **Step 2:** `node --test src/modules/orders/doi-tac-chua-co-vai-tro.test.ts` → FAIL.
- [x] **Step 3: Cổng.** `congDoiTacChuaCoVaiTro`: `nguoiLap === null` ⇒ `{ bang: null }` ngay. Còn lại đọc `docBangChoChup` (cùng tham số `kiemCongXacNhan` đang dùng); `bang.nguoiHuong.loai !== "NONE"` ⇒ `{ bang }`; NONE ⇒ chọn câu: `xet-duyet` → ca 3; `nguoi-lap` → (`partyId !== null` và `laNguoiHuong(db, partyId)`) ? ca 2 : ca 1. Trong `kiemCongXacNhan` gọi ngay sau `congLuatBan`, trước `traSauChoXacNhan` (K4: chú thích ghi rõ thứ tự mới); `chupDon` dùng `bang` trả về khi khác `null`, không đọc lần hai.
- [x] **Step 4: Nơi gọi.** `gui-don` và `/status`: `nguoiLapDoiTac: nguoiLapLaNguoiBam(staff)`. `quyet-dinh`: ngay sau `chanBanXd`, `const nld = (await nguoiLapGiuDoiTac(env.DB, meta.staffId)) ? { cua: "xet-duyet" } : null`, gọi cổng (K3), rồi truyền `nld` cho `kiemCongXacNhan`.
- [x] **Step 5:** chạy lại Step 2 → PASS; `npm run typecheck`.
- [x] **Step 6:** chạy 35 tệp dùng `xac-nhan-khung` + các tệp đỏ ở lần đo E: bài `LAI`/kiểu cũ đổi kết quả (đã biết trước: Gửi đơn của `LAI` với bên đặt trống) — mỗi bài một quyết định ghi trong commit: giữ ý bài bằng đơn có bên đặt đại lý do văn phòng gắn, hoặc đổi thành khẳng định 409 khi chính bài thử đường của tài khoản lai. Sổ vàng đặt cọc (`src/so-vang-dat-coc.test.ts`): thêm khẳng định đường gốc của ca «người lập không phải bên đặt được hưởng» nay bị chặn — Đối tác kiểu cũ Gửi đơn ⇒ 409 `doi_tac_chua_co_vai_tro` — để việc đổi đường ở Task 1 kiểm được bằng máy; báo chủ ở mục «Cần bạn quyết» (ba trên bốn ca của sổ mô tả luồng ADR-0185 cấm, sổ còn chờ xác nhận).
  **Đã làm 8/11 (lần đo G: 214 tệp liên quan, 313 giây, 25 bài đỏ ở 12 tệp — mọi bài đỏ do cổng):**
  - 15 bài ở 6 tệp cần ĐƠN ĐÃ XÁC NHẬN của Đối tác cho khách lẻ (`billing/so-cong-no-ben` ×7, `billing/ben-kia`, `billing/ben-kia-lua-chon`, `billing/kenh-thu-cong` ×4, `orders/thuong-mai-route` (3g), (3h)): trạng thái này nay chỉ còn là dữ liệu cũ (ADR Đ3 mục 2) hoặc do «Đổi khách» sau xác nhận ⇒ dựng bằng trợ giúp mới của khung thử `xacNhanDonCu(id, nguoiLap, vanPhong)` (văn phòng xác nhận thay, rồi trả người lập bằng SQL). Số liệu sổ của các bài giữ nguyên.
  - Tài khoản lai cần đơn đã xác nhận / đang chờ của chính nó (`orders/ben-dat-doi-tac` ca 3e, `ve-dien-tu/adr-0171` Đ1 ×2, `orders/thuong-mai-route` (3c), `orders/gui-don-route` (4b), `orders/xac-nhan-trang-don`): dựng bằng `xacNhanDonCu` / `guiKiemVeCu`; hai bài sau khẳng định thêm Gửi đơn của tài khoản lai ⇒ 409.
  - Bài chính là thử đường gửi của tài khoản lai / Đối tác không người hưởng ⇒ đổi thành khẳng định 409 `doi_tac_chua_co_vai_tro`: `orders/gui-don-chot-gio` (q) (luật `canChotGioCuaNguoiLap` không đổi, đường tới nó đóng), `orders/thuc-tap-gia-route` (iv)(v)(vi) cho «Thực tập + Đối tác» (bốn tài khoản Thực tập còn lại giữ luật giá), `orders/tran-giam-gia-don` «Xác nhận: Đối tác kiểu cũ có giảm giá đã lưu» (câu cũ DK-T3-01 ở bước xác nhận vẫn canh ở bài I-1).
  - Sổ vàng đặt cọc: thêm khẳng định đường gốc (Đối tác kiểu cũ Gửi đơn ⇒ 409) trước bước thôi quyền.
- [x] **Step 7: Dải báo.** Bài đỏ `phan-doi-tac-hien-thi.test.ts`: `doiTacThieuVaiTro({permissions:["PARTNER"]}, null)` → `true`; có `benDatCuaToi` → `false`; `{permissions:["SALES"]}` → `false`. Mã: `holdsPartner(staff) && !benDatCuaToi`. `web/order-form.ts`: khi `true`, thẻ Khách hàng có khối `h("p", { class: "alert warn", role: "status" }, CAU_DAI_BAO_DOI_TAC_THIEU_VAI_TRO)` (K10). **Đã làm:** dải đặt ở ĐẦU dòng «Ngày khởi hành» của thẻ (công tắc «Ẩn thông tin khách» ẩn mọi phần khác của thẻ, `.buoc[data-an-khach] > :not(.khach-ngay)`); giao diện hiện câu máy chủ khi Gửi đơn bị chặn ở cả trang đơn (`c.baoLoi`) lẫn «lưu rồi gửi» của form (`cauLoiGuiDon`).
- [x] **Step 8: Phép phá H1:** (i) bỏ dòng gọi cổng trong `kiemCongXacNhan` → bài tiêu chí 1 ĐỎ → hoàn nguyên; (ii) bỏ lời gọi sớm ở `quyet-dinh` → bài K3 ĐỎ (nhận `pickup_time_required`) → hoàn nguyên. Ghi ngày. **Đã làm 8/11 10:52** (sau lần chạy lại 214 tệp + bài mới: 2.685 bài, 0 đỏ): (i) thay hai dòng gọi cổng bằng `{ bang: null }` ⇒ 6/9 bài đỏ, gồm tiêu chí 1 «200 !== 409», tiêu chí 2, 3, 5, hồi quy, thứ tự; (ii) xoá hai dòng `vaiTroXd` ⇒ K3 đỏ với `actual: 'pickup_time_required'` và bài thứ tự đỏ; trả nguyên tệp ⇒ 9/9 xanh.
- [x] **Step 9:** commit «ADR-0185 Task 3: chặn Gửi đơn / Còn vé khi Đối tác chưa có vai trò đối tác» (typecheck 0 lỗi).

### Task 4: Đ3 — câu kiểm R-LC-1c, câu đọc cho chủ, ca Đổi khách (H4)

**Files:**
- Modify: `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts`
- Create: `scripts/cau-doc-doi-tac-thieu-vai-tro.mjs`, `src/cau-doc-doi-tac-thieu-vai-tro.test.ts`

**Interfaces:**
- Produces: kiểm `R-LC-1c` (mức `fail`); `CAU_DOC_TAI_KHOAN` (= câu đọc của ADR Đ3 mục 1, nguyên văn), `CAU_DOC_DON` (K11) — hai hằng của `scripts/cau-doc-doi-tac-thieu-vai-tro.mjs`; chạy thẳng tệp thì in hai lệnh `npx wrangler d1 execute tourdao-sales-db --remote --command "…"` chỉ đọc cho chủ (AI không chạy).

- [x] **Step 1: Bài đỏ** (`audit-invariants.test.ts`, trên `schemaWithoutGuards`):
  - `R-LC-1c` mức `fail`; tài khoản giữ PARTNER, hồ sơ chỉ `STAFF` → 1; mở `TRAVEL_AGENCY` → 0; tài khoản ngưng (`active = 0`) → 0; dòng PARTNER đã đóng → 0; vai nhãn đối tác (OTHER, cờ) → 0; `DRIVER_EXTERNAL` → 0 (K5).
  - H4 đối chiếu ba nơi theo hành vi: dựng năm hình dạng trên; với mỗi hình dạng, `R-LC-1c` đếm 1 ⇔ `CAU_DOC_TAI_KHOAN` trả đúng tài khoản đó ⇔ trên CSDL CÓ trigger, chèn PARTNER cho hồ sơ cùng hình dạng thì ném.
  - «dữ liệu khoẻ»: đóng PARTNER của `s-lai` trước khi kiểm (tài khoản lai kiểu cũ đúng là vi phạm R-LC-1c), tên bài giữ nguyên.
- [x] **Step 2: Bài đỏ câu đọc đơn + Đổi khách** (`cau-doc-doi-tac-thieu-vai-tro.test.ts`, khung `setup()`): `A` lập đơn khách lẻ, `/status` xác nhận (bản chụp NONE), `UPDATE orders SET staff_id = DT_CU` (dữ liệu cũ) → `CAU_DOC_DON` trả đơn đó; Toàn quyền gán `TRAVEL_AGENCY` cho `DT_CU`; `A` `PUT /api/orders/:id/booker` sang `pty-<DT_CU>` → bản chụp mới mang người hưởng `pty-<DT_CU>`, dòng cũ bị thay; `CAU_DOC_DON` không còn trả đơn đó; `CAU_DOC_TAI_KHOAN` trả `DT_CU` trước khi gán, không trả sau khi gán. **Đã làm, lệch có ghi:** dữ liệu cũ dựng bằng `xacNhanDonCu` của khung thử (Task 3: `DT_CU` lập nháp, văn phòng xác nhận thay rồi trả người lập — cùng ý `UPDATE staff_id`); «Đổi khách» do Quản trị bấm vì Bán hàng chỉ đổi được đơn của mình hoặc đơn mình phụ trách (ô `order.trip.edit`). Thêm: đối chứng (nháp chưa xác nhận, đơn khách lẻ của văn phòng không vào danh sách), đơn vẫn trong danh sách sau khi gán vai trò (gán chưa đủ), câu tài khoản so nguyên văn với tệp ADR, chạy tệp in đúng hai lệnh.
- [x] **Step 3:** FAIL → thêm `R-LC-1c` (cùng điều kiện trigger, đọc view, `s.active = 1`, đếm tài khoản) và tệp câu đọc → PASS. (Đỏ: hai bài «phải có đúng một kiểm R-LC-1c»; xanh: 212/212 bài của hai tệp.)
- [x] **Step 4: Phép phá H4:** bỏ vế «vai trò do Kế toán thêm» khỏi `R-LC-1c` → bài đối chiếu ĐỎ → hoàn nguyên. Ghi ngày. **Đã làm 8/11 11:01:** bỏ vế ⇒ bài R-LC-1c đỏ «2 !== 1» và bài H4 đỏ ở hình dạng «vai trò do Kế toán thêm»; trả nguyên ⇒ xanh. Phá phụ: bỏ điều kiện «bản chụp hiện hành» khỏi `CAU_DOC_DON` ⇒ ca Đổi khách đỏ.
- [x] **Step 5:** commit «ADR-0185 Task 4: câu kiểm R-LC-1c và câu đọc cho chủ». (Trước commit: 40 tệp kiểm có dùng danh sách kiểm bất biến hoặc nhắc R-LC-1 — 821 bài, 0 đỏ.)

### Task 5: Bộ thử toàn luồng (H5)

**Files:**
- Modify: `tests/e2e/lib.mjs` (`gieoTaiKhoanLai`), `tests/e2e/run.mjs` (K12)
- Modify: kịch bản tạo Đối tác qua `POST /api/staff permissions` (sẽ 400): `bangtin.mjs` (`taoTaiKhoanDungMotLan`), `dispatch.mjs` (`makeStaff`), `nhap-ke-toan.mjs` (`taiKhoanCookie`), `permissions.mjs` (`taoTheoQuyen`, `theoQuyen`, ca Hạn mức), `thongbao.mjs`, `nhap-tay-va-gia-doi-tac.mjs`, `tai-xe-doi-tac.mjs`, `hai-lop.mjs` (`taoMoi`), `roles.mjs`, `tro-ly.mjs` — chuyển sang `roles: ["TRAVEL_AGENCY"]`, trừ chỗ chính bài thử đường cũ (đổi thành khẳng định 400 `invalid_input`)
- Modify: kịch bản `gieoTaiKhoanLai` với Đối tác: `ban-hang-phu-trach`, `dat-coc`, `dispatch`, `feedback`, `gui-don`, `hai-lop`, `nhap-ke-toan`, `nhap-tay-va-gia-doi-tac`, `so-dai-ly-dot-2`, `sua-muc`, `tu-khai`, `bangtin` — Đối tác thuần nhận vai mặc định; `so-dai-ly-dot-2` DT0 «Không Hưởng» và `nhap-tay-va-gia-doi-tac` P0 «Khách Lẻ» chọn lại ý (kiểu cũ thì Gửi đơn nay 409 — đổi bước xác nhận sang khẳng định 409)
- Create: `tests/e2e/doi-tac-chua-co-vai-tro.mjs` (+ khai trong danh sách kịch bản của `run.mjs`)

**Interfaces:**
- Consumes: `insertStaffSql({ vai })` (Task 2), mã `doi_tac_chua_co_vai_tro` (Task 3), `R-LC-1c` (Task 4).
- Produces: `gieoTaiKhoanLai(name, permissions, { vai?, kieuCu? } = {})` — cùng luật `seedStaff`: Đối tác thuần ⇒ `vai` mặc định `TRAVEL_AGENCY`; lai hoặc `kieuCu` ⇒ `insertStaffSql` với vai rồi SQL đóng vai, mở `STAFF`, mở quyền còn lại; ghi id vào `${E2E_PERSIST_TO}/tai-khoan-kieu-cu.txt`.

- [x] **Step 1:** `gieoTaiKhoanLai` + `run.mjs` ngưng đúng danh sách K12 trước `audit-invariants` mỗi máy (in số tài khoản đã ngưng). *Đã làm 8/11: câu ngưng ở MỘT nơi `cauNgungTaiKhoanKieuCu` (lib.mjs) cho cả run.mjs và `so-dai-ly-dot-2` (tự chạy audit giữa chừng, mục 7); câu kết thúc luôn phiên sống của tài khoản bị ngưng (R-AUT-SESSION-2). Thêm `ghiNgung: false` cho kịch bản tự gán vai trò. Bước ngưng đứng thành câu riêng trước khối `if (coAudit) {` vì bài `src/kiem-phan.test.ts` khoá khuôn khối audit.*
- [x] **Step 2:** sửa từng kịch bản ở mục Files. *Đã làm 8/11: trợ giúp `thanQuyenTaiKhoan` (Đối tác thuần → `roles: [TRAVEL_AGENCY]`) cho bangtin, dispatch, permissions, nhap-ke-toan, hai-lop, thongbao, tro-ly; xe-tren-don qua `vai`. Ý bài đổi: tai-xe-doi-tac (POST quyền `PARTNER` và cả `DRIVER_PARTNER` ⇒ khẳng định 400, tài khoản chưa gán vai gieo SQL), hai-lop E và nhap-tay P0, so-dai-ly-dot-2 DT0 dựng kiểu cũ; nhap-ke-toan: lai Gửi đơn ⇒ 409 rồi `xacNhanDonCu`. Không cần sửa (đã rà): roles (lai 400 như cũ), gui-don, xac-nhan-don, ban-hang-phu-trach, dat-coc, feedback, sua-muc, tu-khai, cam-ket-xe, catalog, chinh-sach-phien. Lệch kế hoạch: luật «Đối tác không giảm giá» ở bước xác nhận của đơn KHÔNG người hưởng nay không còn đường tới (cổng mới đứng trước) — nhap-tay mục 5, 6b đổi sang khẳng định 409, câu đó còn canh ở đơn có người hưởng.*
- [x] **Step 3:** kịch bản mới: tài khoản kiểu cũ lập nháp, Gửi đơn → 409 `doi_tac_chua_co_vai_tro`; Toàn quyền gán `COLLABORATOR`; lưu lại, Gửi đơn → thành công; kết thúc với tài khoản đã có vai (không vào danh sách ngưng). *Đã làm 8/11: `tests/e2e/doi-tac-chua-co-vai-tro.mjs`, khai trong `tests/e2e/danh-sach.mjs` ngay sau `gui-don` (bảng chia phần tự tính). Ca 1 / ca 2 phân biệt bằng tên nút, nguyên văn câu đã khoá ở bài khung thử (node không nạp thẳng được `xac-nhan-chung.ts`).*
- [x] **Step 4: Kịch bản Chrome gieo Đối tác qua `insertStaffSql`** (khoảng 20 tệp ở `docs/evidence/**/kich-ban/`, ADR chưa đếm): chỉ sửa kịch bản chạy ở Task 7 (`doi-tac-lap-don-smoke.mjs` — tài khoản Đối tác của nó cố ý «không hưởng» nên dựng kiểu cũ; `vai-smoke.mjs` nếu gieo Đối tác). Các tệp còn lại ghi thành bẫy ở `docs/CHANGE-GUIDE.md` (lỗi rõ, sửa một dòng `vai` khi chạy lại) và báo chủ là nợ. *Đã làm 8/11: `doi-tac-lap-don-smoke.mjs` dựng Đối tác kiểu cũ bằng SQL (đường POST bằng Quản trị đã chết từ ADR-0071), thêm khẳng định dải vàng (bước 2, 2m có; Bán hàng, Thực tập không), bước 3v bấm Gửi đơn trên trang nháp, bước 6 dựng đơn đã xác nhận bằng văn phòng làm thay; `vai-smoke.mjs` chỉ gieo Nhân sự — không sửa. Bẫy 95 ở `docs/CHANGE-GUIDE.md`. Thêm (bề mặt, đảo ngược được): mã `doi_tac_chua_co_vai_tro` vào `LOI_409_KHONG_CU` để khung lỗi không kèm nút «Tải lại đơn» (tải lại không gán được vai trò; khớp tiêu chí của tập đó) — bài đỏ trước ở `src/shared/order-errors.test.ts`.*
- [x] **Step 5:** không chạy bộ e2e ở đây — chạy một lần ở Task 7. Commit «ADR-0185 Task 5: bộ thử toàn luồng gieo Đối tác có vai trò». *Đã làm 8/11: `node --check` mọi tệp e2e đã sửa; bài quét tĩnh có đọc `tests/e2e/` (10 tệp, 247 bài) xanh; typecheck 0 lỗi.*

### Task 6: Tài liệu, sổ hàng rào, đề xuất luật

**Files:**
- Modify: `docs/SYSTEM-DESIGN.md` (bảng trigger, bảng migration, luồng Gửi đơn/Còn vé, đường tạo tài khoản), `docs/CHANGE-GUIDE.md` (bẫy: gieo Đối tác phải có vai; `seedStaff` kiểu cũ; tài khoản kiểu cũ trong e2e), `docs/SO-HANG-RAO.md` (H1–H4: chặn gì, cơ chế, bài, ngày thấy chặn thật ở Task 1–4; dòng H3 ghi rõ trigger chỉ canh INSERT như LC-1, LC-1b — UPDATE gõ tay đổi mã sang PARTNER hay mở lại dòng đã đóng là việc của `R-LC-1c`), `docs/data-dictionary.json` + `npm run dict` nếu từ điển có mục trigger
- Create: `docs/superpowers/specs/2026-11-08-de-xuat-src-claude-md-adr-0185.md` — diff ĐỀ XUẤT dòng thứ ba «chỉ siết» cho `src/CLAUDE.md` (cổng ADR-0185 xét kết quả người hưởng của `pricing`, không đọc bảng vai), chủ duyệt mới sửa (N9)
- Không đụng `docs/BANG-THAM-CHIEU.md`: câu báo dùng tên nút đã có (Gửi đơn, Sửa, Lưu thay đổi, Rút lại, Còn vé, Quản lý tài khoản); không thêm nút, nhãn mới.

- [ ] **Step 1:** viết; `npm run dict` nếu có đổi từ điển. Commit «ADR-0185 Task 6: tài liệu và sổ hàng rào».

### Task 7: Kiểm cuối + người kiểm độc lập

- [ ] **Step 1:** `npm test` (một lần; bài đo giờ tự chạy một mình cuối) → xanh. `npm run typecheck` → 0 lỗi.
- [ ] **Step 2:** `node --test tests/audit/doi-tac.test.mjs tests/audit/redteam.test.mjs tests/audit/query-plan.test.mjs` (ngoài `npm test`) → danh sách bài đỏ Y HỆT bản gốc: đo 8/11, bản gốc (`git archive HEAD`) đỏ sẵn 15/36 bài (tạo tài khoản bằng Quản trị bị ADR-0071 chặn, đơn nháp riêng ADR-0135…), nhánh này đỏ đúng 15 bài đó. Không sửa ở đây (ngoài phạm vi); ghi vào báo cáo là nợ có sẵn.
- [ ] **Step 3:** `npm run test:e2e` (chạy nền, cần mạng) → mọi kịch bản xanh, `audit-invariants` cuối mỗi máy ĐẠT (tiêu chí 9).
- [ ] **Step 4: Kịch bản Chrome** (một lần): `a2-smoke-form.mjs`, `doi-tac-lap-don-smoke.mjs` (thêm bước: tài khoản kiểu cũ thấy dải vàng trên form), màn Quản lý tài khoản — `vai-smoke.mjs` hoặc kịch bản mới: khối «Quyền cũ» không có ô Đối tác, Tài xế đối tác; đổi tên tài khoản kiểu cũ không gửi PUT quyền (Review Focus 3). `dot-a-smoke` đỏ sẵn ở bước «nhat-ky» trước nhánh này: ghi, không sửa ở đây.
- [ ] **Step 5:** gọi agent `nguoi-kiem-doc-lap` (chỉ đọc) cho cả nhánh: đối chiếu tiêu chí 1–10, chạy lại bài H1–H4, đọc thứ tự cổng ở ba đường, soát mọi chỗ chèn `stf_permission`. Chỉ báo ĐẠT khi người kiểm ĐẠT.
- [ ] **Step 6:** báo cáo chủ (bốn mục): nhắc `npm run day-len` nhánh ADR trước nhánh này; Đ3 mục 1 (chủ soát tài khoản) phải xong trước khi phát hành bản có `R-LC-1c`; hạn `HC-5.11` 16/11.

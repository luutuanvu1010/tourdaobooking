# Đặc tả — Gộp hồ sơ cá nhân trùng + danh sách nghi trùng + chặn tạo trùng khi thêm tài khoản

- **Trạng thái:** bản nháp, chờ chủ dự án duyệt **cùng** ADR-0068 (cùng thư mục). Chưa duyệt thì không lập kế hoạch thi công.
- **Ngày:** 2026-09-30. **Mốc mã:** `main` = `5f6fcbc2` (bản 1.44). **Nhánh:** `worktree-gop-ho-so`.
- **Quyết định gốc:** ADR-0068 (nháp) — đặc tả này không thêm quyết định mới; chỗ nào đặc tả chi tiết hoá thì ghi "chi tiết" và vẫn nằm trong khung ADR.
- **Xây trên lỗ đang hở:** không có (`docs/quyen-hoan.json` `phat_hien` = `[]`).

## 1. Vì sao (lời thường)

Danh bạ có người bị tạo thành hai hồ sơ (ví dụ chủ thấy 30/9: "Nguyễn Phú Hải" ×2; "Nguyễn Tiền Phương" một hồ sơ có SĐT + Lái cano, một hồ sơ có tài khoản Điều hành chung không SĐT). Chưa có cách gộp. Để lâu, đơn và lịch sử của một người bị chia hai nơi. Việc gồm ba phần:

- **P1 — Gộp** hai hồ sơ cá nhân (thủ công, có xem trước, không tách lại).
- **P2 — Màn "Hồ sơ nghi trùng"** để Quản trị rà.
- **P3 — Chặn tạo trùng** khi Thêm tài khoản (giao diện + máy chủ).

Ngoài phạm vi: gộp tổ chức (đại lý, nhà xe, công ty); nút "Không phải trùng"; nút tách lại; chặn trùng ở luồng lập đơn (đã có cảnh báo trùng SĐT) và ở đồng bộ nhân viên từ Sheet; báo cáo gom lịch sử theo người.

## 2. Tiêu chí nghiệm thu (hành vi kiểm được — viết trước khi làm, P20)

Ký hiệu: A = hồ sơ phụ, B = hồ sơ chính. "409" = máy chủ từ chối kèm câu tiếng Việt có dấu, **không đổi dữ liệu nào** (kiểm bằng đếm dòng trước/sau).

**P1 — Gộp**
- G1. Quản trị gộp A (khách, có SĐT X chính, vai "Lái cano" ở Bến A) vào B (không SĐT, có tài khoản Điều hành chung): sau gộp, B có SĐT X (liên hệ chính) và vai "Lái cano" ở Bến A mở từ hôm nay; A `active = 0`, `merged_into_id = B`; liên hệ và vai của A đã đóng hôm nay; quyền tài khoản của B **không đổi** (so `stf_permission` trước/sau).
- G2. `GET /api/parties/lookup?phone=X` sau gộp chỉ trả B.
- G3. Danh sách Danh bạ và ô chọn khách trên đơn không còn A; `GET /api/parties/:A` trả hồ sơ A kèm `mergedInto: { id: B, displayName }`; `GET /api/parties/:B` kèm `mergedFrom: [{ id: A, displayName, mergedAt }]`.
- G4. Trùng thì không nhân đôi: B đã có SĐT X mở → sau gộp B vẫn đúng một dòng X mở; B đã có vai "Lái cano" ở Bến A mở → không mở dòng thứ hai. B có vai "Lái cano" ở Bến A **đã kết thúc hôm nay** → không mở lại, lô không bị trigger chồng lấn chặn, xem trước ghi lý do.
- G5. Liên hệ chính: B đã có SĐT chính Y, A có SĐT chính X → X sang B **không** phải chính, Y giữ chính.
- G6. Quan hệ: A "Người liên hệ của" công ty C → sau gộp B "Người liên hệ của" C mở, của A đóng. Quan hệ giữa A và B → chỉ đóng, không sinh B↔B.
- G7. Đơn: đơn `draft` và `confirmed` có `delivered_at IS NULL` của A → người đặt thành B và `updated_at` đổi (người đang mở đơn đó lưu lại → bị khoá lạc quan báo đơn đã đổi, không ghi đè người đặt); đơn đã giao (`delivered_at` ≠ NULL) và đơn `cancelled` của A → giữ A. Trang đơn đã giao vẫn hiện tên A như cũ.
- G8. Giấy tờ: A có bằng lái hiện hành, B không có → A's dòng bị huỷ (lý do cố định), B có dòng mới cùng nội dung (số, hạng, ngày cấp, nơi cấp, hạn). B đã có bằng lái hiện hành → giấy tờ A giữ nguyên. **Ca chuỗi gia hạn:** A có CCCD đã gia hạn một lần (hai dòng cùng số, dòng mới trỏ `previous_id` dòng cũ), B không có CCCD → cả hai dòng của A bị huỷ (mới trước, cũ sau), B có một dòng mang nội dung dòng mới; lô không bị `person_document_cccd_other_person` chặn. Không số giấy tờ nào xuất hiện trong nhật ký / phản hồi xem trước / câu lỗi (thêm ca vào `src/giay-to-khong-lo-so.test.ts`).
- G9. Nhật ký: đúng **hai** dòng `party_merged` (target A và target B), `detail` chỉ có tên hai hồ sơ + số dòng chuyển theo loại; không SĐT/email/số giấy tờ.
- G10. Xem trước (kể cả số dòng công nợ còn mở của A — giữ ở A) (`POST …/merge/preview`, không ghi gì): trả danh sách "sẽ chuyển / sẽ giữ ở hồ sơ phụ / sẽ bỏ vì trùng" theo loại (liên hệ hiện nguyên giá trị — người xem giữ `admin.manage`, vốn thấy liên hệ trong Danh bạ; giấy tờ chỉ hiện loại + hạng, **không** số), số đơn đổi người đặt, số đơn giữ; và lý do chặn nếu có.
- G11. Từ chối 409 khi: A = B; một bên là tổ chức; một bên đã gộp hoặc `active = 0`; A gắn tài khoản; cả hai gắn tài khoản; A còn vai tài khoản mở; kết quả vi phạm LC-3; A đang là người phụ trách đơn chưa xong hoặc đang ở chuyến chưa chốt; một bên là công ty chủ.
- G12. Quyền: Bán hàng / Kế toán / HDV / Đối tác / Thực tập / Tài xế → 403. Quản trị gộp vào B gắn tài khoản của **Quản trị khác** hoặc Toàn quyền → 403; Toàn quyền → được.
- G13. Hai yêu cầu gộp A cùng lúc (bấm đúp hoặc hai người): đúng một lần thành công; lần kia 409 `merge_lost_race`; không dòng nào bị chuyển hai lần (đếm liên hệ/vai mở của B). Cách thử: bài đơn vị dựng hai lô từ **cùng** một kế hoạch đã tính rồi chạy lần lượt trên D1 thử (lô thứ hai phải không đổi gì); e2e gửi hai yêu cầu bằng `Promise.all`.
- G14. CSDL chặn (trigger, thử bằng SQL trực tiếp trong test): đổi / xoá `merged_into_id` đã đặt; trỏ chính mình; trỏ hồ sơ đã gộp (chuỗi); đặt `merged_into_id` mà `active` còn 1; mở lại (`active` 1) hồ sơ đã gộp.
- G15. `audit-invariants` có kiểm mới: không chuỗi gộp; hồ sơ đã gộp không còn liên hệ / vai / quan hệ mở và không gắn tài khoản. Thấy kiểm mới **chặn thật một lần** (gieo dữ liệu sai → đỏ → hoàn nguyên, P16) và ghi dòng vào `docs/SO-HANG-RAO.md`.
- G16. Các route ghi khác của `parties` từ chối hồ sơ đã gộp (409 `party_merged`): sửa tên, thêm liên hệ, thêm công việc, thêm quan hệ, giấy tờ; `POST /api/staff` với `partyId` = A → 409.

**P2 — Hồ sơ nghi trùng**
- T1. `GET /api/parties/duplicates` (`admin.manage`; khác → 403) trả các cặp hồ sơ cá nhân đang mở, mỗi cặp kèm lý do: `PHONE` (cùng SĐT liên hệ mở, chuẩn hoá), `NAME` (cùng tên chuẩn hoá: thường hoá chữ, bỏ khoảng trắng đầu/cuối, gộp khoảng trắng giữa; giữ dấu), `LOGIN_PHONE` (SĐT đăng nhập tài khoản của hồ sơ này = SĐT liên hệ mở của hồ sơ kia). Một cặp chỉ xuất hiện một lần dù khớp nhiều lý do (gộp lý do). Hồ sơ đã gộp / đã ngưng không vào danh sách.
- T2. Mỗi dòng trên màn có nút "Gộp…" mở hộp gộp với hai hồ sơ điền sẵn; nếu một bên có tài khoản thì bên đó điền sẵn làm hồ sơ chính.
- T3. Danh sách có số đếm ở đầu; rỗng thì ghi "Không thấy hồ sơ nghi trùng."

**P3 — Chặn tạo trùng khi Thêm tài khoản**
- C1. Gõ SĐT hoặc tên ở "Thêm tài khoản": nếu có hồ sơ cá nhân đang mở khớp SĐT liên hệ hoặc khớp tên chuẩn hoá, hiện **tất cả** (tên, lý do khớp, vai hiện có), mỗi hồ sơ một nút "Dùng hồ sơ này" (tắt nếu hồ sơ đã có tài khoản, ghi lý do), và ô tick "Vẫn tạo hồ sơ mới (người khác trùng tên/số)". Nút Tạo tắt cho tới khi chọn một trong hai.
- C2. Máy chủ: `POST /api/staff` không có `partyId`, có hồ sơ khớp, không có `taoHoSoMoi: true` → 409 `party_match_exists` kèm `[{ id, displayName, lyDo }]` (không SĐT của hồ sơ khác). Có cờ → tạo như cũ. Không có hồ sơ khớp → tạo như cũ, không cần cờ.
- C3. Nhập tài khoản hàng loạt từ Sheet: **không đổi** hành vi trong lần này (ghi vào `docs/BACKLOG.md`).

## 3. Dữ liệu

- Migration mới (số do phiên điều phối chung cấp lúc thi công; `main` đang tới `0050_tro_ly`, nhánh chưa gộp đã dùng tới `0053`): cột `pty_party.merged_into_id TEXT REFERENCES pty_party(id)`, `pty_party.merged_at TEXT`; trigger G14; `CHECK ((merged_into_id IS NULL) = (merged_at IS NULL))` qua trigger (SQLite không thêm CHECK bằng `ALTER`). Không đổi bảng của module khác.
- `docs/data-dictionary.json` + `npm run dict` cho hai cột mới.
- Không xoá cứng. Không sửa migration đã áp.

## 4. API (chi tiết)

| Route | Cổng | Việc |
|---|---|---|
| `POST /api/parties/:A/merge/preview` body `{ intoPartyId: B }` | `admin.manage` + cấp bậc | tính kế hoạch gộp, không ghi |
| `POST /api/parties/:A/merge` body `{ intoPartyId: B, xacNhan: "<tên A>" }` | `admin.manage` + cấp bậc | tính lại kế hoạch (không tin xem trước), chạy một `db.batch()` |
| `GET /api/parties/duplicates` | `admin.manage` | P2 |
| `GET /api/parties/:id` | như cũ | thêm `mergedInto` / `mergedFrom` |
| `POST /api/staff` | như cũ | thêm luật C2 |

- `xacNhan` phải đúng tên hiện tại của A (so sau chuẩn hoá như T1) — chống bấm nhầm.
- Mã lỗi (chữ hiển thị tiếng Việt): `merge_same`, `merge_not_person`, `merge_inactive`, `merge_source_has_account`, `merge_both_accounts`, `merge_source_account_role`, `merge_role_group_conflict`, `merge_source_busy`, `merge_owner_company`, `merge_confirm_mismatch`, `merge_lost_race`, `party_merged`, `party_match_exists`.

## 5. Giao diện

- **Chi tiết hồ sơ (Danh bạ)**, người giữ `admin.manage`: nút "Gộp vào hồ sơ khác…" (chỉ hồ sơ cá nhân đang mở, không gắn tài khoản). Hộp gộp: ô tìm hồ sơ chính (tên/SĐT, dùng `/api/parties?q=`), bảng xem trước ba cột "Chuyển sang hồ sơ chính / Giữ ở hồ sơ này / Bỏ vì đã có", ô gõ lại tên hồ sơ này, nút "Gộp" màu nguy hiểm. Lý do chặn hiện ngay trên bảng xem trước, nút Gộp tắt.
- Hồ sơ đã gộp (mở bằng đường dẫn cũ): dải báo "Đã gộp vào <B> ngày <d>" + liên kết; mọi nút sửa ẩn.
- Hồ sơ chính: mục "Hồ sơ đã gộp vào đây" (tên + ngày + liên kết).
- **Màn "Hồ sơ nghi trùng"**: nút/tab trong trang Danh bạ, chỉ người giữ `admin.manage` thấy (không thêm trang mới vào `PAGES` nếu đặt trong `/parties`).
- **Thêm tài khoản**: khối C1 thay cho nút gợi ý một hồ sơ hiện nay.
- Luật chung: dựng bằng `h()`, không `innerHTML`, giá trị CSS qua token, ô gõ 16px; chạy lại kịch bản Chrome của Danh bạ và Quản lý tài khoản; ảnh bằng chứng vào `docs/evidence/`.

## 6. Ranh giới module (chi tiết Đ6)

- `parties`: sinh câu chưa chạy cho liên hệ / vai / quan hệ / giấy tờ / cột gộp + hàm tính kế hoạch (thuần, có test) + route preview/merge/duplicates/lookup.
- `orders`: hàm công bố trả câu `UPDATE orders SET booker_party_id = B WHERE booker_party_id = A AND <chưa giao, chưa huỷ>` và hàm đếm (đọc) — `parties` **không** được import `orders` (`ALLOWED_EDGES`: parties → locations, audit).
- `staff`: "hồ sơ có tài khoản không", "người gọi quản được tài khoản đó không" (đã có luật cấp bậc).
- Điều phối / vận chuyển: "A đang bận" do **gốc lắp ráp tiêm** hàm đọc của module chủ (`parties` không đọc `dsp_*`/`vc_*`; hiện chỉ có `v_dsp_order_handler`, `v_dsp_first_handler`, không có `v_vc_*`). Câu bảo vệ trong lô nếu module chủ công bố được; không thì ghi khe thời gian được chấp nhận.
- `staff`: SĐT đăng nhập cho lý do `LOGIN_PHONE` (P2) — hàm công bố của `staff`, tiêm ở gốc lắp ráp.
- `accounts`: kiểm C2 đặt ở route `POST /api/staff`, **không** trong `createAccountWithRolesStatements` (dùng chung với đồng bộ Sheet — C3).
- **Nơi ghép lô:** kế hoạch thi công chọn gốc lắp ráp (tiêm hàm vào ctx của route `parties`, như `ctx.isAssigned`) — **không thêm cạnh phụ thuộc**. Nếu kế hoạch thấy bắt buộc phải thêm cạnh → dừng, trình chủ tệp đề xuất luật (Điều 9.4).

## 7. Kiểm thử

- Hàm tính kế hoạch gộp (thuần): mỗi tiêu chí G4–G8, G11 một ca, viết đỏ trước.
- Trigger G14 + bất biến G15: `src/migrations-*.test.ts` kiểu hiện có.
- API: kịch bản `tests/e2e` mới `gop-ho-so` (G1–G3, G7, G9, G12, G13, T1, C2) — cần mạng như e2e khác; chạy `audit-invariants` cuối.
- Bài có sẵn phải xanh: `route-write-guard`, `permission-enforcement`, `architecture.test.ts`, `giay-to-khong-lo-so.test.ts` (thêm ca), `claude-guard`.
- Chrome: hộp gộp, màn nghi trùng, khối C1 (điện thoại hẹp 390px + máy tính).
- **Kiểm độc lập** (việc lớn — dữ liệu, quyền): subagent chỉ-đọc sau thi công, trước khi báo đạt.

## 8. Thước đo trước khi làm — chỉ đọc, CHỦ DỰ ÁN TỰ CHẠY

AI không được chạy lệnh đọc D1 thật (`CLAUDE.md` §8). Hai lệnh đếm dưới đây chỉ đọc; chạy ở thư mục `tourdao-sales` (mỗi lệnh một dòng `--command`, xem bài học OAuth với `--file`):

```sh
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT COUNT(*) AS so_so_trung_sdt FROM (SELECT value_normalized FROM pty_contact_point cp JOIN pty_party p ON p.id = cp.party_id WHERE cp.contact_kind_code = 'PHONE' AND cp.valid_to_date IS NULL AND p.active = 1 AND p.party_kind = 'PERSON' GROUP BY value_normalized HAVING COUNT(DISTINCT cp.party_id) > 1)"
```

```sh
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT COUNT(*) AS so_ten_trung FROM (SELECT lower(trim(display_name)) FROM pty_party WHERE active = 1 AND party_kind = 'PERSON' GROUP BY lower(trim(display_name)) HAVING COUNT(*) > 1)"
```

(Lưu ý: `lower()` của SQLite chỉ thường hoá chữ không dấu — con số tên trùng là cận dưới; màn P2 chuẩn hoá đúng ở máy chủ.)

## 9. Trang ghép (bắt buộc — `CLAUDE.md` §9, lượt duyệt 2 quyết định)

**(1) Bảng `pty_party` chứa những loại thực thể nào (sau ADR-0068):** hồ sơ cá nhân không tài khoản (khách, HDV/tài xế chưa có tài khoản); hồ sơ cá nhân gắn tài khoản (nhân viên, đối tác, tài xế — ADR-0013); hồ sơ tổ chức (đại lý, nhà xe, công ty khách); hồ sơ công ty chủ (một, ADR-0024); **mới:** hồ sơ cá nhân **đã gộp** (`active = 0`, `merged_into_id` ≠ NULL) — chỉ còn là đích của tham chiếu lịch sử.

**(2) Dòng bản đồ quyền chạm bảng này áp cho loại nào:**

| Ô | Không TK | Gắn TK | Tổ chức | Công ty chủ | Đã gộp |
|---|---|---|---|---|---|
| `party.view` | xem | xem | xem | xem | xem (chỉ đọc, có dải "đã gộp") |
| `party.write` | sửa | 403 (ADR-0013) | sửa | 403 | **409 `party_merged`** (mới) |
| `party.staff.write` + cấp bậc | — | sửa | — | 403 | 409 |
| `admin.manage` (vai/quan hệ) | có | có + cấp bậc (ADR-0019) | có | 403 | 409 |
| `admin.manage` (**gộp**, mới) | làm A hoặc B | chỉ làm B, + cấp bậc | **không** (ngoài phạm vi) | **không** | không |
| `company.legal.write` | — | — | đổi công ty chủ | có | — |
| `party.document.*` | có | có | — | — | xem; ghi 409 |

**(3) Cổng nào canh cửa nào:** route gộp → `can(admin.manage)` + luật cấp bậc (staff) + kiểm Đ2 ở hàm kế hoạch; CSDL → trigger G14 + trigger sẵn có (LC-3, chồng lấn vai/quan hệ, giấy tờ, `orders_delivered_lock`); sau triển khai → `audit-invariants` (G15). Route ghi khác của `parties` → kiểm "đã gộp" (G16). `POST /api/staff` → C2 + kiểm hồ sơ còn mở.

## 10. Giả định và điều chưa chắc

- **Giả định (bề mặt):** tên nút / chữ trên màn như §5; màn nghi trùng đặt trong trang Danh bạ; so tên giữ dấu (bỏ dấu sẽ gom nhầm nhiều hơn — đổi được sau).
- **Chưa chắc — kế hoạch phải xác minh bằng đọc mã:** (a) hàm đọc "A đang bận" của `dispatch` / `van-chuyen` đã có chưa, có câu bảo vệ dùng được trong lô không; (b) liên hệ EMAIL — cùng luật như SĐT.
- **Đã xác minh (người kiểm độc lập 30/9):** trạng thái đơn là `draft|confirmed|cancelled` (0003), "đã giao" là `delivered_at` ≠ NULL; không trigger nào chặn đổi người đặt của đơn `cancelled` — giữ A là chính sách; `orders_money_update` chỉ chặn khi tiền trên đơn đang lệch.
- **Rủi ro:** gộp nhầm không tách lại được (chủ chấp nhận). Giảm bằng: xem trước bắt buộc, gõ lại tên, chỉ Quản trị/Toàn quyền.

## 11. Việc tiếp theo

1. Chủ duyệt ADR-0068 + đặc tả này (một lượt).
2. Chủ (tuỳ) chạy hai lệnh §8 để biết quy mô.
3. Chép ADR vào `docs/adr/`, thêm mục lục; xin số migration ở phiên điều phối chung.
4. Lập kế hoạch thi công (`docs/superpowers/plans/`), rồi thi công theo task (đỏ → xanh), kiểm độc lập, `npm run day-len` + `npm run trien-khai` do chủ chạy.

# Nhật ký thi công — Gộp hồ sơ cá nhân trùng (ADR-0068)

Kế hoạch: `docs/superpowers/plans/2026-09-30-gop-ho-so-thi-cong.md`. Nhánh: `worktree-gop-ho-so`. Cách thi công: subagent-driven (chủ chọn "làm từng phần").

## Lời duyệt

- 2026-09-30: chủ chọn "1, làm chức năng gộp hồ sơ"; hộp hỏi gom: "Gộp tay + danh sách gợi ý", "Không có nút hoàn tác", "Quản trị + Toàn quyền", "Làm luôn, phần nhỏ"; đồng ý thiết kế trình trong trò chuyện ("đồng ý, viết đặc tả và ADR đi").
- 2026-09-30: sau khi AI trình ADR + đặc tả, chủ trả lời "lập đi" → AI lập kế hoạch (AI KHÔNG tự ghi "accepted" từ câu này — máy phân loại chặn, đúng).
- **2026-10-01, hộp hỏi gom (nguyên văn lựa chọn):**
  - "Bạn duyệt bản quyết định gộp hồ sơ (ADR-0068) chưa, và thi công theo cách nào?" → **"Duyệt, làm từng phần (Recommended)"**.

## Trả lời Q1–Q5 (2026-10-01)

- Q2 "Hồ sơ phụ là nhà xe cá nhân đang đứng tên xe thì sao?" → **"Từ chối gộp (Recommended)"**.
- Q5 "Hồ sơ phụ có công việc/quan hệ bắt đầu từ ngày trong tương lai thì sao?" → **"Từ chối gộp (Recommended)"**.
- Q1 + Q3 + Q4 "Đồng ý 3 điểm kỹ thuật nhỏ theo khuyến nghị không? (số migration tạm 0054; thêm 2 hàm đọc nội bộ cho vận chuyển + công nợ; thêm 1 đường đọc để ô Thêm tài khoản hiện hồ sơ khớp ngay khi gõ)" → **"Đồng ý cả ba (Recommended)"**.

## Ruling / nợ

- Task 0 do điều phối làm trực tiếp (chỉ tài liệu; ghi `docs/adr/**` bật hộp hỏi quyền của chủ — trợ lý phụ sẽ kẹt ở hộp hỏi).
- Ruling: migration số tạm **0055_gop_ho_so.sql** theo luật 1.46 của `docs/adr/README.md` (không giữ chỗ; số lớn nhất main + 1 = 0055; nhánh gộp sau đổi tên — `0055_nhom_dich_vu` của nhánh thi-cong-luot-1 cũng đang dùng 0055, ai gộp sau đổi) — nếu sai: đổi tên tệp, test tìm theo đuôi.

## Task 9 — giao diện (2026-10-01)

- Làm: hộp gộp (xem trước ba cột, gõ lại tên, nút Gộp tắt khi có lý do chặn), dải "Đã gộp vào …" + ẩn mọi nút sửa trên hồ sơ đã gộp, mục "Hồ sơ đã gộp vào đây", màn "Hồ sơ nghi trùng", khối C1 ở Thêm tài khoản (tra khi gõ, 300 ms; bắt 409 `party_match_exists`).
- Lệch khỏi brief (có chủ đích): Q4 = đồng ý → GIỮ tra-khi-gõ; F14 → ô tích dùng lớp `o-tick` (CSS token ở cuối `public/app.css`) thay chuỗi style; F18 → submit giữ `showError(errorEl, null)` + `fail(err)`; chống kết quả cũ đè mới (bộ đếm lần tra/xem trước); gộp thất bại → xem trước lại (vì `act()` mở lại nút); màn nghi trùng là DANH SÁCH, không bảng (`.table-wrap` ẩn dưới 900px → ở 390 sẽ không thấy cặp nào); kịch bản thêm `dem.xong()`.
- `src/shared/so-do-trang.ts` sinh lại (`node scripts/sinh-so-do-trang.mjs`) — bài sơ đồ trang đỏ vì nút mới.
- Kịch bản Chrome (D1 tạm, axe-core 4.13.0 tải về `.superpowers/axe/`): `gop-ho-so-smoke.mjs` 5/5 ✓ (kèm axe); `vai-smoke.mjs` OK (đã sửa: helper `guiThem` tick "Vẫn tạo hồ sơ mới" khi có khối; C2 bấm "Dùng hồ sơ này" trong `#add-khop`); `t2b-danh-ba-smoke.mjs` OK; `giay-to-nguoi-smoke.mjs` OK (7); `nha-xe-danh-ba-smoke.mjs` OK (5); `va3-smoke.mjs` OK; `passkey-smoke.mjs` OK; `dot-a-smoke.mjs` 8 ✓ rồi đỏ ở "nhat-ky: thẻ đã dựng xong" — ĐỎ SẴN đã ghi ở `web/CLAUDE.md` (ADR-0038), các bước nhân viên + hồ sơ đều ✓.
- Nợ nhỏ: hồ sơ đã gộp vẫn hiện câu giấy tờ "Tài khoản cấp trên: chỉ xem" (lý do sai, dải "Đã gộp vào" đã nói đúng). Kịch bản Task 8 Step 7 (cuoc-smoke, dp-lib, nhap-ke-toan-smoke, doi-tac-lap-don-smoke, danh-muc-lap-don-smoke) CHƯA chạy lại ở Task 9.

## Task 10 — bất biến R-PTY-MERGE-1..5 + quan sát chặn thật (2026-10-01)
- Đỏ đầu tiên: `node --test src/audit-invariants.test.ts` → bài danh sách kiểm đỏ ở deepEqual (chưa có kiểm R-PTY-MERGE nào). Xanh sau khi thêm 5 kiểm: pass 90.
- R-PTY-MERGE-4 thêm vế "đang đứng tên xe" (`vc_vehicle.status <> 'retired'`) cùng luật `viecXeCuaNguoi`; chú thích "sửa một nơi thì sửa nơi kia" ở cả hai nơi.
- D1 local TRƯỚC khi gieo: `R-N1-5` đã vi phạm (không có quản trị viên đang hoạt động trên D1 local — có sẵn, không do việc này).
- Lần in 1 (đã gieo hồ sơ gộp + `pty_person` + liên hệ mở): `✗ R-PTY-MERGE-2 … — 1 vi phạm`, thoát 1 (kèm `R-N1-3` 2 vi phạm do hồ sơ gieo có display_name lệch họ-tên: lỗi của dữ liệu gieo, không phải hàng rào).
- Lần in 2 (đã đóng liên hệ): `✓ R-PTY-MERGE-2`; còn `R-N1-3` (gieo) và `R-N1-5` (có sẵn). Sau đó khôi phục tệp sqlite local từ bản sao trước gieo → chỉ còn `R-N1-5`, 0 hồ sơ `pty-thu-gop*`.
- Bước 6: `if (false)` ở đường vai của `POST /api/staff` → `tao-trung.test.ts` đỏ `expected: 409 / actual: 201` (pass 3, fail 3) → hoàn nguyên → pass 6.

## Vòng sửa cuối + gộp main 1.49 (2026-10-01)

- Sau kiểm độc lập: thêm bài cấp bậc bên thứ ba (403, đỏ khi bỏ cổng), bài vế `from_party_id` của câu lật (Sửa 2), nhánh catch của lô chỉ trả `merge_lost_race` khi A vừa gộp vào ĐÚNG hồ sơ chính (khác → `merge_inactive`); ghi các lần quan sát chặn thật vào `docs/SO-HANG-RAO.md`.
- Gộp `main` 35448ab3 (bản 1.49). Migration đổi tên `0055_gop_ho_so.sql` → **`0056_gop_ho_so.sql`** (`0055_nhom_dich_vu` của main đã lên production; không thấy `0056` ở nhánh nào lúc gộp). Nhật ký phiên bản: mục của nhánh nay là **1.51** (nhánh `phat-hanh-1-50` đã nhận 1.50 — ai gộp sau đánh lại số). Số route: 196 (main) + 4 của nhánh = **200**. Backlog: mục của nhánh đánh lại 10–14 (main đã có mục 9).

## Đề xuất sửa luật — chờ chủ duyệt (N9: AI không tự sửa)

Thêm một dòng vào bảng Chrome của `web/CLAUDE.md`:

```markdown
| Gộp hồ sơ, hồ sơ nghi trùng, khối hồ sơ khớp khi Thêm tài khoản (ADR-0068): hộp gộp / dải "đã gộp" / màn nghi trùng của `web/parties.ts`, `#merge` / `#dups` / `#dup-btn` của `public/parties.html`, khối `#add-khop` của `web/staff.ts`, `src/shared/ho-so-trung.ts` | `gop-ho-so-smoke.mjs` ở `docs/evidence/2026-09-30-gop-ho-so/kich-ban/` (5 bước, 1040 + 390) + `t2b-danh-ba-smoke.mjs` + `vai-smoke.mjs` |
```


## Sổ điều phối thi công (chép từ sổ tạm .superpowers/, 2026-10-01)

- Ruling: rà trước kế hoạch giao cho subagent (kế hoạch 3.566 dòng) thay vì điều phối tự đọc — giữ ngữ cảnh điều phối — nếu sai: sót mâu thuẫn, lưới là rà từng task.
- Task 0: complete (commits 5a9f56e..a1ae701, điều phối làm trực tiếp — chỉ tài liệu, cần hộp hỏi quyền docs/adr)
- Ruling: migration số tạm 0055_gop_ho_so.sql (luật 1.46: không giữ chỗ; main tới 0054) — kế hoạch viết 0054 ở mọi chỗ; mọi task dùng 0055 — nếu sai: đổi tên tệp.
- Ruling F1: đã gộp main (a15aa83), migration 0055_gop_ho_so.sql, không dòng giữ chỗ; mỗi task tự tính lại số route / số bản changelog / số công thức CHANGE-GUIDE / vị trí R-PTY theo main hiện tại — nếu sai: test đếm route đỏ, sửa số.
- Ruling F2 (Task 4): mã huỷ chuyến dùng 'HUY_KHAC', bỏ dòng xoá trigger vc_trip_status_transition (không tồn tại) — nếu sai: test van-chuyen lỗi khoá ngoại, đọc vc_reason.
- Ruling F3 (Task 5 Step 7): quan sát hàng rào phải gieo liên hệ PHỤ để đỏ vì lính gác, không vì chỉ mục liên hệ chính — nếu sai: quan sát giả (P16).
- Ruling F4 (Task 10 Step 5): gieo hồ sơ cá nhân kèm pty_person, hoàn nguyên sạch D1 local — nếu sai: D1 local bẩn.
- Ruling F5 (Task 11): e2e gọi ensureFakeCatalog() như kịch bản khác.
- Ruling F6 (Task 6 G16): bài POST /api/staff {partyId: A} phải khẳng định mã lỗi party_merged (không chỉ 409).
- Ruling F7 (G13): khẳng định merge_lost_race đúng đặc tả; nếu lô thua chỉ trả được merge_inactive thì đặc tả thắng — ánh xạ về merge_lost_race.
- Ruling F8–F22 (thấp): chuyển vào dispatch của task sở hữu (xem preflight.md); đặc tả: cập nhật trạng thái "đã duyệt" + 4 mã lỗi mới ở Task 11 (tài liệu).
- Task 1: complete (commits a15aa83..cd06855, review clean)
- Task 1: minor (deferred): repository.ts:300 sửa hồ sơ đã gộp gửi active=1 → trigger no_reopen ABORT thô — MANG VÀO Task 6 (G16 chặn 409 party_merged trước).
- Task 1: minor (deferred): bài (d) thiếu ca đích không tồn tại.
- Task 1: minor (deferred): trigger không cấm B bị ngưng sau khi gộp — đọc gom theo merged_into_id phải chịu được đích đã ngưng.
- Ruling (Task 2, plan-mandated Important): bỏ qua khoá rỗng (tên/SĐT chuẩn hoá rỗng) khi ghép cặp — đặc tả T1 chỉ nói cặp cùng tên/SĐT thật; CSDL đã CHECK độ dài nhưng luật thuần tự bảo vệ — nếu sai: không mất gì (chỉ bớt cặp giả).
- Task 2: complete (commits cd06855..aea4a86, review clean after 1 round)
- Task 2: minor (deferred): thứ tự NFC trước lowercase (rủi ro thấp); khoá a|b tách bằng split (id UUID vô hại).
- Task 3: complete (commits aea4a86..61e3901, review clean)
- Ruling (Task 3 minor 1 → Task 5): liên hệ A bắt đầu sau hôm nay cũng tính vào merge_source_future_row (mở rộng quyết định Q5 của chủ cho cùng loại 'dòng tương lai'; tránh 500 do CHECK valid_to>=valid_from) — sửa trong gop.ts + 1 test ở Task 5 — nếu sai: chủ muốn chuyển nguyên liên hệ tương lai, sửa lại dễ.
- Task 3: minor → Task 5: dựng current giấy tờ = chưa huỷ && không có dòng gia hạn chưa huỷ; ghi chú ở kiểu GiayToGop.
- Task 3: minor (deferred): liên hệ chính A trùng liên hệ thường B → B không có liên hệ chính (hành vi đã biết); G11 test dùng includes + thiếu ca đối xứng.
- Ruling (Task 4 concern 1): LECH_TIEN không đọc cột cọc cũ (NT-R9 cấm; không nới hàng rào) — đơn lệch chỉ ở cột cũ không báo trước, trigger 0007 vẫn huỷ trọn lô → Task 6 phải ánh xạ lỗi money_invariant của lô thành 409 merge_order_invalid (không 500) — nếu sai: người gộp thấy câu chung không nêu mã đơn.
- Ruling (Task 4 minor 2, load-bearing): 'đang đứng tên xe' = xe status <> 'retired' (0033: retired ⇔ valid_to_date NOT NULL) — chủ chọn chữ 'đang'; Task 10 R-PTY-MERGE-4 chép SQL này phải dùng cùng điều kiện — nếu sai: người từng có xe đã thanh lý bị chặn gộp.
- Ruling (Task 4 minor 1): thiếu bài CREW là ruling F12 chưa làm → vào fix round.
- Task 4: complete (commits 61e3901..b25861a, review clean after 1 round)
- Task 4: minor (deferred): router gopHoSo thiếu hàm tiêm → TypeError 500 trong khung thử cố ý (R9 chấp nhận).
- Ruling (Task 5 concern): KHÔNG nới hàng rào ADR-0002 8(b) (cần chủ duyệt, Điều 9.4). Giữ cách VALUES (SELECT ?2 WHERE guard): lô thua có giấy tờ → huỷ trọn lô (nguyên tử). Task 6: mọi lỗi lô → đọc lại A; A đã gộp → 409 merge_lost_race; lỗi money_invariant → 409 merge_order_invalid; khác → 500 — nếu sai: người thua đua thấy 500 thay vì 409 (dữ liệu vẫn nguyên).
- Ruling (Task 5 review): vá Important 1 (chép giấy tờ phải gắn với việc dòng nguồn vừa bị chính lô huỷ) + Minor 2 (câu lật: merged_into_id = (SELECT B WHERE guard AND NOT EXISTS dòng mở của A) → NULL kèm merged_at → trigger merge_target ABORT cả lô) + Minor 3 (chép giấy tờ: NOT EXISTS giấy tờ hiện hành cùng loại của B) — mọi khe kiểm–ghi thành huỷ trọn lô — nếu sai: lô hiếm khi bị huỷ oan, người gộp thử lại.
- Task 5: minor (deferred): LIST/LOOKUP tự nối bảng thay vì p.merged_into_id IS NULL (phong cách).
- Task 5: minor → Task 6: docsForMerge/GopDocRow mang document_number → thêm ca vào src/giay-to-khong-lo-so.test.ts; lý do huỷ giấy tờ ghi ở detail nhật ký; ô chọn khách trên đơn (Đ7) kiểm lại.
- Ruling (hợp đồng lỗi cho Task 6, cập nhật): lat.changes=0 → 409 merge_lost_race; lô ném lỗi → đọc lại A: đã gộp → 409 merge_lost_race; lỗi money_invariant → 409 merge_order_invalid; còn lại → 409 merge_stale ('dữ liệu vừa đổi, hãy xem trước lại') — không 500 — nếu sai: lỗi thật khác bị gắn nhãn 'xem trước lại'.
- Task 5: complete (commits b25861a..8eb7ca5, review clean after 1 round)
- Task 5: minor (deferred): quan hệ phía A là from_party chưa có test ở Sửa 2; P16 từng điều kiện chép giấy tờ chưa quan sát bằng gỡ thật → Task 12 người kiểm độc lập làm.
- Ruling (Task 6 review): sửa Important 1 (câu merge_order_invalid nhánh lô nêu mã đơn — ADR Đ1 bước 5 thắng mã) + Minor 1 (console.error tên ràng buộc, không giá trị) + Minor 2 (merge_lost_race chỉ khi A đã gộp vào đúng intoPartyId; còn lại merge_inactive). Minor 3 (thứ tự 409 trước 403 đầu kia quan hệ) để nguyên — chỉ lộ cho người giữ admin.manage.
- Task 6: complete (commits 8eb7ca5..53976b9, review clean after 1 round)
- Task 6: minor (deferred): 409 party_merged trước 403 ở đầu kia quan hệ (:1035); regex tenRangBuoc có thể bắt từ có gạch dưới.
- Task 7: complete (commits 53976b9..ce6efa1, review clean)
- Task 7: minor (deferred): soDangNhap tính cả tài khoản ngưng; cặp bị bỏ im lặng nếu hồ sơ biến mất giữa truy vấn; chưa test conNua=true.
- Task 8: complete (commits ce6efa1..796c9d3, review clean; người rà tự quan sát đỏ khi gỡ C2 — bù P16)
- Task 8: minor (deferred): điều kiện !existingPartyId đường vai chưa có test bảo vệ; personsForMatch đọc mọi hồ sơ mỗi lần gọi (Task 9 debounce); LOOKUP LIMIT 20.
- Ruling (Task 9 review): sửa Important 1 (đích cũ còn khi ô tìm đổi → reset dich/chan/bảng; bảng xem trước ghi rõ tên hồ sơ chính) + Minor 2, 4, 5 (rẻ). Minor 3 (hai hồ sơ cùng tên không vai trông giống nhau ở C1) → ghi backlog ở Task 11. Minor 6 (8px vs 6px) để nguyên.
- Task 9: complete (commits 796c9d3..b8e0819, review clean after 1 round)
- Task 9: minor (deferred): handler input không tăng lanTim (vô hại, dich vẫn null); moNghiTrung ném lỗi sau gộp thì bỏ openDetail; hai hồ sơ cùng tên không vai giống nhau ở C1 → backlog.
- Task 10: complete (commits b8e0819..0bca576, review clean)
- Task 10: minor (deferred): chưa có bài khoá ca 'B ngưng dùng sau gộp → 0 vi phạm'; local D1 vốn vi phạm R-N1-5 (không có admin) từ trước.
- Task 11: complete (commits 0bca576..2deac58)
- Task 11: minor (deferred): e2e chưa khẳng định vai BOAT_CAPTAIN chuyển sang B (có ở bài đơn vị).
- Task 12: kiểm độc lập toàn nhánh — ĐẠT CÓ ĐIỀU KIỆN (npm test 2215/2215, typecheck/build 0, e2e gop-ho-so+parties 3/3; P16: 6 điều kiện thấy đỏ thật, 2 không đỏ).
- Ruling (final): MỘT lần sửa: (1) gộp main 1.49, migration → 0056_gop_ho_so.sql (main có 0055_nhom_dich_vu đã lên production), bản → 1.51 (phat-hanh-1-50 đã nhận 1.50; ai gộp sau đánh lại), đếm lại route, giải 7 xung đột; (2) bài cấp bậc bên thứ ba 403; (3) bài vế from_party_id ở Sửa 2; (4) catch index.ts:860 chỉ lost_race khi đích khớp; (5) ghi 6 lần chặn thật vào SO-HANG-RAO 2026-10-01; rồi npm test + typecheck + e2e đủ bộ + kiểm độc lập ngắn commit gộp — nếu sai số bản/migration: người gộp sau đổi tên.
- Final fix wave: 1a/1b/1c/1d done (d6cad824, b3a63073, 2baf07e5, ffb183cc); merge main 1.49 → migration 0056_gop_ho_so.sql, changelog 1.51, 200 route, backlog 10–14.
- Final fix: commits 2deac58..908e372 (1a d6cad82, 1b b3a6307, 1c 2baf07e, 1d ffb183c, merge main 1.49 908e372; migration 0056; bản 1.51; route 200). npm test 2264/2264, typecheck 0, build ok, e2e đủ bộ 36/36 (lần 2; lần 1 catalog+thongbao hỏng do chạy song song, mỗi bài chạy riêng xanh), audit --strict đạt.
- Task 12: minor (deferred): nhánh lat.changes=0 vẫn trả merge_lost_race kể cả khi A vừa gộp vào hồ sơ KHÁC (chỉ sai chữ, dữ liệu nguyên) — Ruling: để nợ.
- Ghi chú cho chủ: ADR-0068 (accepted) + docs/adr/README.md bị sửa chỉ số migration 0055→0056 cho khớp mã.

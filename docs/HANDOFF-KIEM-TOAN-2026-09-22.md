# Bàn giao: kiểm toán kiến trúc 2026-09-22 → phiên kiểm lại (trước khi chốt kế hoạch)

> Viết 2026-09-22, cuối phiên đã làm kiểm toán **và** soạn đặc tả. Chủ dự án muốn **một phiên khác kiểm lại một lần nữa** rồi mới chốt kế hoạch thi công.
> Lý do cần phiên khác: phiên này vừa kiểm vừa soạn đặc tả sửa theo kết quả của chính mình, nên không được tự nghiệm thu (P15, N8).

## 1. Trạng thái (kiểm lại bằng lệnh, đừng tin tệp này)

- **Nhánh:** `kiem-toan-kien-truc`, tách từ `origin/main` @ `f8d18a3`. **Chưa push** (CLAUDE.md §8: chỉ chủ push).
- **Worktree:** `.claude/worktrees/kiem-toan-kien-truc`. Nằm cạnh worktree `.claude/worktrees/doi-chieu-oracle-tca`, worktree đó đang ở nhánh `canh-bao-don-trung` với đặc tả "cảnh báo đơn trùng" chờ chủ.
- **Commit trên nhánh** (`git log --oneline origin/main..kiem-toan-kien-truc`):
  - `4681ded`: báo cáo kiểm toán + bộ thử phá.
  - `fc5f0f0`: thêm ca Góp ý, sửa số đếm.
  - `e18924e`: 4 tài liệu + ADR-0013 (proposed) + công cụ tách bản xuất.
  - Commit của chính tệp này.
- **Không có thay đổi mã ứng dụng** (`src/`, `web/`, `migrations/` giống hệt `origin/main`). Thêm mới: `tests/audit/` (ngoài `npm test`), `scripts/tach-ban-xuat-d1.mjs`, tài liệu.
- **Production:** không bị chạm. Không có lệnh `--remote` nào được chạy.

## 2. Các tệp cần kiểm

| Tệp | Nội dung | Trạng thái |
|---|---|---|
| `docs/AUDIT-2026-09-22-KIEN-TRUC.md` | Báo cáo 22 mục: không P0; P1 = F-01 hồ sơ nhân viên, F-02 gửi trùng, F-03 lưới tiền, F-04 khôi phục | xong |
| `tests/audit/` (`harness.mjs`, `redteam.test.mjs`, `query-plan.test.mjs`, `README.md`) | Nạp cả ứng dụng lên SQLite thật; 17 ca thử phá + kế hoạch truy vấn | 18/18 |
| `docs/superpowers/specs/2026-09-22-chong-gui-trung.md` | Việc 1: `orders.client_request_id` + chỉ mục duy nhất `(staff_id, client_request_id)` | chờ chủ |
| `docs/superpowers/specs/2026-09-22-khoa-tien-don-da-xac-nhan.md` | Việc 2: bước A kiểm `R-ORD-1..3`; bước B 4 trigger đóng băng tiền | chờ chủ |
| `docs/superpowers/specs/2026-09-22-ho-so-nhan-vien-chi-quan-tri-sua.md` + `docs/adr/ADR-0013-…` | Việc 3: `party.staff.write`, tiêm `ctx.partyHasAccount`, `staff.active` là nguồn | ADR **proposed**, chờ chủ |
| `docs/superpowers/specs/2026-09-22-dien-tap-khoi-phuc.md` + `scripts/tach-ban-xuat-d1.mjs` | Diễn tập khôi phục (chủ chạy) + sao lưu hằng tuần | chờ chủ |

## 3. Việc của phiên kiểm lại (vai: người kiểm độc lập, CHỈ ĐỌC; không sửa, chỉ báo cáo)

Mục tiêu: trả lời "có chốt kế hoạch thi công theo 4 tài liệu này được không, và cần sửa gì trước".

1. **Chạy lại bằng chứng** (từ gốc worktree):
   - `npm test` (kỳ vọng 443/443)
   - `npm run typecheck` (thoát 0)
   - `node --test "tests/audit/*.test.mjs"` (kỳ vọng 18/18)
2. **Thử phá chính các kết luận của kiểm toán:**
   - Có lỗ nào lớn hơn bị bỏ sót không? Các module chỉ đọc mã, chưa thử bằng HTTP: `catalog`, `locations`, `maintenance`, `company`, `audit`.
   - Có mục nào bị xếp sai mức không? Đặc biệt kiểm lại kết luận "không có P0".
3. **Kiểm từng đặc tả so với mã thật:**
   - Luồng mô tả có đúng với mã không? Tiêu chí nghiệm thu có kiểm được không?
   - Có đụng quyết định đã duyệt (ADR-0001..0012, `docs/ARCHITECTURE.md`) mà không nói ra không?
4. **Các điểm người soạn thấy yếu nhất, cần soi kỹ:**
   - **Việc 1:** bắt lỗi UNIQUE theo chuỗi thông báo `orders.staff_id, orders.client_request_id` (chưa chạy thật). Giả định cả batch, kể cả `booker.before`, bị huỷ khi đụng chỉ mục (đúng với SQLite; e2e trên `wrangler dev` phải xác nhận). Thứ tự "tra mã trước khi so trùng" với đặc tả `canh-bao-don-trung`.
   - **Việc 2:** mới chạy thử sơ bộ trên D1 giả (SQLite), chưa chạy e2e. `R-ORD-1..3` **chưa chạy trên production**; đơn cũ trước 0008 có thể lệch.
   - **Việc 3:** chọn "tiêm hàm" thay vì cạnh `parties → staff` (vòng). Chỗ đặt câu `setPartyActiveStatement` trong chuỗi `changes() > 0` của `patchStaffStatements` là chỗ dễ sai nhất. §3 mục 8 còn để ngỏ: cạnh `accounts → parties` hay bọc trong `staff`.
   - **Diễn tập:**
     - Phát hiện "bản xuất nguyên khối không nạp lại được" mới thử trên D1 **local** (wrangler 4.135), chưa thử bản xuất `--remote`.
     - Công cụ tách dựa trên giả định mỗi câu trigger kết thúc bằng dòng `END;` và câu khác kết thúc bằng `;` cuối dòng. Nếu gặp dữ liệu nhiều dòng trong tệp **schema** thì sai; tệp dữ liệu không đi qua công cụ.
     - `d1 export` không nhận `--persist-to`.
5. **Kết quả giao lại:**
   - Báo cáo có nhãn FACT, INFERENCE hoặc RISK, kèm tệp:dòng.
   - Mỗi đặc tả kết luận ĐẠT / SỬA TRƯỚC KHI CHỐT / LOẠI.
   - Câu trả lời cho chủ theo CLAUDE.md §4.

**Không làm trong phiên kiểm lại:** sửa mã; sửa ADR hay đặc tả (chỉ ghi đề xuất); chạy bất cứ lệnh `--remote` nào; push.

## 4. Câu hỏi đang chờ chủ dự án (chưa có câu trả lời)

1. Duyệt ADR-0013?
2. Nhân viên tự sửa hồ sơ của mình? (khuyến nghị: không)
3. N3 sửa tiền sau xác nhận: dòng điều chỉnh chỉ-thêm (khuyến nghị) hay sửa đè?
4. Hiện có cần ghi tiền cọc sau khi xác nhận đơn không, và đang làm thế nào?
5. Chống gửi trùng làm trước "cảnh báo đơn trùng"? (khuyến nghị: trước)
6. Áp chống gửi trùng cho nút tạo hồ sơ? (khuyến nghị: chưa)
7. Ghi luật "thu tiền bắt buộc có mã chống gửi trùng" vào `docs/ARCHITECTURE.md` ngay? (khuyến nghị: ngay)
8. Mục tiêu sao lưu (mất tối đa 1 tuần, dựng lại trong 1 giờ), cách nhắc lịch, nơi cất tệp?
9. Chủ tự chạy các lệnh chỉ-đọc trên production: `R-ORD-*`, `R-N1-15`, diễn tập khôi phục?

Còn treo ở nhánh khác: 3 câu của đặc tả `canh-bao-don-trung` §6.

## 5. Sau khi phiên kiểm lại xong (thứ tự đề xuất)

1. Chủ trả lời §4, chạy diễn tập khôi phục (không phụ thuộc gì, làm được ngay), dán kết quả để ghi vào `docs/HANDOFF-N1.md`.
2. Sửa đặc tả theo báo cáo kiểm lại, **ở một phiên riêng** (vai soạn).
3. Lập kế hoạch thi công ở `docs/superpowers/plans/` cho từng việc. Mỗi việc lấy số migration lúc thi công: `ls migrations`, cộng liệt kê migration của mọi nhánh chưa gộp; `0019` đang giữ cho B5.
4. Thi công từng việc (đỏ → xanh), mỗi việc có người kiểm độc lập (CLAUDE.md §3).

## 6. Lời nhắn mở đầu gợi ý cho phiên sau

> Đọc `docs/HANDOFF-KIEM-TOAN-2026-09-22.md` trên nhánh `kiem-toan-kien-truc` (worktree `.claude/worktrees/kiem-toan-kien-truc`). Đóng vai người kiểm độc lập, chỉ đọc: làm đúng §3, không sửa tệp nào, rồi báo cáo cho tôi.

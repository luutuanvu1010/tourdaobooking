# Phân tích góp ý người dùng → kế hoạch thi công (2026-09-30)

> Tài liệu **mô tả / nháp**, không chuẩn tắc. Một mục ở đây không phải lời duyệt.
> Riêng tư: nội dung góp ý là chữ tự do, có thể chứa tên/SĐT khách. Ở đây chỉ gọi theo mã `YC-xxxx` và **diễn giải**, không chép nguyên văn.

## 0. Trạng thái

- Dữ liệu góp ý (bảng `fbk_ticket`, `fbk_message`) chỉ có trên D1 production. AI không được đọc D1 remote (CLAUDE.md §8, hàng rào `d1-remote-write` chặn mọi `d1 execute` không kèm `--local`). Chrome và Gmail chưa kết nối được trong phiên này.
- Chủ đã chạy lệnh ở mục 5 (30/9): **12 phiếu** (YC-0001…0012), 17 dòng. Đối chiếu với mã bản 1.38 (`main` 75f01d0a) do một trợ lý chỉ đọc làm, tệp:dòng dưới đây theo báo cáo đó (chưa chạy thử giao diện).
- Trạng thái phiếu trên app KHÔNG đổi (đổi = ghi production; chủ/Quản trị tự trả lời người gửi).

## 1. "Hoàn tất đơn hàng": đã thiết kế + đã duyệt, CHƯA thi công

- Giao diện hiện **không có** nút "Đã giao" / "Hoàn thành" (đo 30/9: `grep` trong `web/*.ts` rỗng).
- Luật đã duyệt 29/9: ADR-0024 điều 1–5, **ADR-0025** (hai bước), ADR-0026 (sổ công nợ).
  - **"Đã giao – đã thu đủ"** (ô `order.handover`): HDV đang phụ trách, Quản trị, Toàn quyền; từ ngày đi; chỉ khi đã thu = phải thu. Khoá mọi sửa/huỷ đơn.
  - **"Hoàn thành"** (ô `order.complete`): Kế toán, Toàn quyền; khi không còn ai nợ công ty vì đơn.
  - **Bán hàng (`SALES`) không có nút nào trong hai bước.** Nếu chủ muốn nhân viên bán hàng tự bấm thì đó là quyết định quyền mới → ADR mới (không sửa ADR-0025 đã duyệt).
- Kế hoạch thi công: `docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md` (13 task, đã kiểm độc lập, 4 câu Q1–Q4 chủ đã trả lời 30/9).
- Điều kiện bắt đầu (Task 0) nay **đã thoả**: ADR-0049 lượt 1 đã lên `main` (bản 1.38, migration tới `0043`); ADR-0057 (nợ gắn chuyến, điều kiện của Task 3) đã duyệt 30/9. Số migration dự kiến `0044`, `0045` (kiểm lại lúc bắt đầu).
- 30/9: không có worktree/nhánh nào đang thi công sổ tiền (`git worktree list`, `git branch -a`).
- **Chủ chọn A (chat 30/9):** thi công đúng ADR-0025 như đã duyệt; Bán hàng không có nút. Không soạn ADR mới.
- Việc cho phiên thi công (đã ghi ở bộ nhớ, chưa vào kế hoạch): mở rộng định dạng sổ vàng trước khi thêm ca lượt 1 (Task 5).

## 2. Phân loại góp ý (điền khi có dữ liệu)

Mỗi `YC-xxxx` vào đúng **một** nhóm:

| Nhóm | Nghĩa | Việc tiếp |
|---|---|---|
| (a) Đã có chỗ | Trùng ADR / kế hoạch / sổ tồn đọng | Trỏ tới chỗ đó, không thêm việc |
| (b) Việc nhỏ | Chữ, CSS, lỗi hiển thị (công thức `docs/CHANGE-GUIDE.md`) | Gom một nhánh, làm gọn |
| (c) Cần đặc tả/ADR | Chạm dữ liệu, quyền, tiền, luồng | Chủ quyết |
| (d) Câu hỏi / đã xử lý / từ chối | Trả lời hoặc đóng | Không thi công |

| Mã | Người dùng muốn (diễn giải) | Hiện trạng mã 1.38 | Nhóm | Đưa vào đâu |
|---|---|---|---|---|
| YC-0001, YC-0002 | Form tạo đơn: ngày → dịch vụ → thanh toán → khách; "đặt cọc" đổi thành "thanh toán trước"; mặc định Chuyển khoản; khách mặc định "là tôi"; ẩn dịch vụ nhập tay | Đã có: ngày trước dịch vụ, chữ "Thanh toán trước", ẩn nhập tay (ADR-0021). Chưa: Thanh toán vẫn SAU khách (`public/order-form.html:24,35`); mặc định Tiền mặt (`order-form.html:39`); khách chỉ có nút "Sử dụng thông tin của tôi" (`web/order-form.ts:494`); chữ "Đã cọc" sót ở `web/viec-cua-toi.ts:508` | (b) + (c) | Phần Thanh toán: **gộp vào sổ tiền Task 10** (Task 10 viết lại phần này, bỏ ô cọc). Chữ sót: đợt việc nhỏ G1. "Khách mặc định là tôi": câu C5 |
| YC-0003 | Lọc sản phẩm khi lập đơn, nhớ bộ lọc trên máy | Chưa có: chỉ ô gõ tìm (`web/catalog-picker.ts:31`), không lưu trên máy | (b) | G1 — cần ảnh phác trước (màn nhìn thấy, bài học Đợt D) |
| YC-0004 | Dưới giờ đón hiện biển số xe đón | Chưa có; ADR-0049 chốt xe chỉ văn phòng + tài xế thấy (`permissions.ts:136`); từng là phương án Q1(c) ở `2026-09-28-de-xuat-adr-van-chuyen-1b.md:487`, không được chọn | (c) | Câu C1 → nếu mở: ADR mới (quyền) |
| YC-0005 | Tài xế bấm "Đã đón khách" | **Đã có** ở 1.38 (ADR-0049, `web/cuoc-chuyen.ts`, ô `trip.progress`) — nhưng Bảng điều phối chưa dùng cho chuyến thật | (a) | Trả lời người gửi; đóng khi dùng thật |
| YC-0006 | (1) Một đơn nhiều dịch vụ; (2) Quản lý/Kế toán sửa số lượng thực tế đơn đã xác nhận | (1) **Đã có** (`MAX_SERVICES`). (2) Có một phần: ô `order.money.edit` ghi Kế toán/Quản trị = mọi đơn nhưng route duy nhất (`dispatch/index.ts:229`) chỉ cho HDV phụ trách + Toàn quyền; thêm/bớt dịch vụ sau xác nhận chưa có route | (a) + (c) | (2): câu C2 — chạm tiền, dính khoá "Đã giao" của ADR-0025 |
| YC-0007 | Trang chủ thêm chuyến đón ngày mai, ngày kia | Chưa có: chỉ "hôm nay" (`web/home.ts:86`); bài `orders/dashboard.test.ts:185` đang ghim "ngày mai không vào" | (b) | G1 (cùng phạm vi người xem như mục hôm nay) |
| YC-0008, YC-0012 | Danh sách đơn lọc theo ngày | Chưa có: API chỉ nhận `q/status/limit/offset` (`orders/index.ts:476`) | (b) | G1 (lọc theo ngày đi — giả định bề mặt, ghi lại) |
| YC-0009 | "hello" | Phiếu thử, đã xong | (d) | — |
| YC-0010 | Luồng xe: xếp xe, tài xế nhận cuốc, đổi xe, đã đón, hoàn thành; "không đón"; "Đã xuất vé" (đặt qua đối tác) | Xếp/đón/kết thúc **đã có** 1.38; nhờ xe khác, tài xế đối tác nhận/từ chối = ADR-0052/0053 (duyệt, chưa làm); "không đón" = ô Đưa đón `NONE` của ADR-0054 (duyệt, chưa làm); "Đã xuất vé": không có ở đâu | (a) + (c) | Phần xe: lượt Vận chuyển 2–4 đã duyệt. "Đã xuất vé": câu C3 |
| YC-0011 | Kế toán bấm "đơn đã nhập phần mềm kế toán" + ô số hoá đơn | Chưa có mã; ADR-0004 đã duyệt "yêu cầu xuất hoá đơn… kế toán ghi số hoá đơn"; ô `invoice.issue` có nhưng chưa route; cờ "đã nhập phần mềm" chưa có ở đâu | (c) | Câu C4 — thuộc `billing`, làm SAU sổ tiền lượt 1 |

## 3. Danh sách đối chiếu (để xếp nhóm a)

- Sổ tồn đọng `docs/BACKLOG.md` mục 1–7 (đính kèm tệp thông báo; báo Quản trị mọi đơn; chuông khi HDV từ chối; Quản trị với giấy tờ cấp trên; ghi chú chuyến; gửi lại khi mất mạng; việc nhỏ điều phối lượt 1).
- Sổ tiền lượt 1 (mục 1 ở trên).
- ADR đã duyệt chưa thi công: ADR-0052 (điều phối lượt 2), 0053 (tài xế đối tác), 0054 (chiều về theo dịch vụ), 0055, 0056 (kernel lượt 2–3), 0057 (tiền xe thuê).

## 4. Đề xuất thứ tự thi công

Không phiếu nào là lỗi chặn người dùng (YC-0001 ghi "Báo lỗi" nhưng thực chất là đề xuất thứ tự form).

1. **Sổ tiền lượt 1 = "Hoàn tất đơn"** (ADR-0024/0025/0026, kế hoạch `2026-09-29-so-tien-luot-1-ke-hoach.md`) — phiên thi công riêng, bắt đầu ngay. **Bổ sung vào Task 10** (giao diện) theo YC-0001/0002: phần Thanh toán đứng TRƯỚC Thông tin khách; hình thức thu mặc định Chuyển khoản. Đây là thay đổi bề mặt, người thi công ghi vào sổ thi công.
2. **Đợt việc nhỏ G1** — một nhánh riêng, **chạy song song** với sổ tiền vì không đụng phần Thanh toán:
   - G1a lọc danh sách đơn theo ngày đi (API thêm `from`/`to` + ô chọn ngày; e2e) — YC-0008/0012.
   - G1b Trang chủ: thêm "ngày mai", "ngày kia" cùng phạm vi người xem như mục hôm nay; lật bài `dashboard.test.ts:185` — YC-0007.
   - G1c chữ "Đã cọc" sót ở `web/viec-cua-toi.ts:508` → "Thanh toán trước" (nếu sổ tiền chưa bỏ ô này).
   - G1d Lọc sản phẩm + nhớ trên máy — YC-0003; đưa chủ ảnh phác trước khi dựng.
   - Rủi ro đụng nhau: G1b và sổ tiền Task 7 cùng sửa `getDashboard` (sổ tiền dời ô "Còn thiếu tiền") → ai gộp sau thì gộp lại, không viết đè.
3. **Vận chuyển lượt 2–4** (ADR-0052/0053/0054 đã duyệt) theo phiên điều phối Vận chuyển — trả lời phần xe của YC-0010.
4. **Các câu C1–C5** (mục 6) — chủ quyết; cái nào mở thì đặc tả/ADR mới, tối đa 3 quyết định chạm quyền/dữ liệu mỗi lượt duyệt.

## 5. Lệnh chỉ-đọc để chủ lấy góp ý

Chạy trong **Terminal riêng** (hàng rào của AI chặn lệnh này), đứng ở thư mục `tourdao-sales`:

```
CI=1 npx wrangler d1 execute tourdao-sales-db --remote --json --command "SELECT t.seq, t.kind_code, t.status_code, t.title, t.created_at, t.resolved_in, m.internal, m.created_at AS msg_at, m.body FROM fbk_ticket t LEFT JOIN fbk_message m ON m.ticket_id = t.id ORDER BY t.seq, m.created_at" > /Users/tuanbao/.claude/jobs/96ce0902/tmp/gop-y.json
```

Lệnh chỉ `SELECT`, không ghi gì. Ghi chú nội bộ (`internal = 1`) giữ lại để biết Quản trị đã quyết gì.

## 6. Câu chờ chủ quyết (chạm quyền/tiền/dữ liệu — AI không tự quyết)

- **C1 (YC-0004)** Nhân viên bán hàng/HDV có được thấy biển số xe (và tên tài xế?) đón khách của đơn mình không? Hiện chỉ văn phòng + tài xế thấy (ADR-0049). Mở = ADR mới về quyền.
- **C2 (YC-0006)** Quản trị/Kế toán sửa số lượng thực tế của đơn đã xác nhận: làm route "sửa tiền mọi đơn" như ô quyền đã ghi? Chỉ trước "Đã giao" (ADR-0025 khoá sau đó)? Có thêm/bớt dịch vụ không? Gợi ý: làm sau sổ tiền lượt 1, để mọi điều chỉnh đi qua sổ.
- **C3 (YC-0010)** "Đã xuất vé": trạng thái cho từng dịch vụ đặt qua đối tác? Ai bấm, có ghi mã đặt chỗ không?
- **C4 (YC-0011)** Cờ "đã nhập phần mềm kế toán" + số hoá đơn: gộp vào "yêu cầu xuất hoá đơn" của ADR-0004 hay là cờ riêng cho Kế toán? Gợi ý: làm trong `billing` sau sổ tiền lượt 1.
- **C5 (YC-0002)** Thông tin khách mặc định "là tôi" (nhân viên lập đơn): dễ ghi nhầm khách thật thành nhân viên. Gợi ý: giữ nút "Sử dụng thông tin của tôi", không điền sẵn.

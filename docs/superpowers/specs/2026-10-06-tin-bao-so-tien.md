# Đặc tả ngắn: ba loại tin báo mới cho sổ tiền (mở rộng ADR-0034)

> Bắt nguồn từ ba câu hỏi chủ đồng ý 2026-10-06, sau khi nhánh năm lỗi tiền báo cáo.

**Xây trên lỗ đang hở:** TNV-G1, TNV-G3, TNV-G4, TNV-VP01 (sổ dừng dây chuyền `docs/quyen-hoan.json`, mức HIGH, hạn 2026-10-31 — tất cả đang **hở**, chưa đóng). Mã của ba việc dưới đây hiện chỉ có trên nhánh năm lỗi tiền (`worktree-agent-a705a660a33db03ca`), **chưa gộp vào `main`**. Đặc tả này viết tiếp phần AI đó dừng lại (Task 11 của G1, và hai mục "DỪNG (chờ chủ)" của G3/G4), không giả định nhánh đó đã vào main.

**ADR cần sửa hay chỉ bổ sung:** dòng trạng thái ADR-0034 (bổ sung 2026-10-03) đã ghi đích danh **ba trong bốn** loại tin: "Thay lần thu" (mục 1 dưới đây), "điều chỉnh đổi số dư của bạn" (mục 2), và "tin cho bên bị phân định trách nhiệm" (ADR-0088 đ9 bước 3) — loại này **do đặc tả riêng của đ9 làm chủ** (`2026-10-06-phan-dinh-trach-nhiem-d9.md`), không lặp lại ở đây. Loại thứ tư — "Đã duyệt hoàn cọc" cho Kế toán (mục 3) — **không** có mặt ở dòng trạng thái ADR-0034, chỉ xuất hiện ở bảng "Thay câu nào" của ADR-0089. Ba mục 1, 2, 3 dưới đây đều **không cần ADR mới** cho phần "có làm hay không" (đã được chủ duyệt từ trước); nhưng mục 1–3 đều có một điểm kỹ thuật chưa có cách làm sẵn (xem phần "vướng đã kiểm"), và mục 3 có thêm một điểm về cách chọn người nhận (chưa chắc #1).

**Nguyên lý chung (không đổi so với ADR-0034 đ1):** tin không có bảng riêng, không "bắn" vào lúc ghi sổ. Tin là **hình chiếu đọc lại** từ dòng `audit_log` đã ghi cùng lô với nghiệp vụ, hiện ra ngay khi người nhận mở hộp thông báo — không có lô riêng, không có khái niệm "bắn trễ".

**Không có luật giấu số tiền sẵn để áp.** Đã kiểm lại: ADR-0034 đ3 chỉ giấu **tên người làm** (theo `order.history.view`); ADR-0089 chỉ giấu **tên người giữ tiền** (theo `ledger.view` phạm vi `any`). Không ADR nào giấu **số tiền**. Vì vậy câu "ẩn tiền theo quyền" trong đề bài không có luật cũ để kế thừa — ba mục dưới đây tự đứng được vì lý do khác: mục 1, 2 báo đúng số dư/khoản của **chính người nhận** (giống cách "Sổ của tôi" luôn cho chủ sổ xem số của mình); mục 3 báo cho người đang có quyền `ledger.write` phạm vi `any`, quyền đó tự nhiên đã cho xem số tiền ở nơi khác trên Nền tảng — **chưa kiểm** có cần thêm cổng riêng cho dòng tin hay dùng lại đúng cổng đó.

## 1. "Thay lần thu": báo người thu cũ và người thu mới (ADR-0088 đ2)

- **Ai nhận:** người thu cũ, người thu mới của (các) lần thu bị thay — hai **hồ sơ cụ thể**, không phải một nhóm quyền.
- **Vướng đã kiểm (chưa có cách làm sẵn):** cơ chế "ai thấy tin về đơn" hiện có (ADR-0034 đ3) tra theo **thuộc tính hiện hành của đơn** (người lập, người phụ trách hiện tại) — đọc qua view `v_ord_order_owner`/`v_dsp_first_handler`, không đọc nội dung của riêng dòng nhật ký. "Người thu cũ/mới" **không phải** thuộc tính bền của đơn (một đơn có thể đổi người thu nhiều lần), nên cách tra này không áp thẳng được. Đọc mã trên nhánh năm lỗi tiền: nhật ký `ledger_receipt_replaced` ghi `detail` là một **câu chữ** dựng cho người đọc ("thay N lần thu … · đổi người thu · lý do"), **không phải** trường có cấu trúc chứa id; dòng này cũng chưa gán `target_type`/`target_id`. Tức là hôm nay **không có chỗ nào** để đọc lại đúng hai id người thu một cách máy tính được.
- **Hai hướng khả thi** (việc chọn hướng là quyết định kiến trúc, không tự quyết — xem chưa chắc #2). Đã kiểm `src/architecture.test.ts`: view công bố chỉ bị ép đúng tên/đúng cột theo sổ dữ liệu, **không** có hàng rào máy kiểm view của module nào chỉ được đọc bảng của module đó — nhưng đó vẫn là đúng tinh thần Hiến chương 5.3 ("chỉ module chủ ghi bảng của mình"; view công bố là module **chủ** chiếu ra, không phải module khác tự ý nối sang bảng riêng của người ta):
  - **(a′, khuyến nghị)** Khi `billing` ghi nhật ký (`auditStatement`), gán thêm id người thu cũ/mới ngay trên dòng đó (`target_type`/`target_id`, hoặc một dòng nhật ký cho mỗi người liên quan — đúng khuôn `v_aud_account_event` của ADR-0090 đ3). `audit` chỉ cần một view mới chiếu lại đúng các cột đó, không đọc bảng `bil_*`. **Không đổi đồ thị module**, chỉ đổi cách `billing` ghi nhật ký của chính nó — rủi ro thấp, làm nhanh.
  - **(b)** Mở cạnh mới `thongbao → billing`, để `billing` tự xuất bản một view `v_bil_*` (người thu hiện hành của từng đơn), đúng khuôn `orders` đã xuất bản `v_ord_order_owner` cho `thongbao` đọc trực tiếp. Tái dùng được cho các nhu cầu khác sau này, nhưng phải sửa ADR-0002/0008 (đồ thị module) — nặng hơn, nên chỉ chọn nếu chủ thấy việc này sẽ dùng lại nhiều.
  - Cả hai đều cần **một migration** (thêm/sửa view — SQLite không `ALTER VIEW`).

## 2. "Điều chỉnh đổi số dư của bạn" (ADR-0092 đ5d)

- **Ai nhận:** bên bị đổi số dư của khoản điều chỉnh.
- **Cùng vướng như mục 1:** nhật ký `ledger_adjustment` trên nhánh năm lỗi tiền cũng chỉ ghi `detail` dạng câu chữ ("số dư trước → sau"), không có cột id cấu trúc, chưa gán `target_id`. Áp đúng hai hướng (a′)/(b) ở mục 1.
- **Nội dung:** đây là số dư của chính người nhận — hiện số tiền là hợp lý, cùng kiểu "Sổ của tôi" đã làm.

## 3. "Đã duyệt hoàn cọc" cho Kế toán (G1 Task 11; đã có ở ADR-0089 "Thay câu nào")

- **Khác hai mục trên:** đây **không phải** quan hệ với đơn (Kế toán không phải người lập/phụ trách). Đây là tin theo **quyền hiện có** — tiền lệ duy nhất là ADR-0090 đ3 ("Quản trị ngưng tài khoản Kế toán" báo Toàn quyền), cũng dùng khuôn "thêm một view công bố mới trong module `audit`, không bảng mới, cần một migration". Task 11 dừng đúng ở việc thiếu luật người-nhận-theo-quyền dùng chung.
- **Đơn giản hơn mục 1, 2:** không cần biết "bên cụ thể" của dòng nhật ký — chỉ cần biết hành động xảy ra trên đơn nào, rồi lọc người xem theo quyền `ledger.write` phạm vi `any` **tại lúc đọc** (không ghi cứng danh sách). Theo đúng khuôn ADR-0090 đ3: **cần một migration** thêm action này vào (hoặc một view mới cạnh) view công bố của module `audit`; không cần bảng mới, không cần đọc `detail`.
- **Giả định (ghi lại, không hỏi lại):** đã kiểm mã, `coc.ts` ghi **hai** action cùng cổng quyền "duyệt hoàn cọc" (X-1, ADR-0089): `deposit_refund_approved` (hoàn) và `deposit_transfer_approved` (chuyển sang đơn mới). Cả hai đều dẫn tới việc Kế toán phải đi chi/chuyển tiếp theo, nên tin này phủ **cả hai** action, không chỉ riêng hoàn.

## Chưa chắc — cần chủ xác nhận trước khi chuyển sang kế hoạch

1. **Mục 3: tập quyền chính xác là ai**, và có cần ghi thành luật chung "tin theo quyền" ở Hiến chương/ADR-0034 không (đây là lần thứ hai dùng kiểu này, sau ADR-0090 đ3), hay cứ làm riêng từng lần theo tiền lệ. Cụ thể: chỉ tài khoản có `ledger.write` phạm vi `any` (người sẽ đi chi), hay cộng cả tài khoản có quyền "duyệt hoàn cọc" (người đã duyệt, muốn biết Kế toán đã chi chưa)?
2. **Mục 1, 2: chọn hướng (a′) hay (b)** ở trên để lấy lại đúng id người thu cũ/mới và bên bị điều chỉnh. AI khuyến nghị (a′). Đây đụng dữ liệu (migration) và có thể đụng ranh giới module — cần chủ chọn trước khi lập kế hoạch, không tự quyết.
3. **Mục 1:** khi lệnh Thay nhận N lần thu cũ → M lần thu mới mà có nhiều người thu khác nhau trong một lô, tin có gửi cho **từng** người thu cũ/mới trong lô, hay chỉ người có thay đổi thật (loại người thu không đổi)? Đề xuất: chỉ người có thay đổi thật, để tránh tin rác.

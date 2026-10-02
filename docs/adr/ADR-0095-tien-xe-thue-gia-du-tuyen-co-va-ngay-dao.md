# ADR-0095: Tiền xe thuê — giá đủ tuyến + cỡ xe, ngày dòng đảo, phí huỷ cho nhà xe cũ (sửa ADR-0057)

- **Trạng thái:** **accepted** — chủ dự án trả lời trong chat 2026-10-02 (tối), khi soát 19 ca sổ vàng chi phí xe thuê và tệp câu hỏi `docs/superpowers/plans/2026-10-02-van-chuyen-cau-hoi-ban-ve.md`. Lời chủ nguyên văn ghi ở từng quyết định dưới. AI ghi lại, không tự duyệt. Sửa [ADR-0057](ADR-0057-van-chuyen-tien-xe-thue.md) (accepted 2026-09-30) ở các điểm nêu; mọi điểm khác của ADR-0057 giữ nguyên.
- **Ngày:** 2026-10-02
- **Phạm vi:** module `van-chuyen` — bảng giá thuê (`vc_rental_rate`, migration 0072), dòng chi phí chuyến (`vc_trip_cost_line`, 0073), luật thuần `tien-xe*.ts`, kiểm định `R-VC-COST-*`, sổ vàng `golden/van-chuyen-chi-phi.json`. Cả 0072 và 0073 **chưa áp lên production** (nhánh `worktree-agent-a76ababaa4a5b3183`) ⇒ sửa tại chỗ được.

## Bối cảnh

Soát sổ vàng (19 ca V1–V14b) với chủ dự án ngày 2/10: số tiền khớp 19/19, nhưng (1) dòng đảo tự động mang ngày chạy MỚI của chuyến, nên chuyến dời từ 31/10 sang 01/11 để tháng 10 treo +1.000.000 chưa đảo; (2) chủ cho biết thực tế thị trường **giá thuê luôn theo cả tuyến lẫn cỡ xe**, không có giá "mọi tuyến" hay "mọi cỡ"; (3) kế hoạch (TC-11) và mã lệch nhau ở việc ghi phí cho nhà xe cũ khi chuyến đổi sang xe công ty.

## Quyết định

**Q1 — Dời ngày chạy theo yêu cầu khách: tính lại giá theo bảng giá ngày chạy mới** (giữ ADR-0057 B2 + lời chủ 1/10 "900.000đ — giá ngày chạy").
> Chủ: *"Rõ ràng đây là dời theo yêu cầu của khách, như vậy khách phải trả theo giá mới, không phải giá cũ. Nhiệm vụ của chúng ta phải có cách thông báo sớm và kịp thời cho khách. nên ở đây A2 là hợp lý."*
Bổ sung vào ADR-0057 C4: đổi **ngày chạy** sang ngày khác (không chỉ đổi giờ trong ngày) cũng là lúc đảo + chụp lại; giá thoả thuận bị đảo, nhập lại như đổi tuyến. Việc báo khách giá mới thuộc phía bán hàng (ngoài ADR này).

**Q2 — Dòng đảo ghi vào kỳ của dòng gốc.** Dòng `REVERSAL` (tự động hay tay) mang **ngày của dòng gốc** nếu kỳ của ngày đó còn mở; kỳ đã khoá (ADR-0080) thì mang ngày hiện tại. Một hàm duy nhất quyết ngày ghi đảo.
> Chủ: *"… Nếu tháng 10 đã khoá thì phải ghi giảm trừ … với tháng 11 … phản ánh đúng thực tế …"*

**Q3 — Mỗi dòng giá bắt buộc có CẢ tuyến LẪN cỡ xe.** Sửa ADR-0057 B1 ("ít nhất một trong hai" → **cả hai**) và B2 (bỏ bậc (2) "khớp tuyến, cỡ trống" và (3) "khớp cỡ, tuyến trống"; bỏ Q3 a "tuyến thắng cỡ"). Luật chọn giá: dòng đang hiệu lực vào ngày chạy, đúng nhà xe, **khớp đủ tuyến và cỡ** ⇒ giá bảng; không khớp ⇒ "không có giá bảng" (cần giá thoả thuận, nếu không chuyến bị giữ — không đổi).
> Chủ: *"Cũng là đón đưa sân bay - thành phố thì xe 5 chỗ và xe 16 chỗ khác nhau về giá. Cũng là tuyến Đà Lạt thì xe 9 chỗ và xe 16 chỗ hoặc xe 29 chỗ khác nhau về giá, đây là lẽ thường của thị trường."*

**Q4 — Phí huỷ muộn ghi theo ngày huỷ.** Điều chỉnh trên chuyến đã huỷ có ngày phát sinh mặc định = **ngày huỷ chuyến**. Phí huỷ là ràng buộc hợp đồng với nhà xe.
> Chủ: V8b *"có chứ, đó là ràng buộc"*; ngày ghi: *"C1 — theo đúng quy định của kế toán."*
Phụ thu chờ thêm giờ: ngày phát sinh = ngày chạy chuyến (chủ: V7 *"ok"*).

**Q5 — Phí cho nhà xe cũ khi chuyến đổi sang xe công ty.** Chuyến đã chụp giá xe nhà xe rồi đổi sang xe công ty (chưa huỷ): Kế toán được ghi `ADJUSTMENT` lý do "Phí huỷ muộn" mang nhà xe cũ. Sửa kiểm định `R-VC-COST-3`: chuyến `rented = 0` được có tổng ≠ 0 **chỉ** gồm phí huỷ cho nhà xe cũ (mọi nguồn giá đã đảo).
> Chủ: 4.7 *"có"*; V13 *"ok"*.

**Q6 — Giá thoả thuận khi đổi tuyến: hết hiệu lực** (giữ ADR-0057 như mã hiện tại — đổi tuyến là dịch vụ khác). Chủ: D *"D1"*.

**Q7 — Giá mới không áp cho chuyến đã chụp giá** (giữ ADR-0057, ca V11). Chủ: V11 *"Không, bản chất là theo lời hứa đã hứa."*

**Q8 — Lý do mới "Xe hỏng giữa đường"** trong nhóm lý do chi phí xe (dữ liệu, hai chiều). Chủ: V10 *"ok, theo đề xuất."*

**Q9 — Gợi ý giá bảng có hiện số tiền.** Khi chuyến chưa có giá mà bảng giá vừa có dòng khớp, phản hồi chi phí chuyến (chỉ người có `transport.cost.view`) kèm số tiền gợi ý để Kế toán thấy trước khi bấm "Lấy lại giá bảng". Chủ: 4.3 *"Có"*.

**Q10 — Sổ vàng do Kế toán ký xác nhận** (chủ: 4.6 *"Kế toán"*). Phát hành tiền xe thuê chờ chữ ký đó (ADR-0057 C12, Hiến chương 5.17 — không đổi).

## Cửa một chiều / hai chiều

- **Một chiều (chốt trước khi 0072/0073 lên production):** `CHECK` tuyến + cỡ bắt buộc trên `vc_rental_rate`; quy tắc ngày dòng đảo (dữ liệu đã ghi không sửa lại được — chỉ-thêm).
- **Hai chiều:** lý do mới; gợi ý giá; ngày mặc định của điều chỉnh.

## Hệ quả

- Sổ vàng: các ca dùng dòng giá thiếu tuyến hoặc thiếu cỡ (V2, V3, V4, V5a/b, V6…) viết lại với bảng giá đủ tuyến + cỡ; thêm kiểm **ngày** dòng (không chỉ số tiền); thêm ca ADR-0057 C12 "đổi sang nhà xe khác trước xuất bến", ca Q2, ca Q5. Trạng thái vẫn `cho_xac_nhan` tới khi Kế toán ký.
- Kế hoạch Đợt 4 (`docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-04-tien-xe-thue.md`): TC-10, TC-11 đổi theo Q5; G1 form bảng giá bắt buộc cả hai ô, bỏ câu "Có cả giá theo tuyến và giá theo cỡ xe thì giá theo tuyến được dùng" của bản vẽ.
- ADR-0057 dòng Trạng thái thêm chỉ dẫn "các điểm B1, B2, C4, TC-10 bị sửa bởi ADR-0095".

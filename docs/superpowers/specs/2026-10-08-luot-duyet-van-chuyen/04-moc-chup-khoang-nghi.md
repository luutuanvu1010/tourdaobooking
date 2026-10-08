# ADR-0106 (số tạm, chốt khi gộp) — Mốc chụp khoảng nghỉ của chuyến xe

> **Trạng thái:** **proposed**, vai soạn, 2026-10-08. Chủ chưa duyệt (Hiến pháp N3). **Thuộc lượt 8b.** Mốc đo mã: `claude/van-chuyen-goi-a-c` @ `809918d5`.

## Cho chủ dự án

Khoảng nghỉ là số phút tối thiểu một xe và tài xế phải nghỉ giữa hai chuyến; máy chép con số này vào từng chuyến lúc tạo, để sau này đổi cài đặt cũng không làm đổi các chuyến đã xếp. Bản sửa lỗi gần đây (N3) cho máy chép lại con số mới khi người xếp xe sửa chuyến mà đổi giờ bắt đầu, giờ kết thúc, xe hoặc tài xế; các kiểu sửa khác giữ số cũ. Luật nền đòi thời điểm chép này phải ghi trong một quyết định được duyệt, nhưng hiện chưa quyết định nào ghi. Tôi khuyến nghị bạn duyệt đúng thời điểm mà mã đang làm.

**Câu duyệt gợi ý:** "Duyệt ADR-0106: khoảng nghỉ chép vào chuyến lúc tạo, và chép lại khi sửa chuyến đổi giờ bắt đầu, giờ kết thúc, xe hoặc tài xế; các lệnh sửa khác giữ số cũ."

---

## Phần kỹ thuật
- **Mã:** `lenhSuaChuyen` tính `nghiChup` = khoảng nghỉ của chính sách hiện hành khi `doiGio || doiKetThuc || doiXe || doiTaiXe`, ngược lại giữ `rest_minutes_snapshot` (`src/modules/van-chuyen/dieu-phoi-lenh.ts:123-129`). Commit `8a9e8d73` (đã có trên `claude/van-chuyen-goi-a-c`, `c14-thay-chang`, `a1-luat-loi-chuyen`, `a3-tin-don-doi`), bài `src/modules/van-chuyen/nghi-chup-lai.test.ts`. Lệnh tạo chụp lúc tạo (`src/modules/van-chuyen/chuyen-repo.ts:323`).
- **Luật:** Hiến chương 5.6 (`docs/ARCHITECTURE.md:101`): chính sách chụp vào đối tượng "tại **một mốc cố định do ADR của nghiệp vụ đó quy định**". ADR-0049 `:171` chỉ ghi "Chụp vào `vc_trip.rest_minutes_snapshot`", không ghi mốc.
- **Câu bổ sung (không sửa ADR cũ):** ADR-0049 `:171` + "Mốc chụp: lúc tạo chuyến; chụp lại khi lệnh sửa chuyến đổi giờ bắt đầu, giờ kết thúc, xe hoặc tài xế; lệnh sửa khác giữ số đã chụp. Lý do phá lệ nghỉ (`rest_override_reason_code`) không đổi theo (ADR-0106)."
- **Cửa:** hai chiều (luật ở mã, không đổi dữ liệu cũ); không migration.
- **Chưa kiểm:** phiếu kiểm độc lập của N3 nằm ở sổ thi công nhánh `claude/van-chuyen-goi-a-c` (commit `f5010889`, "đạt có điều kiện"); người soạn chưa đọc điều kiện của phiếu đó.

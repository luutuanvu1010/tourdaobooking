-- Migration 0113 — CHỤP BÙ MỘT LẦN cho đơn KHÁCH LẺ đã xác nhận trước khi có bảng mức (sổ đại lý đợt 2, Task 6; ADR-0079 điều 7 (b1); đặc tả
-- docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/README.md P6 b1; «Hợp đồng đơn b1» ở sổ thi công). Module `orders` (bảng của chính nó: `ord_service_terms`).
-- Số 0113 (trước là 0112 tạm — đổi lúc gộp main 19/10, Ruling R-P11 của sổ thi công; main đã dùng 0111): lúc gộp kiểm lại `ls migrations` và migration của mọi nhánh chưa gộp. Câu đếm (b1) = 0 thì chủ quyết bỏ tệp này.
--
-- Vì sao: «Đã giao» của đợt 2 đòi MỌI dòng dịch vụ có bản chụp (lớp 1 ở orders, lớp 2 là trigger `bil_posting_delivered_terms` của 0112). Đơn khách lẻ xác nhận
-- trước 0090 chưa có bản chụp nào ⇒ nếu không chụp bù thì bị giữ thêm, trái chữ ADR-0079 7b1 («không làm đơn khách lẻ nào bị giữ thêm»).
-- Làm gì: mỗi dòng dịch vụ của đơn (b1) nhận MỘT bản chụp — hoa hồng `NONE` (không người hưởng), người bán = công ty chủ theo dòng điều khoản `ALL` có hiệu lực ở
-- ngày xác nhận (gieo sẵn `prc-st-goc-all` từ 2025-01-01 — ADR-0078 điều 3), `source = 'AUTO'`, `created_by = 'he-thong:0113'`. KHÔNG dùng điều khoản theo dịch vụ /
-- nhóm: đơn b1x (dịch vụ nay do nhà cung cấp bán) vẫn nhận người bán Tour Đảo, đúng chữ 7b1 (Kế toán bổ sung giá vốn sau «Đã giao» bằng điều chỉnh có duyệt).
-- Ngày chụp = ngày theo giờ Việt Nam của `confirmed_at` (trống ⇒ `created_at`). Đơn xác nhận TRƯỚC ngày bắt đầu sớm nhất của điều khoản `ALL` (không có trên production
-- — điều khoản gieo lùi về trước đơn đầu tiên) lấy ngày bắt đầu đó, để trigger `ord_service_terms_term_valid` không làm hỏng cả migration (Ruling Task 6).
--
-- Tập (b1) — ĐÚNG điều kiện câu đếm (b1) của docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/cau-dem-chi-doc.sql (bài «hai nơi» src/chup-bu.test.ts):
-- đơn `confirmed`, chưa «Đã giao», chưa có bản chụp nào; bên đặt trống / là công ty chủ / không mang vai đang mở nào được hưởng, thuộc nhóm bên ngoài hay là loại đối
-- tác (đúng `nguoiHuongCua` của pricing); không có dòng dịch vụ nhập tay. Phần còn lại (b2) chờ Kế toán bấm «Chụp bù».
-- Một câu `INSERT … SELECT`, không đụng tiền, không đụng bảng nào khác. Tập (b1) rỗng ⇒ không làm gì. Câu đếm (sau) đếm `created_by = 'he-thong:0113'`.
INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, missing_reason, commission_kind, commission_rate_bp, commission_per_pax,
  commission_rule_id, supply_status, seller_party_id, supplier_party_id, cost_rate_bp, supply_term_id, source, reason, supersedes_id, captured_date, created_at, created_by,
  updated_at, updated_by)
SELECT 'chup-bu-0113-' || s.id, s.order_id, s.id, NULL, 'NONE', NULL, NULL, NULL, NULL,
  NULL, 'SET', t.seller_party_id, NULL, NULL, t.id, 'AUTO', NULL, NULL, d.ngay, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong:0113',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong:0113'
FROM (
  SELECT o.id AS order_id,
    max(date(COALESCE(o.confirmed_at, o.created_at), '+7 hours'), (SELECT min(a.valid_from_date) FROM v_prc_supply_term a WHERE a.scope = 'ALL')) AS ngay
  FROM orders o
  WHERE o.status = 'confirmed' AND o.delivered_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM ord_service_terms c WHERE c.order_id = o.id)
    AND (o.booker_party_id IS NULL OR o.booker_party_id IN (SELECT party_id FROM v_pty_owner_company)
      OR NOT EXISTS (SELECT 1 FROM v_pty_open_role vr JOIN v_pty_role_type rt ON rt.code = vr.role_type_code WHERE vr.party_id = o.booker_party_id
        AND (vr.role_type_code IN (SELECT role_type_code FROM v_prc_beneficiary_role) OR vr.role_group = 'EXTERNAL' OR rt.is_partner_label = 1)))
    AND NOT EXISTS (SELECT 1 FROM order_service m WHERE m.order_id = o.id AND m.catalog_code IS NULL)
) d
JOIN order_service s ON s.order_id = d.order_id
JOIN v_prc_supply_term t ON t.scope = 'ALL' AND t.supplier_party_id IS NULL AND t.seller_party_id IN (SELECT party_id FROM v_pty_owner_company)
  AND t.valid_from_date <= d.ngay AND (t.valid_to_date IS NULL OR t.valid_to_date >= d.ngay);

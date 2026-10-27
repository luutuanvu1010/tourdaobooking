// Kế thừa từ kịch bản cùng tên của phiên a45f9ae5 (nhánh worktree-danh-gia-ux-tong-the, 27/10/2026); phiên này (v2) đổi cổng 8795 + kho ~/tourdao-ux-2026-10-27-v2 và bổ sung theo đề bài bản mới.
// Đếm nội dung một bản chụp D1 của cuộc đánh giá UX 27/10/2026 — CHỈ ĐỌC (một câu SELECT, wrangler d1 execute --local --persist-to). Không cần máy chủ bật,
// nhưng ĐỪNG chạy khi máy chủ đang ghi vào chính thư mục đó.
// Chạy từ GỐC kho: node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/dem-ban-chup.mjs ~/tourdao-ux-2026-10-27/d1-nhieu
import { execFileSync } from "node:child_process";

const dir = process.argv[2];
if (!dir) { console.error("Dùng: dem-ban-chup.mjs <thư mục persist>"); process.exit(2); }
const q = `SELECT
 (SELECT count(*) FROM staff) AS tai_khoan,
 (SELECT count(*) FROM orders) AS don,
 (SELECT count(*) FROM orders o WHERE status = 'draft' AND NOT EXISTS (SELECT 1 FROM ord_confirm_request r WHERE r.order_id = o.id AND r.decided_at IS NULL)) AS don_nhap,
 (SELECT count(*) FROM orders o WHERE status = 'draft' AND EXISTS (SELECT 1 FROM ord_confirm_request r WHERE r.order_id = o.id AND r.decided_at IS NULL)) AS don_cho_xac_nhan,
 (SELECT count(*) FROM orders WHERE status = 'confirmed' AND delivered_at IS NULL) AS don_da_xac_nhan,
 (SELECT count(*) FROM orders WHERE status = 'confirmed' AND delivered_at IS NOT NULL AND completed_at IS NULL) AS don_da_giao,
 (SELECT count(*) FROM orders WHERE completed_at IS NOT NULL) AS don_hoan_thanh,
 (SELECT count(*) FROM orders WHERE status = 'cancelled') AS don_da_huy,
 (SELECT count(DISTINCT staff_id) FROM orders) AS so_nguoi_lap,
 (SELECT min(depart_date) FROM order_service) AS ngay_di_som_nhat,
 (SELECT max(depart_date) FROM order_service) AS ngay_di_muon_nhat,
 (SELECT count(*) FROM pty_party) AS ho_so_tat_ca,
 (SELECT count(*) FROM pty_party p WHERE NOT EXISTS (SELECT 1 FROM staff s WHERE s.party_id = p.id)) AS ho_so_khong_tai_khoan,
 (SELECT count(*) FROM vc_vehicle) AS xe,
 (SELECT count(*) FROM vc_trip) AS chuyen,
 (SELECT group_concat(status || ':' || n) FROM (SELECT status, count(*) n FROM vc_trip GROUP BY status)) AS chuyen_theo_trang_thai,
 (SELECT count(*) FROM bil_adjustment_request) AS yeu_cau_dieu_chinh,
 (SELECT group_concat(kind_code || ':' || n) FROM (SELECT kind_code, count(*) n FROM bil_adjustment_request GROUP BY kind_code)) AS dieu_chinh_theo_loai_dong,
 (SELECT count(*) FROM vc_transfer_request) AS de_nghi_chuyen_khach,
 (SELECT count(*) FROM vc_unavailability) AS bao_ban,
 (SELECT count(*) FROM fbk_ticket) AS ve_ho_tro,
 (SELECT count(*) FROM ntf_notice) AS thong_bao,
 (SELECT count(*) FROM prc_commission_rule) AS muc_hoa_hong,
 (SELECT count(*) FROM catalog_item WHERE in_sheet = 1) AS dich_vu_danh_muc`;
const out = execFileSync("npx", ["wrangler", "d1", "execute", "tourdao-sales-db", "--local", "--persist-to", dir, "--json", "--command", q.replace(/\s+/g, " ")], { encoding: "utf8" });
console.log(JSON.stringify(JSON.parse(out)[0].results[0], null, 1));

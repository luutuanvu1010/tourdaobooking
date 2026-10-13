// Danh sách kiểm bất biến dữ liệu của scripts/audit-invariants.mjs — TỆP THUẦN (chỉ dữ liệu, không I/O, không process.exit) để
// `src/audit-invariants.test.ts` chạy CHÍNH các câu SQL này trên schema đầy đủ bằng node:sqlite (cùng một nguồn với script chạy trên D1, không chép tay).
//
// Mỗi kiểm = một câu SQL trả SỐ dòng vi phạm (0 = đạt), hoặc (mode 'rows') mỗi dòng kết quả là một vi phạm (PRAGMA).
//   level 'fail'               vi phạm → đỏ (thoát mã 1);
//   level 'warn-unless-strict' cảnh báo, ĐỎ khi chạy --strict (khoảng giữa hai lần phát hành N1; dùng --strict sau lần phát hành 2);
//   level 'warn'               cảnh báo VĨNH VIỄN, không bao giờ đỏ kể cả --strict (tình trạng nghiệp vụ hợp lệ, cần người rà soát).
//   note                       (tuỳ chọn) chữ giải thích khi vi phạm ở mức cảnh báo; thiếu thì dùng chữ mặc định của mức đó.

const OPEN_ADMIN = `SELECT s.id FROM staff s JOIN stf_permission p ON p.staff_id = s.id AND p.permission_type_code = 'ADMIN' AND p.valid_to_at IS NULL WHERE s.active = 1`;
const overlap = (table, keyCols, from) =>
  `SELECT count(*) FROM ${table} a JOIN ${table} b ON a.id < b.id AND ${keyCols.map((c) => `IFNULL(a.${c}, '') = IFNULL(b.${c}, '')`).join(" AND ")}
   AND NOT (COALESCE(a.valid_to_date, '9999-12-31') < b.${from} OR a.${from} > COALESCE(b.valid_to_date, '9999-12-31'))`;

/**
 * Điều kiện "hồ sơ của dòng phân công `a` có tài khoản còn quyền để làm người phụ trách đang hiệu lực" (dùng chung cho R-DSP-2a/2b) — đúng tập quyền
 * `dispatch/rules.ts:checkAssignee` chấp nhận: `SALES`/`ADMIN`/`SUPER_ADMIN` (cấp đầy đủ, `order.modify`) hoặc `FIELD` (cấp hẹp, `order.money.edit` phạm vi
 * `assigned` — ADR-0014 điều 6, Phase B) VÀ tài khoản đó KHÔNG đang có quyền `PARTNER` còn hiệu lực (ADR-0030 S20-5: tài khoản LAI — còn Đối tác kèm quyền
 * khác — không đủ điều kiện, khớp `checkAssignee` gọi `holdsPartner`). `extra` thu hẹp thêm (vd ` AND s.active = 1`). Alias `a` là dòng `dsp_assignment`
 * của câu ngoài.
 */
const handlerAccountEligible = (extra = "") =>
  `EXISTS (SELECT 1 FROM staff s JOIN stf_permission p ON p.staff_id = s.id AND p.permission_type_code IN ('SALES', 'ADMIN', 'FIELD', 'SUPER_ADMIN') AND p.valid_to_at IS NULL WHERE s.party_id = a.party_id${extra}
     AND NOT EXISTS (SELECT 1 FROM stf_permission pp WHERE pp.staff_id = s.id AND pp.permission_type_code = 'PARTNER' AND pp.valid_to_at IS NULL))`;

/**
 * "Giấy tờ xe `d` đang hiện hành" — NGUYÊN VĂN hằng `HIEN_HANH` của `src/modules/van-chuyen/repository.ts` (màn giấy tờ xe, danh sách "sắp hết hạn" đọc
 * bằng chính đoạn này). Hằng đó KHÔNG export (export phải sửa repository.ts — ngoài phạm vi việc siết K-01), nên chép chữ — `src/audit-invariants.test.ts` đọc repository.ts và đỏ khi hai bản
 * lệch nhau (một luật "hiện hành", không hai). Alias bắt buộc: `d` (dòng đang xét), `n` (dòng gia hạn) — câu dùng đoạn này không đặt alias `n` khác.
 */
const HIEN_HANH_GIAY_TO_XE = "(d.voided_at IS NULL AND NOT EXISTS (SELECT 1 FROM vc_vehicle_document n WHERE n.previous_id = d.id AND n.voided_at IS NULL))";

/**
 * Số khách HIỆU LỰC của dịch vụ alias `s` (ADR-0047 L-A1): phần tử của CHÍNH dịch vụ trong `after_json` của dòng điều chỉnh gần nhất (có chắn JSON hỏng),
 * không thì số đã lưu. MỘT đoạn cho R-ORD-9 và R-VC-3, R-VC-7 (ADR-0049 kế hoạch mục 4 điểm 11 — không chép lần hai). Alias nội bộ: a, b, je.
 * `loai` = các loại khách được cộng; MẶC ĐỊNH cả bốn loại (câu chữ của các kiểm cũ giữ nguyên từng byte); R-ORD-16w (ADR-0114 D3) chỉ cộng `adult` + `senior` (người đi kèm trẻ em).
 */
const TAT_CA_LOAI_KHACH = ["adult", "child", "senior", "infant"];
const soKhachHieuLuc = (s, loai = TAT_CA_LOAI_KHACH) => `COALESCE(
            (SELECT ${loai.map((f) => `json_extract(je.value, '$.pax.${f}')`).join(" + ")}
               FROM order_money_adjustment a, json_each(CASE WHEN json_valid(a.after_json) AND json_type(a.after_json) = 'array' THEN a.after_json ELSE '[]' END) je
               WHERE a.order_id = ${s}.order_id AND a.seq = (SELECT MAX(seq) FROM order_money_adjustment b WHERE b.order_id = ${s}.order_id) AND json_extract(je.value, '$.serviceId') = ${s}.id
               LIMIT 1),
            ${loai.map((f) => `${s}.pax_${f}`).join(" + ")})`;
/**
 * Số người HIỆU LỰC của CHẶNG alias `l` thuộc dịch vụ alias `s` — CÙNG NGHĨA `soNguoiChang` (src/shared/so-nguoi-chang.ts; ADR-0054 D10.3): chặng VỀ có `pax_override`
 * → min(số riêng, số khách hiệu lực của dịch vụ); còn lại = số khách hiệu lực. MỘT đoạn cho R-VC-3 (L-D1) và R-VC-7 — không viết bộ đọc `after_json` thứ hai.
 */
const soNguoiChangSql = (l, s) => `(CASE WHEN ${l}.direction = 'RETURN' AND ${l}.pax_override IS NOT NULL THEN min(${l}.pax_override, ${soKhachHieuLuc(s)}) ELSE ${soKhachHieuLuc(s)} END)`;
/** Mốc "bây giờ" dạng ISO UTC đúng khuôn `toISOString()` (so chuỗi với valid_from_at / created_at). */
const BAY_GIO_ISO = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
/** Mili-giây "bây giờ" (so với *_ms của vc_trip). */
const BAY_GIO_MS = "(CAST(strftime('%s', 'now') AS INTEGER) * 1000)";
/**
 * Tài xế đang lái `dr` (dòng vc_trip_driver) KHÔNG đạt LC-12 cho chuyến `t` / xe `v` — cùng nghĩa `kiemLai` (src/shared/dieu-phoi-kiem.ts): không có GPLX HIỆN
 * HÀNH còn hạn tới hết ngày VN của giờ kết thúc dự kiến mà hạng (dòng số khách đang hiệu lực) chở đủ số chỗ của xe (NULL = không giới hạn).
 */
const TAI_XE_KHONG_DAT = `NOT EXISTS (
    SELECT 1 FROM pty_person_document g
     WHERE g.party_id = dr.driver_party_id AND g.document_type_code = 'GPLX' AND g.voided_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM pty_person_document gn WHERE gn.previous_id = g.id AND gn.voided_at IS NULL)
       AND (g.expiry_date IS NULL OR g.expiry_date >= date(t.planned_end_ms / 1000, 'unixepoch', '+7 hours'))
       AND EXISTS (SELECT 1 FROM vc_license_capacity c WHERE c.license_class_code = g.license_class_code
             AND c.valid_from_at = (SELECT max(c2.valid_from_at) FROM vc_license_capacity c2 WHERE c2.license_class_code = g.license_class_code AND c2.valid_from_at <= ${BAY_GIO_ISO})
             AND (c.max_passengers IS NULL OR c.max_passengers >= v.passenger_capacity)))`;
/**
 * Hành động nhật ký của LỆNH CHUYẾN — mỗi dòng có ĐÚNG một `vc_trip_event` cùng id (dấu lệnh). KHÔNG gồm `trip_appt_*` (ADR-0051 — mốc giờ hẹn, không phải
 * sự kiện chuyến), `trip_reason_*`, `dispatch_policy_changed`… (danh mục / chính sách — không có chuyến).
 */
const HANH_DONG_CO_SU_KIEN = [
  "trip_created", "trip_edited", "trip_cancelled", "trip_allocated", "trip_allocation_removed", "trip_allocation_moved", "trip_passengers_synced", "trip_stops_synced", "trip_departed",
  "trip_stop_arrived", "trip_passenger_boarded", "trip_passenger_no_show", "trip_passenger_cancelled_at_stop", "trip_passenger_dropped", "trip_stops_reordered",
  "trip_ended", "trip_ended_interrupted",
  // ADR-0097 (gói A1, V3-B): sự kiện điều chỉnh có lý do của văn phòng.
  "trip_allocation_corrected", "trip_departure_revoked",
  // ADR-0104 Đ2.9 (NT-12): khúc của máy đồng bộ chuyến theo đơn — nhật ký + sự kiện ALLOCATION_ORDER_SYNCED cùng dấu lệnh của khúc.
  "trip_order_synced",
];

// ---- Sổ đại lý đợt 1 (đặc tả 2026-10-08 §9) — đoạn dùng chung của R-PRC-*, R-ORD-T*, R-KY-* ----
/** "Hôm nay" giờ Việt Nam, dạng YYYY-MM-DD — cùng chữ với R-PTY-6 và migration (`date('now')` trần là UTC, lệch 7 giờ quanh nửa đêm). */
const HOM_NAY_VN = "date('now', '+7 hours')";
/** Dòng của bảng mức / điều khoản alias `x` CHƯA HẾT HẠN (còn mở, hoặc ngày kết thúc từ hôm nay trở đi). Dòng đã đóng là lịch sử chỉ-thêm, không sửa được ⇒ không báo mãi. */
const CHUA_HET_HAN = (x) => `(${x}.valid_to_date IS NULL OR ${x}.valid_to_date >= ${HOM_NAY_VN})`;
/**
 * Hết ân hạn của R-ORD-T1 = mốc (`ord_audit_cutoff` dòng 'R-ORD-T1' = lúc áp migration 0090) + 60 phút, dạng số ngày Julian. MỘT hằng cho cả lỗi (R-ORD-T1: từ mốc này
 * trở đi) lẫn cảnh báo (R-ORD-T1w: trước mốc này) để hai câu không lệch nhau chỗ chia vùng. `julianday` ở CẢ HAI vế so giờ: chuỗi ISO có `Z` của máy chủ không so thô
 * với `datetime()` được; modifier `'+60 minutes'` cộng bằng số nguyên mili-giây nên đúng ngưỡng không sai một nhịp dấu phẩy động. Thiếu dòng mốc ⇒ NULL (R-ORD-T1 tự báo lỗi).
 */
const HET_AN_HA_T1 = "julianday((SELECT cutoff_at FROM ord_audit_cutoff WHERE code = 'R-ORD-T1'), '+60 minutes')";
/** Lúc xác nhận của đơn alias `o` dạng ngày Julian; đơn không có mốc xác nhận (chèn thẳng bằng SQL) lấy lúc tạo — như R-ORD-15. */
const LUC_XAC_NHAN = (o) => `julianday(COALESCE(${o}.confirmed_at, ${o}.created_at))`;
/** Số bản chụp HIỆN HÀNH của dòng dịch vụ alias `s`: bản chưa bị bản nào khác trỏ `supersedes_id` tới. Alias nội bộ: t, n. */
const SO_BAN_CHUP_HIEN_HANH = (s) =>
  `(SELECT count(*) FROM ord_service_terms t WHERE t.order_service_id = ${s}.id AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id))`;
/** Số dòng của bảng tiền `bang` thuộc tháng ĐÃ KHOÁ mà ghi (created_at) SAU lúc khoá tháng đó (closed_at). So giờ bằng `julianday` hai vế. Alias nội bộ: x, k. */
const GHI_SAU_KHOA = (bang) =>
  `(SELECT count(*) FROM ${bang} x JOIN ky_period_close k ON k.period = substr(x.occurred_date, 1, 7) WHERE julianday(x.created_at) > julianday(k.closed_at))`;

/** @type {{ code: string, what: string, sql: string, level: 'fail' | 'warn-unless-strict' | 'warn', mode?: 'rows', note?: string }[]} */
export const CHECKS = [
  { code: "R-N1-1", what: "mọi tài khoản có party_id", sql: "SELECT count(*) FROM staff WHERE party_id IS NULL", level: "warn-unless-strict" },
  { code: "R-N1-1", what: "một hồ sơ tối đa một tài khoản", sql: "SELECT count(*) FROM (SELECT party_id FROM staff WHERE party_id IS NOT NULL GROUP BY party_id HAVING count(*) > 1)", level: "fail" },
  {
    code: "R-ADR13-1",
    what: "tài khoản đang hoạt động ⇒ hồ sơ của nó đang hoạt động (ADR-0013 điều 5; chiều ngược lại là 'tạm khoá', hợp lệ)",
    sql: "SELECT count(*) FROM staff s JOIN pty_party p ON p.id = s.party_id WHERE s.active = 1 AND p.active = 0",
    level: "fail",
  },
  {
    code: "R-N1-2",
    what: "cá nhân ⇔ có pty_person (không có pty_organization); tổ chức ngược lại",
    sql: `SELECT count(*) FROM pty_party p WHERE
       (p.party_kind = 'PERSON' AND (NOT EXISTS (SELECT 1 FROM pty_person x WHERE x.party_id = p.id) OR EXISTS (SELECT 1 FROM pty_organization o WHERE o.party_id = p.id)))
    OR (p.party_kind = 'ORGANIZATION' AND (NOT EXISTS (SELECT 1 FROM pty_organization o WHERE o.party_id = p.id) OR EXISTS (SELECT 1 FROM pty_person x WHERE x.party_id = p.id)))`,
    level: "fail",
  },
  {
    code: "R-N1-3",
    what: "display_name của cá nhân = họ + tên đệm + tên",
    sql: `SELECT count(*) FROM pty_party p JOIN pty_person e ON e.party_id = p.id
     WHERE p.display_name <> trim(COALESCE(e.family_name || ' ', '') || COALESCE(e.middle_name || ' ', '') || e.given_name)`,
    level: "fail",
  },
  { code: "R-N1-4", what: "vai trò hồ sơ không chồng lấn (cùng hồ sơ, vai trò, nơi)", sql: overlap("pty_party_role", ["party_id", "role_type_code", "location_id"], "valid_from_date"), level: "fail" },
  { code: "R-N1-4", what: "quan hệ hồ sơ không chồng lấn", sql: overlap("pty_party_relationship", ["from_party_id", "to_party_id", "relationship_type_code"], "valid_from_date"), level: "fail" },
  { code: "R-N1-5", what: "còn ít nhất một quản trị viên đang hoạt động", sql: `SELECT CASE WHEN count(*) >= 1 THEN 0 ELSE 1 END FROM (${OPEN_ADMIN})`, level: "fail" },
  { code: "R-N1-10", what: "khoá ngoại toàn vẹn (PRAGMA foreign_key_check)", sql: "PRAGMA foreign_key_check", level: "fail", mode: "rows" },
  {
    code: "R-N1-13",
    what: "SĐT đăng nhập không được sao chép thành liên hệ do hệ thống tạo",
    sql: `SELECT count(*) FROM pty_contact_point c JOIN staff s ON s.party_id = c.party_id
     WHERE c.contact_kind_code = 'PHONE' AND c.value_normalized = s.phone AND c.created_by IS NULL`,
    level: "fail",
  },
  {
    code: "thông tin",
    what: "nhân sự đã có hồ sơ nhưng không có vai STAFF (cũ) hay vai nội bộ/bên ngoài nào đang mở (ADR-0018)",
    sql: `SELECT count(*) FROM staff s WHERE s.party_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code
      WHERE r.party_id = s.party_id AND (r.role_type_code = 'STAFF' OR (r.valid_to_date IS NULL AND t.role_group IN ('INTERNAL', 'EXTERNAL'))))`,
    level: "warn-unless-strict",
  },
  {
    code: "thông tin",
    what: "tài khoản đang hoạt động không có quyền nào (đăng nhập được nhưng không làm được gì)",
    sql: `SELECT count(*) FROM staff s WHERE s.active = 1 AND NOT EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id = s.id AND p.valid_to_at IS NULL)`,
    level: "warn-unless-strict",
  },
  {
    // Sổ tiền lượt 1 (ADR-0026 điều 9, kế hoạch Task 3): việc của Kế toán SAU phát hành — cọc cũ đã chép thành lần thu người thu CHƯA RÕ; đơn còn dòng
    // đó không bấm "Đã giao" được tới khi Kế toán đảo và ghi lại đúng người thu. Tình trạng nghiệp vụ hợp lệ ⇒ mức warn (không bao giờ đỏ).
    code: "thông tin",
    what: "đơn còn lần thu người thu chưa rõ (cọc cũ chuyển sang sổ — Kế toán đảo rồi ghi lại đúng người thu)",
    sql: "SELECT count(*) FROM v_bil_order_paid WHERE unknown_count > 0",
    level: "warn",
    note: "việc của Kế toán sau khi phát hành sổ tiền lượt 1 (ADR-0026 điều 9)",
  },

  // ---- Luật cứng ADR-0018 — trigger LC-1/LC-3 chặn ở CSDL (migration 0024); các kiểm này là LƯỚI THỨ HAI (P21) cho dữ liệu sửa tay bằng SQL. ----
  // ADR-0048 B2.1 (NỚI — chờ chủ xác nhận ở tệp đề xuất luật mục 1c): quyền bên ngoài = {PARTNER, DRIVER_PARTNER} = EXTERNAL_PERMISSIONS của
  // src/shared/permissions.ts, cùng tập với trigger LC-1 tạo lại ở migration *_tai_xe_doi_tac.
  {
    code: "R-LC-1",
    what: "tài khoản có vai bên ngoài đang mở chỉ giữ quyền bên ngoài (Đối tác hoặc Tài xế đối tác)",
    sql: `SELECT count(*) FROM staff s JOIN stf_permission p ON p.staff_id = s.id AND p.valid_to_at IS NULL AND p.permission_type_code NOT IN ('PARTNER', 'DRIVER_PARTNER')
     WHERE EXISTS (SELECT 1 FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code
                   WHERE r.party_id = s.party_id AND r.valid_to_date IS NULL AND t.role_group = 'EXTERNAL')`,
    level: "fail",
  },
  // LC-1b (ADR-0048 B2.2, B2.3 — Q4 = (a)): tài khoản giữ Tài xế đối tác không giữ quyền nào khác. Trigger lc1b_stf_permission_driver_partner_alone chỉ canh
  // INSERT (mã không bao giờ mở lại dòng quyền) — kiểm này là lưới thứ hai cho SQL gõ tay / mở lại dòng bằng UPDATE. Đếm TÀI KHOẢN lai.
  {
    code: "R-LC-1b",
    what: "tài khoản giữ quyền Tài xế đối tác không giữ thêm quyền nào khác (không tài khoản lai)",
    sql: `SELECT count(*) FROM staff s
     WHERE EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id = s.id AND p.valid_to_at IS NULL AND p.permission_type_code = 'DRIVER_PARTNER')
       AND EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id = s.id AND p.valid_to_at IS NULL AND p.permission_type_code <> 'DRIVER_PARTNER')`,
    level: "fail",
  },
  {
    code: "R-LC-3",
    what: "một hồ sơ không giữ cùng lúc vai nội bộ và vai bên ngoài đang mở",
    sql: `SELECT count(*) FROM (SELECT r.party_id FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code
       WHERE r.valid_to_date IS NULL AND t.role_group IN ('INTERNAL', 'EXTERNAL') GROUP BY r.party_id HAVING count(DISTINCT t.role_group) > 1)`,
    level: "fail",
  },

  // ---- Hồ sơ công ty chủ (ADR-0024 điều 6; 6.5 (ii) theo chủ 2026-09-28 "cho Super Admin đổi"). Bốn trigger của migration *_ho_so_cong_ty_chu giữ
  // "đúng một, không lúc nào trống" (đổi = chèn dòng mới, dòng cũ tự đóng; không đóng được dòng cuối; không mở lại; ngày bắt đầu = ngày tạo theo giờ VN). Kiểm này là LƯỚI THỨ HAI cho SQL
  // chạy tay: bắt "mất dòng" (xoá / đổi mã vai) và "trigger đổi bị gỡ" (hai dòng mở). KHÔNG bắt "chuyển dòng sang hồ sơ khác" (vẫn đúng một) —
  // câu hỏi Q1 của kế hoạch T2b, chủ giữ (a). D1 chưa áp migration đó → báo vi phạm (0 dòng), đúng: chưa có hồ sơ công ty chủ; `npm run trien-khai`
  // chạy kiểm này SAU khi áp migration. Lượt "Hoàn tất đơn" gọi cùng bất biến này là R-BIL-7: dùng lại R-PTY-1, không thêm kiểm trùng.
  {
    code: "R-PTY-1",
    what: "đúng một hồ sơ đang mở vai công ty chủ (OWNER_COMPANY)",
    sql: "SELECT CASE WHEN count(*) = 1 THEN 0 ELSE 1 END FROM pty_party_role WHERE role_type_code = 'OWNER_COMPANY' AND valid_to_date IS NULL",
    level: "fail",
  },
  // ---- Gộp hồ sơ cá nhân (ADR-0068 Đ3, G15). Trigger pty_party_merge_* (migration *_gop_ho_so) là đường chặn thứ nhất; đây là lưới cho SQL chạy tay (P21) và
  // cho khe giữa lúc kiểm và lúc ghi (R-PTY-MERGE-4, -5). "Ngày gộp" = ngày giờ VN của merged_at.
  {
    code: "R-PTY-MERGE-1",
    what: "không chuỗi gộp: hồ sơ đích của một lần gộp không tự gộp tiếp; hai đầu đều là hồ sơ cá nhân",
    sql: `SELECT count(*) FROM pty_party a JOIN pty_party b ON b.id = a.merged_into_id
     WHERE b.merged_into_id IS NOT NULL OR a.party_kind <> 'PERSON' OR b.party_kind <> 'PERSON'`,
    level: "fail",
  },
  {
    code: "R-PTY-MERGE-2",
    what: "hồ sơ đã gộp: ngưng dùng, có mốc gộp, không còn liên hệ / công việc / quan hệ mở sau ngày gộp",
    sql: `SELECT count(*) FROM pty_party a WHERE a.merged_into_id IS NOT NULL AND (a.active <> 0 OR a.merged_at IS NULL
       OR EXISTS (SELECT 1 FROM pty_contact_point c WHERE c.party_id = a.id AND (c.valid_to_date IS NULL OR c.valid_to_date > date(a.merged_at, '+7 hours')))
       OR EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = a.id AND (r.valid_to_date IS NULL OR r.valid_to_date > date(a.merged_at, '+7 hours')))
       OR EXISTS (SELECT 1 FROM pty_party_relationship x WHERE (x.from_party_id = a.id OR x.to_party_id = a.id)
                    AND (x.valid_to_date IS NULL OR x.valid_to_date > date(a.merged_at, '+7 hours'))))`,
    level: "fail",
  },
  {
    code: "R-PTY-MERGE-3",
    what: "hồ sơ đã gộp không gắn tài khoản",
    sql: "SELECT count(*) FROM staff s JOIN pty_party a ON a.id = s.party_id WHERE a.merged_into_id IS NOT NULL",
    level: "fail",
  },
  // R-PTY-MERGE-4 chép luật đếm của VIEC_XE_CUA_NGUOI (src/modules/van-chuyen/chuyen-repo.ts): sửa một nơi thì sửa nơi kia (F19).
  // Hồ sơ ĐÍCH có thể ngưng dùng SAU khi gộp — các kiểm này không canh việc đó (ADR chỉ ràng buộc lúc gộp).
  {
    code: "R-PTY-MERGE-4",
    what: "hồ sơ đã gộp không còn là người phụ trách đơn chưa xong, tài xế / người đi kèm / nhà xe của chuyến chưa chốt, chủ xe chưa ngừng",
    sql: `SELECT count(*) FROM pty_party a WHERE a.merged_into_id IS NOT NULL AND (
       EXISTS (SELECT 1 FROM dsp_assignment d JOIN orders o ON o.id = d.order_id WHERE d.party_id = a.id AND d.task_kind_code = 'HANDLE' AND d.valid_to_at IS NULL
                 AND o.status <> 'cancelled' AND o.delivered_at IS NULL)
       OR EXISTS (SELECT 1 FROM vc_trip_driver v JOIN vc_trip t ON t.id = v.trip_id WHERE v.driver_party_id = a.id AND v.valid_to_at IS NULL AND t.status IN ('PLANNED', 'RUNNING'))
       OR EXISTS (SELECT 1 FROM vc_trip_allocation x JOIN vc_trip t ON t.id = x.trip_id WHERE x.kind = 'CREW' AND x.crew_party_id = a.id AND x.valid_to_at IS NULL
                    AND t.status IN ('PLANNED', 'RUNNING'))
       OR EXISTS (SELECT 1 FROM vc_trip t WHERE t.carrier_party_id = a.id AND t.status IN ('PLANNED', 'RUNNING'))
       OR EXISTS (SELECT 1 FROM vc_vehicle v WHERE v.owner_party_id = a.id AND v.status <> 'retired'))`,
    level: "fail",
  },
  {
    code: "R-PTY-MERGE-5",
    what: "đơn chưa giao, chưa huỷ không còn người đặt là hồ sơ đã gộp",
    sql: `SELECT count(*) FROM orders o JOIN pty_party a ON a.id = o.booker_party_id
     WHERE a.merged_into_id IS NOT NULL AND o.status IN ('draft', 'confirmed') AND o.delivered_at IS NULL`,
    level: "fail",
  },

  // ---- Sổ tiền lượt 1 (ADR-0026 điều 7 — R-BIL-*; ADR-0025 NT 8 — hai bất biến mốc; NT-S9; kế hoạch Task 9, NT-A1). Trigger của migration 0044/0045 là
  // đường chặn thứ nhất; các kiểm này là LƯỚI THỨ HAI cho SQL chạy tay (P21). Chỉ đếm, không in số tiền / tên. "Còn hiệu lực" = không phải dòng đảo và
  // chưa bị đảo. R-BIL-2, R-BIL-5 (lượt 2) và R-BIL-7 (= R-PTY-1) ở danh sách GHI_CHU cuối tệp — không kiểm trùng, không in "đạt".
  {
    // R-BIL-1 (I1) — ADR-0088 đ1, đ7 (chủ chọn "Luôn luôn" 2/10): đơn đã Đã giao, MỌI LÚC: tổng lần thu còn hiệu lực = phải thu hiện hành = `due_snapshot`
    // của phiếu Đã giao − giảm trừ đã phân định (đ9 chưa có ⇒ giảm trừ = 0). Mốc (bil_audit_cutoff 'R-BIL-1', 0083): phiếu Đã giao hoặc một lần thu của đơn
    // ghi TỪ mốc ⇒ LỖI; dữ liệu cũ hơn mốc ⇒ cảnh báo kèm danh sách (R-BIL-1w) để Kế toán sửa bằng "Thay lần thu" (trước đây chỉ so "tại mốc" — bỏ, đ7).
    code: "R-BIL-1",
    what: "đơn Đã giao: tổng lần thu còn hiệu lực bằng phải thu phiếu Đã giao đã chụp, mọi lúc (ghi từ mốc 0083)",
    sql: `SELECT count(*) FROM bil_posting p
     WHERE p.kind_code = 'DELIVERED' AND NOT EXISTS (SELECT 1 FROM bil_posting x WHERE x.reverses_posting_id = p.id)
       AND COALESCE((SELECT SUM(CASE WHEN r.kind_code = 'CUSTOMER_REFUND' THEN -r.amount ELSE r.amount END) FROM bil_payment_receipt r
                     WHERE r.order_id = p.order_id AND r.reverses_id IS NULL
                       AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)), 0) IS NOT p.due_snapshot
       AND (p.created_at >= (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-1')
         OR EXISTS (SELECT 1 FROM bil_payment_receipt a WHERE a.order_id = p.order_id AND a.created_at >= (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-1')))`,
    level: "fail",
  },
  {
    code: "R-BIL-1w",
    what: "đơn Đã giao lệch tiền (đã thu khác phải thu lúc giao) — dữ liệu TRƯỚC mốc 0083 (Kế toán sửa bằng “Thay lần thu”)",
    sql: `SELECT p.order_id, p.due_snapshot, COALESCE((SELECT SUM(CASE WHEN r.kind_code = 'CUSTOMER_REFUND' THEN -r.amount ELSE r.amount END) FROM bil_payment_receipt r
                     WHERE r.order_id = p.order_id AND r.reverses_id IS NULL
                       AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)), 0) AS da_thu
     FROM bil_posting p
     WHERE p.kind_code = 'DELIVERED' AND NOT EXISTS (SELECT 1 FROM bil_posting x WHERE x.reverses_posting_id = p.id)
       AND COALESCE((SELECT SUM(CASE WHEN r.kind_code = 'CUSTOMER_REFUND' THEN -r.amount ELSE r.amount END) FROM bil_payment_receipt r
                     WHERE r.order_id = p.order_id AND r.reverses_id IS NULL
                       AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)), 0) IS NOT p.due_snapshot
       AND p.created_at < (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-1')
       AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt a WHERE a.order_id = p.order_id AND a.created_at >= (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-1'))`,
    mode: "rows",
    level: "warn",
  },
  {
    // R-BIL-3 (I3) phần lần thu: dòng đảo cùng đơn, cùng loại, cùng số với gốc; gốc không phải dòng đảo (mỗi gốc tối đa một lần — UNIQUE reverses_id).
    code: "R-BIL-3a",
    what: "lần thu đảo khớp lần thu gốc (cùng đơn, cùng loại, cùng số; gốc không phải dòng đảo)",
    sql: `SELECT count(*) FROM bil_payment_receipt x JOIN bil_payment_receipt g ON g.id = x.reverses_id
     WHERE NOT (g.reverses_id IS NULL AND g.order_id = x.order_id AND g.kind_code = x.kind_code AND g.amount = x.amount)`,
    level: "fail",
  },
  {
    // R-BIL-3 (I3) phần dòng nợ: cùng số, ĐỔI CHỖ hai bên, cùng loại, cùng nguồn (đơn / chuyến); gốc không phải dòng đảo.
    code: "R-BIL-3b",
    what: "dòng nợ đảo khớp dòng gốc (cùng số, đổi chỗ hai bên, cùng loại, cùng nguồn)",
    sql: `SELECT count(*) FROM bil_debt_line x JOIN bil_debt_line g ON g.id = x.reverses_line_id
     WHERE NOT (g.reverses_line_id IS NULL AND g.amount = x.amount AND g.debtor_party_id = x.creditor_party_id AND g.creditor_party_id = x.debtor_party_id
                AND g.kind_code = x.kind_code AND g.order_id IS x.order_id AND g.trip_id IS x.trip_id)`,
    level: "fail",
  },
  {
    // R-BIL-4 (I4): đơn Đã giao có ĐÚNG MỘT phiếu Đã giao còn hiệu lực; đơn chưa Đã giao không có phiếu nào. Đếm ĐƠN lệch.
    code: "R-BIL-4a",
    what: "đơn Đã giao có đúng một phiếu Đã giao; đơn chưa Đã giao không có phiếu Đã giao",
    sql: `SELECT count(*) FROM orders o
     WHERE (CASE WHEN o.delivered_at IS NULL THEN 0 ELSE 1 END) <> (SELECT count(*) FROM bil_posting p
       WHERE p.order_id = o.id AND p.kind_code = 'DELIVERED' AND NOT EXISTS (SELECT 1 FROM bil_posting x WHERE x.reverses_posting_id = p.id))`,
    level: "fail",
  },
  {
    // R-BIL-4 vế Hoàn thành (ruling điều phối 29/9 ở kế hoạch): đơn có completed_at ⇔ đúng một phiếu COMPLETED.
    code: "R-BIL-4b",
    what: "đơn Hoàn thành có đúng một phiếu Hoàn thành; đơn chưa Hoàn thành không có phiếu Hoàn thành",
    sql: `SELECT count(*) FROM orders o
     WHERE (CASE WHEN o.completed_at IS NULL THEN 0 ELSE 1 END) <> (SELECT count(*) FROM bil_posting p
       WHERE p.order_id = o.id AND p.kind_code = 'COMPLETED' AND NOT EXISTS (SELECT 1 FROM bil_posting x WHERE x.reverses_posting_id = p.id))`,
    level: "fail",
  },
  {
    // R-BIL-6: không đơn Đã giao nào còn lần thu người thu "chưa rõ" (cọc cũ chưa được Kế toán đảo + ghi lại).
    code: "R-BIL-6",
    what: "đơn Đã giao không còn lần thu người thu chưa rõ",
    sql: "SELECT count(*) FROM orders o JOIN v_bil_order_paid v ON v.order_id = o.id WHERE o.delivered_at IS NOT NULL AND v.unknown_count > 0",
    level: "fail",
  },
  {
    // NT-S9: lượt 1 mọi lần thu "thu cho" công ty chủ. So với MỌI hồ sơ từng giữ vai công ty chủ (đổi công ty chủ — ADR-0024 6.5 — không làm lần thu cũ
    // thành vi phạm). Giới hạn: không bắt "thu cho công ty chủ CŨ sau ngày đổi" — lượt 1 route không nhận giá trị này (máy chủ luôn dùng công ty chủ hiện hành).
    code: "R-BIL-S9",
    what: "mọi lần thu ghi 'thu cho' công ty chủ (lượt 1)",
    sql: `SELECT count(*) FROM bil_payment_receipt r
     WHERE r.collected_for_party_id NOT IN (SELECT party_id FROM pty_party_role WHERE role_type_code = 'OWNER_COMPANY')`,
    level: "fail",
  },
  {
    // ADR-0025 NT 8 (bất biến mốc 1): Hoàn thành ⇒ đã Đã giao.
    code: "R-BIL-M1",
    what: "đơn Hoàn thành thì đã Đã giao",
    sql: "SELECT count(*) FROM orders WHERE completed_at IS NOT NULL AND delivered_at IS NULL",
    level: "fail",
  },
  {
    // ADR-0025 NT 8 (bất biến mốc 2): Đã giao ⇒ trạng thái 'confirmed' (đơn đã khoá không huỷ / không về nháp được).
    code: "R-BIL-M2",
    what: "đơn Đã giao vẫn ở trạng thái đã xác nhận",
    sql: "SELECT count(*) FROM orders WHERE delivered_at IS NOT NULL AND status <> 'confirmed'",
    level: "fail",
  },

  // ---- Đơn huỷ và cọc (ADR-0089; migration 0078 lý do huỷ, 0079 cọc đơn huỷ — năm lỗi tiền Đợt 1). LƯỚI THỨ HAI sau trigger (bắt trigger bị gỡ nhầm / SQL gõ
  // tay đi vòng). "Còn lại = 0 của đơn huỷ" (R-BIL-C0 của kế hoạch) KHÔNG có câu SQL: "còn lại" không được lưu ở đâu — chỉ hàm `conLai` tính (H-C8, bài route).
  {
    // H-C6: đơn huỷ phải có dòng lý do; dòng lý do chỉ thuộc đơn đã huỷ (lô huỷ thua khoá lạc quan không để dòng mồ côi).
    code: "R-ORD-H1",
    what: "đơn huỷ có dòng lý do huỷ, và dòng lý do chỉ thuộc đơn đã huỷ",
    sql: `SELECT (SELECT count(*) FROM orders o WHERE o.status = 'cancelled' AND NOT EXISTS (SELECT 1 FROM ord_cancel_reason r WHERE r.order_id = o.id))
              + (SELECT count(DISTINCT r.order_id) FROM ord_cancel_reason r JOIN orders o ON o.id = r.order_id WHERE o.status <> 'cancelled')`,
    level: "fail",
  },
  {
    // H-C1 (đ15, mọi lúc): chi + chuyển ≤ duyệt ≤ tiền còn giữ lúc huỷ — đếm đơn lệch (view công bố v_bil_coc_don, cùng định nghĩa soTienCoc).
    code: "R-BIL-C1",
    what: "đơn huỷ: đã chi + đã chuyển ≤ đã duyệt ≤ tiền còn giữ lúc huỷ",
    sql: `SELECT count(*) FROM v_bil_coc_don v JOIN v_ord_cancel_state c ON c.order_id = v.order_id
     WHERE v.da_chi + v.da_chuyen > v.da_duyet OR v.da_duyet > v.con_giu_luc_huy`,
    level: "fail",
  },
  {
    // H-C7: đơn huỷ SAU bản này (dòng lý do legacy = 0) chỉ hoàn qua khoản duyệt — lần trả lại khách còn hiệu lực không gắn khoản duyệt, ghi SAU lúc huỷ.
    code: "R-BIL-C2",
    what: "đơn huỷ (sau bản cọc) không có lần trả lại khách tự do ghi sau lúc huỷ",
    sql: `SELECT count(*) FROM bil_payment_receipt r JOIN ord_cancel_reason c ON c.order_id = r.order_id AND c.reclassifies_id IS NULL AND c.legacy = 0
     WHERE r.kind_code = 'CUSTOMER_REFUND' AND r.approval_id IS NULL AND r.reverses_id IS NULL AND r.created_at > c.created_at
       AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)`,
    level: "fail",
  },
  {
    // H-C2 (đ4c, X-4): người chi / chuyển ≠ người duyệt khoản; người xác nhận / từ chối ≠ người ghi dòng hoàn ngoài.
    code: "R-BIL-C3",
    what: "tách người: người chi / chuyển khác người duyệt; người xác nhận dòng hoàn ngoài khác người ghi",
    sql: `SELECT (SELECT count(*) FROM bil_payment_receipt r JOIN bil_deposit_approval a ON a.id = r.approval_id WHERE r.created_by IS a.created_by)
              + (SELECT count(*) FROM bil_outside_refund d JOIN bil_outside_refund g ON g.id = d.target_id WHERE d.created_by IS g.created_by)`,
    level: "fail",
  },
  {
    // H-C5 (đ16, lời chủ (b)): mỗi đơn tối đa MỘT dòng "đã hoàn ngoài hệ thống" đang hiệu lực (chưa bị từ chối); chỉ đơn huỷ cũ.
    code: "R-BIL-C4",
    what: "mỗi đơn tối đa một dòng đã hoàn ngoài hệ thống đang hiệu lực, chỉ đơn huỷ cũ",
    sql: `SELECT (SELECT count(*) FROM (SELECT g.order_id FROM bil_outside_refund g WHERE g.kind_code = 'RECORD'
                AND NOT EXISTS (SELECT 1 FROM bil_outside_refund x WHERE x.target_id = g.id AND x.kind_code = 'REJECT') GROUP BY g.order_id HAVING count(*) > 1))
              + (SELECT count(*) FROM bil_outside_refund g WHERE g.kind_code = 'RECORD'
                AND NOT EXISTS (SELECT 1 FROM ord_cancel_reason c WHERE c.order_id = g.order_id AND c.reclassifies_id IS NULL AND c.legacy = 1))`,
    level: "fail",
  },
  {
    // đ6: lệnh chuyển đủ hai nửa — mỗi lần chi gắn khoản TRANSFER còn hiệu lực có đúng một nửa thu ở đơn nhận, cùng số, cùng người giữ.
    code: "R-BIL-C5",
    what: "chuyển tiền sang đơn mới đủ hai nửa (đơn nhận, cùng số, cùng người giữ) — nửa chi còn hiệu lực ⇔ nửa thu khớp còn hiệu lực",
    // Hai chiều (kiểm độc lập vòng 2 CAO-2): (1) nửa chi còn hiệu lực mà không có nửa thu khớp còn hiệu lực (lô bị cắt, hoặc nửa thu bị đảo riêng);
    // (2) nửa chi đã bị đảo mà nửa thu vẫn còn hiệu lực (tiền tính hai lần). Nửa chi lẻ đã đảo (sửa dữ liệu lệch) = đạt.
    sql: `SELECT count(*) FROM bil_payment_receipt o JOIN bil_deposit_approval a ON a.id = o.approval_id AND a.kind_code = 'TRANSFER'
     WHERE o.kind_code = 'CUSTOMER_REFUND' AND o.reverses_id IS NULL
       AND (CASE WHEN EXISTS (SELECT 1 FROM bil_payment_receipt d WHERE d.reverses_id = o.id) THEN 0 ELSE 1 END)
        <> (CASE WHEN EXISTS (SELECT 1 FROM bil_payment_receipt i WHERE i.transfer_of_id = o.id AND i.order_id = a.target_order_id AND i.amount = o.amount
                         AND i.collector_party_id IS o.collector_party_id AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt di WHERE di.reverses_id = i.id)) THEN 1 ELSE 0 END)`,
    level: "fail",
  },
  {
    // F-03 (GD-B-02; Hiến chương 5.1, 5.4): đơn hết nháp (xác nhận, đã giao, hoàn tất, huỷ — kể cả đơn CHÈN THẲNG khác nháp bằng SQL tay, 0081 không chặn) có tạm tính đã lưu = Σ thành tiền các dòng. Lưới thứ
    // hai của trigger 0081 (`orders_confirm_subtotal_matches` + khoá dòng tiền / cột tiền khi đơn hết nháp). Mốc: MƯỢN mốc R-BIL-13 của 0080 (cùng một lần
    // phát hành với 0081 — module orders không ghi bảng của billing): đơn xác nhận (không có mốc xác nhận: lúc tạo) TỪ mốc lệch = LỖI; trước mốc = cảnh báo (R-ORD-15w, kèm danh sách).
    code: "R-ORD-15",
    what: "đơn đã xác nhận có tạm tính khác tổng thành tiền các dòng (xác nhận từ mốc 0080/0081)",
    sql: `SELECT count(*) FROM orders o WHERE o.status <> 'draft'
       AND o.subtotal <> (SELECT COALESCE(SUM(i.line_total), 0) FROM order_item i WHERE i.order_id = o.id)
       AND COALESCE(o.confirmed_at, o.created_at) >= (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-13')`,
    level: "fail",
  },
  {
    code: "R-ORD-15w",
    what: "đơn đã xác nhận có tạm tính khác tổng thành tiền các dòng — xác nhận TRƯỚC mốc 0080/0081 (rà tay theo mã đơn)",
    sql: `SELECT o.order_code, o.subtotal, (SELECT COALESCE(SUM(i.line_total), 0) FROM order_item i WHERE i.order_id = o.id) AS tong_dong
       FROM orders o WHERE o.status <> 'draft'
       AND o.subtotal <> (SELECT COALESCE(SUM(i.line_total), 0) FROM order_item i WHERE i.order_id = o.id)
       AND COALESCE(o.confirmed_at, o.created_at) < (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-13')`,
    mode: "rows",
    level: "warn",
  },
  {
    // ADR-0092 Đ1, đ8 (TNV-G4, KT06): đã thu RÒNG của mỗi đơn ≥ 0 (lần thu còn hiệu lực: thu cộng, trả lại khách trừ — cùng công thức trigger 0045 / 0082).
    // Mốc (bil_audit_cutoff 'R-BIL-8', 0082): đơn có lần thu ghi TỪ mốc mà âm = LỖI; chỉ có lần thu cũ hơn mốc = cảnh báo (R-BIL-8w, kèm danh sách).
    code: "R-BIL-8",
    what: "đã thu ròng của đơn không âm (đơn có lần thu ghi từ mốc 0082)",
    sql: `SELECT count(*) FROM (SELECT r.order_id, SUM(CASE WHEN r.kind_code = 'CUSTOMER_REFUND' THEN -r.amount ELSE r.amount END) AS rong
       FROM bil_payment_receipt r WHERE r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)
       GROUP BY r.order_id) t WHERE t.rong < 0
       AND EXISTS (SELECT 1 FROM bil_payment_receipt a WHERE a.order_id = t.order_id AND a.created_at >= (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-8'))`,
    level: "fail",
  },
  {
    code: "R-BIL-8w",
    what: "đã thu ròng của đơn âm — chỉ có lần thu TRƯỚC mốc 0082 (Kế toán sửa bằng lệnh đảo lần hoàn)",
    sql: `SELECT t.order_id, t.rong FROM (SELECT r.order_id, SUM(CASE WHEN r.kind_code = 'CUSTOMER_REFUND' THEN -r.amount ELSE r.amount END) AS rong
       FROM bil_payment_receipt r WHERE r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)
       GROUP BY r.order_id) t WHERE t.rong < 0
       AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt a WHERE a.order_id = t.order_id AND a.created_at >= (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-8'))`,
    mode: "rows",
    level: "warn",
  },
  {
    // ADR-0092 Đ2, Đ2b, đ8 (TNV-VP01, KT04 của TNV-G4): số dư cặp (bên, công ty chủ) trên đơn KHÔNG âm do dòng giữ hộ / quyết toán (nộp quá số giữ, nộp cho
    // người không giữ, nộp rồi lại "Công ty đã nhận" cùng một khoản). Âm hợp lệ do công ty nợ (dòng REFUND — người ứng tiền hoàn khách) KHÔNG tính (chỉ cộng
    // HELD + SETTLEMENT). Mốc (bil_audit_cutoff, 0080): cặp có dòng ghi TỪ mốc = LỖI; cặp chỉ có dòng cũ hơn mốc = cảnh báo (R-BIL-13w, kèm danh sách).
    code: "R-BIL-13",
    what: "số dư người giữ tiền trên đơn không âm do nộp / tất toán giữ hộ hai lần (ghi từ mốc 0080)",
    sql: `SELECT count(*) FROM (SELECT x.ben, x.order_id, SUM(x.so) AS so, MAX(x.luc) AS luc FROM (
       SELECT CASE WHEN l.creditor_party_id IN (SELECT party_id FROM v_pty_owner_company) THEN l.debtor_party_id ELSE l.creditor_party_id END AS ben, l.order_id,
              CASE WHEN l.creditor_party_id IN (SELECT party_id FROM v_pty_owner_company) THEN l.amount ELSE -l.amount END AS so, l.created_at AS luc
       FROM bil_debt_line l WHERE l.order_id IS NOT NULL AND l.kind_code IN ('HELD', 'SETTLEMENT')
         AND (l.creditor_party_id IN (SELECT party_id FROM v_pty_owner_company) OR l.debtor_party_id IN (SELECT party_id FROM v_pty_owner_company))) x
     GROUP BY x.ben, x.order_id) WHERE so < 0 AND luc >= (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-13')`,
    level: "fail",
  },
  {
    code: "R-BIL-13w",
    what: "số dư người giữ tiền âm do nộp / tất toán giữ hộ hai lần — dữ liệu TRƯỚC mốc 0080 (Kế toán sửa bằng lệnh đảo lần nộp)",
    sql: `SELECT x.order_id, x.ben, SUM(x.so) AS so FROM (
       SELECT CASE WHEN l.creditor_party_id IN (SELECT party_id FROM v_pty_owner_company) THEN l.debtor_party_id ELSE l.creditor_party_id END AS ben, l.order_id,
              CASE WHEN l.creditor_party_id IN (SELECT party_id FROM v_pty_owner_company) THEN l.amount ELSE -l.amount END AS so, l.created_at AS luc
       FROM bil_debt_line l WHERE l.order_id IS NOT NULL AND l.kind_code IN ('HELD', 'SETTLEMENT')
         AND (l.creditor_party_id IN (SELECT party_id FROM v_pty_owner_company) OR l.debtor_party_id IN (SELECT party_id FROM v_pty_owner_company))) x
     GROUP BY x.ben, x.order_id HAVING SUM(x.so) < 0 AND MAX(x.luc) < (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-13')`,
    mode: "rows",
    level: "warn",
  },
  {
    // ADR-0115 điều 1, 2 (migration 0094; đóng HC-4.2 phần công nợ): MỌI phiếu ADJUSTMENT ghi TỪ mốc R-BIL-14 đều có yêu cầu ĐÃ DUYỆT — dòng APPROVE trỏ đúng dòng
    // REQUEST của phiếu, cùng đơn, do người KHÁC người tạo yêu cầu duyệt, và chính người duyệt ghi phiếu. Lưới thứ hai sau các trigger 0094 (bắt trường hợp trigger bị gỡ
    // nhầm hay SQL gõ tay đi vòng). Phiếu cũ hơn mốc (không có yêu cầu) đi vào R-BIL-14w (cảnh báo), không tính lỗi.
    code: "R-BIL-14",
    what: "phiếu điều chỉnh công nợ ghi từ mốc 0094 đều có yêu cầu đã được người khác duyệt",
    sql: `SELECT count(*) FROM bil_posting p
     WHERE p.kind_code = 'ADJUSTMENT' AND p.created_at >= (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-14')
       AND NOT EXISTS (SELECT 1 FROM bil_adjustment_request a JOIN bil_adjustment_request r ON r.id = a.target_id AND r.kind_code = 'REQUEST'
         WHERE a.kind_code = 'APPROVE' AND r.id = p.request_id AND r.order_id = p.order_id AND a.created_by <> r.created_by AND a.created_by = p.created_by)`,
    level: "fail",
  },
  {
    code: "R-BIL-14w",
    what: "phiếu điều chỉnh công nợ TRƯỚC mốc 0094 (không qua duyệt) — chỉ ghi nhận, không sửa",
    sql: `SELECT p.id, p.order_id, p.created_at FROM bil_posting p
     WHERE p.kind_code = 'ADJUSTMENT' AND p.request_id IS NULL AND p.created_at < (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-14')`,
    mode: "rows",
    level: "warn",
  },
  {
    // ADR-0115 điều 4 (trần cộng dồn): tổng điều chỉnh TĂNG nợ còn hiệu lực của một đơn không vượt trần chụp lúc duyệt (cap_snapshot lớn nhất của các lần duyệt tăng nợ
    // của đơn — Hiến chương 5.6: bản chụp để đối chiếu, không phải nguồn tính thứ hai). Số tiền lấy từ DÒNG NỢ thật; dòng đã bị đảo không tính.
    code: "R-BIL-15",
    what: "tổng điều chỉnh tăng nợ còn hiệu lực của đơn không vượt trần chụp lúc duyệt",
    sql: `SELECT count(*) FROM (SELECT p.order_id, SUM(l.amount) AS tong, MAX(a.cap_snapshot) AS tran
       FROM bil_adjustment_request a JOIN bil_posting p ON p.request_id = a.target_id JOIN bil_debt_line l ON l.posting_id = p.id
       WHERE a.kind_code = 'APPROVE' AND a.direction = 'INCREASE' AND l.reverses_line_id IS NULL
         AND NOT EXISTS (SELECT 1 FROM bil_debt_line r WHERE r.reverses_line_id = l.id)
       GROUP BY p.order_id HAVING SUM(l.amount) > MAX(a.cap_snapshot))`,
    level: "fail",
  },
  {
    // ADR-0092 Đ6 + ADR-0108 đ4 (T2; migration 0088): mỗi mã giao dịch — các dòng nối CÒN HIỆU LỰC (vị từ hieuLuc) cùng MỘT số thực chuyển, không hai lần thu
    // cùng đơn, tổng lần thu ≤ số thực chuyển. Lưới thứ hai sau trigger 0088 (b)(c)(d).
    code: "R-BIL-D6a",
    what: "mỗi mã giao dịch ngân hàng: cùng số thực chuyển, không trùng đơn, tổng lần thu không vượt số thực chuyển",
    sql: `SELECT count(*) FROM (SELECT t.txn_code FROM bil_receipt_bank_txn t JOIN bil_payment_receipt r ON r.id = t.receipt_id
       WHERE r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)
       GROUP BY t.txn_code
       HAVING count(DISTINCT t.transferred_amount) > 1 OR count(*) > count(DISTINCT r.order_id) OR SUM(r.amount) > MAX(t.transferred_amount))`,
    level: "fail",
  },
  {
    // C1 đường 2 (Kế toán / Toàn quyền tự ghi — CHỈ máy chủ đòi mã, không có phiếu để gắn trigger): lần thu CK – Công ty thu còn hiệu lực ghi TỪ mốc 'R-BIL-D6'
    // đã là "công ty nhận" (không có dòng giữ hộ, hoặc dòng giữ hộ đã được "Công ty đã nhận") mà KHÔNG có mã. Bỏ nửa thu của lệnh chuyển cọc (transfer_of_id).
    // Đã lần mọi câu chèn bil_payment_receipt (lập kế hoạch 2026-10-08): lần thu CUSTOMER_PAYMENT gốc chỉ sinh ở ghiLanThu, daGiao, Thay lần thu (đều đòi mã)
    // và nửa thu chuyển cọc (có transfer_of_id); chi hoàn cọc / hoàn khách là CUSTOMER_REFUND. Thêm đường ghi lần thu mới ⇒ xét lại luật này.
    code: "R-BIL-D6b",
    what: "lần thu chuyển khoản – Công ty thu ghi từ mốc 0088 đã được công ty nhận đều có mã giao dịch ngân hàng",
    sql: `SELECT count(*) FROM bil_payment_receipt r
     WHERE r.kind_code = 'CUSTOMER_PAYMENT' AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)
       AND r.transfer_of_id IS NULL AND r.collector_role_code = 'COMPANY' AND r.method_code = 'BANK_TRANSFER'
       AND r.created_at >= (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-D6')
       AND NOT EXISTS (SELECT 1 FROM bil_receipt_bank_txn t WHERE t.receipt_id = r.id)
       AND (NOT EXISTS (SELECT 1 FROM bil_debt_line l WHERE l.receipt_id = r.id AND l.kind_code = 'HELD' AND l.reverses_line_id IS NULL)
         OR EXISTS (SELECT 1 FROM bil_debt_line d JOIN bil_posting p ON p.id = d.posting_id WHERE d.receipt_id = r.id AND p.kind_code = 'COMPANY_RECEIVED'))`,
    level: "fail",
  },
  {
    // H-C3 (đ5): khoản duyệt của đơn KHÁCH HUỶ không ghi sau hạn hoàn cọc (ngày khởi hành muộn nhất / ngày huỷ + 60).
    code: "R-BIL-C6",
    what: "khoản duyệt hoàn cọc của đơn khách huỷ nằm trong hạn",
    sql: `SELECT count(*) FROM bil_deposit_approval a JOIN v_ord_cancel_state c ON c.order_id = a.order_id
     WHERE a.voids_id IS NULL AND c.group_code = 'KHACH_HUY' AND a.approved_date > c.refund_deadline`,
    level: "fail",
  },

  // ---- Giấy tờ của người + xe (ADR-0040, Vận chuyển lượt 1a). Migration *_giay_to_cua_nguoi / *_van_chuyen_xe trở lên: D1 chưa áp thì các câu dưới lỗi
  // "no such table" → script thoát mã 2 (không phải dữ liệu sạch) — `npm run trien-khai` chạy kiểm SAU khi áp migration. Là LƯỚI THỨ HAI sau trigger/chỉ mục
  // của migration (bắt trường hợp trigger/chỉ mục bị gỡ nhầm hay SQL gõ tay đi vòng).
  {
    code: "R-PTY-2",
    what: "một số CCCD thuộc đúng một người (dòng chưa huỷ)",
    sql: `SELECT count(*) FROM (SELECT number_key FROM pty_person_document WHERE document_type_code = 'CCCD' AND voided_at IS NULL AND number_key IS NOT NULL
          GROUP BY number_key HAVING count(DISTINCT party_id) > 1)`,
    level: "fail",
  },
  {
    code: "R-PTY-3",
    what: "dòng gia hạn giấy tờ của người cùng người, cùng loại với dòng trước; mỗi dòng tối đa một dòng gia hạn chưa huỷ",
    sql: `SELECT (SELECT count(*) FROM pty_person_document n JOIN pty_person_document p ON p.id = n.previous_id
                  WHERE p.party_id <> n.party_id OR p.document_type_code <> n.document_type_code)
          + (SELECT count(*) FROM (SELECT previous_id FROM pty_person_document WHERE previous_id IS NOT NULL AND voided_at IS NULL GROUP BY previous_id HAVING count(*) > 1))`,
    level: "fail",
  },
  // R-PTY-4: nhật ký KHÔNG chứa số giấy tờ của người (ADR-0040 D2). So `detail` đã bỏ khoảng trắng . - / và viết HOA với mọi number_key dài ≥ 8 (số ngắn
  // hơn dễ trùng ngẫu nhiên với chữ khác). Mức warn-unless-strict: e2e chạy --strict nên ĐỎ; production (npm run trien-khai, không --strict) chỉ cảnh báo —
  // nhật ký chỉ-thêm, một dòng lỡ ghi không xoá được, "fail" sẽ đỏ vĩnh viễn và chặn mọi lần triển khai sau.
  {
    code: "R-PTY-4",
    what: "nhật ký không chứa số giấy tờ của người (CCCD, bằng lái…)",
    sql: `SELECT count(*) FROM audit_log a WHERE a.detail IS NOT NULL AND EXISTS (
            SELECT 1 FROM pty_person_document d WHERE d.number_key IS NOT NULL AND length(d.number_key) >= 8
              AND instr(upper(replace(replace(replace(replace(a.detail, ' ', ''), '.', ''), '-', ''), '/', '')), d.number_key) > 0)`,
    level: "warn-unless-strict",
    note: "nhật ký chỉ-thêm — không gỡ được; báo chủ dự án ngay, đây là dữ liệu cá nhân (số giấy tờ lọt vào nhật ký — tìm route ghi sai)",
  },
  // R-PTY-5 (ADR-0048 B1.2): quan hệ "Tài xế của" đang mở đi từ hồ sơ NGƯỜI — lưới thứ hai của trigger pty_relationship_drives_for_person (chỉ canh INSERT).
  // KHÔNG kiểm "đầu tới đang là nhà xe": nhà xe thôi hợp tác (đóng vai) thì quan hệ còn mở vẫn hợp lệ (ADR-0048 D1 — quan hệ không tự đóng).
  {
    code: "R-PTY-5",
    what: "quan hệ 'Tài xế của' đang mở đi từ hồ sơ cá nhân (người lái), không từ hồ sơ tổ chức",
    sql: `SELECT count(*) FROM pty_party_relationship r JOIN pty_party p ON p.id = r.from_party_id
     WHERE r.relationship_type_code = 'DRIVES_FOR' AND r.valid_to_date IS NULL AND p.party_kind <> 'PERSON'`,
    level: "fail",
  },
  // R-PTY-6 (đặc tả 2026-09-29 Transportation Kernel, K-05 / lỗ LH-06): API "Kết thúc" vai / quan hệ nhận ngày BẤT KỲ, còn mọi nơi đọc "đang mở" chỉ xét
  // `valid_to_date IS NULL` — ghi ngày tương lai là đóng NGAY (màn hiện ngày tương lai). Giao diện luôn gửi hôm nay; chỉ gọi API tay mới gặp. Hôm nay theo
  // giờ Việt Nam = `date('now', '+7 hours')` (như migration; `date('now')` là UTC). Mức warn: chỉ PHÁT HIỆN, không chặn — đổi luật nhận ngày là việc của parties.
  {
    code: "R-PTY-6",
    what: "vai hồ sơ / quan hệ hồ sơ có ngày kết thúc sau hôm nay (giờ Việt Nam)",
    sql: `SELECT (SELECT count(*) FROM pty_party_role WHERE valid_to_date > date('now', '+7 hours'))
          + (SELECT count(*) FROM pty_party_relationship WHERE valid_to_date > date('now', '+7 hours'))`,
    level: "warn",
    note: "cảnh báo, không chặn phát hành: vai / quan hệ này đã bị coi là KẾT THÚC từ lúc bấm, dù màn hiện ngày trong tương lai — Quản trị xem lại dòng đó (ai gọi API với ngày tương lai)",
  },
  {
    code: "R-VC-1",
    what: "biển số không trùng giữa các xe chưa ngừng",
    sql: "SELECT count(*) FROM (SELECT plate_key FROM vc_vehicle WHERE status <> 'retired' GROUP BY plate_key HAVING count(*) > 1)",
    level: "fail",
  },
  {
    code: "R-VC-2",
    what: "dòng gia hạn giấy tờ xe cùng xe, cùng loại với dòng trước; mỗi dòng tối đa một dòng gia hạn chưa huỷ",
    sql: `SELECT (SELECT count(*) FROM vc_vehicle_document n JOIN vc_vehicle_document p ON p.id = n.previous_id
                  WHERE p.vehicle_id <> n.vehicle_id OR p.document_type_code <> n.document_type_code)
          + (SELECT count(*) FROM (SELECT previous_id FROM vc_vehicle_document WHERE previous_id IS NOT NULL AND voided_at IS NULL GROUP BY previous_id HAVING count(*) > 1))`,
    level: "fail",
  },
  // R-VC-11 (đặc tả 2026-09-29 Transportation Kernel, K-01 / lỗ LH-04; R-VC-3…10 đã giữ cho ADR-0049): bấm "Thêm Kiểm định" thay vì "Gia hạn" từng sinh HAI
  // chuỗi song song. Route "Thêm giấy tờ" (409 `document_type_exists`) và trigger `vc_vehicle_document_one_current` (ADR-0056 VK3-B, migration 0068) chặn dòng
  // song song MỚI; câu này đếm dòng CŨ có trước trigger. Đếm CẶP (xe chưa ngừng, loại) có ≥ 2 dòng hiện hành. Chỉ đếm số (không biển số, không số giấy tờ).
  // Mức warn: Quản trị huỷ dòng nhập nhầm, không chặn phát hành.
  {
    code: "R-VC-11",
    what: "xe chưa ngừng có từ 2 dòng giấy tờ HIỆN HÀNH cùng loại trở lên (hai chuỗi giấy tờ song song)",
    sql: `SELECT count(*) FROM (SELECT d.vehicle_id, d.document_type_code FROM vc_vehicle_document d JOIN vc_vehicle v ON v.id = d.vehicle_id
          WHERE v.status <> 'retired' AND ${HIEN_HANH_GIAY_TO_XE}
          GROUP BY d.vehicle_id, d.document_type_code HAVING count(*) > 1)`,
    level: "warn",
    note: "cảnh báo, không chặn phát hành: có xe mang hai dòng giấy tờ cùng loại cùng đang dùng (bấm 'Thêm' thay vì 'Gia hạn') — Quản trị mở giấy tờ của xe, huỷ dòng nhập nhầm",
  },
  // ---- ĐIỀU PHỐI XE lượt 1 (ADR-0049 D1–D3 — Task A17, TC-40; ADR-0050 + [SOI] K-02 — TC-54; mã R-VC-3…10, R-VC-12…16 do điều phối cấp). Lưới THỨ HAI sau
  // trigger / luật máy chủ; chỉ đếm (không biển số, không tên, không số giấy tờ). Mức theo kế hoạch: fail = dữ liệu hỏng; warn = tình trạng cần người xem.
  {
    code: "R-VC-3",
    what: "chặng có số suất khách MỞ nhiều hơn số người của chặng (L-D1; chặng về có số người riêng — ADR-0054 D10.3)",
    sql: `SELECT count(*) FROM ord_transfer_leg l JOIN order_service s ON s.id = l.order_service_id
          WHERE (SELECT count(*) FROM vc_trip_allocation a WHERE a.leg_id = l.id AND a.kind = 'PASSENGER' AND a.valid_to_at IS NULL) > ${soNguoiChangSql("l", "s")}`,
    level: "warn",
    note: "cảnh báo: số khách của dịch vụ vừa GIẢM sau khi xếp (HDV sửa số khách) — văn phòng rút bớt suất khỏi xe",
  },
  {
    code: "R-VC-4",
    what: "bản chốt danh sách lúc xuất bến ít dòng hơn suất khách có tên + người đi kèm đang mở lúc đó (L-B1)",
    sql: `SELECT count(*) FROM vc_trip_departure_check c WHERE c.ket_qua = 'DAT'
          AND (SELECT count(*) FROM vc_trip_manifest m WHERE m.check_id = c.id)
            < (SELECT count(*) FROM vc_trip_allocation a WHERE a.trip_id = c.trip_id AND a.valid_from_at <= c.checked_at AND (a.valid_to_at IS NULL OR a.valid_to_at > c.checked_at)
                 AND (a.kind = 'CREW' OR a.passenger_key IS NOT NULL))`,
    level: "fail",
  },
  {
    code: "R-VC-5a",
    what: "chuyến ĐANG CHẠY có tài xế không đủ điều kiện lái (GPLX thiếu / hết hạn trước giờ kết thúc / hạng không chở đủ số chỗ) (L-B2)",
    sql: `SELECT count(*) FROM vc_trip t JOIN vc_trip_driver dr ON dr.trip_id = t.id AND dr.valid_to_at IS NULL JOIN vc_vehicle v ON v.id = t.vehicle_id
          WHERE t.status = 'RUNNING' AND ${TAI_XE_KHONG_DAT}`,
    level: "fail",
  },
  {
    code: "R-VC-5b",
    what: "chuyến CHƯA CHẠY xuất bến trong 48 giờ tới có tài xế không đủ điều kiện lái (L-B2)",
    sql: `SELECT count(*) FROM vc_trip t JOIN vc_trip_driver dr ON dr.trip_id = t.id AND dr.valid_to_at IS NULL JOIN vc_vehicle v ON v.id = t.vehicle_id
          WHERE t.status = 'PLANNED' AND t.planned_start_ms BETWEEN ${BAY_GIO_MS} AND ${BAY_GIO_MS} + 48 * 3600000 AND ${TAI_XE_KHONG_DAT}`,
    level: "warn",
    note: "cảnh báo: cổng xuất bến sẽ giữ chuyến — Quản trị cập nhật giấy tờ tài xế hoặc đổi tài xế",
  },
  {
    code: "R-VC-6",
    what: "sự kiện chuyến không có dòng nhật ký cùng id, hoặc nhật ký lệnh chuyến không có sự kiện cùng id",
    sql: `SELECT (SELECT count(*) FROM vc_trip_event e WHERE NOT EXISTS (SELECT 1 FROM audit_log a WHERE a.id = e.id))
          + (SELECT count(*) FROM audit_log a WHERE a.action IN (${HANH_DONG_CO_SU_KIEN.map((x) => `'${x}'`).join(", ")})
               AND NOT EXISTS (SELECT 1 FROM vc_trip_event e WHERE e.id = a.id))`,
    level: "fail",
  },
  {
    code: "R-VC-7",
    what: "chặng của đơn đã xác nhận, giờ đón đã vào mốc tối thiểu mà chưa xếp đủ khách lên xe",
    sql: `SELECT count(*) FROM ord_transfer_leg l JOIN orders o ON o.id = l.order_id JOIN order_service s ON s.id = l.order_service_id
          WHERE o.status = 'confirmed' AND l.closed_at IS NULL AND l.pickup_date IS NOT NULL AND l.pickup_time IS NOT NULL
            AND (l.pickup_date || ' ' || l.pickup_time) >= strftime('%Y-%m-%d %H:%M', 'now', '+7 hours')
            AND (l.pickup_date || ' ' || l.pickup_time) < strftime('%Y-%m-%d %H:%M', 'now', '+7 hours',
                  '+' || COALESCE((SELECT p.min_lead_minutes FROM vc_dispatch_policy p WHERE p.valid_from_at <= ${BAY_GIO_ISO} ORDER BY p.valid_from_at DESC LIMIT 1), 0) || ' minutes')
            AND (SELECT count(*) FROM vc_trip_allocation a JOIN vc_trip t ON t.id = a.trip_id
                  WHERE a.leg_id = l.id AND a.kind = 'PASSENGER' AND a.valid_to_at IS NULL AND t.status <> 'CANCELLED') < ${soNguoiChangSql("l", "s")}`,
    level: "warn",
    note: "cảnh báo: khách sắp tới giờ đón mà chưa có xe — văn phòng xếp ngay (trong mốc cần Quản trị phá lệ, trừ chặng đặt gấp)",
  },
  {
    code: "R-VC-8",
    what: "chuyến chưa kết thúc dùng xe của nhà xe đã thôi hợp tác, hoặc tài xế không còn là tài xế của nhà xe đó (B1.5)",
    sql: `SELECT (SELECT count(*) FROM vc_trip t WHERE t.status IN ('PLANNED', 'RUNNING')
                    AND EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = t.carrier_party_id AND r.role_type_code = 'CARRIER')
                    AND NOT EXISTS (SELECT 1 FROM v_pty_carrier c WHERE c.party_id = t.carrier_party_id))
          + (SELECT count(*) FROM vc_trip t JOIN vc_trip_driver dr ON dr.trip_id = t.id AND dr.valid_to_at IS NULL
              WHERE t.status IN ('PLANNED', 'RUNNING')
                AND EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = t.carrier_party_id AND r.role_type_code = 'CARRIER')
                AND NOT EXISTS (SELECT 1 FROM v_pty_carrier_driver cd WHERE cd.carrier_party_id = t.carrier_party_id AND cd.driver_party_id = dr.driver_party_id))`,
    level: "warn",
    note: "cảnh báo: nhà xe / tài xế đã thôi sau khi xếp chuyến — văn phòng đổi xe hoặc tài xế",
  },
  {
    code: "R-VC-9",
    what: "chuyến chưa kết thúc chở quá số chỗ của xe, hoặc hai điểm dừng còn dùng trùng thứ tự",
    sql: `SELECT (SELECT count(*) FROM vc_trip t JOIN vc_vehicle v ON v.id = t.vehicle_id WHERE t.status IN ('PLANNED', 'RUNNING')
                    AND (SELECT count(*) FROM vc_trip_allocation a WHERE a.trip_id = t.id AND a.valid_to_at IS NULL AND a.status IN ('WAITING', 'BOARDED')) > v.passenger_capacity)
          + (SELECT count(*) FROM (SELECT s.trip_id, s.seq FROM vc_trip_stop s JOIN vc_trip t ON t.id = s.trip_id
                    WHERE t.status IN ('PLANNED', 'RUNNING') AND s.status NOT IN ('SKIPPED', 'MOVED') GROUP BY s.trip_id, s.seq HAVING count(*) > 1))`,
    level: "fail",
  },
  {
    code: "R-VC-10",
    what: "bản chốt trỏ dòng hành khách không thuộc đơn của chặng / không phải người của suất",
    sql: `SELECT count(*) FROM vc_trip_manifest m JOIN vc_trip_allocation a ON a.id = m.allocation_id
          WHERE m.passenger_row_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM ord_passenger p JOIN ord_transfer_leg l ON l.id = a.leg_id WHERE p.id = m.passenger_row_id AND p.order_id = l.order_id AND p.person_key = a.passenger_key)`,
    level: "fail",
  },
  {
    code: "R-VC-12",
    what: "cột giờ nghiệp vụ (xuất bến, kết thúc, đã tới, xong điểm) khác giờ xảy ra của sự kiện tương ứng",
    sql: `SELECT (SELECT count(*) FROM vc_trip t WHERE t.departed_at IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM vc_trip_event e WHERE e.trip_id = t.id AND e.kind = 'DEPARTED' AND e.occurred_at = t.departed_at AND e.occurred_ms = t.departed_ms))
          + (SELECT count(*) FROM vc_trip t WHERE t.ended_at IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM vc_trip_event e WHERE e.trip_id = t.id AND e.kind IN ('ENDED', 'ENDED_INTERRUPTED') AND e.occurred_at = t.ended_at AND e.occurred_ms = t.ended_ms))
          + (SELECT count(*) FROM vc_trip_stop s WHERE s.arrived_at IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM vc_trip_event e WHERE e.trip_id = s.trip_id AND e.kind = 'STOP_ARRIVED' AND e.stop_id = s.id AND e.occurred_at = s.arrived_at))
          + (SELECT count(*) FROM vc_trip_stop s WHERE s.done_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vc_trip_event e WHERE e.trip_id = s.trip_id AND e.occurred_at = s.done_at))`,
    level: "warn",
    note: "cảnh báo: giờ trên chuyến / điểm lệch giờ của sự kiện — dữ liệu sửa tay, xem nhật ký chuyến",
  },
  {
    code: "R-VC-13",
    what: "kết thúc khai lùi quá 15 phút mà chuyến kế cùng xe / tài xế đã xuất bến trong khoảng nghỉ tính theo GIỜ GHI NHẬN",
    sql: `SELECT count(*) FROM vc_trip_event k JOIN vc_trip t ON t.id = k.trip_id
            JOIN vc_trip n ON n.id <> t.id AND n.departed_ms IS NOT NULL AND (n.vehicle_id = t.vehicle_id OR EXISTS (
                  SELECT 1 FROM vc_trip_driver a JOIN vc_trip_driver b ON b.driver_party_id = a.driver_party_id
                   WHERE a.trip_id = t.id AND b.trip_id = n.id AND a.valid_to_at IS NULL AND b.valid_to_at IS NULL))
            JOIN vc_trip_event d ON d.trip_id = n.id AND d.kind = 'DEPARTED'
          WHERE k.kind IN ('ENDED', 'ENDED_INTERRUPTED') AND k.occurred_source = 'VAN_PHONG_KHAI'
            AND (julianday(k.created_at) - julianday(k.occurred_at)) * 1440 > 15
            AND d.occurred_ms >= k.occurred_ms
            AND (julianday(d.created_at) - julianday(k.created_at)) * 1440 < n.rest_minutes_snapshot`,
    level: "warn",
    note: "cảnh báo: khoảng nghỉ chỉ đủ nhờ giờ kết thúc khai lùi — Quản trị xem lại giờ khai (ADR-0050 G-A3)",
  },
  {
    code: "R-VC-14",
    what: "xe chưa ngừng thiếu dòng hiện hành của một loại giấy tờ đang là điều kiện xuất bến",
    sql: `SELECT count(*) FROM vc_vehicle v JOIN vc_departure_rule r ON r.subject = 'VEHICLE' AND r.valid_from_at <= ${BAY_GIO_ISO}
            AND (r.valid_to_at IS NULL OR r.valid_to_at > ${BAY_GIO_ISO}) AND v.passenger_capacity >= r.min_capacity
          WHERE v.status <> 'retired' AND NOT EXISTS (
            SELECT 1 FROM vc_vehicle_document d WHERE d.vehicle_id = v.id AND d.document_type_code = r.vehicle_document_type_code AND ${HIEN_HANH_GIAY_TO_XE})`,
    level: "warn",
    note: "cảnh báo: xe này sẽ bị giữ ở cổng xuất bến — Quản trị thêm giấy tờ còn thiếu",
  },
  {
    code: "R-VC-15",
    what: "sự kiện của suất xảy ra sớm hơn lúc mở suất, hoặc 'đã tới' xảy ra sớm hơn lần đổi thứ tự điểm ghi trước nó",
    sql: `SELECT (SELECT count(*) FROM vc_trip_event e JOIN vc_trip_allocation a ON a.id = e.allocation_id
                    WHERE e.kind IN ('PASSENGER_BOARDED', 'PASSENGER_NO_SHOW', 'PASSENGER_CANCELLED_AT_STOP', 'PASSENGER_DROPPED') AND e.occurred_at < a.valid_from_at)
          + (SELECT count(*) FROM vc_trip_event e WHERE e.kind = 'STOP_ARRIVED' AND EXISTS (
                    SELECT 1 FROM vc_trip_event r WHERE r.trip_id = e.trip_id AND r.kind = 'STOPS_REORDERED' AND r.created_at < e.created_at AND e.occurred_at < r.created_at))`,
    level: "warn",
    note: "cảnh báo: giờ khai của văn phòng đi ngược thứ tự ghi nhận — xem nhật ký chuyến",
  },
  // Nới N3 (ADR-0052 :72, D5c — gói A5, ADR-0111): suất chuyển theo đề nghị cứu hộ ONBOARD lên ở NƠI GẶP (điểm danh mục của đề nghị) không phải "nơi hẹn đã
  // đổi" — bỏ qua vế điểm lên của suất đó; vế điểm xuống và mọi suất khác giữ nguyên.
  {
    code: "R-VC-16",
    what: "suất khách mở của chuyến chưa kết thúc có điểm DANH MỤC khác nơi đón / trả hiện hành của chặng (không phủ chữ tự do)",
    sql: `SELECT count(*) FROM vc_trip_allocation a JOIN vc_trip t ON t.id = a.trip_id JOIN ord_transfer_leg l ON l.id = a.leg_id
            LEFT JOIN vc_trip_stop b ON b.id = a.board_stop_id LEFT JOIN vc_trip_stop x ON x.id = a.alight_stop_id
          WHERE a.kind = 'PASSENGER' AND a.valid_to_at IS NULL AND t.status IN ('PLANNED', 'RUNNING')
            AND ((b.place_key GLOB 'L:*' AND b.place_key IS NOT ('L:' || l.pickup_location_id)
                  AND NOT EXISTS (SELECT 1 FROM vc_transfer_request r WHERE r.id = a.transfer_id AND r.scope = 'ONBOARD' AND r.meet_location_id IS b.location_id))
              OR (x.place_key GLOB 'L:*' AND x.place_key IS NOT ('L:' || l.dropoff_location_id)))`,
    level: "warn",
    note: "cảnh báo: nơi hẹn đã đổi sau khi xếp — văn phòng bấm \"Cập nhật điểm theo đơn\" (chuyến chưa chạy) hoặc báo tài xế (chuyến đang chạy)",
  },
  // ADR-0051 GB1 (mốc "giờ hẹn đã biết" — migration 0043; mã R-VC-17, R-VC-18 do điều phối cấp): lưới THỨ HAI sau trigger vc_trip_allocation_needs_appt và
  // vc_leg_appt_ack_chain — mức fail (dữ liệu hỏng, không phải việc vận hành — G-GB-4). R-VC-17 còn là lưới cho KHUNG THỬ: bộ gieo chèn thẳng suất khách mà quên
  // mốc XEP (tests/audit/gieo-vc.mjs `gieoMocXep`) làm đỏ đuôi `audit-invariants --strict` của e2e.
  {
    code: "R-VC-17",
    what: "suất khách đang mở mà chặng không có dòng mốc giờ hẹn nào",
    sql: `SELECT count(*) FROM vc_trip_allocation a
          WHERE a.kind = 'PASSENGER' AND a.valid_to_at IS NULL AND NOT EXISTS (SELECT 1 FROM vc_leg_appt_ack m WHERE m.leg_id = a.leg_id)`,
    level: "fail",
  },
  {
    code: "R-VC-18",
    what: "chuỗi mốc giờ hẹn của chặng hỏng: không bắt đầu từ seq 1 / đứt đoạn, seq 1 không phải XEP, giờ 'trước' lệch giờ của dòng trước",
    sql: `SELECT (SELECT count(*) FROM vc_leg_appt_ack m WHERE m.seq > 1 AND NOT EXISTS (
                    SELECT 1 FROM vc_leg_appt_ack p WHERE p.leg_id = m.leg_id AND p.seq = m.seq - 1 AND p.appt_date IS m.prev_appt_date AND p.appt_time IS m.prev_appt_time))
          + (SELECT count(*) FROM vc_leg_appt_ack WHERE seq = 1 AND kind <> 'XEP')
          + (SELECT count(*) FROM (SELECT leg_id FROM vc_leg_appt_ack GROUP BY leg_id HAVING min(seq) <> 1))`,
    level: "fail",
  },
  // N-19 (R-P19 — chủ "Trả lời lần 13": suất trỏ chặng / người bằng tham chiếu LOGIC, không khoá ngoại; "danh sách khách của xe trỏ tới người không còn" do máy
  // chủ VÀ kiểm định kỳ bắt). R-VC-10 phủ bản chốt; câu này phủ BA tham chiếu còn lại: hai của SUẤT + `vc_leg_appt_ack.leg_id` (ADR-0051 — vế thứ ba, điều
  // phối giao 30/9, cùng mã). GA-58: MỌI suất (mở lẫn đã đóng); "người còn" = CÓ dòng `ord_passenger` cùng `person_key`, thuộc đơn của chặng — dòng đã huỷ
  // (`voided_at`) / đã thay vẫn tính là còn (khách huỷ sau khi xếp là tình trạng nghiệp vụ: lý do giữ KHACH_DA_DOI + lệnh "Cập nhật khách theo đơn" — chủ lần 16, R-P29); mốc giờ hẹn: MỖI DÒNG trỏ chặng không còn
  // đếm một lần. Chỉ đếm.
  {
    code: "R-VC-19",
    what: "tham chiếu logic từ vận chuyển sang chặng / khách của đơn bị treo: suất trỏ chặng không còn hoặc người (passenger_key) không có dòng ord_passenger nào thuộc đơn của chặng; dòng mốc giờ hẹn trỏ chặng không còn",
    sql: `SELECT (SELECT count(*) FROM vc_trip_allocation a
                  WHERE (a.leg_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ord_transfer_leg l WHERE l.id = a.leg_id))
                     OR (a.passenger_key IS NOT NULL AND NOT EXISTS (
                           SELECT 1 FROM ord_passenger p JOIN ord_transfer_leg l ON l.id = a.leg_id WHERE p.person_key = a.passenger_key AND p.order_id = l.order_id)))
          + (SELECT count(*) FROM vc_leg_appt_ack m WHERE NOT EXISTS (SELECT 1 FROM ord_transfer_leg l WHERE l.id = m.leg_id))`,
    level: "fail",
  },
  // R-VC-20 (NT-D4 — ADR nháp nơi trả mặc định docs/superpowers/specs/2026-10-01-de-xuat-adr-noi-tra-mac-dinh.md, đã duyệt 1/10; 0058): mẫu đưa đón HIỆN HÀNH
  // (valid_from_at lớn nhất đã tới) của một dịch vụ trỏ điểm danh mục đã NGƯNG — form nhận `noiTraMacDinh: null` (ô trống), Quản trị cài lại. Tình trạng nghiệp
  // vụ hợp lệ ⇒ warn. Chỉ đếm số dịch vụ.
  {
    code: "R-VC-20",
    what: "dịch vụ có mẫu đưa đón hiện hành trỏ nơi trả mặc định đã ngưng dùng (Quản trị cài lại ở màn Danh mục)",
    sql: `SELECT count(*) FROM vc_leg_template t JOIN loc_location l ON l.id = t.default_dropoff_location_id
          WHERE l.active = 0 AND t.valid_from_at = (SELECT max(m.valid_from_at) FROM vc_leg_template m WHERE m.code = t.code AND m.valid_from_at <= ${BAY_GIO_ISO})`,
    level: "warn",
    note: "cảnh báo (không chặn phát hành): form lập đơn để trống nơi trả cho các dịch vụ này — Quản trị chọn lại nơi trả mặc định",
  },
  // R-VC-RATE-1 (ADR-0057 T1 B4, mức warn): dòng giá thuê xe ĐANG hoặc SẮP hiệu lực (ngày kết thúc chưa qua — giờ VN) của hồ sơ không còn vai Nhà xe — Kế toán /
  // Quản trị kết thúc dòng giá (màn bảng giá vẫn liệt kê nhà xe đã thôi còn giá mở để Kết thúc được). Trigger vc_rental_rate_carrier chỉ chặn lúc THÊM.
  {
    code: "R-VC-RATE-1",
    what: "dòng giá thuê xe còn hiệu lực của hồ sơ đã thôi vai nhà xe",
    sql: `SELECT count(*) FROM vc_rental_rate r WHERE COALESCE(r.valid_to_date, '9999-12-31') >= date('now', '+7 hours')
          AND r.carrier_party_id NOT IN (SELECT party_id FROM v_pty_carrier)`,
    level: "warn",
    note: "cảnh báo, không chặn phát hành: nhà xe đã thôi hợp tác mà còn giá — Kế toán / Quản trị bấm Kết thúc dòng giá",
  },
  // ADR-0057 T2 C8 — lưới thứ hai của chi phí chuyến xe thuê (kế hoạch Đợt 4 Task 11). NGOẠI LỆ CÓ TÊN của hàng rào "một nguồn tính" (src/tien-xe-mot-nguon.test.ts
  // chỉ quét src/**, web/**): các câu dưới dùng sum( để ĐỐI CHIẾU trên CSDL, không phải nguồn tính hiển thị. "Nguồn giá còn hiệu lực" = SNAPSHOT / AGREED chưa đảo.
  {
    code: "R-VC-COST-1",
    what: "chuyến xe thuê chưa huỷ có nhiều hơn một nguồn giá còn hiệu lực",
    sql: `SELECT count(*) FROM vc_trip t WHERE t.rented = 1 AND t.status <> 'CANCELLED' AND (SELECT count(*) FROM vc_trip_cost_line l WHERE l.trip_id = t.id
          AND l.kind IN ('SNAPSHOT','AGREED') AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line r WHERE r.reverses_id = l.id)) > 1`,
    level: "fail",
  },
  {
    code: "R-VC-COST-1b",
    what: "chuyến xe thuê chưa xuất bến đang thiếu giá (thông tin cho Kế toán)",
    sql: `SELECT count(*) FROM vc_trip t WHERE t.rented = 1 AND t.status = 'PLANNED' AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line l WHERE l.trip_id = t.id
          AND l.kind IN ('SNAPSHOT','AGREED') AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line r WHERE r.reverses_id = l.id))`,
    level: "warn",
    note: "thông tin: các chuyến này đang bị giữ 'chưa có giá' — Kế toán / Quản trị nhập giá",
  },
  {
    code: "R-VC-COST-2",
    what: "dòng đảo không đối dấu đúng dòng gốc cùng chuyến",
    sql: `SELECT count(*) FROM vc_trip_cost_line r LEFT JOIN vc_trip_cost_line g ON g.id = r.reverses_id
          WHERE r.kind = 'REVERSAL' AND (g.id IS NULL OR g.trip_id <> r.trip_id OR g.amount <> -r.amount OR g.kind = 'REVERSAL')`,
    level: "fail",
  },
  // TC-10 của kế hoạch (người kiểm soi): "nguồn giá chưa đảo HOẶC tổng ≠ 0" — chuyến đổi từ xe nhà xe sang xe công ty giữ các dòng ĐÃ ĐẢO (tổng 0), chữ ADR
  // "không có dòng" sẽ báo nhầm.
  {
    code: "R-VC-COST-3",
    // ADR-0095 Q5 (vòng sửa 2, 4.7; siết vòng sửa 3): tổng ≠ 0 được phép CHỈ gồm "Phí huỷ muộn" cho NHÀ XE CŨ — ADJUSTMENT CPX_HUY_MUON mang nhà xe khác chủ
    // xe hiện tại VÀ đã từng có dòng nguồn giá (SNAPSHOT / AGREED) trên CHÍNH chuyến đó — cùng các dòng đảo của chính chúng; mọi dòng khác phải cộng về 0.
    what: "chuyến không phải xe thuê còn nguồn giá chưa đảo hoặc tổng chi phí khác 0 (ngoài phí huỷ muộn cho nhà xe cũ)",
    sql: `SELECT count(*) FROM vc_trip t WHERE t.rented = 0 AND t.status <> 'CANCELLED' AND (
            EXISTS (SELECT 1 FROM vc_trip_cost_line l WHERE l.trip_id = t.id AND l.kind IN ('SNAPSHOT','AGREED') AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line r WHERE r.reverses_id = l.id))
            OR (SELECT COALESCE(sum(l.amount), 0) FROM vc_trip_cost_line l WHERE l.trip_id = t.id)
            <> (SELECT COALESCE(sum(l.amount), 0) FROM vc_trip_cost_line l LEFT JOIN vc_trip_cost_line g ON g.id = l.reverses_id
                WHERE l.trip_id = t.id AND l.carrier_party_id <> t.carrier_party_id
                  AND EXISTS (SELECT 1 FROM vc_trip_cost_line s WHERE s.trip_id = t.id AND s.kind IN ('SNAPSHOT','AGREED') AND s.carrier_party_id = l.carrier_party_id)
                  AND ((l.kind = 'ADJUSTMENT' AND l.reason_code = 'CPX_HUY_MUON') OR (l.kind = 'REVERSAL' AND g.kind = 'ADJUSTMENT' AND g.reason_code = 'CPX_HUY_MUON'))))`,
    level: "fail",
  },
  {
    code: "R-VC-COST-4",
    // Vòng sửa 1 (người kiểm V-1, điều phối chốt phương án a): vế phải = MỌI dòng ghi SAU lúc huỷ, không lọc lý do (phí huỷ muộn rồi "Nhập sai" là luồng hợp lệ).
    // "Sau lúc huỷ" = mốc giờ ≥ sự kiện huỷ VÀ không thuộc chính lô huỷ (dấu lệnh khác id sự kiện huỷ — dòng đảo của lô huỷ cùng mốc giờ). Tức: mọi dòng trước
    // và trong lô huỷ phải cộng về 0 ("chuyến huỷ chỉ còn tiền phát sinh sau huỷ"). MỐC HUỶ = created_at của sự kiện CANCELLED mới nhất — CÙNG mốc máy chủ dùng
    // cho ngày huỷ mặc định của điều chỉnh (tien-xe-repo `vc_trip_cancelled_at`; vòng sửa 3).
    what: "chuyến đã huỷ có tiền chi phí còn treo từ trước lúc huỷ (tổng khác tổng các dòng ghi sau lúc huỷ)",
    sql: `SELECT count(*) FROM vc_trip t WHERE t.status = 'CANCELLED'
          AND (SELECT COALESCE(sum(l.amount), 0) FROM vc_trip_cost_line l WHERE l.trip_id = t.id)
           <> (SELECT COALESCE(sum(l.amount), 0) FROM vc_trip_cost_line l
               JOIN (SELECT e.id, e.created_at FROM vc_trip_event e WHERE e.trip_id = t.id AND e.kind = 'CANCELLED' ORDER BY e.created_at DESC LIMIT 1) h
               WHERE l.trip_id = t.id AND l.created_at >= h.created_at AND l.cmd_id <> h.id)`,
    level: "fail",
  },
  {
    code: "R-VC-COST-5",
    what: "chuyến xe thuê đã xuất bến mà không có nguồn giá còn hiệu lực",
    sql: `SELECT count(*) FROM vc_trip t WHERE t.rented = 1 AND t.status IN ('RUNNING','ENDED','ENDED_INTERRUPTED') AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line l
          WHERE l.trip_id = t.id AND l.kind IN ('SNAPSHOT','AGREED') AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line r WHERE r.reverses_id = l.id))`,
    level: "fail",
  },
  {
    code: "R-VC-COST-6",
    what: "chuyến chưa huỷ không đánh dấu xe thuê mà chủ xe không phải công ty chủ hiện tại (kẽ C2a — nợ N-T1)",
    sql: `SELECT count(*) FROM vc_trip t WHERE t.rented = 0 AND t.status <> 'CANCELLED' AND t.carrier_party_id NOT IN (SELECT party_id FROM v_pty_owner_company)`,
    level: "warn",
    note: "cảnh báo (chấp nhận ồn): có thể là xe của nhà xe đã thôi hợp tác bị xếp như xe công ty, hoặc xe của công ty chủ cũ — Quản trị xem",
  },

  // ADR-0095 Q5b (chủ chọn E1, 2/10): phí huỷ của nhà xe cũ VẪN bị lô lệnh chuyến đảo theo luật chung (đổi xe / dời ngày / đổi tuyến / huỷ — `dongBiDaoKhi`);
  // Kế toán ghi lại nếu vẫn phải trả. Kiểm này để KHÔNG MẤT NỢ ÂM THẦM: dòng "Phí huỷ muộn" mang nhà xe khác chủ xe hiện tại, bị đảo TỰ ĐỘNG (dòng đảo do lô
  // lệnh: dấu lệnh ≠ id dòng — cùng nghĩa cờ `tuDong` của màn chi phí), mà SAU lúc đảo chưa có dòng "Phí huỷ muộn" mới cho cùng nhà xe trên chuyến đó.
  {
    code: "R-VC-COST-8",
    what: "phí huỷ muộn của nhà xe cũ bị đảo tự động khi đổi / huỷ chuyến mà chưa ghi lại (ADR-0095 Q5b)",
    sql: `SELECT count(*) FROM vc_trip_cost_line l JOIN vc_trip t ON t.id = l.trip_id
          JOIN vc_trip_cost_line r ON r.reverses_id = l.id AND r.kind = 'REVERSAL' AND r.cmd_id <> r.id
          WHERE l.kind = 'ADJUSTMENT' AND l.reason_code = 'CPX_HUY_MUON' AND l.carrier_party_id <> t.carrier_party_id
            AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line m WHERE m.trip_id = l.trip_id AND m.kind = 'ADJUSTMENT' AND m.reason_code = 'CPX_HUY_MUON'
                            AND m.carrier_party_id = l.carrier_party_id AND m.id <> l.id AND m.created_at >= r.created_at)`,
    level: "warn",
    note: "cảnh báo (không chặn phát hành): Kế toán xem chuyến — nếu vẫn phải trả nhà xe cũ thì ghi lại Phí huỷ muộn",
  },
  // R-VC-21 (ADR-0055 VK2-A, hệ quả 10 — lưới thứ hai của hai trigger khung bận, 0071): chuyến PLANNED/RUNNING chồng khung bận CÒN HIỆU LỰC của xe (nửa mở, so
  // với giờ kết thúc dự kiến). Chuyến đã kết thúc là lịch sử — không báo. Gặp: chuyến đang chạy quá giờ dự kiến lấn vào khung ghi sau (K8 của kế hoạch Đợt 3),
  // hoặc trigger bị gỡ nhầm. Chỉ đếm.
  {
    code: "R-VC-21",
    what: "chuyến chưa kết thúc chồng lịch xe bận còn hiệu lực",
    sql: `SELECT count(*) FROM vc_trip t JOIN vc_unavailability u ON u.subject = 'VEHICLE' AND u.vehicle_id = t.vehicle_id AND u.withdrawn_at IS NULL
          WHERE t.status IN ('PLANNED', 'RUNNING') AND t.planned_start_ms < u.end_ms AND u.start_ms < t.planned_end_ms`,
    level: "warn",
    note: "cảnh báo: văn phòng dời hoặc đổi xe chuyến, hoặc Quản trị rút lịch xe bận",
  },
  // ---- Xe đang chạy (ADR-0052 D5 — Vận chuyển Đợt 5, 0076): lưới thứ hai của trigger báo huỷ một lần, LC-15 ba đường, câu chốt D5.3a. Chỉ đếm, không tên. ----
  // R-VC-22 (D5.2): cờ báo huỷ của văn phòng phải đi cùng sự kiện ALLOCATION_OFFICE_CANCELLED của ĐÚNG suất, ghi CÙNG lúc; và lúc đặt cờ suất còn chờ —
  // không có sự kiện kết quả suất (đã đón / vắng / khách huỷ / đã trả) ghi TRƯỚC lúc đặt cờ. "Đã đón" SAU báo huỷ (báo nhầm) là hợp lệ.
  {
    code: "R-VC-22",
    what: "suất mang cờ văn phòng báo huỷ không có sự kiện báo huỷ đúng suất, hoặc đặt khi khách đã có kết quả",
    sql: `SELECT count(*) FROM vc_trip_allocation a
          WHERE a.office_cancel_at IS NOT NULL
            AND (NOT EXISTS (SELECT 1 FROM vc_trip_event e WHERE e.allocation_id = a.id AND e.kind = 'ALLOCATION_OFFICE_CANCELLED' AND e.created_at = a.office_cancel_at)
                 OR EXISTS (SELECT 1 FROM vc_trip_event e WHERE e.allocation_id = a.id
                              AND e.kind IN ('PASSENGER_BOARDED', 'PASSENGER_NO_SHOW', 'PASSENGER_CANCELLED_AT_STOP', 'PASSENGER_DROPPED') AND e.created_at < a.office_cancel_at))`,
    level: "fail",
  },
  // R-VC-23 (D5.1): điểm mang cờ "văn phòng thêm khi xe đang chạy" phải thuộc chuyến ĐÃ xuất bến và được tạo SAU giờ xuất bến (giờ xảy ra ≤ giờ ghi nhận).
  {
    code: "R-VC-23",
    what: "điểm mang cờ thêm khi xe đang chạy trên chuyến chưa xuất bến, hoặc tạo trước giờ xuất bến",
    sql: `SELECT count(*) FROM vc_trip_stop s JOIN vc_trip t ON t.id = s.trip_id
          WHERE s.added_while_running = 1 AND (t.departed_at IS NULL OR s.created_at < t.departed_at)`,
    level: "fail",
  },
  // R-VC-24 (D5.3a — lưới thứ hai của câu chốt vc_trip_stop_changed_balance): suất đóng STOP_CHANGED SAU giờ xuất bến phải có suất mở lại cùng chuyến, cùng
  // chặng, cùng khoá người (kể cả cùng "chưa tên"), mở bằng CHÍNH dấu lệnh đã đóng nó. Thiếu = khách bị gỡ khỏi xe đang chạy. Đóng trước xuất bến không xét.
  {
    code: "R-VC-24",
    what: "suất đổi điểm khi xe đang chạy bị đóng mà không mở lại cùng người, cùng chặng, cùng lệnh",
    sql: `SELECT count(*) FROM vc_trip_allocation a JOIN vc_trip t ON t.id = a.trip_id
          WHERE a.close_reason = 'STOP_CHANGED' AND a.valid_to_at IS NOT NULL AND t.departed_at IS NOT NULL AND a.valid_to_at >= t.departed_at
            AND NOT EXISTS (SELECT 1 FROM vc_trip_allocation b
                            WHERE b.trip_id = a.trip_id AND b.leg_id IS a.leg_id AND b.passenger_key IS a.passenger_key AND b.id <> a.id
                              AND a.closed_cmd_id IS NOT NULL AND b.opened_cmd_id = a.closed_cmd_id)`,
    level: "fail",
  },
  // R-VC-25 (Đợt 7, ADR-0056 VK3-A — mã do điều phối cấp; lưới thứ hai của luật cấu hình `kiemCamKet`, luật này không có trigger): chuyến ĐÃ xuất bến (RUNNING / ENDED /
  // ENDED_INTERRUPTED) trái cam kết của khách mà KHÔNG có dấu phá lệ cam kết. Khách mở lúc xuất bến = suất PASSENGER (suất CREW không tính) chưa đóng hoặc đóng SAU giờ xuất bến.
  // (a) chặng xe riêng (exclusive_vehicle = 1) mà trên chuyến còn suất khách của đơn KHÁC; (b) min_vehicle_seats lớn hơn số chỗ trong bản chụp xuất bến (lần kiểm ĐẠT
  // gần nhất, vc_trip_departure_check.passenger_capacity). Chuyến chưa chạy không xét (cổng xuất bến giữ). Mức warn: phá lệ hợp lệ có thể bị sửa tay sau này.
  {
    code: "R-VC-25",
    what: "chuyến đang chạy / đã chạy trái cam kết xe riêng hoặc số chỗ tối thiểu của khách mà không có phá lệ cam kết",
    sql: `SELECT count(*) FROM vc_trip t
          WHERE t.status IN ('RUNNING', 'ENDED', 'ENDED_INTERRUPTED') AND t.departed_at IS NOT NULL AND t.commitment_override_reason_code IS NULL
            AND (EXISTS (SELECT 1 FROM vc_trip_allocation a JOIN ord_transfer_leg l ON l.id = a.leg_id
                         WHERE a.trip_id = t.id AND a.kind = 'PASSENGER' AND (a.valid_to_at IS NULL OR a.valid_to_at > t.departed_at) AND l.exclusive_vehicle = 1
                           AND EXISTS (SELECT 1 FROM vc_trip_allocation b JOIN ord_transfer_leg m ON m.id = b.leg_id
                                       WHERE b.trip_id = t.id AND b.kind = 'PASSENGER' AND (b.valid_to_at IS NULL OR b.valid_to_at > t.departed_at) AND m.order_id <> l.order_id))
              OR EXISTS (SELECT 1 FROM vc_trip_allocation a JOIN ord_transfer_leg l ON l.id = a.leg_id
                         WHERE a.trip_id = t.id AND a.kind = 'PASSENGER' AND (a.valid_to_at IS NULL OR a.valid_to_at > t.departed_at) AND l.min_vehicle_seats IS NOT NULL
                           AND l.min_vehicle_seats > (SELECT k.passenger_capacity FROM vc_trip_departure_check k WHERE k.trip_id = t.id AND k.ket_qua = 'DAT' ORDER BY k.checked_at DESC LIMIT 1)))`,
    level: "warn",
    note: "cảnh báo: chuyến đã xuất bến trái cam kết xe riêng / số chỗ của khách mà không có phá lệ — rà lại chuyến và lý do",
  },
  // ---- Tài xế đối tác: Từ chối chuyến, Báo bận, hạn theo cặp (ADR-0053 D8, D9 — kế hoạch A4 T11, migration 0092). Lưới thứ hai của trigger; chỉ đếm, không tên. ----
  // R-VC-26 (B8.2 — trigger tc82_self): dòng lái đóng REFUSED phải do CHÍNH tài xế của dòng đóng (người đóng theo hồ sơ). Văn phòng / Toàn quyền không từ chối thay.
  {
    code: "R-VC-26",
    what: "dòng lái đóng 'tài xế từ chối' mà người đóng không phải chính tài xế",
    sql: `SELECT count(*) FROM vc_trip_driver d WHERE d.close_reason = 'REFUSED' AND d.closed_by_party_id IS NOT d.driver_party_id`,
    level: "fail",
  },
  // R-VC-27 (B8.3 — trigger tc83_deadline): Từ chối chỉ khi chuyến còn chưa chạy. Dòng REFUSED ghi lúc / sau giờ xuất bến thật = lọt trigger. (Không so với
  // hạn: hạn chỉ GIẢM khi dời chuyến sớm hơn, một lần từ chối hợp lệ có thể nằm sau hạn mới — báo nhầm.)
  {
    code: "R-VC-27",
    what: "tài xế từ chối chuyến lúc hoặc sau giờ xuất bến thật",
    sql: `SELECT count(*) FROM vc_trip_driver d JOIN vc_trip t ON t.id = d.trip_id
          WHERE d.close_reason = 'REFUSED' AND t.departed_at IS NOT NULL AND d.valid_to_at >= t.departed_at`,
    level: "fail",
  },
  // R-VC-28 (B9.2, B9.3 — trigger vc_unavailability_overlaps_driver_trip, vc_trip_driver_unavailable_*): khung bận DRIVER còn hiệu lực chồng (nửa mở, giờ dự
  // kiến) chuyến chưa kết thúc mà người đó đang lái. Mức warn như R-VC-21: chuyến đang chạy quá giờ dự kiến có thể lấn vào khung ghi sau.
  {
    code: "R-VC-28",
    what: "chuyến chưa kết thúc đang xếp cho tài xế chồng khung báo bận còn hiệu lực của chính người đó",
    sql: `SELECT count(*) FROM vc_trip t JOIN vc_trip_driver d ON d.trip_id = t.id AND d.valid_to_at IS NULL
          JOIN vc_unavailability u ON u.subject = 'DRIVER' AND u.driver_party_id = d.driver_party_id AND u.withdrawn_at IS NULL
          WHERE t.status IN ('PLANNED', 'RUNNING') AND t.planned_start_ms < u.end_ms AND u.start_ms < t.planned_end_ms`,
    level: "warn",
    note: "cảnh báo: văn phòng đổi tài xế / dời chuyến, hoặc tài xế rút khung bận",
  },
  // R-VC-29 (D8.1 — trigger vc_trip_driver_refuse_deadline_ins + gieo của 0092): mọi dòng lái ĐANG MỞ có dòng hạn Từ chối của đúng cặp (tài xế, chuyến). Thiếu
  // = tài xế đối tác không bao giờ thấy khách / mã đơn (khung đóng mặc định — G-A4-2) và không Từ chối được.
  {
    code: "R-VC-29",
    what: "dòng lái đang mở thiếu hạn từ chối của cặp tài xế – chuyến",
    sql: `SELECT count(*) FROM vc_trip_driver d WHERE d.valid_to_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM vc_refuse_deadline r WHERE r.trip_id = d.trip_id AND r.driver_party_id = d.driver_party_id)`,
    level: "fail",
  },
  // R-VC-30 (D8, cảnh báo vận hành): chuyến chưa chạy xuất bến trong 48 giờ tới mà chưa có tài xế (vd. tài xế vừa Từ chối, văn phòng chưa xếp người khác).
  // Giờ hiện tại của CSDL — chỉ để cảnh báo, không chặn.
  {
    code: "R-VC-30",
    what: "chuyến chưa chạy xuất bến trong 48 giờ tới mà chưa có tài xế",
    sql: `SELECT count(*) FROM vc_trip t
          WHERE t.status = 'PLANNED'
            AND t.planned_start_ms >= CAST(strftime('%s', 'now') AS INTEGER) * 1000
            AND t.planned_start_ms < CAST(strftime('%s', 'now') AS INTEGER) * 1000 + 48 * 3600000
            AND NOT EXISTS (SELECT 1 FROM vc_trip_driver d WHERE d.trip_id = t.id AND d.valid_to_at IS NULL)`,
    level: "warn",
    note: "cảnh báo: xếp tài xế cho chuyến sắp chạy (kể cả chuyến tài xế vừa từ chối)",
  },
  // R-VC-THU-TU (ADR-0096 Đ1.5, gói A1 — 0084): chuyến ĐANG CHẠY có suất mở CHỜ LÊN mà điểm xuống đứng trước / bằng số điểm lên. Lưới thứ hai của đường đổi thứ
  // tự khi đang chạy — đường này KHÔNG có trigger theo dòng (Đ1.6: lô đổi nhiều điểm đi qua trạng thái trung gian), lớp máy chủ là `chanDaoMoi`. Chuyến kế hoạch
  // vi phạm là "đang bị giữ" hợp lệ (cổng xuất bến LC-19 chặn) — không đếm. Chỉ đếm, không tên.
  {
    code: "R-VC-THU-TU",
    what: "chuyến đang chạy có khách chờ lên mà điểm trả đứng trước điểm đón (ADR-0096 Đ1)",
    sql: `SELECT count(*) FROM vc_trip_allocation a JOIN vc_trip t ON t.id = a.trip_id AND t.status = 'RUNNING'
          JOIN vc_trip_stop b ON b.id = a.board_stop_id JOIN vc_trip_stop d ON d.id = a.alight_stop_id
          WHERE a.valid_to_at IS NULL AND a.status = 'WAITING' AND d.seq <= b.seq`,
    level: "fail",
  },

  // R-VC-SUA-1 (ADR-0097 "Hệ quả", gói A1 — 0085): lưới thứ hai sau trigger LC-15 / câu chốt vc_trip_correction_balance / vc_trip_revoke_no_progress. Đếm (a) suất
  // đóng bởi lô CORRECTION (đóng REMOVED, dấu lệnh = sự kiện CORRECTION trỏ chính nó) mà không có ĐÚNG một suất thay thế trỏ về nó cùng chặng, người, điểm lên,
  // điểm xuống, mở cùng dấu lệnh — hoặc suất có tên mà suất thay thế thiếu dòng bản chốt thêm sau xuất bến; (b) suất mang corrects_allocation_id mà không do
  // lô CORRECTION mở; (c) DEPARTURE_REVOKED không đứng sau một DEPARTED, hoặc đứng sau một sự kiện tiến độ của lần chạy đó (thứ tự chèn — rowid). Chỉ đếm.
  // Gói A5 (0093 (6), ADR-0111 Đ5): "tiến độ" theo ĐÚNG trigger vc_trip_revoke_no_progress mới — đề nghị chưa thành ở chuyến (TRANSFER_* trừ CONFIRMED) không
  // tính; TRANSFER_CONFIRMED có related_trip_id = chuyến (xe đã giao khách) thì tính.
  {
    code: "R-VC-SUA-1",
    what: "điều chỉnh kết quả khách thiếu / thừa suất thay thế hoặc bản chốt; thu hồi xuất bến sau khi đã có tiến độ (ADR-0097)",
    sql: `SELECT (SELECT count(*) FROM vc_trip_allocation c JOIN vc_trip_event e ON e.id = c.closed_cmd_id AND e.kind = 'CORRECTION' AND e.allocation_id = c.id
                  WHERE (SELECT count(*) FROM vc_trip_allocation n WHERE n.corrects_allocation_id = c.id AND n.trip_id = c.trip_id AND n.opened_cmd_id = e.id
                           AND n.leg_id IS c.leg_id AND n.passenger_key IS c.passenger_key AND n.board_stop_id IS c.board_stop_id AND n.alight_stop_id IS c.alight_stop_id) <> 1
                     OR (c.passenger_key IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vc_trip_allocation n JOIN vc_trip_manifest m ON m.allocation_id = n.id AND m.added_after_departure = 1
                                                                     WHERE n.corrects_allocation_id = c.id)))
          + (SELECT count(*) FROM vc_trip_allocation n WHERE n.corrects_allocation_id IS NOT NULL AND NOT EXISTS (
                  SELECT 1 FROM vc_trip_event e JOIN vc_trip_allocation c ON c.id = e.allocation_id
                   WHERE e.id = n.opened_cmd_id AND e.kind = 'CORRECTION' AND e.allocation_id = n.corrects_allocation_id AND c.closed_cmd_id = e.id AND c.close_reason = 'REMOVED'))
          + (SELECT count(*) FROM vc_trip_event r WHERE r.kind = 'DEPARTURE_REVOKED' AND (
                  NOT EXISTS (SELECT 1 FROM vc_trip_event d WHERE d.trip_id = r.trip_id AND d.kind = 'DEPARTED' AND d.rowid < r.rowid)
                  OR EXISTS (SELECT 1 FROM vc_trip_event x WHERE x.rowid < r.rowid
                               AND ((x.trip_id = r.trip_id AND x.kind NOT IN ('DEPARTED', 'DEPARTURE_REVOKED', 'TRANSFER_SENT', 'TRANSFER_WITHDRAWN', 'TRANSFER_DECLINED',
                                                                              'TRANSFER_EXPIRED', 'TRANSFER_ESCALATED', 'TRANSFER_REJECTED'))
                                 OR (x.related_trip_id = r.trip_id AND x.kind = 'TRANSFER_CONFIRMED'))
                               AND x.rowid > (SELECT max(d.rowid) FROM vc_trip_event d WHERE d.trip_id = r.trip_id AND d.kind = 'DEPARTED' AND d.rowid < r.rowid))))`,
    level: "fail",
  },

  // ---- CHUYỂN KHÁCH GIỮA HAI XE (ADR-0111, ADR-0052 D4 / D5c — gói A5, migration 0093; mã R-VC-31…35: ĐỔI từ R-VC-26…30 khi nhập nền A4, vì A4 đã dùng R-VC-26…30). Lưới THỨ HAI sau trigger của 0093;
  // cân đóng = mở (R-VC-31) KHÔNG có trigger theo dòng — đây là lưới duy nhất ("phát hiện, không chặn"). Chỉ đếm, không tên.
  // R-VC-31 (Đ3 a): đề nghị CONFIRMED — số suất đóng TRANSFERRED trỏ về nó ≠ số suất mở mang transfer_id của nó (đếm mọi dòng: suất mở vì chuyển có thể đã đóng
  // sau đó vì lý do khác; suất mở lại bởi lệnh khác không mang transfer_id).
  {
    code: "R-VC-31",
    what: "đề nghị chuyển khách đã xác nhận mà số suất đóng ở xe nhờ khác số suất mở ở xe nhận",
    sql: `SELECT count(*) FROM vc_transfer_request r WHERE r.status = 'CONFIRMED'
            AND (SELECT count(*) FROM vc_trip_allocation a WHERE a.closed_transfer_id = r.id) <> (SELECT count(*) FROM vc_trip_allocation a WHERE a.transfer_id = r.id)`,
    level: "fail",
  },
  // R-VC-32 (Đ3 a): suất đóng TRANSFERRED thiếu đề nghị, hoặc suất đóng / mở trỏ đề nghị chưa CONFIRMED (CHECK của bảng giữ "TRANSFERRED ⇔ closed_transfer_id";
  // vế đầu là lưới khi bảng dựng lại mất CHECK).
  {
    code: "R-VC-32",
    what: "suất chuyển khách (đóng TRANSFERRED / mở theo đề nghị) thiếu đề nghị hoặc trỏ đề nghị chưa xác nhận",
    sql: `SELECT count(*) FROM vc_trip_allocation a
          WHERE (a.close_reason = 'TRANSFERRED' AND a.closed_transfer_id IS NULL)
             OR (a.closed_transfer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vc_transfer_request r WHERE r.id = a.closed_transfer_id AND r.status = 'CONFIRMED'))
             OR (a.transfer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vc_transfer_request r WHERE r.id = a.transfer_id AND r.status = 'CONFIRMED'))`,
    level: "fail",
  },
  // R-VC-33 (Đ1, D4): đề nghị CONFIRMED (máy hay người) mà dòng kiểm của LẦN QUYẾT (decided_cmd_id) có điều kiện tầng LOI không đạt — tầng LOI không phá lệ được.
  {
    code: "R-VC-33",
    what: "đề nghị chuyển khách đã xác nhận dù điều kiện bắt buộc (tầng lỗi) không đạt ở lần quyết",
    sql: `SELECT count(*) FROM vc_transfer_request r WHERE r.status = 'CONFIRMED' AND EXISTS (
            SELECT 1 FROM vc_transfer_check c WHERE c.transfer_id = r.id AND c.cmd_id = r.decided_cmd_id AND c.rule_tier = 'LOI' AND c.ket_qua = 'KHONG_DAT')`,
    level: "fail",
  },
  // R-VC-34 (Đ1): tầng ghi ở dòng kiểm khác tầng của danh mục (tầng danh mục không đổi được — trigger ck_rule_identity), hoặc mã ngoài danh mục.
  {
    code: "R-VC-34",
    what: "dòng kiểm chuyển khách ghi tầng lệch danh mục điều kiện",
    sql: `SELECT count(*) FROM vc_transfer_check c WHERE c.rule_tier IS NOT (SELECT d.tier FROM vc_transfer_rule d WHERE d.code = c.rule_code)`,
    level: "fail",
  },
  // R-VC-35 (MQ-09, ADR-0052 :61 / :79): đề nghị Chờ / Leo thang mà nguồn hoặc đích đã đổi — lô của lệnh làm đổi phải tự huỷ (VOID) cùng lô. Điểm nguồn (STOP) hết
  // PENDING; xe nhờ hết RUNNING; xe nhận hết PLANNED / RUNNING. (Tập khách đổi mà điểm vẫn PENDING không xét: máy chủ chặn 409 lúc quyết — ck_khach_doi.)
  {
    code: "R-VC-35",
    what: "đề nghị chuyển khách còn chờ / leo thang dù điểm nguồn đã qua hoặc xe nhờ / xe nhận đã kết thúc, huỷ",
    sql: `SELECT count(*) FROM vc_transfer_request r JOIN vc_trip f ON f.id = r.from_trip_id JOIN vc_trip t ON t.id = r.to_trip_id
          WHERE r.status IN ('PENDING', 'ESCALATED')
            AND (f.status <> 'RUNNING' OR t.status NOT IN ('PLANNED', 'RUNNING')
              OR (r.scope = 'STOP' AND (SELECT s.status FROM vc_trip_stop s WHERE s.id = r.from_stop_id) IS NOT 'PENDING'))`,
    level: "fail",
  },

  // ---- Người phụ trách đơn (ADR-0006 điều 3, ADR-0009). Migration 0014 trở lên: trên D1 chưa có 0014 các câu dưới lỗi "no such table" → script thoát mã 2. ----
  // R-DSP-1: chỉ mục duy nhất một phần đã chặn ở CSDL; kiểm này bắt trường hợp chỉ mục bị gỡ/sửa nhầm.
  {
    code: "R-DSP-1",
    what: "mỗi đơn tối đa một người phụ trách (HANDLE) đang mở",
    sql: "SELECT count(*) FROM (SELECT order_id FROM dsp_assignment WHERE task_kind_code = 'HANDLE' AND valid_to_at IS NULL GROUP BY order_id HAVING count(*) > 1)",
    level: "fail",
  },
  // R-DSP-2a: HANDLE đang mở mà hồ sơ KHÔNG có tài khoản, hoặc không tài khoản nào còn quyền đủ điều kiện làm người phụ trách đang hiệu lực (kể cả đã ngưng
  // hay chưa — xem handlerAccountEligible). Người đó không sửa/huỷ được đơn (ADR-0009 điều 5, ADR-0014 điều 6/11) và không ai nhìn thấy đơn "mồ côi" trên
  // màn hình của mình: phải giao lại. Đỏ khi --strict (mức của e2e và của lần phát hành 2).
  {
    code: "R-DSP-2a",
    what: "người phụ trách đang mở là hồ sơ có tài khoản còn quyền Bán hàng/Quản trị/Hướng dẫn viên",
    sql: `SELECT count(*) FROM dsp_assignment a WHERE a.task_kind_code = 'HANDLE' AND a.valid_to_at IS NULL AND NOT ${handlerAccountEligible()}`,
    level: "warn-unless-strict",
    note: "cảnh báo: người phụ trách không còn tài khoản/quyền đủ điều kiện — cần giao lại đơn; đỏ khi --strict",
  },
  // R-DSP-2b: (rời R-DSP-2a: có tài khoản CÒN quyền nhưng mọi tài khoản như vậy đã ngưng) — lịch sử hợp lệ lâu dài (người nghỉ việc vẫn đứng tên đơn cũ), chỉ cần rà soát.
  {
    code: "R-DSP-2b",
    what: "người phụ trách đang mở có tài khoản đã ngưng hoạt động",
    sql: `SELECT count(*) FROM dsp_assignment a WHERE a.task_kind_code = 'HANDLE' AND a.valid_to_at IS NULL
       AND ${handlerAccountEligible()} AND NOT ${handlerAccountEligible(" AND s.active = 1")}`,
    level: "warn",
    note: "cảnh báo, không làm hỏng kiểm: người phụ trách đã ngưng — nên giao lại các đơn còn mở",
  },
  // R-DSP-3: các dòng HANDLE của CÙNG một đơn không chồng lấn theo khoảng NỬA MỞ [valid_from_at, valid_to_at) (valid_to_at NULL = mở, tới vô cực). Đổi người = đóng dòng cũ và mở dòng
  // mới CÙNG một thời điểm: hai khoảng chỉ chạm đầu mút, KHÔNG chồng. Đây là LƯỚI THAY THẾ cho trigger chống chồng lấn của ADR-0003 điều 7 — LỆCH ADR-0003 điều 7 CÓ CHỦ Ý: migration 0014
  // không có trigger đó vì vị từ đóng mẫu của ADR coi hai đầu mút trùng là chồng lấn nên chặn luôn chính đường đổi người (xem ghi chú trong migrations/0014_dispatch.sql).
  // Nếu sau này muốn chặn ở CSDL thì dùng vị từ nửa mở tương ứng câu SQL này. Đếm số CẶP dòng chồng lấn (dấu thời gian ISO UTC cùng định dạng nên so chuỗi là đúng).
  {
    code: "R-DSP-3",
    what: "các dòng người phụ trách (HANDLE) của một đơn không chồng lấn theo khoảng nửa mở [từ, đến)",
    sql: `SELECT count(*) FROM dsp_assignment a JOIN dsp_assignment b ON a.id < b.id AND a.order_id = b.order_id
     WHERE a.task_kind_code = 'HANDLE' AND b.task_kind_code = 'HANDLE'
       AND a.valid_from_at < COALESCE(b.valid_to_at, '9999-12-31T23:59:59.999Z') AND b.valid_from_at < COALESCE(a.valid_to_at, '9999-12-31T23:59:59.999Z')`,
    level: "fail",
  },
  // R-ORD-4: seq của order_money_adjustment liên tục từ 1, không trùng, không nhảy cóc theo từng đơn — lưới thứ hai cho khoá lạc quan ở
  // insertMoneyAdjustment (P21: mọi kiểm soát trọng yếu có ≥ 2 lớp). Chỉ mục duy nhất idx_order_money_adjustment_seq là lưới thứ nhất (chặn ngay
  // lúc ghi); kiểm này phát hiện nếu có lỗ trong logic ghi (vd một đường code khác lỡ chèn thẳng, bỏ qua insertMoneyAdjustment).
  {
    code: "R-ORD-4",
    what: "seq của order_money_adjustment liên tục từ 1 theo từng đơn",
    sql: `SELECT count(*) FROM (
      SELECT order_id, seq, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY seq) AS rn
      FROM order_money_adjustment
    ) WHERE seq <> rn`,
    level: "fail",
  },
  // R-ORD-5 (Đợt E — bài học: HDV sửa số khách hậu xác nhận, /orders và Trang chủ hiện đúng TIỀN nhưng vẫn hiện số khách CŨ). Lớp ứng dụng đã
  // ép "liệt kê ĐÚNG tập dịch vụ từ danh mục của đơn, không thiếu không thừa" lúc GHI (`parseMoneyEditInput`, orders/money-adjustment.ts) —
  // đây là LƯỚI THỨ HAI cho chính bất biến đó, cùng tinh thần R-ORD-4 (P21: mọi kiểm soát trọng yếu có ≥ 2 lớp). Ý nghĩa: nếu `after_json` của
  // dòng điều chỉnh GẦN NHẤT của một đơn thiếu (hoặc thừa/sai) một dịch vụ từ danh mục của CHÍNH đơn đó, thì tóm tắt số khách ở `/orders`/Trang
  // chủ (`applyAdjustedPax`, orders/repository.ts) sẽ ÂM THẦM giữ số GỐC đã đóng băng cho đúng dịch vụ bị thiếu đó — chính loại lỗi vừa sửa,
  // nhưng do DỮ LIỆU hỏng thay vì do mã đọc sai. Không so trực tiếp order_service.pax_* với after_json: hai bên CỐ Ý khác nhau sau khi có điều
  // chỉnh (order_service đứng yên — trigger order_service_frozen_update, 0008 —, after_json mang số mới) nên so bằng SỐ SẼ SAI LUÔN.
  // PHẠM VI THẬT của kiểm này (Lỗi 5, kiểm độc lập Đợt E vòng 2 — chú thích cũ nói quá phạm vi, sửa theo CLAUDE.md §2 "tài liệu mô tả thua mã"):
  // CHỈ đếm SỐ LƯỢNG phần tử (kể cả trùng — Đợt E task 7 SIẾT thêm: số lượng PHẦN TỬ và số lượng serviceId PHÂN BIỆT phải bằng nhau, bắt được ca
  // "trùng một mã dịch vụ, lấp chỗ một dịch vụ khác đang thiếu" mà bản đếm-số-lượng-suông trước đây bỏ lọt) và đối chiếu `serviceId` — KHÔNG nhìn
  // vào BÊN TRONG từng `pax` (không kiểm đủ 4 trường adult/child/senior/infant, không kiểm đó có phải số nguyên ≥ 0 hay không). Một `after_json`
  // "hỏng dạng mềm" đúng tập serviceId nhưng MỘT `pax` thiếu/sai trường (chính kiểu hỏng gây ra Lỗi 1 ở tầng ứng dụng — lưới cho kiểu hỏng ĐÓ là
  // `money-adjustment.ts:parseAdjustmentAfter`, KHÔNG PHẢI kiểm này) LỌT HOÀN TOÀN qua kiểm R-ORD-5 — đây là nợ đã ghi ở báo cáo
  // `.superpowers/sdd/dot-e/task-6-report.md` (mục "Lỗi 5"), không phải lỗ hổng ngoài dự kiến.
  // AN TOÀN VỚI `after_json` HỎNG NẶNG (Lỗi 3, kiểm độc lập Đợt E vòng 2): `json_each`/`json_extract` NÉM LỖI THẬT (không phải trả 0 dòng) khi gặp
  // chuỗi không phải JSON hợp lệ — vì `audit-invariants.mjs` gộp MỌI kiểm vào MỘT lệnh `wrangler d1 execute` (xem chú thích đầu tệp đó), một dòng
  // hỏng như vậy làm CẢ LỆNH lỗi → CẢ ĐỢT rà soát thoát mã 2 ("không chạy được"), khoảng 30 quy tắc còn lại KHÔNG được kiểm — một cơ chế an toàn tự
  // làm mình im lặng, đứng trong CỔNG PHÁT HÀNH. `CASE WHEN ... THEN ... ELSE ...` (không phải `OR`/`AND`) vì CASE là NGỮ NGHĨA CHUẨN SQL đảm bảo chỉ
  // nhánh khớp được tính — không như `OR`, không có gì đảm bảo phía phải luôn được bỏ qua khi phía trái đã đúng. `json_valid()` AN TOÀN với MỌI
  // đầu vào (kể cả cú pháp hỏng) — không bao giờ ném lỗi, đây chính là hàm SQLite dựng sẵn cho việc này. `after_json` là `TEXT NOT NULL` (migration
  // 0021) nên không cần chặn SQL NULL. Đã đo bằng `node:sqlite` thật: `json_each('not json')` ném lỗi "malformed JSON"; CASE-guard cho ra đúng kết
  // quả cũ với mọi ca hợp lệ (mảng đúng/rỗng) và trả 1 vi phạm (không ném lỗi) với JSON hỏng cú pháp hoặc JSON hợp lệ nhưng không phải mảng.
  {
    code: "R-ORD-5",
    what: "after_json của điều chỉnh gần nhất liệt kê ĐÚNG tập dịch vụ từ danh mục của đơn (không thiếu, không thừa, không trùng) — CHỈ đếm số lượng + đối chiếu serviceId, KHÔNG kiểm bên trong pax",
    sql: `SELECT count(*) FROM order_money_adjustment a
      WHERE a.seq = (SELECT MAX(seq) FROM order_money_adjustment b WHERE b.order_id = a.order_id)
        AND CASE
          WHEN NOT json_valid(a.after_json) THEN 1
          WHEN json_type(a.after_json) <> 'array' THEN 1
          ELSE (
            (SELECT count(*) FROM json_each(a.after_json)) <> (SELECT count(DISTINCT json_extract(je2.value, '$.serviceId')) FROM json_each(a.after_json) je2)
            OR (SELECT count(DISTINCT json_extract(je2.value, '$.serviceId')) FROM json_each(a.after_json) je2) <> (SELECT count(*) FROM order_service os WHERE os.order_id = a.order_id AND os.catalog_code IS NOT NULL)
            OR EXISTS (
              SELECT 1 FROM json_each(a.after_json) je
              WHERE NOT EXISTS (
                SELECT 1 FROM order_service os WHERE os.id = json_extract(je.value, '$.serviceId') AND os.order_id = a.order_id AND os.catalog_code IS NOT NULL
              )
            )
          )
        END`,
    level: "fail",
  },
  // R-ORD-6a/6b (Đợt E task 9 — kiểm độc lập chỉ ra "còn cửa cho lần thứ NĂM": R-ORD-5 chỉ so serviceId trong after_json với order_service, KHÔNG
  // so SỐ TIỀN đã lưu với số tính lại; Task 7 làm mọi nơi ĐỌC (chi tiết đơn, /api/orders, Trang chủ) ngừng tin cột subtotal_before/subtotal_after,
  // nên một đột biến làm nơi GHI (editMoneyAsHandler) hồi quy về đúng lỗi cũ — bỏ sót dịch vụ nhập tay khi cộng — không còn cổng dữ liệu nào bắt được,
  // dù MỌI bề mặt đọc vẫn hiện đúng số (chúng tự tính lại, không đọc cột này). Đây là LƯỚI THỨ HAI cho nơi ghi, cùng tinh thần R-ORD-4/5.
  // CHỦ Ý KHÔNG tái triển khai effectiveSubtotal (money-adjustment.ts: giá theo pax_code, ceil() cho dịch vụ tính-theo-nhóm perNPax…) bằng SQL —
  // làm vậy tạo ra MỘT BẢN SAO THỨ HAI của chính hàm đó, đúng là "hai nơi tính cùng một dữ liệu theo hai luật khác nhau" mà cả Đợt E này tồn tại để
  // xoá bỏ (khi hai bản trôi nhau — dễ nhất ở dịch vụ tính-theo-nhóm và phép chia nguyên — kiểm tự báo oan hoặc tự im lặng, tuỳ bên nào đúng).
  // Thay vào đó, hai kiểm dưới đây CHỈ so hai con số ĐÃ LƯU với nhau (không tính lại giá gì cả, không đụng after_json/order_item/catalog_price):
  //  - 6a: dòng ĐẦU TIÊN (seq=1) của một đơn — trước khi có điều chỉnh nào, subtotal_before phải bằng CHÍNH orders.subtotal đã lưu (đã kiểm bằng
  //    mã thật, orders/repository.ts: orders.subtotal chỉ được ghi ở createOrder/updateDraftOrder — CẢ HAI chỉ chạy khi đơn còn 'draft'; không route
  //    nào khác đụng cột này sau khi xác nhận, và editMoneyAsHandler chỉ chạy khi đã 'confirmed' — nên cột này ĐỨNG YÊN từ lúc xác nhận, đúng bằng
  //    Σ line_total của MỌI dịch vụ, kể cả nhập tay, tại thời điểm subtotal_before=1 lẽ ra phải tính — không cần biết CÁCH tính, chỉ cần khớp).
  //  - 6b: dòng SAU (seq=n>1) — subtotal_before của nó phải bằng subtotal_after của dòng NGAY TRƯỚC (seq=n-1): chuỗi tiền của một đơn phải LIÊN TỤC,
  //    "trước" của lần sửa này chính là "sau" của lần sửa trước, không có gì xen giữa (đúng cách editMoneyAsHandler đọc getLatestAdjustment làm gốc).
  // GIỚI HẠN ĐÃ BIẾT (ghi rõ, không giấu): đây là "chốt liên tục" (continuity), không phải "chốt đúng số" — một lỗi khiến CẢ HAI cột (before VÀ
  // after) SAI GIỐNG HỆT NHAU theo CÙNG một lượng ở CÙNG một lần ghi (vd lỗi chỉ ở phần "after"-side pricing mà "before" vẫn đúng) chỉ lộ ra ở LẦN
  // SỬA KẾ TIẾP của đơn đó (qua 6b), không lộ ngay ở lần ghi đầu tiên — khác với đúng CA LỖI ĐÃ ĐO của Task 7 (bỏ sót dịch vụ nhập tay), ca đó SAI
  // CẢ before LẪN after theo CÙNG một lượng thiếu (200.000) NHƯNG so với orders.subtotal (6a) hoặc dòng trước (6b) thì lộ ngay — đã đo bằng mã thật.
  // MỨC "warn" (KHÔNG "fail") — CÓ CHỦ Ý, không phải quên siết: bảng order_money_adjustment CHỈ-THÊM (không sửa được dữ liệu cũ), và tính năng
  // sửa tiền hậu xác nhận (migration 0021, route handler-money-edit) ĐÃ ÁP/CHẠY trên production TỪ TRƯỚC bản vá Task 7 này (đối chiếu chỉ đọc:
  // `git log` cho thấy 0021 đã lên production trước 2026-09-23, còn bản vá Task 7 — mã sửa nơi ghi — CHƯA gộp vào `main` tính tới lúc viết kiểm
  // này) — nghĩa là RẤT CÓ THỂ đã tồn tại dòng lịch sử thật trên production mang ĐÚNG lỗi cũ (đơn trộn danh mục + nhập tay, đã bị FIELD sửa tiền
  // trước khi bản vá này triển khai) mà KHÔNG BAO GIỜ sửa lại được (bảng chỉ-thêm). Đặt "fail" ngay bây giờ có nguy cơ BÁO OAN thật (chặn lần phát
  // hành kế tiếp vì dữ liệu LỊCH SỬ không ai sửa được, không phải vì mã đang lỗi) — không tự kiểm được vì AI không được đọc D1 remote (CLAUDE.md
  // §8). Đề nghị: sau khi triển khai (kèm bản vá nơi ghi của Task 7), chủ dự án tự chạy `node scripts/audit-invariants.mjs --db remote` — sạch
  // (0 vi phạm) thì có thể nâng lên "fail" ở một lần sửa sau; còn vi phạm thì đó CHÍNH LÀ nợ dữ liệu lịch sử cần biết tên đơn để rà soát tay.
  {
    code: "R-ORD-6a",
    what: "dòng điều chỉnh ĐẦU TIÊN (seq=1) của một đơn: subtotal_before phải khớp orders.subtotal đã lưu (trước khi có điều chỉnh nào, tiền chưa đổi gì)",
    sql: `SELECT count(*) FROM order_money_adjustment a JOIN orders o ON o.id = a.order_id WHERE a.seq = 1 AND a.subtotal_before <> o.subtotal`,
    level: "warn",
    note: "cảnh báo (KHÔNG chặn phát hành — xem chú thích trong scripts/audit-checks.mjs): lệch có thể là dữ liệu LỊCH SỬ từ trước bản vá Task 7 (bảng chỉ-thêm, không sửa lại được), cần rà soát tay theo order_id; nếu KHÔNG đúng lý do đó (đơn mới, sau khi bản vá đã triển khai) thì là lỗi thật ở nơi ghi",
  },
  {
    code: "R-ORD-6b",
    what: "chuỗi tiền của một đơn liên tục: subtotal_before của dòng SAU phải khớp subtotal_after của dòng NGAY TRƯỚC (không có gì xen giữa)",
    sql: `SELECT count(*) FROM order_money_adjustment a JOIN order_money_adjustment prev ON prev.order_id = a.order_id AND prev.seq = a.seq - 1 WHERE a.subtotal_before <> prev.subtotal_after`,
    level: "warn",
    note: "cảnh báo (KHÔNG chặn phát hành — cùng lý do R-ORD-6a): lệch có thể là dữ liệu LỊCH SỬ từ trước bản vá Task 7, cần rà soát tay theo order_id",
  },
  {
    // R-ORD-NT1 (ADR-0061 điều 8, A-9): LỚP BÙ cho lệch 5.1 thu hẹp — luật "tài khoản có quyền Đối tác không nhập tay" chỉ ở mã (không trigger được: lưu nháp
    // xoá–chèn lại order_service, dòng dịch vụ không có dấu người/lúc tạo riêng). Đơn có dịch vụ nhập tay (catalog_code NULL) mà người lập đang giữ quyền
    // PARTNER còn hiệu lực, đơn tạo SAU mốc phát hành ADR-0061 = created_at của dòng đầu bảng ord_manual_service_policy (dòng gieo 0052 — không viết cứng
    // ngày). Mức "warn": dòng nhập tay do NỘI BỘ thêm vào nháp của Đối tác (ADR-0061 "Hệ quả") cũng hiện ở đây — người rà soát xem theo mã đơn. Gỡ khi
    // dòng dịch vụ có dấu vết riêng (ADR mới thêm trigger).
    code: "R-ORD-NT1",
    what: "đơn có dịch vụ nhập tay do tài khoản đang giữ quyền Đối tác lập, tạo sau mốc phát hành ADR-0061",
    sql: `SELECT count(*) FROM orders o
     WHERE o.created_at > (SELECT MIN(created_at) FROM ord_manual_service_policy)
       AND EXISTS (SELECT 1 FROM order_service s WHERE s.order_id = o.id AND s.catalog_code IS NULL)
       AND EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id = o.staff_id AND p.permission_type_code = 'PARTNER' AND p.valid_to_at IS NULL)`,
    level: "warn",
    note: "cảnh báo (máy chủ đã chặn — duocNhapTay, Đối tác trước): rà soát tay theo mã đơn; có thể là dòng nhập tay nội bộ thêm vào nháp của Đối tác (hợp lệ)",
  },
  // ---- ADR-0047 (chặng đưa đón `ord_transfer_leg`, hành khách `ord_passenger`) — kế hoạch Task A15 -------------------------------------------------
  // R-ORD-7 (Ruling R3 — GHI KÉP, chỉ phát hành 1; GỠ ở phát hành 2, cùng commit ngừng ghi kép): hai cột cũ `order_service.pickup_time/pickup_place` =
  // DẪN XUẤT của chặng chiều đi đầu còn mở (ngày, rồi giờ có trước giờ trống, rồi giờ, rồi id — cùng thứ tự `chieuDiDau`); nơi = tên điểm hoặc chữ. So cột
  // cũ đã cắt khoảng trắng (câu chép 0034 cắt); cột cũ TRỐNG khớp chặng mang chữ tạm "(chưa ghi nơi đón)" (dịch vụ cũ có giờ không nơi — Q1 (a)).
  // Mức warn-unless-strict (kế hoạch Review Focus 12): vài giây giữa lúc 0034 áp và Worker mới chạy, Worker 1.36 ghi cột cũ mà không ghi chặng — chữa
  // bằng mở và lưu lại đơn (ghi kép đồng bộ lại). Đổi tên một điểm danh mục cũng làm lệch (cột cũ giữ tên cũ) — cùng cách chữa.
  {
    code: "R-ORD-7",
    what: "hai cột cũ pickup_time/pickup_place của dịch vụ = dẫn xuất của chặng chiều đi đầu còn mở (ghi kép phát hành 1 — ADR-0047 R3)",
    sql: `SELECT count(*) FROM (
      SELECT s.pickup_time AS old_time, NULLIF(trim(s.pickup_place), '') AS old_place,
        (SELECT l.pickup_time FROM ord_transfer_leg l WHERE l.order_service_id = s.id AND l.direction = 'OUT' AND l.closed_at IS NULL
           ORDER BY (l.pickup_date IS NULL), l.pickup_date, (l.pickup_time IS NULL), l.pickup_time, l.id LIMIT 1) AS leg_time,
        (SELECT COALESCE(loc.name, l.pickup_place) FROM ord_transfer_leg l LEFT JOIN loc_location loc ON loc.id = l.pickup_location_id
           WHERE l.order_service_id = s.id AND l.direction = 'OUT' AND l.closed_at IS NULL
           ORDER BY (l.pickup_date IS NULL), l.pickup_date, (l.pickup_time IS NULL), l.pickup_time, l.id LIMIT 1) AS leg_place
      FROM order_service s
    ) WHERE old_time IS NOT leg_time OR (old_place IS NOT leg_place AND NOT (old_place IS NULL AND leg_place = '(chưa ghi nơi đón)'))`,
    level: "warn-unless-strict",
    note: "cảnh báo (đỏ khi --strict): cột cũ lệch chặng — mở và lưu lại đơn đó để ghi kép đồng bộ lại (thường do Worker cũ chạy trong vài giây quanh lúc áp 0034, hoặc điểm danh mục vừa đổi tên)",
  },
  // R-ORD-8 (ADR-0047 A1): chặng mở của đơn đã xác nhận, ngày đón từ hôm nay (giờ VN) trở đi, CHƯA CHỐT nơi trả — việc văn phòng cần bổ sung (câu chép 0034
  // để trống nơi trả khi dịch vụ cũ không có nơi check-in). Tình trạng nghiệp vụ hợp lệ → chỉ cảnh báo.
  {
    code: "R-ORD-8",
    what: "chặng mở của đơn đã xác nhận, ngày đón từ hôm nay trở đi, chưa chốt nơi trả (văn phòng bổ sung)",
    sql: `SELECT count(*) FROM ord_transfer_leg l JOIN orders o ON o.id = l.order_id
      WHERE o.status = 'confirmed' AND l.closed_at IS NULL AND l.pickup_date >= date('now', '+7 hours') AND l.dropoff_location_id IS NULL AND l.dropoff_place IS NULL`,
    level: "warn",
    note: "cảnh báo (tình trạng nghiệp vụ, không chặn phát hành): văn phòng bổ sung nơi trả cho các chặng này",
  },
  // R-ORD-9 (ADR-0047 L-A1 — lệch có chủ ý 5.1, LỚP BÙ): danh sách hành khách có nhiều người có tên hơn số khách HIỆU LỰC của dịch vụ đông nhất (R9). Số
  // khách hiệu lực = phần tử của CHÍNH dịch vụ trong `after_json` của dòng điều chỉnh gần nhất (đọc như R-ORD-5, có chắn JSON hỏng), không thì số đã lưu.
  // Chỉ là cờ cho văn phòng (N7: không tự tăng số khách) → cảnh báo.
  {
    code: "R-ORD-9",
    what: "đơn có số người có tên (dòng hiện hành) nhiều hơn số khách hiệu lực của dịch vụ đông nhất (cờ cho văn phòng — ADR-0047 L-A1)",
    sql: `SELECT count(*) FROM orders o
      WHERE (SELECT count(DISTINCT p.person_key) FROM ord_passenger p WHERE p.order_id = o.id AND p.voided_at IS NULL
               AND NOT EXISTS (SELECT 1 FROM ord_passenger n WHERE n.previous_id = p.id AND n.voided_at IS NULL))
        > COALESCE((SELECT max(${soKhachHieuLuc("s")}) FROM order_service s WHERE s.order_id = o.id), 0)`,
    level: "warn",
    note: "cảnh báo (cờ cho văn phòng, không chặn phát hành): danh sách có tên nhiều hơn số khách — sửa số khách hoặc huỷ dòng nhập nhầm",
  },
  // R-ORD-10 (ADR-0047 A2, siết Hiến chương 5.12): nhật ký `order_passenger_changed` chỉ ghi SỐ LƯỢNG, ĐÚNG khuôn "thêm N, sửa N, huỷ N khách" — bỏ hết chữ
  // số và dấu cách rồi phải còn đúng "thêm,sửa,huỷkhách" (script gộp mọi khoảng trắng của câu SQL nên chuỗi so không được có hai dấu cách liền) (không lọt tên, năm sinh… vào `detail`). Vi phạm là lỗi thật của nơi ghi.
  {
    code: "R-ORD-10",
    what: "nhật ký order_passenger_changed ĐÚNG khuôn 'thêm N, sửa N, huỷ N khách' (không tên, không năm sinh)",
    sql: `SELECT count(*) FROM audit_log WHERE action = 'order_passenger_changed' AND (detail IS NULL OR detail NOT GLOB 'thêm [0-9]*, sửa [0-9]*, huỷ [0-9]* khách'
      OR replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(detail, ' ', ''), '0', ''), '1', ''), '2', ''), '3', ''), '4', ''), '5', ''), '6', ''), '7', ''), '8', ''), '9', '') <> 'thêm,sửa,huỷkhách')`,
    level: "fail",
  },
  // R-ORD-11 (ADR-0047 A2): chuỗi hành khách đúng — dòng thay thế cùng đơn, cùng person_key với dòng trước; dòng đầu chuỗi có person_key = id. Trigger 0035
  // đã chặn — đây là lưới thứ hai. Vế DRIVER ĐỔI NGHĨA (Đợt 5 A-1b — ADR-0052 D5b, chủ duyệt 5/10, đề xuất luật A-1b mục 3): trước "không có dòng nguồn DRIVER";
  // nay dòng nguồn DRIVER phải là ĐẦU chuỗi và có sự kiện PASSENGER_NAMED trên một suất mang đúng khoá người đó (ADR-0052:221) — mồ côi = vi phạm.
  // Siết L5 (5/10): suất đó phải thuộc chặng của CÙNG đơn với dòng hành khách.
  {
    code: "R-ORD-11",
    what: "chuỗi hành khách đúng (dòng thay thế cùng đơn + person_key; dòng đầu person_key = id); dòng nguồn DRIVER là đầu chuỗi và có sự kiện tài xế bổ sung tên",
    sql: `SELECT
      (SELECT count(*) FROM ord_passenger p JOIN ord_passenger prev ON prev.id = p.previous_id WHERE prev.order_id <> p.order_id OR prev.person_key <> p.person_key)
      + (SELECT count(*) FROM ord_passenger WHERE previous_id IS NULL AND person_key <> id)
      + (SELECT count(*) FROM ord_passenger p WHERE p.source = 'DRIVER' AND (p.previous_id IS NOT NULL OR NOT EXISTS (
          SELECT 1 FROM vc_trip_event e JOIN vc_trip_allocation a ON a.id = e.allocation_id AND a.trip_id = e.trip_id
           JOIN ord_transfer_leg l ON l.id = a.leg_id AND l.order_id = p.order_id
           WHERE e.kind = 'PASSENGER_NAMED' AND a.passenger_key = p.person_key)))`,
    level: "fail",
  },
  // R-ORD-12 (ADR-0047 A1, câu hỏi Q1 (a) — ĐÓNG 2026-09-29: chủ chạy truy vấn chỉ đọc, 2 dịch vụ giờ-không-nơi đều thuộc đơn đã huỷ (`docs/superpowers/plans/2026-09-29-adr-0047-thi-cong-nhat-ky.md:37`)): chặng mở của đơn chưa huỷ còn chữ tạm "(chưa ghi nơi đón)" (dịch vụ cũ có
  // giờ đón mà không có điểm đón, hoặc thân cũ gửi giờ mà trống điểm) — văn phòng bổ sung nơi đón. Cảnh báo.
  {
    code: "R-ORD-12",
    what: "chặng mở của đơn chưa huỷ còn nơi đón tạm '(chưa ghi nơi đón)' (văn phòng bổ sung)",
    sql: `SELECT count(*) FROM ord_transfer_leg l JOIN orders o ON o.id = l.order_id WHERE o.status <> 'cancelled' AND l.closed_at IS NULL AND l.pickup_place = '(chưa ghi nơi đón)'`,
    level: "warn",
    note: "cảnh báo (không chặn phát hành): văn phòng bổ sung nơi đón cho các chặng này",
  },
  // R-ORD-13 / R-ORD-14 (ADR-0054 D10.3; kế hoạch ô mới Task 5.2): số người RIÊNG của chặng về `pax_override`.
  //   13: lưới THỨ HAI sau CHECK của 0057 (chỉ chặng `RETURN` mang số) — mức fail (dữ liệu hỏng).
  //   14: L-R1 — số người về VƯỢT số khách hiệu lực của dịch vụ (số khách giảm SAU khi văn phòng ghi; máy không tự sửa cột, `soNguoiChang` kẹp lúc đọc) — tình
  //       trạng nghiệp vụ hợp lệ, văn phòng xem lại ⇒ warn. Dùng CHUNG đoạn số khách hiệu lực `soKhachHieuLuc`.
  {
    code: "R-ORD-13",
    what: "chặng có số người riêng (pax_override) mà không phải chiều về",
    sql: `SELECT count(*) FROM ord_transfer_leg WHERE pax_override IS NOT NULL AND direction <> 'RETURN'`,
    level: "fail",
  },
  {
    code: "R-ORD-14",
    what: "chặng về còn mở của đơn chưa huỷ có số người riêng nhiều hơn số khách hiệu lực của dịch vụ (L-R1)",
    sql: `SELECT count(*) FROM ord_transfer_leg l JOIN order_service s ON s.id = l.order_service_id JOIN orders o ON o.id = l.order_id
          WHERE l.closed_at IS NULL AND o.status <> 'cancelled' AND l.pax_override IS NOT NULL AND l.pax_override > ${soKhachHieuLuc("s")}`,
    level: "warn",
    note: "cảnh báo (không chặn phát hành): số khách của dịch vụ đã giảm dưới số người chiều về — văn phòng sửa lại số người chiều về (xe đang dùng số khách dịch vụ)",
  },
  // R-ORD-16w (ADR-0114 D3, điều khoản 3; bài canh `src/audit-invariants.test.ts`): đơn ĐÃ XÁC NHẬN (kể cả đã giao / hoàn thành — trạng thái vẫn `confirmed`) mà tổng người đi kèm
  // (người lớn + người cao tuổi, cộng MỌI dịch vụ kể cả nhập tay) bằng 0 — chỉ còn trẻ em / em bé. Máy chủ nay chặn ở lập đơn, lưu nháp, xác nhận và sửa số khách, nhưng đơn lập TRƯỚC luật vẫn
  // có thể như vậy, và đơn cũ không bị chặn thêm (chỉ chặn khi sửa từ ≥ 1 xuống 0). Số người là số HIỆU LỰC (sau dòng điều chỉnh gần nhất, `soKhachHieuLuc` — đếm số đã lưu thì sót đúng ca
  // sửa xuống 0 người lớn từ trước ADR). Mức "warn" (thoát 0; ADR-0114: thoát 1 sẽ dừng `trien-khai`): dữ liệu cũ KHÔNG sửa được hàng loạt, chỉ để văn phòng thấy và rà soát tay. Chỉ có
  // vế cảnh báo, không có vế lỗi đi kèm (khác `R-BIL-8w` / `R-ORD-15w`, hậu tố `w` ở đó là nửa trước-mốc của một kiểm lỗi). Chỉ đếm SỐ ĐƠN, không in tên khách.
  {
    code: "R-ORD-16w",
    what: "đơn đã xác nhận có tổng người đi kèm (người lớn + người cao tuổi, mọi dịch vụ, số khách hiệu lực) bằng 0 — chỉ còn trẻ em / em bé (ADR-0114 D3)",
    sql: `SELECT count(*) FROM orders o
      WHERE o.status = 'confirmed'
        AND (SELECT COALESCE(SUM(${soKhachHieuLuc("s", ["adult", "senior"])}), 0) FROM order_service s WHERE s.order_id = o.id) = 0`,
    level: "warn",
    note: "cảnh báo (KHÔNG chặn phát hành — ADR-0114 D3 điều khoản 3): đơn cũ lập trước luật người lớn; rà soát tay theo mã đơn, máy chủ chỉ chặn việc sửa số khách đưa người đi kèm từ 1 trở lên xuống 0",
  },
  // R-AUT-1 (ADR-0016 điều 6/8): một tài khoản bị ngưng (`active = 0`) không được còn Face ID nào CÒN HIỆU LỰC (`valid_to_at IS NULL`) — đăng nhập
  // Face ID còn bị `getActiveStaff` chặn ở tầng ứng dụng, kiểm này là LƯỚI DỮ LIỆU cho bất biến đó, không phải đường chặn đăng nhập.
  // `PATCH /api/staff/:id` với `active: false` (ngưng tài khoản) gỡ mọi passkey trong CÙNG lô ghi với câu ngưng ("8b", chủ chọn A-4 phương án 1),
  // `POST /api/staff/:id/reset-pin` và `POST /api/staff/:id/passkeys/remove-all` cũng gỡ hết — không đường API nào tự gây vi phạm. Đỏ trên D1 thật
  // là LỖI THẬT (vd. ngưng bằng SQL tay), không được nới. Xem runbook `0023` của `docs/HANDOFF-N1.md`.
  {
    code: "R-AUT-1",
    what: "không có Face ID còn hiệu lực của tài khoản đã ngưng",
    sql: "SELECT count(*) AS n FROM aut_passkey p JOIN staff s ON s.id = p.staff_id WHERE p.valid_to_at IS NULL AND s.active = 0",
    level: "fail",
  },
  // R-AUT-SESSION-1 (ADR-0075 điều 1–3): tài khoản chịu luật một máy không có HAI phiên sống (chưa kết thúc, còn hạn, single = 1). Chỉ mục duy nhất có điều kiện
  // `aut_session_one_live` (0065) đã chặn mọi cặp `ended_at IS NULL AND single = 1` bất kể hạn ⇒ kiểm này chỉ đỏ khi chỉ mục bị mất/sửa (SQL tay, migration
  // sai) — là LƯỚI, không phải đường chặn. Đếm số TÀI KHOẢN vi phạm.
  {
    code: "R-AUT-SESSION-1",
    what: "không tài khoản một máy nào có hơn một phiên đăng nhập sống",
    sql: `SELECT count(*) FROM (SELECT staff_id FROM aut_session WHERE ended_at IS NULL AND single = 1 AND expires_at > ${BAY_GIO_ISO}
          GROUP BY staff_id HAVING count(*) > 1)`,
    level: "fail",
  },
  // R-AUT-SESSION-2 (ADR-0075 điều 4 — lý do "tài khoản ngưng"): tài khoản đã ngưng không còn dòng phiên chưa kết thúc (kể cả dòng đã quá hạn — lô ngưng kết thúc MỌI dòng chưa kết thúc,
  // câu `session_end_all_if_suspended` không lọc hạn). Đọc cờ hoạt động qua view công bố `v_stf_staff_label` của staff. Đăng nhập của tài khoản ngưng còn bị
  // `currentStaff` chặn ở tầng ứng dụng — kiểm này là lưới dữ liệu (vd ngưng bằng SQL tay).
  {
    code: "R-AUT-SESSION-2",
    what: "không có phiên đăng nhập chưa kết thúc của tài khoản đã ngưng",
    sql: "SELECT count(*) FROM aut_session x JOIN v_stf_staff_label s ON s.id = x.staff_id WHERE x.ended_at IS NULL AND s.active = 0",
    level: "fail",
  },
  // R-AUT-SESSION-3 (ADR-0085 điều 8): tài khoản theo CHÍNH SÁCH HIỆN HÀNH là một máy mà có > 1 phiên sống còn hạn. Khe đã biết: lần đăng nhập đọc chính sách cũ
  // "Nhiều máy" ngay trước lô siết → phiên mới single = 0; tự lành ở lần đăng nhập sau. Mức WARN (không đỏ ở --strict của e2e / cổng triển khai) — để thấy, không để chặn.
  // Mẩu điều kiện "được nhiều máy" CHÉP NGUYÊN VĂN `nhieuMayDieuKien` của src/modules/auth/repository.ts (bài đối chiếu ở src/audit-invariants.test.ts).
  {
    code: "R-AUT-SESSION-3",
    what: "tài khoản theo chính sách hiện hành là một máy mà có hơn một phiên sống",
    sql: `SELECT count(*) FROM (SELECT x.staff_id FROM aut_session x WHERE x.ended_at IS NULL AND x.expires_at > ${BAY_GIO_ISO}
          AND NOT (EXISTS (SELECT 1 FROM v_stf_nhieu_may_co_dinh f WHERE f.staff_id = x.staff_id)
               OR EXISTS (SELECT 1 FROM v_stf_quyen_mo q WHERE q.staff_id = x.staff_id AND q.permission_code IN
                          (SELECT p.permission_code FROM aut_session_policy p WHERE p.valid_to_at IS NULL AND p.multi = 1)))
          GROUP BY x.staff_id HAVING count(*) > 1)`,
    level: "warn",
  },
  // R-CTL-1 (ADR-0058, NT-A11): dịch vụ ĐANG HIỆN (in_sheet = 1, không bị catalog_override.hidden = 1) mà CHƯA PHÂN LOẠI — không có dòng gán hiện hành
  // (seq lớn nhất của service_code), hoặc dòng hiện hành có group_code NULL, hoặc trỏ tới nhóm đang TẮT (form đơn hiện nó là "Chưa phân loại"). Mã mới trên
  // Sheet ở lại "Chưa phân loại" cho tới khi Quản trị gán — tình trạng nghiệp vụ hợp lệ, cần người rà soát ⇒ mức warn (in số, không bao giờ đỏ). Chỉ đếm số.
  {
    code: "R-CTL-1",
    what: "dịch vụ đang hiện mà chưa phân loại nhóm (Quản trị gán nhóm ở màn Danh mục)",
    sql: `SELECT count(*) FROM catalog_item i
      WHERE i.in_sheet = 1
        AND NOT EXISTS (SELECT 1 FROM catalog_override o WHERE o.code = i.code AND o.hidden = 1)
        AND NOT EXISTS (
          SELECT 1 FROM ctl_service_group sg JOIN ctl_group g ON g.code = sg.group_code AND g.active = 1
          WHERE sg.service_code = i.code
            AND sg.seq = (SELECT max(m.seq) FROM ctl_service_group m WHERE m.service_code = i.code))`,
    level: "warn",
    note: "cảnh báo (không chặn phát hành): Quản trị gán nhóm cho các dịch vụ này ở màn Danh mục",
  },

  // ---- Sổ đại lý đợt 1 (đặc tả 2026-10-08 §9; migration 0090). Trigger / CHECK của 0090 là đường chặn thứ nhất; các kiểm này là LƯỚI THỨ HAI cho SQL chạy tay và cho
  // chuyện đổi SAU khi ghi (tắt vai, đổi nhóm dịch vụ, đổi công ty chủ) — thứ trigger lúc chèn không nhìn thấy. Bảng mức / điều khoản / bản chụp chỉ-thêm: dòng sai không sửa
  // được, chỉ ĐÓNG (mức, điều khoản) — nên R-PRC-2/3/4 chỉ xét dòng CHƯA HẾT HẠN (đóng rồi là hết báo; đặc tả §13: đổi công ty chủ thì đóng dòng ALL cũ, mở dòng mới). ----
  {
    // R-PRC-1: trigger `prc_commission_rule_overlap` chặn lúc chèn; kiểm này bắt dòng lọt qua (trigger bị gỡ / SQL tay). Cùng khoá với trigger: (hồ sơ, vai, phạm vi, mã dịch vụ, nhóm).
    code: "R-PRC-1",
    what: "không có hai dòng mức hoa hồng cùng đối tượng (hồ sơ hoặc vai), cùng phạm vi và mã mà khoảng hiệu lực chồng nhau",
    sql: overlap("prc_commission_rule", ["target_party_id", "target_role_code", "scope", "catalog_code", "group_code"], "valid_from_date"),
    level: "fail",
    note: "đặc tả sổ đại lý đợt 1 §9: một đối tượng, một phạm vi, một mã chỉ có MỘT mức tại mỗi ngày — Kế toán đóng một trong hai dòng",
  },
  {
    // R-PRC-2: "tắt một vai = active 0, dòng mức cũ vẫn giữ; R-PRC-2 báo" (0090) — việc của Kế toán là đóng dòng mức theo vai đó (hết hạn ⇒ hết báo).
    code: "R-PRC-2",
    what: "dòng mức hoa hồng còn hiệu lực theo vai mà vai đó không còn trong danh sách vai được hưởng đang bật",
    sql: `SELECT count(*) FROM prc_commission_rule r WHERE r.target_role_code IS NOT NULL AND ${CHUA_HET_HAN("r")}
       AND r.target_role_code NOT IN (SELECT role_type_code FROM v_prc_beneficiary_role)`,
    level: "fail",
    note: "đặc tả sổ đại lý đợt 1 §9: vai bị tắt khỏi danh sách được hưởng mà dòng mức còn hiệu lực — Kế toán đóng dòng mức đó (hoặc bật lại vai)",
  },
  {
    // R-PRC-3: ba nhánh, mỗi dòng đếm MỘT lần. (1) có a% mà người bán là công ty chủ; (2) người bán ≠ công ty chủ mà không mang vai Nhà cung cấp (đang mở);
    // (3) người bán ≠ công ty chủ mà không có a%. Trigger 0090 (supplier_iff, seller_role) chặn lúc chèn; kiểm này còn bắt chuyện đổi SAU: nhà cung cấp thôi vai,
    // hoặc đổi công ty chủ làm dòng ALL gieo sẵn lệch (đặc tả §13, N17 — đóng dòng cũ, mở dòng cho công ty mới).
    code: "R-PRC-3",
    what: "điều khoản người bán còn hiệu lực sai luật: có tỷ lệ mua lại mà người bán là công ty chủ; hoặc người bán khác công ty chủ mà không mang vai Nhà cung cấp; hoặc người bán khác công ty chủ mà không có tỷ lệ mua lại",
    sql: `SELECT count(*) FROM prc_supply_term t WHERE ${CHUA_HET_HAN("t")}
       AND ((t.cost_rate_bp IS NOT NULL AND EXISTS (SELECT 1 FROM v_pty_owner_company c WHERE c.party_id = t.seller_party_id))
         OR (NOT EXISTS (SELECT 1 FROM v_pty_owner_company c WHERE c.party_id = t.seller_party_id)
             AND (t.cost_rate_bp IS NULL
               OR NOT EXISTS (SELECT 1 FROM v_pty_open_role r WHERE r.party_id = t.seller_party_id AND r.role_type_code = 'SUPPLIER'))))`,
    level: "fail",
    note: "đặc tả sổ đại lý đợt 1 §9, §13: Kế toán đóng điều khoản sai rồi mở dòng đúng (đổi công ty chủ thì đóng dòng 'mọi dịch vụ' cũ, mở dòng cho công ty mới)",
  },
  {
    // R-PRC-4 (luật X3, điều A2): không ghi tỷ lệ mua lại cho nhóm Thuê xe (TXE) hay mã ĐANG thuộc nhóm đó (nhóm hiện hành = dòng seq lớn nhất, view v_ctl_service_group).
    // Trigger `prc_supply_term_x3` chỉ chạy lúc chèn điều khoản; mã đổi sang nhóm TXE SAU khi ghi thì chỉ kiểm này thấy.
    code: "R-PRC-4",
    what: "điều khoản còn hiệu lực có tỷ lệ mua lại cho nhóm Thuê xe (TXE) hoặc cho dịch vụ đang thuộc nhóm Thuê xe",
    sql: `SELECT count(*) FROM prc_supply_term t WHERE t.cost_rate_bp IS NOT NULL AND ${CHUA_HET_HAN("t")}
       AND (t.group_code = 'TXE' OR EXISTS (SELECT 1 FROM v_ctl_service_group g WHERE g.catalog_code = t.catalog_code AND g.group_code = 'TXE'))`,
    level: "fail",
    note: "đặc tả sổ đại lý đợt 1 §9 (luật X3): dịch vụ Thuê xe không ghi nhà cung cấp mua lại — Kế toán đóng điều khoản đó",
  },
  {
    // R-PRC-5: dòng mức theo HỒ SƠ còn hiệu lực HÔM NAY mà hồ sơ không còn vai được hưởng nào (cùng nghĩa trigger `prc_commission_rule_target_party`: vai đang mở VÀ đang bật).
    // Tình trạng nghiệp vụ hợp lệ (công ty lữ hành thôi hợp tác) cần người rà soát — mức warn VĨNH VIỄN, không bao giờ đỏ kể cả --strict.
    code: "R-PRC-5",
    what: "dòng mức hoa hồng còn hiệu lực hôm nay theo hồ sơ mà hồ sơ đó không còn mở vai được hưởng hoa hồng nào",
    sql: `SELECT count(*) FROM prc_commission_rule r WHERE r.target_party_id IS NOT NULL AND r.valid_from_date <= ${HOM_NAY_VN} AND ${CHUA_HET_HAN("r")}
       AND NOT EXISTS (SELECT 1 FROM v_pty_open_role o JOIN v_prc_beneficiary_role b ON b.role_type_code = o.role_type_code WHERE o.party_id = r.target_party_id)`,
    level: "warn",
    note: "cảnh báo, không chặn phát hành (đặc tả sổ đại lý đợt 1 §9): hồ sơ này thôi vai được hưởng mà mức còn hiệu lực — Kế toán xem lại và đóng dòng mức nếu không còn hưởng",
  },
  {
    // R-ORD-T1 (đặc tả §9 sau kiểm độc lập N4): MỖI dòng dịch vụ của đơn đã xác nhận, xác nhận TỪ (mốc + 60 phút) trở đi, phải có ĐÚNG MỘT bản chụp hiện hành. Mốc = lúc áp migration
    // (bảng `ord_audit_cutoff`), KHÔNG suy từ bản chụp đầu — cách cũ tự tắt khi mã chụp không bao giờ chạy. 60 phút che quãng migration → deploy của runbook và lúc bản mới chưa lan tới
    // mọi nơi. Thiếu dòng mốc thì chính kiểm này báo 1 lỗi (không im lặng xanh; viết bằng `NOT EXISTS`, KHÔNG dùng `CASE … END)` — bộ tách câu của wrangler không đóng khối ở `END)` và nuốt mọi dấu `;` phía sau, xem bài «tách câu của wrangler»). Đếm theo DÒNG DỊCH VỤ. Hoàn tác Worker về bản cũ ⇒ đơn xác nhận lúc đó làm kiểm này đỏ tới đợt 2 (đúng tín hiệu).
    code: "R-ORD-T1",
    what: "dòng dịch vụ của đơn đã xác nhận sau ân hạn 60 phút kể từ mốc áp migration 0090 mà không có đúng một bản chụp thương mại hiện hành (mốc thiếu cũng tính lỗi)",
    sql: `SELECT (SELECT count(*) FROM order_service s JOIN orders o ON o.id = s.order_id
        WHERE o.status = 'confirmed' AND ${LUC_XAC_NHAN("o")} >= ${HET_AN_HA_T1} AND ${SO_BAN_CHUP_HIEN_HANH("s")} <> 1)
      + (SELECT NOT EXISTS (SELECT 1 FROM ord_audit_cutoff WHERE code = 'R-ORD-T1'))`,
    level: "fail",
    note: "đặc tả sổ đại lý đợt 1 §9, §13: đơn xác nhận bằng bản cũ sau ân hạn thiếu bản chụp — chờ chụp bù ở đợt 2; Worker không được hoàn tác về bản cũ sau khi đã áp migration",
  },
  {
    // R-ORD-T1w: phần còn lại của R-ORD-T1 — đơn đã xác nhận, CHƯA "Đã giao", xác nhận TRƯỚC (mốc + 60 phút) (đơn cũ, hoặc rơi vào quãng migration → deploy), có dòng dịch vụ chưa có bản chụp
    // nào: đợt 2 chụp bù. Mỗi dòng kết quả = một đơn (mã đơn). Cùng hằng ân hạn với R-ORD-T1.
    code: "R-ORD-T1w",
    what: "đơn đã xác nhận, chưa Đã giao, xác nhận trước hết ân hạn mốc 0090, còn dòng dịch vụ chưa có bản chụp thương mại (đơn cũ — đợt 2 chụp bù); liệt kê mã đơn",
    sql: `SELECT o.order_code FROM orders o
       WHERE o.status = 'confirmed' AND o.delivered_at IS NULL AND ${LUC_XAC_NHAN("o")} < ${HET_AN_HA_T1}
         AND EXISTS (SELECT 1 FROM order_service s WHERE s.order_id = o.id AND ${SO_BAN_CHUP_HIEN_HANH("s")} = 0)`,
    mode: "rows",
    level: "warn",
    note: "cảnh báo, không chặn phát hành (đặc tả sổ đại lý đợt 1 §9): đơn xác nhận trước khi có bảng mức — chờ chụp bù ở đợt 2",
  },
  {
    // R-ORD-T2: bản chụp là chỉ-thêm (trigger chặn sửa/xoá) và CHECK của 0090 đòi lý do ≥ 10 ký tự cho bản MANUAL, đúng một trong (tỷ lệ, đ/khách) cho hoa hồng SET. Kiểm này là lưới
    // cho dòng lọt qua CHECK (bảng dựng lại bằng SQL tay, migration sai). Xét MỌI bản (kể cả bản đã bị thay) — một bản sai là sai mãi.
    code: "R-ORD-T2",
    what: "bản chụp thương mại do tay ghi (MANUAL) mà lý do rỗng, hoặc hoa hồng đã có mức (SET) mà không có đúng một trong tỷ lệ và số đồng mỗi khách",
    sql: `SELECT count(*) FROM ord_service_terms t
       WHERE (t.source = 'MANUAL' AND (t.reason IS NULL OR length(trim(t.reason)) = 0))
          OR (t.commission_status = 'SET' AND (t.commission_rate_bp IS NULL) = (t.commission_per_pax IS NULL))`,
    level: "fail",
    note: "đặc tả sổ đại lý đợt 1 §9: bản chụp tay thiếu lý do, hoặc mức hoa hồng không rõ tỷ lệ hay đồng mỗi khách",
  },
  {
    // R-KY-1 (ADR-0080 điều 3): bốn bảng tiền có ngày phát sinh không nhận dòng ghi SAU lúc khoá tháng của ngày phát sinh. Trigger `*_period_closed` chặn lúc chèn; kiểm này bắt dòng lọt qua.
    // Chỉ so `created_at` > `closed_at` của ĐÚNG tháng của dòng; ghi trước khi khoá (hợp lệ) hay ghi đúng lúc khoá không tính.
    code: "R-KY-1",
    what: "không có lần thu, phiếu sổ, khoản hoàn ngoài hay chi phí xe nào thuộc tháng đã khoá sổ mà ghi SAU lúc khoá",
    sql: `SELECT ${["bil_payment_receipt", "bil_posting", "bil_outside_refund", "vc_trip_cost_line"].map(GHI_SAU_KHOA).join(" + ")}`,
    level: "fail",
    note: "đặc tả sổ đại lý đợt 1 §9, §8: tiền ghi vào tháng đã khoá — tháng đã khoá không mở lại, sửa bằng điều chỉnh ở tháng đang mở",
  },
  {
    // R-KY-2 (ADR-0080 điều 2): các tháng đã khoá liền nhau. Tháng `p` không phải tháng nhỏ nhất thì tháng liền trước `p` phải có trong bảng (trigger `ky_period_close_adjacent` chặn lúc chèn).
    // Trừ tháng bằng `strftime(..., '-1 month')` trên ngày mùng 1 — không trừ chuỗi (qua năm 2026-01 → 2025-12).
    code: "R-KY-2",
    what: "các tháng đã khoá sổ liền nhau, không có tháng hở ở giữa",
    sql: `SELECT count(*) FROM ky_period_close p WHERE p.period > (SELECT min(period) FROM ky_period_close)
       AND NOT EXISTS (SELECT 1 FROM ky_period_close q WHERE q.period = strftime('%Y-%m', p.period || '-01', '-1 month'))`,
    level: "fail",
    note: "đặc tả sổ đại lý đợt 1 §9: tháng đã khoá không liền nhau — chỉ có thể do SQL chạy tay; khôi phục theo runbook",
  },
];

/**
 * Bất biến CÓ TÊN nhưng KHÔNG phải câu kiểm (in ra để người đọc biết, KHÔNG in "đạt"): R-BIL-2, R-BIL-5 chạy từ lượt 2 của sổ tiền (ADR-0026 điều 7);
 * R-BIL-7 (đúng một hồ sơ công ty chủ) chính là R-PTY-1 ở trên — không kiểm trùng.
 * @type {{ code: string, text: string }[]}
 */
export const GHI_CHU = [
  { code: "R-BIL-2", text: "chưa áp dụng (lượt 2 sổ tiền: phần Tour Đảo = giá bán − giá vốn − hoa hồng theo số đã lưu)" },
  { code: "R-BIL-5", text: "chưa áp dụng (lượt 2 sổ tiền: mỗi dòng dịch vụ của đơn đã chụp có người bán)" },
  { code: "R-BIL-7", text: "đúng một hồ sơ công ty chủ — dùng lại R-PTY-1 (không kiểm trùng)" },
];

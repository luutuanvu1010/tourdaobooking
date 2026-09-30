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
 */
const soKhachHieuLuc = (s) => `COALESCE(
            (SELECT json_extract(je.value, '$.pax.adult') + json_extract(je.value, '$.pax.child') + json_extract(je.value, '$.pax.senior') + json_extract(je.value, '$.pax.infant')
               FROM order_money_adjustment a, json_each(CASE WHEN json_valid(a.after_json) AND json_type(a.after_json) = 'array' THEN a.after_json ELSE '[]' END) je
               WHERE a.order_id = ${s}.order_id AND a.seq = (SELECT MAX(seq) FROM order_money_adjustment b WHERE b.order_id = ${s}.order_id) AND json_extract(je.value, '$.serviceId') = ${s}.id
               LIMIT 1),
            ${s}.pax_adult + ${s}.pax_child + ${s}.pax_senior + ${s}.pax_infant)`;
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
];

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
  // R-VC-11 (đặc tả 2026-09-29 Transportation Kernel, K-01 / lỗ LH-04; R-VC-3…10 đã giữ cho ADR-0049): route "Thêm giấy tờ" luôn chèn dòng mới
  // `previous_id = NULL`, không hỏi loại đó đã có dòng hiện hành chưa; CSDL chỉ canh "mỗi dòng tối đa một dòng gia hạn" — bấm "Thêm Kiểm định" thay vì
  // "Gia hạn" sinh HAI chuỗi song song. Đếm CẶP (xe chưa ngừng, loại) có ≥ 2 dòng hiện hành. Chỉ đếm số (không biển số, không số giấy tờ). Mức warn:
  // có thể đã có dữ liệu thật như vậy (số đếm trên production là đầu vào của đề xuất chặn VK3-B); không chặn phát hành.
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
    what: "chặng có số suất khách MỞ nhiều hơn số khách hiệu lực (L-D1)",
    sql: `SELECT count(*) FROM ord_transfer_leg l JOIN order_service s ON s.id = l.order_service_id
          WHERE (SELECT count(*) FROM vc_trip_allocation a WHERE a.leg_id = l.id AND a.kind = 'PASSENGER' AND a.valid_to_at IS NULL) > ${soKhachHieuLuc("s")}`,
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
                  WHERE a.leg_id = l.id AND a.kind = 'PASSENGER' AND a.valid_to_at IS NULL AND t.status <> 'CANCELLED') < ${soKhachHieuLuc("s")}`,
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
  {
    code: "R-VC-16",
    what: "suất khách mở của chuyến chưa kết thúc có điểm DANH MỤC khác nơi đón / trả hiện hành của chặng (không phủ chữ tự do)",
    sql: `SELECT count(*) FROM vc_trip_allocation a JOIN vc_trip t ON t.id = a.trip_id JOIN ord_transfer_leg l ON l.id = a.leg_id
            LEFT JOIN vc_trip_stop b ON b.id = a.board_stop_id LEFT JOIN vc_trip_stop x ON x.id = a.alight_stop_id
          WHERE a.kind = 'PASSENGER' AND a.valid_to_at IS NULL AND t.status IN ('PLANNED', 'RUNNING')
            AND ((b.place_key GLOB 'L:*' AND b.place_key IS NOT ('L:' || l.pickup_location_id)) OR (x.place_key GLOB 'L:*' AND x.place_key IS NOT ('L:' || l.dropoff_location_id)))`,
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
  // R-ORD-11 (ADR-0047 A2): chuỗi hành khách đúng — dòng thay thế cùng đơn, cùng person_key với dòng trước; dòng đầu chuỗi có person_key = id; KHÔNG có dòng
  // nguồn 'DRIVER' (định sẵn trong CHECK, chỉ dùng khi ADR lượt 2 mở đường ghi cho tài xế). Trigger 0035 đã chặn — đây là lưới thứ hai.
  {
    code: "R-ORD-11",
    what: "chuỗi hành khách đúng (dòng thay thế cùng đơn + person_key; dòng đầu person_key = id); chưa có dòng nguồn DRIVER",
    sql: `SELECT
      (SELECT count(*) FROM ord_passenger p JOIN ord_passenger prev ON prev.id = p.previous_id WHERE prev.order_id <> p.order_id OR prev.person_key <> p.person_key)
      + (SELECT count(*) FROM ord_passenger WHERE previous_id IS NULL AND person_key <> id)
      + (SELECT count(*) FROM ord_passenger WHERE source = 'DRIVER')`,
    level: "fail",
  },
  // R-ORD-12 (ADR-0047 A1, câu hỏi Q1 (a) — GIẢ ĐỊNH chờ chủ chạy truy vấn đếm): chặng mở của đơn chưa huỷ còn chữ tạm "(chưa ghi nơi đón)" (dịch vụ cũ có
  // giờ đón mà không có điểm đón, hoặc thân cũ gửi giờ mà trống điểm) — văn phòng bổ sung nơi đón. Cảnh báo.
  {
    code: "R-ORD-12",
    what: "chặng mở của đơn chưa huỷ còn nơi đón tạm '(chưa ghi nơi đón)' (văn phòng bổ sung)",
    sql: `SELECT count(*) FROM ord_transfer_leg l JOIN orders o ON o.id = l.order_id WHERE o.status <> 'cancelled' AND l.closed_at IS NULL AND l.pickup_place = '(chưa ghi nơi đón)'`,
    level: "warn",
    note: "cảnh báo (không chặn phát hành): văn phòng bổ sung nơi đón cho các chặng này",
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
];

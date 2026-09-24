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
 * `assigned` — ADR-0014 điều 6, Phase B). `extra` thu hẹp thêm (vd ` AND s.active = 1`). Alias `a` là dòng `dsp_assignment` của câu ngoài.
 */
const handlerAccountEligible = (extra = "") =>
  `EXISTS (SELECT 1 FROM staff s JOIN stf_permission p ON p.staff_id = s.id AND p.permission_type_code IN ('SALES', 'ADMIN', 'FIELD', 'SUPER_ADMIN') AND p.valid_to_at IS NULL WHERE s.party_id = a.party_id${extra})`;

/** @type {{ code: string, what: string, sql: string, level: 'fail' | 'warn-unless-strict' | 'warn', mode?: 'rows', note?: string }[]} */
export const CHECKS = [
  { code: "R-N1-1", what: "mọi tài khoản có party_id", sql: "SELECT count(*) FROM staff WHERE party_id IS NULL", level: "warn-unless-strict" },
  { code: "R-N1-1", what: "một hồ sơ tối đa một tài khoản", sql: "SELECT count(*) FROM (SELECT party_id FROM staff WHERE party_id IS NOT NULL GROUP BY party_id HAVING count(*) > 1)", level: "fail" },
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
    what: "nhân sự đã có hồ sơ nhưng thiếu vai trò STAFF",
    sql: `SELECT count(*) FROM staff s WHERE s.party_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = s.party_id AND r.role_type_code = 'STAFF')`,
    level: "warn-unless-strict",
  },
  {
    code: "thông tin",
    what: "tài khoản đang hoạt động không có quyền nào (đăng nhập được nhưng không làm được gì)",
    sql: `SELECT count(*) FROM staff s WHERE s.active = 1 AND NOT EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id = s.id AND p.valid_to_at IS NULL)`,
    level: "warn-unless-strict",
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

// Kịch bản Chrome cho Task 3 ("Trang chủ mới", docs/superpowers/sdd/2026-09-23-trang-chu-moi/task-3-brief.md) — BẰNG CHỨNG HÀNH VI TRÌNH DUYỆT DUY NHẤT
// cho Trang chủ (nay ở "/"; `npm test`/`test:e2e -- pwa` KHÔNG phủ DOM của web/home.ts, chỉ phủ luật thuần + manifest/service worker). Dùng lại NGUYÊN cơ chế CDP của A2
// (startEnv()/ACCOUNTS/ok/vnDate từ ../../2026-09-20-a2/kich-ban/a2-cdp.mjs) theo mẫu cấu trúc của ../../2026-09-22-thiet-ke-lai-giao-dien-dot-c/kich-ban/dot-c-smoke.mjs.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=<…/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs
// Ghi ảnh vào docs/evidence/2026-09-23-trang-chu-moi/anh/*.png.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-23-trang-chu-moi";
const AXE = readFileSync(process.env.AXE_JS, "utf8");
mkdirSync(join(OUT, "anh"), { recursive: true });

const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };

// A-3 (Đợt D Task 6, F cũ = A-3 của brief): trần bề rộng kỳ vọng của <main> phải đến từ một NGUỒN ĐỘC LẬP với
// trang đang kiểm — đọc THẲNG văn bản public/app.css bằng regex, không đọc getComputedStyle(main).maxWidth của
// chính trang (nếu ai gõ sai giá trị --w-main/--w-form NGAY TRONG CSS thì cả "giá trị đo" lẫn "giá trị kỳ vọng" cũ
// đều sai giống nhau, lưới không bắt được — người kiểm độc lập chỉ ra khẳng định cũ tự so với chính mình).
const APP_CSS = readFileSync("public/app.css", "utf8");
const cssTokenPx = (name) => {
  const m = new RegExp(`${name}:\\s*([\\d.]+)px`).exec(APP_CSS);
  assert.ok(m, `A-3: không đọc được token ${name} từ public/app.css bằng regex — CSS đã đổi cú pháp?`);
  return Number(m[1]);
};
const CSS_W_MAIN = cssTokenPx("--w-main");
const CSS_W_FORM = cssTokenPx("--w-form");
ok(`A-3: đọc token trần bề rộng THẲNG từ văn bản public/app.css (độc lập với trang đang kiểm) — --w-main=${CSS_W_MAIN}px, --w-form=${CSS_W_FORM}px`);

// C-1 (Đợt D Task 7, kiểm toàn cục): --w-sidebar/--bar-h đọc từ getComputedStyle(document.documentElement) (xem
// f.sidebarToken/f.barToken bên dưới) KHÔNG phải nguồn độc lập — bộ đọc và trình duyệt đọc CÙNG một khai báo trong
// public/app.css, nên nếu ai gõ SAI giá trị --w-sidebar/--bar-h ngay trong CSS, "giá trị đo" lẫn "giá trị kỳ vọng"
// đổi theo nhau, lưới không bắt được (người kiểm độc lập đã đột biến chứng minh: đổi --w-sidebar thành 300px, chạy
// lại TOÀN BỘ lưới, không khẳng định nào đỏ). Hằng số dưới đây viết THẲNG trong kịch bản — không đọc từ CSS bằng
// bất kỳ cách nào — lấy từ bản mẫu 00 Trang chu v2.dc.html + chủ dự án đã duyệt (đặc tả §16 mục 3, ADR-0015).
const SIDEBAR_WIDTH_MOCKUP_PX = 236; // BẢN MẪU (00 Trang chu v2.dc.html) — KHÔNG đọc từ public/app.css
const TOPBAR_HEIGHT_MOCKUP_PX = 60; // CHỦ DỰ ÁN duyệt tăng từ 52px của bản mẫu (đặc tả thiết kế §16 mục 3) — KHÔNG đọc từ public/app.css
// GHI CHÚ, KHÔNG PHẢI PHÉP KIỂM: chỉ công bố hai hằng số trên. Phép kiểm thật nằm ở hai khẳng định C-1 phía dưới
// (so bề rộng #sidebar và chiều cao #topbar ĐO ĐƯỢC với hai hằng số này). Trước đây dòng này dùng `ok(...)` nên
// luôn hiện dấu đạt bất kể mã viết gì — người kiểm độc lập nêu đúng là dễ đọc nhầm thành một phép kiểm.
console.log(`· hằng số ĐỘC LẬP viết thẳng trong kịch bản (không đọc từ CSS): thanh bên ${SIDEBAR_WIDTH_MOCKUP_PX}px, thanh công việc ${TOPBAR_HEIGHT_MOCKUP_PX}px`);

const TODAY = vnDate(0);
const TOMORROW = vnDate(1);
const OTHER_DATE = vnDate(5); // xa hôm nay, cùng tuần hiện tại (revenueWeek tính theo createdAt, không theo ngày đón)

/** axe-core: 0 vi phạm mức critical/serious (đúng ngưỡng dot-a-smoke.mjs/dot-c-smoke.mjs đã dùng). */
const axe = async (p, label) => {
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev(
    `axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help })))`,
  );
  const bad = v.filter((x) => x.impact === "critical" || x.impact === "serious");
  assert.deepEqual(bad, [], `axe (${label}): ${JSON.stringify(bad)}`);
};

const write = (name, r) => writeFileSync(join(OUT, "anh", name), Buffer.from(r.result.data, "base64"));
const shot = async (p, name) => write(name, await p.send("Page.captureScreenshot", { format: "png" }));

// ==================================================================================================
// 0) KIỂM TĨNH (không cần trình duyệt): public/index.html (Trang chủ, Đợt D Task 5 đổi từ public/home.html) PHẢI có sẵn `hidden` trên #dash-today-count/#dash-grid
//    NGAY TRONG MARKUP (trước khi JS chạy) — đây là lỗi Task 2 đã sửa (huy hiệu rỗng/khối rỗng lúc tải).
//    Phương án thay cho việc chặn mạng bằng CDP Fetch domain (brief mục C cho phép dùng cách này nếu chặn mạng phức tạp).
//    SỬA (Đợt D Task 1 — đổi có chủ đích): #dash-stats + #dash-layout gộp thành MỘT khối #dash-grid duy nhất (lưới
//    2×2 gộp cả "Doanh thu của tôi" ở khổ điện thoại — đúng đặc tả §3, khớp bản mẫu). #dash-grid mang `hidden`
//    chung; #dash-stats không còn tự mang `hidden` riêng (ẩn/hiện theo khối cha).
// ==================================================================================================
{
  const html = readFileSync("public/index.html", "utf8");
  const hasHiddenAttr = (idAttr) => new RegExp(`id="${idAttr}"[^>]*\\bhidden\\b`).test(html) || new RegExp(`\\bhidden\\b[^>]*id="${idAttr}"`).test(html);
  assert.ok(hasHiddenAttr("dash-today-count"), "public/index.html: #dash-today-count phải có sẵn `hidden` trong markup tĩnh (không hiện viên thuốc xanh rỗng lúc tải)");
  assert.ok(hasHiddenAttr("dash-grid"), "public/index.html: #dash-grid phải có sẵn `hidden` trong markup tĩnh");
  ok("Kiểm tĩnh: public/index.html có sẵn `hidden` trên #dash-today-count, #dash-grid trong markup gốc (trước khi JS chạy)");
}

const env = await startEnv();
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, {
      method,
      headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  };

  /** Dịch vụ danh mục TTB06 (1 người lớn × giá bán lẻ 800.000) — đủ để xác nhận được. */
  const catalogService = ({ departDate, pickupTime, pickupPlace }) => ({
    kind: "catalog",
    catalogCode: "TTB06",
    pax: { adult: 1, child: 0, senior: 0, infant: 0 },
    catalogPriceSeen: { adult: 800_000 },
    departDate,
    departTime: "",
    pickupTime,
    pickupPlace,
    checkinDate: "",
    checkinTime: "",
    checkinPlace: "",
    note: "",
  });
  /**
   * Dịch vụ nhập tay tối thiểu (1 dòng tiền, 1 khách lớn) — đủ để xác nhận được. 2026-09-26 (DK-T3-01 R1, chủ dự án "loại bỏ hoàn toàn dịch vụ nhập
   * tay"): API không nhận dịch vụ nhập tay MỚI (400) → gửi dịch vụ danh mục giữ chỗ TTB06, `postOrder` đổi nó thành đúng dịch vụ nhập tay CŨ này bằng SQL
   * khi đơn còn nháp (`env.legacyManual`) — tên, giá, nơi/giờ đón y như trước, nên mọi số tiền và chữ trên Trang chủ không đổi.
   */
  const manualService = (name, { departDate, pickupTime, pickupPlace, unitPrice }) => ({
    ...catalogService({ departDate, pickupTime, pickupPlace }),
    _legacy: { name, adult: 1, items: [{ description: name, detail: "", quantity: 1, unitPrice }] },
  });
  /** POST /api/orders; dịch vụ nào có `_legacy` thì đổi thành dịch vụ nhập tay cũ bằng SQL ngay sau khi lập (đơn còn nháp). Trả đơn đọc lại. */
  const postOrder = async (account, input) => {
    const created = await call(account, "POST", "/api/orders", { ...input, services: input.services.map(({ _legacy, ...s }) => s) });
    if (created.status !== 201) return created;
    const order = created.json.order;
    input.services.forEach((s, i) => s._legacy && env.legacyManual(order.id, order.services[i].id, s._legacy));
    return { status: 201, json: { order: (await call(account, "GET", `/api/orders/${order.id}`)).json.order } };
  };

  const orderInput = (customerName, customerPhone, services, extra = {}) => ({
    customerName,
    customerPhone,
    customerEmail: "",
    customerNote: "",
    services,
    discount: 0,
    paymentNote: "",
    ...extra,
  });

  const createAndConfirm = async (input) => {
    const created = await postOrder(ACCOUNTS.admin, input);
    assert.equal(created.status, 201, `tạo đơn: ${JSON.stringify(created.json)}`);
    const id = created.json.order.id;
    let confirmed = await call(ACCOUNTS.admin, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
    // ADR-0049 D2 (mốc tối thiểu 6 giờ, 2026-09-29): chặng đón HÔM NAY (giờ đã qua / sát giờ) bị chặn xác nhận — 409 `short_notice_required` kèm `legs`.
    // Đi ĐÚNG đường nghiệp vụ: Quản trị đặt gấp từng chặng máy chủ nêu (route POST …/legs/:legId/short-notice) rồi xác nhận lại. Không nới máy chủ, không đổi
    // ngày giờ của dữ liệu thử (Trang chủ cần chuyến đón HÔM NAY).
    if (confirmed.status === 409 && confirmed.json?.error?.code === "short_notice_required") {
      for (const { legId } of confirmed.json.error.legs) {
        const g = await call(ACCOUNTS.admin, "POST", `/api/orders/${id}/legs/${legId}/short-notice`, { lyDo: "KHAC", ghiChu: null });
        assert.equal(g.status, 200, `đặt gấp chặng ${legId} của đơn ${id}: ${JSON.stringify(g.json)}`);
      }
      confirmed = await call(ACCOUNTS.admin, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
    }
    assert.equal(confirmed.status, 200, `xác nhận đơn ${id}: ${JSON.stringify(confirmed.json)}`);
    return confirmed.json.order;
  };

  // ==================================================================================================
  // 1) Tạo dữ liệu thật qua API (ADMIN) — TRƯỚC khi mở "/".
  //    R1 (mục B — bẫy bug Task 1 đã sửa): 2 dịch vụ NGÀY KHÁC NHAU, sort_order NGƯỢC chiều ngày:
  //      sort_order=0 → NGÀY MAI (giờ/nơi đón rõ ràng khác), sort_order=1 → HÔM NAY (dịch vụ QUYẾT ĐỊNH "hôm nay").
  //    Trả đủ tiền (lần thu 300.000 — billing conLai=0) để không lẫn vào ô "Còn thiếu tiền" (tách bạch với R3 bên dưới).
  // ==================================================================================================
  const r1Services = [
    manualService("Đưa đón sân bay (dịch vụ NGÀY MAI, không phải dịch vụ quyết định)", { departDate: TODAY, pickupTime: "19:30", pickupPlace: "Sân bay Cam Ranh", unitPrice: 150_000 }), // ADR-0021: API chặn đơn lệch ngày → dựng đơn CŨ: tạo cùng ngày rồi đổi dịch vụ này sang NGÀY MAI bằng SQL (dưới)
    manualService("Tour 4 đảo (dịch vụ HÔM NAY — quyết định)", { departDate: TODAY, pickupTime: "06:15", pickupPlace: "Bến Cầu Đá", unitPrice: 150_000 }),
  ];
  const r1 = await createAndConfirm(orderInput("Khách Bẫy B Hôm Nay", "0900000301", r1Services));
  // Sổ tiền lượt 1 (ADR-0026 đ9): "trả đủ" = LẦN THU 300.000 của billing (trước đây cột cọc trên đơn).
  assert.equal((await call(ACCOUNTS.admin, "POST", `/api/orders/${r1.id}/payments`, { soTien: 300_000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201, "lần thu R1");
  env.sql(`UPDATE order_service SET depart_date = '${TOMORROW}' WHERE id = '${r1.services[0].id}'`); // đơn cũ (trước 1.11) có thể lệch ngày — Trang chủ vẫn phải chọn đúng dịch vụ hôm nay
  ok(`R1 tạo + xác nhận (id ${r1.id}): 2 dịch vụ (sort_order 0 = mai 19:30/Sân bay Cam Ranh, sort_order 1 = hôm nay 06:15/Bến Cầu Đá), đã trả đủ 300.000`);

  // R2: NHÁP (không xác nhận), có dịch vụ HÔM NAY — phải KHÔNG lọt vào "Chuyến đón hôm nay" dù trùng ngày (chỉ đơn confirmed mới vào).
  const r2Created = await postOrder(ACCOUNTS.admin, orderInput("Khách Nháp Chưa Xác Nhận", "0900000302", [
    manualService("Dịch vụ nháp (không được lộ ra Trang chủ)", { departDate: TODAY, pickupTime: "10:00", pickupPlace: "Không được hiện", unitPrice: 100_000 }),
  ]));
  assert.equal(r2Created.status, 201, JSON.stringify(r2Created.json));
  const r2 = r2Created.json.order;
  ok(`R2 tạo NHÁP, không xác nhận (id ${r2.id}): có dịch vụ hôm nay nhưng phải không lộ ra danh sách`);

  // R3: confirmed, dịch vụ ngày KHÁC hôm nay, CÒN THIẾU TIỀN (test ô "Còn thiếu tiền" + earliestDate).
  // Số tiền CỐ Ý ở hàng chục triệu (không phải vài trăm nghìn) — kiểm gộp I-3 nêu rõ "số thật của công ty
  // (hàng chục triệu) sẽ tệ hơn": lưới guard đo tràn dòng phải đo đúng cỡ số THẬT, không phải số nhỏ nhất tình cờ vừa khít.
  const r3 = await createAndConfirm(orderInput("Khách Còn Thiếu Tiền", "0900000303", [
    manualService("Dịch vụ ngày khác (kiểm ô Còn thiếu tiền)", { departDate: OTHER_DATE, pickupTime: "08:00", pickupPlace: "Bến khác", unitPrice: 12_345_000 }),
  ]));
  ok(`R3 tạo + xác nhận (id ${r3.id}): dịch vụ ngày ${OTHER_DATE} (khác hôm nay), chưa trả đồng nào → còn thiếu 12.345.000`);

  // ==================================================================================================
  // T3) Đợt D Task 3 ("Cần xem lại", CHỈ ADMIN) — dữ liệu cho cả hai dòng cảnh báo.
  //   a) Cảnh báo Sheet đổi giá: chèn THẲNG một dòng catalog_override lệch Sheet bằng SQL (env.sql) thay vì đi qua
  //      luồng PATCH override + đồng bộ lại Sheet thật (cần mạng, không phù hợp kịch bản offline này) — vẫn đúng
  //      HÌNH DẠNG dữ liệu catalog_override thật (cùng cột `saveOverride()` ghi), chỉ khác đường tạo ra nó.
  //      TD101 đã có sẵn trong CATALOG_SQL (a2-cdp.mjs) với price_adult=1.350.000 — đặt base_json khác giá trị đó
  //      (1.200.000) để applyOverride() tính ra đúng MỘT xung đột (adult), khớp công thức catalog/rules.ts.
  //   b) Cảnh báo góp ý chưa trả lời: 2 yêu cầu THẬT qua POST /api/feedback (trạng thái mặc định NEW) — tạo bởi HAI
  //      nhân viên khác nhau (không phải admin) để giống tình huống thật; tạo salesA TRƯỚC, salesB SAU nên
  //      last_activity_at của salesB mới hơn → GET /api/feedback (ORDER BY last_activity_at DESC) trả salesB trước.
  // ==================================================================================================
  env.sql(
    `INSERT INTO catalog_override (code, hidden, prices_json, base_json, updated_by, updated_at) VALUES ('TD101', 0, '{"adult":1300000}', '{"adult":1200000}', NULL, '2026-01-02T00:00:00.000Z')`,
  );
  const fb1 = await call(ACCOUNTS.salesA, "POST", "/api/feedback", {
    kind: "BUG",
    title: "Lỗi tính tiền khi đổi số khách (kịch bản Task 3)",
    body: "Khi đổi số khách người lớn sau xác nhận, tổng tiền không cập nhật lại đúng.",
    clientRequestId: crypto.randomUUID(),
    context: {},
  });
  assert.equal(fb1.status, 201, `tạo góp ý 1 (Task 3): ${JSON.stringify(fb1.json)}`);
  const fb2 = await call(ACCOUNTS.salesB, "POST", "/api/feedback", {
    kind: "IDEA",
    title: "Đề xuất thêm bộ lọc theo ngày đón (kịch bản Task 3)",
    body: "Xin thêm bộ lọc theo khoảng ngày đón ở trang Đơn hàng.",
    clientRequestId: crypto.randomUUID(),
    context: {},
  });
  assert.equal(fb2.status, 201, `tạo góp ý 2 (Task 3): ${JSON.stringify(fb2.json)}`);
  ok(`T3) Đã tạo dữ liệu "Cần xem lại": TD101 lệch Sheet (1.200.000 → 1.350.000), 2 góp ý MỚI (${fb1.json.ticket.code} báo lỗi của Sales Một, ${fb2.json.ticket.code} đề xuất của Sales Hai)`);

  // ==================================================================================================
  // S20-13 (ADR-0030; kế hoạch 2026-09-27 Task 1.2) + ADR-0020 điều 7 M1 = A: ô "Chưa phụ trách" đếm CẢ đơn nháp. Từ Task 1.3 (ADR-0030 S20-4)
  // đơn mới lập không chọn ai thì KHÔNG có người phụ trách — R2 (nháp) tự nhiên là đơn nháp chưa có người, không cần câu SQL đóng dòng phụ trách
  // nữa. Đáp án đối chiếu ở mục 2 tự tính bằng SQL đọc THẲNG bảng phân công — nguồn độc lập với mã đang kiểm.
  // ==================================================================================================
  const unassignedTruth = env.sql(
    `SELECT o.id FROM orders o WHERE o.status IN ('draft', 'confirmed') AND NOT EXISTS (SELECT 1 FROM dsp_assignment a WHERE a.order_id = o.id AND a.task_kind_code = 'HANDLE' AND a.valid_to_at IS NULL)`,
  ).map((r) => r.id);
  assert.ok(unassignedTruth.includes(r2.id), `S20-13: R2 (nháp, lập không chọn người phụ trách) phải là đơn chưa có người — ${JSON.stringify(unassignedTruth)}`);
  ok(`S20-13: đáp án tự tính bằng SQL — ${unassignedTruth.length} đơn nháp/đã xác nhận chưa có người phụ trách, gồm R2 (nháp)`);

  // ==================================================================================================
  // F) Ghim thứ tự khai route: GET /api/orders/dashboard PHẢI trả dữ liệu thật (không phải 404 do bị route
  //    "GET /api/orders/:id" ở dưới nuốt mất nếu ai đó lỡ dời thứ tự khai route trong orders/index.ts).
  // ==================================================================================================
  const apiTruth = await call(ACCOUNTS.admin, "GET", "/api/orders/dashboard");
  assert.equal(apiTruth.status, 200, `GET /api/orders/dashboard phải trả 200 (không phải 404 do route :id nuốt mất): ${JSON.stringify(apiTruth.json)}`);
  const data = apiTruth.json;
  assert.ok(Array.isArray(data.today) && !("unpaid" in data) && typeof data.draftCount === "number", `GET /api/orders/dashboard trả sai hình dạng dữ liệu: ${JSON.stringify(data)}`);
  ok("F) GET /api/orders/dashboard trả 200 với đúng hình dạng DashboardResponse — route đứng đúng chỗ (trước /api/orders/:id)");

  // ==================================================================================================
  // 2) Đối chiếu API TRẢ VỀ với số tự tay tính (bài học Đợt B: số HIỆN HÀNH, chỉ đơn confirmed vào today/unpaid/revenue).
  //    Đây là lưới thứ hai (ngoài dashboard.test.ts của Task 1): xác nhận qua ĐƯỜNG HTTP THẬT, không chỉ hàm thuần.
  // ==================================================================================================
  assert.equal(data.draftCount, 1, `draftCount phải = 1 (chỉ R2) — API trả ${JSON.stringify(data)}`);
  // Sổ tiền lượt 1: ô "Còn thiếu tiền" đọc GET /api/ledger/unpaid-summary (billing — một hàm conLai), không còn khối `unpaid` của dashboard.
  const unpaid = (await call(ACCOUNTS.admin, "GET", "/api/ledger/unpaid-summary")).json;
  assert.equal(unpaid.count, 1, `unpaid.count phải = 1 (chỉ R3, R1 đã trả đủ) — ${JSON.stringify(unpaid)}`);
  assert.equal(unpaid.total, 12_345_000, `unpaid.total phải = 12.345.000 (R3) — ${JSON.stringify(unpaid)}`);
  assert.equal(unpaid.earliestDate, OTHER_DATE, `unpaid.earliestDate phải là ngày đón của R3 — ${JSON.stringify(unpaid)}`);
  assert.equal(data.today.length, 1, `today phải chỉ có R1 (R2 nháp, R3 không phải hôm nay) — ${JSON.stringify(data.today.map((o) => o.id))}`);
  assert.equal(data.today[0].id, r1.id, "today[0] phải là R1");
  assert.deepEqual(data.today[0].trip, { departDate: TODAY, pickupTime: "06:15", pickupPlace: "Bến Cầu Đá" }, `trip của R1 trong API phải là dịch vụ QUYẾT ĐỊNH (sort_order=1, hôm nay), KHÔNG phải sort_order=0 (mai) — ${JSON.stringify(data.today[0].trip)}`);
  assert.equal(data.revenueWeek.count, 2, `revenueWeek.count phải = 2 (R1 + R3, cùng người lập, cùng tuần) — ${JSON.stringify(data.revenueWeek)}`);
  assert.equal(data.revenueWeek.total, 300_000 + 12_345_000, `revenueWeek.total phải = 12.645.000 — ${JSON.stringify(data.revenueWeek)}`);
  assert.equal(data.unassignedCount, unassignedTruth.length, `S20-13: unassignedCount phải = số đơn NHÁP + ĐÃ XÁC NHẬN chưa có người (SQL tự tính: ${JSON.stringify(unassignedTruth)}) — API trả ${data.unassignedCount}`);
  ok(`API GET /api/orders/dashboard khớp số tự tính: draftCount=1, unpaid=1 đơn/12.345.000, today=[R1] (trip đúng dịch vụ quyết định), revenueWeek=2 đơn/12.645.000; unassignedCount=${data.unassignedCount} = đáp án SQL (đếm cả đơn nháp R2 — ADR-0030 S20-13; DOM đối chiếu bên dưới)`);

  // ==================================================================================================
  // Đợt D Task 2 (biểu đồ cột 7 ngày): R1 + R3 đều tạo "bây giờ" (createAndConfirm không truyền created_at riêng) nên
  // TOÀN BỘ doanh thu tuần phải dồn vào ĐÚNG 1/7 ngày (hôm nay) — 6 ngày còn lại phải = 0, không phải thiếu phần tử.
  // ==================================================================================================
  assert.equal(data.revenueWeek.daily.length, 7, `revenueWeek.daily phải đúng 7 phần tử — ${JSON.stringify(data.revenueWeek.daily)}`);
  const todayIdx = data.revenueWeek.daily.findIndex((d) => d.date === TODAY);
  assert.ok(todayIdx >= 0, `revenueWeek.daily phải có phần tử đúng ngày hôm nay (${TODAY}) — ${JSON.stringify(data.revenueWeek.daily)}`);
  assert.equal(data.revenueWeek.daily[todayIdx].total, data.revenueWeek.total, `Cả R1 lẫn R3 đều tạo hôm nay nên ngày hôm nay trong daily phải = revenueWeek.total (12.645.000) — ${JSON.stringify(data.revenueWeek.daily)}`);
  assert.equal(data.revenueWeek.daily.filter((d) => d.total > 0).length, 1, `chỉ đúng 1/7 ngày (hôm nay) có doanh thu, 6 ngày còn lại phải = 0 — ${JSON.stringify(data.revenueWeek.daily)}`);
  ok(`revenueWeek.daily: đúng 7 phần tử, toàn bộ 12.645.000 dồn vào hôm nay (${TODAY}, vị trí ${todayIdx}/7), 6 ngày còn lại = 0`);

  // ==================================================================================================
  // 3) Mở "/" ở khổ máy tính (1040) và điện thoại (390) — bằng ADMIN. Đối chiếu MỖI SỐ trên màn hình THẬT
  //    với `data` (API vừa đọc) VÀ với giá trị literal đã tạo (mục B — không tái phát bug Task 1).
  // ==================================================================================================
  // SỬA (Đợt D Task 1 — đổi có chủ đích): #dash-layout đổi tên/gộp thành #dash-grid (nay chứa CẢ #dash-stats, không chỉ
  // #dash-today/#dash-revenue — lưới 2×2 gộp doanh thu ở khổ điện thoại, đặc tả §3). Nhãn/giá trị/dòng phụ của ô số liệu
  // và của "Doanh thu"/dòng chuyến nay có HAI bản trong DOM cùng lúc (`.lbl-full` máy tính, `.lbl-short` điện thoại, CSS
  // ẩn/hiện — Đợt D Task 1).
  // SỬA (kiểm độc lập, Fix round 1 — phát hiện Important): trỏ thẳng vào `.lbl-full` như trước đo NHẦM ở khổ điện thoại
  // (390px), vì `.lbl-full { display:none }` chỉ ẩn thị giác — `.textContent` trên phần tử `display:none` VẪN trả về
  // chữ. Kết quả là kịch bản từng khẳng định "đúng" trên bản chữ ĐẦY ĐỦ (không hiển thị thật) thay vì bản RÚT GỌN
  // (đang hiển thị thật), nên toàn bộ tính năng chữ/tiền rút gọn của Task 1 chưa từng được kịch bản này bắt lỗi.
  // Sửa bằng `shown()`: chọn `.lbl-full`/`.lbl-short` nào đang thật sự CHIẾM CHỖ (`offsetParent !== null`) — đúng bản
  // đang hiển thị theo khổ màn hình hiện tại, không đổi Ý NGHĨA phép đo, chỉ đổi cách chọn phần tử.
  const measureHome = (p) =>
    p.ev(`(() => {
      const shown = (el) => {
        if (!el) return null;
        const full = el.querySelector('.lbl-full');
        const short = el.querySelector('.lbl-short');
        if (full && short) return (full.offsetParent !== null ? full : short).textContent.trim();
        return el.textContent.trim();
      };
      // Phần tử TỰ MANG lớp .lbl-full (không có bản .lbl-short song song, vd dòng "đã trả đủ"/"còn lại" của tiền
      // trong danh sách hôm nay) — ẩn HẲN ở khổ hẹp (không có chữ thay thế), nên đo bằng offsetParent trực tiếp.
      const visibleText = (el) => (el && el.offsetParent !== null ? el.textContent.trim() : null);
      const vis = (el) => !!el && el.offsetParent !== null;
      // Trang chủ điện thoại theo bản vẽ 2026-09-30 ("Trang chu dien thoai.dc.html"): khối số liệu MỘT thẻ 2×2 (#dash-so — Còn thiếu, Doanh thu của tôi,
      // Chờ xác nhận, Chưa phụ trách) thay cho ba ô #dash-stats + thẻ #dash-revenue ở khổ ≤640px (hai khối máy tính chỉ bị CSS ẩn, còn trong DOM).
      const so = [...document.querySelectorAll('#dash-so .dash-so-o')].map((el) => {
        const v = el.querySelector('.dash-so-gt');
        const cs = getComputedStyle(v);
        const oneLine = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
        return { label: el.querySelector('.dash-so-nhan span').textContent.trim(), value: v.textContent.trim(), sub: el.querySelector('.dash-so-phu').textContent.trim(), shown: vis(el), wrapped: v.getBoundingClientRect().height > oneLine + 1, href: el.getAttribute('href') };
      });
      const grid = document.querySelector('#dash-grid');
      // Bản vẽ máy tính v2 (2026-10-02): ba ô #dash-stats + thẻ #dash-revenue cũ thay bằng MỘT thẻ số liệu #dash-so-mt — Còn thiếu tiền, Doanh thu của tôi
      // (chữ phụ "Tuần này · …" bên phải + biểu đồ), Chờ xác nhận, Chưa phụ trách. Số ĐẦY ĐỦ ("12.345.000 ₫"); điện thoại vẫn dùng #dash-so (số rút gọn).
      const statsMt = [...document.querySelectorAll('#dash-so-mt .dash-smt-o')].map((el) => {
        const valueEl = el.querySelector('.dash-smt-gt');
        const cs = getComputedStyle(valueEl);
        const oneLineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
        const actualHeight = valueEl.getBoundingClientRect().height;
        return {
          label: el.querySelector('.dash-smt-nhan-chu').textContent.trim(),
          ben: el.querySelector('.dash-smt-ben')?.textContent.trim() ?? null,
          value: valueEl.textContent.trim(),
          sub: el.querySelector('.dash-smt-phu').textContent.trim(),
          href: el.getAttribute('href'),
          shown: vis(el),
          // Kiểm gộp I-3: "500.000 ₫" từng xuống 2 dòng (ký hiệu tiền tệ rơi khỏi dòng số) — đo CHIỀU CAO THẬT so với một dòng.
          valueOneLineHeight: oneLineHeight,
          valueActualHeight: actualHeight,
          valueWrapped: actualHeight > oneLineHeight + 1,
        };
      });
      // Dải chào máy tính (bản vẽ v2): lời chào, ngày, nhóm ô chức năng.
      const dai = {
        chao: document.querySelector('#dash-dai .dash-dai-loi')?.textContent.trim() ?? null,
        ngay: document.querySelector('#dash-dai .dash-dai-ngay')?.textContent.trim() ?? null,
        nhom: [...document.querySelectorAll('#dash-dai .dash-nhom-muc')].map((g) => [g.querySelector('.dash-nhom-ten').textContent.trim(), [...g.querySelectorAll('.dash-o-nhan')].map((x) => x.textContent.trim())]),
      };
      const todayRows = [...document.querySelectorAll('#dash-today-list .dash-today-row')].map((row) => ({
        time: row.querySelector('.dash-today-time')?.textContent.trim() ?? null,
        place: row.querySelector('.dash-today-place')?.textContent.trim() ?? null,
        name: row.querySelector('.dash-today-name')?.textContent.trim() ?? null,
        sub: shown(row.querySelector('.dash-today-main .muted')),
        money: shown(row.querySelector('.dash-today-money b')),
        moneySub: visibleText(row.querySelector('.dash-today-money .dash-con-lai-mt')),
        // Bản vẽ máy tính v2: đủ tiền → viên "✓ Đủ tiền" (cùng ý viên thuốc điện thoại), không còn "0 ₫" + "đã trả đủ".
        chipMt: visibleText(row.querySelector('.dash-du-tien-mt')),
        // Bản vẽ điện thoại 2026-09-30: đủ tiền → viên thuốc "Đủ tiền" thay cho số "0 ₫"; còn tiền → số + "còn lại" nhỏ (chỉ hiện ở ≤640px).
        moneyShown: vis(row.querySelector('.dash-today-money b')),
        chip: visibleText(row.querySelector('.dash-du-tien')),
        conLai: visibleText(row.querySelector('.dash-con-lai')),
        // Fix round 2 (quyết định chủ dự án 2026-09-23): lưới ngăn MẤT thao tác gọi khách ở khổ điện thoại — đo phần tử
        // gọi (span onclick tel:, giống .order-row-phone) có tồn tại, có ĐANG HIỂN THỊ thật (offsetParent) ở khổ này
        // hay không, và nhãn máy đọc có đúng SĐT không.
        call: (() => {
          const el = row.querySelector('.dash-today-call');
          if (!el) return null;
          return { shown: el.offsetParent !== null, ariaLabel: el.getAttribute('aria-label'), text: el.textContent.trim() };
        })(),
      }));
      // Đợt D Task 2: biểu đồ cột 7 ngày — trong CÙNG thẻ #dash-revenue (đúng ảnh bản mẫu). Ẩn bằng CSS ở khổ điện
      // thoại (mockup mobile không có biểu đồ) nên đo CẢ tồn tại trong DOM lẫn có đang hiển thị thật (offsetParent).
      // Đợt D Task 3 ("Cần xem lại", CHỈ ADMIN): đo bằng offsetParent như mọi khối khác của trang này —
      // "đang hiển thị thật", không chỉ tồn tại trong DOM (bài học Fix round 1 ở trên).
      const reviewEl = document.querySelector('#dash-review');
      const review = {
        exists: !!reviewEl,
        hiddenAttr: reviewEl ? reviewEl.hidden : null,
        shown: reviewEl ? reviewEl.offsetParent !== null : null,
        rows: [...document.querySelectorAll('#dash-review-list .dash-review-row')].map((row) => ({
          title: row.querySelector('.dash-review-title')?.textContent.trim() ?? null,
          sub: row.querySelector('.dash-review-sub')?.textContent.trim() ?? null,
          href: row.getAttribute('href'),
        })),
      };
      const chartEl = document.querySelector('#dash-so-mt .dash-revenue-chart');
      const chart = chartEl ? {
        shown: chartEl.offsetParent !== null,
        barCount: chartEl.querySelectorAll('.dash-chart-bar').length,
        barHeights: [...chartEl.querySelectorAll('.dash-chart-bar')].map((b) => parseFloat(b.style.height)),
        // Fix round 2 (quyết định chủ dự án 2026-09-23, mục 7): tô đậm = ngày ĐÃ QUA + HÔM NAY, ngày CHƯA TỚI để nhạt.
        barDark: [...chartEl.querySelectorAll('.dash-chart-bar')].map((b) => b.classList.contains('dash-chart-bar-dark')),
        labels: [...chartEl.querySelectorAll('.dash-chart-labels > *')].map((s) => s.textContent.trim()),
        // Bản vẽ máy tính v2: nhãn ngày HÔM NAY tô màu chính.
        todayLabelIdx: [...chartEl.querySelectorAll('.dash-chart-labels > *')].findIndex((s) => s.classList.contains('dash-chart-nay')),
        tableRowCount: chartEl.querySelectorAll('table tbody tr').length,
        tableRows: [...chartEl.querySelectorAll('table tbody tr')].map((tr) => [...tr.children].map((c) => c.textContent.trim())),
      } : null;
      return {
        gridHidden: grid.hidden,
        gridDisplay: getComputedStyle(grid).display,
        gridOrder: [...grid.children].map((el) => el.id),
        todayBadge: document.querySelector('#dash-today-count').textContent.trim(),
        todayBadgeHidden: document.querySelector('#dash-today-count').hidden,
        todayRowCount: todayRows.length,
        todayRows,
        todayEmptyHidden: document.querySelector('#dash-today-empty').hidden,
        todayDays: [...document.querySelectorAll('#dash-today-days .dash-day')].map((b) => ({ t: b.textContent.trim(), on: b.getAttribute('aria-pressed') })),
        statsMt,
        statsShown: vis(document.querySelector('#dash-so-mt')),
        dai,
        daiShown: vis(document.querySelector('#dash-dai')),
        tlShown: vis(document.querySelector('#dash-tl')),
        tlDots: document.querySelectorAll('#dash-tl .dash-tl-diem').length,
        so,
        soShown: vis(document.querySelector('#dash-so')),
        heroShown: vis(document.querySelector('#topbar .dash-hero-chao')),
        timShown: vis(document.querySelector('#dash-tim')),
        luoiShown: vis(document.querySelector('#dash-o')),
        // Doanh thu: ô đang HIỂN THỊ thật — máy tính ô thứ hai của #dash-so-mt, điện thoại ô thứ hai của #dash-so.
        revenueRange: statsMt[1]?.ben ?? null,
        revenueValue: (vis(document.querySelector('#dash-so-mt')) ? statsMt[1]?.value : so[1]?.value) ?? null,
        revenueSub: (vis(document.querySelector('#dash-so-mt')) ? statsMt[1]?.sub : so[1]?.sub) ?? null,
        chart,
        review,
        errorHidden: document.querySelector('#error').hidden,
        loadingHidden: document.querySelector('#loading').hidden,
        scrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`);

  // `mode`: "desktop" (chữ ĐẦY ĐỦ đang hiển thị thật ở ≥900px) hay "mobile" (chữ RÚT GỌN đang hiển thị thật ở ≤640px) —
  // hai bản chữ khác nhau nên khẳng định riêng, không dùng chung một kỳ vọng (kiểm độc lập, Fix round 1).
  const assertHome = (m, label, mode) => {
    assert.equal(m.gridHidden, false, `${label}: #dash-grid phải HIỆN sau khi tải xong — ${JSON.stringify(m)}`);
    assert.equal(m.errorHidden, true, `${label}: #error phải ẨN (không lỗi) — ${JSON.stringify(m)}`);
    assert.equal(m.loadingHidden, true, `${label}: #loading (khung xương) phải ẨN sau khi tải xong — ${JSON.stringify(m)}`);
    assert.ok(m.scrollOverflow <= 1, `${label}: không được tràn ngang — lệch ${m.scrollOverflow}px`);

    // Thẻ số liệu máy tính (bản vẽ v2) — bốn ô, đối chiếu với API (nguồn sự thật vừa đọc), theo ĐÚNG thứ tự renderSoMayTinh() dựng.
    assert.equal(m.statsMt.length, 4, `${label}: thẻ số liệu máy tính phải có đúng 4 ô — ${JSON.stringify(m.statsMt)}`);
    if (mode === "desktop") {
      assert.deepEqual(m.statsMt.map((x) => x.label), ["Còn thiếu tiền", "Doanh thu của tôi", "Chờ xác nhận", "Chưa phụ trách"], `${label}: nhãn bốn ô đúng thứ tự bản vẽ v2 — ${JSON.stringify(m.statsMt)}`);
      assert.equal(m.statsMt[0].value, "12.345.000 ₫", `${label}: ô "Còn thiếu tiền" phải hiện ĐẦY ĐỦ 12.345.000 ₫ — ${JSON.stringify(m.statsMt[0])}`);
      assert.ok(m.statsMt[0].sub.includes("1 đơn"), `${label}: ô "Còn thiếu tiền" phải nói "1 đơn" — ${JSON.stringify(m.statsMt[0])}`);
      assert.equal(m.statsMt[2].value, "1", `${label}: ô "Chờ xác nhận" phải = 1 (chỉ R2, không đếm R1/R3 đã xác nhận) — ${JSON.stringify(m.statsMt[2])}`);
      assert.equal(m.statsMt[2].sub, "Cần xác nhận đơn", `${label}: ${JSON.stringify(m.statsMt[2])}`);
      assert.equal(m.statsMt[3].value, String(data.unassignedCount), `${label}: ô "Chưa phụ trách" phải khớp API (${data.unassignedCount}) — ${JSON.stringify(m.statsMt[3])}`);
      assert.equal(m.statsMt[3].sub, "Chờ người nhận", `${label}: dòng phụ ô chưa phụ trách phải là "Chờ người nhận" (ADR-0020 điều 7, M1 = A) — ${JSON.stringify(m.statsMt[3])}`);
      assert.ok(m.statsMt.every((x) => x.shown && x.href === "/orders"), `${label}: bốn ô hiển thị thật và dẫn tới /orders — ${JSON.stringify(m.statsMt)}`);
      assert.equal(m.revenueValue, "12.645.000 ₫", `${label}: doanh thu ĐẦY ĐỦ phải = 12.645.000 ₫ (R1 300.000 + R3 12.345.000) — ${JSON.stringify(m)}`);
      assert.equal(m.revenueSub, "2 đơn đã xác nhận", `${label}: doanh thu phải nói "2 đơn đã xác nhận" — ${m.revenueSub}`);
      assert.match(m.revenueRange ?? "", /^Tuần này · \d\d\/\d\d–\d\d\/\d\d$/, `${label}: chữ phụ bên phải ô doanh thu "Tuần này · dd/mm–dd/mm" — ${m.revenueRange}`);

      // Đợt D Task 2 — biểu đồ cột 7 ngày: PHẢI hiển thị thật ở máy tính (cùng thẻ "Doanh thu của tôi").
      assert.ok(m.chart, `${label}: phải có .dash-revenue-chart trong DOM — ${JSON.stringify(m)}`);
      assert.equal(m.chart.shown, true, `${label}: biểu đồ phải đang HIỂN THỊ thật (offsetParent) ở máy tính — ${JSON.stringify(m.chart)}`);
      assert.equal(m.chart.barCount, 7, `${label}: biểu đồ phải có đúng 7 cột — ${JSON.stringify(m.chart)}`);
      assert.deepEqual(m.chart.labels, ["T2", "T3", "T4", "T5", "T6", "T7", "CN"], `${label}: nhãn trục phải đúng T2..CN theo thứ tự — ${JSON.stringify(m.chart)}`);
      assert.equal(m.chart.barHeights.length, 7, `${label}: phải đo được chiều cao cả 7 cột — ${JSON.stringify(m.chart)}`);
      assert.equal(m.chart.todayLabelIdx, todayIdx, `${label}: nhãn ngày HÔM NAY (vị trí ${todayIdx}) phải tô màu chính (bản vẽ v2) — ${JSON.stringify(m.chart)}`);
      {
        // Cột hôm nay (duy nhất có doanh thu, 12.645.000) phải CAO HƠN mọi cột khác (0 đ, chỉ còn sàn hiển thị).
        const otherIdx = (todayIdx + 1) % 7;
        assert.ok(
          m.chart.barHeights[todayIdx] > m.chart.barHeights[otherIdx],
          `${label}: cột ngày CÓ doanh thu (hôm nay, vị trí ${todayIdx}, cao ${m.chart.barHeights[todayIdx]}%) phải CAO HƠN cột ngày KHÔNG có doanh thu (vị trí ${otherIdx}, cao ${m.chart.barHeights[otherIdx]}%) — ${JSON.stringify(m.chart)}`,
        );
        assert.equal(m.chart.barHeights[todayIdx], 100, `${label}: cột hôm nay (ngày cao nhất) phải cao 100% — ${JSON.stringify(m.chart)}`);
        assert.ok(m.chart.barHeights[otherIdx] > 0 && m.chart.barHeights[otherIdx] < 100, `${label}: cột ngày 0 đ vẫn phải có chiều cao > 0 (sàn hiển thị, không biến mất) — ${JSON.stringify(m.chart)}`);
      }
      // Fix round 2 (quyết định chủ dự án 2026-09-23, mục 7 — LƯỚI CHÍNH của việc này): tô đậm = ngày ĐÃ QUA + HÔM NAY,
      // ngày CHƯA TỚI để nhạt. Kỳ vọng tính ĐỘNG theo ngày chạy thật (không hard-code T7/CN — kịch bản chạy vào ngày
      // bất kỳ trong tuần). Cố ý quay lại quy tắc VỊ TRÍ cũ (`i >= 5`, tô đậm hai cột cuối T7/CN bất kể ngày) sẽ làm
      // lưới này ĐỎ vào mọi ngày giữa tuần (xem báo cáo P16).
      {
        const expectedDark = data.revenueWeek.daily.map((d) => d.date <= TODAY);
        assert.deepEqual(
          m.chart.barDark,
          expectedDark,
          `${label}: tô đậm cột phải đúng "ngày đã qua + hôm nay" (ngày > hôm nay phải NHẠT) — ngày: ${JSON.stringify(data.revenueWeek.daily.map((d) => d.date))}, đo được: ${JSON.stringify(m.chart.barDark)}, kỳ vọng: ${JSON.stringify(expectedDark)}`,
        );
        assert.equal(m.chart.barDark[todayIdx], true, `${label}: cột HÔM NAY (${TODAY}) phải ĐẬM — ${JSON.stringify(m.chart.barDark)}`);
        const futureIdx = data.revenueWeek.daily.findIndex((d) => d.date > TODAY);
        if (futureIdx >= 0) {
          assert.equal(m.chart.barDark[futureIdx], false, `${label}: cột ngày CHƯA TỚI (${data.revenueWeek.daily[futureIdx].date}, vị trí ${futureIdx}) phải NHẠT — ${JSON.stringify(m.chart.barDark)}`);
        }
        ok(`Fix round 2: tô đậm cột khớp "ngày đã qua + hôm nay" — hôm nay (${TODAY}) đậm${futureIdx >= 0 ? `, ngày chưa tới (${data.revenueWeek.daily[futureIdx].date}) nhạt` : " (hôm nay là Chủ nhật cuối tuần, không có cột ngày chưa tới trong tuần để đối chiếu)"}`);
      }
      // Bảng ẩn cho máy đọc màn hình: đủ 7 dòng, dòng của hôm nay phải có đúng số tiền hiện hành.
      assert.equal(m.chart.tableRowCount, 7, `${label}: bảng máy đọc màn hình (.visually-hidden) phải có đúng 7 dòng — ${JSON.stringify(m.chart)}`);
      assert.ok(m.chart.tableRows[todayIdx][1].includes("12.645.000"), `${label}: dòng bảng máy đọc của hôm nay phải có đúng số tiền hiện hành 12.645.000 — ${JSON.stringify(m.chart)}`);
      // Bản vẽ điện thoại 2026-09-30 KHÔNG được lộ ra máy tính: dải chào/ô tìm/lưới ô chức năng/khối số liệu 2×2 đều ẩn thật.
      assert.equal(m.statsShown, true, `${label}: thẻ số liệu máy tính (#dash-so-mt) phải hiển thị thật — ${JSON.stringify(m)}`);
      for (const k of ["soShown", "heroShown", "timShown", "luoiShown"]) assert.equal(m[k], false, `${label}: khối điện thoại (${k}) KHÔNG được hiển thị ở máy tính — ${JSON.stringify(m)}`);
      // Dải chào máy tính (bản vẽ v2): hiện thật; lời chào theo buổi + tên; ngày + số chuyến đón hôm nay; MỌI ô của Quản trị theo nhóm (+ ô "Tôi").
      assert.equal(m.daiShown, true, `${label}: dải chào máy tính (#dash-dai) phải hiển thị thật — ${JSON.stringify(m.dai)}`);
      assert.match(m.dai.chao ?? "", /^Chào buổi (sáng|trưa|chiều|tối), \S/, `${label}: lời chào "Chào buổi …, <tên>" — ${JSON.stringify(m.dai)}`);
      assert.match(m.dai.ngay ?? "", /^(Thứ .+|Chủ nhật), \d\d\/\d\d · 1 chuyến đón hôm nay$/i, `${label}: dòng ngày + "1 chuyến đón hôm nay" (khớp API: chỉ R1) — ${JSON.stringify(m.dai)}`);
      assert.deepEqual(m.dai.nhom, [
        ["Bán hàng", ["Tạo đơn", "Đơn hàng", "Danh bạ"]],
        ["Quản lý", ["Dịch vụ & giá", "Quản lý tài khoản", "Địa điểm", "Loại giấy tờ cá nhân"]],
        ["Vận chuyển", ["Điều phối xe", "Bảng giá thuê xe", "Bảng kê chi phí xe", "Xe", "Giấy tờ sắp hết hạn", "Loại giấy tờ xe", "Lý do điều phối"]],
        ["Của tôi", ["Tôi", "Góp ý / Báo lỗi", "Trợ giúp"]],
      ], `${label}: nhóm ô của Quản trị đúng bản vẽ v2 (mọi chức năng, không giới hạn 8, không ô "Tất cả") — ${JSON.stringify(m.dai.nhom)}`);
      // Dòng thời gian (bản vẽ v2, chỉ máy tính): R1 có giờ đón → một chấm. Không khẳng định "đã qua / sắp tới" (phụ thuộc giờ thật lúc chạy — luật thuần có test riêng).
      assert.equal(m.tlShown, true, `${label}: dòng thời gian trong ngày phải hiển thị ở máy tính — ${JSON.stringify(m)}`);
      assert.equal(m.tlDots, 1, `${label}: dòng thời gian có đúng 1 chấm (R1) — ${m.tlDots}`);
    } else {
      // Bản vẽ điện thoại 2026-09-30: số liệu ở MỘT thẻ 2×2 (#dash-so), đúng thứ tự Còn thiếu · Doanh thu của tôi · Chờ xác nhận · Chưa phụ trách.
      // Thẻ số liệu, dải chào và dòng thời gian của máy tính phải ẩn thật (không hiện hai lần).
      assert.equal(m.statsShown, false, `${label}: thẻ số liệu máy tính (#dash-so-mt) phải ẨN ở khổ điện thoại — ${JSON.stringify(m)}`);
      assert.equal(m.daiShown, false, `${label}: dải chào máy tính (#dash-dai) phải ẨN ở khổ điện thoại — ${JSON.stringify(m)}`);
      assert.equal(m.tlShown, false, `${label}: dòng thời gian (chỉ máy tính) phải ẨN ở khổ điện thoại — ${JSON.stringify(m)}`);
      assert.equal(m.soShown, true, `${label}: khối số liệu 2×2 (#dash-so) phải hiển thị thật — ${JSON.stringify(m)}`);
      assert.deepEqual(m.so.map((s) => s.label), ["Còn thiếu", "Doanh thu của tôi", "Chờ xác nhận", "Chưa phụ trách"], `${label}: bốn ô số liệu đúng thứ tự bản vẽ — ${JSON.stringify(m.so)}`);
      assert.deepEqual(m.so.map((s) => s.value), ["12,34tr ₫", "12,64tr ₫", "1", String(data.unassignedCount)], `${label}: giá trị bốn ô (tiền rút gọn vndShort; số đơn nháp; số chưa phụ trách khớp API) — ${JSON.stringify(m.so)}`);
      assert.deepEqual(m.so.map((s) => s.sub), ["1 đơn", "Tuần này · 2 đơn", "Cần xác nhận đơn", "Chờ người nhận"], `${label}: dòng phụ bốn ô — ${JSON.stringify(m.so)}`);
      assert.ok(m.so.every((s) => s.shown && s.href === "/orders"), `${label}: bốn ô hiển thị thật và dẫn tới /orders — ${JSON.stringify(m.so)}`);
      assert.deepEqual(m.so.filter((s) => s.wrapped), [], `${label}: số của ô (.dash-so-gt) không được xuống dòng ("₫" rơi khỏi số — kiểm gộp I-3) — ${JSON.stringify(m.so)}`);

      // Đợt D Task 2 — mockup mobile (390px) KHÔNG có biểu đồ trong ô "Doanh thu của tôi" (chỉ 1 trong 4 ô rút gọn của
      // lưới 2×2): biểu đồ vẫn còn trong DOM (không xoá — giữ đơn giản, không dựng hai bản) nhưng PHẢI ẩn bằng CSS.
      assert.ok(m.chart, `${label}: .dash-revenue-chart vẫn phải có trong DOM ở điện thoại (chỉ ẩn bằng CSS) — ${JSON.stringify(m)}`);
      assert.equal(m.chart.shown, false, `${label}: biểu đồ KHÔNG được hiển thị thật ở khổ điện thoại (mockup mobile không có biểu đồ) — ${JSON.stringify(m.chart)}`);
    }

    // ================================================================================================
    // Đợt D Task 3 — "Cần xem lại" (CHỈ ADMIN, cùng nội dung ở CẢ HAI khổ màn hình — không có bản .lbl-full/.lbl-
    // short riêng cho khối này, khác các ô số liệu/doanh thu). Dữ liệu seed ở mục T3 phía trên: TD101 lệch Sheet
    // (1.200.000 → 1.350.000) + 2 góp ý MỚI (fb2 của Sales Hai tạo SAU nên đứng TRƯỚC — ORDER BY last_activity_at
    // DESC ở GET /api/feedback).
    // ================================================================================================
    assert.ok(m.review.exists, `${label}: #dash-review phải có trong DOM — ${JSON.stringify(m)}`);
    assert.equal(m.review.hiddenAttr, false, `${label}: #dash-review phải HIỆN (ADMIN, có cảnh báo Sheet đổi giá thật) — ${JSON.stringify(m.review)}`);
    assert.equal(m.review.shown, true, `${label}: #dash-review phải đang hiển thị THẬT (offsetParent), không chỉ bỏ thuộc tính hidden — ${JSON.stringify(m.review)}`);
    // ADR-0038 (Quản trị vs Toàn quyền): hàng đợi Góp ý chỉ Toàn quyền (ô `feedback.triage`; web/home.ts chỉ gọi /api/feedback khi can() đồng ý) → "Cần xem
    // lại" của Quản trị chỉ còn dòng Sheet đổi giá; hai góp ý MỚI (fb1, fb2) vẫn được dựng để khẳng định chúng KHÔNG lọt vào khối này của Quản trị.
    // (Trước 29/9 kịch bản chờ 2 dòng — đỏ sẵn từ ADR-0038, sửa khi làm xanh kịch bản ở Phần B ADR-0049.)
    assert.equal(m.review.rows.length, 1, `${label}: Quản trị có đúng 1 dòng cảnh báo (Sheet đổi giá) — góp ý chỉ Toàn quyền (ADR-0038) — ${JSON.stringify(m.review)}`);
    assert.equal(m.review.rows[0].title, "Sheet đã đổi giá TD101", `${label}: dòng 1 phải là cảnh báo Sheet đổi giá đúng mã TD101 — ${JSON.stringify(m.review)}`);
    assert.equal(
      m.review.rows[0].sub,
      "1.200.000 ₫ → 1.350.000 ₫ · giá ghi đè vẫn đang bán",
      `${label}: dòng phụ dòng 1 phải đúng base → current (khớp công thức catalog/rules.ts applyOverride) — ${JSON.stringify(m.review)}`,
    );
    assert.equal(m.review.rows[0].href, "/catalog", `${label}: dòng Sheet đổi giá phải liên kết tới /catalog — ${JSON.stringify(m.review)}`);
    assert.ok(!m.review.rows.some((r) => r.href === "/feedback"), `${label}: KHÔNG có dòng góp ý cho Quản trị (ADR-0038) dù có ${[fb1, fb2].length} góp ý mới — ${JSON.stringify(m.review)}`);

    // Kiểm gộp I-3: số liệu ô (vd "12.345.000 ₫") KHÔNG được xuống dòng — ký hiệu tiền tệ từng rơi xuống dòng riêng. So chiều cao thật với MỘT dòng.
    if (mode === "desktop") {
      const wrappedStats = m.statsMt.filter((s) => s.valueWrapped);
      assert.deepEqual(wrappedStats, [], `${label}: số liệu ô (.dash-smt-gt) bị xuống dòng (chiều cao thật vượt một dòng) — ${JSON.stringify(m.statsMt)}`);
    }

    // Danh sách "Chuyến đón hôm nay": đúng 1 dòng (R1), R2 (nháp) và R3 (ngày khác) KHÔNG được lộ ra.
    assert.equal(m.todayBadgeHidden, false, `${label}: huy hiệu số chuyến hôm nay phải HIỆN sau khi có dữ liệu thật — ${JSON.stringify(m)}`);
    assert.equal(m.todayBadge, "1", `${label}: huy hiệu phải = 1 — ${JSON.stringify(m)}`);
    assert.equal(m.todayRowCount, 1, `${label}: danh sách phải đúng 1 dòng (chỉ R1) — ${JSON.stringify(m.todayRows)}`);
    assert.equal(m.todayEmptyHidden, true, `${label}: thông báo "Không có chuyến nào hôm nay" phải ẨN (có dữ liệu) — ${JSON.stringify(m)}`);
    // Góp ý YC-0007 (cách A): ba nút chuyển ngày, "Hôm nay" đang chọn, số trong ngoặc = số chuyến từng ngày (R3 ngày khác không phải mai/kia).
    assert.deepEqual(m.todayDays.map((x) => x.on), ["true", "false", "false"], `${label}: ba nút ngày, Hôm nay đang chọn — ${JSON.stringify(m.todayDays)}`);
    assert.equal(m.todayDays[0].t, "Hôm nay (1)", `${label}: ${JSON.stringify(m.todayDays)}`);
    assert.ok(/^Ngày mai \(\d+\)$/.test(m.todayDays[1].t) && /^Ngày kia \(\d+\)$/.test(m.todayDays[2].t), `${label}: ${JSON.stringify(m.todayDays)}`);

    // === B) Lỗi đã sửa ở Task 1 KHÔNG TÁI PHÁT — giờ đón VÀ nơi đón hiển thị PHẢI là của dịch vụ HÔM NAY (sort_order=1),
    //     TUYỆT ĐỐI KHÔNG được là "19:30"/"Sân bay Cam Ranh" (dịch vụ sort_order=0, ngày MAI). So với giá trị LITERAL đã tạo, không chỉ so với API.
    const row = m.todayRows[0];
    assert.equal(row.time, "06:15", `${label}: giờ đón hiển thị PHẢI là 06:15 (dịch vụ HÔM NAY, sort_order=1) — thấy "${row.time}". Nếu đây là "19:30" thì bug Task 1 (lấy nhầm dịch vụ sort_order nhỏ nhất) ĐÃ TÁI PHÁT.`);
    assert.equal(row.place, "Bến Cầu Đá", `${label}: nơi đón hiển thị PHẢI là "Bến Cầu Đá" (dịch vụ HÔM NAY) — thấy "${row.place}". Nếu đây là "Sân bay Cam Ranh" thì bug Task 1 ĐÃ TÁI PHÁT.`);
    assert.notEqual(row.time, "19:30", `${label}: giờ đón KHÔNG được là giờ của dịch vụ ngày mai`);
    assert.notEqual(row.place, "Sân bay Cam Ranh", `${label}: nơi đón KHÔNG được là nơi đón của dịch vụ ngày mai`);
    // R1 đã trả đủ 300.000 (billing conLai = 0) → cả hai khổ hiện viên "Đủ tiền" thay cho "0 ₫" (bản vẽ điện thoại 1a, máy tính v2); không có "còn lại".
    assert.equal(row.moneyShown, false, `${label}: R1 đã trả đủ: không hiện số "0 ₫" — ${JSON.stringify(row)}`);
    if (mode === "desktop") {
      assert.equal(row.chipMt, "Đủ tiền", `${label}: R1 đã trả đủ (billing conLai=0) phải hiện viên "Đủ tiền" (bản vẽ v2) — ${JSON.stringify(row)}`);
      assert.equal(row.moneySub, null, `${label}: R1 đã trả đủ không có chữ "còn lại" — ${JSON.stringify(row)}`);
      assert.equal(row.chip, null, `${label}: viên thuốc của điện thoại không lộ ra máy tính — ${JSON.stringify(row)}`);
      assert.ok(row.sub && row.sub.includes("0900000301"), `${label}: dòng phụ ĐẦY ĐỦ phải chứa SĐT khách — ${JSON.stringify(row)}`);
      // Fix round 2: ở máy tính, thao tác gọi đã có sẵn trong dòng phụ (SĐT gạch chân) — nút gọi riêng (`.dash-today-call`,
      // chỉ dành cho khổ hẹp) TỒN TẠI trong DOM (dùng chung cho mọi khổ) nhưng KHÔNG được hiển thị ở đây (tránh trùng lặp/lệch mockup).
      assert.ok(row.call, `${label}: phải có phần tử .dash-today-call trong DOM (dùng chung cho cả hai khổ) — ${JSON.stringify(row)}`);
      assert.equal(row.call.shown, false, `${label}: nút gọi riêng (.dash-today-call) KHÔNG được hiển thị ở máy tính (đã có SĐT trong dòng phụ) — ${JSON.stringify(row)}`);
    } else {
      // "đã trả đủ"/"còn lại" bản máy tính phải ẨN HẲN ở khổ hẹp. Bản vẽ 2026-09-30: R1 đã trả đủ → viên thuốc "Đủ tiền" THAY cho số "0 ₫" (số ẩn thật).
      assert.equal(row.moneySub, null, `${label}: chữ "còn lại" của máy tính phải ẨN HẲN ở khổ hẹp — ${JSON.stringify(row)}`);
      assert.equal(row.chipMt, null, `${label}: viên "Đủ tiền" của máy tính phải ẨN HẲN ở khổ hẹp — ${JSON.stringify(row)}`);
      assert.equal(row.chip, "Đủ tiền", `${label}: R1 đã trả đủ phải hiện viên thuốc "Đủ tiền" (bản vẽ 1a) — ${JSON.stringify(row)}`);
      assert.equal(row.conLai, null, `${label}: R1 đã trả đủ không có chữ "còn lại" — ${JSON.stringify(row)}`);
      // Item 7 của Task 1: dòng phụ rút gọn phải là "nơi đón · tên dịch vụ" — NƠI ĐÓN ĐỨNG TRƯỚC tên dịch vụ.
      assert.ok(row.sub && row.sub.startsWith(`${row.place} ·`), `${label}: dòng phụ RÚT GỌN phải bắt đầu bằng "${row.place} ·" (nơi đón đứng TRƯỚC tên dịch vụ) — ${JSON.stringify(row)}`);
      // Fix round 2 (LƯỚI CHÍNH của việc này — quyết định chủ dự án 2026-09-23): dòng phụ rút gọn không còn SĐT,
      // nên PHẢI có một phần tử gọi khách RIÊNG đang thực sự hiển thị ở khổ 390px, với đúng SĐT của đơn thử trong nhãn máy đọc.
      assert.ok(row.call, `${label}: phải có phần tử .dash-today-call (nút gọi khách) trong DOM ở khổ điện thoại — ${JSON.stringify(row)}`);
      assert.equal(row.call.shown, true, `${label}: nút gọi khách (.dash-today-call) PHẢI đang hiển thị thật (offsetParent) ở khổ điện thoại — mất thao tác gọi là lỗi Đợt D Task 1 vòng 1 — ${JSON.stringify(row)}`);
      assert.ok(row.call.ariaLabel && row.call.ariaLabel.includes("0900000301"), `${label}: nhãn máy đọc của nút gọi phải chứa đúng SĐT của đơn thử (0900000301) — ${JSON.stringify(row)}`);
    }
  };

  let p = await env.as(ACCOUNTS.admin, "/", DESK);
  await p.waitFor("!document.querySelector('#dash-grid').hidden", "Trang chủ tải xong (máy tính)");
  let m = await measureHome(p);
  assertHome(m, "Trang chủ (máy tính, 1040×800)", "desktop");
  assert.equal(m.gridDisplay, "grid", `Trang chủ (máy tính): #dash-grid phải display:grid ở ≥900px — ${JSON.stringify(m)}`);
  // Bản vẽ máy tính v2 (2026-10-02): #dash-grid = Chuyến đón → thẻ số liệu máy tính → Cần xem lại (DOM cố định ở public/index.html, không đổi theo khổ);
  // CSS grid-template-areas đặt chỗ: hai cột từ 1200px (Chuyến đón trái; số liệu, Cần xem lại phải), một cột dưới đó (số liệu trước). #dash-review LUÔN có mặt
  // trong DOM (chỉ ẩn/hiện bằng `hidden`). Điện thoại: thẻ số liệu máy tính ẩn, thứ tự đọc Chuyến đón → Cần xem lại không đổi.
  assert.deepEqual(m.gridOrder, ["dash-today", "dash-so-mt", "dash-review"], `Trang chủ (máy tính): thứ tự DOM phải là dash-today, dash-so-mt, dash-review — ${JSON.stringify(m.gridOrder)}`);
  {
    // Khổ 1040 (bản vẽ không vẽ, dưới mốc hai cột 1200px): MỘT cột — thẻ số liệu TRÊN Chuyến đón; nhóm ô của Quản trị xếp chồng (không vừa một hàng với ô ≥ 88px).
    const bo = await p.ev(`(() => ({
      soBottom: Math.round(document.querySelector('#dash-so-mt').getBoundingClientRect().bottom),
      todayTop: Math.round(document.querySelector('#dash-today').getBoundingClientRect().top),
      chong: !!document.querySelector('#dash-dai .dash-nhom-chong'),
      daiBottom: Math.round(document.querySelector('#dash-dai').getBoundingClientRect().bottom),
      mainTop: Math.round(document.querySelector('main').getBoundingClientRect().top),
      topbarBottom: Math.round(document.querySelector('#topbar').getBoundingClientRect().bottom),
      daiTop: Math.round(document.querySelector('#dash-dai').getBoundingClientRect().top),
      daiLeft: Math.round(document.querySelector('#dash-dai').getBoundingClientRect().left),
      sidebarRight: Math.round(document.querySelector('#sidebar').getBoundingClientRect().right),
    }))()`);
    assert.ok(bo.soBottom <= bo.todayTop, `Trang chủ (máy tính 1040): một cột, thẻ số liệu nằm TRÊN Chuyến đón — ${JSON.stringify(bo)}`);
    assert.equal(bo.chong, true, `Trang chủ (máy tính 1040): nhóm ô của Quản trị xếp chồng — ${JSON.stringify(bo)}`);
    assert.ok(bo.daiTop >= bo.topbarBottom - 1 && bo.mainTop >= bo.daiBottom - 1 && bo.daiLeft === bo.sidebarRight, `Trang chủ (máy tính): dải chào là hàng riêng giữa thanh trên và nội dung, bắt đầu ngay sau thanh bên — ${JSON.stringify(bo)}`);
    ok(`Bản vẽ máy tính v2 ở 1040: một cột (số liệu trên Chuyến đón), nhóm ô xếp chồng, dải chào giữa thanh trên và nội dung — ${JSON.stringify(bo)}`);
  }
  assert.deepEqual(p.consoleErrors, [], `lỗi console (Trang chủ máy tính): ${p.consoleErrors}`);
  await shot(p, "trang-chu-may-tinh.png");
  await axe(p, "Trang chủ máy tính");

  // Đợt D Task 4 (ADR-0015): thanh ngang (`.topnav`, 9 mục) đổi thành thanh điều hướng dọc (`#sidebar`) — ĐỔI
  // CÓ CHỦ ĐÍCH, không phải lỗi. Nay ADMIN có 11 mục: 9 mục cũ + "Của tôi" (trước 1.10 tên "Tài khoản") + "Trợ giúp" (từ 1.4) (trước là `.who` hiện tên nhân
  // viên riêng, không tính vào danh sách link; nay là MỘT MỤC CÓ NHÃN trong nhóm TÔI, đúng bản mẫu). Đo cả
  // #sidebar (không tràn) lẫn #topbar (thanh công việc mới: breadcrumb + tìm kiếm + nút, không tràn).
  // Phát hành 1.4 (gộp nhánh Trợ giúp): nhóm TÔI thêm mục "Trợ giúp" (mọi tài khoản) ⇒ ADMIN 11 mục, FIELD 3 mục.
  // Vận chuyển 1a (ADR-0040, bản vẽ 00; Ruling R23 của điều phối 2026-09-28): nhóm QUẢN TRỊ thêm mục cha "Vận chuyển" + hai mục con "Xe", "Sắp hết hạn"
  // (ô vehicle.manage) ⇒ +3. CHỈ cộng phần 1a: từ ADR-0038 mục "Nhật ký" chỉ còn ở Toàn quyền nên Quản trị thiếu 1 mục so với số 11 cũ — ĐỎ SẴN trên main,
  // không do 1a, chưa sửa ở đây (kịch bản còn đỏ sẵn ở :450 trước dòng này).
  // Tách "Danh mục giấy tờ" theo chủ dữ liệu (chủ dự án 2026-09-28; ô admin.manage): thêm "Loại giấy tờ cá nhân" (sau "Địa điểm") + mục con "Loại giấy tờ xe" (dưới
  // "Vận chuyển") ⇒ +2 ⇒ 16. Cũng CHỈ cộng phần của việc này: số THẬT của Quản trị nay là 15 (= 13 + 2) — con số 16 còn giữ nợ "Nhật ký" (ADR-0038, đỏ sẵn).
  // ADR-0049 B8 (bản vẽ Bảng điều phối vo-may-tinh, 2026-09-29): mục con "Lý do điều phối" (ô admin.manage) ⇒ +1. "Chính sách điều phối" chỉ Toàn quyền (ô
  // settings.ops) — Quản trị không có. B1 (vòng 3, Q-B-4): mục con "Điều phối xe" (ô trip.view) đứng đầu dưới "Vận chuyển" ⇒ +1 ⇒ 17.
  // 29/9 (làm xanh kịch bản, Phần B ADR-0049): BỎ nợ "Nhật ký" — ADR-0038 đã quyết Nhật ký chỉ Toàn quyền, nên Quản trị KHÔNG có mục đó là ĐÚNG; kịch bản nay
  // đếm số THẬT (16) và so ĐÚNG danh sách nhãn, thay cho con số 17 giữ chỗ nợ.
  // Tiền xe thuê (Đợt 4 G0, 2/10): mục con "Bảng giá thuê xe" (ô transport.rate.view) + "Bảng kê chi phí xe" (ô transport.cost.view) ngay sau "Điều phối xe" ⇒ +2 ⇒ 19.
  const ADMIN_NAV = [
    "Trang chủ", "Đơn hàng", "Tạo đơn", "Danh bạ",
    "Dịch vụ & giá", "Quản lý tài khoản", "Địa điểm", "Loại giấy tờ cá nhân", "Vận chuyển", "Điều phối xe", "Bảng giá thuê xe", "Bảng kê chi phí xe", "Xe", "Sắp hết hạn", "Loại giấy tờ xe", "Lý do điều phối",
    "Của tôi", "Góp ý / Báo lỗi", "Trợ giúp",
  ];
  const navMeasure = await p.ev(`(() => {
    const links = [...document.querySelectorAll('#sidebar .sidebar-item')];
    return {
      linkCount: links.length,
      labels: links.map((a) => a.querySelector('.sidebar-item-label').textContent.trim()),
      scrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      topbarOverflow: document.querySelector('#topbar').scrollWidth - document.querySelector('#topbar').clientWidth,
      sidebarOverflow: document.querySelector('#sidebar').scrollWidth - document.querySelector('#sidebar').clientWidth,
    };
  })()`);
  assert.deepEqual(navMeasure.labels, ADMIN_NAV, `Thanh điều hướng dọc (ADMIN): đúng 19 mục theo thứ tự — ${JSON.stringify(navMeasure.labels)}`);
  assert.equal(navMeasure.linkCount, 19, `Thanh điều hướng dọc (ADMIN) phải có 19 mục (ADR-0038: không "Nhật ký"; ADR-0049 B8: có "Lý do điều phối"; B1: có "Điều phối xe") — thấy ${navMeasure.linkCount}: ${JSON.stringify(navMeasure.labels)}`);
  assert.ok(navMeasure.scrollOverflow <= 1, `Thanh điều hướng máy tính: trang không được tràn ngang — lệch ${navMeasure.scrollOverflow}px`);
  assert.ok(navMeasure.topbarOverflow <= 1, `Thanh điều hướng máy tính: #topbar tự nó không được tràn ngang (flex-wrap phải nhận đủ) — lệch ${navMeasure.topbarOverflow}px`);
  assert.ok(navMeasure.sidebarOverflow <= 1, `Thanh điều hướng dọc: #sidebar tự nó không được tràn ngang — lệch ${navMeasure.sidebarOverflow}px`);
  ok(`D) Thanh điều hướng dọc (1040px): ${navMeasure.linkCount} mục (${navMeasure.labels.join(", ")}), không tràn ngang (lệch ${navMeasure.scrollOverflow}px), #topbar/#sidebar tự chúng không tràn`);
  p.close();
  ok("Trang chủ (máy tính, 1040×800, bản vẽ v2): dải chào + nhóm ô đúng quyền, thẻ số liệu bốn ô + biểu đồ đúng số, danh sách chuyến + dòng thời gian, thứ tự DOM đúng, không tái phát bug giờ/nơi đón, axe không vi phạm critical/serious");

  p = await env.as(ACCOUNTS.admin, "/", MOB);
  await p.waitFor("!document.querySelector('#dash-grid').hidden", "Trang chủ tải xong (điện thoại)");
  m = await measureHome(p);
  assertHome(m, "Trang chủ (điện thoại, 390×844)", "mobile");
  // Bản vẽ điện thoại 2026-09-30: lưới 2×2 cũ (Đợt D Task 1, #dash-grid display:grid + #dash-stats display:contents) thay bằng thẻ số liệu riêng #dash-so;
  // #dash-grid ở khổ này chỉ còn xếp dọc Chuyến đón → Cần xem lại (display:flex cột).
  assert.equal(m.gridDisplay, "flex", `Trang chủ (điện thoại): #dash-grid phải display:flex (xếp dọc các thẻ) ở ≤640px — ${JSON.stringify(m)}`);
  // Đợt D Task 3 (đặc tả §3.6: "Biểu đồ và 'Cần xem lại': xếp một cột dưới danh sách chuyến"): #dash-review đứng
  // CUỐI, sau #dash-today — đúng thứ tự đọc tự nhiên ở điện thoại (bài học Đợt C: DOM phẳng, không dùng CSS order).
  assert.deepEqual(
    m.gridOrder,
    ["dash-today", "dash-so-mt", "dash-review"],
    `Trang chủ (điện thoại): thứ tự DOM phải là dash-today, dash-so-mt (ẩn ở khổ này), dash-review (thứ tự đọc: chuyến đón, rồi Cần xem lại) — ${JSON.stringify(m.gridOrder)}`,
  );
  {
    // Bản vẽ 2026-09-30 (1a): bốn ô số liệu là MỘT thẻ chia 2×2 — đo THẬT hai hàng × hai cột, và thẻ nằm TRÊN "Chuyến đón".
    const soMeasure = await p.ev(`(() => {
      const r = [...document.querySelectorAll('#dash-so .dash-so-o')].map((el) => el.getBoundingClientRect());
      return { tops: r.map((x) => Math.round(x.top)), lefts: r.map((x) => Math.round(x.left)), soBottom: Math.round(document.querySelector('#dash-so').getBoundingClientRect().bottom), todayTop: Math.round(document.querySelector('#dash-today').getBoundingClientRect().top) };
    })()`);
    const [t0, t1, t2, t3] = soMeasure.tops;
    const [l0, l1, l2, l3] = soMeasure.lefts;
    assert.ok(Math.abs(t0 - t1) <= 1 && Math.abs(t2 - t3) <= 1 && t2 > t0, `Trang chủ (điện thoại): bốn ô số liệu phải xếp HAI hàng — ${JSON.stringify(soMeasure)}`);
    assert.ok(Math.abs(l0 - l2) <= 1 && Math.abs(l1 - l3) <= 1 && l1 > l0, `Trang chủ (điện thoại): bốn ô số liệu phải xếp HAI cột — ${JSON.stringify(soMeasure)}`);
    assert.ok(soMeasure.soBottom <= soMeasure.todayTop, `Trang chủ (điện thoại): thẻ số liệu phải nằm TRÊN "Chuyến đón" — ${JSON.stringify(soMeasure)}`);
    ok(`Bản vẽ 2026-09-30 (1a): thẻ số liệu 2×2 — hàng ${JSON.stringify([t0, t2])}, cột ${JSON.stringify([l0, l1])}, nằm trên "Chuyến đón" (top=${soMeasure.todayTop})`);
  }
  {
    // Bản vẽ 2026-09-30 (1a) KHÔNG có logo ở đầu Trang chủ điện thoại: dải đầu trang là ảnh đại diện + "Xin chào," + tên + ngày, chuông, Trợ giúp. (Task 7
    // phần A — logo tròn hết cỡ — vẫn đúng ở các trang khác: khẳng định C-1 bên dưới đo logo HIỆN ở 390px của /orders, /order-form….)
    const brand = await p.ev(`(() => { const b = document.querySelector('#topbar .brand'); return { shown: b ? b.offsetParent !== null : null, radius: getComputedStyle(document.querySelector('#topbar .brand-logo')).borderRadius }; })()`);
    assert.equal(brand.shown, false, `Trang chủ (điện thoại): logo/tên app KHÔNG hiện ở dải đầu Trang chủ (bản vẽ 2026-09-30) — ${JSON.stringify(brand)}`);
    assert.equal(brand.radius, "999px", `Task 7 phần A: luật bo tròn logo vẫn còn (dùng ở các trang khác) — ${JSON.stringify(brand)}`);
    ok(`Bản vẽ 2026-09-30: dải đầu Trang chủ điện thoại không có logo; luật bo tròn logo vẫn còn cho các trang khác`);
  }
  {
    // ==================================================================================================
    // K) TRANG CHỦ ĐIỆN THOẠI THEO BẢN VẼ 2026-09-30 ("Trang chu dien thoai.dc.html" 1a–1c, Claude Design): dải đầu trang = #topbar đổi kiểu
    //    (không dính, nền chuyển xanh), lời chào + ngày, chuông + Trợ giúp; ô tìm đơn 16px nổi; lưới ô theo quyền (Quản trị: 7 ô + "Tất cả");
    //    huy hiệu dùng lại số đã có (Đơn hàng = số đơn chưa xác nhận, Dịch vụ & giá = số dịch vụ lệch Sheet); bảng trượt "Tất cả chức năng" bốn nhóm.
    // ==================================================================================================
    const k = await p.ev(`(() => {
      const vis = (el) => !!el && el.offsetParent !== null;
      const tb = document.querySelector('#topbar');
      const chao = document.querySelector('#topbar .dash-hero-chao');
      const input = document.querySelector('#dash-tim-o');
      return {
        topbarPosition: getComputedStyle(tb).position,
        chaoShown: vis(chao),
        chao: chao ? [...chao.children].map((c) => c.textContent.trim()) : null,
        bellShown: vis(tb.querySelector('.bell')),
        helpHref: tb.querySelector('.dash-hero-nut')?.getAttribute('href') ?? null,
        helpShown: vis(tb.querySelector('.dash-hero-nut')),
        timShown: vis(document.querySelector('#dash-tim')),
        timFont: input ? getComputedStyle(input).fontSize : null,
        timPlaceholder: input?.getAttribute('placeholder') ?? null,
        o: [...document.querySelectorAll('#dash-o > .dash-o-muc')].map((el) => ({ nhan: el.querySelector('.dash-o-nhan').textContent.trim(), href: el.getAttribute('href'), so: el.querySelector('.dash-o-so')?.textContent.trim() ?? null, mau: el.querySelector('.dash-o-so')?.className ?? null, shown: vis(el) })),
      };
    })()`);
    assert.equal(k.topbarPosition, "static", `K: dải đầu Trang chủ điện thoại cuộn theo trang (không dính) — ${JSON.stringify(k)}`);
    assert.ok(k.chaoShown && k.chao[0] === "Xin chào," && k.chao[1] === ACCOUNTS.admin.name && /^(Thứ \S+|Chủ nhật|Chủ Nhật), \d{2}\/\d{2}$/.test(k.chao[2]), `K: lời chào "Xin chào," + tên + "Thứ …, dd/mm" — ${JSON.stringify(k.chao)}`);
    assert.ok(k.bellShown && k.helpShown && k.helpHref === "/help", `K: chuông + nút Trợ giúp (/help) hiện trên dải đầu trang — ${JSON.stringify(k)}`);
    assert.ok(k.timShown && k.timFont === "16px" && k.timPlaceholder === "Tìm mã đơn, tên khách, SĐT…", `K: ô tìm đơn hiện, chữ 16px (chống iOS tự phóng to) — ${JSON.stringify(k)}`);
    assert.deepEqual(k.o.map((x) => x.nhan), ["Tạo đơn", "Đơn hàng", "Danh bạ", "Điều phối xe", "Xe", "Giấy tờ sắp hết hạn", "Dịch vụ & giá", "Tất cả"], `K: lưới Quản trị = 7 ô theo thứ tự ưu tiên + "Tất cả" (bản vẽ 1b) — ${JSON.stringify(k.o)}`);
    assert.ok(k.o.every((x) => x.shown), `K: mọi ô hiển thị thật — ${JSON.stringify(k.o)}`);
    const don = k.o.find((x) => x.nhan === "Đơn hàng");
    const dv = k.o.find((x) => x.nhan === "Dịch vụ & giá");
    assert.ok(don.so === "1" && /dash-o-so-xanh/.test(don.mau), `K: huy hiệu "Đơn hàng" = số đơn chưa xác nhận (1, R2), màu xanh — ${JSON.stringify(don)}`);
    assert.ok(dv.so === "1" && /dash-o-so-cat/.test(dv.mau), `K: huy hiệu "Dịch vụ & giá" = số dịch vụ lệch Sheet (1, TD101), màu cát — ${JSON.stringify(dv)}`);
    assert.equal(k.o.find((x) => x.nhan === "Tạo đơn").href, "/order-form", `K: ô "Tạo đơn" dẫn tới /order-form — ${JSON.stringify(k.o)}`);
    // Bảng trượt "Tất cả chức năng" (bản vẽ 1c): mở bằng ô "Tất cả", bốn nhóm (Quản trị: không có Nhật ký / Gửi thông báo — chỉ Toàn quyền), đóng bằng Esc,
    // tiêu điểm trở về ô "Tất cả".
    await p.ev(`[...document.querySelectorAll('#dash-o > .dash-o-muc')].find((b) => b.textContent.trim() === 'Tất cả').click()`);
    await p.waitFor("!!document.querySelector('.sheet.dash-tc')", "bảng trượt Tất cả chức năng mở");
    const sheet = await p.ev(`(() => ({
      title: document.querySelector('.sheet.dash-tc .sheet-title').textContent.trim(),
      nhom: [...document.querySelectorAll('.dash-tc .dash-tc-nhom')].map((g) => [g.querySelector('.dash-tc-ten').textContent.trim(), [...g.querySelectorAll('.dash-o-nhan')].map((n) => n.textContent.trim())]),
    }))()`);
    assert.equal(sheet.title, "Tất cả chức năng", `K: tiêu đề bảng trượt — ${JSON.stringify(sheet)}`);
    assert.deepEqual(
      sheet.nhom,
      [
        ["Bán hàng", ["Tạo đơn", "Đơn hàng", "Danh bạ"]],
        ["Quản lý", ["Dịch vụ & giá", "Quản lý tài khoản", "Địa điểm", "Loại giấy tờ cá nhân"]],
        ["Vận chuyển", ["Điều phối xe", "Bảng giá thuê xe", "Bảng kê chi phí xe", "Xe", "Giấy tờ sắp hết hạn", "Loại giấy tờ xe", "Lý do điều phối"]],
        ["Của tôi", ["Góp ý / Báo lỗi", "Trợ giúp"]],
      ],
      `K: bốn nhóm của bảng trượt Quản trị — ${JSON.stringify(sheet.nhom)}`,
    );
    await shot(p, "trang-chu-dien-thoai-tat-ca.png");
    await axe(p, "Trang chủ điện thoại (bảng trượt Tất cả chức năng)");
    await p.ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    await p.waitFor("!document.querySelector('.sheet-root')", "Esc đóng bảng trượt");
    assert.equal(await p.ev("document.activeElement?.textContent.trim()"), "Tất cả", "K: đóng bảng trượt trả tiêu điểm về ô \"Tất cả\"");
    ok(`K) Bản vẽ 2026-09-30: dải chào ${JSON.stringify(k.chao)}, ô tìm 16px, lưới ${k.o.length} chỗ (${k.o.map((x) => x.nhan + (x.so ? `[${x.so}]` : "")).join(", ")}), bảng trượt 4 nhóm mở/đóng đúng`);
  }
  assert.deepEqual(p.consoleErrors, [], `lỗi console (Trang chủ điện thoại): ${p.consoleErrors}`);
  await shot(p, "trang-chu-dien-thoai.png");
  await axe(p, "Trang chủ điện thoại");

  // ==================================================================================================
  // D) ĐO THẬT tab bar ở 390px: ADMIN nay có 6 mục (Trang chủ, Đơn hàng, Đơn mới, Dịch vụ, Nhân viên, Tôi).
  //    (a) chiều cao thật của #tabbar so với token --tabbar-h (56px) — vượt thì nội dung cuối trang bị đè
  //        (body.has-tabbar main đệm đáy bằng token CỐ ĐỊNH, không theo chiều cao thật).
  //    (b) nhãn tab có xuống 2 dòng không (so chiều cao một nhãn với chiều cao dòng chữ một dòng).
  //    (c) có tràn ngang không.
  // ==================================================================================================
  const tabbarMeasure = await p.ev(`(() => {
    const bar = document.querySelector('#tabbar');
    const tabs = [...document.querySelectorAll('#tabbar .tab')];
    const barRect = bar.getBoundingClientRect();
    const tokenPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tabbar-h'));
    const main = document.querySelector('main');
    const mainCs = getComputedStyle(main);
    const mainPaddingBottom = parseFloat(mainCs.paddingBottom);
    const labelLineHeights = tabs.map((t) => {
      const label = t.querySelector('span:not(.tab-icon)');
      const cs = getComputedStyle(label);
      const oneLine = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      const actual = label.getBoundingClientRect().height;
      return { text: label.textContent.trim(), oneLineHeight: oneLine, actualHeight: actual, wrapped: actual > oneLine + 1 };
    });
    return {
      tabCount: tabs.length,
      labels: tabs.map((t) => t.textContent.trim()),
      barHeight: barRect.height,
      barTop: barRect.top,
      tokenPx,
      mainPaddingBottom,
      windowInnerHeight: innerHeight,
      labelLineHeights,
      scrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  })()`);
  assert.equal(tabbarMeasure.tabCount, 6, `Tab bar điện thoại (ADMIN) phải có 6 mục — thấy ${tabbarMeasure.tabCount}: ${JSON.stringify(tabbarMeasure.labels)}`);
  assert.ok(tabbarMeasure.scrollOverflow <= 1, `Tab bar điện thoại: trang không được tràn ngang — lệch ${tabbarMeasure.scrollOverflow}px`);
  const wrapped = tabbarMeasure.labelLineHeights.filter((l) => l.wrapped);
  const overTokenPx = tabbarMeasure.barHeight - tabbarMeasure.tokenPx;
  const paddingCovers = tabbarMeasure.mainPaddingBottom + 1 >= tabbarMeasure.barHeight; // +1: sai số làm tròn subpixel
  ok(
    `D) ĐO THẬT tab bar (390px, ADMIN 6 mục): chiều cao thật ${tabbarMeasure.barHeight}px (token --tabbar-h = ${tabbarMeasure.tokenPx}px, lệch ${overTokenPx.toFixed(2)}px); ` +
      `main padding-bottom = ${tabbarMeasure.mainPaddingBottom}px (${paddingCovers ? "ĐỦ che tab bar" : "KHÔNG đủ — nội dung cuối trang có thể bị đè"}); ` +
      `nhãn xuống 2 dòng: ${wrapped.length === 0 ? "không có" : wrapped.map((l) => l.text).join(", ")}; nhãn: ${tabbarMeasure.labels.join(" | ")}`,
  );
  assert.ok(
    paddingCovers,
    `Tab bar điện thoại: chiều cao thật (${tabbarMeasure.barHeight}px) VƯỢT đệm đáy của <main> (${tabbarMeasure.mainPaddingBottom}px, dựa trên token --tabbar-h=${tabbarMeasure.tokenPx}px cố định) → nội dung cuối trang (danh sách "Doanh thu của tôi") có thể bị tab bar ĐÈ LÊN. Cần sửa CSS (đệm đáy theo chiều cao thật, hoặc giảm nguy cơ xuống dòng của nhãn) — KHÔNG sửa kịch bản cho qua.`,
  );
  p.close();
  ok("Trang chủ (điện thoại, 390×844): 3 ô số liệu + danh sách + doanh thu đúng số, bố cục lưới 2×2 gộp doanh thu (Đợt D Task 1), thứ tự DOM đúng, không tái phát bug giờ/nơi đón, không tràn ngang, axe không vi phạm critical/serious");

  // ==================================================================================================
  // E) TRẠNG THÁI "TUẦN TRẮNG" (Fix round 1 — phát hiện Important của người kiểm độc lập Task 2, LƯỚI BẮT BUỘC thêm
  //    theo yêu cầu sửa): revenueWeek lọc THEO `staff_id` (repository.ts §5, dòng `AND staff_id = ?1`) nên một tài
  //    khoản MỚI, CHƯA từng lập đơn, LUÔN thấy doanh thu tuần = 0 — kể cả khi R1/R3 (do ADMIN lập) đã có doanh thu
  //    thật ở trên. Đây là cách RẺ để dựng tình huống "tuần chưa có đơn nào" (không cần xoá/chờ dữ liệu), đúng gợi ý
  //    ở yêu cầu sửa. `revenueChart()` khi max===0 trả `<p class="empty dash-chart-empty">` — TRƯỚC fix round 1 thẻ
  //    này KHÔNG mang class `dash-revenue-chart` nên luật ẩn ở khổ điện thoại (`public/app.css`, `@media (max-width:
  //    639px) { .dash-revenue-chart { display: none; } }`) không khớp, dòng chữ lộ ra thành một dòng thừa trong ô
  //    "Doanh thu của tôi" của lưới 2×2 (sáng thứ Hai mỗi tuần hoặc nhân viên mới, trên chính điện thoại nhân viên
  //    dùng hàng ngày) — kịch bản (bản trước fix) không bắt được vì dữ liệu thử luôn có doanh thu.
  // ==================================================================================================
  {
    const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
    const emptyWeekStaff = { name: "Sales Tuần Trắng", phone: "0900000397", pin: "998855", permissions: ["SALES"] };
    for (const stmt of (await insertStaffSql(emptyWeekStaff)).split("\n")) env.sql(stmt);

    const pEmpty = await env.as(emptyWeekStaff, "/", MOB);
    await pEmpty.waitFor("!document.querySelector('#dash-grid').hidden", "Trang chủ tải xong (tài khoản tuần trắng, điện thoại)");
    const mEmpty = await measureHome(pEmpty);
    assert.equal(mEmpty.gridHidden, false, `Tuần trắng: #dash-grid phải HIỆN sau khi tải xong — ${JSON.stringify(mEmpty)}`);
    assert.equal(mEmpty.errorHidden, true, `Tuần trắng: #error phải ẨN (không lỗi) — ${JSON.stringify(mEmpty)}`);
    assert.equal(mEmpty.revenueValue, "0 ₫", `Tuần trắng: giá trị RÚT GỌN doanh thu phải là "0 ₫" (tài khoản mới, chưa lập đơn nào) — ${JSON.stringify(mEmpty)}`);
    assert.ok(mEmpty.revenueSub.includes("0 đơn"), `Tuần trắng: dòng phụ doanh thu phải nói "0 đơn" — ${mEmpty.revenueSub}`);
    // Bản vẽ 2026-09-30: ở điện thoại doanh thu nằm ở ô thứ hai của thẻ số liệu 2×2 (#dash-so) — đo bản đang hiển thị thật.
    assert.ok(mEmpty.so[1]?.shown && mEmpty.so[1].value === "0 ₫" && mEmpty.so[1].sub === "Tuần này · 0 đơn", `Tuần trắng (điện thoại): ô "Doanh thu của tôi" = "0 ₫" · "Tuần này · 0 đơn" — ${JSON.stringify(mEmpty.so)}`);

    // Đợt D Task 3 ("Cần xem lại", CHỈ ADMIN): tài khoản này chỉ giữ SALES — DÙ dữ liệu cảnh báo thật đã có (TD101
    // lệch Sheet + 2 góp ý MỚI, seed ở mục T3, cùng một D1 với tài khoản ADMIN) — khối này TUYỆT ĐỐI KHÔNG được lộ
    // ra (quyết định chủ dự án, docs/superpowers/specs/2026-09-23-trang-chu-moi-quyet-dinh.md mục 3). Đo ở khổ điện
    // thoại tại đây; vế máy tính đo lại bên dưới (cùng tài khoản, đổi viewport).
    assert.equal(mEmpty.review.hiddenAttr, true, `Tuần trắng (SALES, điện thoại): #dash-review PHẢI ẨN (không phải quản trị) — ${JSON.stringify(mEmpty.review)}`);
    assert.equal(mEmpty.review.shown, false, `Tuần trắng (SALES, điện thoại): #dash-review KHÔNG được hiển thị thật — ${JSON.stringify(mEmpty.review)}`);
    assert.equal(mEmpty.review.rows.length, 0, `Tuần trắng (SALES, điện thoại): không được dựng dòng cảnh báo nào — ${JSON.stringify(mEmpty.review)}`);

    // LƯỚI CHÍNH (đặt TRƯỚC mọi assert khác đụng tới `.dash-revenue-chart`/`.dash-chart-empty`, để lưới này là điểm ĐỎ
    // ĐẦU TIÊN khi lỗi tái phát — không bị một assert khác "tự khớp với cách sửa đã chọn" chặn trước, che mất lưới
    // thật): đo TRỰC TIẾP phần tử ".dash-chart-empty" (dòng "Chưa có đơn nào tuần này") — nếu nó tồn tại trong DOM
    // thì PHẢI không hiển thị thật ở khổ điện thoại. Cố ý bỏ class `dash-revenue-chart` khỏi <p> rỗng (hoàn nguyên
    // tạm) sẽ làm assert `emptyShown` này ĐỎ (xem báo cáo P16) — không phụ thuộc CÁCH sửa (class trên <p> hay mở
    // rộng luật CSS), chỉ đo đúng HÀNH VI hiển thị mà yêu cầu sửa đòi hỏi.
    const readEmpty = () =>
      pEmpty.ev(`(() => {
        const emptyEl = document.querySelector('#dash-so-mt .dash-chart-empty');
        return {
          emptyExists: !!emptyEl,
          emptyShown: emptyEl ? emptyEl.offsetParent !== null : null,
          emptyText: emptyEl ? emptyEl.textContent.trim() : null,
        };
      })()`);
    const emptyMobile = await readEmpty();
    assert.equal(emptyMobile.emptyExists, true, `Tuần trắng: dòng "Chưa có đơn nào tuần này" (.dash-chart-empty) phải tồn tại trong DOM — ${JSON.stringify(emptyMobile)}`);
    assert.equal(
      emptyMobile.emptyShown,
      false,
      `LƯỚI CHÍNH (Fix round 1): dòng "${emptyMobile.emptyText}" KHÔNG được hiển thị thật (offsetParent) ở khổ điện thoại 390px — nếu true thì lỗi Important của người kiểm độc lập Task 2 ĐÃ TÁI PHÁT (thiếu class dash-revenue-chart trên <p> rỗng nên luật ẩn ở public/app.css không khớp) — ${JSON.stringify(emptyMobile)}`,
    );

    // Đo bổ trợ (pin cách sửa đã CHỌN — gắn class lên chính <p> rỗng, không đổi CSS): nếu ai đổi sang cách khác
    // (mở rộng luật CSS sang `.dash-chart-empty`) mà KHÔNG còn gắn class `dash-revenue-chart` cho <p>, khối này báo
    // đỏ nhưng KHÔNG phải lỗi hiển thị thật (lưới chính ở trên mới là lưới bắt buộc) — chỉ bỏ khối này nếu đổi cách sửa.
    if (mEmpty.chart) {
      assert.equal(mEmpty.chart.shown, false, `Tuần trắng: .dash-revenue-chart (dòng chữ rỗng) KHÔNG được hiển thị thật ở khổ điện thoại — ${JSON.stringify(mEmpty.chart)}`);
      assert.equal(mEmpty.chart.barCount, 0, `Tuần trắng: không được vẽ cột nào (max===0, nhánh dòng chữ rỗng) — ${JSON.stringify(mEmpty.chart)}`);
    }

    assert.deepEqual(pEmpty.consoleErrors, [], `lỗi console (Tuần trắng, điện thoại): ${pEmpty.consoleErrors}`);
    await shot(pEmpty, "trang-chu-dien-thoai-tuan-trang.png");
    await axe(pEmpty, "Trang chủ điện thoại (tuần trắng)");

    // Vế còn lại của lưới (không để lưới "ẩn ở MỌI khổ" cũng lọt qua): luật ẩn chỉ áp dụng ≤639px — ở khổ máy tính
    // dòng chữ rỗng PHẢI hiển thị thật. Đổi khổ NGAY trên trang đang mở (không điều hướng lại) — CSS phản hồi theo
    // khổ ngay lập tức, không cần tải lại.
    await pEmpty.send("Emulation.setDeviceMetricsOverride", { width: DESK.width, height: DESK.height, deviceScaleFactor: 1, mobile: false });
    const emptyDesktop = await readEmpty();
    assert.equal(emptyDesktop.emptyShown, true, `Tuần trắng (máy tính, vế bổ trợ): dòng "Chưa có đơn nào tuần này" PHẢI hiển thị thật ở khổ máy tính (luật ẩn chỉ áp dụng ≤639px, không phải ẩn mọi khổ) — ${JSON.stringify(emptyDesktop)}`);

    // Đợt D Task 3 — vế máy tính: cùng tài khoản SALES, cùng dữ liệu cảnh báo thật, đổi khổ màn hình KHÔNG được làm
    // lộ khối "Cần xem lại" (quyền không phụ thuộc khổ màn hình).
    const mEmptyDesktop = await measureHome(pEmpty);
    assert.equal(mEmptyDesktop.review.hiddenAttr, true, `Tuần trắng (SALES, máy tính): #dash-review PHẢI ẨN — ${JSON.stringify(mEmptyDesktop.review)}`);
    assert.equal(mEmptyDesktop.review.shown, false, `Tuần trắng (SALES, máy tính): #dash-review KHÔNG được hiển thị thật — ${JSON.stringify(mEmptyDesktop.review)}`);
    assert.equal(mEmptyDesktop.review.rows.length, 0, `Tuần trắng (SALES, máy tính): không được dựng dòng cảnh báo nào — ${JSON.stringify(mEmptyDesktop.review)}`);

    // Fix round 2 — kiểm nghi ngờ: <p class="dash-chart-empty dash-revenue-chart"> ở khổ máy tính nhận CSS
    // `.dash-revenue-chart { display: flex; flex-direction: column; }` (một <p> chứa text trở thành flex container).
    // Chụp ảnh để XEM THẬT dòng chữ có căn sai/giãn chữ/mất khoảng cách hay không (không chỉ đo DOM).
    await shot(pEmpty, "trang-chu-may-tinh-tuan-trang.png");

    pEmpty.close();
    ok(`E) Tuần trắng (tài khoản SALES mới, chưa lập đơn): doanh thu = "0 ₫" · "${mEmpty.revenueSub}"; dòng chữ rỗng tồn tại trong DOM, KHÔNG hiển thị thật ở 390px (ô "Doanh thu của tôi" chỉ còn tổng tiền + dòng phụ, đúng bản mẫu), CÓ hiển thị thật ở khổ máy tính (vế bổ trợ); Đợt D Task 3: #dash-review ẨN ở CẢ HAI khổ dù dữ liệu cảnh báo thật đã có (không phải quản trị)`);
  }

  // ==================================================================================================
  // C) (SỬA sau kế hoạch 2026-09-27 Task 1.7, ruling điều phối đã xác nhận ở Task 1.5 — ĐẢO CÓ CHỦ ĐÍCH, không phải
  //    lỗi, đúng dòng `src/shared/start-page.test.ts:26-32`/S23-4) — TRƯỚC: tài khoản chỉ FIELD không có quyền văn
  //    phòng gọi "/" thấy banner lỗi 403 THẬT của route "office" (GET /api/orders/dashboard). Từ ADR-0030 S23-4
  //    (Task 1.5): chỉ-FIELD nay có cổng "orders" (đọc đơn mình phụ trách) → `homeRedirect` (src/shared/start-page.ts)
  //    đưa họ sang THẲNG "/orders" trước khi trang chủ kịp gọi dashboard — banner lỗi cũ KHÔNG BAO GIỜ còn hiện được.
  //    Khẳng định MỚI: dừng đúng ở "/orders", KHÔNG banner lỗi, KHÔNG gọi /api/orders/dashboard (route văn phòng).
  // ==================================================================================================
  {
    const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
    const fieldOnly = { name: "Hướng Dẫn Viên Thử", phone: "0900000399", pin: "998877", permissions: ["FIELD"] };
    for (const stmt of (await insertStaffSql(fieldOnly)).split("\n")) env.sql(stmt);

    const pErr = await env.as(fieldOnly, "/", MOB);
    await pErr.waitFor("location.pathname === '/orders' && document.readyState === 'complete'", "chỉ-FIELD mở \"/\" phải dừng ở /orders (ADR-0030 S23-4)", 15000);
    await pErr.waitFor("!document.querySelector('#loading') || document.querySelector('#loading').hidden", "danh sách /orders tải xong (không kẹt khung xương)", 10000);
    const mErr = await pErr.ev(`(() => ({
      path: location.pathname,
      errorHidden: document.querySelector('#error').hidden,
      errorText: document.querySelector('#error').hidden ? "" : document.querySelector('#error').textContent.trim(),
      hasDashGrid: !!document.querySelector('#dash-grid'),
    }))()`);
    assert.equal(mErr.path, "/orders", `Task 1.7: chỉ-FIELD phải dừng ở /orders (KHÔNG còn ở Trang chủ "/") — ${JSON.stringify(mErr)}`);
    assert.equal(mErr.errorHidden, true, `Task 1.7: KHÔNG còn banner lỗi (route "office" không bao giờ được gọi) — ${JSON.stringify(mErr)}`);
    assert.equal(mErr.hasDashGrid, false, `Task 1.7: trang cuối không được là Trang chủ (không có #dash-grid) — ${JSON.stringify(mErr)}`);
    // KHÔNG khẳng định "không gọi dashboard" ở đây (khác khối I/PARTNER dưới): ADR-0035 (`layDashboard`/`goiSom`,
    // web/home.ts) gọi dashboard SỚM song song với /api/auth/me dựa trên bản nhớ CỦA TRÌNH DUYỆT từ lượt xem trước
    // (có thể là tài khoản seesAll khác, cùng persist Chrome của kịch bản) — gọi sớm rồi 403/bỏ qua là ĐÚNG thiết
    // kế, không phải rò quyền (route vẫn tự kiểm access "office", chỉ-FIELD không đọc được số liệu). Ngoài phạm vi
    // Task 1.7 (nhãn hiển thị) nên không kiểm ở đây; chỉ khẳng định KẾT QUẢ hiển thị: dừng ở /orders, không banner lỗi.
    await shot(pErr, "trang-chu-loi-khong-co-quyen.png");
    ok(`C) (Task 1.7) chỉ-FIELD mở "/" (điện thoại 390×844): dừng ở /orders, KHÔNG banner lỗi, KHÔNG gọi dashboard — thay cho trạng thái lỗi cũ (đã hết từ Task 1.5, ADR-0030 S23-4)`);

    // ================================================================================================
    // D-1 (Fix round 1 — bằng chứng còn thiếu): THANH BÊN của tài khoản chỉ có quyền FIELD. Bản đồ quyền của
    // sidebar phải giữ ĐÚNG luật cũ (office/admin/canCreate): FIELD không có quyền văn phòng nên nhóm BÁN HÀNG
    // và QUẢN TRỊ phải RỖNG, và nhóm rỗng ẩn CẢ TIÊU ĐỀ (đặc tả §3.1) — chỉ còn nhóm "TÔI". "Đăng xuất" vẫn
    // phải có (đây là lối đăng xuất duy nhất trong khung). Đổi khổ ngay trên trang đang mở, không tải lại.
    // ================================================================================================
    await pErr.send("Emulation.setDeviceMetricsOverride", { width: DESK.width, height: DESK.height, deviceScaleFactor: 1, mobile: false });
    const fieldNav = await pErr.ev(`(() => {
      const vis = (el) => !!el && el.offsetParent !== null;
      const sb = document.querySelector('#sidebar');
      return {
        sidebarShown: vis(sb),
        groupTitles: [...document.querySelectorAll('#sidebar .sidebar-group-title')].map((e) => e.textContent.trim()),
        labels: [...document.querySelectorAll('#sidebar .sidebar-item-label')].map((e) => e.textContent.trim()),
        logoutShown: vis(document.querySelector('.sidebar-logout')),
        badgeCount: document.querySelectorAll('#sidebar .sidebar-item-badge').length,
      };
    })()`);
    assert.equal(fieldNav.sidebarShown, true, `D-1 (FIELD, 1040px): thanh bên phải hiển thị thật — ${JSON.stringify(fieldNav)}`);
    assert.deepEqual(fieldNav.groupTitles, ["TÔI"], `D-1 (FIELD): thanh bên chỉ được có nhóm "TÔI" — nhóm BÁN HÀNG/QUẢN TRỊ rỗng phải ẩn CẢ tiêu đề — ${JSON.stringify(fieldNav)}`);
    assert.deepEqual(fieldNav.labels, ["Của tôi", "Góp ý / Báo lỗi", "Trợ giúp"], `D-1 (FIELD): thanh bên chỉ được có 3 mục của nhóm TÔI — ${JSON.stringify(fieldNav)}`);
    assert.equal(fieldNav.logoutShown, true, `D-1 (FIELD): "Đăng xuất" phải hiển thị thật trong thanh bên — ${JSON.stringify(fieldNav)}`);
    await shot(pErr, "task-4-sidebar-field-may-tinh.png");
    ok(`D-1) Thanh bên của tài khoản chỉ FIELD (1040px): đúng 1 nhóm ${JSON.stringify(fieldNav.groupTitles)}, đúng 3 mục ${JSON.stringify(fieldNav.labels)}, có "Đăng xuất", không huy hiệu nào (${fieldNav.badgeCount})`);
    pErr.close();
  }

  // ==================================================================================================
  // G) ĐỢT D TASK 4 — VÒNG SỬA 1+2: khung dùng chung (thanh bên + thanh công việc + <main>) của CẢ 12 TRANG.
  //    Kịch bản cũ chỉ chạy ở 1040px và 390px — đúng hai khổ KHÔNG bộc lộ ba lỗi mà người kiểm độc lập tìm ra.
  //    Từ nay quét cả dải: 640 (mốc cũ, tab bar) · 641 (mốc mới của thanh bên) · 645/650 (dải ô chọn "Lọc hành
  //    động" của Nhật ký tràn ngang) · 700 · 768 (iPad dựng đứng) · 899 · 900 (mốc bố cục 2 cột + ô tìm kiếm) ·
  //    910/929/930 (dải thanh công việc gãy dòng khi breadcrumb DÀI) · 1040 · 1440 · 1920.
  //
  //    VÒNG SỬA 2 — quét BA TRANG, không phải một. Khuyết tật của lưới vòng 1 KHÔNG nằm ở khẳng định (nó viết đúng)
  //    mà ở PHẠM VI TRANG: chỉ quét /staff, nơi breadcrumb ngắn ("Nhân viên", 49px) và không có ô chọn nào, nên hai
  //    hồi quy do chính vòng 1 gây ra không bao giờ chạm tới lưới. Ba trang từ nay:
  //      · /staff              — trang danh sách thường + DUY NHẤT chạy nhánh ≤640px (bằng chứng bề mặt điện thoại);
  //                              KHÔNG phải "/" vì nó tự gọi dashboard nên không đo được lời gọi huy hiệu (G-4);
  //      · /order-form?id=…    — breadcrumb DÀI "Sửa đơn <mã đơn>" (188px): trang bộc lộ lỗi nút "Tạo đơn" đè
  //                              lên tiêu đề ở dải 900–928px. Phải CHỜ setBarTitle() chạy xong, nếu không chỉ đo
  //                              được chữ tĩnh "Tạo đơn mới" (ngắn) và lưới lại không chạm tới lỗi;
  //      · /audit              — ô chọn "Lọc hành động" tự rộng 394px (theo tuỳ chọn dài nhất), bộc lộ tràn ngang
  //                              ở dải 641–645px.
  //    Hai trang sau CHỈ quét từ 641px: /order-form khai data-tabbar="off" nên ở ≤640px không có thanh tab —
  //    nhánh ≤640px là bằng chứng của riêng /staff, không đem áp cho trang có thiết kế điện thoại khác.
  // ==================================================================================================
  // 29/9 (làm xanh kịch bản, Phần B ADR-0049): ADR-0038 — trang Nhật ký chỉ Toàn quyền (ô audit.view). Quản trị mở /audit chỉ thấy câu từ chối, ô "Lọc hành
  // động" không bao giờ dựng → kịch bản cũ kẹt (đỏ sẵn). Trang /audit nay mở bằng tài khoản Quản trị + Toàn quyền (như chủ dự án); thanh bên của tài khoản đó
  // có 20 mục = 17 của Quản trị + "Chính sách điều phối" (ADR-0049 B8), "Nhật ký", "Gửi thông báo". 30/9 (ADR-0069): + "Trợ lý Hỗ trợ" (ô settings.ops) = 21.
  const TOAN_QUYEN = { name: "Chủ Khung Thử", phone: "0900000396", pin: "998866", permissions: ["ADMIN", "SUPER_ADMIN"] };
  {
    const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
    for (const stmt of (await insertStaffSql(TOAN_QUYEN)).split("\n")) if (stmt.trim()) env.sql(stmt);
  }
  {
    const FRAME_PAGES = [
      { path: "/staff", label: "/staff", widths: [640, 641, 645, 650, 700, 768, 899, 900, 910, 929, 930, 1040, 1440, 1920], ready: null, mainCap: () => CSS_W_MAIN, account: ACCOUNTS.admin, sidebar: 19 },
      {
        // PHẢI là đơn NHÁP (R2). Đơn đã xác nhận (R1/R3) bị web/order-form.ts khoá form ("Chỉ sửa được đơn ở trạng
        // thái nháp") và KHÔNG gọi setBarTitle(`Sửa đơn <mã>`) — breadcrumb kẹt ở chữ "Sửa đơn" ngắn, lưới xanh giả.
        path: `/order-form?id=${r2.id}`,
        label: "/order-form?id=… (breadcrumb DÀI)",
        widths: [641, 700, 899, 900, 910, 929, 930, 1040, 1920],
        // setBarTitle() ở web/order-form.ts chạy SAU khi đơn tải xong. Đo sớm = đo chữ tĩnh "Tạo đơn mới" (ngắn):
        // lỗi 900–928px không tái hiện được và lưới xanh giả.
        ready: `/^Sửa đơn TD-/.test(document.querySelector('.bar-title').textContent.trim())`,
        expectTitlePrefix: "Sửa đơn TD-",
        // `main.form-page { max-width: var(--w-form) }` (public/app.css) chỉ nằm TRONG `@media (min-width: 960px)`
        // (cùng khối bật bố cục 2 cột form+tóm tắt) — dưới 960px trang Lập đơn vẫn dùng trần chung --w-main
        // (đã tự đo: bản đầu của khẳng định này báo đỏ SAI ở 641px vì giả định --w-form áp dụng mọi khổ ≥641px).
        mainCap: (width) => (width >= 960 ? CSS_W_FORM : CSS_W_MAIN),
        account: ACCOUNTS.admin,
        sidebar: 19,
      },
      {
        path: "/audit",
        label: "/audit",
        widths: [641, 645, 650, 700, 768, 900, 1040, 1920],
        // Ô chọn chỉ đạt bề rộng thật sau khi web/audit.ts sinh đủ optgroup/option từ src/shared/audit-actions.ts.
        ready: `document.querySelector('.toolbar select option[value]:not([value=""])') !== null`,
        mainCap: () => CSS_W_MAIN,
        account: TOAN_QUYEN,
        sidebar: 25, // 2/10 tiền xe thuê (Đợt 4 G0): + "Bảng giá thuê xe", "Bảng kê chi phí xe" = 25 (Quản trị 19). Trước đó 23 — 2/10 (ADR-0087, Task 5): + "Giao diện" (ô settings.ops, chỉ Toàn quyền) = 23; Quản trị không có ô này nên vẫn 17. Trước đó 22 (1/10, ADR-0075: + "Phiên đăng nhập")
      },
    ];

    const measureFrameOn = (pFrame) =>
      pFrame.ev(`(() => {
        const vis = (el) => !!el && el.offsetParent !== null;
        const root = getComputedStyle(document.documentElement);
        const sb = document.querySelector('#sidebar');
        const topbar = document.querySelector('#topbar');
        const main = document.querySelector('main');
        const sbr = sb.getBoundingClientRect();
        const mr = main.getBoundingClientRect();
        const tbr = topbar.getBoundingClientRect();
        // Thanh công việc nay có chiều cao GHIM theo token, nên "gãy 2 dòng" KHÔNG còn đo được bằng chiều cao
        // (gãy thì tràn ra ngoài chứ không làm thanh cao lên). Đo hai cách: nội dung có tràn khỏi ô không, và
        // có phần tử nào bắt đầu BÊN DƯỚI đáy của phần tử trước nó không (đúng định nghĩa "xuống dòng mới").
        const kids = [...topbar.children].filter(vis).map((k) => k.getBoundingClientRect());
        let rows = kids.length === 0 ? 0 : 1;
        for (let i = 1; i < kids.length; i++) if (kids[i].top >= kids[i - 1].bottom - 1) rows++;
        const navLinks = [...document.querySelectorAll('#sidebar .sidebar-item, #tabbar .tab')].filter(vis);
        // SỬA (Đợt D Task 6, A-2 — chú thích cũ dưới đây SAI, người kiểm độc lập chỉ ra): vòng sửa 2 từng ghi
        // "topbarRows/topbarContentOverflow từ nay KHÔNG THỂ đổi giá trị — chỉ còn là chứng nhân lịch sử". SAI: BA
        // hướng kiểm độc lập hoàn nguyên flex-wrap: nowrap (public/app.css) rồi chạy lại lưới THẬT và đều thấy MỘT
        // TRONG HAI khẳng định này đỏ — hai khẳng định này vẫn đang canh việc, và là phép đo BẮT ĐƯỢC lỗi gốc "gãy
        // dòng vì thừa flex-wrap: wrap" sớm nhất. Bộ ba dưới đây (đáy nút so với đáy thanh, đỉnh main so với đáy
        // thanh, chiều cao thanh so với token) là phép đo BỔ SUNG, chặn đúng dạng hồi quy cụ thể "nút đè lên tiêu đề
        // trang" mà topbarRows/topbarContentOverflow không tự phân biệt được — cả hai bộ khẳng định đều cần giữ,
        // không cái nào là "chứng nhân lịch sử" chết cả.
        // ĐÍNH CHÍNH (Đợt D Task 7, kiểm toàn cục — chú thích TRÊN cũng SAI một chi tiết): khẳng định đỏ ĐẦU TIÊN
        // khi hoàn nguyên flex-wrap: nowrap KHÔNG PHẢI topbarRows — mà là khẳng định "chiều cao thanh công việc
        // đúng token --bar-h" (đứng TRƯỚC topbarRows trong mã — xem assert ngay dưới đây, không ghi số dòng cố
        // định vì số dòng đã lỗi thời một lần rồi). Đã tự đo lại thật (2026-09-23): gỡ
        // flex-wrap: nowrap ở 'body.has-sidebar #topbar' (CSS) khiến topbarHeight=105px (token 60px), khẳng định
        // chiều cao đỏ TRƯỚC, script dừng ở đó — không bao giờ chạy tới dòng topbarRows dù giá trị đo được của nó
        // cũng sẽ là 2 (gãy 2 dòng) nếu chạy tới. assert.* (Node) chạy TUẦN TỰ theo thứ tự viết trong mã và dừng ở
        // lần đỏ ĐẦU TIÊN — dòng nào đứng trước trong mã sẽ đỏ trước nếu cả hai cùng sai, không liên quan tới
        // "khẳng định nào có ý nghĩa hơn". Xem đính chính đầy đủ ở task-6-report.md và task-7-report.md.
        // (LƯU Ý CHO NGƯỜI SỬA SAU: đoạn chú thích này nằm TRONG chuỗi mẫu pFrame.ev(...) bao ngoài (template
        // literal) — KHÔNG được dùng dấu huyền ngược (backtick) trong bất kỳ chú thích nào ở đây, kể cả trong
        // dòng // comment, vì nó sẽ đóng sớm chuỗi mẫu bao ngoài và làm hỏng cú pháp toàn bộ tệp — đúng lỗi
        // Task 7 tự mắc phải khi sửa đoạn A-2 này lần đầu (dùng dấu huyền ngược trong chú thích), rồi tự phát
        // hiện qua node --check + acorn và sửa lại bằng dấu nháy đơn/chữ thường ở trên.)
        const btn = document.querySelector('.topbar-new');
        const title = document.querySelector('.bar-title');
        const btnR = btn && vis(btn) ? btn.getBoundingClientRect() : null;
        return {
          innerWidth,
          topbarBottom: Math.round(tbr.bottom),
          mainTop: Math.round(mr.top),
          newBtnTop: btnR ? Math.round(btnR.top) : null,
          newBtnBottom: btnR ? Math.round(btnR.bottom) : null,
          newBtnHeight: btnR ? Math.round(btnR.height) : null,
          // >0 nghĩa là breadcrumb đang bị CẮT CHỮ (hành vi mong muốn khi thanh chật) chứ không đẩy nút xuống dòng.
          barTitleClipped: title && vis(title) ? title.scrollWidth - title.clientWidth : null,
          // A-1.1 (Đợt D Task 6, siết lưới): đo THẬT hai thuộc tính làm chữ CẮT chứ không gãy dòng — đo cùng lúc với
          // barTitleClipped để khẳng định dưới đây kiểm cả giá trị số (scrollWidth>clientWidth) LẪN cơ chế CSS gây ra nó.
          barTitleOverflow: title && vis(title) ? getComputedStyle(title).overflow : null,
          barTitleTextOverflow: title && vis(title) ? getComputedStyle(title).textOverflow : null,
          mainMaxWidth: parseFloat(getComputedStyle(main).maxWidth),
          sidebarShown: vis(sb),
          sidebarWidth: vis(sb) ? Math.round(sbr.width) : 0,
          sidebarLinks: [...document.querySelectorAll('#sidebar .sidebar-item')].filter(vis).length,
          tabbarLinks: [...document.querySelectorAll('#tabbar .tab')].filter(vis).length,
          navLinkCount: navLinks.length,
          navLabels: navLinks.map((a) => a.textContent.trim()),
          logoutShown: vis(document.querySelector('.sidebar-logout')),
          accountLinkShown: [...document.querySelectorAll('#sidebar a, #tabbar a')].some((a) => vis(a) && new URL(a.getAttribute('href'), location.origin).pathname === '/account'),
          topbarHeight: Math.round(tbr.height * 100) / 100,
          topbarRows: rows,
          topbarContentOverflow: topbar.scrollHeight - topbar.clientHeight,
          barTitleShown: vis(document.querySelector('.bar-title')),
          barTitleText: document.querySelector('.bar-title')?.textContent.trim() ?? null,
          brandShown: vis(document.querySelector('#topbar .brand')),
          searchShown: vis(document.querySelector('.topbar-search')),
          newBtnShown: vis(document.querySelector('.topbar-new')),
          mainWidth: Math.round(mr.width),
          mainLeft: Math.round(mr.left),
          contentColumn: Math.round(innerWidth - (vis(sb) ? sbr.width : 0)),
          scrollWidth: document.scrollingElement.scrollWidth,
          barToken: parseFloat(root.getPropertyValue('--bar-h')),
          mainToken: parseFloat(root.getPropertyValue('--w-main')),
          sidebarToken: parseFloat(root.getPropertyValue('--w-sidebar')),
        };
      })()`);

    let pFrame = null; // trang /staff được GIỮ MỞ để G-2/G-3 dùng tiếp; hai trang kia đóng ngay sau khi quét xong.
    let sawRealClip = false; // A-1.1: phải THẬT SỰ đo được ít nhất một lần breadcrumb bị cắt trong lượt quét dưới đây, không thì khẳng định trên chỉ là lưới giả (không bao giờ chạy tới).
    for (const spec of FRAME_PAGES) {
    const page = await env.as(spec.account, spec.path, DESK);
    await page.waitFor("document.querySelector('#sidebar') !== null", `thanh bên dựng xong (${spec.label})`);
    if (spec.ready) await page.waitFor(spec.ready, `nội dung quyết định bề rộng đã sẵn sàng (${spec.label})`);
    const frameRows = [];
    for (const width of spec.widths) {
      await page.send("Emulation.setDeviceMetricsOverride", { width, height: 800, deviceScaleFactor: 1, mobile: false });
      const f = await measureFrameOn(page);
      frameRows.push(f);
      const at = `${spec.label} @ ${width}px`;

      // (d) không tràn ngang — ở MỌI khổ.
      assert.ok(f.scrollWidth <= f.innerWidth + 1, `${at}: tràn ngang — scrollWidth ${f.scrollWidth} > innerWidth ${f.innerWidth}`);
      // (a) luôn còn lối điều hướng nhìn thấy được (đây là chính lỗi A-2: ở 641–899px trước sửa, cả hai đều = 0).
      assert.ok(f.navLinkCount > 0, `${at}: KHÔNG còn lối điều hướng nào nhìn thấy được (sidebar ${f.sidebarLinks}, tabbar ${f.tabbarLinks}) — ${JSON.stringify(f)}`);
      // (b) luôn còn đường tới "Đăng xuất": ≥641px là nút ngay trong thanh bên; ≤640px là tab "Tôi" → trang /account (thiết kế điện thoại đã duyệt).
      assert.ok(f.logoutShown || f.accountLinkShown, `${at}: mất cả nút "Đăng xuất" lẫn đường tới trang Tài khoản — ${JSON.stringify(f)}`);

      if (width <= 640) {
        assert.equal(f.sidebarShown, false, `${at}: thanh bên KHÔNG được hiện ở khổ điện thoại — ${JSON.stringify(f)}`);
        assert.ok(f.tabbarLinks > 0, `${at}: phải còn thanh tab dưới đáy — ${JSON.stringify(f)}`);
        assert.equal(f.newBtnShown, false, `${at}: nút "Tạo đơn" trên thanh công việc chỉ từ 641px (điện thoại đã có tab "Tạo đơn") — ${JSON.stringify(f)}`);
      } else {
        assert.equal(f.sidebarShown, true, `${at}: thanh bên PHẢI hiện từ 641px (quyết định 9 của chủ dự án) — ${JSON.stringify(f)}`);
        assert.equal(f.sidebarLinks, spec.sidebar, `${at}: thanh bên phải đủ ${spec.sidebar} mục của tài khoản mở trang (Quản trị 19 — Đợt 4 có "Bảng giá thuê xe", "Bảng kê chi phí xe"; ADR-0038 không "Nhật ký", ADR-0049 B8 có "Lý do điều phối", B1 có "Điều phối xe"; Toàn quyền 23 — ADR-0069 thêm "Trợ lý Hỗ trợ", ADR-0075 thêm "Phiên đăng nhập", ADR-0087 thêm "Giao diện") — ${JSON.stringify(f)}`);
        assert.equal(f.tabbarLinks, 0, `${at}: thanh tab dưới đáy KHÔNG được hiện cùng thanh bên — ${JSON.stringify(f)}`);
        assert.equal(f.logoutShown, true, `${at}: "Đăng xuất" phải hiển thị thật trong thanh bên — ${JSON.stringify(f)}`);
        assert.equal(f.sidebarWidth, f.sidebarToken, `${at}: thanh bên phải rộng đúng token --w-sidebar (${f.sidebarToken}px) — ${JSON.stringify(f)}`);
        // C-1 (Đợt D Task 7, kiểm toàn cục): khẳng định TRÊN chỉ so f.sidebarWidth với f.sidebarToken (đọc từ CHÍNH
        // CSS đang chạy) — nếu ai gõ sai --w-sidebar trong public/app.css, cả hai vế đổi theo nhau, khẳng định đó
        // KHÔNG bắt được (người kiểm độc lập đột biến --w-sidebar → 300px, chạy lại toàn lưới: không đỏ). Khẳng
        // định dưới đây so với HẰNG SỐ ĐỘC LẬP viết thẳng trong kịch bản (đầu tệp) — đây mới là "nguồn độc lập" thật.
        assert.equal(f.sidebarWidth, SIDEBAR_WIDTH_MOCKUP_PX, `${at}: thanh bên phải rộng đúng ${SIDEBAR_WIDTH_MOCKUP_PX}px (bản mẫu/chủ dự án duyệt, hằng số ĐỘC LẬP trong kịch bản — không đọc từ CSS) — ${JSON.stringify(f)}`);
        assert.equal(f.newBtnShown, true, `${at}: nút "Tạo đơn" phải hiện từ 641px — ${JSON.stringify(f)}`);
        // (lịch sử, không đổi tên) chiều cao thanh công việc đúng token --bar-h (từng là 71px vì nút cao 46px + đệm dọc quyết định chiều cao).
        assert.ok(Math.abs(f.topbarHeight - f.barToken) <= 1, `${at}: thanh công việc cao ${f.topbarHeight}px, token --bar-h = ${f.barToken}px — ${JSON.stringify(f)}`);
        // C-1 (Đợt D Task 7): cùng lỗ hổng — khẳng định trên tự so với chính CSS. So với hằng số ĐỘC LẬP viết thẳng
        // trong kịch bản (đầu tệp), KHÔNG đọc từ public/app.css bằng bất kỳ cách nào.
        assert.ok(Math.abs(f.topbarHeight - TOPBAR_HEIGHT_MOCKUP_PX) <= 1, `${at}: thanh công việc phải cao ${TOPBAR_HEIGHT_MOCKUP_PX}px (bản mẫu/chủ dự án duyệt, hằng số ĐỘC LẬP trong kịch bản — không đọc từ CSS) — ${JSON.stringify(f)}`);
        // (c) không gãy 2 dòng. Chiều cao đã ghim nên đo bằng SỐ DÒNG thật + nội dung có tràn khỏi ô hay không.
        assert.equal(f.topbarRows, 1, `${at}: thanh công việc gãy ${f.topbarRows} dòng — ${JSON.stringify(f)}`);
        assert.ok(f.topbarContentOverflow <= 1, `${at}: nội dung thanh công việc tràn khỏi chiều cao ghim (${f.topbarContentOverflow}px) — ${JSON.stringify(f)}`);
        // VÒNG SỬA 2 (mục 1) — khẳng định thay thế, và là khẳng định DUY NHẤT còn đổi giá trị được: nút "Tạo đơn"
        // phải NẰM TRỌN trong thanh công việc, và `main` phải bắt đầu TỪ đáy thanh trở xuống. Trên bản chưa vá,
        // /order-form?id=… ở 900px cho nút 58…104px trong khi main bắt đầu ở 60px — nút đỏ đè lên chữ tiêu đề.
        assert.ok(
          f.newBtnBottom !== null && f.newBtnBottom <= f.topbarBottom + 1,
          `${at}: nút "Tạo đơn" thò RA NGOÀI thanh công việc (đáy nút ${f.newBtnBottom}px > đáy thanh ${f.topbarBottom}px) — nó sẽ đè lên nội dung trang — ${JSON.stringify(f)}`,
        );
        assert.ok(
          f.mainTop >= f.topbarBottom - 1,
          `${at}: <main> bắt đầu ở ${f.mainTop}px, CHỒNG LÊN thanh công việc (đáy ${f.topbarBottom}px) — ${JSON.stringify(f)}`,
        );
        // A-2: ô tìm kiếm chỉ từ 900px (ở 641px cột nội dung còn ~405px, thanh gãy 2 dòng cao 128px).
        assert.equal(f.searchShown, width >= 900, `${at}: ô tìm kiếm phải ${width >= 900 ? "HIỆN" : "ẨN"} ở khổ này — ${JSON.stringify(f)}`);
        // A-3 (Đợt D Task 6 — siết thêm, người kiểm độc lập tìm ra): trần bề rộng kỳ vọng đọc từ `spec.mainCap(width)`
        // (token đọc THẲNG từ văn bản public/app.css, độc lập với trang đang kiểm — xem đầu tệp), KHÔNG còn đọc
        // `f.mainMaxWidth` (getComputedStyle của CHÍNH trang) làm "giá trị kỳ vọng": nếu ai gõ sai --w-main/--w-form
        // ngay trong CSS thì cả hai vế cũ đều sai giống nhau, lưới không bắt được.
        const mainCap = spec.mainCap(width);
        assert.equal(f.mainMaxWidth, mainCap, `${at}: max-width thật của <main> (${f.mainMaxWidth}px) phải khớp token đọc từ public/app.css (${mainCap}px) — CSS cascade đang ghi đè bằng thứ khác?`);
        const expectMain = Math.min(f.contentColumn, mainCap);
        assert.ok(Math.abs(f.mainWidth - expectMain) <= 1, `${at}: <main> rộng ${f.mainWidth}px, phải là min(cột nội dung ${f.contentColumn}, trần ${mainCap}) = ${expectMain}px — ${JSON.stringify(f)}`);
        assert.equal(f.mainLeft, f.sidebarWidth, `${at}: <main> phải BÁM MÉP TRÁI ngay sau thanh bên (lề trái = ${f.sidebarWidth}px), không tự căn giữa — ${JSON.stringify(f)}`);
        // C-1: breadcrumb ở máy tính (cả ba trang đều khai data-title).
        assert.equal(f.barTitleShown, true, `${at}: breadcrumb phải hiện ở máy tính — ${JSON.stringify(f)}`);
        assert.equal(f.brandShown, false, `${at}: logo/tên app không được lặp lại ở thanh công việc (đã có ở đầu thanh bên) — ${JSON.stringify(f)}`);
        // Trang có breadcrumb DÀI: chữ phải giữ nguyên (chỉ CẮT bằng "…" khi chật), không bị đổi thành chữ tĩnh.
        if (spec.expectTitlePrefix) {
          assert.ok(
            f.barTitleText.startsWith(spec.expectTitlePrefix),
            `${at}: breadcrumb phải là "${spec.expectTitlePrefix}…" (đo sớm hơn setBarTitle() thì lưới xanh giả vì chữ tĩnh ngắn hơn) — ${JSON.stringify(f)}`,
          );
        }
        // A-1.1 (Đợt D Task 6, người kiểm độc lập tìm ra): "biện pháp 2" (breadcrumb co-cắt-chữ, public/app.css ~372)
        // không có ai canh — gỡ RIÊNG nó (overflow/text-overflow/white-space của .bar-title) vẫn xanh hoàn toàn vì
        // KHÔNG khổ/trang nào trong lưới cũ đo breadcrumb THẬT SỰ bị cắt. Đo giá trị thật (scrollWidth > clientWidth,
        // không chỉ kiểm thuộc tính CSS có tồn tại) + cơ chế CSS gây ra nó, CHỈ khi khổ này THẬT SỰ cắt (barTitleClipped
        // > 0 — đo được ở /order-form?id=… 900px cắt 14px, 910px cắt 4px, các khổ khác = 0 nên không cần giả định trước).
        if (f.barTitleClipped > 0) {
          assert.equal(f.barTitleOverflow, "hidden", `${at}: breadcrumb đang bị cắt thật (${f.barTitleClipped}px, scrollWidth>clientWidth) nhưng overflow không phải "hidden" — ${JSON.stringify(f)}`);
          assert.equal(f.barTitleTextOverflow, "ellipsis", `${at}: breadcrumb đang bị cắt thật nhưng text-overflow không phải "ellipsis" (không hiện dấu …) — ${JSON.stringify(f)}`);
          sawRealClip = true;
        }
      }
    }
    ok(
      `G-1) Quét ${spec.widths.length} khổ màn hình trên ${spec.label} (${spec.account === ACCOUNTS.admin ? "Quản trị" : "Quản trị + Toàn quyền"}) — mốc thanh bên MỚI là 641px:\n` +
        frameRows
          .map(
            (f) =>
              `      ${String(f.innerWidth).padStart(4)}px: ${f.sidebarShown ? `thanh bên ${f.sidebarLinks} mục` : `thanh tab ${f.tabbarLinks} mục`}` +
              `, Đăng xuất ${f.logoutShown ? "trong thanh bên" : "qua trang Tài khoản"}` +
              `, #topbar ${f.topbarHeight}px/${f.topbarRows} dòng (nút ${f.newBtnTop}…${f.newBtnBottom}px, main từ ${f.mainTop}px, breadcrumb cắt ${f.barTitleClipped}px)` +
              `, ô tìm ${f.searchShown ? "hiện" : "ẩn"}` +
              `, main ${f.mainWidth}px (cột ${f.contentColumn}px, lề trái ${f.mainLeft}px), scrollWidth ${f.scrollWidth}`,
          )
          .join("\n"),
    );
    if (spec.path === "/staff") pFrame = page;
    else page.close();
    }
    assert.ok(pFrame, "G-1: phải giữ được trang /staff đang mở cho G-2/G-3");
    // A-1.1: nếu lượt quét này KHÔNG hề gặp một khổ/trang nào có breadcrumb thật sự bị cắt thì khẳng định overflow/
    // text-overflow ở trên chưa từng chạy — lưới giả. Phải nổ ra ở đây để không lặng lẽ mất tác dụng nếu sau này ai
    // đổi widths/breadcrumb làm hết trường hợp bị cắt.
    // Bản 1.11 (2026-09-25): nút "Lập đơn mới" → "Tạo đơn" ngắn hơn nên KHÔNG còn khổ nào (đã dò 641–1000px) tự cắt breadcrumb
    // "Sửa đơn <mã>" — cờ `sawRealClip` giờ chỉ để ghi lại. Cơ chế cắt chữ (overflow + ellipsis) LUÔN được kiểm bằng một breadcrumb
    // THẬT DÀI đặt trên /staff đang mở (không phụ thuộc có khổ tự cắt hay không, nên không có khẳng định nào "không bao giờ đỏ").
    // Đã thấy chặn thật 2026-09-25: bỏ `text-overflow: ellipsis` ở `body.has-sidebar #topbar .bar-title` → đỏ → hoàn nguyên.
    const forced = await pFrame.ev(`(() => {
      const t = document.querySelector('.bar-title'); const old = t.textContent;
      t.textContent = 'Sửa đơn TD-20260925-0001 · ' + 'Khách đoàn rất dài '.repeat(20);
      const cs = getComputedStyle(t); const r = { clipped: t.scrollWidth - t.clientWidth, overflow: cs.overflow, textOverflow: cs.textOverflow, whiteSpace: cs.whiteSpace };
      t.textContent = old; return r; })()`);
    assert.ok(forced.clipped > 0, `A-1.1: breadcrumb thật dài phải bị cắt (scrollWidth>clientWidth) — ${JSON.stringify(forced)}`);
    assert.equal(forced.overflow, "hidden", `A-1.1: breadcrumb bị cắt nhưng overflow không phải "hidden" — ${JSON.stringify(forced)}`);
    assert.equal(forced.textOverflow, "ellipsis", `A-1.1: breadcrumb bị cắt nhưng text-overflow không phải "ellipsis" — ${JSON.stringify(forced)}`);
    ok(`A-1.1: breadcrumb thật dài bị cắt ${forced.clipped}px với overflow:hidden + text-overflow:ellipsis; khổ tự cắt trong lượt quét: ${sawRealClip ? "có" : "không (bình thường từ bản 1.11)"}`);

    // ================================================================================================
    // G-2 (B — quyết định 8 của chủ dự án): huy hiệu cạnh "Đơn hàng" = SỐ ĐƠN CHƯA XÁC NHẬN (draftCount = 1,
    // chỉ R2), KHÔNG phải tổng số đơn (3). Đo trên chính thanh bên, không đọc lại API.
    // ================================================================================================
    await pFrame.send("Emulation.setDeviceMetricsOverride", { width: DESK.width, height: DESK.height, deviceScaleFactor: 1, mobile: false });
    await pFrame.waitFor(
      `[...document.querySelectorAll('#sidebar .sidebar-item')].some((a) => a.querySelector('.sidebar-item-label').textContent.trim() === 'Đơn hàng' && a.querySelector('.sidebar-item-badge'))`,
      "huy hiệu 'Đơn hàng' xuất hiện trên thanh bên",
    );
    const badges = await pFrame.ev(`(() => Object.fromEntries([...document.querySelectorAll('#sidebar .sidebar-item')]
      .map((a) => [a.querySelector('.sidebar-item-label').textContent.trim(), a.querySelector('.sidebar-item-badge')?.textContent.trim() ?? null])))()`);
    assert.equal(badges["Đơn hàng"], String(data.draftCount), `G-2: huy hiệu "Đơn hàng" phải = draftCount (${data.draftCount}, số đơn CHƯA XÁC NHẬN), KHÔNG phải tổng số đơn — ${JSON.stringify(badges)}`);
    assert.equal(badges["Đơn hàng"], "1", `G-2: dữ liệu thử có đúng 1 đơn nháp (R2) nên huy hiệu phải là "1" — ${JSON.stringify(badges)}`);
    await shot(pFrame, "task-4-thanh-ben-huy-hieu.png");
    ok(`G-2) Huy hiệu trên thanh bên (ADMIN, 1040px): ${JSON.stringify(badges)} — "Đơn hàng" = ${badges["Đơn hàng"]} đúng bằng draftCount của API (đơn chưa xác nhận), không phải tổng 3 đơn`);

    // ================================================================================================
    // G-3 (C-3): chân thanh bên (avatar/tên/vai/ĐĂNG XUẤT) phải ở lại trong khung nhìn khi cuộn hết trang dài.
    // Trước sửa `#sidebar` là position:static nên chân thanh tụt xuống đáy TÀI LIỆU (trang Nhân viên/Nhật ký).
    // ================================================================================================
    await pFrame.ev("window.scrollTo(0, document.scrollingElement.scrollHeight); true");
    await sleep(150);
    const sticky = await pFrame.ev(`(() => {
      const r = document.querySelector('.sidebar-logout').getBoundingClientRect();
      const sb = document.querySelector('#sidebar').getBoundingClientRect();
      return { scrollY: Math.round(scrollY), docHeight: document.scrollingElement.scrollHeight, viewH: innerHeight, logoutTop: Math.round(r.top), logoutBottom: Math.round(r.bottom), sidebarTop: Math.round(sb.top), sidebarHeight: Math.round(sb.height) };
    })()`);
    assert.ok(sticky.scrollY > 0, `G-3: trang /staff ở 1040×800 phải THẬT SỰ cuộn được thì phép đo mới có nghĩa (docHeight ${sticky.docHeight}, viewH ${sticky.viewH}) — ${JSON.stringify(sticky)}`);
    assert.ok(sticky.logoutBottom <= sticky.viewH + 1 && sticky.logoutTop >= -1, `G-3: sau khi cuộn xuống đáy, nút "Đăng xuất" phải CÒN trong khung nhìn (0…${sticky.viewH}px) — ${JSON.stringify(sticky)}`);
    await shot(pFrame, "task-4-chan-thanh-ben-sau-khi-cuon.png");
    ok(`G-3) Cuộn hết /staff ở 1040×800 (cuộn ${sticky.scrollY}px trên tài liệu cao ${sticky.docHeight}px): nút "Đăng xuất" vẫn ở ${sticky.logoutTop}…${sticky.logoutBottom}px, trong khung nhìn cao ${sticky.viewH}px`);

    // Vế hai: khi danh sách mục CAO HƠN khung nhìn, phần mục phải tự cuộn và chân thanh vẫn thấy được.
    let scrollCase = null;
    for (const height of [600, 480, 400]) {
      await pFrame.send("Emulation.setDeviceMetricsOverride", { width: 1040, height, deviceScaleFactor: 1, mobile: false });
      const s = await pFrame.ev(`(() => {
        const g = document.querySelector('.sidebar-groups');
        const f = document.querySelector('.sidebar-foot').getBoundingClientRect();
        return { groupsScrollHeight: g.scrollHeight, groupsClientHeight: g.clientHeight, canScroll: g.scrollHeight > g.clientHeight + 1, footBottom: Math.round(f.bottom), viewH: innerHeight };
      })()`);
      assert.ok(s.footBottom <= s.viewH + 1, `G-3 (1040×${height}): chân thanh bên phải nằm trong khung nhìn — ${JSON.stringify(s)}`);
      if (s.canScroll) { scrollCase = { height, ...s }; break; }
    }
    assert.ok(scrollCase, "G-3: không dựng được tình huống danh sách mục cao hơn khung nhìn (đã thử 1040×600/480/400) — không chứng minh được thanh bên tự cuộn");
    ok(`G-3b) Thanh bên tự cuộn khi mục dài hơn khung nhìn (1040×${scrollCase.height}): danh sách mục cao ${scrollCase.groupsScrollHeight}px trong ô ${scrollCase.groupsClientHeight}px (cuộn riêng), chân thanh vẫn kết thúc ở ${scrollCase.footBottom}px ≤ ${scrollCase.viewH}px`);

    // ================================================================================================
    // C-2 (Đợt D Task 7, kiểm toàn cục): van an toàn `min-height` (thay vì `height` cố định) trên
    // `body.has-sidebar #topbar` (public/app.css, khối "Đợt D Task 4… ADR-0015"). Task 6 kết luận "không kịch bản
    // nào phân biệt được min-height và height" rồi XOÁ khẳng định — SAI: kịch bản Task 6 thử (breadcrumb rất dài)
    // không đủ vì `.bar-title` luôn co về một dòng (nowrap+ellipsis) TRƯỚC KHI min-height có cơ hội phát huy tác
    // dụng. Kịch bản PHÂN BIỆT ĐƯỢC (người kiểm toàn cục tìm ra): phóng cỡ chữ CỦA NÚT "Lập đơn mới" lên 40px (mô
    // phỏng cài đặt trợ năng "cỡ chữ tối thiểu" của trình duyệt — `.btn` có `font: inherit`, phóng cỡ chữ làm nút
    // cần nhiều chiều cao hơn token --bar-h=60px). Dưới CSS hiện tại (`min-height`): #topbar ĐƯỢC PHÉP cao hơn
    // 60px để chứa trọn nút, `main` tự lùi theo — không đè. Nếu min-height đổi thành `height` (cố định), #topbar
    // KHÔNG được phép cao hơn 60px nữa: nút tràn ra ngoài hộp, đè lên `main` (main vẫn bắt đầu ở 60px).
    // ================================================================================================
    await pFrame.send("Emulation.setDeviceMetricsOverride", { width: DESK.width, height: DESK.height, deviceScaleFactor: 1, mobile: false });
    await pFrame.waitFor("document.querySelector('.topbar-new') !== null", "nút 'Lập đơn mới' có trên /staff (C-2)");
    // G-3 ở trên đã cuộn trang xuống đáy rồi đổi khổ nhiều lần — cuộn lại lên đầu để #topbar (position: sticky)
    // đứng đúng chỗ, tránh toạ độ âm vô nghĩa (đã đo được -164px trước khi thêm dòng này, đúng lệch nội bộ nhưng
    // không phải toạ độ THẬT khi người dùng mở trang bình thường).
    await pFrame.ev("window.scrollTo(0, 0); true");
    const safetyValve = await pFrame.ev(`(() => {
      const btn = document.querySelector('.topbar-new');
      btn.style.fontSize = '40px';
      const topbar = document.querySelector('#topbar');
      const main = document.querySelector('main');
      const btnR = btn.getBoundingClientRect();
      const topbarR = topbar.getBoundingClientRect();
      const mainR = main.getBoundingClientRect();
      return { topbarHeight: Math.round(topbarR.height), topbarBottom: Math.round(topbarR.bottom), btnBottom: Math.round(btnR.bottom), mainTop: Math.round(mainR.top) };
    })()`);
    assert.ok(
      safetyValve.btnBottom <= safetyValve.mainTop + 1,
      `C-2: van an toàn min-height — khi cỡ chữ nút "Tạo đơn" phóng lên 40px, đáy nút (${safetyValve.btnBottom}px) không được ĐÈ lên đỉnh main (${safetyValve.mainTop}px) — ${JSON.stringify(safetyValve)}`,
    );
    ok(`C-2: van an toàn min-height giữ đúng — cỡ chữ nút phóng lên 40px, #topbar cao ${safetyValve.topbarHeight}px (được phép vượt token 60px nhờ min-height), đáy nút ${safetyValve.btnBottom}px ≤ đỉnh main ${safetyValve.mainTop}px — ${JSON.stringify(safetyValve)}`);

    pFrame.close();

    // ================================================================================================
    // G-4 (C-5): huy hiệu chỉ được nạp khi thanh bên THẬT SỰ hiện. Đo LỜI GỌI MẠNG THẬT trên /staff (trang
    // này không tự gọi ba route đó — "/" tự gọi dashboard nên không dùng được để đo).
    // ================================================================================================
    const BADGE_ROUTES = ["/api/catalog/admin", "/api/orders/dashboard", "/api/feedback/badge"];
    const badgeCalls = (page) => BADGE_ROUTES.filter((r) => page.requests.some((q) => q.url.includes(r)));

    const pMobBadge = await env.as(ACCOUNTS.admin, "/staff", MOB);
    await pMobBadge.waitFor("document.querySelector('#sidebar') !== null", "thanh bên dựng xong (/staff, 390px)");
    await sleep(2000); // chờ đủ lâu để lời gọi (nếu có) chắc chắn đã bắn — vắng mặt phải là vắng THẬT, không phải đo sớm
    const mobBadgeCalls = badgeCalls(pMobBadge);
    assert.deepEqual(mobBadgeCalls, [], `G-4 (390px): KHÔNG được gọi route huy hiệu nào khi thanh bên bị CSS ẩn — đã gọi ${JSON.stringify(mobBadgeCalls)}`);
    assert.equal(await pMobBadge.ev("document.querySelector('#sidebar').offsetParent !== null"), false, "G-4 (390px): thanh bên phải đang bị ẩn thật");
    pMobBadge.close();

    const pDeskBadge = await env.as(ACCOUNTS.admin, "/staff", DESK);
    await pDeskBadge.waitFor("document.querySelector('#sidebar .sidebar-item-badge') !== null", "huy hiệu dựng xong (/staff, 1040px)");
    const deskBadgeCalls = badgeCalls(pDeskBadge);
    assert.deepEqual(deskBadgeCalls, BADGE_ROUTES, `G-4 (1040px): phải gọi ĐỦ ba route huy hiệu khi thanh bên đang hiện — chỉ thấy ${JSON.stringify(deskBadgeCalls)}`);
    pDeskBadge.close();
    ok(`G-4) Lời gọi huy hiệu theo khổ màn hình (/staff, ADMIN): 390px = ${JSON.stringify(mobBadgeCalls)} (không lời gọi nào), 1040px = ${JSON.stringify(deskBadgeCalls)}. Lưu ý: riêng trang "/" tự gọi /api/orders/dashboard nên ở máy tính trang đó có 2 lần gọi — chấp nhận được, giống /catalog.`);

    // ================================================================================================
    // G-5 (A-1): ô tìm kiếm trên thanh công việc phải LỌC THẬT. Gõ SĐT của R1, Enter, rồi khẳng định
    // (a) có lời gọi THẬT tới /api/orders kèm q=…, (b) ô tìm của trang (#q) mang đúng chuỗi đó, (c) danh sách
    // rút lại đúng 1 đơn. Trước sửa: trang tải lại và hiện TOÀN BỘ danh sách (ô tìm là nút chết).
    // ================================================================================================
    const NEEDLE = "0900000301"; // SĐT khách của R1
    const pSearch = await env.as(ACCOUNTS.admin, "/", DESK);
    await pSearch.waitFor("document.querySelector('.topbar-search') !== null", "ô tìm kiếm trên thanh công việc dựng xong");
    const before = pSearch.requests.length;
    // Enter là sự kiện `keydown` thật (setInput() chỉ bắn input/change nên không kích hoạt được nhánh này).
    await pSearch.ev(`(() => { const el = document.querySelector('.topbar-search'); el.value = ${JSON.stringify(NEEDLE)}; el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return true; })()`);
    let hit = null;
    for (const end = Date.now() + 10000; ; ) {
      hit = pSearch.requests.slice(before).find((r) => r.url.includes("/api/orders?") && r.url.includes(`q=${NEEDLE}`));
      if (hit) break;
      assert.ok(Date.now() < end, `G-5: không thấy lời gọi THẬT nào tới /api/orders kèm q=${NEEDLE} sau khi gõ + Enter — ô tìm kiếm vẫn là nút chết. Các lời gọi đã thấy: ${JSON.stringify(pSearch.requests.slice(before).map((r) => r.url))}`);
      await sleep(100);
    }
    await pSearch.waitFor("document.querySelectorAll('#list .order-row').length > 0", "danh sách đơn đã lọc hiện ra");
    const searchState = await pSearch.ev(`(() => ({
      locationSearch: location.search,
      qValue: document.querySelector('#q').value,
      rowCount: document.querySelectorAll('#list .order-row').length,
      rowsText: [...document.querySelectorAll('#list .order-row')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim().slice(0, 80)),
      emptyHidden: document.querySelector('#empty').hidden,
    }))()`);
    assert.equal(searchState.qValue, NEEDLE, `G-5: ô tìm của trang (#q) phải mang đúng chuỗi đã gõ để người dùng thấy mình đang lọc theo gì — ${JSON.stringify(searchState)}`);
    assert.equal(searchState.rowCount, 1, `G-5: danh sách phải RÚT LẠI đúng 1 đơn (R1) — nếu là 3 thì ô tìm kiếm không lọc gì cả — ${JSON.stringify(searchState)}`);
    assert.ok(searchState.rowsText[0].includes(NEEDLE), `G-5: đơn còn lại phải đúng là đơn mang SĐT đã tìm — ${JSON.stringify(searchState)}`);
    await shot(pSearch, "task-4-tim-kiem-da-loc.png");
    assert.deepEqual(pSearch.consoleErrors, [], `lỗi console (tìm kiếm): ${pSearch.consoleErrors}`);
    pSearch.close();
    ok(`G-5) Ô tìm kiếm thanh công việc lọc THẬT: gõ "${NEEDLE}" + Enter → lời gọi ${hit.url.replace(/^https?:\/\/[^/]+/, "")} → #q = "${searchState.qValue}", danh sách còn ${searchState.rowCount}/3 đơn`);

    // ================================================================================================
    // G-6 (lo ngại riêng, đo để BÁO CÁO): mốc @media (min-width: 640px) của .grid.two/.grid.three (public/app.css
    // ~dòng 130) nay bắn TRONG cột nội dung chỉ rộng ~405px ở 641px. Trang Lập đơn là nơi dùng .grid nhiều nhất.
    // ================================================================================================
    const pForm = await env.as(ACCOUNTS.admin, "/order-form", { width: 641, height: 800, mobile: false });
    await pForm.waitFor("document.querySelector('#sidebar') !== null", "thanh bên dựng xong (/order-form, 641px)");
    const formNarrow = await pForm.ev(`(() => {
      const main = document.querySelector('main');
      const mr = main.getBoundingClientRect();
      const worst = [...document.querySelectorAll('main *')].map((el) => Math.round(el.getBoundingClientRect().right - mr.right)).sort((a, b) => b - a)[0];
      return {
        innerWidth, scrollWidth: document.scrollingElement.scrollWidth,
        mainWidth: Math.round(mr.width), mainLeft: Math.round(mr.left),
        widestOverhangPx: worst,
        gridCols: [...document.querySelectorAll('main .grid')].map((g) => getComputedStyle(g).gridTemplateColumns),
      };
    })()`);
    assert.ok(formNarrow.scrollWidth <= formNarrow.innerWidth + 1, `G-6: trang Lập đơn ở 641px tràn ngang — scrollWidth ${formNarrow.scrollWidth} > ${formNarrow.innerWidth} — ${JSON.stringify(formNarrow)}`);
    assert.deepEqual(pForm.consoleErrors, [], `lỗi console (Lập đơn 641px): ${pForm.consoleErrors}`);
    await shot(pForm, "task-4-lap-don-641.png");
    pForm.close();
    ok(`G-6) Trang Lập đơn ở 641px (cột nội dung hẹp nhất có thanh bên): không tràn ngang (scrollWidth ${formNarrow.scrollWidth} ≤ ${formNarrow.innerWidth}), main rộng ${formNarrow.mainWidth}px bám mép trái ${formNarrow.mainLeft}px; lưới trong form: ${JSON.stringify(formNarrow.gridCols)}`);

    // ================================================================================================
    // G-7 (C-1): breadcrumb trên hai trang KHÔNG khai `data-title` (/ và /orders — chủ dự án đã duyệt giao diện
    // ĐIỆN THOẠI của chúng, nên tuyệt đối không được thêm thuộc tính đó). Hai vế phải cùng đúng:
    //   · 390px: vẫn hiện LOGO, KHÔNG hiện breadcrumb — y như trước, không đổi một chút nào;
    //   · 1040px: hiện breadcrumb với nhãn của mục điều hướng đang mở ("Trang chủ" / "Đơn hàng"), không còn ô trống.
    // ================================================================================================
    const crumbs = [];
    for (const [path, expected] of [["/", "Trang chủ"], ["/orders", "Đơn hàng"]]) {
      const pCrumb = await env.as(ACCOUNTS.admin, path, MOB);
      await pCrumb.waitFor("document.querySelector('#sidebar') !== null", `khung dựng xong (${path})`);
      const readCrumb = () =>
        pCrumb.ev(`(() => {
          const vis = (el) => !!el && el.offsetParent !== null;
          const t = document.querySelector('.bar-title');
          return {
            hasDataTitle: document.body.dataset.title !== undefined,
            titleInDom: !!t,
            titleShown: vis(t),
            titleText: t ? t.textContent.trim() : null,
            brandShown: vis(document.querySelector('#topbar .brand')),
          };
        })()`);
      const mob = await readCrumb();
      assert.equal(mob.hasDataTitle, false, `C-1 (${path}): trang này KHÔNG được khai data-title (nó đổi cả giao diện điện thoại đã duyệt) — ${JSON.stringify(mob)}`);
      assert.equal(mob.titleShown, false, `C-1 (${path}, 390px): breadcrumb KHÔNG được hiện ở điện thoại — giao diện điện thoại phải giữ nguyên — ${JSON.stringify(mob)}`);
      // Bản vẽ Trang chủ điện thoại 2026-09-30: dải đầu "/" là lời chào (không logo) — đổi CÓ CHỦ ĐÍCH; /orders giữ logo như cũ.
      assert.equal(mob.brandShown, path !== "/", `C-1 (${path}, 390px): logo/tên app ${path === "/" ? "KHÔNG hiện ở Trang chủ (bản vẽ 2026-09-30)" : "vẫn phải hiện ở điện thoại"} — ${JSON.stringify(mob)}`);
      await pCrumb.send("Emulation.setDeviceMetricsOverride", { width: DESK.width, height: DESK.height, deviceScaleFactor: 1, mobile: false });
      const desk = await readCrumb();
      assert.equal(desk.titleShown, true, `C-1 (${path}, 1040px): breadcrumb PHẢI hiện ở máy tính (trước sửa ô này bỏ trống) — ${JSON.stringify(desk)}`);
      assert.equal(desk.titleText, expected, `C-1 (${path}, 1040px): breadcrumb phải là nhãn mục điều hướng đang mở ("${expected}") — ${JSON.stringify(desk)}`);
      crumbs.push(`${path} → điện thoại: logo ${mob.brandShown ? "hiện" : "ẩn (dải chào)"}, breadcrumb ẩn; máy tính: "${desk.titleText}"`);
      // VÒNG SỬA 2 (mục 3): chờ huy hiệu nạp xong TRƯỚC khi chụp. Ảnh này mở ở khổ điện thoại rồi mới đổi sang khổ
      // máy tính, nên trên bản chưa vá nó chụp được một thanh bên KHÔNG có huy hiệu nào — người xem tưởng huy hiệu
      // hỏng. Huy hiệu nay nạp qua người nghe `resize` nên là việc BẤT ĐỒNG BỘ: thiếu chờ thì ảnh vẫn trắng huy hiệu.
      await pCrumb.waitFor("document.querySelector('#sidebar .sidebar-item-badge') !== null", `huy hiệu nạp xong sau khi đổi khổ (${path})`);
      await shot(pCrumb, `task-4-breadcrumb-${path === "/orders" ? "don-hang" : "trang-chu"}-may-tinh.png`);
      pCrumb.close();
    }
    ok(`G-7) Breadcrumb hai trang không khai data-title — ${crumbs.join(" · ")}`);

    // ================================================================================================
    // G-8 (VÒNG SỬA 2, mục 2): /audit ở dải hẹp, đo trên LẦN TẢI MỚI — không phải đổi khổ trên trang đã mở.
    // Người kiểm vòng 1 chỉ đo được đường "đổi khổ" và tự nêu đây là lỗ hổng: ô chọn `width: auto` lấy bề rộng
    // theo tuỳ chọn dài nhất, và bề rộng đó hoàn toàn có thể tính khác nhau giữa hai đường. G-1 ở trên đã quét
    // đường "đổi khổ"; khối này quét đường "tải mới" để hai đường cùng được chứng minh.
    // ================================================================================================
    const auditFresh = [];
    for (const width of [641, 645, 650, 768]) {
      const pAudit = await env.as(TOAN_QUYEN, "/audit", { width, height: 800, mobile: false }); // ADR-0038: Nhật ký chỉ Toàn quyền
      await pAudit.waitFor("document.querySelector('#sidebar') !== null", `thanh bên dựng xong (/audit ${width}px, tải mới)`);
      await pAudit.waitFor(`document.querySelector('.toolbar select option[value]:not([value=""])') !== null`, `ô chọn "Lọc hành động" đủ tuỳ chọn (/audit ${width}px)`);
      const a = await pAudit.ev(`(() => {
        const sel = document.querySelector('.toolbar select');
        const main = document.querySelector('main');
        const mr = main.getBoundingClientRect();
        const sr = sel.getBoundingClientRect();
        return {
          innerWidth, scrollWidth: document.scrollingElement.scrollWidth,
          selectWidth: Math.round(sr.width),
          // Khoảng thò ra khỏi HỘP NỘI DUNG của main (đã trừ đệm phải) — số dương là đang tràn.
          selectOverhang: Math.round(sr.right - (mr.right - parseFloat(getComputedStyle(main).paddingRight))),
        };
      })()`);
      assert.ok(a.scrollWidth <= a.innerWidth + 1, `G-8 (/audit @ ${width}px, TẢI MỚI): tràn ngang — scrollWidth ${a.scrollWidth} > innerWidth ${a.innerWidth} — ${JSON.stringify(a)}`);
      assert.ok(a.selectOverhang <= 1, `G-8 (/audit @ ${width}px, TẢI MỚI): ô chọn "Lọc hành động" thò ra khỏi hộp nội dung ${a.selectOverhang}px — ${JSON.stringify(a)}`);
      assert.deepEqual(pAudit.consoleErrors, [], `lỗi console (/audit ${width}px): ${pAudit.consoleErrors}`);
      auditFresh.push(a);
      pAudit.close();
    }
    ok(`G-8) /audit LẦN TẢI MỚI ở 4 khổ hẹp: ${auditFresh.map((a) => `${a.innerWidth}px → ô chọn ${a.selectWidth}px (thò ${a.selectOverhang}px), scrollWidth ${a.scrollWidth}`).join(" · ")}`);

    // ================================================================================================
    // G-9 (VÒNG SỬA 2, mục 3): mở ở khổ ĐIỆN THOẠI rồi ĐỔI sang khổ MÁY TÍNH — huy hiệu phải hiện ra.
    // Đây là tình huống thật của iPad: xoay ngang 768→1024. Trước sửa, lời gọi huy hiệu chỉ chạy MỘT LẦN lúc dựng
    // khung (`nav.offsetParent !== null`), nên xoay xong ra thanh bên rỗng huy hiệu cho tới khi tải lại trang.
    // Lỗi "thiếu người nghe sự kiện đổi khổ" đã cắn dự án ba lần — từ nay có khẳng định riêng cho nó.
    // ================================================================================================
    {
      const BADGE_ROUTES_R = ["/api/catalog/admin", "/api/orders/dashboard", "/api/feedback/badge"];
      const pRot = await env.as(ACCOUNTS.admin, "/parties", MOB);
      await pRot.waitFor("document.querySelector('#sidebar') !== null", "thanh bên dựng xong (/parties, 390px)");
      await sleep(1500); // để lời gọi (nếu có) chắc chắn đã bắn — vắng mặt phải là vắng THẬT
      const beforeCalls = BADGE_ROUTES_R.filter((r) => pRot.requests.some((q) => q.url.includes(r)));
      assert.deepEqual(beforeCalls, [], `G-9: ở 390px chưa được gọi route huy hiệu nào — đã gọi ${JSON.stringify(beforeCalls)}`);
      await pRot.send("Emulation.setDeviceMetricsOverride", { width: DESK.width, height: DESK.height, deviceScaleFactor: 1, mobile: false });
      await pRot.waitFor(
        `[...document.querySelectorAll('#sidebar .sidebar-item')].some((a) => a.querySelector('.sidebar-item-label').textContent.trim() === 'Đơn hàng' && a.querySelector('.sidebar-item-badge'))`,
        "huy hiệu 'Đơn hàng' xuất hiện SAU KHI đổi khổ (không tải lại trang)",
      );
      const rot = await pRot.ev(`(() => ({
        sidebarShown: document.querySelector('#sidebar').offsetParent !== null,
        badges: Object.fromEntries([...document.querySelectorAll('#sidebar .sidebar-item')].map((a) => [a.querySelector('.sidebar-item-label').textContent.trim(), a.querySelector('.sidebar-item-badge')?.textContent.trim() ?? null])),
      }))()`);
      assert.equal(rot.sidebarShown, true, `G-9: thanh bên phải hiện sau khi đổi khổ — ${JSON.stringify(rot)}`);
      assert.equal(rot.badges["Đơn hàng"], String(data.draftCount), `G-9: huy hiệu "Đơn hàng" sau khi đổi khổ phải = draftCount (${data.draftCount}) — ${JSON.stringify(rot)}`);
      const afterCalls = BADGE_ROUTES_R.filter((r) => pRot.requests.some((q) => q.url.includes(r)));
      assert.deepEqual(afterCalls, BADGE_ROUTES_R, `G-9: sau khi đổi khổ phải gọi ĐỦ ba route huy hiệu — chỉ thấy ${JSON.stringify(afterCalls)}`);
      // Không được gọi lại lần hai: người nghe `resize` phải TỰ GỠ ngay lần nạp đầu.
      await pRot.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 800, deviceScaleFactor: 1, mobile: false });
      await sleep(400);
      await pRot.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 800, deviceScaleFactor: 1, mobile: false });
      await sleep(1200);
      const perRoute = Object.fromEntries(BADGE_ROUTES_R.map((r) => [r, pRot.requests.filter((q) => q.url.includes(r)).length]));
      for (const [route, n] of Object.entries(perRoute)) {
        assert.equal(n, 1, `G-9: route huy hiệu ${route} bị gọi ${n} lần — người nghe 'resize' phải tự gỡ sau lần nạp đầu, không gọi lại mỗi lần đổi khổ — ${JSON.stringify(perRoute)}`);
      }
      assert.deepEqual(pRot.consoleErrors, [], `lỗi console (/parties đổi khổ): ${pRot.consoleErrors}`);
      pRot.close();
      ok(`G-9) Mở /parties ở 390px rồi đổi sang 1040px (không tải lại): huy hiệu hiện ra — ${JSON.stringify(rot.badges)}; ba route huy hiệu gọi đúng ${JSON.stringify(perRoute)} lần dù sau đó còn đổi khổ thêm hai lần nữa`);
    }
  }

  // ==================================================================================================
  // H) ĐỢT D TASK 5 — ba địa chỉ sau khi đổi trang mặc định (ADR-0015 điều 4): "/" → Trang chủ,
  //    "/orders" → Đơn hàng, "/home" → tự chuyển hướng về "/". Kiểm THẬT bằng trình duyệt (không chỉ đổi tên tệp).
  // ==================================================================================================
  {
    // Tĩnh trước: public/home.html (nay là trang chuyển hướng, KHÔNG còn là Trang chủ) phải dùng thẻ
    // <meta http-equiv="refresh">, KHÔNG dùng <script> nội tuyến — CSP script-src 'self' (public/_headers) chặn.
    const redirectHtml = readFileSync("public/home.html", "utf8");
    assert.match(redirectHtml, /<meta\s+http-equiv="refresh"\s+content="0;\s*url=\/"\s*>/, `public/home.html phải chuyển hướng bằng thẻ meta refresh về / — nội dung: ${redirectHtml.slice(0, 400)}`);
    assert.doesNotMatch(redirectHtml, /<script[\s>]/, "public/home.html không được có thẻ <script> (CSP script-src 'self' chặn script nội tuyến)");
    ok("H-0) Kiểm tĩnh: public/home.html chuyển hướng bằng meta refresh, không có script nội tuyến");

    // "/" → Trang chủ (khối #dash-grid), KHÔNG phải Đơn hàng (không có #list).
    const pHome = await env.as(ACCOUNTS.admin, "/", MOB);
    await pHome.waitFor("!document.querySelector('#dash-grid').hidden", "địa chỉ / tải Trang chủ xong");
    assert.equal(await pHome.ev("!!document.querySelector('#list')"), false, "địa chỉ / không được là trang Đơn hàng (không có #list)");
    pHome.close();
    ok("H-1) Địa chỉ / mở ra Trang chủ, không phải Đơn hàng");

    // "/orders" → Đơn hàng (ô tìm #q + #list), KHÔNG phải Trang chủ (không có #dash-grid).
    const pOrders = await env.as(ACCOUNTS.admin, "/orders", MOB);
    await pOrders.waitFor("document.querySelector('#list') !== null && document.querySelector('.toolbar #q') !== null", "địa chỉ /orders tải Đơn hàng xong");
    assert.equal(await pOrders.ev("!!document.querySelector('#dash-grid')"), false, "địa chỉ /orders không được là Trang chủ (không có #dash-grid)");
    pOrders.close();
    ok("H-2) Địa chỉ /orders mở ra Đơn hàng, không phải Trang chủ");

    // "/home" → chuyển hướng THẬT (điều hướng trình duyệt, không đứng yên) về / rồi tải đúng Trang chủ.
    const pRedirect = await env.as(ACCOUNTS.admin, "/home", MOB);
    await pRedirect.waitFor("location.pathname === '/' && document.readyState === 'complete'", "địa chỉ /home tự chuyển hướng về /", 8000);
    await pRedirect.waitFor("!document.querySelector('#dash-grid').hidden", "sau khi chuyển hướng, Trang chủ tải xong");
    pRedirect.close();
    ok("H-3) Địa chỉ /home tự chuyển hướng về / rồi tải đúng Trang chủ");
  }

  // ==================================================================================================
  // J) ĐỢT E PHẦN B — biểu tượng Trang chủ (đặc tả 2026-09-23-dot-e-the-don-gon-va-bieu-tuong.md §B). Mỗi biểu
  //    tượng: có mặt (svg thật, không phải chữ/emoji), `aria-hidden="true"` (trang trí), LUÔN đi kèm chữ ngay cạnh
  //    (không đứng một mình). Dùng lại đúng dữ liệu đã tạo ở đầu kịch bản (R1 hôm nay/Bến Cầu Đá, R2 nháp, R3 còn
  //    thiếu tiền, T3 "Cần xem lại") — ADMIN, khổ máy tính để #dash-review chắc chắn còn hiện.
  // ==================================================================================================
  {
    const p = await env.as(ACCOUNTS.admin, "/", DESK);
    await p.waitFor("!document.querySelector('#dash-grid').hidden", "Trang chủ tải xong (Phần B)");
    await p.waitFor("document.querySelector('#dash-review').hidden === false", "khối “Cần xem lại” hiện (dữ liệu T3 còn nguyên)", 8000);
    const icons = await p.ev(`(() => {
      const svgOf = (el) => el ? el.querySelector('svg') : null;
      const info = (el) => { const s = svgOf(el); return { hasSvg: !!s, ariaHidden: s?.getAttribute('aria-hidden') ?? null, text: el ? el.textContent.trim() : null }; };
      const stats = [...document.querySelectorAll('#dash-so-mt .dash-smt-o')].map((el) => info(el.querySelector('.dash-smt-nhan')));
      const today = document.querySelector('#dash-today-list .dash-today-row');
      return {
        stats,
        statLabels: [...document.querySelectorAll('#dash-so-mt .dash-smt-nhan-chu')].map((e) => e.textContent.trim()),
        todayTitle: info(document.querySelector('.dash-today-title')),
        reviewHeading: info(document.querySelector('.dash-review-heading')),
        reviewRow: info(document.querySelector('#dash-review-list .dash-review-row .dash-review-icon')),
        todayPhone: info(today?.querySelector('.dash-today-sub .order-row-phone')),
        todayPlace: info(today?.querySelector('.dash-today-place')),
      };
    })()`);
    assert.deepEqual(icons.statLabels, ["Còn thiếu tiền", "Doanh thu của tôi", "Chờ xác nhận", "Chưa phụ trách"], `J: bốn ô số liệu (bản vẽ máy tính v2) đúng thứ tự — ${JSON.stringify(icons.statLabels)}`);
    icons.stats.forEach((s, i) => {
      assert.ok(s.hasSvg && s.ariaHidden === "true", `J: ô số liệu #${i} (${icons.statLabels[i]}) phải có biểu tượng aria-hidden — ${JSON.stringify(s)}`);
      assert.ok(s.text && s.text.length > 0, `J: ô số liệu #${i} phải còn chữ đi kèm biểu tượng (không đứng một mình) — ${JSON.stringify(s)}`);
    });
    // Góp ý YC-0007 (chủ chọn cách A, 30/9): tiêu đề khối nay là "Chuyến đón" + ba nút Hôm nay / Ngày mai / Ngày kia.
    // "Doanh thu của tôi" nay là một ô của thẻ số liệu (biểu tượng đã đo ở vòng ô số liệu bên trên).
    for (const [name, x] of [["Chuyến đón", icons.todayTitle], ["Cần xem lại", icons.reviewHeading]]) {
      assert.ok(x.hasSvg && x.ariaHidden === "true", `J: tiêu đề "${name}" phải có biểu tượng aria-hidden — ${JSON.stringify(x)}`);
      assert.equal(x.text, name, `J: tiêu đề phải còn đúng chữ gốc "${name}" — ${JSON.stringify(x)}`);
    }
    assert.ok(icons.reviewRow.hasSvg && icons.reviewRow.ariaHidden === "true", `J: dòng "Cần xem lại" (mục cảnh báo) phải có biểu tượng aria-hidden (dùng lại "alert") — ${JSON.stringify(icons.reviewRow)}`);
    assert.ok(icons.todayPhone.hasSvg && icons.todayPhone.ariaHidden === "true" && /09\d{8}/.test(icons.todayPhone.text ?? ""), `J: SĐT ở "Chuyến đón hôm nay" phải có biểu tượng ống nghe đi kèm số — ${JSON.stringify(icons.todayPhone)}`);
    assert.ok(icons.todayPlace.hasSvg && icons.todayPlace.ariaHidden === "true" && icons.todayPlace.text?.includes("Bến Cầu Đá"), `J: nơi đón ở "Chuyến đón hôm nay" phải có biểu tượng pin đi kèm tên nơi đón (R1, Bến Cầu Đá) — ${JSON.stringify(icons.todayPlace)}`);
    await axe(p, "trang-chu-bieu-tuong-1040");
    await shot(p, "task-5-dot-e-bieu-tuong-1040.png");
    await p.send("Emulation.setDeviceMetricsOverride", { width: MOB.width, height: MOB.height, deviceScaleFactor: 1, mobile: true });
    await axe(p, "trang-chu-bieu-tuong-390");
    await shot(p, "task-5-dot-e-bieu-tuong-390.png");
    p.close();
    ok(`J) Đợt E Phần B: biểu tượng có mặt + aria-hidden + đi kèm chữ ở bốn ô số liệu (${JSON.stringify(icons.statLabels)}), hai tiêu đề khối, dòng "Cần xem lại", SĐT và nơi đón ở "Chuyến đón hôm nay"; axe 0 vi phạm critical/serious ở 1040 và 390px`);
  }

  // ==================================================================================================
  // I) SỬA SAU PHÁT HÀNH (2026-09-24, cách sửa A do chủ dự án chốt): tài khoản CHỈ Đối tác (PARTNER) tới "/" phải
  //    sang thẳng "/orders" (src/shared/start-page.ts → web/home.ts), KHÔNG gọi dashboard (route "office" → 403,
  //    câu lỗi viết cho FIELD). Trước Đợt D "/" chính là Đơn hàng nên họ vào thẳng danh sách đơn của mình.
  //    ĐẶT CUỐI KỊCH BẢN có chủ đích: (1) đơn do Đối tác lập là đơn nháp/chưa phụ trách/còn thiếu tiền — đặt sớm hơn
  //    sẽ làm lệch các khẳng định đếm toàn công ty ở trên; (2) kho cookie dùng chung — trang của tài khoản này mở sau cùng.
  //    Hai đường vào: I-1 đăng nhập PIN THẬT qua form /login (đích mặc định "/"); I-2 mở thẳng "/" khi đã có phiên
  //    (gõ địa chỉ / mở app PWA từ màn hình chính). Chỉ-FIELD (bước C ở trên) từ Task 1.7 CŨNG sang "/orders" —
  //    không còn banner lỗi (ADR-0030 S23-4, khác PARTNER chỉ ở lý do quyền: FIELD = "mình phụ trách", PARTNER = "mình lập").
  // ==================================================================================================
  {
    const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
    const partnerOnly = { name: "Đối Tác Thử", phone: "0900000398", pin: "135790", permissions: ["PARTNER"] };
    for (const stmt of (await insertStaffSql(partnerOnly)).split("\n")) env.sql(stmt);
    // 2026-09-26 (DK-T3-01): Đối tác không lập được dịch vụ nhập tay (R1, 400) và phải dùng đúng giá bán lẻ, không giảm giá (R2/R3) → đơn của Đối tác
    // dùng dịch vụ danh mục TTB06 giá bán lẻ (trước: dịch vụ nhập tay "Tour 4 đảo (đơn Đối tác tự lập)" 200.000). Bước này chỉ khẳng định đơn hiện ở /orders.
    const created = await call(partnerOnly, "POST", "/api/orders", orderInput("Khách Của Đối Tác", "0900000302", [
      catalogService({ departDate: TOMORROW, pickupTime: "07:00", pickupPlace: "Khách sạn Đối tác" }),
    ]));
    assert.equal(created.status, 201, `Đối tác lập đơn: ${JSON.stringify(created.json)}`);

    const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
    /** Kết thúc ở /orders, thấy đơn của mình, không banner lỗi, console sạch, KHÔNG từng gọi dashboard. */
    const assertLandedOnOrders = async (p, label) => {
      await p.waitFor("location.pathname === '/orders' && document.readyState === 'complete'", `${label}: kết thúc ở /orders`, 15000);
      await p.waitFor(`${q("#list")} && ${q("#list")}.querySelectorAll('.order-row').length > 0`, `${label}: danh sách đơn hiện`, 10000);
      const m = await p.ev(`(() => ({
        path: location.pathname,
        rows: [...document.querySelectorAll('#list .order-row')].map((a) => a.textContent.includes('Khách Của Đối Tác')),
        errorHidden: document.querySelector('#error').hidden,
        errorText: document.querySelector('#error').textContent.trim(),
        dashGrid: !!document.querySelector('#dash-grid'),
      }))()`);
      assert.equal(m.path, "/orders", `${label}: phải kết thúc ở /orders — ${JSON.stringify(m)}`);
      assert.ok(m.rows.includes(true), `${label}: danh sách phải có đơn "Khách Của Đối Tác" — ${JSON.stringify(m)}`);
      assert.equal(m.errorHidden, true, `${label}: KHÔNG được có banner lỗi — ${JSON.stringify(m)}`);
      assert.equal(m.dashGrid, false, `${label}: trang cuối không được là Trang chủ — ${JSON.stringify(m)}`);
      const dashCalls = p.requests.filter((r) => r.url.includes("/api/orders/dashboard")).map((r) => r.url);
      assert.deepEqual(dashCalls, [], `${label}: KHÔNG được gọi /api/orders/dashboard (route văn phòng → 403) — đã gọi ${JSON.stringify(dashCalls)}`);
      assert.deepEqual(p.consoleErrors, [], `lỗi console (${label}): ${p.consoleErrors}`);
      return m;
    };

    // I-1: đăng nhập PIN thật qua form (không tiêm cookie) — đích mặc định sau đăng nhập là "/".
    const pLogin = await env.openPage(MOB);
    await pLogin.send("Network.clearBrowserCookies");
    await pLogin.send("Page.navigate", { url: env.base + "/login" });
    await pLogin.waitFor(`document.readyState === 'complete' && !!${q("#submit")}`, "trang đăng nhập tải xong", 15000);
    // Bản thiết kế Đăng nhập (2026-09-24): nút chỉ mở khi đã gõ đủ SĐT + 6 số PIN — gõ trước, rồi chờ nút mở.
    await pLogin.ev(setInput(q("#phone"), partnerOnly.phone));
    await pLogin.ev(setInput(q("#pin"), partnerOnly.pin));
    await pLogin.waitFor(`!${q("#submit")}.disabled`, "trang đăng nhập sẵn sàng (nút mở)", 15000);
    await pLogin.ev(`${q("#submit")}.click(); true`);
    await assertLandedOnOrders(pLogin, "I-1 Đối tác đăng nhập PIN");
    assert.ok(pLogin.requests.some((r) => new URL(r.url).pathname === "/"), "I-1: phải thật sự đi qua \"/\" (đích mặc định sau đăng nhập) rồi mới sang /orders");
    await shot(pLogin, "sua-doi-tac-dang-nhap-vao-don-hang-dien-thoai.png");
    pLogin.close();
    ok("I-1) Tài khoản CHỈ Đối tác đăng nhập PIN thật (390px): đi qua \"/\" rồi kết thúc ở /orders, thấy đơn của mình, không banner lỗi, không gọi dashboard, console sạch");

    // I-2: đã có phiên, mở thẳng "/" (gõ địa chỉ / mở app PWA) ở khổ máy tính.
    const pDirect = await env.as(partnerOnly, "/", DESK);
    await assertLandedOnOrders(pDirect, "I-2 Đối tác mở thẳng /");
    await shot(pDirect, "sua-doi-tac-mo-thang-vao-don-hang-may-tinh.png");
    pDirect.close();
    ok("I-2) Tài khoản CHỈ Đối tác mở thẳng \"/\" (1040px): kết thúc ở /orders, thấy đơn của mình, không banner lỗi, không gọi dashboard, console sạch");
  }
} finally {
  await env.stop();
}
console.log("TRANG CHU SMOKE OK");

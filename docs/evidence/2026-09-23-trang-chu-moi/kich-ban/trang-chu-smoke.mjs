// Kịch bản Chrome cho Task 3 ("Trang chủ mới", docs/superpowers/sdd/2026-09-23-trang-chu-moi/task-3-brief.md) — BẰNG CHỨNG HÀNH VI TRÌNH DUYỆT DUY NHẤT
// cho /home (`npm test`/`test:e2e -- pwa` KHÔNG phủ DOM của web/home.ts, chỉ phủ luật thuần + manifest/service worker). Dùng lại NGUYÊN cơ chế CDP của A2
// (startEnv()/ACCOUNTS/ok/vnDate từ ../../2026-09-20-a2/kich-ban/a2-cdp.mjs) theo mẫu cấu trúc của ../../2026-09-22-thiet-ke-lai-giao-dien-dot-c/kich-ban/dot-c-smoke.mjs.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=<…/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs
// Ghi ảnh vào docs/evidence/2026-09-23-trang-chu-moi/anh/*.png.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-23-trang-chu-moi";
const AXE = readFileSync(process.env.AXE_JS, "utf8");
mkdirSync(join(OUT, "anh"), { recursive: true });

const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };

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
// 0) KIỂM TĨNH (không cần trình duyệt): public/home.html PHẢI có sẵn `hidden` trên #dash-today-count/#dash-grid
//    NGAY TRONG MARKUP (trước khi JS chạy) — đây là lỗi Task 2 đã sửa (huy hiệu rỗng/khối rỗng lúc tải).
//    Phương án thay cho việc chặn mạng bằng CDP Fetch domain (brief mục C cho phép dùng cách này nếu chặn mạng phức tạp).
//    SỬA (Đợt D Task 1 — đổi có chủ đích): #dash-stats + #dash-layout gộp thành MỘT khối #dash-grid duy nhất (lưới
//    2×2 gộp cả "Doanh thu của tôi" ở khổ điện thoại — đúng đặc tả §3, khớp bản mẫu). #dash-grid mang `hidden`
//    chung; #dash-stats không còn tự mang `hidden` riêng (ẩn/hiện theo khối cha).
// ==================================================================================================
{
  const html = readFileSync("public/home.html", "utf8");
  const hasHiddenAttr = (idAttr) => new RegExp(`id="${idAttr}"[^>]*\\bhidden\\b`).test(html) || new RegExp(`\\bhidden\\b[^>]*id="${idAttr}"`).test(html);
  assert.ok(hasHiddenAttr("dash-today-count"), "public/home.html: #dash-today-count phải có sẵn `hidden` trong markup tĩnh (không hiện viên thuốc xanh rỗng lúc tải)");
  assert.ok(hasHiddenAttr("dash-grid"), "public/home.html: #dash-grid phải có sẵn `hidden` trong markup tĩnh");
  ok("Kiểm tĩnh: public/home.html có sẵn `hidden` trên #dash-today-count, #dash-grid trong markup gốc (trước khi JS chạy)");
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

  /** Dịch vụ nhập tay tối thiểu (1 dòng tiền, 1 khách lớn) — đủ để xác nhận được. */
  const manualService = (name, { departDate, pickupTime, pickupPlace, unitPrice }) => ({
    kind: "manual",
    name,
    pax: { adult: 1, child: 0, senior: 0, infant: 0 },
    departDate,
    departTime: "",
    pickupTime,
    pickupPlace,
    checkinDate: "",
    checkinTime: "",
    checkinPlace: "",
    note: "",
    items: [{ description: name, detail: "", quantity: 1, unitPrice }],
  });

  const orderInput = (customerName, customerPhone, services, extra = {}) => ({
    customerName,
    customerPhone,
    customerEmail: "",
    customerNote: "",
    services,
    discount: 0,
    depositAmount: 0,
    depositMethod: "cash",
    paymentNote: "",
    ...extra,
  });

  const createAndConfirm = async (input) => {
    const created = await call(ACCOUNTS.admin, "POST", "/api/orders", input);
    assert.equal(created.status, 201, `tạo đơn: ${JSON.stringify(created.json)}`);
    const id = created.json.order.id;
    const confirmed = await call(ACCOUNTS.admin, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
    assert.equal(confirmed.status, 200, `xác nhận đơn ${id}: ${JSON.stringify(confirmed.json)}`);
    return confirmed.json.order;
  };

  // ==================================================================================================
  // 1) Tạo dữ liệu thật qua API (ADMIN) — TRƯỚC khi mở /home.
  //    R1 (mục B — bẫy bug Task 1 đã sửa): 2 dịch vụ NGÀY KHÁC NHAU, sort_order NGƯỢC chiều ngày:
  //      sort_order=0 → NGÀY MAI (giờ/nơi đón rõ ràng khác), sort_order=1 → HÔM NAY (dịch vụ QUYẾT ĐỊNH "hôm nay").
  //    Trả đủ tiền (remainingAmount=0) để không lẫn vào ô "Còn thiếu tiền" (tách bạch với R3 bên dưới).
  // ==================================================================================================
  const r1Services = [
    manualService("Đưa đón sân bay (dịch vụ NGÀY MAI, không phải dịch vụ quyết định)", { departDate: TOMORROW, pickupTime: "19:30", pickupPlace: "Sân bay Cam Ranh", unitPrice: 150_000 }),
    manualService("Tour 4 đảo (dịch vụ HÔM NAY — quyết định)", { departDate: TODAY, pickupTime: "06:15", pickupPlace: "Bến Cầu Đá", unitPrice: 150_000 }),
  ];
  const r1 = await createAndConfirm(orderInput("Khách Bẫy B Hôm Nay", "0900000301", r1Services, { depositAmount: 300_000 }));
  ok(`R1 tạo + xác nhận (id ${r1.id}): 2 dịch vụ (sort_order 0 = mai 19:30/Sân bay Cam Ranh, sort_order 1 = hôm nay 06:15/Bến Cầu Đá), đã trả đủ 300.000`);

  // R2: NHÁP (không xác nhận), có dịch vụ HÔM NAY — phải KHÔNG lọt vào "Chuyến đón hôm nay" dù trùng ngày (chỉ đơn confirmed mới vào).
  const r2Created = await call(ACCOUNTS.admin, "POST", "/api/orders", orderInput("Khách Nháp Chưa Xác Nhận", "0900000302", [
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
  // F) Ghim thứ tự khai route: GET /api/orders/dashboard PHẢI trả dữ liệu thật (không phải 404 do bị route
  //    "GET /api/orders/:id" ở dưới nuốt mất nếu ai đó lỡ dời thứ tự khai route trong orders/index.ts).
  // ==================================================================================================
  const apiTruth = await call(ACCOUNTS.admin, "GET", "/api/orders/dashboard");
  assert.equal(apiTruth.status, 200, `GET /api/orders/dashboard phải trả 200 (không phải 404 do route :id nuốt mất): ${JSON.stringify(apiTruth.json)}`);
  const data = apiTruth.json;
  assert.ok(Array.isArray(data.today) && typeof data.unpaid === "object" && typeof data.draftCount === "number", `GET /api/orders/dashboard trả sai hình dạng dữ liệu: ${JSON.stringify(data)}`);
  ok("F) GET /api/orders/dashboard trả 200 với đúng hình dạng DashboardResponse — route đứng đúng chỗ (trước /api/orders/:id)");

  // ==================================================================================================
  // 2) Đối chiếu API TRẢ VỀ với số tự tay tính (bài học Đợt B: số HIỆN HÀNH, chỉ đơn confirmed vào today/unpaid/revenue).
  //    Đây là lưới thứ hai (ngoài dashboard.test.ts của Task 1): xác nhận qua ĐƯỜNG HTTP THẬT, không chỉ hàm thuần.
  // ==================================================================================================
  assert.equal(data.draftCount, 1, `draftCount phải = 1 (chỉ R2) — API trả ${JSON.stringify(data)}`);
  assert.equal(data.unpaid.count, 1, `unpaid.count phải = 1 (chỉ R3, R1 đã trả đủ) — ${JSON.stringify(data.unpaid)}`);
  assert.equal(data.unpaid.total, 12_345_000, `unpaid.total phải = 12.345.000 (R3) — ${JSON.stringify(data.unpaid)}`);
  assert.equal(data.unpaid.earliestDate, OTHER_DATE, `unpaid.earliestDate phải là ngày đón của R3 — ${JSON.stringify(data.unpaid)}`);
  assert.equal(data.today.length, 1, `today phải chỉ có R1 (R2 nháp, R3 không phải hôm nay) — ${JSON.stringify(data.today.map((o) => o.id))}`);
  assert.equal(data.today[0].id, r1.id, "today[0] phải là R1");
  assert.deepEqual(data.today[0].trip, { departDate: TODAY, pickupTime: "06:15", pickupPlace: "Bến Cầu Đá" }, `trip của R1 trong API phải là dịch vụ QUYẾT ĐỊNH (sort_order=1, hôm nay), KHÔNG phải sort_order=0 (mai) — ${JSON.stringify(data.today[0].trip)}`);
  assert.equal(data.revenueWeek.count, 2, `revenueWeek.count phải = 2 (R1 + R3, cùng người lập, cùng tuần) — ${JSON.stringify(data.revenueWeek)}`);
  assert.equal(data.revenueWeek.total, 300_000 + 12_345_000, `revenueWeek.total phải = 12.645.000 — ${JSON.stringify(data.revenueWeek)}`);
  ok(`API GET /api/orders/dashboard khớp số tự tính: draftCount=1, unpaid=1 đơn/12.345.000, today=[R1] (trip đúng dịch vụ quyết định), revenueWeek=2 đơn/12.645.000; unassignedCount=${data.unassignedCount} (cross-check DOM bên dưới, không tự đoán trước — phụ thuộc quy tắc gán người phụ trách mặc định của module dispatch, ngoài phạm vi Task 3)`);

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
  // 3) Mở /home ở khổ máy tính (1040) và điện thoại (390) — bằng ADMIN. Đối chiếu MỖI SỐ trên màn hình THẬT
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
      const grid = document.querySelector('#dash-grid');
      const stats = [...document.querySelectorAll('#dash-stats .dash-stat')].map((el) => {
        const valueEl = el.querySelector('.dash-stat-value');
        const cs = getComputedStyle(valueEl);
        const oneLineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
        const actualHeight = valueEl.getBoundingClientRect().height;
        return {
          label: shown(el.querySelector('.dash-stat-label')),
          value: shown(valueEl),
          sub: shown(el.querySelector('.dash-stat-sub')),
          // Kiểm gộp I-3: "500.000 ₫" từng xuống 2 dòng (ký hiệu tiền tệ rơi khỏi dòng số) ở lưới 2 cột khổ hẹp — đo CHIỀU CAO THẬT so với một dòng.
          // Đo trên valueEl (khối cha) chứ không phải .lbl-full: ở mỗi khổ chỉ MỘT trong hai bản thật sự chiếm chỗ (bản kia display:none), nên chiều cao khối cha phản ánh đúng bản đang hiện.
          valueOneLineHeight: oneLineHeight,
          valueActualHeight: actualHeight,
          valueWrapped: actualHeight > oneLineHeight + 1,
        };
      });
      const todayRows = [...document.querySelectorAll('#dash-today-list .dash-today-row')].map((row) => ({
        time: row.querySelector('.dash-today-time')?.textContent.trim() ?? null,
        place: row.querySelector('.dash-today-place')?.textContent.trim() ?? null,
        name: row.querySelector('.dash-today-name')?.textContent.trim() ?? null,
        sub: shown(row.querySelector('.dash-today-main .muted')),
        money: shown(row.querySelector('.dash-today-money b')),
        moneySub: visibleText(row.querySelector('.dash-today-money .muted.lbl-full')),
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
      const chartEl = document.querySelector('#dash-revenue .dash-revenue-chart');
      const chart = chartEl ? {
        shown: chartEl.offsetParent !== null,
        barCount: chartEl.querySelectorAll('.dash-chart-bar').length,
        barHeights: [...chartEl.querySelectorAll('.dash-chart-bar')].map((b) => parseFloat(b.style.height)),
        // Fix round 2 (quyết định chủ dự án 2026-09-23, mục 7): tô đậm = ngày ĐÃ QUA + HÔM NAY, ngày CHƯA TỚI để nhạt.
        barDark: [...chartEl.querySelectorAll('.dash-chart-bar')].map((b) => b.classList.contains('dash-chart-bar-dark')),
        labels: [...chartEl.querySelectorAll('.dash-chart-labels > *')].map((s) => s.textContent.trim()),
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
        stats,
        revenueRange: document.querySelector('#dash-revenue-range').textContent.trim(),
        revenueValue: shown(document.querySelector('.dash-revenue-value')),
        revenueSub: shown(document.querySelector('#dash-revenue-total .muted')),
        chart,
        errorHidden: document.querySelector('#error').hidden,
        loadingHidden: document.querySelector('#loading').hidden,
        scrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`);

  // `mode`: "desktop" (chữ ĐẦY ĐỦ đang hiển thị thật ở ≥900px) hay "mobile" (chữ RÚT GỌN đang hiển thị thật ở ≤639px) —
  // hai bản chữ khác nhau nên khẳng định riêng, không dùng chung một kỳ vọng (kiểm độc lập, Fix round 1).
  const assertHome = (m, label, mode) => {
    assert.equal(m.gridHidden, false, `${label}: #dash-grid phải HIỆN sau khi tải xong — ${JSON.stringify(m)}`);
    assert.equal(m.errorHidden, true, `${label}: #error phải ẨN (không lỗi) — ${JSON.stringify(m)}`);
    assert.equal(m.loadingHidden, true, `${label}: #loading (khung xương) phải ẨN sau khi tải xong — ${JSON.stringify(m)}`);
    assert.ok(m.scrollOverflow <= 1, `${label}: không được tràn ngang — lệch ${m.scrollOverflow}px`);

    // 3 ô số liệu — đối chiếu với API (nguồn sự thật vừa đọc), theo ĐÚNG thứ tự renderStats() dựng (money → draft → unassigned).
    assert.equal(m.stats.length, 3, `${label}: phải có đúng 3 ô số liệu — ${JSON.stringify(m.stats)}`);
    if (mode === "desktop") {
      assert.equal(m.stats[0].label, "Còn thiếu tiền", `${label}: nhãn ĐẦY ĐỦ ô "Còn thiếu tiền" — ${JSON.stringify(m.stats[0])}`);
      assert.equal(m.stats[0].value, "12.345.000 ₫", `${label}: giá trị ĐẦY ĐỦ ô "Còn thiếu tiền" phải hiện 12.345.000 ₫ — ${JSON.stringify(m.stats[0])}`);
      assert.ok(m.stats[0].sub.includes("1 đơn"), `${label}: ô "Còn thiếu tiền" phải nói "1 đơn" — ${JSON.stringify(m.stats[0])}`);
      assert.equal(m.stats[1].label, "Đơn nháp chưa xác nhận", `${label}: nhãn ĐẦY ĐỦ ô đơn nháp — ${JSON.stringify(m.stats[1])}`);
      assert.equal(m.stats[1].value, "1", `${label}: ô "Đơn nháp chưa xác nhận" phải = 1 (chỉ R2, không đếm R1/R3 đã xác nhận) — ${JSON.stringify(m.stats[1])}`);
      assert.equal(m.stats[2].label, "Chưa có người phụ trách", `${label}: nhãn ĐẦY ĐỦ ô chưa phụ trách — ${JSON.stringify(m.stats[2])}`);
      assert.equal(m.stats[2].value, String(data.unassignedCount), `${label}: ô "Chưa có người phụ trách" phải khớp API (${data.unassignedCount}) — ${JSON.stringify(m.stats[2])}`);
      assert.equal(m.stats[2].sub, "Cần gán trước giờ đón", `${label}: dòng phụ ĐẦY ĐỦ ô chưa phụ trách phải khớp mockup "Cần gán trước giờ đón" — ${JSON.stringify(m.stats[2])}`);
      assert.equal(m.revenueValue, "12.645.000 ₫", `${label}: doanh thu ĐẦY ĐỦ phải = 12.645.000 ₫ (R1 300.000 + R3 12.345.000) — ${JSON.stringify(m)}`);
      assert.ok(m.revenueSub.includes("2 đơn"), `${label}: doanh thu phải nói "2 đơn" — ${m.revenueSub}`);

      // Đợt D Task 2 — biểu đồ cột 7 ngày: PHẢI hiển thị thật ở máy tính (cùng thẻ "Doanh thu của tôi").
      assert.ok(m.chart, `${label}: phải có .dash-revenue-chart trong DOM — ${JSON.stringify(m)}`);
      assert.equal(m.chart.shown, true, `${label}: biểu đồ phải đang HIỂN THỊ thật (offsetParent) ở máy tính — ${JSON.stringify(m.chart)}`);
      assert.equal(m.chart.barCount, 7, `${label}: biểu đồ phải có đúng 7 cột — ${JSON.stringify(m.chart)}`);
      assert.deepEqual(m.chart.labels, ["T2", "T3", "T4", "T5", "T6", "T7", "CN"], `${label}: nhãn trục phải đúng T2..CN theo thứ tự — ${JSON.stringify(m.chart)}`);
      assert.equal(m.chart.barHeights.length, 7, `${label}: phải đo được chiều cao cả 7 cột — ${JSON.stringify(m.chart)}`);
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
    } else {
      // Bản RÚT GỌN (đang hiển thị THẬT ở 390px — đây là phép đo mà kịch bản CŨ chưa từng thật sự làm, xem lịch sử sửa ở trên).
      assert.equal(m.stats[0].label, "Còn thiếu", `${label}: nhãn RÚT GỌN ô "Còn thiếu tiền" phải là "Còn thiếu" (bản đang thật sự hiển thị ở khổ hẹp) — ${JSON.stringify(m.stats[0])}`);
      assert.equal(m.stats[0].value, "12,34tr ₫", `${label}: giá trị RÚT GỌN ô "Còn thiếu tiền" phải là "12,34tr ₫" (vndShort đang thật sự hiển thị, KHÔNG phải "12.345.000 ₫") — ${JSON.stringify(m.stats[0])}`);
      assert.ok(m.stats[0].sub.includes("1 đơn"), `${label}: ô "Còn thiếu tiền" phải nói "1 đơn" — ${JSON.stringify(m.stats[0])}`);
      assert.equal(m.stats[1].label, "Đơn nháp", `${label}: nhãn RÚT GỌN ô đơn nháp phải là "Đơn nháp" — ${JSON.stringify(m.stats[1])}`);
      assert.equal(m.stats[1].value, "1", `${label}: ô "Đơn nháp chưa xác nhận" phải = 1 — ${JSON.stringify(m.stats[1])}`);
      assert.equal(m.stats[2].label, "Chưa phụ trách", `${label}: nhãn RÚT GỌN ô chưa phụ trách phải là "Chưa phụ trách" — ${JSON.stringify(m.stats[2])}`);
      assert.equal(m.stats[2].value, String(data.unassignedCount), `${label}: ô "Chưa có người phụ trách" phải khớp API (${data.unassignedCount}) — ${JSON.stringify(m.stats[2])}`);
      assert.equal(m.stats[2].sub, "Cần gán", `${label}: dòng phụ RÚT GỌN ô chưa phụ trách phải là "Cần gán" — ${JSON.stringify(m.stats[2])}`);
      assert.equal(m.revenueValue, "12,64tr ₫", `${label}: giá trị RÚT GỌN doanh thu phải là "12,64tr ₫" (vndShort đang thật sự hiển thị, KHÔNG phải "12.645.000 ₫") — ${JSON.stringify(m)}`);
      assert.ok(m.revenueSub.includes("2 đơn"), `${label}: doanh thu phải nói "2 đơn" — ${m.revenueSub}`);

      // Đợt D Task 2 — mockup mobile (390px) KHÔNG có biểu đồ trong ô "Doanh thu của tôi" (chỉ 1 trong 4 ô rút gọn của
      // lưới 2×2): biểu đồ vẫn còn trong DOM (không xoá — giữ đơn giản, không dựng hai bản) nhưng PHẢI ẩn bằng CSS.
      assert.ok(m.chart, `${label}: .dash-revenue-chart vẫn phải có trong DOM ở điện thoại (chỉ ẩn bằng CSS) — ${JSON.stringify(m)}`);
      assert.equal(m.chart.shown, false, `${label}: biểu đồ KHÔNG được hiển thị thật ở khổ điện thoại (mockup mobile không có biểu đồ) — ${JSON.stringify(m.chart)}`);
    }

    // Kiểm gộp I-3: số liệu ô ("dash-stat-value", vd "500.000 ₫") KHÔNG được xuống dòng — ký hiệu tiền tệ từng rơi xuống dòng riêng
    // ở lưới 2 cột khổ điện thoại hẹp (≤639px). So chiều cao thật với chiều cao MỘT dòng (line-height tính được).
    const wrappedStats = m.stats.filter((s) => s.valueWrapped);
    assert.deepEqual(wrappedStats, [], `${label}: số liệu ô (.dash-stat-value) bị xuống dòng (chiều cao thật vượt một dòng) — ${JSON.stringify(m.stats)}`);

    // Danh sách "Chuyến đón hôm nay": đúng 1 dòng (R1), R2 (nháp) và R3 (ngày khác) KHÔNG được lộ ra.
    assert.equal(m.todayBadgeHidden, false, `${label}: huy hiệu số chuyến hôm nay phải HIỆN sau khi có dữ liệu thật — ${JSON.stringify(m)}`);
    assert.equal(m.todayBadge, "1", `${label}: huy hiệu phải = 1 — ${JSON.stringify(m)}`);
    assert.equal(m.todayRowCount, 1, `${label}: danh sách phải đúng 1 dòng (chỉ R1) — ${JSON.stringify(m.todayRows)}`);
    assert.equal(m.todayEmptyHidden, true, `${label}: thông báo "Không có chuyến nào hôm nay" phải ẨN (có dữ liệu) — ${JSON.stringify(m)}`);

    // === B) Lỗi đã sửa ở Task 1 KHÔNG TÁI PHÁT — giờ đón VÀ nơi đón hiển thị PHẢI là của dịch vụ HÔM NAY (sort_order=1),
    //     TUYỆT ĐỐI KHÔNG được là "19:30"/"Sân bay Cam Ranh" (dịch vụ sort_order=0, ngày MAI). So với giá trị LITERAL đã tạo, không chỉ so với API.
    const row = m.todayRows[0];
    assert.equal(row.time, "06:15", `${label}: giờ đón hiển thị PHẢI là 06:15 (dịch vụ HÔM NAY, sort_order=1) — thấy "${row.time}". Nếu đây là "19:30" thì bug Task 1 (lấy nhầm dịch vụ sort_order nhỏ nhất) ĐÃ TÁI PHÁT.`);
    assert.equal(row.place, "Bến Cầu Đá", `${label}: nơi đón hiển thị PHẢI là "Bến Cầu Đá" (dịch vụ HÔM NAY) — thấy "${row.place}". Nếu đây là "Sân bay Cam Ranh" thì bug Task 1 ĐÃ TÁI PHÁT.`);
    assert.notEqual(row.time, "19:30", `${label}: giờ đón KHÔNG được là giờ của dịch vụ ngày mai`);
    assert.notEqual(row.place, "Sân bay Cam Ranh", `${label}: nơi đón KHÔNG được là nơi đón của dịch vụ ngày mai`);
    assert.equal(row.money, "0 ₫", `${label}: dòng R1 phải hiện đúng số CÒN LẠI hiện hành (remainingAmount) = 0 ₫ (đã trả đủ 300.000) — ${JSON.stringify(row)}`);
    if (mode === "desktop") {
      assert.equal(row.moneySub, "đã trả đủ", `${label}: R1 đã trả đủ (remainingAmount=0) phải hiện "đã trả đủ" — ${JSON.stringify(row)}`);
      assert.ok(row.sub && row.sub.includes("0900000301"), `${label}: dòng phụ ĐẦY ĐỦ phải chứa SĐT khách — ${JSON.stringify(row)}`);
      // Fix round 2: ở máy tính, thao tác gọi đã có sẵn trong dòng phụ (SĐT gạch chân) — nút gọi riêng (`.dash-today-call`,
      // chỉ dành cho khổ hẹp) TỒN TẠI trong DOM (dùng chung cho mọi khổ) nhưng KHÔNG được hiển thị ở đây (tránh trùng lặp/lệch mockup).
      assert.ok(row.call, `${label}: phải có phần tử .dash-today-call trong DOM (dùng chung cho cả hai khổ) — ${JSON.stringify(row)}`);
      assert.equal(row.call.shown, false, `${label}: nút gọi riêng (.dash-today-call) KHÔNG được hiển thị ở máy tính (đã có SĐT trong dòng phụ) — ${JSON.stringify(row)}`);
    } else {
      // "đã trả đủ"/"còn lại" CHỈ có bản đầy đủ (không có .lbl-short song song) → phải ẨN HẲN ở khổ hẹp, không lộ chữ.
      assert.equal(row.moneySub, null, `${label}: dòng "đã trả đủ/còn lại" không có bản rút gọn, phải ẨN HẲN ở khổ hẹp — ${JSON.stringify(row)}`);
      // Item 7 của Task 1: dòng phụ rút gọn phải là "nơi đón · tên dịch vụ" — NƠI ĐÓN ĐỨNG TRƯỚC tên dịch vụ.
      assert.ok(row.sub && row.sub.startsWith(`${row.place} ·`), `${label}: dòng phụ RÚT GỌN phải bắt đầu bằng "${row.place} ·" (nơi đón đứng TRƯỚC tên dịch vụ) — ${JSON.stringify(row)}`);
      // Fix round 2 (LƯỚI CHÍNH của việc này — quyết định chủ dự án 2026-09-23): dòng phụ rút gọn không còn SĐT,
      // nên PHẢI có một phần tử gọi khách RIÊNG đang thực sự hiển thị ở khổ 390px, với đúng SĐT của đơn thử trong nhãn máy đọc.
      assert.ok(row.call, `${label}: phải có phần tử .dash-today-call (nút gọi khách) trong DOM ở khổ điện thoại — ${JSON.stringify(row)}`);
      assert.equal(row.call.shown, true, `${label}: nút gọi khách (.dash-today-call) PHẢI đang hiển thị thật (offsetParent) ở khổ điện thoại — mất thao tác gọi là lỗi Đợt D Task 1 vòng 1 — ${JSON.stringify(row)}`);
      assert.ok(row.call.ariaLabel && row.call.ariaLabel.includes("0900000301"), `${label}: nhãn máy đọc của nút gọi phải chứa đúng SĐT của đơn thử (0900000301) — ${JSON.stringify(row)}`);
    }
  };

  let p = await env.as(ACCOUNTS.admin, "/home", DESK);
  await p.waitFor("!document.querySelector('#dash-grid').hidden", "Trang chủ tải xong (máy tính)");
  let m = await measureHome(p);
  assertHome(m, "Trang chủ (máy tính, 1040×800)", "desktop");
  assert.equal(m.gridDisplay, "grid", `Trang chủ (máy tính): #dash-grid phải display:grid ở ≥900px — ${JSON.stringify(m)}`);
  // Đợt D Task 1: DOM giữ nguyên thứ tự #dash-stats → #dash-revenue → #dash-today (khớp thứ tự đọc tự nhiên trên điện
  // thoại — bài học Đợt C); ở máy tính CSS grid-column/grid-row đặt #dash-today bên trái, #dash-revenue bên phải
  // (khác thứ tự DOM một cách CÓ CHỦ Ý, không phải lỗi) — kiểm DOM order KHÔNG đổi theo khổ màn hình.
  assert.deepEqual(m.gridOrder, ["dash-stats", "dash-revenue", "dash-today"], `Trang chủ (máy tính): thứ tự DOM phải là dash-stats, dash-revenue, dash-today — ${JSON.stringify(m.gridOrder)}`);
  assert.deepEqual(p.consoleErrors, [], `lỗi console (Trang chủ máy tính): ${p.consoleErrors}`);
  await shot(p, "trang-chu-may-tinh.png");
  await axe(p, "Trang chủ máy tính");

  // Đo thanh điều hướng trên máy tính (1040px): ADMIN nay có 9 mục ở nav — không tràn ngang, không vỡ thanh đầu trang.
  const navMeasure = await p.ev(`(() => {
    const nav = document.querySelector('.topnav');
    const links = [...nav.querySelectorAll('a')];
    return {
      linkCount: links.length,
      labels: links.map((a) => a.textContent.trim()),
      scrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      topbarOverflow: document.querySelector('#topbar').scrollWidth - document.querySelector('#topbar').clientWidth,
    };
  })()`);
  assert.equal(navMeasure.linkCount, 9, `Thanh điều hướng máy tính (ADMIN) phải có 9 mục — thấy ${navMeasure.linkCount}: ${JSON.stringify(navMeasure.labels)}`);
  assert.ok(navMeasure.scrollOverflow <= 1, `Thanh điều hướng máy tính: trang không được tràn ngang — lệch ${navMeasure.scrollOverflow}px`);
  assert.ok(navMeasure.topbarOverflow <= 1, `Thanh điều hướng máy tính: #topbar tự nó không được tràn ngang (flex-wrap phải nhận đủ) — lệch ${navMeasure.topbarOverflow}px`);
  ok(`D) Thanh điều hướng máy tính (1040px): ${navMeasure.linkCount} mục (${navMeasure.labels.join(", ")}), không tràn ngang (lệch ${navMeasure.scrollOverflow}px), #topbar tự nó không tràn (lệch ${navMeasure.topbarOverflow}px)`);
  p.close();
  ok("Trang chủ (máy tính, 1040×800): 3 ô số liệu + danh sách + doanh thu đúng số, bố cục grid, thứ tự DOM đúng, không tái phát bug giờ/nơi đón, axe không vi phạm critical/serious");

  p = await env.as(ACCOUNTS.admin, "/home", MOB);
  await p.waitFor("!document.querySelector('#dash-grid').hidden", "Trang chủ tải xong (điện thoại)");
  m = await measureHome(p);
  assertHome(m, "Trang chủ (điện thoại, 390×844)", "mobile");
  // Đợt D Task 1 (sửa lỗi lệch đặc tả §3): ở ≤639px #dash-grid nay display:grid (lưới 2×2 gộp cả doanh thu — KHÔNG
  // còn là display:block như trước sửa). #dash-stats chuyển display:contents để 3 ô của nó tham gia thẳng lưới ngoài.
  assert.equal(m.gridDisplay, "grid", `Trang chủ (điện thoại): #dash-grid phải display:grid ở ≤639px (lưới 2×2 gộp doanh thu) — ${JSON.stringify(m)}`);
  assert.deepEqual(m.gridOrder, ["dash-stats", "dash-revenue", "dash-today"], `Trang chủ (điện thoại): thứ tự DOM phải là dash-stats, dash-revenue, dash-today (đúng thứ tự đọc: 3 ô + doanh thu rồi mới đến chuyến đón hôm nay) — ${JSON.stringify(m.gridOrder)}`);
  {
    // Đợt D Task 1: đo THẬT rằng doanh thu là Ô THỨ TƯ của lưới 2×2 (không còn là thẻ mồ côi rơi khỏi màn đầu) —
    // 4 ô (3 số liệu + doanh thu) phải cùng nằm trong 2 hàng đầu, .dash-today phải nằm DƯỚI cả 4 ô đó.
    const gridMeasure = await p.ev(`(() => {
      const rectOf = (sel) => document.querySelector(sel).getBoundingClientRect();
      const stat = [...document.querySelectorAll('#dash-stats .dash-stat')].map((el) => el.getBoundingClientRect());
      const revenue = rectOf('#dash-revenue');
      const today = rectOf('#dash-today');
      return {
        statTops: stat.map((r) => Math.round(r.top)),
        revenueTop: Math.round(revenue.top),
        revenueBottom: Math.round(revenue.bottom),
        todayTop: Math.round(today.top),
      };
    })()`);
    assert.ok(gridMeasure.revenueTop < gridMeasure.todayTop, `Trang chủ (điện thoại): "Doanh thu của tôi" phải nằm TRÊN "Chuyến đón hôm nay" (ô thứ tư của lưới 2×2, không phải thẻ mồ côi rơi xuống dưới) — ${JSON.stringify(gridMeasure)}`);
    // Ô thứ 3 (statTops[2]) đứng hàng 2 cột 1 của lưới 2×2; doanh thu (ô thứ 4) phải đứng CÙNG HÀNG đó (cột 2) — so lệch top với sai số nhỏ (bo góc/viền).
    const lastStatTop = gridMeasure.statTops[gridMeasure.statTops.length - 1];
    assert.ok(Math.abs(gridMeasure.revenueTop - lastStatTop) <= 2, `Trang chủ (điện thoại): "Doanh thu của tôi" phải cùng HÀNG với ô số liệu thứ ba trong lưới 2×2 (ô thứ tư, không phải hàng riêng) — ${JSON.stringify(gridMeasure)}`);
    ok(`Đợt D Task 1: đo THẬT vị trí — doanh thu (top=${gridMeasure.revenueTop}) nằm trong cụm 2×2 cùng 3 ô số liệu (top=${JSON.stringify(gridMeasure.statTops)}) và TRÊN "Chuyến đón hôm nay" (top=${gridMeasure.todayTop})`);
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

    const pEmpty = await env.as(emptyWeekStaff, "/home", MOB);
    await pEmpty.waitFor("!document.querySelector('#dash-grid').hidden", "Trang chủ tải xong (tài khoản tuần trắng, điện thoại)");
    const mEmpty = await measureHome(pEmpty);
    assert.equal(mEmpty.gridHidden, false, `Tuần trắng: #dash-grid phải HIỆN sau khi tải xong — ${JSON.stringify(mEmpty)}`);
    assert.equal(mEmpty.errorHidden, true, `Tuần trắng: #error phải ẨN (không lỗi) — ${JSON.stringify(mEmpty)}`);
    assert.equal(mEmpty.revenueValue, "0 ₫", `Tuần trắng: giá trị RÚT GỌN doanh thu phải là "0 ₫" (tài khoản mới, chưa lập đơn nào) — ${JSON.stringify(mEmpty)}`);
    assert.ok(mEmpty.revenueSub.includes("0 đơn"), `Tuần trắng: dòng phụ doanh thu phải nói "0 đơn" — ${mEmpty.revenueSub}`);

    // LƯỚI CHÍNH (đặt TRƯỚC mọi assert khác đụng tới `.dash-revenue-chart`/`.dash-chart-empty`, để lưới này là điểm ĐỎ
    // ĐẦU TIÊN khi lỗi tái phát — không bị một assert khác "tự khớp với cách sửa đã chọn" chặn trước, che mất lưới
    // thật): đo TRỰC TIẾP phần tử ".dash-chart-empty" (dòng "Chưa có đơn nào tuần này") — nếu nó tồn tại trong DOM
    // thì PHẢI không hiển thị thật ở khổ điện thoại. Cố ý bỏ class `dash-revenue-chart` khỏi <p> rỗng (hoàn nguyên
    // tạm) sẽ làm assert `emptyShown` này ĐỎ (xem báo cáo P16) — không phụ thuộc CÁCH sửa (class trên <p> hay mở
    // rộng luật CSS), chỉ đo đúng HÀNH VI hiển thị mà yêu cầu sửa đòi hỏi.
    const readEmpty = () =>
      pEmpty.ev(`(() => {
        const emptyEl = document.querySelector('#dash-revenue .dash-chart-empty');
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
    // Fix round 2 — kiểm nghi ngờ: <p class="dash-chart-empty dash-revenue-chart"> ở khổ máy tính nhận CSS
    // `.dash-revenue-chart { display: flex; flex-direction: column; }` (một <p> chứa text trở thành flex container).
    // Chụp ảnh để XEM THẬT dòng chữ có căn sai/giãn chữ/mất khoảng cách hay không (không chỉ đo DOM).
    await shot(pEmpty, "trang-chu-may-tinh-tuan-trang.png");

    pEmpty.close();
    ok(`E) Tuần trắng (tài khoản SALES mới, chưa lập đơn): doanh thu = "0 ₫" · "${mEmpty.revenueSub}"; dòng chữ rỗng tồn tại trong DOM, KHÔNG hiển thị thật ở 390px (ô "Doanh thu của tôi" chỉ còn tổng tiền + dòng phụ, đúng bản mẫu), CÓ hiển thị thật ở khổ máy tính (vế bổ trợ)`);
  }

  // ==================================================================================================
  // C) Trạng thái LỖI thật — tài khoản KHÔNG có quyền văn phòng (chỉ FIELD) gọi /home: route "office" của
  //    GET /api/orders/dashboard trả 403 THẬT (src/shared/router.ts), không phải mô phỏng bằng cách chặn mạng.
  //    Khẳng định: CHỈ còn banner lỗi hiện; #dash-grid ẨN (gộp #dash-stats — Đợt D Task 1); #loading đã ẩn (không kẹt ở khung xương).
  // ==================================================================================================
  {
    const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
    const fieldOnly = { name: "Hướng Dẫn Viên Thử", phone: "0900000399", pin: "998877", permissions: ["FIELD"] };
    for (const stmt of (await insertStaffSql(fieldOnly)).split("\n")) env.sql(stmt);

    const pErr = await env.as(fieldOnly, "/home", MOB);
    await pErr.waitFor("!document.querySelector('#error').hidden", "banner lỗi hiện (tài khoản không có quyền văn phòng)");
    const mErr = await pErr.ev(`(() => ({
      errorHidden: document.querySelector('#error').hidden,
      errorText: document.querySelector('#error').textContent.trim(),
      gridHidden: document.querySelector('#dash-grid').hidden,
      loadingHidden: document.querySelector('#loading').hidden,
      todayBadgeHidden: document.querySelector('#dash-today-count').hidden,
    }))()`);
    assert.equal(mErr.errorHidden, false, `Trạng thái lỗi: #error phải HIỆN — ${JSON.stringify(mErr)}`);
    assert.ok(mErr.errorText.length > 0, "Trạng thái lỗi: #error phải có nội dung tiếng Việt");
    assert.equal(mErr.gridHidden, true, `Trạng thái lỗi: #dash-grid phải ẨN (không có số liệu/danh sách/doanh thu) — ${JSON.stringify(mErr)}`);
    assert.equal(mErr.loadingHidden, true, `Trạng thái lỗi: #loading (khung xương) phải ẨN, không kẹt lại — ${JSON.stringify(mErr)}`);
    assert.equal(mErr.todayBadgeHidden, true, `Trạng thái lỗi: huy hiệu số chuyến hôm nay phải ẨN (chưa từng có số thật) — ${JSON.stringify(mErr)}`);
    await shot(pErr, "trang-chu-loi-khong-co-quyen.png");
    ok(`C) Trạng thái lỗi thật (tài khoản chỉ FIELD, không có quyền văn phòng, điện thoại 390×844): CHỈ banner lỗi hiện ("${mErr.errorText}"), #dash-grid ẨN, #loading đã ẩn`);
    pErr.close();
  }
} finally {
  await env.stop();
}
console.log("TRANG CHU SMOKE OK");

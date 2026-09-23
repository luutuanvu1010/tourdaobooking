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
// 0) KIỂM TĨNH (không cần trình duyệt): public/home.html PHẢI có sẵn `hidden` trên #dash-today-count/#dash-stats/
//    #dash-layout NGAY TRONG MARKUP (trước khi JS chạy) — đây là lỗi Task 2 đã sửa (huy hiệu rỗng/khối rỗng lúc tải).
//    Phương án thay cho việc chặn mạng bằng CDP Fetch domain (brief mục C cho phép dùng cách này nếu chặn mạng phức tạp).
// ==================================================================================================
{
  const html = readFileSync("public/home.html", "utf8");
  const hasHiddenAttr = (idAttr) => new RegExp(`id="${idAttr}"[^>]*\\bhidden\\b`).test(html) || new RegExp(`\\bhidden\\b[^>]*id="${idAttr}"`).test(html);
  assert.ok(hasHiddenAttr("dash-today-count"), "public/home.html: #dash-today-count phải có sẵn `hidden` trong markup tĩnh (không hiện viên thuốc xanh rỗng lúc tải)");
  assert.ok(hasHiddenAttr("dash-stats"), "public/home.html: #dash-stats phải có sẵn `hidden` trong markup tĩnh");
  assert.ok(hasHiddenAttr("dash-layout"), "public/home.html: #dash-layout phải có sẵn `hidden` trong markup tĩnh");
  ok("Kiểm tĩnh: public/home.html có sẵn `hidden` trên #dash-today-count, #dash-stats, #dash-layout trong markup gốc (trước khi JS chạy)");
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
  // 3) Mở /home ở khổ máy tính (1040) và điện thoại (390) — bằng ADMIN. Đối chiếu MỖI SỐ trên màn hình THẬT
  //    với `data` (API vừa đọc) VÀ với giá trị literal đã tạo (mục B — không tái phát bug Task 1).
  // ==================================================================================================
  const measureHome = (p) =>
    p.ev(`(() => {
      const layout = document.querySelector('#dash-layout');
      const stats = [...document.querySelectorAll('#dash-stats .dash-stat')].map((el) => {
        const valueEl = el.querySelector('.dash-stat-value');
        const cs = getComputedStyle(valueEl);
        const oneLineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
        const actualHeight = valueEl.getBoundingClientRect().height;
        return {
          label: el.querySelector('.dash-stat-label').textContent.trim(),
          value: valueEl.textContent.trim(),
          sub: el.querySelector('.dash-stat-sub').textContent.trim(),
          // Kiểm gộp I-3: "500.000 ₫" từng xuống 2 dòng (ký hiệu tiền tệ rơi khỏi dòng số) ở lưới 2 cột khổ hẹp — đo CHIỀU CAO THẬT so với một dòng.
          valueOneLineHeight: oneLineHeight,
          valueActualHeight: actualHeight,
          valueWrapped: actualHeight > oneLineHeight + 1,
        };
      });
      const todayRows = [...document.querySelectorAll('#dash-today-list .dash-today-row')].map((row) => ({
        time: row.querySelector('.dash-today-time')?.textContent.trim() ?? null,
        place: row.querySelector('.dash-today-place')?.textContent.trim() ?? null,
        name: row.querySelector('.dash-today-name')?.textContent.trim() ?? null,
        sub: row.querySelector('.dash-today-main .muted')?.textContent.trim() ?? null,
        money: row.querySelector('.dash-today-money b')?.textContent.trim() ?? null,
        moneySub: row.querySelector('.dash-today-money .muted')?.textContent.trim() ?? null,
      }));
      return {
        layoutHidden: layout.hidden,
        layoutDisplay: getComputedStyle(layout).display,
        layoutOrder: [...layout.children].map((el) => el.id),
        todayBadge: document.querySelector('#dash-today-count').textContent.trim(),
        todayBadgeHidden: document.querySelector('#dash-today-count').hidden,
        todayRowCount: todayRows.length,
        todayRows,
        todayEmptyHidden: document.querySelector('#dash-today-empty').hidden,
        stats,
        revenueRange: document.querySelector('#dash-revenue-range').textContent.trim(),
        revenueValue: document.querySelector('.dash-revenue-value').textContent.trim(),
        revenueSub: document.querySelector('#dash-revenue-total .muted').textContent.trim(),
        errorHidden: document.querySelector('#error').hidden,
        loadingHidden: document.querySelector('#loading').hidden,
        scrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`);

  const assertHome = (m, label) => {
    assert.equal(m.layoutHidden, false, `${label}: #dash-layout phải HIỆN sau khi tải xong — ${JSON.stringify(m)}`);
    assert.equal(m.errorHidden, true, `${label}: #error phải ẨN (không lỗi) — ${JSON.stringify(m)}`);
    assert.equal(m.loadingHidden, true, `${label}: #loading (khung xương) phải ẨN sau khi tải xong — ${JSON.stringify(m)}`);
    assert.ok(m.scrollOverflow <= 1, `${label}: không được tràn ngang — lệch ${m.scrollOverflow}px`);

    // 3 ô số liệu — đối chiếu với API (nguồn sự thật vừa đọc), theo ĐÚNG thứ tự renderStats() dựng (money → draft → unassigned).
    assert.equal(m.stats.length, 3, `${label}: phải có đúng 3 ô số liệu — ${JSON.stringify(m.stats)}`);
    assert.equal(m.stats[0].label, "Còn thiếu tiền");
    assert.equal(m.stats[0].value, "12.345.000 ₫", `${label}: ô "Còn thiếu tiền" phải hiện 12.345.000 ₫ — ${JSON.stringify(m.stats[0])}`);
    assert.ok(m.stats[0].sub.includes("1 đơn"), `${label}: ô "Còn thiếu tiền" phải nói "1 đơn" — ${JSON.stringify(m.stats[0])}`);
    assert.equal(m.stats[1].label, "Đơn nháp chưa xác nhận");
    assert.equal(m.stats[1].value, "1", `${label}: ô "Đơn nháp chưa xác nhận" phải = 1 (chỉ R2, không đếm R1/R3 đã xác nhận) — ${JSON.stringify(m.stats[1])}`);
    assert.equal(m.stats[2].label, "Chưa có người phụ trách");
    assert.equal(m.stats[2].value, String(data.unassignedCount), `${label}: ô "Chưa có người phụ trách" phải khớp API (${data.unassignedCount}) — ${JSON.stringify(m.stats[2])}`);

    // Kiểm gộp I-3: số liệu ô ("dash-stat-value", vd "500.000 ₫") KHÔNG được xuống dòng — ký hiệu tiền tệ từng rơi xuống dòng riêng
    // ở lưới 2 cột khổ điện thoại hẹp (≤639px). So chiều cao thật với chiều cao MỘT dòng (line-height tính được).
    const wrappedStats = m.stats.filter((s) => s.valueWrapped);
    assert.deepEqual(wrappedStats, [], `${label}: số liệu ô (.dash-stat-value) bị xuống dòng (chiều cao thật vượt một dòng) — ${JSON.stringify(m.stats)}`);

    // Doanh thu
    assert.equal(m.revenueValue, "12.645.000 ₫", `${label}: doanh thu phải = 12.645.000 ₫ (R1 300.000 + R3 12.345.000) — ${JSON.stringify(m)}`);
    assert.ok(m.revenueSub.includes("2 đơn"), `${label}: doanh thu phải nói "2 đơn" — ${m.revenueSub}`);

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
    assert.equal(row.moneySub, "đã trả đủ", `${label}: R1 đã trả đủ (remainingAmount=0) phải hiện "đã trả đủ" — ${JSON.stringify(row)}`);
  };

  let p = await env.as(ACCOUNTS.admin, "/home", DESK);
  await p.waitFor("!document.querySelector('#dash-layout').hidden", "Trang chủ tải xong (máy tính)");
  let m = await measureHome(p);
  assertHome(m, "Trang chủ (máy tính, 1040×800)");
  assert.equal(m.layoutDisplay, "grid", `Trang chủ (máy tính): #dash-layout phải display:grid ở ≥900px — ${JSON.stringify(m)}`);
  assert.deepEqual(m.layoutOrder, ["dash-today", "dash-revenue"], `Trang chủ (máy tính): thứ tự DOM #dash-today trước #dash-revenue — ${JSON.stringify(m.layoutOrder)}`);
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
  await p.waitFor("!document.querySelector('#dash-layout').hidden", "Trang chủ tải xong (điện thoại)");
  m = await measureHome(p);
  assertHome(m, "Trang chủ (điện thoại, 390×844)");
  assert.equal(m.layoutDisplay, "block", `Trang chủ (điện thoại): #dash-layout phải display:block ở <900px — ${JSON.stringify(m)}`);
  assert.deepEqual(m.layoutOrder, ["dash-today", "dash-revenue"], `Trang chủ (điện thoại): thứ tự DOM #dash-today trước #dash-revenue KHÔNG được đảo — ${JSON.stringify(m.layoutOrder)}`);
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
  ok("Trang chủ (điện thoại, 390×844): 3 ô số liệu + danh sách + doanh thu đúng số, bố cục block, thứ tự DOM đúng, không tái phát bug giờ/nơi đón, không tràn ngang, axe không vi phạm critical/serious");

  // ==================================================================================================
  // C) Trạng thái LỖI thật — tài khoản KHÔNG có quyền văn phòng (chỉ FIELD) gọi /home: route "office" của
  //    GET /api/orders/dashboard trả 403 THẬT (src/shared/router.ts), không phải mô phỏng bằng cách chặn mạng.
  //    Khẳng định: CHỈ còn banner lỗi hiện; #dash-stats và #dash-layout đều ẨN; #loading đã ẩn (không kẹt ở khung xương).
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
      statsHidden: document.querySelector('#dash-stats').hidden,
      layoutHidden: document.querySelector('#dash-layout').hidden,
      loadingHidden: document.querySelector('#loading').hidden,
      todayBadgeHidden: document.querySelector('#dash-today-count').hidden,
    }))()`);
    assert.equal(mErr.errorHidden, false, `Trạng thái lỗi: #error phải HIỆN — ${JSON.stringify(mErr)}`);
    assert.ok(mErr.errorText.length > 0, "Trạng thái lỗi: #error phải có nội dung tiếng Việt");
    assert.equal(mErr.statsHidden, true, `Trạng thái lỗi: #dash-stats phải ẨN (không có số liệu) — ${JSON.stringify(mErr)}`);
    assert.equal(mErr.layoutHidden, true, `Trạng thái lỗi: #dash-layout phải ẨN (không có danh sách/doanh thu) — ${JSON.stringify(mErr)}`);
    assert.equal(mErr.loadingHidden, true, `Trạng thái lỗi: #loading (khung xương) phải ẨN, không kẹt lại — ${JSON.stringify(mErr)}`);
    assert.equal(mErr.todayBadgeHidden, true, `Trạng thái lỗi: huy hiệu số chuyến hôm nay phải ẨN (chưa từng có số thật) — ${JSON.stringify(mErr)}`);
    await shot(pErr, "trang-chu-loi-khong-co-quyen.png");
    ok(`C) Trạng thái lỗi thật (tài khoản chỉ FIELD, không có quyền văn phòng, điện thoại 390×844): CHỈ banner lỗi hiện ("${mErr.errorText}"), #dash-stats và #dash-layout đều ẨN, #loading đã ẩn`);
    pErr.close();
  }
} finally {
  await env.stop();
}
console.log("TRANG CHU SMOKE OK");

// Chụp ảnh các màn chính để so thị giác TRƯỚC / SAU đợt chỉnh thị giác toàn Nền tảng (2026-10-02). Không phải phép kiểm — chỉ ảnh để nhìn.
// Dữ liệu thử chèn qua API thật trên D1 tạm (đơn đã xác nhận hôm nay / ngày khác, đơn nháp, góp ý, danh mục lệch Sheet).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   NHAN=truoc CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-02-thi-giac/kich-ban/chup-man.mjs
// Ảnh: docs/evidence/2026-10-02-thi-giac/anh/<NHAN>/<khổ>-<trang>.png (OUT=… để đổi thư mục). CHI=<tên,tên> chỉ chụp vài trang.
// SO_SANH=1: chụp MÀN HÌNH ĐẦU (không cuộn) của các màn tiêu biểu ở ba bản — hien-tai, huong-b (= de-xuat/chung.css), huong-a (= chung.css + huong-a.css) —
//   lớp đề xuất được TIÊM sau khi trang tải (thẻ <style> cuối <head>, sau app.css và /api/giao-dien.css); mã sản phẩm không đổi. Ảnh: anh/so-sanh/<bản>/<khổ>-<trang>.png.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const SO_SANH = process.env.SO_SANH === "1";
const NHAN = process.env.NHAN ?? (SO_SANH ? "so-sanh" : "truoc");
const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-10-02-thi-giac/anh", NHAN);
const DE_XUAT = join(process.cwd(), "docs/evidence/2026-10-02-thi-giac/de-xuat");
const docCss = (ten) => readFileSync(join(DE_XUAT, ten), "utf8");
const BAN = SO_SANH
  ? { "hien-tai": "", "huong-b": docCss("chung.css"), "huong-a": docCss("chung.css") + "\n" + docCss("huong-a.css") }
  : { "": "" };
if (process.env.BAN_CHI) for (const k of Object.keys(BAN)) if (!process.env.BAN_CHI.split(",").includes(k)) delete BAN[k];
const CHI = process.env.CHI ? new Set(process.env.CHI.split(",")) : null;
const AXE = process.env.AXE_JS ? readFileSync(process.env.AXE_JS, "utf8") : null;
let axeLoi = 0;
mkdirSync(OUT, { recursive: true });

const KHO = {
  dt: { width: 390, height: 844, mobile: true },
  mt: { width: 1280, height: 800, mobile: false },
};

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
  const dichVu = (code, departDate, pickupTime, pickupPlace, adult = 2) => ({
    kind: "catalog",
    catalogCode: code,
    pax: { adult, child: 0, senior: 0, infant: 0 },
    catalogPriceSeen: { adult: code === "TD101" ? 1_350_000 : 800_000 },
    departDate, departTime: "", pickupTime, pickupPlace,
    checkinDate: "", checkinTime: "", checkinPlace: "", note: "",
  });
  const don = (customerName, customerPhone, services) => ({ customerName, customerPhone, customerEmail: "", customerNote: "", services, discount: 0, paymentNote: "" });
  const lapVaXacNhan = async (input) => {
    const t = await call(ACCOUNTS.admin, "POST", "/api/orders", input);
    assert.equal(t.status, 201, `tạo đơn: ${JSON.stringify(t.json)}`);
    const id = t.json.order.id;
    let x = await call(ACCOUNTS.admin, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
    if (x.status === 409 && x.json?.error?.code === "short_notice_required") {
      for (const { legId } of x.json.error.legs) await call(ACCOUNTS.admin, "POST", `/api/orders/${id}/legs/${legId}/short-notice`, { lyDo: "KHAC", ghiChu: null });
      x = await call(ACCOUNTS.admin, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
    }
    assert.equal(x.status, 200, `xác nhận đơn ${id}: ${JSON.stringify(x.json)}`);
    return x.json.order;
  };

  const d1 = await lapVaXacNhan(don("Chị Nguyễn Thu Hà", "0905123456", [dichVu("TD101", vnDate(0), "07:30", "Khách sạn Sheraton, 26 Trần Phú", 3), dichVu("TTB06", vnDate(0), "13:00", "Bến Cầu Đá", 2)]));
  await call(ACCOUNTS.admin, "POST", `/api/orders/${d1.id}/payments`, { soTien: 2_000_000, hinhThuc: "CASH", nguoiThu: "toi" });
  await lapVaXacNhan(don("Anh Trần Minh Quân", "0912345678", [dichVu("TD101", vnDate(0), "08:15", "Vinpearl Resort", 4)]));
  await lapVaXacNhan(don("Gia đình cô Lê Thị Mai", "0987654321", [dichVu("TD101", vnDate(1), "07:00", "Khách sạn Novotel", 5)]));
  await lapVaXacNhan(don("Công ty ABC (đoàn 12 khách)", "0281234567", [dichVu("TD101", vnDate(3), "06:45", "Bến tàu du lịch Nha Trang", 12)]));
  const nhap = await call(ACCOUNTS.admin, "POST", "/api/orders", don("Khách đang báo giá", "0934567890", [dichVu("TTB06", vnDate(2), "09:00", "Hòn Chồng", 2)]));
  assert.equal(nhap.status, 201);
  env.sql(`INSERT INTO catalog_override (code, hidden, prices_json, base_json, updated_by, updated_at) VALUES ('TD101', 0, '{"adult":1300000}', '{"adult":1200000}', NULL, '2026-01-02T00:00:00.000Z')`);
  for (const [acc, kind, title] of [[ACCOUNTS.salesA, "BUG", "Tổng tiền không cập nhật khi đổi số khách"], [ACCOUNTS.salesB, "IDEA", "Thêm bộ lọc theo ngày đón"]]) {
    const r = await call(acc, "POST", "/api/feedback", { kind, title, body: `${title} — nội dung thử.`, clientRequestId: crypto.randomUUID(), context: {} });
    assert.equal(r.status, 201, JSON.stringify(r.json));
  }
  ok(`Dữ liệu thử: 4 đơn đã xác nhận (2 hôm nay), 1 nháp, 2 góp ý, 1 dịch vụ lệch Sheet; đơn mẫu ${d1.id}`);

  const TRANG = [
    ["trang-chu", "/"], ["don-hang", "/orders"], ["chi-tiet-don", `/order?id=${d1.id}`], ["lap-don", "/order-form"], ["toi", "/account"],
    ["tai-khoan", "/staff"], ["danh-muc", "/catalog"], ["danh-ba", "/parties"], ["dia-diem", "/locations"], ["dieu-phoi", "/dieu-phoi"],
    ["xe", "/xe"], ["tro-giup", "/help"], ["gop-y", "/feedback"], ["giao-dien", "/giao-dien"], ["nhat-ky", "/audit"],
  ].filter(([ten]) => !CHI || CHI.has(ten));

  // Mỗi màn một thẻ mới (đăng nhập lại) + giới hạn thời gian: một màn treo (lần chạy đầu treo ở /help) không chặn các màn sau.
  const hanGio = (p, ms, viec) => Promise.race([p, sleep(ms).then(() => { throw new Error(`quá ${ms / 1000} giây: ${viec}`); })]);
  const chup = async (thuMuc, css, kho, vp, ten, duong, dangNhap = true) => {
    let p;
    try {
      p = dangNhap ? await hanGio(env.as(ACCOUNTS.chu, duong, vp), 30000, `mở ${duong}`) : await env.openPage(vp);
      if (!dangNhap) {
        await p.send("Network.clearBrowserCookies"); // các thẻ dùng CHUNG kho cookie: còn phiên thì /login tự chuyển về Trang chủ
        await p.send("Page.navigate", { url: env.base + duong });
        await p.waitFor("document.readyState === 'complete'", `${ten} tải xong`);
      }
      await sleep(2000);
      if (css) await p.ev(`(() => { const s = document.createElement('style'); s.id = 'de-xuat'; s.textContent = ${JSON.stringify(css)}; document.head.appendChild(s); return true; })()`);
      if (ten === "dang-nhap" && SO_SANH) {
        await p.ev(setInput("document.getElementById('phone')", "0905123456"));
        await p.ev(setInput("document.getElementById('pin')", "135790"));
        await p.ev("document.activeElement && document.activeElement.blur(), true");
      }
      await sleep(400);
      await hanGio(p.ev("window.scrollTo(0, 0), true"), 5000, "cuộn lên đầu");
      const anh = join(thuMuc, `${kho}-${ten}.png`);
      if (SO_SANH) {
        const r = await hanGio(p.send("Page.captureScreenshot", { format: "png" }), 30000, `chụp ${ten}`);
        (await import("node:fs")).writeFileSync(anh, Buffer.from(r.result.data, "base64"));
      } else await hanGio(p.shot(anh), 30000, `chụp ${ten}`);
      if (p.consoleErrors.length) console.log(`! lỗi JS ${kho}-${ten}: ${p.consoleErrors.slice(0, 3).join(" | ")}`);
      // AXE_JS=<…/axe.min.js>: quét axe sau khi chụp — chỉ in vi phạm mức serious / critical (cùng ngưỡng các kịch bản Chrome khác).
      if (AXE) {
        if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
        const v = await hanGio(p.ev("axe.run(document).then((r) => r.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical').map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.slice(0, 3).map((n) => n.target.join(' ')) })))"), 30000, `axe ${ten}`);
        axeLoi += v.length;
        console.log(v.length ? `✗ axe ${kho}-${ten}: ${JSON.stringify(v)}` : `  axe ${kho}-${ten}: 0 vi phạm serious/critical`);
      }
      console.log(`✓ ${thuMuc.split("/").pop()} ${kho}-${ten}`);
    } catch (e) {
      console.log(`✗ ${kho}-${ten}: ${e.message}`);
    } finally {
      try { p?.close(); } catch { /* đã đóng */ }
    }
  };
  const TIEU_BIEU = new Set(["trang-chu", "don-hang", "chi-tiet-don", "lap-don", "toi"]);
  for (const [ban, css] of Object.entries(BAN)) {
    const thuMuc = ban ? join(OUT, ban) : OUT;
    mkdirSync(thuMuc, { recursive: true });
    for (const [kho, vp] of Object.entries(KHO)) {
      if (!CHI || CHI.has("dang-nhap")) await chup(thuMuc, css, kho, vp, "dang-nhap", "/login", false);
      for (const [ten, duong] of TRANG) if (!SO_SANH || TIEU_BIEU.has(ten) || process.env.TAT_CA) await chup(thuMuc, css, kho, vp, ten, duong);
    }
  }
  if (AXE) console.log(axeLoi ? `✗ axe: ${axeLoi} vi phạm serious/critical` : "✓ axe: 0 vi phạm serious/critical ở mọi màn đã quét");
  if (AXE && axeLoi) process.exitCode = 1;
} finally {
  await env.stop();
}

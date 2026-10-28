// Đóng TNV-G1 (ADR-0089 đ5, đ9c, đ11, NT-V6, NT-V7; chủ dự án 28/10) — kiểm bằng Chrome thật. Chạy từ GỐC repo (worktree):
//   npm run build:web && AXE_JS=<…/axe.min.js> CHROME_BIN=<đường dẫn tuyệt đối tới docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh> node docs/evidence/2026-10-28-dong-tnv-g1/kich-ban/thu-truoc-smoke.mjs
// Phạm vi: (1–2) Trang chủ Kế toán 1040 + 390 — «Cần xem lại» có dòng thu trước đơn huỷ, khối «Thu trước của đơn huỷ» liệt kê từng việc, mã đơn mở trang đơn;
// (3) chuông Kế toán có tin «đã được duyệt hoàn thu trước … chờ ghi chi hoàn» (không số tiền); (4) trang đơn huỷ có «Đã trả lại khách trước khi huỷ», ghi chi
// hoàn xong hiện «Đã hoàn trả»; (5) Bán hàng không thấy dòng / khối. Mỗi bước: không tràn ngang, axe sạch, chụp ảnh ở ../anh/.
// Dữ liệu dựng bằng API TRƯỚC khi mở trang (ADR-0075: đăng nhập lại cùng tài khoản đá phiên trình duyệt). Đã quan sát kịch bản đỏ khi bỏ `taiThuTruoc` khỏi
// web/home.ts (sửa cố ý → build → chạy → đỏ ở bước 1 → hoàn nguyên) — ghi ở README bằng chứng cùng thư mục cha.
// Axe bỏ RIÊNG `#strips` (dải mảnh dưới thanh đầu trang; lần chạy 28/10 chỉ có dải nhắc bảo mật hai lớp `.mfa-strip`): `moderate region: #strips` là nợ CÓ SẴN, đã ghi ở đầu qr-smoke.mjs (27/10) — không do việc này; phần còn lại
// của trang vẫn phải sạch mọi mức. Mỗi lần chạy in ra lớp của các dải đang có để người sau thấy dải nào gây nợ.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, axeSach, docAxe, goiApi, ok, sleep, startEnv } from "../../2026-10-08-qr-thanh-toan/kich-ban/qr-chung.mjs";

const AXE = docAxe();
const OUT = join(process.cwd(), "docs/evidence/2026-10-28-dong-tnv-g1/anh");
mkdirSync(OUT, { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 900, mobile: false };

async function chupKhung(p, selector, ten) {
  await p.ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: 'start' }), true`);
  await sleep(900);
  const r = await p.ev(`(() => { const b = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: Math.max(0, b.left + scrollX - 12), y: Math.max(0, b.top + scrollY - 12), width: Math.min(innerWidth, b.width + 24), height: b.height + 24 }; })()`);
  const s = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...r, scale: 1 } });
  writeFileSync(join(OUT, `${ten}.png`), Buffer.from(s.result.data, "base64"));
}
const khongTran = async (p, nhan) => {
  const m = await p.ev("({ sw: document.documentElement.scrollWidth, iw: innerWidth })");
  assert.ok(m.sw <= m.iw + 1, `${nhan}: tràn ngang ${JSON.stringify(m)}`);
};
const docTrangChu = (p) => p.ev(`(() => ({
  dong: [...document.querySelectorAll('#dash-review-list .dash-review-row')].map((a) => ({ tieuDe: a.querySelector('.dash-review-title').textContent.trim(), href: a.getAttribute('href') })),
  khoiHien: !document.getElementById('dash-thu-truoc').hidden && document.getElementById('dash-thu-truoc').offsetParent !== null,
  muc: [...document.querySelectorAll('#dash-thu-truoc-list li')].map((li) => ({ chu: li.textContent.replace(/\\s+/g, ' ').trim(), href: li.querySelector('a')?.getAttribute('href') ?? null })),
}))()`);

const KHONG_DAI = "{ exclude: [['#strips']] }";
const env = await startEnv();
try {
  const { call, lapDon } = goiApi(env);
  // Đơn 1: khách trả dư 150.000, Kế toán trả lại phần dư TRƯỚC khi huỷ; khách huỷ; Quản trị duyệt hoàn 500.000 (chưa chi) ⇒ «chờ chi hoàn».
  const d1 = await lapDon("Khách Trả Dư", "0903 111 222");
  assert.equal((await call(ACCOUNTS.accounting, "POST", `/api/orders/${d1.id}/payments`, { soTien: 1500000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", maGiaoDich: "FTTNVG10001", soThucChuyen: 1500000 })).status, 201);
  const tra = await call(ACCOUNTS.accounting, "POST", "/api/ledger/refunds", { orderId: d1.id, soTien: 150000, hinhThuc: "CASH", nguoiTra: "cong_ty" });
  assert.equal(tra.status, 201, JSON.stringify(tra.json));
  assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${d1.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" })).status, 200);
  const dy = await call(ACCOUNTS.admin, "POST", `/api/orders/${d1.id}/coc/duyet`, { loai: "hoan", soTien: 500000, lyDo: "Khách xin lại một phần" });
  assert.equal(dy.status, 201, JSON.stringify(dy.json));
  // Đơn 2: Bán hàng tự thu 300.000 tiền mặt rồi khách huỷ ⇒ «còn người chưa nộp tiền».
  const d2 = await lapDon("Khách Giữ Tiền", "0903 333 444");
  assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${d2.id}/payments`, { soTien: 300000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
  assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${d2.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" })).status, 200);

  // ---- 1–2) Kế toán: Trang chủ 1040 rồi 390 ----
  for (const [kho, vp] of [["1040", DESK], ["390", MOB]]) {
    const p = await env.as(ACCOUNTS.accounting, "/", vp);
    await p.waitFor("!document.getElementById('dash-thu-truoc').hidden && document.querySelectorAll('#dash-review-list .dash-review-row').length > 0", `khối thu trước + Cần xem lại (${kho})`, 15000);
    const m = await docTrangChu(p);
    const tieuDe = m.dong.map((d) => d.tieuDe);
    assert.ok(tieuDe.includes("1 khoản thu trước đã duyệt, chờ chi"), JSON.stringify(m.dong));
    assert.ok(tieuDe.includes("1 đơn huỷ còn người chưa nộp tiền"), JSON.stringify(m.dong));
    for (const d of m.dong.filter((x) => /thu trước|chưa nộp/.test(x.tieuDe))) assert.equal(d.href, "#dash-thu-truoc", d.tieuDe);
    assert.equal(m.khoiHien, true);
    assert.deepEqual(m.muc.map((x) => x.href), [`/order?id=${d1.id}`, `/order?id=${d2.id}`], JSON.stringify(m.muc));
    assert.match(m.muc[0].chu, /chờ chi hoàn 500\.000 ₫ · duyệt ngày/);
    assert.match(m.muc[1].chu, /Sales Một chưa nộp 300\.000 ₫/);
    assert.ok(!/cọc/i.test(m.muc.map((x) => x.chu).join(" ") + tieuDe.join(" ")), "không chữ «cọc»");
    await khongTran(p, `Trang chủ Kế toán ${kho}`);
    console.log(`   (dải ở #strips: ${await p.ev("[...document.querySelectorAll('#strips > *')].map((e) => e.className).join(', ') || 'không có'")})`);
    await axeSach(p, AXE, `Trang chủ Kế toán ${kho}`, KHONG_DAI);
    await chupKhung(p, "#dash-review", `trang-chu-ke-toan-can-xem-lai-${kho}`);
    await chupKhung(p, "#dash-thu-truoc", `trang-chu-ke-toan-thu-truoc-${kho}`);
    // ---- 3) chuông (chỉ lượt 1040): tin duyệt hoàn, không số tiền ----
    if (kho === "1040") {
      await p.ev("document.querySelector('.bell').click(), true");
      await p.waitFor(`document.querySelectorAll('.ntf-panel .ntf-list-slot .ntf-item').length > 0 && !document.querySelector('.ntf-panel .ntf-list-slot').innerText.includes('Đang tải')`, "ngăn thông báo tải xong");
      const cau = await p.ev("[...document.querySelectorAll('.ntf-panel .ntf-item .ntf-txt')].map((x) => x.innerText)");
      const tin = cau.find((c) => c.includes("đã được duyệt hoàn thu trước"));
      assert.ok(tin, JSON.stringify(cau));
      assert.ok(tin.includes(d1.orderCode) && tin.includes("chờ ghi chi hoàn") && !/₫|500\.000/.test(tin), tin);
      await axeSach(p, AXE, "ngăn thông báo Kế toán", "document.querySelector('.ntf-panel')");
      await chupKhung(p, ".ntf-panel", "chuong-ke-toan-1040");
      ok("3) Kế toán 1040: chuông có tin «đã được duyệt hoàn thu trước … chờ ghi chi hoàn», không số tiền");
    }
    p.close();
    ok(`${kho === "1040" ? 1 : 2}) Kế toán ${kho}: «Cần xem lại» có 2 dòng thu trước trỏ xuống khối; khối liệt kê 2 việc, mã đơn mở trang đơn; không tràn; axe sạch`);
  }

  // ---- 4) Kế toán 1040: trang đơn huỷ — «Đã trả lại khách trước khi huỷ», ghi chi hoàn → «Đã hoàn trả» ----
  {
    const p = await env.as(ACCOUNTS.accounting, `/order?id=${d1.id}`, DESK);
    await p.waitFor("!!document.querySelector('[data-khoi=\"coc-don-huy\"]') && !!document.querySelector('[data-action=\"coc-chi\"]')", "khối tiền đơn huỷ + nút Ghi chi hoàn");
    const truoc = (await p.ev("document.querySelector('[data-khoi=\"coc-don-huy\"]').textContent")).replace(/\s+/g, "");
    assert.match(truoc, /Đãtrảlạikháchtrướckhihuỷ150\.000₫/, truoc);
    assert.match(truoc, /Côngtycòngiữ1\.350\.000₫/, truoc);
    await p.ev("document.querySelector('[data-action=\"coc-chi\"]').click(), true");
    await p.waitFor("!!document.querySelector('[data-khoi=\"xac-nhan-coc-chi\"]')", "hàng chi");
    await p.ev("document.querySelector('[data-khoi=\"xac-nhan-coc-chi\"] button[type=submit]').click(), true");
    await p.waitFor("/Đã hoàn trả/.test(document.querySelector('[data-khoi=\"coc-don-huy\"]').textContent) && !document.querySelector('[data-action=\"coc-chi\"]')", "đã chi");
    const sau = (await p.ev("document.querySelector('[data-khoi=\"coc-don-huy\"]').textContent")).replace(/\s+/g, "");
    assert.match(sau, /Đãhoàntrả500\.000₫/, sau);
    assert.match(sau, /Côngtycòngiữ850\.000₫/, sau);
    assert.ok(!/Đãhoàn500/.test(sau), "không còn chữ «Đã hoàn» trơn");
    await khongTran(p, "trang đơn huỷ 1040");
    await axeSach(p, AXE, "trang đơn huỷ 1040", "document.querySelector('[data-khoi=\"coc-don-huy\"]')");
    await chupKhung(p, "[data-khoi=\"coc-don-huy\"]", "thu-truoc-don-huy-ke-toan-1040");
    p.close();
    ok("4) Kế toán 1040: trang đơn huỷ có «Đã trả lại khách trước khi huỷ 150.000 ₫»; ghi chi hoàn 500.000 → «Đã hoàn trả 500.000 ₫», công ty còn giữ 850.000 ₫");
  }

  // ---- 5) Bán hàng 390: không dòng thu trước, không khối ----
  {
    const p = await env.as(ACCOUNTS.salesA, "/", MOB);
    await p.waitFor("!document.getElementById('dash-grid').hidden", "Trang chủ Bán hàng tải xong", 15000);
    await sleep(800);
    const m = await docTrangChu(p);
    assert.equal(m.khoiHien, false);
    assert.deepEqual(m.muc, []);
    assert.ok(!m.dong.some((d) => /thu trước|chưa nộp/.test(d.tieuDe)), JSON.stringify(m.dong));
    // Người kiểm độc lập 28/10 (T6): khối ẩn chưa đủ — lỗi 403 bị nuốt nên gỡ cổng `coKhoiThuTruoc` ở web/home.ts vẫn «ẩn». Khoá: trang Bán hàng KHÔNG gọi sổ thu trước.
    const goiSo = p.requests.map((r) => r.url).filter((u) => u.includes("/api/ledger/coc"));
    assert.deepEqual(goiSo, [], "Trang chủ Bán hàng không được gọi /api/ledger/coc*");
    await khongTran(p, "Trang chủ Bán hàng 390");
    p.close();
    ok("5) Bán hàng 390: không có dòng thu trước ở «Cần xem lại», khối «Thu trước của đơn huỷ» ẩn, không gọi /api/ledger/coc*");
  }
  console.log("THU TRUOC SMOKE OK (5 bước, có axe)");
} finally {
  await env.stop();
}

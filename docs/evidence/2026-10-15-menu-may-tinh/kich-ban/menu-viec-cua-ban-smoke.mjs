// Kịch bản Chrome (Việc 7b, 15/10) cho hai thay đổi: (1) dải chuyển nhanh giữa trang anh em `nav.dai-anh-em` ở 5 trang xe / giá; (2) khối "Việc của bạn" ở Trang chủ
// máy tính của bốn vai văn phòng (Bán hàng, Kế toán, Quản trị, Toàn quyền). Bằng chứng hành vi DUY NHẤT cho hai thứ này (bài đơn vị chỉ phủ luật thuần).
//  1) dải anh em: có ở đúng 5 trang, đầu <main>, nhãn/đường dẫn đúng nhóm, trang đang đứng sáng (aria-current), không tràn, không đè nội dung, ở 1440 + 390; ẩn khi chỉ ≤ 1 liên kết.
//  2) trạng thái KHÔNG việc (D1 trống): "Hôm nay không có việc chờ bạn." + nút "Tạo đơn" chỉ khi có quyền lập đơn (Kế toán không có).
//  3) thẻ theo vai sau khi gieo dữ liệu: chỉ thẻ có số > 0, tối đa 4, mỗi thẻ ĐÚNG MỘT nút, thứ tự độ gấp, nút san hô (btn-accent) chỉ ở hành động chốt, nhãn phạm vi, "Còn N việc nữa".
//  4) nguồn lỗi: thẻ "Cần xem lại" (chặn /api/catalog/admin) → "—" + "Thử lại" (không nút làm tiếp) → bỏ chặn, bấm Thử lại → hồi phục; thẻ "Đơn còn thiếu tiền" (chặn
//     /api/ledger/unpaid-summary) → "—" + "Thử lại" và dải lỗi chung cũng có "Thử lại" → bấm một nút → cả hai hồi phục.
//  5) axe (critical/serious) ở Trang chủ bốn vai.
// Số «điều chỉnh công nợ chờ duyệt» (thẻ của Kế toán/Quản trị/Toàn quyền) là SỐ GIẢ tiêm vào phản hồi trong trình duyệt (menu-lib.mjs tiemDieuChinh); các thẻ còn lại dùng dữ liệu thật gieo qua API.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> OUT=<thư mục ảnh> node docs/evidence/2026-10-15-menu-may-tinh/kich-ban/menu-viec-cua-ban-smoke.mjs
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, DO_VIEC, THEM, dungMoiTruong, gieoDuLieu, tiemDieuChinh } from "./menu-lib.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-10-15-menu-may-tinh";
if (!process.env.AXE_JS) throw new Error("Thiếu AXE_JS (đường dẫn axe.min.js): không chạy axe thì KHÔNG báo xanh.");
const AXE = readFileSync(process.env.AXE_JS, "utf8");
mkdirSync(join(OUT, "anh"), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DESK = { width: 1440, height: 900, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const ok = (m) => console.log(`✓ ${m}`);
const axe = async (p, label) => {
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev(`axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help, target: x.nodes.slice(0, 3).map((n) => n.target.join(' ')) })))`);
  const bad = v.filter((x) => x.impact === "critical" || x.impact === "serious");
  assert.deepEqual(bad, [], `axe (${label}): ${JSON.stringify(bad)}`);
};
const shot = async (p, ten) => p.shot(join(OUT, "anh", ten));

const { env, call } = await dungMoiTruong();
const TQ = THEM.toanQuyen;
try {
  // =========================== 1) Dải anh em ===========================
  const NHOM_XE = ["Xe", "Lịch xe bận", "Giấy tờ sắp hết hạn"];
  const NHOM_GIA = ["Bảng giá thuê xe", "Bảng kê chi phí xe"];
  const TRANG = [
    { path: "/xe", nhan: NHOM_XE, sang: "Xe", href: ["/xe", "/lich-xe-ban", "/giay-to-sap-het-han"] },
    { path: "/lich-xe-ban", nhan: NHOM_XE, sang: "Lịch xe bận", href: ["/xe", "/lich-xe-ban", "/giay-to-sap-het-han"] },
    { path: "/giay-to-sap-het-han", nhan: NHOM_XE, sang: "Giấy tờ sắp hết hạn", href: ["/xe", "/lich-xe-ban", "/giay-to-sap-het-han"] },
    { path: "/bang-gia-xe", nhan: NHOM_GIA, sang: "Bảng giá thuê xe", href: ["/bang-gia-xe", "/bang-ke-xe"] },
    { path: "/bang-ke-xe", nhan: NHOM_GIA, sang: "Bảng kê chi phí xe", href: ["/bang-gia-xe", "/bang-ke-xe"] },
  ];
  for (const [ten, vp] of [["1440", DESK], ["390", MOB]]) {
    for (const t of TRANG) {
      const p = await env.as(ACCOUNTS.admin, t.path, vp);
      try {
        await p.waitFor("!!document.querySelector('nav.dai-anh-em')", `dải anh em ở ${t.path} (${ten})`, 12000);
        await sleep(400);
        const m = await p.ev(`(() => {
          const n = document.querySelector('nav.dai-anh-em'); const main = document.querySelector('main'); const r = n.getBoundingClientRect(); const mr = main.getBoundingClientRect();
          const kế = n.nextElementSibling?.getBoundingClientRect();
          const h1 = document.querySelector('main h1');
          return { dauMain: main.firstElementChild === n, so: document.querySelectorAll('nav.dai-anh-em').length, nhan: [...n.querySelectorAll('a')].map((a) => a.textContent.trim()),
            href: [...n.querySelectorAll('a')].map((a) => a.getAttribute('href')), sang: [...n.querySelectorAll('a[aria-current="page"]')].map((a) => a.textContent.trim()), aria: n.getAttribute('aria-label'),
            tran: Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth), traiMain: Math.round(r.left - mr.left), phaiNgoai: Math.round(r.right - mr.right),
            dePhanKe: kế ? Math.round(r.bottom - kế.top) : null, cao: Math.round(r.height), trenH1: h1 ? Math.round(h1.getBoundingClientRect().top - r.bottom) : null,
            ellipsis: [...n.querySelectorAll('a')].some((a) => a.scrollWidth > a.clientWidth + 1) };
        })()`);
        assert.equal(m.so, 1, `${t.path} (${ten}): đúng một dải — ${JSON.stringify(m)}`);
        assert.equal(m.dauMain, true, `${t.path} (${ten}): dải là phần tử ĐẦU của <main> — ${JSON.stringify(m)}`);
        assert.deepEqual(m.nhan, t.nhan, `${t.path} (${ten}): nhãn dải đúng nhóm — ${JSON.stringify(m)}`);
        assert.deepEqual(m.href, t.href, `${t.path} (${ten}): đường dẫn — ${JSON.stringify(m)}`);
        assert.deepEqual(m.sang, [t.sang], `${t.path} (${ten}): đúng một liên kết sáng (aria-current) là trang đang đứng — ${JSON.stringify(m)}`);
        assert.equal(m.aria, "Các trang cùng nhóm", `${t.path} (${ten}): nhãn vùng điều hướng`);
        assert.ok(m.tran <= 1, `${t.path} (${ten}): trang không tràn ngang — ${JSON.stringify(m)}`);
        assert.ok(m.dePhanKe === null || m.dePhanKe <= 0, `${t.path} (${ten}): dải không đè lên phần tử kế tiếp (lấn ${m.dePhanKe}px) — ${JSON.stringify(m)}`);
        assert.ok(m.phaiNgoai <= 1 && m.traiMain >= -1, `${t.path} (${ten}): dải nằm trong bề ngang <main> — ${JSON.stringify(m)}`);
        assert.equal(m.ellipsis, false, `${t.path} (${ten}): không liên kết nào bị cắt chữ — ${JSON.stringify(m)}`);
        // Vòng tiêu điểm: Tab tới liên kết đầu rồi kiểm vòng KHÔNG nằm ngoài vùng cuộn (outline-offset âm — dải có overflow-x:auto)
        await p.ev(`document.querySelector('nav.dai-anh-em a').focus(); true`);
        const vong = await p.ev(`(() => { const a = document.querySelector('nav.dai-anh-em a'); const cs = getComputedStyle(a); return { offset: parseFloat(cs.outlineOffset), style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), focus: document.activeElement === a }; })()`);
        assert.ok(vong.focus && vong.style !== "none" && vong.width > 0, `${t.path} (${ten}): liên kết đầu nhận tiêu điểm và có vòng — ${JSON.stringify(vong)}`);
        assert.ok(vong.offset <= 0, `${t.path} (${ten}): vòng tiêu điểm lùi vào trong (outline-offset ≤ 0) để khỏi bị overflow-x cắt — ${JSON.stringify(vong)}`);
        await shot(p, `dai-anh-em-${t.path.slice(1)}-${ten}.png`);
      } finally {
        p.close();
      }
    }
  }
  ok("1) Dải anh em: 5 trang × (1440, 390) — đầu <main>, nhãn/đường dẫn đúng nhóm, trang đang đứng sáng, không tràn, không đè, vòng tiêu điểm lùi vào trong");
  {
    // Người chỉ thấy ≤ 1 trang trong nhóm thì không có dải (Bán hàng mở /xe: trang từ chối quyền, nhóm xe rỗng với Bán hàng).
    const p = await env.as(ACCOUNTS.salesA, "/xe", DESK);
    try {
      await p.waitFor("!document.querySelector('#error').hidden", "câu từ chối ở /xe", 12000);
      await sleep(500);
      assert.equal(await p.ev("document.querySelectorAll('nav.dai-anh-em').length"), 0, "Bán hàng ở /xe: không có dải (không thấy trang nào trong nhóm)");
    } finally {
      p.close();
    }
    ok("1b) Bán hàng mở /xe: không dải anh em (chỉ hiện khi ≥ 2 liên kết)");
  }

  // =========================== 2) Không có việc ===========================
  const VAI = [
    { khoa: "banHang", ten: "Bán hàng", acc: ACCOUNTS.salesA, tao: true },
    { khoa: "keToan", ten: "Kế toán", acc: ACCOUNTS.accounting, tao: false },
    { khoa: "quanTri", ten: "Quản trị", acc: ACCOUNTS.admin, tao: true },
    { khoa: "toanQuyen", ten: "Toàn quyền", acc: TQ, tao: true },
  ];
  const moTrangChu = async (acc, vp = DESK, truoc = null) => {
    const p = await env.openPage(vp);
    const c = await env.login(acc);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    if (truoc) await truoc(p);
    await p.send("Page.navigate", { url: env.base + "/" });
    await p.waitFor("document.readyState === 'complete'", "trang tải xong");
    await p.waitFor("!document.querySelector('#dash-grid').hidden", "Trang chủ tải xong", 15000);
    await p.waitFor("!document.querySelector('#dash-viec').hidden", "khối Việc của bạn dựng xong", 15000);
    await sleep(500);
    return p;
  };
  for (const v of VAI) {
    const p = await moTrangChu(v.acc);
    try {
      const m = await p.ev(DO_VIEC);
      assert.equal(m.shown, true, `${v.ten}: khối Việc của bạn hiện — ${JSON.stringify(m)}`);
      assert.equal(m.rong, "Hôm nay không có việc chờ bạn.", `${v.ten}: trạng thái không việc — ${JSON.stringify(m)}`);
      assert.deepEqual(m.the, [], `${v.ten}: không thẻ nào khi mọi số bằng 0 — ${JSON.stringify(m)}`);
      assert.deepEqual(m.rongNut, v.tao ? ["Tạo đơn"] : [], `${v.ten}: nút "Tạo đơn" ${v.tao ? "có" : "KHÔNG"} (theo quyền lập đơn) — ${JSON.stringify(m)}`);
      assert.equal(m.con, null, `${v.ten}: không dòng "Còn N việc nữa"`);
      await shot(p, `viec-rong-${v.khoa}-1440.png`);
    } finally {
      p.close();
    }
  }
  ok("2) Trạng thái không việc (D1 trống): 4 vai thấy 'Hôm nay không có việc chờ bạn.'; 'Tạo đơn' có ở Bán hàng/Quản trị/Toàn quyền, KHÔNG ở Kế toán");

  // =========================== 3) Thẻ theo vai ===========================
  const gieo = await gieoDuLieu(env, call);
  const soChuaPhuTrach = env.sql("SELECT COUNT(*) AS n FROM orders o WHERE o.status IN ('draft','confirmed') AND NOT EXISTS (SELECT 1 FROM dsp_assignment a WHERE a.order_id = o.id AND a.task_kind_code = 'HANDLE' AND a.valid_to_at IS NULL)")[0]?.n;
  ok(`3-gieo) Đã gieo: ${JSON.stringify(gieo)} (đơn chưa phụ trách theo SQL: ${soChuaPhuTrach})`);
  const dsKhoa = (m) => m.the.map((t) => t.khoa);
  const CHAN = {
    banHang: null, keToan: null, quanTri: null, toanQuyen: null,
  };
  const KET = {};
  for (const v of VAI) {
    const p = await moTrangChu(v.acc, DESK, (pg) => tiemDieuChinh(pg, 2));
    try {
      await sleep(600);
      const m = await p.ev(DO_VIEC);
      KET[v.khoa] = m;
      console.log(`   · ${v.ten}: ${JSON.stringify(m.the.map((t) => `${t.khoa}=${t.so} [${t.nut.map((n) => n.chu).join("|")}]`))} con="${m.con}" tom="${m.tom}"`);
      assert.equal(m.shown, true, `${v.ten}: khối hiện`);
      assert.equal(m.rong, null, `${v.ten}: có việc nên không hiện trạng thái trống`);
      assert.ok(m.the.length >= 1 && m.the.length <= 4, `${v.ten}: 1–4 thẻ — ${JSON.stringify(m.the)}`);
      assert.ok(m.the.every((t) => t.so !== "0" && t.so !== "" && t.soNut === 1 && t.nut.length === 1 && t.phamVi), `${v.ten}: mỗi thẻ số > 0, ĐÚNG MỘT nút, có nhãn phạm vi — ${JSON.stringify(m.the)}`);
      assert.equal(m.the[0].nut[0].chinh || m.the[0].nut[0].san, true, `${v.ten}: nút thẻ đầu nổi (btn-primary hoặc btn-accent) — ${JSON.stringify(m.the[0])}`);
      assert.ok(m.tom && /^Có \d+ việc chờ bạn — gấp nhất: /.test(m.tom), `${v.ten}: tóm tắt dưới lời chào — ${m.tom}`);
      await shot(p, `viec-the-${v.khoa}-1440.png`);
      await axe(p, `Trang chủ ${v.ten} 1440`);
    } finally {
      p.close();
    }
  }
  // Kỳ vọng theo bảng luật src/shared/viec-cua-ban.ts (độ gấp: xemLai 1, dieuChinh 2 (Quản trị 8), nhap 3, conThieu 4 (Quản trị 9), chuaPhuTrach 5, chuyenHomNay 6, gopY 10)
  // đối chiếu dữ liệu gieo: cần xem lại 1 (chỉ Quản trị trở lên), điều chỉnh 2 (giả), nháp 1, còn thiếu tiền 1 đơn, chưa phụ trách = SQL, chuyến hôm nay 1, góp ý mới.
  const k = KET;
  assert.deepEqual(dsKhoa(k.banHang), ["nhap", "conThieu", "chuaPhuTrach", "chuyenHomNay"], `Bán hàng — ${JSON.stringify(k.banHang.the)}`);
  assert.deepEqual(dsKhoa(k.keToan), ["dieuChinh", "nhap", "conThieu", "chuyenHomNay"], `Kế toán (không chuaPhuTrach: không lập đơn, không quản trị) — ${JSON.stringify(k.keToan.the)}`);
  assert.deepEqual(dsKhoa(k.quanTri), ["xemLai", "nhap", "chuaPhuTrach", "chuyenHomNay"], `Quản trị (dieuChinh/conThieu xếp sau theo đặc tả §9.3) — ${JSON.stringify(k.quanTri.the)}`);
  assert.deepEqual(dsKhoa(k.toanQuyen), ["xemLai", "nhap", "chuaPhuTrach", "chuyenHomNay"], `Toàn quyền — ${JSON.stringify(k.toanQuyen.the)}`);
  const so = (m, kh) => m.the.find((t) => t.khoa === kh)?.so;
  assert.equal(so(k.banHang, "nhap"), "1"); assert.equal(so(k.banHang, "conThieu"), "1"); assert.equal(so(k.banHang, "chuaPhuTrach"), String(soChuaPhuTrach)); assert.equal(so(k.banHang, "chuyenHomNay"), "1");
  assert.equal(so(k.keToan, "dieuChinh"), "2");
  assert.equal(so(k.quanTri, "xemLai"), "1");
  // Nút: chỉ hành động chốt mới san hô (btn-accent) — "Xác nhận đơn" của thẻ Đơn nháp khi người này sửa được đơn nháp của mình/của đơn.
  const nutThe = (m) => m.the.map((t) => `${t.khoa}:${t.nut[0].chu}${t.nut[0].san ? "*" : ""}`);
  assert.deepEqual(nutThe(k.keToan), ["dieuChinh:Duyệt", "nhap:Xem đơn nháp", "conThieu:Ghi thu", "chuyenHomNay:Xem chuyến"], `Kế toán: nút theo quyền, không san hô — ${JSON.stringify(nutThe(k.keToan))}`);
  assert.deepEqual(nutThe(k.quanTri), ["xemLai:Xem lại", "nhap:Xác nhận đơn*", "chuaPhuTrach:Phân công", "chuyenHomNay:Xem chuyến"], `Quản trị: nút san hô CHỈ ở thẻ thứ hai "Xác nhận đơn" — ${JSON.stringify(nutThe(k.quanTri))}`);
  assert.deepEqual(k.quanTri.the.map((t) => t.nut[0].chinh), [true, false, false, false], "Quản trị: btn-primary chỉ ở thẻ đầu");
  assert.equal(k.quanTri.con, "Còn 2 việc nữa: điều chỉnh công nợ chờ duyệt (2).", `Quản trị: việc bị dồn được nói thẳng — ${k.quanTri.con}`);
  assert.equal(k.keToan.con, null, "Kế toán: vừa đủ 4 thẻ, không dòng 'Còn'");
  assert.ok(/^Còn \d+ việc nữa: /.test(k.toanQuyen.con ?? ""), `Toàn quyền: dòng 'Còn N việc nữa' — ${k.toanQuyen.con}`);
  assert.equal(k.quanTri.tom, "Có 6 việc chờ bạn — gấp nhất: cần xem lại (1).", `Quản trị: tóm tắt — ${k.quanTri.tom}`);
  ok("3) Thẻ Việc của bạn theo vai: Bán hàng / Kế toán / Quản trị / Toàn quyền — số > 0, tối đa 4, một nút mỗi thẻ, san hô chỉ ở hành động chốt, 'Còn N việc nữa', axe sạch ở 1440");

  // =========================== 4) Nguồn lỗi → Thử lại → hồi phục ===========================
  {
    // (a) "Cần xem lại" (Quản trị): chặn /api/catalog/admin
    const p = await moTrangChu(ACCOUNTS.admin, DESK, (pg) => pg.send("Network.setBlockedURLs", { urls: ["*/api/catalog/admin*"] }));
    try {
      const m = await p.ev(DO_VIEC);
      const t = m.the.find((x) => x.khoa === "xemLai");
      assert.ok(t, `thẻ Cần xem lại vẫn hiện khi nguồn lỗi (không biến mất như thể không có việc) — ${JSON.stringify(m.the)}`);
      assert.equal(t.so, "—", `thẻ lỗi hiện "—" chứ không phải 0 — ${JSON.stringify(t)}`);
      assert.deepEqual(t.nut.map((n) => n.chu), ["Thử lại"], `thẻ lỗi chỉ có nút "Thử lại" (không nút làm tiếp) — ${JSON.stringify(t)}`);
      assert.equal(t.phu, "Chưa tải được số này");
      await shot(p, "viec-loi-xem-lai-1440.png");
      await p.send("Network.setBlockedURLs", { urls: [] });
      await p.ev(`[...document.querySelectorAll('.dash-viec-the[data-khoa="xemLai"] button')].find((b) => b.textContent.trim() === 'Thử lại').click(); true`);
      await p.waitFor(`document.querySelector('.dash-viec-the[data-khoa="xemLai"] .dash-viec-so')?.textContent.trim() === '1'`, "thẻ Cần xem lại hồi phục sau Thử lại", 12000);
      const sau = await p.ev(DO_VIEC);
      const t2 = sau.the.find((x) => x.khoa === "xemLai");
      assert.deepEqual(t2.nut.map((n) => n.chu), ["Xem lại"], `sau Thử lại: nút làm tiếp trở lại — ${JSON.stringify(t2)}`);
      assert.equal(sau.soThuLai, 0, `sau Thử lại: không còn nút Thử lại nào — ${JSON.stringify(sau)}`);
      await shot(p, "viec-loi-xem-lai-hoi-phuc-1440.png");
    } finally {
      p.close();
    }
    ok("4a) Thẻ 'Cần xem lại' lỗi nguồn: '—' + 'Thử lại' (không nút Xem lại) → bỏ chặn, bấm Thử lại → hồi phục số 1 + nút 'Xem lại'");
  }
  {
    // (b) "Đơn còn thiếu tiền" (Bán hàng): chặn /api/ledger/unpaid-summary → thẻ + dải lỗi chung
    const p = await moTrangChu(ACCOUNTS.salesA, DESK, (pg) => pg.send("Network.setBlockedURLs", { urls: ["*/api/ledger/unpaid-summary*"] }));
    try {
      const m = await p.ev(DO_VIEC);
      const t = m.the.find((x) => x.khoa === "conThieu");
      assert.ok(t, `thẻ Đơn còn thiếu tiền vẫn hiện khi nguồn lỗi — ${JSON.stringify(m.the)}`);
      assert.equal(t.so, "—");
      assert.deepEqual(t.nut.map((n) => n.chu), ["Thử lại"]);
      assert.equal(m.daiLoi, true, "dải lỗi chung của Trang chủ cũng hiện khi thiếu số 'Còn thiếu tiền'");
      console.log(`   · (ghi nhận) số nút "Thử lại" đang hiện cùng lúc khi unpaid lỗi: ${m.soThuLai}`);
      await shot(p, "viec-loi-unpaid-1440.png");
      await p.send("Network.setBlockedURLs", { urls: [] });
      await p.ev(`[...document.querySelectorAll('.dash-viec-the[data-khoa="conThieu"] button')].find((b) => b.textContent.trim() === 'Thử lại').click(); true`);
      await p.waitFor(`document.querySelector('.dash-viec-the[data-khoa="conThieu"] .dash-viec-so')?.textContent.trim() === '1'`, "thẻ Đơn còn thiếu tiền hồi phục", 12000);
      await sleep(400);
      const sau = await p.ev(DO_VIEC);
      assert.equal(sau.daiLoi, false, `sau Thử lại ở thẻ: dải lỗi chung tự gỡ — ${JSON.stringify(sau)}`);
      assert.equal(sau.soThuLai, 0);
    } finally {
      p.close();
    }
    ok("4b) Thẻ 'Đơn còn thiếu tiền' lỗi nguồn: '—' + 'Thử lại' cùng dải lỗi chung → bấm Thử lại ở thẻ → cả thẻ lẫn dải hồi phục");
  }
} finally {
  await env.stop();
}
console.log("MENU + VIEC CUA BAN SMOKE OK");

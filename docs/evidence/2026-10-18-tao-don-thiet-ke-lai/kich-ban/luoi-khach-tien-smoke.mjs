// Kịch bản Chrome — LƯỚI SỐ KHÁCH hai cột và DÒNG TIỀN của thẻ dịch vụ ở màn Tạo đơn (thiết kế lại 18/10/2026, Task 6; đặc tả
// docs/superpowers/specs/2026-10-18-tao-don-thiet-ke-lai/DAC-TA.md mục 3C + tiêu chí 5; đề bài PROMPT-CLAUDE-DESIGN.md mục C "Số khách", "Tiền").
// Kiểm ở hai khổ 390 và 1040 (tài khoản Bán hàng, rồi Thực tập — mở SAU CÙNG vì kho cookie chung; D1 tạm, không cần mạng ngoài, KHÔNG chụp ảnh):
//   1) TD101 (danh mục giả: người lớn 1.350.000, trẻ em 950.000 "Trẻ 5–10 tuổi", người cao tuổi 1.200.000 "Từ 60 tuổi", em bé 0 "Dưới 5 tuổi, miễn phí"):
//      bấm thật nút "+" → 2 NL, 1 TE, 1 EB; BỐN ô trong lưới HAI cột (hai cột trái khác nhau, hai hàng), mỗi ô: tên loại, dòng phụ "giá · điều kiện", bộ đếm
//      (nút 44px, ô số 48px); không tràn ngang;
//   2) dòng tiền: ba dòng (em bé 0 có dòng riêng) "2 người lớn × 1.350.000 = 2.700.000"… canh phải; có dòng "Thành tiền dịch vụ" 3.650.000 ₫; ô đơn giá ẩn,
//      liên kết "Sửa giá" hiện (≥ 44px);
//   3) "Sửa giá" mở ô đơn giá từng dòng (aria-expanded, chữ "Xong sửa giá", ô 16px); gõ 1.300.000 → dòng đó nhãn "Khác giá danh mục" + giá danh mục gạch ngang,
//      tổng 3.550.000 ₫; "Xong sửa giá" → dòng chữ nêu giá mới, vẫn nhãn + gạch ngang; trả về 1.350.000 → hết nhãn;
//   4) Phao chuối (theo nhóm 5): MỘT ô "Số khách", dòng phụ "1.500.000 / nhóm 5 khách", 7 khách → chữ "7 khách = 2 lượt" trong ô; một dòng tiền
//      "2 lượt × 1.500.000 = 3.000.000", KHÔNG có dòng "Thành tiền dịch vụ";
//   5) Motor nước (chỉ giá người lớn): MỘT ô "Người lớn", một dòng tiền, không dòng tổng;
//   6) TỔNG: thành tiền từng thẻ (dòng gập + thân thẻ), từng dòng tiền và tạm tính của form BẰNG đúng số máy chủ trả (GET /api/orders/:id) sau khi lưu nháp;
//   7) Thực tập (`retailOnly` — Đối tác cùng luật, kịch bản doi-tac-lap-don-smoke.mjs): KHÔNG có "Sửa giá", dòng tiền là chữ, ô đơn giá readOnly; nháp CŨ của chính
//      họ đang lệch giá danh mục (gieo thẳng vào D1 tạm) → ô đơn giá tự hiện và SỬA ĐƯỢC để đưa về đúng giá (hành vi cũ giữ nguyên), về đúng giá thì readOnly.
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, danh mục giả (TD101, TTB03, TTB06).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-18-tao-don-thiet-ke-lai/kich-ban/luoi-khach-tien-smoke.mjs
// Chưa kiểm axe-core. Mỗi bước chạy riêng; cuối cùng in "LUOI KHACH TIEN SMOKE OK" hoặc danh sách bước đỏ (thoát 1).
import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 900, mobile: false };
const KHO = [["390", MOB], ["1040", DESK]];
const env = await startEnv();
const loi = [];
async function buoc(id, ten, fn) {
  try {
    await fn();
    ok(`${id}) ${ten}`);
  } catch (e) {
    loi.push(`${id}) ${ten}: ${String(e?.message ?? e).split("\n")[0]}`);
    console.log(`✗ ${id}) ${ten}\n    ${String(e?.message ?? e).split("\n").slice(0, 8).join("\n    ")}`);
  }
}

const THE = "document.querySelectorAll('#services .svc')";
const the = (i) => `${THE}[${i}]`;
const vis = "const vis = (e) => !!e && e.getClientRects().length > 0;";
const nutDem = (i, nut, nhan) => `${the(i)}.querySelector('.counter-btn[aria-label=${JSON.stringify(`${nut} ${nhan}`)}]')`;
const suaGia = (i) => `${the(i)}.querySelector('[data-action="sua-gia"]')`;
const nf = new Intl.NumberFormat("vi-VN");
const so = (t) => Number(String(t ?? "").replace(/\D/g, "") || "NaN");

/** Lưới số khách của thẻ i: các ô ĐANG HIỆN (tên, dòng phụ, nút/ô của bộ đếm, toạ độ) + số cột / hàng phân biệt. */
const luoi = (i) => `(() => { ${vis} const c = ${the(i)};
  const o = [...c.querySelectorAll('.svc-luoi-khach .o-khach')].filter(vis);
  const r = (e) => e.getBoundingClientRect();
  return { n: o.length, ten: o.map((x) => x.querySelector('.guest-label')?.textContent ?? null), phu: o.map((x) => x.querySelector('.o-khach-phu')?.textContent ?? null),
    cot: new Set(o.map((x) => Math.round(r(x).left))).size, hang: new Set(o.map((x) => Math.round(r(x).top))).size,
    nut: [...c.querySelectorAll('.svc-luoi-khach .counter-btn')].filter(vis).map((b) => [Math.round(r(b).width), Math.round(r(b).height)]),
    oSo: [...c.querySelectorAll('.svc-luoi-khach .counter-field')].filter(vis).map((f) => [Math.round(r(f).width), getComputedStyle(f).fontSize]),
    nhom: [...c.querySelectorAll('.svc-luoi-khach .svc-group')].filter(vis).map((x) => x.textContent) }; })()`;

/** Khối tiền của thẻ i: dòng chữ đang hiện (+ nhãn lệch / giá gạch ngang của dòng đó), dòng "Thành tiền dịch vụ", ô đơn giá đang hiện, liên kết "Sửa giá". */
const tien = (i) => `(() => { ${vis} const c = ${the(i)}; const k = c.querySelector('.svc-tien');
  const phai = k ? k.getBoundingClientRect().right - parseFloat(getComputedStyle(k).paddingRight) : 0;
  const dong = [...c.querySelectorAll('.svc-tien .dong-tien')].filter(vis);
  const tong = c.querySelector('.svc-sum');
  const sg = c.querySelector('[data-action="sua-gia"]');
  return {
    dong: dong.map((d) => d.querySelector('.dong-tien-chu')?.textContent ?? null),
    lech: dong.map((d) => { const t = d.querySelector('.tag-price'); const g = d.querySelector('.price-old'); return vis(t) ? [t.textContent, g?.textContent ?? null, g ? getComputedStyle(g).textDecorationLine : null] : null; }),
    lechPhai: dong.map((d) => Math.round(phai - d.querySelector('.dong-tien-chu').getBoundingClientRect().right)),
    tongHien: vis(tong), tongChu: tong ? [tong.firstElementChild?.textContent ?? null, tong.querySelector('.svc-total-amount')?.textContent ?? null] : null,
    tongNgam: c.querySelector('.svc-total-amount')?.textContent ?? null, gon: c.querySelector('.svc-gon-tien')?.textContent ?? null,
    oGia: [...c.querySelectorAll('.price-field')].filter(vis).map((f) => ({ nhan: f.getAttribute('aria-label'), gt: f.value, ro: f.readOnly, w: Math.round(f.getBoundingClientRect().width), fs: getComputedStyle(f).fontSize })),
    sua: sg ? { hien: vis(sg), chu: sg.textContent.trim(), mo: sg.getAttribute('aria-expanded'), h: Math.round(sg.getBoundingClientRect().height) } : null,
    trong: vis(c.querySelector('.svc-tien .svc-empty')),
  }; })()`;
/** Dòng tiền đang SỬA (ô đơn giá hiện) của thẻ i: nhãn số lượng, thành tiền, nhãn lệch + giá gạch ngang. */
const dongSua = (i) => `(() => { ${vis} return [...${the(i)}.querySelectorAll('.line')].filter(vis).map((l) => ({
  sl: l.querySelector('.line-qty')?.textContent ?? null, tt: l.querySelector('.line-total')?.textContent ?? null,
  lech: vis(l.querySelector('.tag-price')) ? [l.querySelector('.tag-price').textContent, l.querySelector('.price-old')?.textContent ?? null] : null })); })()`;

try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  /** Chạm thật: cảm ứng ở 390, chuột ở 1040 (vào giữa phần tử, sau khi cuộn nó vào giữa khung). */
  const cham = async (p, mobile, sel) => {
    await p.ev(`(${sel}).scrollIntoView({ block: 'center' }); true`);
    await sleep(120);
    const { x, y } = await p.ev(`(() => { const r = (${sel}).getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
    if (mobile) {
      await p.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      await p.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await p.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
      await p.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    }
    await sleep(200);
  };
  const chon = async (p, tim, soThe) => {
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(setInput("document.getElementById('catalog-q')", tim));
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", `lọc ${tim}`);
    await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await p.waitFor(`${THE}.length === ${soThe}`, `thẻ thứ ${soThe}`);
    await sleep(250);
  };
  const giaTriDem = (p, i, nhan) => p.ev(`${the(i)}.querySelector('.counter-field[aria-label=${JSON.stringify(nhan)}]').value`);
  const NGAY = vnDate(3);

  for (const [kho, vp] of KHO) {
    const mobile = vp.mobile;
    const p = await env.as(ACCOUNTS.salesA, "/order-form", vp);
    await p.waitFor("!!document.getElementById('catalog-q') && !document.getElementById('catalog-q').disabled", "ô tìm danh mục sẵn sàng", 15000);
    await sleep(600);
    await p.ev(setInput("document.getElementById('orderDate')", NGAY));

    await buoc(`${kho}-1`, "TD101: bốn ô trong lưới hai cột (tên, giá · điều kiện, bộ đếm 44px / 48px), bấm thật '+' → 2 NL, 1 TE, 1 EB", async () => {
      await chon(p, "TD101", 1);
      await cham(p, mobile, nutDem(0, "Tăng", "Người lớn"));
      await cham(p, mobile, nutDem(0, "Tăng", "Trẻ em"));
      await cham(p, mobile, nutDem(0, "Tăng", "Em bé"));
      assert.deepEqual([await giaTriDem(p, 0, "Người lớn"), await giaTriDem(p, 0, "Trẻ em"), await giaTriDem(p, 0, "Người cao tuổi"), await giaTriDem(p, 0, "Em bé")], ["2", "1", "0", "1"], "chạm thật nút '+' đổi đúng bộ đếm");
      const g = await p.ev(luoi(0));
      assert.equal(g.n, 4, `bốn ô (bốn loại khách có giá): ${JSON.stringify(g)}`);
      assert.deepEqual(g.ten, ["Người lớn", "Trẻ em", "Người cao tuổi", "Em bé"]);
      assert.deepEqual(g.phu, ["1.350.000", "950.000 · Trẻ 5–10 tuổi", "1.200.000 · Từ 60 tuổi", "0 · Dưới 5 tuổi, miễn phí"], "dòng phụ: giá · điều kiện (điều kiện lấy từ danh mục)");
      assert.equal(g.cot, 2, `lưới HAI cột: ${JSON.stringify(g)}`);
      assert.equal(g.hang, 2, `bốn ô xếp hai hàng: ${JSON.stringify(g)}`);
      assert.equal(g.nut.length, 8);
      for (const [w, h] of g.nut) assert.ok(w >= 44 && h >= 44, `nút bộ đếm ≥ 44px: ${JSON.stringify(g.nut)}`);
      for (const [w, fs] of g.oSo) assert.ok(Math.abs(w - 48) <= 1 && fs === "16px", `ô số 48px, chữ 16px: ${JSON.stringify(g.oSo)}`);
      assert.deepEqual(g.nhom, [], "dịch vụ theo người không có chữ số lượt");
      const tran = await p.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth");
      assert.ok(tran <= 1, `không tràn ngang (lệch ${tran}px)`);
    });

    await buoc(`${kho}-2`, "TD101: ba dòng tiền canh phải (em bé 0 có dòng riêng), dòng 'Thành tiền dịch vụ', ô đơn giá ẩn sau 'Sửa giá'", async () => {
      const t = await p.ev(tien(0));
      assert.deepEqual(t.dong, ["2 người lớn × 1.350.000 = 2.700.000", "1 trẻ em × 950.000 = 950.000", "1 em bé × 0 = 0"], JSON.stringify(t));
      assert.deepEqual(t.lech, [null, null, null], "không dòng nào lệch giá danh mục");
      for (const d of t.lechPhai) assert.ok(Math.abs(d) <= 2, `dòng tiền canh phải (lệch mép phải ${JSON.stringify(t.lechPhai)}px)`);
      assert.equal(t.tongHien, true, "có từ hai dòng → có dòng Thành tiền dịch vụ");
      assert.deepEqual(t.tongChu, ["Thành tiền dịch vụ", "3.650.000 ₫"]);
      assert.equal(t.gon, "3.650.000 ₫", "thành tiền trên dòng gập cùng số");
      assert.deepEqual(t.oGia, [], "chưa bấm Sửa giá: không ô đơn giá nào hiện");
      assert.ok(t.sua?.hien && t.sua.chu === "Sửa giá" && t.sua.mo === "false" && t.sua.h >= 44, `liên kết Sửa giá hiện, ≥ 44px: ${JSON.stringify(t.sua)}`);
      assert.equal(t.trong, false, "có khách thì không còn câu 'Nhập số khách để xem dòng tiền.'");
    });

    await buoc(`${kho}-3`, "Sửa giá: mở ô đơn giá từng dòng; dòng đã sửa có 'Khác giá danh mục' + giá danh mục gạch ngang; Xong sửa giá → dòng chữ giữ nhãn", async () => {
      await cham(p, mobile, suaGia(0));
      let t = await p.ev(tien(0));
      assert.ok(t.sua.mo === "true" && t.sua.chu === "Xong sửa giá", `Sửa giá mở: ${JSON.stringify(t.sua)}`);
      assert.deepEqual(t.oGia.map((o) => [o.nhan, o.gt, o.ro]), [["Đơn giá người lớn", "1.350.000", false], ["Đơn giá trẻ em", "950.000", false], ["Đơn giá em bé", "0", false]], JSON.stringify(t.oGia));
      for (const o of t.oGia) assert.ok(o.fs === "16px" && Math.abs(o.w - 112) <= 1, `ô đơn giá 112px, chữ 16px: ${JSON.stringify(o)}`);
      assert.deepEqual(t.dong, [], "đang sửa: dòng chữ nhường chỗ cho ô");
      assert.deepEqual((await p.ev(dongSua(0))).map((d) => d.sl), ["2 người lớn ×", "1 trẻ em ×", "1 em bé ×"]);
      await p.ev(setInput(`${the(0)}.querySelector('.price-field[aria-label="Đơn giá người lớn"]')`, "1300000"));
      await sleep(150);
      const s = await p.ev(dongSua(0));
      assert.deepEqual(s[0], { sl: "2 người lớn ×", tt: "2.600.000", lech: ["Khác giá danh mục", "1.350.000"] }, JSON.stringify(s));
      assert.deepEqual([s[1].lech, s[2].lech], [null, null], "dòng không sửa không có nhãn");
      t = await p.ev(tien(0));
      assert.deepEqual(t.tongChu, ["Thành tiền dịch vụ", "3.550.000 ₫"]);
      await cham(p, mobile, suaGia(0));
      t = await p.ev(tien(0));
      assert.ok(t.sua.mo === "false" && t.sua.chu === "Sửa giá", `đóng ô đơn giá: ${JSON.stringify(t.sua)}`);
      assert.deepEqual(t.oGia, []);
      assert.deepEqual(t.dong, ["2 người lớn × 1.300.000 = 2.600.000", "1 trẻ em × 950.000 = 950.000", "1 em bé × 0 = 0"]);
      assert.deepEqual(t.lech, [["Khác giá danh mục", "1.350.000", "line-through"], null, null], `dòng đã sửa giữ nhãn + giá danh mục gạch ngang: ${JSON.stringify(t.lech)}`);
      // trả về giá danh mục (mẫu tổng ở bước 6 dùng giá danh mục)
      await cham(p, mobile, suaGia(0));
      await p.ev(setInput(`${the(0)}.querySelector('.price-field[aria-label="Đơn giá người lớn"]')`, "1350000"));
      await sleep(150);
      await cham(p, mobile, suaGia(0));
      t = await p.ev(tien(0));
      assert.deepEqual(t.lech, [null, null, null], "về đúng giá danh mục: hết nhãn");
      assert.deepEqual(t.tongChu, ["Thành tiền dịch vụ", "3.650.000 ₫"]);
    });

    await buoc(`${kho}-4`, "Phao chuối (nhóm 5): MỘT ô 'Số khách', 7 khách → '7 khách = 2 lượt'; một dòng tiền theo lượt, không dòng Thành tiền dịch vụ", async () => {
      await chon(p, "phao", 2);
      let g = await p.ev(luoi(1));
      assert.deepEqual([g.n, g.ten, g.phu], [1, ["Số khách"], ["1.500.000 / nhóm 5 khách"]], JSON.stringify(g));
      for (let k = 0; k < 6; k++) await p.ev(`(${nutDem(1, "Tăng", "Số khách")}).click(); true`);
      await sleep(150);
      g = await p.ev(luoi(1));
      assert.deepEqual(g.nhom, ["7 khách = 2 lượt"], `chữ số lượt trong ô Số khách: ${JSON.stringify(g)}`);
      const t = await p.ev(tien(1));
      assert.deepEqual(t.dong, ["2 lượt × 1.500.000 = 3.000.000"], JSON.stringify(t));
      assert.equal(t.tongHien, false, "một dòng → không có dòng Thành tiền dịch vụ");
      assert.equal(t.tongNgam, "3.000.000 ₫", "thành tiền của thẻ vẫn được cập nhật (dòng gập, tạm tính)");
      assert.ok(t.sua?.hien, "Bán hàng có Sửa giá");
    });

    await buoc(`${kho}-5`, "Motor nước (chỉ giá người lớn): MỘT ô 'Người lớn', một dòng tiền, không dòng tổng", async () => {
      await chon(p, "TTB06", 3);
      await p.ev(`(${nutDem(2, "Tăng", "Người lớn")}).click(); true`);
      await sleep(150);
      const g = await p.ev(luoi(2));
      assert.deepEqual([g.n, g.ten, g.phu], [1, ["Người lớn"], ["800.000"]], JSON.stringify(g));
      const t = await p.ev(tien(2));
      assert.deepEqual(t.dong, ["2 người lớn × 800.000 = 1.600.000"]);
      assert.equal(t.tongHien, false);
    });

    await buoc(`${kho}-6`, "tổng: thành tiền từng thẻ (thân + dòng gập), từng dòng tiền, tạm tính = số máy chủ trả sau khi lưu nháp", async () => {
      const truoc = [];
      for (let i = 0; i < 3; i++) {
        const t = await p.ev(`(() => { const c = ${the(i)}; return { the: c.querySelector('.svc-total-amount').textContent, gon: c.querySelector('.svc-gon-tien').textContent,
          dong: [...c.querySelectorAll('.svc-tien .dong-tien')].filter((d) => !d.hidden).map((d) => d.querySelector('.dong-tien-chu').textContent) }; })()`);
        truoc.push(t);
      }
      const tamTinh = await p.ev("document.getElementById('sum-subtotal').textContent");
      await p.ev(setInput("document.getElementById('customerName')", `Khách Lưới ${kho}`));
      await p.ev(setInput("document.getElementById('customerPhone')", kho === "390" ? "0912345690" : "0912345691"));
      await sleep(300);
      await p.ev("document.getElementById('save').click(); true");
      await p.waitFor("location.pathname === '/order' && !!new URLSearchParams(location.search).get('id')", "lưu xong → trang đơn", 15000);
      const id = await p.ev("new URLSearchParams(location.search).get('id')");
      const r = await call(ACCOUNTS.salesA, "GET", `/api/orders/${id}`);
      assert.equal(r.status, 200, JSON.stringify(r.json));
      const o = r.json.order;
      assert.equal(o.status, "draft", "đơn vừa lưu là nháp");
      const NHAN = { adult: "người lớn", child: "trẻ em", senior: "người cao tuổi", infant: "em bé" };
      const bang = [];
      assert.equal(o.services.length, 3);
      // Trang đơn vừa mở hiện "Tổng dịch vụ" của từng dịch vụ từ dữ liệu máy chủ — đối chứng thêm với thẻ ở form.
      await p.waitFor("document.querySelectorAll('#order .svc-view .svc-total-amount').length === 3", "trang đơn hiện ba dịch vụ", 15000);
      const trangDon = await p.ev("[...document.querySelectorAll('#order .svc-view .svc-total-amount')].map((e) => e.textContent)");
      o.services.forEach((sv, i) => {
        const tongMay = sv.items.reduce((s, it) => s + it.lineTotal, 0); // cộng THÀNH TIỀN máy chủ đã tính của từng dòng (DTO dịch vụ không có trường tổng riêng)
        assert.equal(so(truoc[i].the), tongMay, `thẻ ${i + 1} (thân thẻ) ${truoc[i].the} ≠ máy chủ ${tongMay}`);
        assert.equal(so(truoc[i].gon), tongMay, `thẻ ${i + 1} (dòng gập) ${truoc[i].gon} ≠ máy chủ ${tongMay}`);
        assert.equal(truoc[i].the, trangDon[i], `thẻ ${i + 1}: form ${truoc[i].the} ≠ trang đơn ${trangDon[i]}`);
        const nhom = /^per\d+Pax$/.test(sv.unit);
        // Trình bày lại SỐ MÁY CHỦ TRẢ (số lượng, đơn giá, thành tiền của từng dòng) đúng khuôn chữ của thẻ rồi so — không tự tính tiền.
        const may = sv.items.map((it) => `${it.quantity} ${nhom ? "lượt" : NHAN[it.paxCode]} × ${nf.format(it.unitPrice)} = ${nf.format(it.lineTotal)}`);
        assert.deepEqual(truoc[i].dong, may, `dòng tiền thẻ ${i + 1} khớp từng dòng máy chủ`);
        bang.push(`${sv.name}: ${tongMay}`);
      });
      assert.equal(so(tamTinh), o.subtotal, `tạm tính của form ${tamTinh} ≠ máy chủ ${o.subtotal}`);
      assert.equal(o.services.reduce((s, x) => s + x.items.reduce((t, it) => t + it.lineTotal, 0), 0), o.subtotal, "tạm tính máy chủ = tổng thành tiền các dòng");
      console.log(`    ${kho}: máy chủ ${bang.join(" · ")} · tạm tính ${o.subtotal} — form: ${truoc.map((t) => t.the).join(" + ")} = ${tamTinh}`);
    });
    assert.deepEqual(p.consoleErrors.filter((e) => !/favicon/.test(e)), [], `lỗi console ${kho}: ${p.consoleErrors}`);
    p.close();
  }

  // ---- Thực tập (`retailOnly`): mở SAU CÙNG ----
  const INTERN = { name: "Thực Tập Lưới Khách", phone: "0900000281", pin: "246881", permissions: ["INTERN"] };
  {
    const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
    for (const stmt of (await insertStaffSql(INTERN)).split("\n")) env.sql(stmt);
  }
  // Nháp CŨ của Thực tập đang lệch giá danh mục: lập bằng API đúng giá, rồi sửa thẳng D1 tạm (đơn còn nháp — trigger 0007 / 0081 cho phép) thành 1.300.000.
  const lap = await call(INTERN, "POST", "/api/orders", {
    customerName: "Khách Thực Tập Lệch Giá", customerPhone: "0912345692", customerEmail: "", customerNote: "", discount: 0, paymentNote: "",
    services: [{ kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, unitPrices: { adult: 1350000 }, catalogPriceSeen: { adult: 1350000 }, departDate: NGAY, departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", legs: [] }],
  });
  assert.equal(lap.status, 201, `Thực tập lập nháp: ${JSON.stringify(lap.json)}`);
  const nhapLech = lap.json.order.id;
  env.sql([
    `UPDATE order_item SET unit_price = 1300000, line_total = 2600000 WHERE order_id = '${nhapLech}'`,
    `UPDATE orders SET subtotal = 2600000, total = 2600000 - discount, remaining_amount = 2600000 - discount - deposit_amount WHERE id = '${nhapLech}'`,
  ].join(";\n"));

  for (const [kho, vp] of KHO) {
    const mobile = vp.mobile;
    await buoc(`${kho}-7`, "Thực tập: không có 'Sửa giá', dòng tiền là chữ, ô đơn giá readOnly; nháp cũ lệch giá → ô tự hiện, sửa được về đúng giá", async () => {
      let p = await env.as(INTERN, "/order-form", vp);
      await p.waitFor("!!document.getElementById('catalog-q') && !document.getElementById('catalog-q').disabled", "ô tìm danh mục sẵn sàng", 15000);
      await sleep(600);
      await chon(p, "TD101", 1);
      await cham(p, mobile, nutDem(0, "Tăng", "Người lớn"));
      let t = await p.ev(tien(0));
      assert.equal(t.sua === null || t.sua.hien === false, true, `Thực tập không có Sửa giá: ${JSON.stringify(t.sua)}`);
      assert.deepEqual(t.dong, ["2 người lớn × 1.350.000 = 2.700.000"]);
      assert.deepEqual(t.oGia, [], "không ô đơn giá nào hiện");
      assert.equal(await p.ev(`${the(0)}.querySelector('.price-field[aria-label="Đơn giá người lớn"]').readOnly`), true, "ô đơn giá (ẩn) vẫn readOnly");
      assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
      p.close();

      p = await env.as(INTERN, `/order-form?id=${nhapLech}`, vp);
      await p.waitFor("document.querySelectorAll('#services .svc').length === 1", "nháp cũ dựng xong", 15000);
      await sleep(600);
      if ((await p.ev(`${the(0)}.querySelector('.svc-mo').getAttribute('aria-expanded')`)) === "false") await cham(p, mobile, `${the(0)}.querySelector('.svc-mo')`);
      t = await p.ev(tien(0));
      assert.equal(t.sua === null || t.sua.hien === false, true, `vẫn không có Sửa giá: ${JSON.stringify(t.sua)}`);
      assert.deepEqual(t.oGia.map((o) => [o.nhan, o.gt, o.ro]), [["Đơn giá người lớn", "1.300.000", false]], `dòng lệch giá: ô đơn giá tự hiện và sửa được (hành vi cũ): ${JSON.stringify(t)}`);
      assert.deepEqual((await p.ev(dongSua(0)))[0]?.lech, ["Khác giá danh mục", "1.350.000"]);
      await p.ev(setInput(`${the(0)}.querySelector('.price-field[aria-label="Đơn giá người lớn"]')`, "1350000"));
      await sleep(150);
      await p.ev("document.activeElement?.blur(); true");
      await sleep(100);
      assert.equal(await p.ev(`${the(0)}.querySelector('.price-field[aria-label="Đơn giá người lớn"]').readOnly`), true, "về đúng giá danh mục → ô readOnly lại");
      assert.equal((await p.ev(dongSua(0)))[0]?.lech ?? null, null, "hết nhãn Khác giá danh mục");
      assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
      p.close();
    });
  }
} finally {
  await env.stop();
}
if (loi.length) {
  console.log(`LUOI KHACH TIEN SMOKE HONG (${loi.length} bước đỏ):\n  - ${loi.join("\n  - ")}`);
  process.exit(1);
}
console.log("LUOI KHACH TIEN SMOKE OK");

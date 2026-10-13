// Kiểm ĐIỂM DỪNG BÀN PHÍM BỊ CHE (WCAG 2.2 mục 2.4.11 Focus Not Obscured) trên màn Tạo đơn bốn bước — sau kiểm độc lập 14/10/2026: thanh tiến độ dính (và thanh trên cùng ở điện thoại)
// không được che ô đang có focus. Cách đo: bấm Tab XUÔI rồi Shift+Tab NGƯỢC từ cuối form bằng phím thật (CDP Input.dispatchKeyEvent); sau mỗi lần dừng lấy điểm giữa ô bằng elementFromPoint,
// bị che nếu phần tử trên cùng ở điểm đó không phải chính ô (hay con / cha của nó) hoặc ô nằm ngoài khung nhìn. Khẳng định 0 điểm dừng bị che. Ngoài ra: bấm từng chấm bước thì tiêu đề bước KHÔNG nằm dưới thanh.
// Bốn vai (Bán hàng, Thực tập, Đối tác, Toàn quyền) × hai khổ (390, 1040) × hai trạng thái (mặc định sau khi chọn dịch vụ; mở hết mọi khối gập). Kết quả: $OUT/diem-dung-bi-che.json.
// Chạy từ GỐC repo (worktree), sau `npm run build:web`, không cần mạng ngoài:
//   OUT=<thư mục> node docs/evidence/2026-10-14-tao-don-bon-buoc/kich-ban/diem-dung-bi-che.mjs      (CHI_VAI=ban-hang để thử nhanh)
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-10-14-tao-don-bon-buoc/sau";
mkdirSync(OUT, { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 800, mobile: false };
const KHO = [["390", MOB], ["1040", DESK]];
const TOI_DA = 120; // chặn vòng lặp vô hạn nếu focus không quay lại

const env = await startEnv();
const ketQua = [];
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const dt = await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Đối Tác Điểm Dừng", phone: "0900000281", roles: ["COLLABORATOR"] });
  assert.equal(dt.status, 201, JSON.stringify(dt.json));
  const PARTNER = { name: "Đối Tác Điểm Dừng", phone: "0900000281", pin: dt.json.pin };
  const INTERN = { name: "Thực Tập Điểm Dừng", phone: "0900000282", pin: "246882", permissions: ["INTERN"] };
  const { insertStaffSql } = await import(pathToFileURL(resolve("scripts", "staff-lib.mjs")).href);
  for (const stmt of (await insertStaffSql(INTERN)).split("\n")) env.sql(stmt);
  const VAI = [["ban-hang", ACCOUNTS.salesA], ["thuc-tap", INTERN], ["doi-tac", PARTNER], ["toan-quyen", ACCOUNTS.chu]];

  const phim = async (p, shift) => {
    const mod = shift ? 8 : 0;
    if (shift) await p.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Shift", code: "ShiftLeft", windowsVirtualKeyCode: 16, modifiers: 8 });
    await p.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: mod });
    await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: mod });
    if (shift) await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Shift", code: "ShiftLeft", windowsVirtualKeyCode: 16, modifiers: 0 });
    await sleep(60);
  };
  // KHẲNG ĐỊNH chỉ cho phần đầu khung nhìn (thanh tiến độ + thanh trên cùng — việc của bản bốn bước): trường cheTren. Thanh Lưu dưới đáy và nút nổi Hỗ trợ có từ trước bản này: chỉ ĐẾM (cheKhac), không khẳng định.
  // Trạng thái ô đang focus: bị che hay không (kể cả nằm ngoài khung nhìn), kèm tên để báo lỗi.
  const doFocus = `(() => {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return { rong: true };
    if (el.dataset.ddThay) return { lap: true };
    el.dataset.ddThay = '1';
    const r = el.getBoundingClientRect();
    const ten = (el.id || el.getAttribute('data-o') || el.getAttribute('data-action') || el.getAttribute('data-buoc') || el.getAttribute('aria-label') || el.textContent || el.tagName).toString().trim().slice(0, 40);
    const cx = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
    const cy = Math.min(Math.max(r.top + Math.min(r.height / 2, 12), 1), innerHeight - 1);
    const hit = document.elementFromPoint(cx, cy);
    const trongKhung = r.top >= 0 && r.bottom <= innerHeight + 1;
    const trenCung = !!hit && (hit === el || el.contains(hit) || hit.contains(el));
    const nguoiChe = !trenCung && hit ? (hit.closest('.buoc-thanh') ? 'thanh-tien-do' : hit.closest('#topbar') ? 'thanh-tren' : hit.closest('.form-actions') ? 'thanh-luu' : hit.tagName) : null;
    const cheTren = r.top < 0 || (!trenCung && (nguoiChe === 'thanh-tien-do' || nguoiChe === 'thanh-tren'));
    return { rong: false, ten, top: Math.round(r.top), bottom: Math.round(r.bottom), che: cheTren, cheKhac: !cheTren && (!trongKhung || !trenCung), nguoiChe, trongKhung };
  })()`;
  const duyet = async (p, nguoc) => {
    // Điểm xuất phát của phím Tab là ô focus / bấm gần nhất: đặt một mốc tạm ở ĐẦU (xuôi) hoặc CUỐI (ngược) trang rồi focus vào đó, để vòng duyệt phủ cả trang.
    await p.ev("document.querySelectorAll('[data-dd-thay]').forEach((n) => n.removeAttribute('data-dd-thay')); document.getElementById('dd-moc')?.remove(); window.scrollTo(0, " + (nguoc ? "document.documentElement.scrollHeight" : "0") + "); (() => { const m = document.createElement('span'); m.id = 'dd-moc'; m.tabIndex = -1; " + (nguoc ? "document.body.append(m)" : "document.body.prepend(m)") + "; m.focus(); })(); true");
    await sleep(200);
    const dung = [];
    let roi = 0;
    let lap = 0;
    for (let i = 0; i < TOI_DA; i++) {
      await phim(p, nguoc);
      const f = await p.ev(doFocus);
      if (f.rong) { roi++; if (roi >= 2) break; continue; } // hai lần liền không có ô nào focus (ra khỏi trang / ô vừa bị dựng lại) = hết một vòng
      roi = 0;
      if (f.lap) { lap++; if (lap >= 5) break; continue; } // ô ngày / giờ có nhiều phần con nên Tab ở lại cùng một ô vài lần; năm lần liền vào ô đã dừng = đã quay vòng
      lap = 0;
      dung.push(f);
    }
    return dung;
  };
  const san = async (p) => {
    await p.waitFor("!!document.getElementById('catalog-q') && !document.getElementById('catalog-q').disabled", "ô tìm danh mục sẵn sàng", 15000);
    await sleep(600);
  };
  const chonTd101 = async (p) => {
    await p.ev(setInput("document.getElementById('orderDate')", vnDate(3)));
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "lọc TD101");
    await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await p.waitFor("!!document.querySelector('#services .svc')", "thẻ dịch vụ");
    await p.ev(setInput("document.querySelector('#services .svc .counter-field[aria-label=\"Người lớn\"]')", "2"));
    await sleep(300);
    await p.ev("(() => { document.querySelector('[data-action=\"them-dua-don\"]')?.click(); return true; })()");
    await sleep(300);
  };
  const moHet = async (p) => {
    for (let i = 0; i < 4; i++) {
      await p.ev("document.querySelectorAll('#services details').forEach((d) => { d.open = true; }); document.querySelectorAll('button[data-gap][aria-expanded=\"false\"]').forEach((b) => b.click()); true");
      await sleep(150);
    }
  };
  // Bấm từng chấm bước: tiêu đề / đầu khối của bước phải nằm DƯỚI thanh tiến độ (nếu cùng cột) hoặc, khi trang đã cuộn hết cỡ, ít nhất trong khung nhìn.
  const kiemChamBuoc = async (p, nhan) => {
    const maBuoc = await p.ev("[...document.querySelectorAll('.buoc-muc')].filter((l) => !l.hidden).map((l) => l.querySelector('.buoc-nut').dataset.buoc)");
    const loi = [];
    for (const ma of maBuoc) {
      await p.ev("window.scrollTo(0, 0); true");
      await sleep(150);
      await p.ev(`document.querySelector('.buoc-nut[data-buoc="${ma}"]').click(); true`);
      await sleep(900);
      const d = await p.ev(`(() => { const k = document.querySelector('[data-buoc-khoi="${ma}"]').getBoundingClientRect(); const t = document.querySelector('.buoc-thanh').getBoundingClientRect();
        const chungCot = Math.min(k.right, t.right) - Math.max(k.left, t.left) > 1;
        const cuoiTrang = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
        return { top: Math.round(k.top), thanhDay: Math.round(t.bottom), chungCot, cuoiTrang, trongKhung: k.top >= 0 && k.top < innerHeight }; })()`);
      const dungCho = d.cuoiTrang ? d.trongKhung : d.chungCot ? d.top >= d.thanhDay - 1 : d.top >= 0;
      if (!dungCho) loi.push({ ma, ...d });
      // Chấm được tô phải là chấm vừa bấm (kể cả khi trang không cuộn thêm được — đáy trang, máy tính); người dùng tự cuộn (con lăn) thì chấm theo vị trí cuộn lại.
      const dangXem = await p.ev("document.querySelector('.buoc-nut[aria-current=\"step\"]')?.dataset.buoc ?? null");
      if (dangXem !== ma) loi.push({ ma, chamDuocTo: dangXem });
    }
    // Thả chấm: cuộn về đầu bằng con lăn → chấm đang xem về bước đầu.
    await p.ev("window.scrollTo(0, 0); window.dispatchEvent(new Event('wheel')); true");
    await sleep(300);
    const sauCuon = await p.ev("document.querySelector('.buoc-nut[aria-current=\"step\"]')?.dataset.buoc ?? null");
    if (sauCuon !== maBuoc[0]) loi.push({ sauCuonTay: sauCuon, mongDoi: maBuoc[0] });
    return { maBuoc, loi };
  };

  const CHI = process.env.CHI_VAI ? process.env.CHI_VAI.split(",") : null;
  for (const [vai, account] of VAI.filter(([v]) => !CHI || CHI.includes(v))) {
    for (const [kho, vp] of KHO) {
      const p = await env.as(account, "/order-form", vp);
      await san(p);
      await chonTd101(p);
      for (const trangThai of ["mac-dinh", "mo-het"]) {
        if (trangThai === "mo-het") await moHet(p);
        const xuoi = await duyet(p, false);
        const nguoc = await duyet(p, true);
        const cheXuoi = xuoi.filter((f) => f.che);
        const cheNguoc = nguoc.filter((f) => f.che);
        const cheKhac = [...xuoi, ...nguoc].filter((f) => f.cheKhac);
        ketQua.push({ vai, kho, trangThai, diemDungXuoi: xuoi.length, cheXuoi: cheXuoi.length, diemDungNguoc: nguoc.length, cheNguoc: cheNguoc.length, cheKhacTuTruoc: cheKhac.length, dsXuoi: xuoi.map((f) => f.ten), dsNguoc: nguoc.map((f) => f.ten), vd: [...cheXuoi, ...cheNguoc].slice(0, 6) });
        console.log(`${vai} ${kho} ${trangThai}: xuôi ${xuoi.length} điểm, bị che ${cheXuoi.length}; ngược ${nguoc.length} điểm, bị che ${cheNguoc.length}; (che bởi thanh Lưu đáy / nút nổi có từ trước: ${cheKhac.length}, chỉ đếm)`);
        assert.ok(xuoi.length >= 8 && nguoc.length >= 8, `${vai} ${kho} ${trangThai}: đếm được quá ít điểm dừng (phím Tab không chạy?) — xuôi ${xuoi.length}, ngược ${nguoc.length}`);
        assert.deepEqual([...cheXuoi, ...cheNguoc], [], `${vai} ${kho} ${trangThai}: có điểm dừng bị thanh tiến độ / thanh trên che`);
      }
      const cham = await kiemChamBuoc(p, `${vai} ${kho}`);
      ketQua.push({ vai, kho, chamBuoc: cham.maBuoc, loi: cham.loi });
      assert.deepEqual(cham.loi, [], `${vai} ${kho}: bấm chấm bước mà tiêu đề bước nằm dưới thanh`);
      p.close();
      ok(`${vai} ${kho}: 0 điểm dừng bị che (Tab xuôi + Shift+Tab ngược, mặc định + mở hết); chấm bước cuộn đúng chỗ`);
    }
  }
  writeFileSync(join(OUT, "diem-dung-bi-che.json"), JSON.stringify(ketQua, null, 1));
  console.log("DIEM DUNG BI CHE OK");
} finally {
  await env.stop();
}

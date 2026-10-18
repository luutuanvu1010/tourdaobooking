// Kịch bản Chrome — màn Tạo đơn thiết kế lại 18/10: (1) công tắc "Đơn của: Khách lẻ | Qua đối tác"; (2) lớp chặn nhầm "Số này là của đối tác …" (Task 3 + Task 4).
// Kiểm ở hai khổ 390 và 1040:
//   1) công tắc: bấm "Qua đối tác" → tìm → chọn → dòng nền xanh nhạt + "Đổi", nhãn SĐT thành "Số điện thoại khách *"; bấm "Khách lẻ" → nhãn trở lại; "Đổi" rồi bỏ → về "Khách lẻ";
//      hai nút công tắc cao ≥ 44px, chia đều rộng hết khối;
//   2) lớp chặn nhầm: gõ SĐT của đối tác → khung cát hiện NGAY dưới ô SĐT, "Đúng, qua …" bật công tắc + xoá hai ô khách + tiêu điểm về ô tên; "Không" ẩn khung cho số đó
//      (hiện lại khi số đổi rồi quay lại); SĐT khách thường → không khung; nguoi-huong bị giả 403 → không khung và VẪN lưu được đơn;
//      tài khoản Đối tác thuần và tài khoản lai Bán hàng + Đối tác → không khung, không gọi nguoi-huong lần nào;
//   3) bảng «Đổi khách» (đơn đã xác nhận, 390): cùng khung, câu cảnh báo bản cũ còn nguyên, «Đúng» / «Không» như ở form.
// Việc 9 (biến thể theo vai, đặc tả DAC-TA.md mục 3): bước 5 thêm dòng chỉ đọc «Bên đặt» của Đối tác thuần (theo benDatCuaToi của máy chủ); bước 5b: tài khoản CHỈ Thực tập
//   THẤY công tắc (đúng `coODatQuaDoiTac` — bản vẽ ghi «chỉ đọc», mã không đổi quyền, chỉ ghi nhận); bước 6 thêm: bảng «Đổi khách» có CÙNG công tắc «Đơn của» ở đầu và hai
//   ô nhãn nổi «Tên khách đi tour *» / «Số điện thoại *» (đã chọn đối tác → «Số điện thoại khách *», cả qua «Đúng, qua …» lẫn qua công tắc); bước 7: lưu thật bảng đó với
//   đối tác đã chọn → GET đơn: tên / SĐT khách đúng chữ đã gõ, bên đặt = hồ sơ đối tác (thân PUT không đổi nghĩa).
// Việc 9 (nợ T4 của việc 4): bước 2d — đổi số thì khung của số cũ ẩn NGAY (không đợi 400 ms + lời tra); chọn đối tác ở công tắc khi lời hỏi nguoi-huong của lần tra
//   đang bay (giả chậm) → kết quả về muộn KHÔNG làm khung hiện lại; về «Khách lẻ» với số đối tác còn trong ô → hỏi lại, khung hiện.
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, không --remote, danh mục giả (không Sheet), KHÔNG chụp ảnh.
// Quy tắc ADR-0074/0075: một lần đăng nhập MỚI của cùng tài khoản làm phiên của trang đang mở bị thay ⇒ mỗi lúc chỉ một trang mở cho mỗi tài khoản (đóng trang trước khi mở trang kế).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-18-tao-don-thiet-ke-lai/kich-ban/cong-tac-va-canh-bao-smoke.mjs
// Chưa kiểm axe-core (kịch bản này không nạp AXE_JS). Mỗi bước chạy riêng; cuối cùng in "CONG TAC VA CANH BAO SMOKE OK" hoặc danh sách bước đỏ (thoát 1).
import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 900, mobile: false };
const DAI_LY = { name: "Lê Thu Hà", phone: "0900000281" }; // Đối tác THUẦN, hồ sơ cá nhân mang vai «Công ty lữ hành» — tạo qua POST /api/staff (PIN do máy chủ trả)
const LAI = { name: "Phan Văn Lai", phone: "0900000282", pin: "246882", permissions: ["SALES", "PARTNER"] }; // tài khoản lai — gieo SQL
const THUC_TAP = { name: "Thực Tập Công Tắc", phone: "0900000283", pin: "246883", permissions: ["INTERN"] }; // tài khoản CHỈ Thực tập — gieo SQL (Việc 9)
const DOI_TAC = { name: DAI_LY.name, phone: "0900000293" }; // số điện thoại LIÊN HỆ thêm vào hồ sơ của đại lý (hồ sơ đang mang vai được hưởng hoa hồng) — số khách gõ vào ô SĐT sẽ trùng số này (số đăng nhập 0900000281 không phải liên hệ của hồ sơ nên không tra ra)
const KHACH = { name: "Trần Khách Thường", phone: "0900000291" }; // hồ sơ khách thường (không được hưởng hoa hồng)

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

try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const phai = (r, status, nhan) => { assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };

  // ---- dựng dữ liệu bằng API/SQL TRƯỚC khi mở trang nào ----
  const taoDl = phai(await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName: DAI_LY.name, phone: DAI_LY.phone, roles: ["TRAVEL_AGENCY"] }), 201, "Toàn quyền tạo tài khoản đại lý");
  DAI_LY.pin = taoDl.pin;
  DAI_LY.permissions = ["PARTNER"];
  phai(await call(ACCOUNTS.admin, "POST", `/api/parties/${taoDl.staff.partyId}/contacts`, { kind: "PHONE", value: DOI_TAC.phone }), 201, "Quản trị thêm số điện thoại vào hồ sơ đối tác");
  phai(await call(ACCOUNTS.admin, "POST", "/api/parties", { kind: "PERSON", fullName: KHACH.name, contacts: [{ kind: "PHONE", value: KHACH.phone }] }), 201, "Quản trị tạo hồ sơ khách thường");
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  env.sql(await insertStaffSql(LAI));
  env.sql(await insertStaffSql(THUC_TAP));
  // Máy chủ quyết dòng chỉ đọc «Bên đặt» (benDatCuaToi của /api/auth/me — giao diện không suy): đọc trước khi mở trang để khẳng định đúng câu trả lời đó.
  const benDat = {};
  for (const tk of [DAI_LY, LAI]) benDat[tk.phone] = phai(await call(tk, "GET", "/api/auth/me"), 200, `/api/auth/me của ${tk.name}`).benDatCuaToi ?? null;
  console.log(`  (benDatCuaToi: Đối tác thuần ${JSON.stringify(benDat[DAI_LY.phone])}, lai ${JSON.stringify(benDat[LAI.phone])})`);

  // Giả 403 cho nguoi-huong và đếm số lời gọi: chèn trước mã trang (window.__nh = số lời gọi; window.__nh403 = true thì trả 403).
  // window.__nhChamLan > 0: lời gọi kế tiếp chờ thêm window.__nhCham ms rồi mới đi (giả mạng chậm cho bước 2d), mỗi lời gọi trừ một.
  const GIA_403 = `window.__nh = 0; window.__nh403 = false; window.__nhCham = 0; window.__nhChamLan = 0; { const f = window.fetch.bind(window);
    window.fetch = async (u, o) => { if (String(u).includes('/api/pricing/nguoi-huong')) { window.__nh++; if (window.__nh403) return new Response(JSON.stringify({ error: 'forbidden', message: 'Không đủ quyền.' }), { status: 403, headers: { 'content-type': 'application/json' } }); if (window.__nhChamLan > 0) { window.__nhChamLan--; await new Promise((r) => setTimeout(r, window.__nhCham)); } } return f(u, o); }; }`;
  const moTrang = async (account, path, vp) => {
    const p = await env.openPage(vp);
    await p.send("Page.addScriptToEvaluateOnNewDocument", { source: GIA_403 });
    const c = await env.login(account);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: env.base + path });
    await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
    await p.waitFor("!!document.getElementById('customerPhone')", "form lập đơn dựng xong");
    return p;
  };
  const nhanSdt = (p) => p.ev("document.querySelector('#customerPhone').closest('.o-noi').querySelector('.o-noi-chu').textContent");
  const goSdt = (p, so) => p.ev(setInput("document.getElementById('customerPhone')", so));
  const hienKhung = "(() => { const e = document.getElementById('canh-bao-doi-tac'); return !!e && !e.hidden && e.getClientRects().length > 0; })()";
  const choLookup = async (p, so, ms = 1800) => { // đợi tra hồ sơ xong rồi chờ thêm cho lời gọi nguoi-huong (nếu có) về
    await p.waitFor(`/Có \\d+ hồ sơ dùng số này|Chưa có hồ sơ nào|Không tra được hồ sơ/.test(document.querySelector('.booker-matches')?.textContent ?? '')`, `tra hồ sơ ${so}`, 6000);
    await sleep(ms);
  };
  const dem = (p) => p.ev("window.__nh");

  for (const [kho, vp] of [["390", MOB], ["1040", DESK]]) {
    // ================= Bán hàng (văn phòng): có công tắc =================
    let p = await moTrang(ACCOUNTS.salesA, "/order-form", vp);

    await buoc(`1-${kho}`, "công tắc: Qua đối tác → tìm → chọn → dòng xanh + «Đổi», nhãn SĐT «Số điện thoại khách *»; Khách lẻ → nhãn trở lại; «Đổi» rồi bỏ → về Khách lẻ; nút ≥ 44px, rộng hết khối", async () => {
      const dang = await p.ev(`(() => { const bs = [...document.querySelectorAll('#dat-qua-doi-tac .dqdt-chon-ai .loc-nut')]; const g = document.querySelector('#dat-qua-doi-tac .dqdt-chon-ai').getBoundingClientRect(); const c = document.getElementById('dat-qua-doi-tac').getBoundingClientRect();
        return { chu: bs.map((b) => b.textContent), cao: bs.map((b) => Math.round(b.getBoundingClientRect().height)), nhomRong: Math.round(g.width), khoiRong: Math.round(c.width), pressed: bs.map((b) => b.getAttribute('aria-pressed')) }; })()`);
      assert.deepEqual(dang.chu, ["Khách lẻ", "Qua đối tác"]);
      assert.ok(dang.cao.every((c) => c >= 44), `nút công tắc cao ≥ 44px: ${JSON.stringify(dang.cao)}`);
      assert.ok(Math.abs(dang.nhomRong - dang.khoiRong) <= 1, `công tắc rộng hết khối: ${dang.nhomRong} vs ${dang.khoiRong}`);
      assert.deepEqual(dang.pressed, ["true", "false"], "mặc định Khách lẻ");
      assert.equal(await nhanSdt(p), "Số điện thoại *");
      await p.ev("document.querySelector('[data-action=\"dat-qua-mo\"]').click(); true");
      await p.waitFor("document.querySelectorAll('#dat-qua-doi-tac .dqdt-dong').length >= 1", "danh sách đối tác");
      await p.ev(setInput("document.querySelector('#dat-qua-doi-tac input[type=search]')", "Hà"));
      await p.waitFor(`[...document.querySelectorAll('#dat-qua-doi-tac .dqdt-dong')].some((b) => b.textContent.includes(${JSON.stringify(DAI_LY.name)}))`, "kết quả tìm đối tác");
      await p.ev(`[...document.querySelectorAll('#dat-qua-doi-tac .dqdt-dong')].find((b) => b.textContent.includes(${JSON.stringify(DAI_LY.name)})).click(); true`);
      await p.waitFor("!!document.querySelector('#dat-qua-doi-tac .dqdt-chon-xanh')", "dòng đã chọn");
      const xanh = await p.ev(`(() => { const e = document.querySelector('#dat-qua-doi-tac .dqdt-chon-xanh'); return { chu: e.textContent, nen: getComputedStyle(e).backgroundColor, doi: !!e.querySelector('[data-action="dat-qua-doi"]') }; })()`);
      assert.match(xanh.chu, new RegExp(`${DAI_LY.name}.*được hưởng hoa hồng.*Đổi`));
      assert.equal(xanh.doi, true, "có liên kết «Đổi»");
      assert.notEqual(xanh.nen, "rgba(0, 0, 0, 0)", "nền xanh nhạt");
      assert.equal(await nhanSdt(p), "Số điện thoại khách *");
      await p.ev("document.querySelector('#dat-qua-doi-tac [data-action=\"dat-qua-huy\"]').click(); true"); // «Khách lẻ»
      await p.waitFor("!document.querySelector('#dat-qua-doi-tac .dqdt-chon-xanh')", "bỏ chọn");
      assert.equal(await nhanSdt(p), "Số điện thoại *");
      // «Đổi» rồi bỏ: chọn lại, bấm Đổi (mở ô tìm), rồi «Khách lẻ» → về Khách lẻ
      await p.ev("document.querySelector('[data-action=\"dat-qua-mo\"]').click(); true");
      await p.waitFor("document.querySelectorAll('#dat-qua-doi-tac .dqdt-dong').length >= 1", "danh sách đối tác lần hai");
      await p.ev("document.querySelector('#dat-qua-doi-tac .dqdt-dong').click(); true");
      await p.waitFor("!!document.querySelector('#dat-qua-doi-tac [data-action=\"dat-qua-doi\"]')", "dòng đã chọn lần hai");
      await p.ev("document.querySelector('#dat-qua-doi-tac [data-action=\"dat-qua-doi\"]').click(); true");
      await p.waitFor("!!document.querySelector('#dat-qua-doi-tac input[type=search]')", "«Đổi» mở ô tìm");
      await p.ev("document.querySelector('#dat-qua-doi-tac [data-action=\"dat-qua-huy\"]').click(); true");
      await p.waitFor("document.querySelector('#dat-qua-doi-tac .dqdt-chon-ai .loc-nut').getAttribute('aria-pressed') === 'true' && !document.querySelector('#dat-qua-doi-tac input[type=search]')", "về Khách lẻ");
      assert.equal(await nhanSdt(p), "Số điện thoại *");
    });

    await buoc(`2a-${kho}`, "lớp chặn nhầm: SĐT của đối tác → khung cát ngay dưới ô SĐT, chữ đúng, hai nút phụ ≥ 44px", async () => {
      await goSdt(p, DOI_TAC.phone);
      await p.waitFor(hienKhung, "khung cảnh báo hiện", 8000);
      const k = await p.ev(`(() => { const e = document.getElementById('canh-bao-doi-tac'); const r = e.getBoundingClientRect(); const ph = document.getElementById('customerPhone').getBoundingClientRect();
        return { chu: e.querySelector('.canh-bao-dt-chu').textContent, nut: [...e.querySelectorAll('button')].map((b) => [b.textContent, Math.round(b.getBoundingClientRect().height), getComputedStyle(b).backgroundColor, getComputedStyle(b).borderTopWidth]),
          nenKhung: getComputedStyle(e).backgroundColor, live: e.getAttribute('aria-live'), role: e.getAttribute('role'), duoiO: r.top >= ph.bottom - 1, sat: r.top - ph.bottom < 80, ngang: document.documentElement.scrollWidth <= innerWidth }; })()`);
      assert.equal(k.chu, `Số này là của đối tác ${DOI_TAC.name}. Đơn này đặt qua đối tác đó?`);
      assert.deepEqual(k.nut.map((n) => n[0]), [`Đúng, qua ${DOI_TAC.name}`, "Không"]);
      assert.ok(k.nut.every((n) => n[1] >= 44), `nút ≥ 44px: ${JSON.stringify(k.nut)}`);
      assert.ok(k.nut.every((n) => n[2] === "rgb(255, 255, 255)" && n[3] === "1px"), `nút phụ (nền trắng, viền 1px), không nút nào nền cát/đặc: ${JSON.stringify(k.nut)}`);
      assert.equal(k.role, "status");
      assert.equal(k.live, "polite");
      assert.ok(k.duoiO && k.sat, "khung nằm ngay dưới ô SĐT");
      assert.ok(k.ngang, "không tràn ngang");
      assert.ok((await dem(p)) >= 1, "đã hỏi nguoi-huong");
    });

    await buoc(`2b-${kho}`, "«Không» ẩn khung cho số này; đổi số rồi quay lại thì hiện lại", async () => {
      await p.ev("document.querySelector('[data-action=\"canh-bao-khong\"]').click(); true");
      assert.equal(await p.ev(hienKhung), false);
      await sleep(900);
      assert.equal(await p.ev(hienKhung), false, "vẫn ẩn khi số không đổi");
      await goSdt(p, KHACH.phone);
      await choLookup(p, KHACH.phone);
      assert.equal(await p.ev(hienKhung), false, "số khác, hồ sơ thường → không khung");
      await goSdt(p, DOI_TAC.phone);
      await p.waitFor(hienKhung, "hiện lại sau khi số đổi", 8000);
    });

    await buoc(`2c-${kho}`, "«Đúng, qua …» bật công tắc Qua đối tác, xoá CẢ HAI ô khách, tiêu điểm vào ô tên, khung biến mất", async () => {
      await p.ev(setInput("document.getElementById('customerName')", "Tên gõ nhầm"));
      await p.ev("document.querySelector('[data-action=\"canh-bao-dung\"]').click(); true");
      const s = await p.ev(`(() => ({ ten: document.getElementById('customerName').value, sdt: document.getElementById('customerPhone').value, focus: document.activeElement.id, khung: ${hienKhung},
        xanh: document.querySelector('#dat-qua-doi-tac .dqdt-chon-xanh')?.textContent ?? null, nhan: document.querySelector('#customerPhone').closest('.o-noi').querySelector('.o-noi-chu').textContent,
        pressed: [...document.querySelectorAll('#dat-qua-doi-tac .dqdt-chon-ai .loc-nut')].map((b) => b.getAttribute('aria-pressed')) }))()`);
      assert.deepEqual([s.ten, s.sdt, s.focus, s.khung], ["", "", "customerName", false]);
      assert.match(s.xanh ?? "", new RegExp(DOI_TAC.name));
      assert.equal(s.nhan, "Số điện thoại khách *");
      assert.deepEqual(s.pressed, ["false", "true"]);
      // đã Qua đối tác thì gõ lại số đối tác KHÔNG hỏi nữa (không gọi thêm nguoi-huong)
      const truoc = await dem(p);
      await goSdt(p, DOI_TAC.phone);
      await sleep(1500);
      assert.equal(await p.ev(hienKhung), false);
      assert.equal(await dem(p), truoc, "đang Qua đối tác thì không tra nguoi-huong");
      await p.ev("document.querySelector('#dat-qua-doi-tac [data-action=\"dat-qua-huy\"]').click(); true");
      await p.ev(setInput("document.getElementById('customerPhone')", ""));
    });

    await buoc(`2d-${kho}`, "nợ T4: đổi số → khung số cũ ẩn ngay; chọn đối tác khi lời hỏi nguoi-huong đang bay → khung không hiện lại; về «Khách lẻ» → hỏi lại số đang có", async () => {
      // (3) khung của số cũ ẩn NGAY khi số đổi
      await goSdt(p, DOI_TAC.phone);
      await p.waitFor(hienKhung, "khung hiện cho số đối tác", 8000);
      await goSdt(p, `${DOI_TAC.phone}9`);
      assert.equal(await p.ev(hienKhung), false, "vừa đổi số: khung của số cũ ẩn ngay, không đợi lời tra");
      // (1) lời hỏi nguoi-huong của lần tra đang bay (giả chậm 2,5 giây), người lập chọn đối tác ở công tắc → khung không được hiện lại khi kết quả về
      await p.ev("window.__nhCham = 2500; window.__nhChamLan = 1; true");
      const truoc = await dem(p);
      await goSdt(p, DOI_TAC.phone);
      await p.waitFor(`window.__nh > ${truoc}`, "lời hỏi nguoi-huong của lần tra đã gửi (đang chậm)", 6000);
      await p.ev("document.querySelector('[data-action=\"dat-qua-mo\"]').click(); true");
      await p.waitFor(`[...document.querySelectorAll('#dat-qua-doi-tac .dqdt-dong')].some((b) => b.textContent.includes(${JSON.stringify(DAI_LY.name)}))`, "danh sách đối tác");
      await p.ev(`[...document.querySelectorAll('#dat-qua-doi-tac .dqdt-dong')].find((b) => b.textContent.includes(${JSON.stringify(DAI_LY.name)})).click(); true`);
      await p.waitFor("!!document.querySelector('#dat-qua-doi-tac .dqdt-chon-xanh')", "đã chọn đối tác");
      await sleep(3000);
      assert.equal(await p.ev(hienKhung), false, "kết quả chậm về SAU khi đã chọn đối tác: khung không hiện lại");
      // (2) về «Khách lẻ» với số đối tác còn trong ô → hỏi lại, khung hiện
      await p.ev("document.querySelector('#dat-qua-doi-tac [data-action=\"dat-qua-huy\"]').click(); true");
      await p.waitFor(hienKhung, "về Khách lẻ: hỏi lại số đang có, khung hiện", 8000);
      await goSdt(p, "");
    });

    await buoc(`3-${kho}`, "SĐT khách thường → không khung", async () => {
      await goSdt(p, KHACH.phone);
      await choLookup(p, KHACH.phone);
      assert.equal(await p.ev(hienKhung), false);
      await goSdt(p, "");
    });

    await buoc(`4-${kho}`, "nguoi-huong bị giả 403 → không khung, KHÔNG chặn lưu đơn", async () => {
      await p.ev("window.__nh403 = true; true");
      const truoc = await dem(p);
      await goSdt(p, DOI_TAC.phone);
      await choLookup(p, DOI_TAC.phone);
      assert.ok((await dem(p)) > truoc, "có gọi nguoi-huong (và bị 403)");
      assert.equal(await p.ev(hienKhung), false);
      assert.equal(await p.ev("document.getElementById('canh-bao-doi-tac').textContent"), "", "không để chữ lỗi của máy chủ");
      await p.ev(setInput("document.getElementById('customerName')", "Khách Đặt Thử"));
      await p.ev("document.getElementById('catalog-q').focus(); true");
      await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length >= 1", "danh mục");
      await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
      await p.waitFor("document.querySelectorAll('#services .svc').length === 1", "thẻ dịch vụ");
      await p.ev(setInput("document.getElementById('orderDate')", vnDate(7)));
      await p.ev("document.getElementById('save').click(); true");
      await p.waitFor("location.pathname === '/order'", "lưu được đơn dù nguoi-huong 403", 15000);
    });
    p.close();

    // ================= Đối tác thuần và tài khoản lai: không khung, không gọi nguoi-huong =================
    for (const [nhan, tk] of [["Đối tác thuần", DAI_LY], ["Bán hàng + Đối tác (lai)", LAI]]) {
      p = await moTrang(tk, "/order-form", vp);
      await buoc(`5-${kho}-${tk.phone}`, `${nhan}: gõ SĐT trùng đối tác → không khung, không gọi nguoi-huong, không có công tắc; dòng chỉ đọc «Bên đặt» đúng theo máy chủ`, async () => {
        assert.equal(await p.ev("!!document.getElementById('dat-qua-doi-tac')"), false, "không có công tắc «Đơn của»");
        const bd = benDat[tk.phone];
        assert.equal(await p.ev("document.getElementById('ben-dat-chi-doc')?.textContent ?? null"), bd ? `Bên đặt: ${bd.ten}` : null, `dòng chỉ đọc «Bên đặt» theo benDatCuaToi ${JSON.stringify(bd)}`);
        await goSdt(p, DOI_TAC.phone);
        await sleep(2200);
        assert.equal(await p.ev(hienKhung), false);
        assert.equal(await dem(p), 0, "không gọi nguoi-huong");
      });
      p.close();
    }

    // ================= Thực tập (CHỈ quyền INTERN): THẤY công tắc — đúng `coODatQuaDoiTac` (lập đơn, không giữ quyền Đối tác); bản vẽ ghi «chỉ đọc», mã không đổi quyền =================
    p = await moTrang(THUC_TAP, "/order-form", vp);
    await buoc(`5b-${kho}`, "Thực tập (chỉ INTERN): có công tắc «Đơn của» (Khách lẻ | Qua đối tác), không dòng chỉ đọc «Bên đặt»", async () => {
      const s = await p.ev(`(() => ({ chu: [...document.querySelectorAll('#dat-qua-doi-tac .dqdt-chon-ai .loc-nut')].map((b) => b.textContent), chiDoc: !!document.getElementById('ben-dat-chi-doc') }))()`);
      assert.deepEqual(s, { chu: ["Khách lẻ", "Qua đối tác"], chiDoc: false }, JSON.stringify(s));
    });
    p.close();
  }

  // ================= Bảng «Đổi khách» (đơn đã xác nhận): cùng khung cảnh báo, câu cảnh báo bản cũ giữ nguyên =================
  const NO_TRIP = { departDate: vnDate(10), departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  const tao = await call(ACCOUNTS.salesA, "POST", "/api/orders", { customerName: "Khách Bảng Đổi", customerPhone: "0903 111 222", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{ kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, ...NO_TRIP }] });
  const donId = phai(tao, 201, "Bán hàng lập đơn để đổi khách").order.id;
  let b = await env.as(ACCOUNTS.salesA, `/order?id=${donId}`, MOB);
  await buoc("6", "bảng «Đổi khách»: SĐT đối tác → khung cảnh báo hiện trong bảng, câu cảnh báo cũ còn nguyên; «Đúng» chọn đối tác ở ô «Đặt qua đối tác», xoá hai ô; «Không» ẩn", async () => {
    await b.waitFor("document.querySelectorAll('#order .svc-view').length === 1", "đơn nạp xong");
    await b.ev("window.confirm = () => true; true");
    await b.ev(`[...document.querySelectorAll('#actions button')].find((x) => x.textContent.trim() === 'Xác nhận đơn').click(); true`);
    await b.waitFor("document.querySelector('#order .badge')?.textContent === 'Đã xác nhận'", "đã xác nhận");
    await b.ev("document.querySelector('[data-action=\"change-booker\"]').click(); true");
    await b.waitFor("!!document.querySelector('.sheet[role=dialog]')", "bảng Đổi khách mở");
    // Việc 9: cùng khối khách với form — công tắc «Đơn của» ĐẦU thân bảng, rồi hai ô nhãn nổi (giá trị đang lưu nằm trong ô, nhãn thu nhỏ phía trên).
    const cauTruc = await b.ev(`(() => { const s = document.querySelector('.sheet-body'); const ct = s.querySelector('#dat-qua-doi-tac'); const nhan = [...s.querySelectorAll('.o-noi .o-noi-chu')].map((e) => e.textContent);
      const oTen = s.querySelector('.o-noi input[type=text]');
      return { congTac: ct ? [...ct.querySelectorAll('.dqdt-chon-ai .loc-nut')].map((x) => [x.textContent, x.getAttribute('aria-pressed'), Math.round(x.getBoundingClientRect().height)]) : null, nhan,
        congTacTruoc: !!ct && !!oTen && (ct.compareDocumentPosition(oTen) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0, giaTri: [...s.querySelectorAll('.o-noi input')].map((i) => i.value), coChu16: [...s.querySelectorAll('.o-noi input')].map((i) => getComputedStyle(i).fontSize) }; })()`);
    assert.deepEqual(cauTruc.congTac?.map((x) => [x[0], x[1]]), [["Khách lẻ", "true"], ["Qua đối tác", "false"]], `công tắc «Đơn của» trong bảng: ${JSON.stringify(cauTruc)}`);
    assert.ok(cauTruc.congTac.every((x) => x[2] >= 44), `nút công tắc ≥ 44px: ${JSON.stringify(cauTruc.congTac)}`);
    assert.deepEqual(cauTruc.nhan, ["Tên khách đi tour *", "Số điện thoại *"], `hai ô nhãn nổi: ${JSON.stringify(cauTruc)}`);
    assert.equal(cauTruc.congTacTruoc, true, "công tắc đứng trước hai ô khách (như form)");
    assert.deepEqual(cauTruc.giaTri, ["Khách Bảng Đổi", "0903 111 222"], "hai ô mang giá trị đang lưu");
    assert.deepEqual(cauTruc.coChu16, ["16px", "16px"], "ô gõ 16px");
    const ten = "document.querySelector('.sheet [id=\"canh-bao-doi-tac\"]')";
    const sdt = "[...document.querySelectorAll('.sheet label')].find((l) => l.textContent.startsWith('Số điện thoại')).querySelector('input')";
    await b.ev(setInput(sdt, DOI_TAC.phone));
    await b.waitFor(`!!${ten} && !${ten}.hidden`, "khung cảnh báo trong bảng", 8000);
    assert.match(await b.ev("document.querySelector('.sheet .sheet-warn').textContent"), /Bản xác nhận đã gửi khách trước đó có thể lỗi thời — cần gửi lại\./);
    assert.equal(await b.ev(`${ten}.querySelector('.canh-bao-dt-chu').textContent`), `Số này là của đối tác ${DOI_TAC.name}. Đơn này đặt qua đối tác đó?`);
    await b.ev(`${ten}.querySelector('[data-action="canh-bao-khong"]').click(); true`);
    assert.equal(await b.ev(`${ten}.hidden`), true, "«Không» ẩn khung");
    await b.ev(setInput(sdt, KHACH.phone));
    await b.waitFor("/Có \\d+ hồ sơ dùng số này/.test(document.querySelector('.sheet .booker-matches')?.textContent ?? '')", "tra hồ sơ số khác", 6000);
    await sleep(800);
    await b.ev(setInput(sdt, DOI_TAC.phone));
    await b.waitFor(`!${ten}.hidden`, "hiện lại sau khi số đổi", 8000);
    await b.ev(`${ten}.querySelector('[data-action="canh-bao-dung"]').click(); true`);
    const r = await b.ev(`(() => ({ vals: [...document.querySelectorAll('.sheet-body label input[type=text], .sheet-body label input[type=tel]')].map((i) => i.value), focus: document.activeElement.closest('label')?.textContent ?? '', khung: !${ten}.hidden,
      xanh: document.querySelector('.sheet .dqdt-chon')?.textContent ?? '' }))()`);
    assert.deepEqual(r.vals, ["", ""]);
    assert.match(r.focus, /^Tên khách/);
    assert.equal(r.khung, false);
    assert.match(r.xanh, new RegExp(DOI_TAC.name));
    // Việc 9: «Đúng, qua …» bật công tắc «Qua đối tác» (đường `datChon`, không qua `onDoi`) — nhãn SĐT vẫn phải đổi thành của KHÁCH.
    const nhanSdtBang = "[...document.querySelectorAll('.sheet-body .o-noi .o-noi-chu')].map((e) => e.textContent)";
    assert.deepEqual(await b.ev(nhanSdtBang), ["Tên khách đi tour *", "Số điện thoại khách *"], "sau «Đúng»: nhãn SĐT của khách");
    assert.deepEqual(await b.ev("[...document.querySelectorAll('.sheet #dat-qua-doi-tac .dqdt-chon-ai .loc-nut')].map((x) => x.getAttribute('aria-pressed'))"), ["false", "true"], "công tắc ở «Qua đối tác»");
  });

  await buoc("7", "bảng «Đổi khách»: «Khách lẻ» → nhãn SĐT về «Số điện thoại *»; «Qua đối tác» → chọn đối tác → nhãn khách; gõ tên + SĐT khách, «Lưu khách» → GET đơn: tên / SĐT đúng, bên đặt = hồ sơ đối tác", async () => {
    await b.ev("document.querySelector('.sheet #dat-qua-doi-tac [data-action=\"dat-qua-huy\"]').click(); true"); // «Khách lẻ»
    await b.waitFor("!document.querySelector('.sheet #dat-qua-doi-tac .dqdt-chon-xanh')", "bỏ chọn đối tác");
    assert.deepEqual(await b.ev("[...document.querySelectorAll('.sheet-body .o-noi .o-noi-chu')].map((e) => e.textContent)"), ["Tên khách đi tour *", "Số điện thoại *"], "Khách lẻ: nhãn SĐT trở lại");
    await b.ev("document.querySelector('.sheet [data-action=\"dat-qua-mo\"]').click(); true");
    await b.waitFor(`[...document.querySelectorAll('.sheet #dat-qua-doi-tac .dqdt-dong')].some((x) => x.textContent.includes(${JSON.stringify(DAI_LY.name)}))`, "danh sách đối tác trong bảng");
    await b.ev(`[...document.querySelectorAll('.sheet #dat-qua-doi-tac .dqdt-dong')].find((x) => x.textContent.includes(${JSON.stringify(DAI_LY.name)})).click(); true`);
    await b.waitFor("!!document.querySelector('.sheet #dat-qua-doi-tac .dqdt-chon-xanh')", "đã chọn đối tác qua công tắc");
    assert.deepEqual(await b.ev("[...document.querySelectorAll('.sheet-body .o-noi .o-noi-chu')].map((e) => e.textContent)"), ["Tên khách đi tour *", "Số điện thoại khách *"], "chọn qua công tắc: nhãn SĐT của khách");
    assert.equal(await b.ev("document.querySelector('.sheet .booker').hidden"), true, "đã chọn đối tác: ô tra hồ sơ khách ẩn");
    await b.ev(setInput("document.querySelector('.sheet-body .o-noi input[type=text]')", "Khách Đi Qua Đại Lý"));
    await b.ev(setInput("document.querySelector('.sheet-body .o-noi input[type=tel]')", "0903 444 555"));
    await b.ev("[...document.querySelectorAll('.sheet-foot button')].find((x) => x.textContent === 'Lưu khách').click(); true");
    await b.waitFor("!document.querySelector('.sheet[role=dialog]')", "lưu xong, bảng đóng", 15000);
    const don = phai(await call(ACCOUNTS.salesA, "GET", `/api/orders/${donId}`), 200, "đọc lại đơn").order;
    assert.deepEqual([don.customerName, don.customerPhone, don.bookerPartyId], ["Khách Đi Qua Đại Lý", "0903 444 555", taoDl.staff.partyId], `đơn sau khi đổi khách: ${JSON.stringify({ ten: don.customerName, sdt: don.customerPhone, benDat: don.bookerPartyId, laDoiTac: don.bookerLaDoiTac })}`);
  });
  b.close();
} finally {
  await env.stop();
}
if (loi.length) {
  console.error(`\nCÒN ${loi.length} BƯỚC ĐỎ:\n${loi.join("\n")}`);
  process.exit(1);
}
console.log("\nCONG TAC VA CANH BAO SMOKE OK");

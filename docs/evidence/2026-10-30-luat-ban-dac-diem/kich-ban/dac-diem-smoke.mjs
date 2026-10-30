// Kịch bản Chrome — màn «Đặc điểm dịch vụ» (ADR-0152 Đ1, Đ3, Đ4 cảnh báo, Đ5; tiêu chí 17, 17b; ca vàng CV-8; kế hoạch 2026-10-30 T12, mục 8.1).
// Rào DUY NHẤT cho phần GIAO DIỆN: cảnh báo đổi giá trị / bật lại / đổi tên là việc của giao diện (máy chủ không ép — Đ4 mục 2), `npm test` chỉ canh chữ (dac-diem-hien-thi.ts).
// Mỗi bước chạy ở 390 và 1040; kiểm bố cục / chữ thô / axe như luat-ban-smoke.mjs (tệp chung lb-chung.mjs). Thứ tự tài khoản: Kế toán → Quản trị → Bán hàng (mở sau cùng).
// Dữ liệu mỗi khổ dựng bằng API TRƯỚC khi mở trang (ADR-0075): đặc điểm A (Gồm / Không gồm / Tắt sẵn), luật L × A = Không gồm (CV-3), luật L × A = Tắt sẵn rồi tắt «Tắt sẵn»,
// nhóm G chứa TTB06, TD101 mang riêng «Không gồm».
// Bước:
//   1  Kế toán: không có lối vào; mở thẳng ⇒ 403 bằng câu tiếng Việt; máy chủ 403.
//   2  Quản trị: có lối vào; đủ năm thẻ; định nghĩa đặc điểm hai giá trị bằng bảng trượt.
//   3  Quản trị gắn giá trị chung cho nhóm G (thẻ «Theo nhóm»).
//   4  Tắt giá trị còn nhóm mang ⇒ hộp xác nhận ⇒ câu 409 của máy chủ; giá trị vẫn «Đang dùng». 4b: «Sửa» tên giá trị có luật trỏ tới ⇒ cảnh báo trong hộp.
//   5  Bật lại «Tắt sẵn» ⇒ hộp cảnh báo «Còn 1 luật bán trỏ tới giá trị này…» (tiêu chí 17b) ⇒ «Đang dùng».
//   6  Bán hàng: có lối vào, KHÔNG có thẻ «Theo nhóm», «Định nghĩa»; đổi TD101 «Không gồm» → «Gồm» ⇒ hộp «sẽ bỏ chặn «Tour 4 đảo Nha Trang» cho: <loại>» (CV-8), lưu được.
//   7  Số «chưa khai» (thẻ; huy hiệu thanh bên ở 1040) khớp máy chủ và giảm 1 sau khi khai đủ một dịch vụ.
// Chạy (từ gốc repo, sau `npm run build:web`):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-30-luat-ban-dac-diem/kich-ban/dac-diem-smoke.mjs
// Cuối: "DAC DIEM SMOKE OK" hoặc danh sách bước đỏ (thoát 1). LB_KHO=390|1040 chạy một khổ.
// PHÁ THỬ (P16, KHÔNG sửa mã sản phẩm): LB_PHA=luat-rong — lớp bọc `fetch` trả danh sách luật RỖNG cho /api/pricing/luat-ban ⇒ không cảnh báo ⇒ bước 5, 6 ĐỎ.
import assert from "node:assert/strict";
import {
  ACCOUNTS, KHO, PHA, axeKiem, bam, bocucSach, buoc, choDongHop, choHop, chonO, chup, coLoiVao, diToi, goiApi, goiTrongTrang, ketThuc, sleep, startEnv, taoMoTrang,
} from "./lb-chung.mjs";

const PHA_LUAT_RONG = `{ const f = window.fetch.bind(window);
  window.fetch = async (u, o) => { const r = await f(u, o);
    if (String(u) === '/api/pricing/luat-ban' && r.ok) { const b = await r.clone().json(); b.luat = []; return new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } }); }
    return r; }; }`;
const THEM = PHA === "luat-rong" ? PHA_LUAT_RONG : "";
const CAU_403 = "Bạn không có quyền xem trang này.";

const env = await startEnv();
try {
  const { call } = goiApi(env);
  const moTrang = taoMoTrang(env);
  const phai = (r, status, nhan) => { assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };
  const L = phai(await call(ACCOUNTS.admin, "GET", "/api/pricing/loai-doi-tac"), 200, "loại").loai.find((l) => l.dangBat);
  assert.ok(L, "D1 tạm phải có một loại đối tác đang bật");

  const choTrang = (p) => p.waitFor("!document.getElementById('dd-noi-dung').hidden && !!document.querySelector('#dd-the-gan select, #dd-the-gan .rong')", "trang Đặc điểm đã vẽ");
  const chuyenThe = async (p, t) => { assert.equal(await bam(p, `#dd-tab-${t}`), true, `thẻ ${t}`); await p.waitFor(`!document.getElementById('dd-the-${t}').hidden`, `thẻ ${t} hiện`); };
  const chuHop = (p) => p.ev("document.querySelector('.sheet')?.innerText ?? ''");
  const bamHop = (p, chu) => p.ev(`(() => { const b = [...document.querySelectorAll('.sheet-foot button')].find((x) => x.textContent.trim() === ${JSON.stringify(chu)}); if (!b) return false; b.click(); return true; })()`);
  const choToast = (p, re) => p.waitFor(`[...document.querySelectorAll('.toast .toast-cau')].some((e) => new RegExp(${JSON.stringify(re.source)}).test(e.textContent))`, `toast ${re}`, 10000);
  /** Ô chọn ĐANG HIỆN của (dịch vụ, đặc điểm) trong thẻ `the`. */
  const oCua = (the, dv, a) => `[...document.querySelectorAll('#dd-the-${the} select[data-dich-vu="${dv}"][data-dac-diem="${a}"]')].find((x) => x.offsetParent !== null)`;
  const chonTrong = (p, bieuThuc, v) => p.ev(`(() => { const s = ${bieuThuc}; if (!s) return false; s.value = ${JSON.stringify(v)}; if (s.value !== ${JSON.stringify(v)}) return false; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  const nutDinhNghia = (p, ma, viec) => p.ev(`(() => { const e = document.querySelector('#dd-the-dinh-nghia [data-gia-tri="${ma}"] [data-viec="${viec}"], #dd-the-dinh-nghia [data-dac-diem="${ma}"] > .lb-viec [data-viec="${viec}"]'); if (!e) return false; e.click(); return true; })()`);
  const trangThaiGt = (p, ma) => p.ev(`document.querySelector('#dd-the-dinh-nghia [data-gia-tri="${ma}"] .huy-hieu')?.textContent ?? null`);

  for (const [tenKho, vp] of KHO) {
    const kho = `[${tenKho}]`;
    const CHU = `${tenKho}-${String(Date.now()).slice(-4)}`;
    // ---- Dữ liệu của khổ này (không trang nào đang mở) ----
    const A = phai(await call(ACCOUNTS.admin, "POST", "/api/catalog/dac-diem", { ten: `Vận chuyển cảng–đảo ${CHU}`, giaTri: [{ ten: "Gồm" }, { ten: "Không gồm" }, { ten: "Tắt sẵn" }] }), 201, "đặc điểm A").dacDiem;
    const [GOM, KHONG, TAT] = A.giaTri;
    phai(await call(ACCOUNTS.admin, "POST", "/api/pricing/luat-ban", { loai: L.code, phamVi: "ATTRIBUTE", attributeCode: A.code, valueCode: KHONG.code }), 201, "luật CV-3");
    phai(await call(ACCOUNTS.admin, "POST", "/api/pricing/luat-ban", { loai: L.code, phamVi: "ATTRIBUTE", attributeCode: A.code, valueCode: TAT.code }), 201, "luật trỏ «Tắt sẵn»");
    phai(await call(ACCOUNTS.admin, "PATCH", `/api/catalog/dac-diem/gia-tri/${TAT.code}`, { dangDung: false, expectedUpdatedAt: TAT.capNhatLuc }), 200, "tắt «Tắt sẵn»");
    const G = phai(await call(ACCOUNTS.admin, "POST", "/api/catalog/groups", { name: `Nhóm đặc điểm ${CHU}` }), 201, "nhóm G").group;
    phai(await call(ACCOUNTS.admin, "PUT", "/api/catalog/group-assignments", { codes: ["TTB06"], groupCode: G.code }), 200, "TTB06 vào G");
    phai(await call(ACCOUNTS.salesA, "PUT", `/api/catalog/TD101/dac-diem/${A.code}`, { giaTri: KHONG.code, dangThay: null }), 200, "TD101 riêng «Không gồm»");
    let MUA = null;

    // ======================= Kế toán =======================
    {
      const p = await moTrang(ACCOUNTS.accounting, "/account", vp, { them: THEM });
      try {
        await buoc(`1${kho}`, "Kế toán: không có lối vào; mở thẳng ⇒ 403 câu tiếng Việt; máy chủ 403", async () => {
          await p.waitFor("document.querySelectorAll('a[href]').length > 3", "khung trang Tôi");
          await sleep(500);
          assert.equal(await coLoiVao(p, "/dac-diem-dich-vu"), false);
          await diToi(p, env, "/dac-diem-dich-vu");
          await p.waitFor("document.body.dataset.trangThai === '403'", "trạng thái 403", 12000);
          assert.equal(await p.ev("document.querySelector('.trang-thai[data-loai=\"403\"] .trang-thai-tieu-de')?.textContent.trim()"), CAU_403);
          assert.equal((await goiTrongTrang(p, "GET", "/api/catalog/dac-diem")).status, 403);
          await bocucSach(p, `bước 1 ${kho}`);
          await axeKiem(p, `bước 1 ${kho}`);
          await chup(p, `dac-diem-1-ke-toan-403-${tenKho}`);
        });
      } finally {
        p.close();
      }
    }

    // ======================= Quản trị =======================
    {
      const p = await moTrang(ACCOUNTS.admin, "/account", vp, { them: THEM });
      try {
        await buoc(`2${kho}`, "Quản trị: có lối vào; đủ năm thẻ; định nghĩa đặc điểm hai giá trị bằng bảng trượt", async () => {
          await p.waitFor("document.querySelectorAll('a[href]').length > 3", "khung trang Tôi");
          await sleep(500);
          assert.equal(await coLoiVao(p, "/dac-diem-dich-vu"), true);
          await diToi(p, env, "/dac-diem-dich-vu");
          await choTrang(p);
          assert.deepEqual(await p.ev("[...document.querySelectorAll('#dd-noi-dung [role=tab]')].filter((t) => !t.hidden).map((t) => t.textContent.replace(/ \\(\\d+\\)$/, ''))"), ["Gắn cho dịch vụ", "Chưa khai", "Mới, đang theo nhóm", "Theo nhóm", "Định nghĩa"]);
          await bocucSach(p, `bước 2 gắn ${kho}`);
          await axeKiem(p, `bước 2 gắn ${kho}`);
          await chup(p, `dac-diem-2-gan-quan-tri-${tenKho}`);
          await chuyenThe(p, "dinh-nghia");
          assert.equal(await bam(p, "#dd-them-dac-diem"), true);
          await choHop(p);
          assert.equal(await chonO(p, "#dd-moi-ten", `Mùa ${CHU}`), true);
          assert.equal(await chonO(p, "#dd-moi-gia-tri", "Cao điểm\nThấp điểm"), true);
          await bocucSach(p, `bước 2 hộp ${kho}`);
          await axeKiem(p, `bước 2 hộp ${kho}`);
          await chup(p, `dac-diem-2-hop-them-${tenKho}`, false);
          assert.equal(await bamHop(p, "Thêm đặc điểm"), true);
          await choDongHop(p);
          const ds = (await goiTrongTrang(p, "GET", "/api/catalog/dac-diem")).json.dacDiem;
          MUA = ds.find((a) => a.ten === `Mùa ${CHU}`);
          assert.ok(MUA && MUA.giaTri.map((v) => v.ten).join("|") === "Cao điểm|Thấp điểm", "máy chủ có đặc điểm hai giá trị");
          await p.waitFor(`!!document.querySelector('#dd-the-dinh-nghia [data-dac-diem="${MUA.code}"]')`, "thẻ đặc điểm mới");
          await bocucSach(p, `bước 2 định nghĩa ${kho}`);
          await axeKiem(p, `bước 2 định nghĩa ${kho}`);
          await chup(p, `dac-diem-2-dinh-nghia-${tenKho}`);
        });

        await buoc(`3${kho}`, "Quản trị gắn giá trị chung cho nhóm (thẻ «Theo nhóm»)", async () => {
          assert.ok(MUA);
          await chuyenThe(p, "nhom");
          assert.equal(await chonTrong(p, `document.getElementById('dd-nhom-${G.code}-${MUA.code}')`, MUA.giaTri[0].code), true);
          await choToast(p, /Đã lưu .* chung của nhóm/);
          const g = (await goiTrongTrang(p, "GET", "/api/catalog/dac-diem")).json.nhom.find((x) => x.code === G.code);
          assert.equal(g.giaTri[MUA.code], MUA.giaTri[0].code, "máy chủ lưu giá trị chung");
          await bocucSach(p, `bước 3 ${kho}`);
          await axeKiem(p, `bước 3 ${kho}`);
          await chup(p, `dac-diem-3-theo-nhom-${tenKho}`);
        });

        await buoc(`4${kho}`, "Tắt giá trị còn nhóm mang ⇒ hộp xác nhận ⇒ câu 409 của máy chủ; vẫn «Đang dùng». 4b: «Sửa» tên giá trị có luật ⇒ cảnh báo", async () => {
          assert.ok(MUA);
          await chuyenThe(p, "dinh-nghia");
          const cao = MUA.giaTri[0].code;
          assert.equal(await nutDinhNghia(p, cao, "tat"), true, "nút «Tắt» của «Cao điểm»");
          await choHop(p);
          assert.match(await chuHop(p), /không gắn được cho dịch vụ hay nhóm nào/);
          assert.equal(await bamHop(p, "Tắt"), true);
          await choDongHop(p);
          await choToast(p, /còn 1 dịch vụ hoặc nhóm đang mang/);
          await p.waitFor(`document.querySelector('#dd-the-dinh-nghia [data-gia-tri="${cao}"] .huy-hieu')?.textContent === 'Đang dùng'`, "vẫn đang dùng");
          await chup(p, `dac-diem-4-tat-409-${tenKho}`);
          // 4b — đổi tên «Không gồm» (có luật trỏ tới)
          assert.equal(await nutDinhNghia(p, KHONG.code, "sua"), true, "nút «Sửa» của «Không gồm»");
          await choHop(p);
          assert.equal(await chonO(p, "#dd-sua-ten", "Không bao gồm"), true);
          await p.waitFor("!document.querySelector('.sheet .sheet-warn').hidden", "cảnh báo đổi tên");
          assert.match(await p.ev("document.querySelector('.sheet .sheet-warn').textContent"), /^Giá trị «Không gồm» đang có 1 luật bán trỏ tới/);
          await bocucSach(p, `bước 4b hộp ${kho}`);
          await axeKiem(p, `bước 4b hộp ${kho}`);
          await chup(p, `dac-diem-4b-doi-ten-${tenKho}`, false);
          assert.equal(await bamHop(p, "Huỷ"), true);
          await choDongHop(p);
        });

        await buoc(`5${kho}`, "Bật lại «Tắt sẵn» ⇒ hộp «Còn 1 luật bán trỏ tới giá trị này…» (tiêu chí 17b) ⇒ «Đang dùng»", async () => {
          assert.equal(await trangThaiGt(p, TAT.code), "Đã tắt");
          assert.equal(await nutDinhNghia(p, TAT.code, "bat"), true, "nút «Bật lại»");
          await choHop(p).catch(() => { throw new Error("không có hộp cảnh báo khi bật lại"); });
          assert.match(await chuHop(p), new RegExp(`Còn 1 luật bán trỏ tới giá trị này, sẽ chặn ${L.ten} khi giá trị được gắn lại cho dịch vụ\\.`));
          await axeKiem(p, `bước 5 hộp ${kho}`);
          await chup(p, `dac-diem-5-bat-lai-${tenKho}`, false);
          assert.equal(await bamHop(p, "Bật lại"), true);
          await choDongHop(p);
          await p.waitFor(`document.querySelector('#dd-the-dinh-nghia [data-gia-tri="${TAT.code}"] .huy-hieu')?.textContent === 'Đang dùng'`, "đã bật lại");
          await bocucSach(p, `bước 5 ${kho}`);
        });
        if (p.consoleErrors.length) console.log(`    (console Quản trị ${kho}: ${p.consoleErrors.join(" | ").slice(0, 200)})`);
      } finally {
        p.close();
      }
    }

    // ======================= Bán hàng (mở sau cùng) =======================
    {
      const p = await moTrang(ACCOUNTS.salesA, "/account", vp, { them: THEM });
      try {
        await buoc(`6${kho}`, "Bán hàng: có lối vào, không có «Theo nhóm», «Định nghĩa»; đổi TD101 «Không gồm» → «Gồm» ⇒ hộp «sẽ bỏ chặn …» (CV-8), lưu được", async () => {
          await p.waitFor("document.querySelectorAll('a[href]').length > 3", "khung trang Tôi");
          await sleep(500);
          assert.equal(await coLoiVao(p, "/dac-diem-dich-vu"), true);
          await diToi(p, env, "/dac-diem-dich-vu");
          await choTrang(p);
          assert.deepEqual(await p.ev("[...document.querySelectorAll('#dd-noi-dung [role=tab]')].filter((t) => !t.hidden).map((t) => t.textContent.replace(/ \\(\\d+\\)$/, ''))"), ["Gắn cho dịch vụ", "Chưa khai", "Mới, đang theo nhóm"]);
          assert.equal(await p.ev("!!document.querySelector('#dd-the-dinh-nghia button, #dd-the-nhom select')"), false, "không dựng nút định nghĩa / ô theo nhóm");
          assert.equal(await chonTrong(p, oCua("gan", "TD101", A.code), GOM.code), true, "ô TD101 × A");
          await choHop(p);
          assert.equal(await chuHop(p).then((t) => t.includes(`Đổi giá trị này sẽ bỏ chặn «Tour 4 đảo Nha Trang» cho: ${L.ten}.`)), true, "câu CV-8");
          await bocucSach(p, `bước 6 hộp ${kho}`);
          await axeKiem(p, `bước 6 hộp ${kho}`);
          await chup(p, `dac-diem-6-canh-bao-cv8-${tenKho}`, false);
          assert.equal(await bamHop(p, "Vẫn lưu"), true);
          await choDongHop(p);
          await choToast(p, /Đã lưu/);
          const dv = (await goiTrongTrang(p, "GET", "/api/catalog/dac-diem")).json.dichVu.find((d) => d.code === "TD101");
          assert.deepEqual(dv.giaTri[A.code], { valueCode: GOM.code, nguon: "SERVICE" });
          await bocucSach(p, `bước 6 ${kho}`);
          await axeKiem(p, `bước 6 ${kho}`);
          await chup(p, `dac-diem-6-ban-hang-${tenKho}`);
        });

        await buoc(`7${kho}`, "Số «chưa khai» (thẻ; huy hiệu thanh bên ở 1040) khớp máy chủ, giảm 1 sau khi khai đủ một dịch vụ", async () => {
          const dem = async () => (await goiTrongTrang(p, "GET", "/api/catalog/dac-diem/dem-chua-khai")).json.soChuaKhai;
          const n0 = await dem();
          assert.ok(n0 > 0, "có dịch vụ chưa khai");
          assert.equal(await p.ev("document.getElementById('dd-tab-chua-khai').textContent"), `Chưa khai (${n0})`);
          if (!vp.mobile) assert.equal(await p.ev("document.querySelector('a[href=\"/dac-diem-dich-vu\"] .sidebar-item-badge')?.textContent ?? null"), String(n0), "huy hiệu thanh bên");
          const man = (await goiTrongTrang(p, "GET", "/api/catalog/dac-diem")).json;
          const dung = man.dacDiem.filter((a) => a.dangDung);
          const dv = dung.flatMap((a) => a.chuaKhai)[0];
          await chuyenThe(p, "chua-khai");
          for (const a of dung.filter((x) => x.chuaKhai.includes(dv))) {
            const v = a.giaTri.find((x) => x.dangDung && x.code !== KHONG.code)?.code ?? a.giaTri.find((x) => x.dangDung).code;
            assert.equal(await chonTrong(p, oCua("chua-khai", dv, a.code), v), true, `ô ${dv} × ${a.ten}`);
            await sleep(400);
            if (await p.ev("!!document.querySelector('.sheet-root')")) { assert.equal(await bamHop(p, "Vẫn lưu"), true); await choDongHop(p); }
            const ten = `Đã lưu «${a.ten}» của`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            await choToast(p, new RegExp(ten));
            await sleep(300);
          }
          await p.waitFor(`document.getElementById('dd-tab-chua-khai').textContent === 'Chưa khai (${n0 - 1})'`, `thẻ «Chưa khai (${n0 - 1})»`, 10000);
          assert.equal(await dem(), n0 - 1, "máy chủ giảm 1");
          await bocucSach(p, `bước 7 ${kho}`);
          await axeKiem(p, `bước 7 ${kho}`);
          await chup(p, `dac-diem-7-chua-khai-${tenKho}`);
          if (!vp.mobile) {
            await diToi(p, env, "/dac-diem-dich-vu");
            await choTrang(p);
            await p.waitFor(`document.querySelector('a[href="/dac-diem-dich-vu"] .sidebar-item-badge')?.textContent === '${n0 - 1}'`, "huy hiệu giảm 1", 10000);
          }
        });
        if (p.consoleErrors.length) console.log(`    (console Bán hàng ${kho}: ${p.consoleErrors.join(" | ").slice(0, 200)})`);
      } finally {
        p.close();
      }
    }
  }
} finally {
  await env.stop();
}
ketThuc("DAC DIEM");

// Kịch bản Chrome Việc 9 (21/11/2026) — «quét vé đã sử dụng thì Nền tảng bị treo». Camera GIẢ của Chrome chiếu liên tục một tệp Y4M có mã QR của vé A
// (cờ --use-fake-device-for-media-stream --use-file-for-fake-video-capture), nên tái hiện được tình huống «vé vẫn nằm trước camera sau «Quét tiếp»» không cần iPhone.
// D1 tạm (startEnv), không chạm production. Mã vé A do kịch bản sinh ngẫu nhiên (như trình duyệt người tạo vé), KHÔNG in ra màn hình.
// Chạy từ gốc kho sau `npm run build:web`:
//   AXE_JS=$PWD/node_modules/axe-core/axe.min.js OUT=<thư mục ảnh, ngoài kho> node docs/evidence/2026-11-21-quet-ve-treo/kich-ban/quet-ve-treo-smoke.mjs
// QV_CHI_BUOC=2: chỉ chạy tới bước 2 (dùng khi phá thử P16 với mã cũ: bước 2 phải ĐỎ vì mốc 3 giây trượt mãi).
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const W = process.cwd();
const OUT = process.env.OUT ?? join(W, "docs/evidence/2026-11-21-quet-ve-treo/anh");
mkdirSync(OUT, { recursive: true });
const CHI_BUOC = Number(process.env.QV_CHI_BUOC ?? 99);
const { default: qrcode } = await import(`${W}/web/vendor/qrcode.js`);

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const MA_A = "TD1." + Array.from(randomBytes(26), (b) => B32[b % 32]).join("");

/** Ma trận QR của `chuoi`: hàm (hàng, cột) → tối, và số ô. */
function maTran(chuoi) {
  const qr = qrcode(0, "M");
  qr.addData(chuoi, "Byte");
  qr.make();
  return { so: qr.getModuleCount(), toi: (r, c) => qr.isDark(r, c) };
}

/** Vẽ QR lên mặt phẳng xám `mat` (rong × cao), cạnh mã ≈ `ti` × cạnh ngắn, nền vé trắng có lề 4 ô. Trả mặt phẳng. */
function veQr(mat, rong, cao, chuoi, ti, toi = 16, trang = 235) {
  const { so, toi: laToi } = maTran(chuoi);
  const co = Math.floor((Math.min(rong, cao) * ti) / (so + 8));
  const canh = (so + 8) * co;
  const x0 = (rong - canh) >> 1;
  const y0 = (cao - canh) >> 1;
  for (let y = 0; y < canh; y++) for (let x = 0; x < canh; x++) {
    const r = Math.floor(y / co) - 4;
    const c = Math.floor(x / co) - 4;
    mat[(y0 + y) * rong + x0 + x] = r >= 0 && c >= 0 && r < so && c < so && laToi(r, c) ? toi : trang;
  }
  return mat;
}

/** Tệp Y4M (I420) hai khung giống nhau: vé A giữa khung hình 640×480 trên nền xám. Chrome lặp lại tệp ⇒ vé luôn nằm trước camera. */
function taoY4m(duong, chuoi) {
  const rong = 640;
  const cao = 480;
  const y = veQr(Buffer.alloc(rong * cao, 150), rong, cao, chuoi, 0.8);
  const uv = Buffer.alloc((rong / 2) * (cao / 2) * 2, 128);
  const khung = Buffer.concat([Buffer.from("FRAME\n"), y, uv]);
  writeFileSync(duong, Buffer.concat([Buffer.from(`YUV4MPEG2 W${rong} H${cao} F10:1 Ip A1:1 C420jpeg\n`), khung, khung]));
}

const CRC = Array.from({ length: 256 }, (_x, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const khoiPng = (loai, du) => { const dai = Buffer.alloc(4); dai.writeUInt32BE(du.length); const td = Buffer.concat([Buffer.from(loai), du]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([dai, td, c]); };
/** Ảnh PNG xám 4032×3024 (cỡ ảnh chụp 12 MP của iPhone), mã chiếm ~1/3 cạnh ngắn — dùng cho «Chụp ảnh mã vé» (phải thu nhỏ trước khi đọc). */
function taoPngLon(chuoi) {
  const rong = 4032;
  const cao = 3024;
  const mat = veQr(Buffer.alloc(rong * cao, 180), rong, cao, chuoi, 0.34);
  const tho = Buffer.alloc((rong + 1) * cao);
  for (let y = 0; y < cao; y++) mat.copy(tho, y * (rong + 1) + 1, y * rong, (y + 1) * rong);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(rong, 0); ihdr.writeUInt32BE(cao, 4); ihdr[8] = 8; ihdr[9] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), khoiPng("IHDR", ihdr), khoiPng("IDAT", deflateSync(tho)), khoiPng("IEND", Buffer.alloc(0))]);
}

// Camera giả: tệp bọc Chrome thêm ba cờ (cấp quyền camera tự động, thiết bị giả, khung hình từ tệp). Phải đặt CHROME_BIN TRƯỚC khi nạp bộ khung (a2-cdp đọc lúc nạp).
const y4m = join(OUT, "ve-a.y4m");
taoY4m(y4m, MA_A);
const boc = join(OUT, "chrome-camera-gia.sh");
writeFileSync(boc, `#!/bin/sh\nexec "${process.env.CHROME_GOC ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}" --use-fake-ui-for-media-stream --use-fake-device-for-media-stream "--use-file-for-fake-video-capture=${y4m}" "$@"\n`);
chmodSync(boc, 0o755);
process.env.CHROME_BIN = boc;

const L = await import(`${W}/docs/evidence/2026-10-30-luat-ban-dac-diem/kich-ban/lb-chung.mjs`);
const { ACCOUNTS, MOB, axeKiem, bam, bocucSach, buoc, chup, goiApi, ketThuc, sleep, startEnv, taoMoTrang, vnDate } = L;

/** Bọc fetch của trang cho riêng `POST /api/ve/quet`: đếm lần gửi, và giả lập ba kiểu mạng hỏng theo `window.__cheDoMang`. */
const BOC_FETCH = `(() => {
  const goc = window.fetch.bind(window);
  window.__cheDoMang = ''; window.__soLanGui = 0;
  window.fetch = (u, init) => {
    const url = String(u && u.url ? u.url : u);
    if (/\\/api\\/ve\\/quet$/.test(url) && (init && init.method) === 'POST') {
      window.__soLanGui++;
      const m = window.__cheDoMang;
      if (m === 'treo') return new Promise((_x, rej) => init.signal && init.signal.addEventListener('abort', () => rej(new DOMException('The operation was aborted.', 'AbortError'))));
      if (m === 'mat-phan-hoi') { window.__cheDoMang = ''; return goc(u, init).then(() => { throw new TypeError('Failed to fetch'); }); } // chỉ lần đầu: máy chủ đã ghi, phản hồi mất
    }
    return goc(u, init);
  };
})();`;

const env = await startEnv();
try {
  const { call } = goiApi(env);
  const ghi = (nhan, r, ma = 200) => assert.ok(r.status === ma || (ma === 200 && r.status === 201), `${nhan}: ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`);
  // Dựng: TD101 có vé, vé do Tour Đảo phát; một lô một vé (vé A); đơn hôm nay một người lớn, không đón, đã xác nhận, thu đủ, mở vé.
  ghi("có vé TD101", await call(ACCOUNTS.admin, "POST", "/api/catalog/co-ve", { pham: "SERVICE", ma: "TD101", coVe: true }));
  ghi("nguồn TD101", await call(ACCOUNTS.chu, "POST", "/api/catalog/nguon-ve", { ma: "TD101", nguon: "TOUR_DAO" }));
  const lo = await call(ACCOUNTS.accounting, "POST", "/api/ve/lo", { catalogCode: "TD101", nhomKhach: "ADULT", tenSanPham: "Vé thử quét treo", nguon: "TOUR_DAO", soVeDuKien: 1 });
  ghi("mở lô", lo, 201);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, 9, 9, ...randomBytes(20)]).toString("base64");
  ghi("thêm vé A", await call(ACCOUNTS.accounting, "POST", `/api/ve/lo/${lo.json.loId}/ve`, { ve: [{ noiDung: png, maVe: MA_A, tuNgay: vnDate(-1), denNgay: vnDate(30), soSeri: lo.json.soSeri[0] }] }));
  ghi("xác nhận lô", await call(ACCOUNTS.accounting, "POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, {}));
  const don = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: "Khách Quét Treo", customerPhone: "0913571369", customerEmail: "", customerNote: "", discount: 0, paymentNote: "",
    services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "TD101", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 },
      departDate: vnDate(0), departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }],
  });
  ghi("lập đơn", don, 201);
  ghi("xác nhận đơn", await call(ACCOUNTS.salesA, "POST", `/api/orders/${don.json.order.id}/status`, { status: "confirmed" }));
  ghi("thu đủ", await call(ACCOUNTS.accounting, "POST", `/api/orders/${don.json.order.id}/payments`, { soTien: don.json.order.total, hinhThuc: "CASH", nguoiThu: "cong_ty" }), 201);
  ghi("mở vé", await call(ACCOUNTS.salesA, "POST", "/api/ve/giao", { orderId: don.json.order.id, requestId: crypto.randomUUID() }));
  const [veA] = env.sql(`SELECT t.ticket_code AS ma FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id WHERE a.order_id = '${don.json.order.id}' AND a.released_at IS NULL`);
  assert.equal(veA?.ma === MA_A, true, "đơn giữ đúng vé A");

  const moTrang = taoMoTrang(env);
  const p = await moTrang(ACCOUNTS.admin, "/quet-ve", MOB, { them: BOC_FETCH });
  const ketQua = () => p.ev("(() => { const k = document.getElementById('qv-ket-qua'); const t = k.querySelector('.qv-ket-than'); return k.hidden || !t ? null : { mau: t.dataset.mau, chu: k.innerText }; })()");
  const choKetQua = async (mau, ms) => { const bd = Date.now(); await p.waitFor(`(() => { const t = document.querySelector('#qv-ket-qua:not([hidden]) .qv-ket-than'); return !!t && t.dataset.mau === ${JSON.stringify(mau)}; })()`, `kết quả ${mau}`, ms); return Date.now() - bd; };
  const bamChu = (chu) => p.ev(`(() => { const b = [...document.querySelectorAll('#qv-ket-qua button, #qv-nhac button')].find((x) => x.textContent === ${JSON.stringify(chu)} && x.offsetParent !== null); if (!b) return false; b.click(); return true; })()`);
  const soLanGui = () => p.ev("window.__soLanGui");

  await buoc("1", "Mở Quét vé, bật camera giả: đọc vé A, hiện xanh «Hợp lệ»", async () => {
    await p.waitFor("!document.getElementById('qv-noi-dung').hidden", "nội dung trang quét");
    await p.ev("window.__dau = 'chua-tai-lai'; true");
    assert.equal(await bam(p, "#qv-bat"), true);
    await choKetQua("XANH", 15_000);
    assert.equal(await soLanGui(), 1);
    await chup(p, "1-xanh", false);
  });

  await buoc("2", "«Quét tiếp», vé A vẫn trước camera: có dòng nhắc, rồi ≤ 4 giây hiện đỏ «đã dùng» — không treo (lỗi chủ báo 21/11)", async () => {
    assert.equal(await bamChu("Quét tiếp"), true);
    const bd = Date.now();
    if (await p.ev("!!document.getElementById('qv-nhac')")) { // mã cũ (phá thử P16) không có dòng nhắc: chỉ đo có hiện đỏ hay không
      await p.waitFor("!document.getElementById('qv-nhac').hidden", "dòng nhắc vé vừa quét", 2000);
      await chup(p, "2a-dong-nhac", false);
      await axeKiem(p, "dòng nhắc");
      // Ô chọn tệp #qv-anh là ô ẩn (trong suốt, aria-hidden, tabindex -1) do nút «Chụp ảnh mã vé» mở hộ — không phải vùng chạm; ẩn tạm khi đo vùng chạm.
      await p.ev("document.getElementById('qv-anh').style.display = 'none'; true");
      await bocucSach(p, "dòng nhắc");
      await p.ev("document.getElementById('qv-anh').style.display = ''; true");
    }
    await choKetQua("DO", 8000);
    const ms = Date.now() - bd;
    console.log(`    đỏ «đã dùng» sau ${ms} ms kể từ «Quét tiếp»; số lần gửi ${await soLanGui()}`);
    assert.ok(ms <= 4000, `hiện đỏ sau ${ms} ms`);
    assert.match((await ketQua()).chu, /dùng/i);
    await chup(p, "2b-do-da-dung", false);
  });

  if (CHI_BUOC > 2) {
    await buoc("3", "Dòng nhắc có «Quét lại vé này»: bấm thì gửi ngay, không chờ hết 3 giây", async () => {
      assert.equal(await bamChu("Quét tiếp"), true);
      await p.waitFor("!document.getElementById('qv-nhac').hidden", "dòng nhắc", 2000);
      const truoc = await soLanGui();
      const bd = Date.now();
      assert.equal(await bamChu("Quét lại vé này"), true);
      await choKetQua("DO", 3000);
      assert.ok(Date.now() - bd < 2500, `«Quét lại vé này» mất ${Date.now() - bd} ms`);
      assert.equal(await soLanGui(), truoc + 1);
    });

    await buoc("4", "Mất mạng (Chrome ngoại tuyến): ≤ 15 giây hiện «Không gửi được» + «Thử lại»; có mạng lại, bấm «Thử lại» ra kết quả, trang không tự tải lại", async () => {
      await p.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      const truoc = await soLanGui();
      const bam0 = Date.now();
      assert.equal(await bamChu("Quét tiếp"), true);
      await p.waitFor(`window.__soLanGui > ${truoc}`, "bắt đầu gửi (hết mốc 3 giây)", 5000);
      const bd = Date.now();
      await choKetQua("LOI", 16_000);
      const ms = Date.now() - bd;
      const chu = (await ketQua()).chu;
      console.log(`    «Không gửi được» sau ${ms} ms kể từ lần gửi đầu (${Date.now() - bam0} ms kể từ «Quét tiếp»); gửi ${(await soLanGui()) - truoc} lần`);
      assert.ok(ms <= 15_000, `hiện sau ${ms} ms`);
      assert.match(chu, /Không gửi được/);
      await chup(p, "4a-khong-gui-duoc", false);
      await axeKiem(p, "màn Không gửi được");
      await p.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      await sleep(300);
      assert.equal(await bamChu("Thử lại"), true);
      await choKetQua("DO", 8000);
      assert.equal(await p.ev("window.__dau"), "chua-tai-lai", "trang đã tự tải lại");
      await chup(p, "4b-thu-lai-ra-ket-qua", false);
    });

    await buoc("5", "Máy chủ im lặng (yêu cầu treo): mỗi lần chờ ngắn, ≤ 15 giây hiện «Không gửi được»", async () => {
      await p.ev("window.__cheDoMang = 'treo'; true");
      const truoc = await soLanGui();
      assert.equal(await bamChu("Quét tiếp"), true);
      await p.waitFor(`window.__soLanGui > ${truoc}`, "bắt đầu gửi", 5000);
      const bd = Date.now();
      await choKetQua("LOI", 17_000);
      const ms = Date.now() - bd;
      console.log(`    «Không gửi được» sau ${ms} ms; gửi ${(await soLanGui()) - truoc} lần`);
      assert.ok(ms <= 15_000, `hiện sau ${ms} ms`);
      await p.ev("window.__cheDoMang = ''; true");
      assert.equal(await bamChu("Quét tiếp"), true);
    });

    await buoc("6", "«Chụp ảnh mã vé» khi camera đang bật: camera tắt trước; ảnh 4032×3024 được thu nhỏ, đọc ra mã, hiện kết quả", async () => {
      assert.equal(await p.ev("!!document.getElementById('qv-video').srcObject"), true, "camera đang bật");
      await p.send("Page.setInterceptFileChooserDialog", { enabled: true });
      assert.equal(await bam(p, "#qv-chup"), true);
      assert.equal(await p.ev("document.getElementById('qv-video').srcObject === null && document.getElementById('qv-bat').textContent === 'Bật camera'"), true, "camera chưa tắt");
      const tep = join(OUT, "anh-ve-12mp.png");
      writeFileSync(tep, taoPngLon(MA_A));
      const { result: { root } } = await p.send("DOM.getDocument", {});
      const { result: { nodeId } } = await p.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#qv-anh" });
      const bd = Date.now();
      await p.send("DOM.setFileInputFiles", { nodeId, files: [tep] });
      await choKetQua("DO", 10_000);
      console.log(`    ảnh 12 MP: kết quả sau ${Date.now() - bd} ms`);
      await chup(p, "6-chup-anh", false);
      assert.equal(await bamChu("Quét tiếp"), true);
    });

    await buoc("7", "Camera bị dừng ngoài ý trang (sự kiện ended): báo «Camera đã dừng», nút về «Bật camera»", async () => {
      await sleep(1500); // camera giả của Chrome cần một lúc để nhả thiết bị sau khi tắt (bước 6); mở lại ngay từng báo «Không mở được camera» một lần
      assert.equal(await bam(p, "#qv-bat"), true);
      await p.waitFor("document.getElementById('qv-bat').textContent === 'Tắt camera'", "camera bật lại", 8000);
      await p.ev("document.getElementById('qv-video').srcObject.getVideoTracks()[0].dispatchEvent(new Event('mute')); true");
      assert.match(await p.ev("document.getElementById('qv-trang-thai').textContent"), /tạm dừng/);
      await p.ev("document.getElementById('qv-video').srcObject.getVideoTracks()[0].dispatchEvent(new Event('ended')); true");
      assert.match(await p.ev("document.getElementById('qv-trang-thai').textContent"), /Camera đã dừng/);
      assert.equal(await p.ev("document.getElementById('qv-bat').textContent"), "Bật camera");
      await chup(p, "7-camera-dung");
    });

    // Việc 9 phần (d) — chủ 23/11 «Đồng ý khuyến nghị việc 9», ADR-0175 dòng lịch sử 2026-11-23. Mã trước phần (d): bước này ghi nhận trang TỰ TẢI LẠI
    // (lớp chống ghi trùng ADR-0094 «phát lại thì tải lại trang») — đó là lần quan sát đỏ của bài này (P16).
    await buoc("8", "Mất phản hồi sau khi máy chủ đã ghi ⇒ tự gửi lại cùng vé ⇒ ≤ 3 giây hiện «Lần quét trước đã được ghi»; trang KHÔNG tải lại, camera vẫn chạy", async () => {
      await sleep(1500);
      await p.ev("window.__cheDoMang = 'mat-phan-hoi'; true");
      const truoc = await soLanGui();
      assert.equal(await bam(p, "#qv-bat"), true);
      await p.waitFor(`window.__soLanGui > ${truoc}`, "bắt đầu gửi", 8000);
      const bd = Date.now();
      await choKetQua("DA_GHI", 5000);
      const ms = Date.now() - bd;
      console.log(`    «Lần quét trước đã được ghi» sau ${ms} ms kể từ lần gửi đầu; gửi ${(await soLanGui()) - truoc} lần`);
      assert.ok(ms <= 3000, `hiện sau ${ms} ms`);
      assert.match((await ketQua()).chu, /Lần quét trước đã được ghi/);
      await sleep(2500); // cách cũ tải lại sau 1,2 giây: chờ quá mốc đó rồi mới kết luận
      assert.equal(await p.ev("window.__dau"), "chua-tai-lai", "trang đã tự tải lại");
      assert.equal(await p.ev("!!document.getElementById('qv-video').srcObject && document.getElementById('qv-bat').textContent === 'Tắt camera'"), true, "camera không còn chạy");
      await chup(p, "8-da-ghi-truoc-do", false);
      await axeKiem(p, "màn Lần quét trước đã được ghi");
    });

    await buoc("8b", "«Quét tiếp», vé A vẫn trước camera: ≤ 4 giây ra kết quả thật (đỏ «đã dùng»), vẫn không tải lại", async () => {
      assert.equal(await bamChu("Quét tiếp"), true);
      const bd = Date.now();
      await choKetQua("DO", 8000);
      const ms = Date.now() - bd;
      console.log(`    đỏ «đã dùng» sau ${ms} ms kể từ «Quét tiếp»`);
      assert.ok(ms <= 4000, `hiện đỏ sau ${ms} ms`);
      assert.match((await ketQua()).chu, /dùng/i);
      assert.equal(await p.ev("window.__dau"), "chua-tai-lai", "trang đã tự tải lại");
    });
  }
  await p.close?.();
} finally {
  await env.stop();
}
ketThuc("QUÉT VÉ TREO");

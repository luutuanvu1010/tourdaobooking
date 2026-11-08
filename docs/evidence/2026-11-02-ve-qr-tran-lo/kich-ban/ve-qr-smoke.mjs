// Kịch bản Chrome — nhập vé bằng QR, trần lô, Bỏ lô (ADR-0156, tiêu chí nghiệm thu 1, 3, 4, 5, 8, 9).
// Sửa 2026-11-09 (Đợt 1, N4): các khẳng định «Đã nhập N vé vào kho.» nay so phần đầu câu — từ ADR-0174 («Có vé») máy nối thêm câu nói dịch vụ đang tắt ô «Có vé» khi dịch vụ thử chưa bật ô đó.
// Rào DUY NHẤT cho phần đọc QR trên trình duyệt (Đ1): `npm test` và e2e không mở trang, nên không biết bộ đọc có chạy trong gói thật không.
// Ảnh thử do bộ vẽ QR có sẵn (web/vendor/qrcode.js) vẽ NGAY TRONG TRANG thành tệp thật; không có ảnh vé thật trong kho mã. Riêng khối «anh-that» (tuỳ chọn) đọc ảnh thật trên máy,
// chặn mọi lời gọi ghi trong trang nên ảnh và mã không rời trình duyệt, không chụp màn hình, không in chuỗi nào.
// Thứ tự tài khoản (kho cookie dùng chung, đóng trang trước khi mở tài khoản khác): Kế toán → Quản trị → Bán hàng → Toàn quyền → Bán hàng.
// Bước (mỗi khổ 390 và 1040; bước 50 ảnh chỉ khổ 1040):
//   1  Kế toán: không có lối vào; mở thẳng hai trang ⇒ câu tiếng Việt, không thấy nội dung.
//   2  Quản trị: có Vé điện tử, không có Cài đặt vé điện tử; mở thẳng bị từ chối; PUT 403.
//   3  Bán hàng: như Quản trị.
//   4  Toàn quyền đổi 50 → 30: tải lại vẫn 30; nhật ký có số cũ, số mới; trang nhập lô theo 30; chọn 31 ảnh ⇒ báo ngay, không tạo lô; về 50, chọn 51 ảnh ⇒ báo ngay, không tạo lô.
//   5  Bán hàng: hai ảnh tốt + ảnh không có mã + tệp không phải ảnh ⇒ hai vé vào kho, hai tệp bị loại kèm tên; không lộ chuỗi QR.
//   6  Bản nén lại của vé đã nhập (tệp khác, cùng QR) ⇒ bị loại, kho không đổi, không để lại lô trống. Đây là ca quyết định Đ1 có hiệu lực (P16).
//   7  Hai ảnh cùng QR trong một lần chọn ⇒ một vào, một bị loại ngay trên trang.
//   8  «Huỷ lô» từ danh sách qua hộp xác nhận ⇒ kho giảm; nhập lại đúng các ảnh đó ⇒ vào kho.
//  9b  Mở ảnh vé của lô đã huỷ qua hộp báo trước ⇒ ảnh hiện; nhập lại vé đó bị loại.
//   9  Gửi dở (đưa lô vào kho thất bại) ⇒ trang chỉ đường «Huỷ lô», lô hiện «đang dở»; bỏ rồi nhập lại được.
//   10 50 ảnh cỡ vé thật liên tiếp ⇒ trang không treo; đo tổng thời gian và khoảng đứng hình lâu nhất.
// Chạy (từ gốc repo, sau `npm run build:web`):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-11-02-ve-qr-tran-lo/kich-ban/ve-qr-smoke.mjs
// Cuối: "VE QR SMOKE OK" hoặc danh sách bước đỏ (thoát 1). LB_KHO=390|1040 chạy một khổ. VE_ANH_THAT=<thư mục ảnh> bật khối ảnh thật.
// PHÁ THỬ (P16, KHÔNG sửa mã sản phẩm): LB_PHA=qr-gia — lớp bọc `fetch` thay mã vé bằng chuỗi ngẫu nhiên (giả một trang không đọc QR) ⇒ bước 6 ĐỎ.
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import qrcode from "../../../../web/vendor/qrcode.js";

process.env.OUT ??= join(process.cwd(), "docs/evidence/2026-11-02-ve-qr-tran-lo/anh");
const { ACCOUNTS, KHO, PHA, axeKiem, bam, bocucSach, buoc, choDongHop, choHop, chonO, chup, diToi, goiApi, goiTrongTrang, ketThuc, sleep, startEnv, taoMoTrang, vnDate } = await import("../../2026-10-30-luat-ban-dac-diem/kich-ban/lb-chung.mjs");

/** Bọc lời gọi vào trang: trang đứng hẳn hoặc sập thì CDP không bao giờ trả lời, nên phải có giờ giới hạn riêng để thành bước đỏ thay vì kẹt cả kịch bản. */
const coGio = (ms, nhan, viec) => { let t; return Promise.race([viec, new Promise((_, huy) => { t = setTimeout(() => huy(new Error(`quá ${ms / 1000} giây: ${nhan}`)), ms); })]).finally(() => clearTimeout(t)); };
const DICH_VU = "TD101";
const CAU_CHAN_KHO = "Trang Vé điện tử chỉ Bán hàng, Quản trị và Toàn quyền dùng được.";
const CAU_CHAN_CAI_DAT = "Trang này chỉ Toàn quyền dùng được.";
const DAU_QR = ("7".repeat(30) + Date.now()).slice(-30);
/** Chuỗi 36 chữ số giả, cùng dạng vé thật. */
const chuoiQr = (n) => DAU_QR + String(n).padStart(6, "0");
const maTran = (chuoi) => {
  const qr = qrcode(0, "M");
  qr.addData(chuoi, "Byte");
  qr.make();
  const so = qr.getModuleCount();
  return Array.from({ length: so }, (_, r) => Array.from({ length: so }, (_, c) => (qr.isDark(r, c) ? 1 : 0)));
};

/** Dựng tệp thật trong trang rồi đặt vào ô chọn ảnh. `mt` = ma trận QR; thiếu thì vẽ ảnh không có mã; `rac` = tệp đuôi ảnh nhưng không phải ảnh; `chu` = in chữ quanh mã như vé thật. */
const HAM_DAT_ANH = `window.__datAnh = async (ds) => {
  const dt = new DataTransfer();
  for (const a of ds) {
    let blob;
    if (a.rac) blob = new Blob(['day khong phai anh'], { type: 'image/jpeg' });
    else {
      const co = a.co ?? 6;
      const so = a.mt ? a.mt.length : 21;
      const rong = a.rong ?? (so + 8) * co;
      const cao = a.cao ?? rong;
      const cv = document.createElement('canvas');
      cv.width = rong; cv.height = cao;
      const x = cv.getContext('2d');
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, rong, cao);
      const lx = Math.floor((rong - so * co) / 2), ly = Math.floor((cao - so * co) / 2);
      if (a.mt) {
        x.fillStyle = '#000000';
        for (let r = 0; r < so; r++) for (let c = 0; c < so; c++) if (a.mt[r][c]) x.fillRect(lx + c * co, ly + r * co, co, co);
      } else {
        x.fillStyle = '#3399cc'; x.fillRect(8, 8, rong - 16, cao - 16);
      }
      if (a.chu) {
        x.fillStyle = '#333333'; x.font = '28px sans-serif';
        for (let y = 60; y < cao; y += 44) if (y < ly - 40 || y > ly + so * co + 40) x.fillText(a.chu, 40, y);
      }
      blob = await new Promise((xong) => cv.toBlob(xong, a.loai ?? 'image/png', a.chatLuong ?? 0.92));
      cv.width = 0; cv.height = 0;
    }
    dt.items.add(new File([blob], a.ten, { type: blob.type }));
  }
  const o = document.getElementById('vk-tep');
  o.files = dt.files;
  o.dispatchEvent(new Event('change', { bubbles: true }));
  return o.files.length;
}; true`;

/** Chỉ giả một trang không đọc QR: thân gửi vé bị thay mã. */
const PHA_QR_GIA = `{ const f = window.fetch.bind(window);
  window.fetch = (u, o) => { if (/\\/api\\/ve\\/lo\\/[^/]+\\/ve$/.test(String(u)) && o?.body) { const b = JSON.parse(o.body); for (const v of b.ve) v.maVe = 'GIA' + crypto.randomUUID().replaceAll('-', '').slice(0, 30); o = { ...o, body: JSON.stringify(b) }; } return f(u, o); }; }`;
const THEM = PHA === "qr-gia" ? PHA_QR_GIA : "";

const anhTot = (n, ten, them = {}) => ({ ten, mt: maTran(chuoiQr(n)), ...them });
/** Cùng QR, tệp khác hẳn: khác cỡ ô, nén JPEG 55%. */
const banNenLai = (n, ten) => ({ ten, mt: maTran(chuoiQr(n)), co: 8, loai: "image/jpeg", chatLuong: 0.55 });

const chonAnh = async (p, ds) => {
  await p.ev(HAM_DAT_ANH);
  assert.equal(await coGio(120000, "dựng ảnh thử trong trang", p.ev(`__datAnh(${JSON.stringify(ds)})`)), ds.length, "số tệp đã đặt vào ô chọn");
};
const dien = (p, sel, v) => p.ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('input', { bubbles: true })); return e.value === ${JSON.stringify(v)}; })()`);
// N4 (9/11/2026): dịch vụ chọn bằng khung của Tạo đơn (ô tìm + hàng nhóm + danh sách dòng), không còn hộp thả xuống `#vk-dich-vu option`: đợi có dòng `.catalog-row`, chọn bằng cách chạm dòng theo mã.
const choFormVe = (p) => p.waitFor("!!document.querySelector('#vk-form') && document.querySelectorAll('#vk-dich-vu .catalog-row').length > 1 && !document.getElementById('vk-kho').textContent.includes('Đang tải')", "trang nhập lô đã dựng xong");
/** Khai lô (dịch vụ, loại khách, tên riêng để tìm lại trong danh sách, ngày). */
const khaiLo = async (p, tenSp) => {
  // Lô bị loại hết (bước 6…) không xoá lựa chọn: khung còn thu lại ở dòng đã chọn → bấm «Đổi» để chọn lại, như người dùng thật.
  if (await p.ev("!!document.querySelector('#vk-dich-vu .catalog-da-chon')")) assert.equal(await bam(p, "#vk-dich-vu [data-action=doi-dich-vu]"), true, "nút Đổi của dịch vụ đã chọn");
  assert.equal(await bam(p, `#vk-dich-vu .catalog-row[data-ma="${DICH_VU}"] .catalog-pick`), true, "chạm dòng dịch vụ trong khung chọn");
  await p.waitFor(`!!document.querySelector('#vk-dich-vu .catalog-da-chon[data-ma="${DICH_VU}"]')`, "khung thu lại thành dòng dịch vụ đã chọn");
  assert.equal(await chonO(p, "#vk-nhom", "ADULT"), true, "chọn loại khách");
  assert.equal(await dien(p, "#vk-ten-sp", tenSp), true, "tên sản phẩm");
  assert.equal(await dien(p, "#vk-tu-ngay", vnDate(-1)), true, "từ ngày");
  assert.equal(await dien(p, "#vk-den-ngay", vnDate(60)), true, "đến ngày");
};
const guiLo = async (p) => {
  assert.equal(await bam(p, "[data-action=nhap-lo]"), true, "nút «Nhập lô vé»");
  await coGio(180000, "chờ nhập lô xong", p.waitFor("!document.querySelector('[data-action=nhap-lo]').disabled", "nhập lô xong", 170000));
  await sleep(300); // tải lại khối số vé + danh sách lô
};
const docTrang = (p) => p.ev(`(() => {
  const hien = (e) => (e && !e.hidden ? e.textContent.trim() : '');
  return { ok: hien(document.getElementById('ok')), loi: hien(document.querySelector('#vk-form p.alert')), trangThai: hien(document.querySelector('#vk-form p[role=status]')) };
})()`);
const conTrong = (p) => p.ev(`(() => { const e = document.querySelector('[data-khoi=ton-kho] li[data-ma=${DICH_VU}] p'); return e ? Number(/Còn trống (\\d+)/.exec(e.textContent)?.[1] ?? -1) : 0; })()`);
const soLo = async (p) => (await goiTrongTrang(p, "GET", "/api/ve/lo")).json.lo.length;
const khongLoQr = (p, nhan) => p.ev(`document.body.innerText.includes(${JSON.stringify(DAU_QR)}) || location.href.includes(${JSON.stringify(DAU_QR)})`).then((co) => assert.equal(co, false, `${nhan}: lộ chuỗi QR trên trang hoặc địa chỉ`));
/** Bấm «Bỏ lô» của lô có tên `tenSp`, qua hộp xác nhận. */
const boLo = async (p, tenSp) => {
  const trung = await p.ev(`(() => { const li = [...document.querySelectorAll('[data-khoi=cac-lo] li')].find((x) => x.textContent.includes(${JSON.stringify(tenSp)})); if (!li) return false; li.querySelector('[data-action=bo-lo]').click(); return true; })()`);
  assert.equal(trung, true, `lô «${tenSp}» có trong danh sách bỏ được`);
  await choHop(p);
  const ten = await p.ev("document.querySelector('.sheet .sheet-title')?.textContent ?? ''");
  assert.equal(ten, "Huỷ lô vé này?");
  assert.match(await p.ev("document.querySelector('.sheet').textContent"), /Ảnh được lưu thêm 3 ngày rồi tự xoá\./, "hộp nói đúng hạn lưu");
  assert.equal(await bam(p, ".sheet .btn-danger"), true, "nút «Huỷ lô» trong hộp");
  await choDongHop(p);
  await p.waitFor("document.getElementById('ok').textContent === 'Đã huỷ lô.'", "báo đã huỷ lô");
  await sleep(300);
};
// Máy tính: mục nằm trong khối thanh bên có thể đang gập nên hỏi «có trong trang», không hỏi «đang hiện». Điện thoại: trang Tôi hiện thẳng.
const coLoiVaoTrang = async (p, env, href, laDienThoai) => {
  if (laDienThoai) await diToi(p, env, "/account");
  await sleep(300);
  return p.ev(`document.querySelectorAll('a[href="${href}"]').length > 0`);
};

const env = await startEnv();
try {
  const { call } = goiApi(env);
  const moTrang = taoMoTrang(env);
  const phai = (r, status, nhan) => { assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };
  phai(await call(ACCOUNTS.admin, "GET", "/api/ve/kho"), 200, "kiểm kho đang bật");

  for (const [kho, vp] of KHO) {
    const laDienThoai = kho === "390";
    const tien = laDienThoai ? 1000 : 2000;

    let p = await moTrang(ACCOUNTS.accounting, "/", vp);
    await buoc(`${kho}.1`, "Kế toán: không có lối vào, mở thẳng hai trang bị từ chối bằng câu tiếng Việt", async () => {
      assert.equal(await coLoiVaoTrang(p, env, "/ve-kho", laDienThoai), false, "lối vào Vé điện tử");
      assert.equal(await coLoiVaoTrang(p, env, "/ve-cai-dat", laDienThoai), false, "lối vào Cài đặt vé điện tử");
      await diToi(p, env, "/ve-kho");
      await p.waitFor(`document.getElementById('error').textContent === ${JSON.stringify(CAU_CHAN_KHO)}`, "câu từ chối trang Vé điện tử");
      assert.equal(await p.ev("document.getElementById('vk-noi-dung').hidden"), true);
      await diToi(p, env, "/ve-cai-dat");
      await p.waitFor(`document.getElementById('error').textContent === ${JSON.stringify(CAU_CHAN_CAI_DAT)}`, "câu từ chối trang cài đặt");
      assert.equal(await p.ev("document.getElementById('vcd-noi-dung').hidden"), true);
      await bocucSach(p, "Kế toán /ve-cai-dat");
    });
    p.close();

    for (const [tai, ten] of [[ACCOUNTS.admin, "Quản trị"], [ACCOUNTS.salesB, "Bán hàng"]]) {
      p = await moTrang(tai, "/", vp);
      await buoc(`${kho}.${tai === ACCOUNTS.admin ? 2 : 3}`, `${ten}: có Vé điện tử, không có Cài đặt vé điện tử; mở thẳng và ghi thẳng đều bị từ chối`, async () => {
        assert.equal(await coLoiVaoTrang(p, env, "/ve-kho", laDienThoai), true, "lối vào Vé điện tử");
        assert.equal(await coLoiVaoTrang(p, env, "/ve-cai-dat", laDienThoai), false, "lối vào Cài đặt vé điện tử");
        await diToi(p, env, "/ve-cai-dat");
        await p.waitFor(`document.getElementById('error').textContent === ${JSON.stringify(CAU_CHAN_CAI_DAT)}`, "câu từ chối trang cài đặt");
        assert.equal((await goiTrongTrang(p, "PUT", "/api/ve/cai-dat", { tranLo: 5, version: 0 })).status, 403, "PUT");
        assert.equal((await goiTrongTrang(p, "GET", "/api/ve/cai-dat")).status, 403, "GET");
      });
      p.close();
    }

    p = await moTrang(ACCOUNTS.chu, "/", vp);
    await buoc(`${kho}.4`, "Toàn quyền đổi 50 → 30: nhật ký có số cũ, số mới; lô mới theo trần mới; vượt trần báo ngay, không tạo lô", async () => {
      assert.equal(await coLoiVaoTrang(p, env, "/ve-cai-dat", laDienThoai), true, "lối vào Cài đặt vé điện tử");
      await diToi(p, env, "/ve-cai-dat");
      await p.waitFor("!!document.getElementById('vcd-tran-lo')", "ô trần lô");
      assert.equal(await p.ev("document.getElementById('vcd-tran-lo').value"), "50");
      await bocucSach(p, "Toàn quyền /ve-cai-dat");
      await axeKiem(p, "/ve-cai-dat");
      await chup(p, `cai-dat-${kho}`);
      assert.equal(await dien(p, "#vcd-tran-lo", "30"), true);
      assert.equal(await bam(p, "[data-action=luu-tran-lo]"), true);
      await p.waitFor("document.getElementById('ok').textContent === 'Đã lưu: mỗi lô tối đa 30 vé.'", "báo đã lưu");
      await p.send("Page.reload", {});
      await sleep(300);
      await p.waitFor("!!document.getElementById('vcd-tran-lo')", "ô trần lô sau tải lại");
      assert.equal(await p.ev("document.getElementById('vcd-tran-lo').value"), "30", "tải lại vẫn 30");
      const nk = JSON.stringify(env.sql("SELECT detail FROM audit_log WHERE action = 've_doi_tran_lo'"));
      assert.match(nk, /50 → 30/, "nhật ký có số cũ, số mới");

      await diToi(p, env, "/ve-kho");
      await choFormVe(p);
      assert.match(await p.ev("document.getElementById('vk-form').textContent"), /mỗi lô tối đa 30 ảnh/);
      const loTruoc = await soLo(p);
      await khaiLo(p, `Vượt trần ${kho}`);
      await chonAnh(p, Array.from({ length: 31 }, (_, i) => anhTot(tien + 900, `vuot-${i}.png`)));
      assert.equal((await docTrang(p)).loi, "Một lô tối đa 30 vé, bạn đang chọn 31 ảnh.", "báo ngay khi chọn");
      await guiLo(p);
      assert.equal((await docTrang(p)).loi, "Một lô tối đa 30 vé, bạn đang chọn 31 ảnh.");
      assert.equal(await soLo(p), loTruoc, "vượt trần không tạo lô");

      await diToi(p, env, "/ve-cai-dat");
      await p.waitFor("!!document.getElementById('vcd-tran-lo')", "ô trần lô");
      assert.equal(await dien(p, "#vcd-tran-lo", "50"), true);
      assert.equal(await bam(p, "[data-action=luu-tran-lo]"), true);
      await p.waitFor("document.getElementById('ok').textContent === 'Đã lưu: mỗi lô tối đa 50 vé.'", "về 50");
      await diToi(p, env, "/ve-kho");
      await choFormVe(p);
      await khaiLo(p, `Vượt trần ${kho}`);
      await chonAnh(p, Array.from({ length: 51 }, (_, i) => anhTot(tien + 900, `vuot-${i}.png`)));
      assert.equal((await docTrang(p)).loi, "Một lô tối đa 50 vé, bạn đang chọn 51 ảnh.");
      await guiLo(p);
      assert.equal(await soLo(p), loTruoc, "51 ảnh không tạo lô");
      await chup(p, `vuot-tran-${kho}`);
    });
    p.close();

    p = await moTrang(ACCOUNTS.salesA, "/ve-kho", vp, { them: THEM });
    // Đợt mười ảnh có thân vài MB; công cụ thử mà ghi cả thân thì kết nối CDP đứt im lặng và mọi lời gọi vào trang treo (đã gặp 2/11, không phải lỗi của trang).
    await p.send("Network.enable", { maxPostDataSize: 65536 });
    await choFormVe(p);
    let dem = await conTrong(p);
    const loDau = `Lô đầu ${kho}`;
    await buoc(`${kho}.4b`, "Ô Loại khách có dòng «Mọi loại khách» (ADR-0157), chữ dặn nói rõ khi nào chọn, không lộ mã thô", async () => {
      assert.deepEqual(await p.ev("[...document.querySelectorAll('#vk-nhom option')].map((o) => o.textContent)"), ["Người lớn", "Trẻ em", "Cao tuổi", "Mọi loại khách"]);
      assert.match(await p.ev("document.getElementById('vk-form').textContent"), /Chọn «Mọi loại khách» khi vé dùng được cho cả người lớn, trẻ em và người cao tuổi/);
      await chup(p, `moi-loai-khach-${kho}`);
    });
    await buoc(`${kho}.5`, "Hai ảnh tốt + ảnh không có mã + tệp không phải ảnh: hai vé vào kho, hai tệp bị loại kèm tên", async () => {
      await bocucSach(p, "Bán hàng /ve-kho");
      await axeKiem(p, "/ve-kho");
      assert.equal(await p.ev("!!document.querySelector('#vk-form [id*=ma-ve], #vk-form input[placeholder*=mã]:not(#catalog-q)')"), false, "không còn ô gõ mã");
      await khaiLo(p, loDau);
      await chonAnh(p, [anhTot(tien + 1, "ve-a.png"), { ten: "khong-ma.png" }, anhTot(tien + 2, "ve-b.png"), { ten: "khong-phai-anh.jpg", rac: true }]);
      await guiLo(p);
      const tt = await docTrang(p);
      assert.ok(tt.ok.startsWith("Đã nhập 2 vé vào kho."), JSON.stringify(tt));
      assert.match(tt.loi, /khong-ma\.png: Không đọc được mã QR trên ảnh\./);
      assert.match(tt.loi, /khong-phai-anh\.jpg: Không đọc được mã QR trên ảnh\./);
      assert.equal(await conTrong(p), dem + 2);
      dem += 2;
      await khongLoQr(p, "sau nhập lô");
      await chup(p, `nhap-lo-${kho}`);
    });

    await buoc(`${kho}.6`, "Bản nén lại của vé đã nhập (tệp khác, cùng QR): bị loại, kho không đổi, không để lại lô trống", async () => {
      const loTruoc = await soLo(p);
      await khaiLo(p, `Nén lại ${kho}`);
      await chonAnh(p, [banNenLai(tien + 1, "ve-a-nen-lai.jpg")]);
      await guiLo(p);
      const tt = await docTrang(p);
      assert.match(tt.loi, /ve-a-nen-lai\.jpg: Mã vé đã có trong kho, đã loại\./, JSON.stringify(tt));
      assert.equal(tt.ok, "");
      assert.equal(await conTrong(p), dem, "kho không đổi");
      assert.equal(await soLo(p), loTruoc, "không để lại lô trống");
      await chup(p, `nen-lai-bi-loai-${kho}`);
    });

    await buoc(`${kho}.7`, "Hai ảnh cùng QR trong một lần chọn: một vào, một bị loại ngay trên trang", async () => {
      await khaiLo(p, `Trùng trong lần chọn ${kho}`);
      await chonAnh(p, [anhTot(tien + 3, "ve-c.png"), banNenLai(tien + 3, "ve-c-nen.jpg")]);
      await guiLo(p);
      const tt = await docTrang(p);
      assert.ok(tt.ok.startsWith("Đã nhập 1 vé vào kho."), JSON.stringify(tt));
      assert.match(tt.loi, /ve-c-nen\.jpg: Trùng vé với ảnh ve-c\.png đã chọn\./);
      dem += 1;
      assert.equal(await conTrong(p), dem);
    });

    await buoc(`${kho}.8`, "«Huỷ lô» từ danh sách qua hộp xác nhận: kho giảm; nhập lại đúng các ảnh đó được", async () => {
      await boLo(p, loDau);
      dem -= 2;
      assert.equal(await conTrong(p), dem, "kho giảm hai vé");
      assert.equal(await p.ev(`[...document.querySelectorAll('[data-khoi=cac-lo] li')].some((x) => x.textContent.includes(${JSON.stringify(loDau)}))`), false, "lô đã bỏ không còn trong danh sách");
      // Khối «Lô đã huỷ gần đây»: chưa mở thì chưa có ảnh hay đường dẫn nào; mở danh sách vé thì chỉ thấy 4 số cuối và nút Mở ảnh.
      const huy = await p.ev(`(() => { const li = [...document.querySelectorAll('[data-khoi=lo-da-huy] li')].find((x) => x.textContent.includes(${JSON.stringify(loDau)})); if (!li) return null; const d = li.querySelector('details'); if (d) d.open = true; return { chu: li.innerText, soVe: li.querySelectorAll('[data-ve]').length, anh: li.querySelectorAll('img, a').length, nut: li.querySelectorAll('[data-action=mo-anh]').length }; })()`);
      assert.ok(huy, "lô vừa huỷ phải hiện ở khối Lô đã huỷ gần đây");
      assert.equal(huy.soVe, 2, JSON.stringify(huy));
      assert.equal(huy.anh, 0, "chưa mở thì không có ảnh, liên kết");
      assert.equal(huy.nut, 2, "mỗi vé một nút Mở ảnh");
      assert.match(huy.chu, /Huỷ lúc \d{2}:\d{2} ngày \d{2}\/\d{2}\/\d{4} · người huỷ: /, JSON.stringify(huy));
      assert.match(huy.chu, /Vé số cuối \d{4} · dùng /, JSON.stringify(huy));
      await khongLoQr(p, "khối Lô đã huỷ gần đây");
      await chup(p, `lo-da-huy-${kho}`);
      await khaiLo(p, `Nhập lại ${kho}`);
      await chonAnh(p, [anhTot(tien + 1, "ve-a.png"), anhTot(tien + 2, "ve-b.png")]);
      await guiLo(p);
      const tt = await docTrang(p);
      assert.ok(tt.ok.startsWith("Đã nhập 2 vé vào kho."), JSON.stringify(tt));
      assert.equal(tt.loi, "");
      dem += 2;
      assert.equal(await conTrong(p), dem);
      const cu = await p.ev(`(() => { const li = [...document.querySelectorAll('[data-khoi=lo-da-huy] li')].find((x) => x.textContent.includes(${JSON.stringify(loDau)})); return li ? { chu: li.textContent, nut: li.querySelectorAll('[data-action=mo-anh]').length } : null; })()`);
      assert.equal(cu?.nut, 0, "vé đã nhập lại thì không còn nút Mở ảnh");
      assert.match(cu.chu, /đã nhập lại vào kho nên không mở được ảnh cũ/, JSON.stringify(cu));
    });

    await buoc(`${kho}.9`, "Gửi dở: trang chỉ đường «Huỷ lô», lô hiện «đang dở»; bỏ rồi nhập lại đúng ảnh đó được", async () => {
      const tenDo = `Lô dở ${kho}`;
      await p.ev(`{ const f = window.fetch.bind(window); window.__fetchGoc = f; window.fetch = (u, o) => /\\/xac-nhan$/.test(String(u)) ? Promise.resolve(new Response(JSON.stringify({ error: { code: 'x', message: 'Mất kết nối giữa chừng.' } }), { status: 500, headers: { 'content-type': 'application/json' } })) : f(u, o); } true`);
      await khaiLo(p, tenDo);
      await chonAnh(p, [anhTot(tien + 4, "ve-d.png")]);
      await guiLo(p);
      const tt = await docTrang(p);
      assert.match(tt.loi, /Lô này chưa xong: bấm «Huỷ lô» ở danh sách bên dưới rồi nhập lại\./, JSON.stringify(tt));
      assert.equal(await conTrong(p), dem, "vé của lô dở chưa vào kho");
      await p.ev("window.fetch = window.__fetchGoc; true");
      assert.match(await p.ev(`[...document.querySelectorAll('[data-khoi=cac-lo] li')].find((x) => x.textContent.includes(${JSON.stringify(tenDo)}))?.textContent ?? ''`), /đang dở/);
      await boLo(p, tenDo);
      await khaiLo(p, `Nhập lại lô dở ${kho}`);
      await chonAnh(p, [anhTot(tien + 4, "ve-d.png")]);
      await guiLo(p);
      assert.ok((await docTrang(p)).ok.startsWith("Đã nhập 1 vé vào kho."));
      dem += 1;
      await bocucSach(p, "Bán hàng /ve-kho sau nhập");
      await axeKiem(p, "/ve-kho sau nhập");
      await chup(p, `danh-sach-lo-${kho}`);
    });

    await buoc(`${kho}.9b`, "Mở ảnh vé của lô đã huỷ: có hộp báo trước, ảnh hiện ra; vé bị khoá, nhập lại bị loại", async () => {
      const tenMo = `Lô mở ảnh ${kho}`;
      await khaiLo(p, tenMo);
      await chonAnh(p, [anhTot(tien + 5, "ve-e.png")]);
      await guiLo(p);
      assert.ok((await docTrang(p)).ok.startsWith("Đã nhập 1 vé vào kho."));
      await boLo(p, tenMo);
      assert.equal(await conTrong(p), dem, "lô đã huỷ không tính vào kho");
      const dong = `[...document.querySelectorAll('[data-khoi=lo-da-huy] li')].find((x) => x.textContent.includes(${JSON.stringify(tenMo)}))`;
      assert.equal(await p.ev(`(() => { const li = ${dong}; const d = li?.querySelector('details'); if (!d) return false; d.open = true; li.querySelector('[data-action=mo-anh]').click(); return true; })()`), true, "có nút Mở ảnh");
      await choHop(p);
      assert.equal(await p.ev("document.querySelector('.sheet .sheet-title')?.textContent ?? ''"), "Mở ảnh vé này?");
      assert.match(await p.ev("document.querySelector('.sheet').textContent"), /không nhập lại vào kho để bán được nữa/, "hộp báo trước đúng hậu quả");
      assert.equal(await bam(p, ".sheet .btn-danger"), true, "nút Mở ảnh trong hộp");
      await choDongHop(p);
      await p.waitFor(`(() => { const i = (${dong})?.querySelector('img.ve-anh-xem'); return !!i && i.complete && i.naturalWidth > 0; })()`, "ảnh vé hiện ra");
      assert.match(await p.ev(`(${dong}).textContent`), /đã mở, vé bị khoá/, "dòng vé báo đã khoá ngay sau khi mở");
      await khongLoQr(p, "sau khi mở ảnh");
      await bocucSach(p, "Bán hàng /ve-kho sau khi mở ảnh");
      await axeKiem(p, "/ve-kho sau khi mở ảnh");
      await chup(p, `mo-anh-${kho}`);
      await khaiLo(p, `Nhập lại vé đã mở ${kho}`);
      await chonAnh(p, [anhTot(tien + 5, "ve-e.png")]);
      await guiLo(p);
      const tt = await docTrang(p);
      assert.match(tt.loi, /đã được mở ảnh khi lô bị huỷ nên không nhập lại được/, JSON.stringify(tt));
      assert.equal(await conTrong(p), dem, "vé đã mở không vào lại kho");
    });

    if (!laDienThoai) {
      await buoc(`${kho}.10`, "50 ảnh cỡ vé thật liên tiếp: trang không treo", async () => {
        await khaiLo(p, `Năm mươi vé ${kho}`);
        await chonAnh(p, Array.from({ length: 50 }, (_, i) => ({ ...anhTot(tien + 100 + i, `ve-${i}.jpg`), co: 8, rong: 1170, cao: 2532, loai: "image/jpeg", chatLuong: 0.85, chu: "Mẫu thử, không phải vé thật" })));
        await p.ev(`(() => { window.__gap = 0; window.__tienDo = new Set(); let t = performance.now(); window.__nhip = setInterval(() => { const n = performance.now(); window.__gap = Math.max(window.__gap, n - t); t = n; const s = document.querySelector('#vk-form p[role=status]'); if (s && !s.hidden) window.__tienDo.add(s.textContent); }, 50); return true; })()`);
        const batDau = Date.now();
        await guiLo(p);
        const giay = (Date.now() - batDau) / 1000;
        const do_ = await p.ev("(() => { clearInterval(window.__nhip); return { gap: Math.round(window.__gap), buoc: window.__tienDo.size }; })()");
        console.log(`    50 ảnh: ${giay.toFixed(1)} giây, khoảng đứng hình lâu nhất ${do_.gap} ms, ${do_.buoc} lần đổi dòng tiến độ`);
        const tt = await docTrang(p);
        assert.ok(tt.ok.startsWith("Đã nhập 50 vé vào kho."), JSON.stringify(tt));
        dem += 50;
        assert.equal(await conTrong(p), dem);
        assert.ok(do_.gap < 3000, `đứng hình ${do_.gap} ms`);
        assert.ok(do_.buoc >= 50, "dòng tiến độ phải đổi theo từng ảnh");
        assert.deepEqual(p.consoleErrors, [], "lỗi trình duyệt");
      });

      if (process.env.VE_ANH_THAT) {
        await buoc(`${kho}.anh-that`, "Ảnh vé thật trên máy (không rời trình duyệt, không lưu lại): đọc được hết, mã khác nhau, đúng dạng", async () => {
          const thuMuc = resolve(process.env.VE_ANH_THAT);
          const tep = readdirSync(thuMuc).filter((t) => /\.(jpe?g|png)$/i.test(t)).sort().map((t) => join(thuMuc, t));
          assert.ok(tep.length > 0, "thư mục ảnh thật trống");
          // Chặn mọi lời gọi ghi NGAY TRONG TRANG: chỉ đếm mã, không gì ra khỏi trình duyệt, không in chuỗi nào.
          await p.ev(`{ window.__ma = []; const f = window.fetch.bind(window); window.fetch = (u, o) => {
            const m = o?.method && o.method !== 'GET';
            if (!m) return f(u, o);
            const tl = (b) => Promise.resolve(new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } }));
            if (/\\/api\\/ve\\/lo$/.test(String(u))) return tl({ loId: 'gia' });
            if (/\\/ve$/.test(String(u))) { const ve = JSON.parse(o.body).ve; for (const v of ve) window.__ma.push(v.maVe); return tl({ loId: 'gia', themDuoc: ve.length, chuaLuuVaoKho: 0, loai: [], veTrongLo: 0 }); }
            return tl({}); }; } true`);
          await khaiLo(p, "Ảnh thật chỉ đọc");
          const { result: { root } } = await p.send("DOM.getDocument", {});
          const { result: { nodeId } } = await p.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#vk-tep" });
          await p.send("DOM.setFileInputFiles", { nodeId, files: tep });
          await guiLo(p);
          const kq = await p.ev("(() => { const m = window.__ma; const r = { so: m.length, khac: new Set(m).size, dungDang: m.filter((x) => /^[0-9]{36}$/.test(x)).length }; window.__ma = []; return r; })()");
          console.log(`    ảnh thật: ${tep.length} tệp, đọc được ${kq.so}, khác nhau ${kq.khac}, đúng dạng 36 chữ số ${kq.dungDang}`);
          assert.deepEqual(kq, { so: tep.length, khac: tep.length, dungDang: tep.length });
          await p.send("Page.reload", {});
          await sleep(300);
        });
      } else {
        console.log("    (bỏ qua khối ảnh thật: không đặt VE_ANH_THAT)");
      }
    }
    p.close();
    await sleep(300);
  }
} finally {
  await env.stop();
}
ketThuc("VE QR");

// Vận chuyển Đợt 5 A-1b — cứu hộ ĐƠN GIẢN (ADR-0052 D5c; lời chủ 5.2b, 5.2c; bản vẽ docs/design/van-chuyen-dot-3-7/Điều phối xe đang chạy.dc.html — 11.3 nút
// "Cứu hộ", CH.2 khối văn phòng bản đơn giản): màn tài xế có câu "Xe hỏng? Bấm Kết thúc gián đoạn — văn phòng nhận tin ngay và xếp xe cứu hộ" trong hộp Kết thúc
// gián đoạn; văn phòng bấm "Cứu hộ" ở "Việc của văn phòng" → hộp Kết thúc gián đoạn bấm thay (thêm dòng giải thích) → khối "Cứu hộ <mã> · N khách cần chuyển"
// (chặng cần chuyển, xe cùng ngày của tài xế công ty, "Tạo chuyến cứu hộ"); Kế toán không thấy khối. Không form giá (Đợt 4 — nợ).
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0049/kich-ban/cuu-ho-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: mỗi trang đóng trước khi mở trang tài khoản kế tiếp (Tài xế → Bán hàng → Quản trị → Kế toán).
import { randomUUID } from "node:crypto";
import {
  ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, noCode, noOverflowX, shotFull, shotView, sleep, txt,
} from "./dp-lib.mjs";

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("CUU HO SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
// T4 (NGÀY MAI 10:00–11:30, An, 79A-111.11) + O4 (2 khách có tên) xếp bằng phá lệ, mốc về 6 giờ, T5 (cùng ngày, Cường, 79A-222.22 — tài xế công ty, trống)
// làm xe nhận, rồi văn phòng xuất bến T4 (sớm). Mọi lệnh API làm TRƯỚC khi mở trình duyệt (đăng nhập trình duyệt thay phiên API — ADR-0075).
dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${d.T4.id}/phan-bo`, { version: d.T4.version, requestId: randomUUID(), chang: [{ legId: d.O4.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } }), 200, "xếp O4 vào T4");
dung(await call(CHU, "POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 2880 }), 201, "mốc 6 giờ");
const t5 = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: d.XE_B.id, taiXePartyId: d.CUONG.partyId, batDau: { ngay: d.NGAY_KHOA, gio: "10:00" }, ketThuc: { ngay: d.NGAY_KHOA, gio: "11:30" } });
dung(t5, 201, "tạo T5");
const T5 = t5.json.chuyen;
const T = d.T4;
dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${T.id}/xuat-ben`, { requestId: randomUUID() }), 200, "xuất bến T4");
await sleep(1200);

const goiCuuHo = (p) => apiCalls(p).filter((r) => r.method === "GET" && r.path.endsWith("/cuu-ho"));
const moChuyen = (p) => p.waitFor(`!!document.querySelector('.dp-run')`, "chuyến dựng xong", 12000);

try {
  // ---- Tài xế (điện thoại) — mở rồi đóng TRƯỚC các trang văn phòng ----------------------------------------------------------------------------------------------
  const t = await env.as(d.AN.account, `/cuoc-chuyen?id=${T.id}`, MOB);
  await b.step("1", `5.2c 390 tài xế: hộp "Kết thúc gián đoạn" có câu "Xe hỏng? Bấm Kết thúc gián đoạn — văn phòng nhận tin ngay và xếp xe cứu hộ"; đóng hộp không gửi${axeNote()}`, async () => {
    await moChuyen(t);
    await t.ev(click('[data-action="ket-thuc-gian-doan"]'));
    await t.waitFor(`!!document.querySelector('[data-action="gian-doan-gui"]')`, "hộp gián đoạn");
    await sleep(500);
    assert.equal(await t.ev(txt('[data-cau="cuu-ho"]')), "Xe hỏng? Bấm Kết thúc gián đoạn — văn phòng nhận tin ngay và xếp xe cứu hộ");
    assert.ok(await t.ev(noOverflowX));
    await axe(t, "Hộp gián đoạn tài xế 390");
    await shotView(t, "d5-cuu-ho-tai-xe-dien-thoai.png");
    await t.ev(click(".sheet-close"));
    await sleep(400);
    assert.equal(apiCalls(t).filter((r) => r.method === "POST").length, 0);
  });
  await t.close();

  // ---- Bán hàng (máy tính): thấy nút, hộp có dòng giải thích, không gửi ----------------------------------------------------------------------------------------
  const s = await env.as(ACCOUNTS.salesA, `/chuyen?id=${T.id}`, DESK);
  await b.step("2", `11.3 1040 Bán hàng: "Việc của văn phòng" có nút "Cứu hộ" (đỏ) → hộp "Kết thúc gián đoạn" bấm thay + dòng "Xe hỏng: kết thúc gián đoạn rồi xếp khách sang xe cứu hộ."; chuyến đang chạy KHÔNG có khối Cứu hộ, không gọi GET cuu-ho${axeNote()}`, async () => {
    await moChuyen(s);
    await s.waitFor(`!!document.querySelector('.dp-viec-vp')`, "khối việc văn phòng");
    assert.deepEqual(await s.ev(`[...document.querySelectorAll('.dp-viec-vp button')].map((x) => x.innerText.trim())`), ["Thêm điểm đón / thêm khách", "Cập nhật điểm theo đơn", "Cứu hộ"]);
    assert.ok(await s.ev(`document.querySelector('[data-action="cuu-ho"]').classList.contains('vc-btn-danger')`));
    assert.equal(await s.ev(`!!document.querySelector('#ct-cuu-ho')`), false);
    assert.deepEqual(goiCuuHo(s), []);
    await s.ev(click('[data-action="cuu-ho"]'));
    await s.waitFor(`!!document.querySelector('[data-action="khai-gio-gui"]')`, "hộp gián đoạn văn phòng");
    await sleep(500);
    assert.match(await s.ev(txt(".sheet-title")), new RegExp(`^Kết thúc gián đoạn ${T.ma} — bấm thay tài xế$`));
    assert.ok((await s.ev(txt(".sheet-body"))).includes("Xe hỏng: kết thúc gián đoạn rồi xếp khách sang xe cứu hộ."));
    await axe(s, "Hộp cứu hộ 1040");
    await shotView(s, "d5-cuu-ho-hop-may-tinh.png");
    await s.ev(click(".sheet-close"));
    await sleep(400);
    assert.equal(apiCalls(s).filter((r) => r.method === "POST").length, 0);
  });
  await s.close();

  // ---- Quản trị (máy tính → điện thoại): gửi gián đoạn → khối CH.2 ---------------------------------------------------------------------------------------------
  const q = await env.as(ACCOUNTS.admin, `/chuyen?id=${T.id}`, DESK);
  await b.step("3", `CH.2 1040 Quản trị "Cứu hộ" → chọn lý do → Kết thúc gián đoạn → khối "Cứu hộ ${T.ma} · 2 khách cần chuyển": chặng "Citadines Bayfront · 10:00 · 2 khách", xe "${T5.ma} · Phạm Văn Cường" (Chưa chạy · còn N chỗ) dẫn tới chuyến đó, "Tạo chuyến cứu hộ"; không tên khách${axeNote()}`, async () => {
    await moChuyen(q);
    await q.ev(click('[data-action="cuu-ho"]'));
    await q.waitFor(`!!document.querySelector('[data-action="khai-gio-gui"]')`, "hộp gián đoạn");
    await sleep(500);
    await q.ev(click(".sheet .vc-reason"));
    await q.ev(click('[data-action="khai-gio-gui"]'));
    await q.waitFor(`!document.querySelector('.sheet') && !!document.querySelector('#ct-cuu-ho .dp-cuu-ho-xe')`, "khối cứu hộ", 12000);
    assert.equal(goiCuuHo(q).length, 1);
    assert.equal(await q.ev(txt("#ct-cuu-ho-title")), `Cứu hộ ${T.ma} · 2 khách cần chuyển`);
    assert.deepEqual(await q.ev(`[...document.querySelectorAll('.dp-cuu-ho-dong')].map((x) => x.innerText.trim())`), ["Citadines Bayfront · 10:00 · 2 khách"]);
    const xe = await q.ev(`[...document.querySelectorAll('.dp-cuu-ho-xe')].map((a) => [a.innerText.replace(/\\s+/g, ' ').trim(), a.getAttribute('href')])`);
    assert.deepEqual(xe.length, 1, JSON.stringify(xe));
    assert.match(xe[0][0], new RegExp(`^${T5.ma} · Phạm Văn Cường Chưa chạy · còn \\d+ chỗ`));
    assert.equal(xe[0][1], `/chuyen?id=${T5.id}`);
    assert.equal(await q.ev(`document.querySelector('[data-action="tao-chuyen-cuu-ho"]').getAttribute('href')`), `/chuyen-sua?ngay=${d.NGAY_KHOA}`);
    assert.equal(await q.ev(`document.querySelector('#ct-cuu-ho').innerText.includes('Hành Khách Thử')`), false, "khối không tên khách");
    assert.match(await q.ev(txt(".banner-title")), new RegExp(`^Đã kết thúc gián đoạn ${T.ma}$`));
    assert.equal(await q.ev(`!!document.querySelector('.dp-viec-vp')`), false, "chuyến đã dừng: hết khối Việc của văn phòng");
    assert.equal(await q.ev(noCode), "");
    await axe(q, "Khối cứu hộ 1040");
    await shotFull(q, "d5-cuu-ho-khoi-may-tinh.png");
  });

  await b.step("4", `390 Quản trị: tải lại chuyến đã gián đoạn — khối Cứu hộ hiện luôn, không tràn ngang; bấm xe nhận mở chuyến ${T5.ma}${axeNote()}`, async () => {
    await q.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await q.send("Page.reload", {});
    await q.waitFor(`!!document.querySelector('#ct-cuu-ho .dp-cuu-ho-xe')`, "khối cứu hộ sau tải lại", 12000);
    assert.ok(await q.ev(noOverflowX));
    await axe(q, "Khối cứu hộ 390");
    await shotFull(q, "d5-cuu-ho-khoi-dien-thoai.png");
    await q.ev(click(".dp-cuu-ho-xe"));
    await q.waitFor(`location.search.includes(${JSON.stringify(T5.id)}) && !!document.querySelector('.dp-ct-title')`, "mở xe nhận");
    assert.equal(await q.ev(txt(".dp-ct-title")), T5.ma);
  });
  await q.close();

  // ---- Kế toán (chỉ xem) ---------------------------------------------------------------------------------------------------------------------------------------
  const k = await env.as(ACCOUNTS.accounting, `/chuyen?id=${T.id}`, DESK);
  await b.step("5", "Kế toán mở chuyến đã gián đoạn: KHÔNG khối Cứu hộ, KHÔNG gọi GET cuu-ho, không nút", async () => {
    await k.waitFor(`!!document.querySelector('.dp-ct-title')`, "chuyến (Kế toán)", 12000);
    await sleep(500);
    assert.equal(await k.ev(`document.querySelectorAll('#ct-cuu-ho, [data-action="cuu-ho"], [data-action="tao-chuyen-cuu-ho"]').length`), 0);
    assert.deepEqual(goiCuuHo(k), []);
  });
  await k.close();

  await b.step("6", "không lỗi console ở mọi trang đã mở", async () => {
    for (const pg of [t, s, q, k]) assert.deepEqual(pg.consoleErrors, []);
  });
} finally {
  b.xong();
  await env.stop();
}

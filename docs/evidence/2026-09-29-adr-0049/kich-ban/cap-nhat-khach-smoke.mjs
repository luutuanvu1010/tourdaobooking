// Vòng 5e — "Cập nhật khách theo đơn" (R-P29, chủ lần 16; máy chủ 337f5e9): khách đã gắn tên vào xe bị huỷ khỏi đơn → chuyến bị giữ KHACH_DA_DOI → văn phòng bấm
// "Cập nhật khách theo đơn" (route `cap-nhat-khach`, thân { version, requestId }). Khuôn "Cập nhật điểm theo đơn": 4 chỗ (dải lý do giữ ở Chi tiết chuyến, thẻ
// "Chuyến đang chọn", cột "Cần xử lý", câu khoá), KHÔNG hộp xác nhận, KHÔNG phá lệ kể cả trong vùng khoá; sau lệnh đọc lại GET (GA-55 — tên chỉ từ GET).
// GA-62: huỷ khách mà đơn không giảm số khách → sau cập nhật còn giữ THIEU_TEN (suất mở lại chưa tên).
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0049/kich-ban/cap-nhat-khach-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: Bán hàng → Kế toán (trang mở sau cùng là của Kế toán).
import { randomUUID } from "node:crypto";
import {
  ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, noCode, noOverflowX, shotFull, shotView, sleep, txt,
} from "./dp-lib.mjs";

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("CAP NHAT KHACH SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
// Vùng khoá có khách: Quản trị xếp O4 (quá mốc) vào T4 bằng phá lệ (đường thật) — máy gắn tên lúc xếp (I19(a)).
const x4 = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${d.T4.id}/phan-bo`, { version: d.T4.version, requestId: randomUUID(), chang: [{ legId: d.O4.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } });
assert.equal(x4.status, 200, x4.text);

/**
 * Đổi danh sách khách của đơn: thêm khách mới qua API đơn (đường thật của văn phòng), bỏ khách theo tên.
 * ADR-0104 Đ2 (kế hoạch N9 — đổi cách DỰNG, không nới luật): sửa khách qua route nay tự đồng bộ chuyến (máy) nên trạng thái GIỮ KHACH_DA_DOI dựng bằng gieo
 * SQL trên D1 tạm (tiền lệ moc-chua-co-smoke): thêm người qua route TRƯỚC (máy không có gì lệch), rồi HUỶ dòng khách cũ bằng một câu UPDATE `voided_at` —
 * đúng cột route huỷ ghi, trigger 0035 cho phép — như khi máy vượt trần / thua cổng chuyến.
 * Gọi API bằng Quản trị (không bao giờ mở trang trong Chrome của kịch bản này): Bán hàng đăng nhập trên Chrome ở bước 1 thì luật một máy (ADR-0075) đá cookie API
 * của Bán hàng — bước 3 từng đỏ "unauthenticated" từ trước Đ2 vì vậy.
 */
const doiKhach = async (don, boTen, them = []) => {
  const g = await call(ACCOUNTS.admin, "GET", `/api/orders/${don.id}/passengers`);
  assert.equal(g.status, 200, `đọc danh sách khách ${don.ma}: ${g.text}`);
  const ds = g.json;
  const huy = boTen.map((t) => ds.passengers.find((x) => x.fullName === t).personKey);
  if (them.length) {
    const r = await call(ACCOUNTS.admin, "POST", `/api/orders/${don.id}/passengers`, { expectedUpdatedAt: ds.orderUpdatedAt, them, sua: [], huy: [] });
    assert.equal(r.status, 200, `thêm khách ${don.ma}: ${r.text}`);
  }
  const luc = new Date().toISOString();
  for (const k of huy) env.sql(`UPDATE ord_passenger SET voided_at = '${luc}', updated_at = '${luc}' WHERE order_id = '${don.id}' AND person_key = '${k}' AND voided_at IS NULL`);
};
const moi = (fullName, birthYear) => ({ fullName, birthYear, paxCode: null });
// T1 (ngoài khoá): bỏ "1-2", thêm "Khách Mới Thay" (đơn vẫn 3 người) → KHACH_DA_DOI. T4 (trong khoá): bỏ "5-1", thêm "Khách Mới Khoá". T3 (cho Kế toán xem).
await doiKhach(d.O1, ["Hành Khách Thử 1-2"], [moi("Khách Mới Thay", 1990)]);
await doiKhach(d.O4, ["Hành Khách Thử 5-1"], [moi("Khách Mới Khoá", 1991)]);
await doiKhach(d.O3, ["Hành Khách Thử 3-4"], [moi("Khách Mới Xem", 1992)]);

const CAU = (ma) => `Khách trong xe không còn trong đơn — bấm Cập nhật khách theo đơn: ${ma}`;
const TIEU_DE_GIU = "Chuyến bị giữ: Khách trong đơn đã đổi — cập nhật khách";
const nhom = `[...document.querySelectorAll('.dp-khach-nhom')].map((x) => ({ khoa: x.dataset.nhom, ten: x.querySelector('.dp-khach-nhom-ten').innerText.trim() }))`;
const tenCua = async (p, legId) => (await p.ev(nhom)).find((x) => x.khoa === legId)?.ten.split(" · ").sort();
const daiGiu = `[...document.querySelectorAll('#ct-trang > .banner-danger .banner-title')].map((x) => x.innerText.trim())`;
// Gói A1 (ADR-0096 Đ2, LC-20): chuyến 13/10 nằm ngoài cửa sổ xuất bến 48 giờ của bản gieo nên màn CHI TIẾT hiện thêm dòng "Trong giờ được xuất bến" ✕
// (không tô "Bị giữ" — `kieuChuyen`). Kịch bản này chỉ kiểm khách đổi / thiếu tên nên bỏ dòng đó ra; dòng cửa sổ có kiểm riêng ở chuyen-smoke và cuoc-smoke.
const dieuKien = `[...document.querySelectorAll('.dp-cond[data-dat]')].filter((r) => r.dataset.dat !== 'true' && r.querySelector('.dp-cond-nhan').innerText !== 'Trong giờ được cho xe chạy').map((r) => ({ nhan: r.querySelector('.dp-cond-nhan').innerText, sub: r.querySelector('.dp-cond-sub')?.innerText ?? '' }))`;
const viec = `[...document.querySelectorAll('#dp-cot-can-xu-ly .dp-cxl')].map((x) => ({ tieuDe: x.querySelector('.dp-cxl-tieu-de').innerText.trim(), text: x.querySelector('.dp-cxl-text')?.innerText.trim() ?? '', ai: x.querySelector('.dp-cxl-ai').innerText.trim(), nut: [...x.querySelectorAll('.dp-cxl-actions .vc-btn')].map((n) => n.innerText.trim()) }))`;
const ghi = (p) => apiCalls(p).filter((r) => r.method === "POST" && r.path.endsWith("/cap-nhat-khach")).map((r) => JSON.parse(r.body));
const cho = (p) => p.waitFor(`!!document.querySelector('.dp-ct-title')`, "trang chi tiết dựng xong");
const moLai = async (p, url) => {
  await p.ev(`document.body.dataset.cu = '1'`);
  await p.send("Page.navigate", { url: `${env.base}${url}` });
  await p.waitFor(`!document.body.dataset.cu && !!document.querySelector('main')`, `mở ${url}`);
};

try {
  // ---- Bán hàng, máy tính: bảng Điều phối (Cần xử lý + thẻ Chuyến đang chọn) -------------------------------------------------------------------------------
  const p = await env.as(ACCOUNTS.salesA, `/dieu-phoi?ngay=${d.NGAY_XA}`, DESK);
  await b.step("1", `1040 Bán hàng bảng Điều phối: "Cần xử lý" có mục ${d.T1.ma} — câu "Khách trong xe không còn trong đơn…", Ai xử lý: Văn phòng, nút "Cập nhật khách theo đơn"; thẻ "Chuyến đang chọn" có nút${axeNote()}`, async () => {
    await p.waitFor(`!!document.querySelector('#dp-cot-can-xu-ly .dp-cxl')`, "cột Cần xử lý");
    const m = (await p.ev(viec)).find((x) => x.tieuDe.startsWith(d.T1.ma));
    assert.ok(m, "có mục của T1");
    assert.deepEqual([m.text, m.ai, m.nut], [CAU(d.O1.ma), "Ai xử lý: Văn phòng", ["Cập nhật khách theo đơn"]]);
    const m3 = (await p.ev(viec)).find((x) => x.tieuDe.startsWith(d.T3.ma));
    assert.deepEqual(m3.nut, ["Cập nhật điểm theo đơn", "Cập nhật khách theo đơn"], "hai lý do → hai nút, cùng khuôn");
    await p.ev(click(`.dp-khoi[data-chuyen="${d.T1.id}"]`));
    await p.waitFor(`!!document.querySelector('.dp-chon [data-action="cap-nhat-khach"]')`, "nút ở thẻ đang chọn");
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('.dp-chon .vc-btn')].map((x) => x.innerText.trim())`), ["Mở chuyến", "Cập nhật khách theo đơn"]);
    assert.equal(await p.ev(noCode), "");
    await axe(p, "bảng điều phối có KHACH_DA_DOI 1040");
  });

  // ---- Bán hàng, máy tính: Chi tiết chuyến T1 (ngoài khoá) --------------------------------------------------------------------------------------------------
  await moLai(p, `/chuyen?id=${d.T1.id}`);
  await cho(p);
  await b.step("2", `1040 Bán hàng ${d.T1.ma}: dải "${TIEU_DE_GIU}" + nút; "Đủ tên khách" ✕ kèm câu; bấm (không hộp xác nhận) → CÙNG trang: tên mới hiện (đọc lại GET), hết giữ${axeNote()}`, async () => {
    assert.deepEqual(await p.ev(daiGiu), [TIEU_DE_GIU]);
    assert.equal(await p.ev(txt("#ct-trang > .banner-danger .banner-lines")), `${CAU(d.O1.ma)} Ai xử lý: Văn phòng. Không cần điều chỉnh khẩn cấp hay phá lệ, kể cả trong vùng khoá trước giờ xe chạy.`);
    assert.deepEqual(await p.ev(dieuKien), [{ nhan: "Đủ tên khách", sub: `${CAU(d.O1.ma)} · Ai xử lý: Văn phòng` }]);
    assert.equal(await p.ev(txt(".dp-ct-head .chip")), "Bị giữ");
    assert.equal(await p.ev(`document.querySelector('main').innerText.includes('Khách Mới Thay')`), false, "trước khi bấm: xe chưa có khách mới");
    assert.equal(await p.ev(noCode), "");
    await axe(p, "dải khách đổi 1040");
    await shotFull(p, "b5e-khach-doi-truoc-may-tinh.png");
    await p.ev(click('#ct-trang [data-action="cap-nhat-khach"]'));
    await p.waitFor(`${txt("#ct-trang > .dp-banner-ok .banner-title")} === 'Đã cập nhật khách theo đơn'`, "dải đã cập nhật");
    assert.equal(await p.ev(`document.querySelectorAll('.dp-sheet, .sheet').length`), 0, "không hộp xác nhận");
    assert.deepEqual(Object.keys(ghi(p).at(-1)).sort(), ["requestId", "version"], "thân chỉ version + requestId (không phá lệ)");
    // CÙNG trang, chưa điều hướng: tên mới lấy từ GET đọc lại (phản hồi lệnh không có tên — GA-55).
    assert.deepEqual(await tenCua(p, d.O1.legId), ["Hành Khách Thử 1-1 1980", "Hành Khách Thử 1-3 1982", "Khách Mới Thay 1990"], "tên mới hiện ngay trên trang");
    assert.deepEqual(await p.ev(daiGiu), [], "hết dải giữ");
    assert.deepEqual(await p.ev(dieuKien), []);
    assert.equal(await p.ev(txt(".dp-ct-head .chip")), "Đã lên kế hoạch");
    await shotFull(p, "b5e-khach-doi-sau-may-tinh.png");
  });

  await b.step("3", `GA-62: bỏ "1-3" KHÔNG thêm ai (đơn vẫn 3 người) → giữ KHACH_DA_DOI + thiếu tên; bấm → hết KHACH_DA_DOI, CÒN "Đủ tên khách" ✕ "thiếu 1 tên"; nhóm "… · 1 khách chưa gắn tên"`, async () => {
    await doiKhach(d.O1, ["Hành Khách Thử 1-3"]);
    await moLai(p, `/chuyen?id=${d.T1.id}`);
    await cho(p);
    assert.deepEqual(await p.ev(daiGiu), [TIEU_DE_GIU]);
    await p.ev(click('#ct-trang [data-action="cap-nhat-khach"]'));
    await p.waitFor(`${txt("#ct-trang > .dp-banner-ok .banner-title")} === 'Đã cập nhật khách theo đơn'`, "dải đã cập nhật");
    assert.deepEqual(await p.ev(daiGiu), [], "hết dải KHACH_DA_DOI");
    assert.deepEqual(await p.ev(dieuKien), [{ nhan: "Đủ tên khách", sub: `Chưa đủ tên khách: ${d.O1.ma} thiếu 1 tên · Ai xử lý: Văn phòng` }]);
    assert.equal(await p.ev(txt(".dp-ct-head .chip")), "Bị giữ");
    const g = (await p.ev(nhom)).find((x) => x.khoa === d.O1.legId).ten;
    assert.match(g, / · 1 khách chưa gắn tên$/);
    assert.deepEqual(g.replace(/ · 1 khách chưa gắn tên$/, "").split(" · ").sort(), ["Hành Khách Thử 1-1 1980", "Khách Mới Thay 1990"]);
    assert.equal(await p.ev(`document.querySelector('main').innerText.includes('Hành Khách Thử 1-3')`), false);
  });
  await p.close();

  // ---- Vòng 5g (K2e VỪA-2): nhánh `stale` (409) của "Cập nhật khách theo đơn" — người khác sửa chuyến (dời giờ, vẫn lệch khách) TRƯỚC khi bấm ----------------
  const ps = await env.as(ACCOUNTS.salesA, `/chuyen?id=${d.T3.id}`, DESK);
  await cho(ps);
  const doiGio = async (gio) => {
    const hien = (await call(ACCOUNTS.admin, "GET", `/api/van-chuyen/chuyen/${d.T3.id}`)).json.chuyen;
    const r = await call(ACCOUNTS.admin, "PUT", `/api/van-chuyen/chuyen/${d.T3.id}`, { version: hien.version, requestId: randomUUID(), batDau: { ngay: d.NGAY_XA, gio }, ketThuc: { ngay: d.NGAY_XA, gio: "16:30" } });
    assert.equal(r.status, 200, r.text);
    const sau = (await call(ACCOUNTS.admin, "GET", `/api/van-chuyen/chuyen/${d.T3.id}`)).json.chuyen;
    assert.ok(sau.version > hien.version, "phiên bản chuyến tăng");
    assert.ok(sau.lyDoGiu.some((l) => l.ma === "KHACH_DA_DOI"), "vẫn lệch khách sau khi dời giờ");
  };
  const conLech = async () => (await call(ACCOUNTS.admin, "GET", `/api/van-chuyen/chuyen/${d.T3.id}`)).json.chuyen.lyDoGiu.some((l) => l.ma === "KHACH_DA_DOI");
  await b.step("3b", `stale: ${d.T3.ma} bị người khác dời giờ khi màn còn cũ → bấm "Cập nhật khách theo đơn" ở Chi tiết chuyến → câu "Chuyến vừa được người khác sửa — tải lại" (không mã, không tên người sửa, không dải thành công, máy chủ không ghi); ở bảng Điều phối → câu cùng khuôn "Cập nhật điểm theo đơn"`, async () => {
    assert.deepEqual(await ps.ev(daiGiu), ["Chuyến bị giữ: Nơi đón / trả đã đổi — cập nhật điểm", TIEU_DE_GIU]);
    await doiGio("14:25");
    await ps.ev(click('#ct-trang [data-action="cap-nhat-khach"]'));
    await ps.waitFor(`!!document.querySelector('#ct-trang > .banner-warning')`, "dải chuyến cũ");
    assert.equal(await ps.ev(txt("#ct-trang > .banner-warning .banner-title")), "Chuyến vừa được người khác sửa — tải lại");
    assert.equal(await ps.ev(`!!document.querySelector('#ct-trang > .banner-warning [data-action="tai-lai"]')`), true, "có nút Tải lại");
    assert.equal(await ps.ev(`document.querySelector('#ct-trang > .banner-warning').innerText.includes('Quản Trị')`), false, "không tên người sửa");
    assert.equal(await ps.ev(`!!document.querySelector('#ct-trang > .dp-banner-ok')`), false, "không dải thành công");
    assert.equal(await ps.ev(noCode), "");
    assert.equal(ghi(ps).length, 1, "đúng một lần gửi");
    assert.ok(await conLech(), "máy chủ không ghi — chuyến vẫn giữ KHACH_DA_DOI");
    // Bảng Điều phối (Cần xử lý): màn đọc lịch xong, người khác dời giờ lần nữa rồi mới bấm.
    await moLai(ps, `/dieu-phoi?ngay=${d.NGAY_XA}`);
    await ps.waitFor(`!!document.querySelector('#dp-cot-can-xu-ly .dp-cxl [data-action="cap-nhat-khach"]')`, "nút ở Cần xử lý");
    await doiGio("14:20");
    const nutT3 = `(() => { const m = [...document.querySelectorAll('#dp-cot-can-xu-ly .dp-cxl')].find((x) => x.querySelector('.dp-cxl-tieu-de').innerText.trim().startsWith(${JSON.stringify(d.T3.ma)})); m.querySelector('[data-action="cap-nhat-khach"]').click(); return true; })()`;
    await ps.ev(nutT3);
    await ps.waitFor(`!!document.querySelector('#dp-banner .banner-warning')`, "dải chuyến cũ ở bảng");
    assert.equal(await ps.ev(txt("#dp-banner .banner-warning .banner-title")), "Chuyến vừa được người khác sửa — đã tải lại bảng, bấm lại nếu vẫn cần.");
    assert.equal(await ps.ev(`!!document.querySelector('#dp-banner .dp-banner-ok')`), false);
    assert.equal(await ps.ev(noCode), "");
    assert.ok(await conLech(), "máy chủ không ghi — chuyến vẫn giữ KHACH_DA_DOI");
  });
  await ps.close();

  // ---- Bán hàng, điện thoại: T4 TRONG vùng khoá — vẫn bấm được, không phá lệ ------------------------------------------------------------------------------------
  const pm = await env.as(ACCOUNTS.salesA, `/chuyen?id=${d.T4.id}`, MOB);
  await cho(pm);
  // ADR-0104 Đ1 (2026-10-08): câu khoá theo ô điều chỉnh khẩn cấp (Bán hàng có ô) — "cập nhật khách theo đơn không cần điều chỉnh khẩn cấp"; thẻ khách
  // không còn dòng khoá cho Bán hàng (rút / chuyển trong vùng khoá là điều chỉnh khẩn cấp), nên chỉ còn MỘT ổ khoá (đầu trang) để đo.
  await b.step("4", `390 Bán hàng ${d.T4.ma} (trong vùng khoá): câu khoá nói "cập nhật khách theo đơn không cần điều chỉnh khẩn cấp"; dải + nút; bấm → không hộp xác nhận, tên mới hiện, hết giữ${axeNote()}`, async () => {
    assert.equal(await pm.ev(txt(".dp-ct-lock")), "Trong 48 giờ trước giờ xe chạy — khoá xếp khách, đổi xe, đổi tài xế. Bạn có thể điều chỉnh khẩn cấp kèm lý do. Cập nhật điểm theo đơn và cập nhật khách theo đơn không cần điều chỉnh khẩn cấp.");
    assert.deepEqual(await pm.ev(daiGiu), [TIEU_DE_GIU]);
    // Vòng 5f (nhật ký 13.11): ổ khoá của dòng khoá không bị flex ép nhỏ khi câu dài xuống nhiều dòng — cỡ vẽ = cỡ khai của biểu tượng (16 ở đầu trang,
    // 14 ở thẻ khách — khớp chữ 14 của dòng).
    const oKhoa = await pm.ev(`[...document.querySelectorAll('.dp-ct-lock svg, .dp-khach-khoa svg')].map((x) => [Math.round(x.getBoundingClientRect().width), Number(x.getAttribute('width'))])`);
    assert.equal(oKhoa.length, 1, "dòng khoá đầu trang (ADR-0104 Đ1: Bán hàng không còn dòng khoá ở thẻ khách)");
    for (const [ve, khai] of oKhoa) assert.equal(ve, khai, `ổ khoá bị ép nhỏ: ${JSON.stringify(oKhoa)}`);
    assert.ok(await pm.ev(noOverflowX));
    await axe(pm, "dải khách đổi 390");
    await shotView(pm, "b5e-khach-doi-truoc-dien-thoai.png");
    await pm.ev(click('#ct-trang [data-action="cap-nhat-khach"]'));
    await pm.waitFor(`${txt("#ct-trang > .dp-banner-ok .banner-title")} === 'Đã cập nhật khách theo đơn'`, "dải đã cập nhật");
    assert.equal(await pm.ev(`!!document.querySelector('[data-action="pha-le-gui"]')`), false, "không hộp phá lệ");
    assert.deepEqual(Object.keys(ghi(pm).at(-1)).sort(), ["requestId", "version"]);
    assert.deepEqual(await pm.ev(daiGiu), []);
    assert.deepEqual(await tenCua(pm, d.O4.legId), ["Hành Khách Thử 5-2 1981", "Khách Mới Khoá 1991"]);
    await pm.ev(`window.scrollTo(0, 0)`);
    await sleep(200);
    await shotView(pm, "b5e-khach-doi-sau-dien-thoai.png");
    await pm.ev(`document.querySelector('.dp-khach-nhom-the').scrollIntoView({ block: 'center' })`);
    await sleep(200);
    await shotView(pm, "b5e-khach-doi-sau-ten-dien-thoai.png");
  });
  await pm.close();

  // ---- Kế toán (chỉ xem) --------------------------------------------------------------------------------------------------------------------------------------
  const k = await env.as(ACCOUNTS.accounting, `/chuyen?id=${d.T3.id}`, DESK);
  await cho(k);
  await b.step("5", `Kế toán ${d.T3.ma}: thấy dải "${TIEU_DE_GIU}" nhưng KHÔNG nút; bảng Điều phối: mục Cần xử lý + thẻ đang chọn không nút cập nhật; route → 403; không lệnh ghi`, async () => {
    assert.ok((await k.ev(daiGiu)).includes(TIEU_DE_GIU));
    assert.equal(await k.ev(`!!document.querySelector('[data-action="cap-nhat-khach"]')`), false, "Chi tiết chuyến: không nút cập nhật khách");
    await moLai(k, `/dieu-phoi?ngay=${d.NGAY_XA}`);
    await k.waitFor(`!!document.querySelector('#dp-cot-can-xu-ly .dp-cxl')`, "cột Cần xử lý");
    const m3 = (await k.ev(viec)).find((x) => x.tieuDe.startsWith(d.T3.ma));
    assert.ok(m3.text.includes(CAU(d.O3.ma)), m3.text);
    assert.deepEqual(m3.nut, []);
    await k.ev(click(`.dp-khoi[data-chuyen="${d.T3.id}"]`));
    await k.waitFor(`!!document.querySelector('.dp-chon')`, "thẻ đang chọn");
    assert.deepEqual(await k.ev(`[...document.querySelectorAll('.dp-chon .vc-btn')].map((x) => x.innerText.trim())`), ["Mở chuyến"]);
    assert.equal(apiCalls(k).filter((r) => r.method === "POST").length, 0);
    const ct = (await call(ACCOUNTS.accounting, "GET", `/api/van-chuyen/chuyen/${d.T3.id}`)).json;
    assert.equal((await call(ACCOUNTS.accounting, "POST", `/api/van-chuyen/chuyen/${d.T3.id}/cap-nhat-khach`, { version: ct.chuyen.version, requestId: randomUUID() })).status, 403);
  });
  await k.close();

  await b.step("6", "không lỗi console ở mọi trang đã mở", async () => {
    // K2f THẤP-3: 409 của lệnh (stale) là phản hồi mạng có chủ đích. Chrome ghi "Failed to load resource … 409" qua miền Log (`logEntries`), KHÔNG qua console
    // của trang (`consoleErrors`) — bộ lọc cũ theo mẫu trên `consoleErrors` không bao giờ khớp. Nay ĐẾM ở `logEntries`: ĐÚNG 2 dòng (hai lần bấm cố ý ở bước
    // 3b: Chi tiết chuyến + bảng Điều phối); mọi lỗi khác của trang đó (console lẫn Log) phải rỗng.
    for (const pg of [p, ps, pm, k]) assert.deepEqual(pg.consoleErrors, []);
    const la409 = (e) => /Failed to load resource: the server responded with a status of 409/.test(e.text);
    const loiLog = ps.logEntries.filter((e) => e.level === "error");
    assert.equal(loiLog.filter(la409).length, 2, `đúng 2 dòng 409 (bước 3b) — thấy: ${JSON.stringify(loiLog.map((e) => e.text))}`);
    assert.deepEqual(loiLog.filter((e) => !la409(e)).map((e) => e.text), []);
  });
} finally {
  b.xong();
  await env.stop();
}

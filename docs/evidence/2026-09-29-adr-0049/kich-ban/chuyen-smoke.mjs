// B2 — V2 Chi tiết chuyến (/chuyen?id=) cho VĂN PHÒNG. ADR-0049 V2 (route 3, 8, 40), ADR-0050 thành phần C (lý do giữ "nơi đón / trả đã đổi" + "Cập nhật điểm theo
// đơn"), E (điểm lệch đơn); bản vẽ docs/design/van-chuyen-dieu-phoi/project/02 Chi tiet chuyen.dc.html (2a–2c, 2f); bản đối chiếu DOI-CHIEU-2026-09-29.md 2.7, 2.12, H10
// (stale = câu chung), H11 (nhật ký chỉ loại máy chủ trả), H14 (ai xử lý), H17 (huỷ chuyến có khách trong vùng khoá → phá lệ), R-P16 (cờ lechDon).
// Sau gộp A15: "Xuất bến thay tài xế" có ở chuyến lên kế hoạch và KHOÁ khi chuyến bị giữ (đối chiếu 2.7); bấm thay khi đang chạy kiểm ở cuoc-smoke.mjs.
// "Mở màn Xuất bến ›" (trang 6a riêng) không dựng — xem câu hỏi Q-B-14 ở nhật ký giao diện.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0049/kich-ban/chuyen-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: Bán hàng → Quản trị → Kế toán (trang mở sau cùng là của Kế toán).
import { randomUUID } from "node:crypto";
import {
  ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, noCode, noOverflowX, shotFull, shotView, shown, sleep, txt,
} from "./dp-lib.mjs";

// Hướng dẫn viên (Task 8 Đợt 1 — người đi kèm): tài khoản FIELD đang hoạt động; tên + SĐT giả để kiểm "tên có, SĐT không".
const HDV = { name: "Hướng Dẫn Kiểm Thử", phone: "0900000432", pin: "246432", permissions: ["FIELD"] };
const { env, call } = await dungMoiTruong([CHU, HDV]);
const b = boDem("CHUYEN SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
// H17: chuyến đang khoá có khách — Quản trị xếp O4 (quá mốc) vào T4 bằng phá lệ (đường thật).
const x4 = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${d.T4.id}/phan-bo`, { version: d.T4.version, requestId: randomUUID(), chang: [{ legId: d.O4.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } });
assert.equal(x4.status, 200, `xếp O4 vào T4: ${x4.text}`);

const cho = (p) => p.waitFor(`!!document.querySelector('.dp-ct-title')`, "trang chi tiết dựng xong");
const ghi = (p) => apiCalls(p).filter((r) => r.method !== "GET" && r.path.startsWith("/api/van-chuyen/chuyen"));
const nut = `[...document.querySelectorAll('main button, main a.vc-btn')].filter((x) => x.getClientRects().length > 0).map((x) => x.textContent.trim())`;
const kv = `[...document.querySelectorAll('.dp-kv')].map((k) => k.innerText.replace(/\\s+/g, ' ').trim())`;
const diem = `[...document.querySelectorAll('.dp-stop[data-diem]')].map((r) => ({ so: r.querySelector('.dp-stop-so').innerText.trim(), noi: r.querySelector('.dp-stop-noi strong').innerText.replace(/\\s+/g, ' ').trim(), tt: r.querySelector('.dp-stop-tt').innerText.trim(), lech: r.classList.contains('is-lech'), note: r.querySelector('.dp-stop-note')?.innerText ?? '' }))`;
const dieuKien = `[...document.querySelectorAll('.dp-cond[data-dat]')].map((r) => ({ dat: r.dataset.dat === 'true', nhan: r.querySelector('.dp-cond-nhan').innerText, sub: r.querySelector('.dp-cond-sub')?.innerText ?? '' }))`;
const nhatKy = `[...document.querySelectorAll('.dp-log')].map((r) => ({ ai: r.querySelector('.dp-log-who').innerText, may: r.querySelector('.dp-log-who').classList.contains('is-may'), text: r.lastElementChild.innerText }))`;
const KHONG_CO = ["Kết thúc gián đoạn", "Mở màn Xuất bến ›"];
// Nhật ký giao diện 13.7: nút KHOÁ đặt thẳng trên nền trang phải trông rõ là nút bị khoá — nền khác nền trang (không lẫn thành chữ thường) và mờ theo khuôn nút
// khoá của bộ thiết kế (Button disabled = opacity .5).
const nutKhoaRo = async (pg, sel) => {
  const r = await pg.ev(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); const cs = getComputedStyle(b); return { khoa: b.disabled, nen: cs.backgroundColor, trang: getComputedStyle(document.body).backgroundColor, mo: Number(cs.opacity) }; })()`);
  assert.equal(r.khoa, true, `${sel}: phải khoá`);
  assert.notEqual(r.nen, r.trang, `${sel}: nút khoá lẫn vào nền trang (${r.nen})`);
  assert.ok(r.mo < 1, `${sel}: nút khoá chưa mờ (opacity ${r.mo})`);
};

try {
  // ---- Bán hàng, máy tính ------------------------------------------------------------------------------------------------------------------------------------
  const p = await env.as(ACCOUNTS.salesA, `/chuyen?id=${d.T3.id}`, DESK);
  await cho(p);

  await b.step("1", `2a 1040 Bán hàng ${d.T3.ma} bị giữ "nơi đón / trả đã đổi": đầu trang, dải + nút "Cập nhật điểm theo đơn", dải bốn ô, điểm "Lệch đơn", điều kiện xuất bến, nhật ký; "Xuất bến thay tài xế" khoá vì bị giữ (2.7)${axeNote()}`, async () => {
    assert.equal(await p.ev(txt(".dp-ct-title")), d.T3.ma);
    assert.equal(await p.ev(txt(".dp-ct-head .chip")), "Bị giữ");
    assert.match(await p.ev(txt(".dp-ct-when")), new RegExp(`^(Thứ (Hai|Ba|Tư|Năm|Sáu|Bảy)|Chủ nhật) ${d.NGAY_XA.slice(8, 10)}/${d.NGAY_XA.slice(5, 7)} · 14:30–16:30$`));
    assert.equal(await p.ev(`document.querySelector('#ct-back').getAttribute('href')`), `/dieu-phoi?ngay=${d.NGAY_XA}`);
    assert.equal(await p.ev(`document.querySelector('.dp-ct-actions [data-action="sua-chuyen"]').getAttribute('href')`), `/chuyen-sua?id=${d.T3.id}`);
    assert.deepEqual(await p.ev(nut), ["Sửa chuyến", "Xuất bến thay tài xế", "Huỷ chuyến", "Cập nhật điểm theo đơn", "Thêm người đi kèm", "Rút khỏi xe", "Chuyển sang xe khác"], "vòng 5b: thẻ Khách trong chuyến có hai nút (rut-doi-smoke kiểm hành vi)");
    assert.equal(await p.ev(`document.querySelector('.dp-ct-actions [data-action="xuat-ben-thay"]').disabled`), true, "bị giữ → khoá xuất bến thay (2.7)");
    for (const a of KHONG_CO) assert.equal(await p.ev(`document.querySelector('main').innerText.includes(${JSON.stringify(a)})`), false, `chuyến chưa chạy: không có ${a}`);
    assert.equal(await p.ev(`!!document.querySelector('.dp-ct-lock')`), false, "chưa vào vùng khoá → không dòng khoá");
    assert.equal(await p.ev(txt("#ct-trang > .banner-danger .banner-title")), "Chuyến bị giữ: Nơi đón / trả đã đổi — cập nhật điểm");
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('#ct-trang > .banner-danger li')].map((x) => x.innerText)`), [
      `Nơi đón / trả đã đổi sau khi xếp — cập nhật điểm: ${d.O3.ma}`, "Ai xử lý: Văn phòng. Không cần phá lệ, kể cả trong vùng khoá trước giờ xuất bến.",
    ]);
    assert.deepEqual(await p.ev(kv), ["XE 79A-111.11 15 chỗ · xe công ty", "TÀI XẾ Nguyễn Văn An Tài xế công ty", "GIỜ 14:30–16:30 Xuất bến dự kiến 14:30", "TẢI 4/15 Còn 11 chỗ"]);
    const ds = await p.ev(diem);
    assert.deepEqual(ds[0], { so: "1", noi: "Novotel Nha Trang", tt: "Lệch đơn", lech: true, note: "Nơi của đơn đã đổi — cần cập nhật điểm theo đơn" });
    assert.equal(ds.at(-1).noi, "Bến tàu du lịch Nha Trang");
    const dk = await p.ev(dieuKien);
    assert.deepEqual(dk.map((x) => x.nhan), ["Giấy tờ xe", "Giấy phép lái xe", "Đủ tên khách", "Không có đơn đã huỷ", "Điểm khớp đơn", "Đủ chỗ", "Đủ giờ nghỉ"]);
    assert.deepEqual(dk.filter((x) => !x.dat), [{ dat: false, nhan: "Điểm khớp đơn", sub: `Nơi đón / trả đã đổi sau khi xếp — cập nhật điểm: ${d.O3.ma} · Ai xử lý: Văn phòng` }]);
    assert.equal(await p.ev(txt(".dp-side-card .dp-card-head .chip")), "1 chưa đạt");
    const nk = await p.ev(nhatKy);
    assert.ok(nk.length >= 2, JSON.stringify(nk));
    assert.deepEqual(nk[0], { ai: "Quản Trị", may: false, text: "Tạo chuyến" });
    assert.equal(await p.ev(shown(".dp-ct-line")), false, "dòng tóm tắt chỉ ở điện thoại");
    assert.equal(await p.ev(shown("#ct-bottom")), false, "nút cuối trang chỉ ở điện thoại");
    assert.equal(await p.ev(noCode), "");
    assert.ok(await p.ev(noOverflowX));
    await nutKhoaRo(p, '.dp-ct-actions [data-action="xuat-ben-thay"]');
    await axe(p, "chi tiết chuyến 1040");
    await shotFull(p, "b2-chi-tiet-bi-giu-may-tinh.png");
    // Task 8 Đợt 1, 1040: bảng "Thêm người đi kèm" mở được, có tên hướng dẫn viên, không SĐT; đóng không gửi lệnh ghi.
    await p.ev(click('[data-action="them-di-kem"]'));
    await p.waitFor(`!!document.querySelector('.sheet .vc-reason')`, "bảng chọn hướng dẫn viên (1040)");
    const chuBang = await p.ev(`document.querySelector('.sheet').innerText`);
    assert.match(chuBang, /Hướng Dẫn Kiểm Thử/);
    assert.ok(!chuBang.includes(HDV.phone.slice(1)), "bảng 1040 không lộ SĐT");
    await shotView(p, "b2-them-di-kem-may-tinh.png");
    await p.ev(`[...document.querySelectorAll('.sheet button')].find((x) => x.textContent.trim() === 'Đóng').click()`);
    await p.waitFor(`!document.querySelector('.sheet')`, "đóng bảng");
  });

  await b.step("2", "H10: chuyến vừa bị người khác sửa → bấm 'Cập nhật điểm theo đơn' báo câu chung + nút 'Tải lại' (không tên người); tải lại rồi bấm → đã cập nhật, hết 'Lệch đơn', nhật ký thêm dòng", async () => {
    const hien = (await call(ACCOUNTS.admin, "GET", `/api/van-chuyen/chuyen/${d.T3.id}`)).json.chuyen;
    const sua = await call(ACCOUNTS.admin, "PUT", `/api/van-chuyen/chuyen/${d.T3.id}`, { version: hien.version, requestId: randomUUID(), batDau: { ngay: d.NGAY_XA, gio: "14:20" }, ketThuc: { ngay: d.NGAY_XA, gio: "16:30" } });
    assert.equal(sua.status, 200, sua.text);
    await p.ev(click('[data-action="cap-nhat-diem"]'));
    await p.waitFor(`!!document.querySelector('#ct-trang > .banner-warning')`, "dải chuyến cũ");
    assert.equal(await p.ev(txt("#ct-trang > .banner-warning .banner-title")), "Chuyến vừa được người khác sửa — tải lại");
    assert.equal(await p.ev(`document.querySelector('#ct-trang > .banner-warning').innerText.includes('Quản Trị')`), false, "H10: không tên người sửa");
    await p.ev(`document.body.dataset.cu = '1'`);
    await p.ev(click('#ct-trang > .banner-warning [data-action="tai-lai"]'));
    await p.waitFor(`!document.body.dataset.cu && !!document.querySelector('.dp-ct-title')`, "tải lại xong");
    assert.match(await p.ev(txt(".dp-ct-when")), / · 14:20–16:30$/);
    const soNk = (await p.ev(nhatKy)).length;
    await p.ev(click('[data-action="cap-nhat-diem"]'));
    await p.waitFor(`!!document.querySelector('.dp-banner-ok')`, "dải đã cập nhật");
    assert.equal(await p.ev(txt(".dp-banner-ok .banner-title")), "Đã cập nhật điểm theo đơn");
    assert.match(await p.ev(txt(".dp-banner-ok li")), /^Đổi điểm cho \d+ khách theo nơi đón \/ trả mới của đơn/);
    assert.equal(await p.ev(`!!document.querySelector('[data-action="cap-nhat-diem"]')`), false, "hết lý do giữ → hết nút");
    const ds = await p.ev(diem);
    assert.equal(ds.filter((x) => x.lech).length, 0);
    assert.ok(ds.some((x) => x.noi === "Novotel Nha Trang cổng phụ"), JSON.stringify(ds));
    assert.equal(await p.ev(txt(".dp-ct-head .chip")), "Đã lên kế hoạch");
    assert.ok((await p.ev(nhatKy)).length > soNk, "nhật ký thêm dòng");
    const body = JSON.parse(ghi(p).filter((r) => r.path.endsWith("/cap-nhat-diem")).at(-1).body);
    assert.deepEqual(Object.keys(body).sort(), ["requestId", "version"], "không cần phá lệ");
    assert.equal(await p.ev(noCode), "");
    await shotFull(p, "b2-chi-tiet-sau-cap-nhat-may-tinh.png");
  });

  await b.step("3", `2f + 2.12: huỷ ${d.T1.ma} (3 khách, ngoài vùng khoá) — hộp "Huỷ chuyến" nói khách trở về cột "Chưa xếp", lý do nhóm Huỷ chuyến, nút khoá tới khi chọn → huỷ được${axeNote()}`, async () => {
    await p.ev(`document.body.dataset.cu = '1'`);
    await p.send("Page.navigate", { url: `${env.base}/chuyen?id=${d.T1.id}` });
    await p.waitFor(`!document.body.dataset.cu && !!document.querySelector('.dp-ct-title')`, "mở T1");
    await p.ev(click('.dp-ct-actions [data-action="huy-chuyen"]'));
    await p.waitFor(`!!document.querySelector('[data-action="huy-gui"]')`, "hộp huỷ mở");
    await sleep(600);
    assert.equal(await p.ev(txt(".sheet-title")), `Huỷ chuyến ${d.T1.ma}`);
    assert.equal(await p.ev(txt(".dp-sheet-text")), "3 khách trong chuyến sẽ trở về cột “Chưa xếp”. Chuyến không bị xoá, vẫn xem được trong nhật ký.");
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('.sheet .vc-reason')].map((x) => x.textContent)`), ["Gộp vào chuyến khác", "Không còn khách", "Khác"]);
    assert.equal(await p.ev(`document.querySelector('[data-action="huy-gui"]').disabled`), true);
    await axe(p, "hộp huỷ 1040");
    await shotView(p, "b2-huy-chuyen-may-tinh.png");
    await p.ev(click('.sheet .vc-reason[data-code="HUY_KHAC"]'));
    await p.ev(click('[data-action="huy-gui"]'));
    await p.waitFor(`${txt(".dp-ct-head .chip")} === 'Đã huỷ'`, "chuyến đã huỷ");
    assert.equal(await p.ev(txt("#ct-trang > .banner-info .banner-title")), "Đã huỷ chuyến");
    assert.equal(await p.ev(txt("#ct-trang > .banner-info li")), "Khách trong chuyến đã trở về cột “Chưa xếp”.");
    assert.deepEqual(await p.ev(nut), [], "chuyến đã huỷ → không nút sửa / huỷ");
    const body = JSON.parse(ghi(p).filter((r) => r.path.endsWith("/huy")).at(-1).body);
    assert.equal(body.lyDo, "HUY_KHAC");
    assert.equal(body.phaLe, undefined);
    const lich = (await call(ACCOUNTS.admin, "GET", `/api/van-chuyen/lich?ngay=${d.NGAY_XA}`)).json;
    assert.equal(lich.chang.find((c) => c.legId === d.O1.legId).trangThai, "CHUA_XEP", "khách trở về cột Chưa xếp");
  });

  await b.step("4", `H17 (Bán hàng): huỷ ${d.T4.ma} (đang khoá, 2 khách) → máy chủ đòi phá lệ; Bán hàng không có ô → câu trong hộp 'cần Quản trị phá lệ', hộp giữ nguyên, không hộp phá lệ`, async () => {
    await p.ev(`document.body.dataset.cu = '1'`);
    await p.send("Page.navigate", { url: `${env.base}/chuyen?id=${d.T4.id}` });
    await p.waitFor(`!document.body.dataset.cu && !!document.querySelector('.dp-ct-title')`, "mở T4");
    assert.equal(await p.ev(txt(".dp-ct-lock")), "Trong 48 giờ trước giờ xuất bến — khoá xếp khách, đổi xe, đổi tài xế. Cần Quản trị phá lệ. Cập nhật điểm theo đơn và cập nhật khách theo đơn không cần phá lệ.") /* vòng 5e: câu khoá nói cả lệnh mới */;
    await p.ev(click('.dp-ct-actions [data-action="huy-chuyen"]'));
    await p.waitFor(`!!document.querySelector('[data-action="huy-gui"]')`, "hộp huỷ mở");
    await p.ev(click('.sheet .vc-reason[data-code="HUY_KHONG_CON_KHACH"]'));
    await p.ev(click('[data-action="huy-gui"]'));
    await p.waitFor(`!!document.querySelector('.sheet .vc-field-error:not([hidden])')`, "câu lỗi trong hộp");
    assert.match(await p.ev(txt(".sheet .vc-field-error")), /cần Quản trị phá lệ/);
    assert.equal(await p.ev(`!!document.querySelector('[data-action="pha-le-gui"]')`), false);
    assert.equal(await p.ev(noCode), "");
    // Task 8 Đợt 1 (T-7): chuyến trong vùng khoá trước giờ xuất bến — không nút "Thêm người đi kèm" (Bán hàng không phá lệ được).
    assert.equal(await p.ev(`document.querySelector('main').innerText.includes('Thêm người đi kèm')`), false, "vùng khoá: không nút thêm người đi kèm");
  });
  await p.close();

  // ---- Bán hàng, điện thoại ----------------------------------------------------------------------------------------------------------------------------------
  const pm = await env.as(ACCOUNTS.salesA, `/chuyen?id=${d.T2.id}`, MOB);
  await cho(pm);
  await b.step("5", `2b 390 Bán hàng ${d.T2.ma} (giấy tờ xe + thiếu tên): dòng tóm tắt thay dải bốn ô, điểm dạng vòng số, "2 chưa đạt" kèm ai xử lý, nút Sửa + Huỷ ở cuối trang${axeNote()}`, async () => {
    assert.equal(await pm.ev(shown(".dp-kv-strip")), false);
    assert.equal(await pm.ev(txt(".dp-ct-line")), "79A-222.22 · 29 chỗ · Phạm Văn Cường · tải 2/29");
    assert.equal(await pm.ev(shown(".dp-stop-th")), false);
    assert.match(await pm.ev(txt(".dp-stop[data-diem] .dp-stop-tom")), /^Hẹn \d\d:\d\d · xe tới \d\d:\d\d · 2 khách$/);
    assert.equal(await pm.ev(txt(".dp-stop[data-diem] .dp-stop-noi strong")), "Đón · Amiana Resort");
    const dk = (await pm.ev(dieuKien)).filter((x) => !x.dat);
    assert.deepEqual(dk, [
      { dat: false, nhan: "Giấy tờ xe", sub: "Xe thiếu hoặc hết hạn giấy tờ bắt buộc: 79A-222.22 · Ai xử lý: Quản trị" },
      { dat: false, nhan: "Đủ tên khách", sub: `Chưa đủ tên khách: ${d.O2.ma} thiếu 1 tên · Ai xử lý: Văn phòng` },
    ]);
    assert.equal(await pm.ev(shown(".dp-ct-actions")), false);
    assert.deepEqual(await pm.ev(`[...document.querySelectorAll('#ct-bottom .vc-btn')].map((x) => x.textContent)`), ["Sửa chuyến", "Xuất bến thay tài xế", "Huỷ chuyến"]);
    assert.ok(await pm.ev(noOverflowX));
    assert.equal(await pm.ev(noCode), "");
    await nutKhoaRo(pm, '#ct-bottom [data-action="xuat-ben-thay"]');
    await axe(pm, "chi tiết chuyến 390");
    await shotFull(pm, "b2-chi-tiet-bi-giu-dien-thoai.png");
  });
  // Task 8 Đợt 1 — người đi kèm (lời chủ 1/10 "Chỉ hướng dẫn viên"): chuyến ngoài vùng khoá → nút ở thẻ "Khách trong chuyến" → bảng có TÊN hướng dẫn viên, không SĐT.
  await b.step("5b", `Người đi kèm 390 Bán hàng ${d.T2.ma}: "Thêm người đi kèm" → bảng có tên hướng dẫn viên, KHÔNG SĐT → chọn → "Gắn lên xe" → dải "Đã gắn người đi kèm"; thẻ Khách trong chuyến có "Người đi kèm · 1" + tên${axeNote()}`, async () => {
    await pm.ev(click('[data-action="them-di-kem"]'));
    await pm.waitFor(`!!document.querySelector('.sheet .vc-reason')`, "bảng chọn hướng dẫn viên mở");
    const chu = await pm.ev(`document.querySelector('.sheet').innerText`);
    assert.match(chu, /Hướng Dẫn Kiểm Thử/);
    assert.ok(!chu.includes(HDV.phone) && !chu.includes(HDV.phone.slice(1)), "bảng không lộ SĐT");
    assert.equal(await pm.ev(`document.querySelector('[data-action="di-kem-gui"]').disabled`), true, "chưa chọn → nút Gắn lên xe khoá");
    assert.ok(await pm.ev(noOverflowX));
    await axe(pm, "bảng thêm người đi kèm 390");
    await shotView(pm, "b2-them-di-kem-dien-thoai.png");
    await pm.ev(click('.sheet .vc-reason'));
    await pm.ev(click('[data-action="di-kem-gui"]'));
    await pm.waitFor(`document.querySelector('.banner .banner-title')?.innerText === 'Đã gắn người đi kèm'`, "dải Đã gắn người đi kèm");
    const nhom = await pm.ev(`[...document.querySelectorAll('.dp-khach-nhom[data-nhom="CREW"]')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`);
    assert.equal(nhom.length, 1);
    assert.match(nhom[0], /Người đi kèm · 1 Hướng Dẫn Kiểm Thử/);
    assert.ok(!(await pm.ev(`document.querySelector('main').innerText`)).includes(HDV.phone), "trang không lộ SĐT");
    assert.equal(await pm.ev(noCode), "");
    await shotFull(pm, "b2-di-kem-da-gan-dien-thoai.png");
    // Vá cuối Đợt 1 (M9): người đã gắn không còn trong bảng chọn; hết người thì có câu ghi chú thay vì danh sách rỗng.
    await pm.ev(click('[data-action="them-di-kem"]'));
    await pm.waitFor(`!!document.querySelector('.sheet .dp-sheet-text')`, "bảng báo hết hướng dẫn viên để thêm");
    const hetNguoi = await pm.ev(`document.querySelector('.sheet').innerText`);
    assert.match(hetNguoi, /Không còn hướng dẫn viên nào để thêm/);
    assert.ok(!hetNguoi.includes("Hướng Dẫn Kiểm Thử"), "người đã gắn bị ẩn khỏi bảng chọn");
    await pm.ev(`[...document.querySelectorAll('.sheet button')].find((x) => x.textContent.trim() === 'Đóng').click()`);
  });
  await pm.close();

  // ---- Quản trị, máy tính (H17: huỷ chuyến có khách trong vùng khoá → phá lệ) --------------------------------------------------------------------------------
  const q = await env.as(ACCOUNTS.admin, `/chuyen?id=${d.T4.id}`, DESK);
  await cho(q);
  await b.step("6", `H17 1040 Quản trị: dòng khoá "Bạn có thể phá lệ"; huỷ ${d.T4.ma} → hộp huỷ đóng, hộp "Phá lệ" mở → "Phá lệ và huỷ" gửi lại huỷ kèm phá lệ → đã huỷ`, async () => {
    assert.equal(await q.ev(txt(".dp-ct-lock")), "Trong 48 giờ trước giờ xuất bến — khoá xếp khách, đổi xe, đổi tài xế. Bạn có thể phá lệ. Cập nhật điểm theo đơn và cập nhật khách theo đơn không cần phá lệ.") /* vòng 5e: câu khoá nói cả lệnh mới */;
    await q.ev(click('.dp-ct-actions [data-action="huy-chuyen"]'));
    await q.waitFor(`!!document.querySelector('[data-action="huy-gui"]')`, "hộp huỷ mở");
    await q.ev(click('.sheet .vc-reason[data-code="HUY_KHONG_CON_KHACH"]'));
    await q.ev(click('[data-action="huy-gui"]'));
    await q.waitFor(`!!document.querySelector('[data-action="pha-le-gui"]') && !document.querySelector('[data-action="huy-gui"]')`, "hộp phá lệ thay hộp huỷ");
    await sleep(600);
    assert.equal(await q.ev(txt(".dp-sheet-pha-le .sheet-title")), "Phá lệ");
    assert.match(await q.ev(txt(".dp-sheet-pha-le .dp-sheet-sum")), new RegExp(`^Huỷ ${d.T4.ma} · 2 khách `));
    await shotView(q, "b2-huy-pha-le-may-tinh.png");
    await q.ev(click('.dp-sheet-pha-le .vc-reason[data-code="PHA_LE_SU_CO"]'));
    await q.ev(click('[data-action="pha-le-gui"]'));
    await q.waitFor(`${txt(".dp-ct-head .chip")} === 'Đã huỷ'`, "đã huỷ");
    const huy = ghi(q).filter((r) => r.path.endsWith("/huy")).map((r) => JSON.parse(r.body));
    assert.equal(huy.length, 2);
    assert.equal(huy[0].phaLe, undefined);
    assert.deepEqual(huy[1].phaLe, { lyDo: "PHA_LE_SU_CO" });
    assert.equal(huy[1].lyDo, "HUY_KHONG_CON_KHACH");
    const nk = await q.ev(nhatKy);
    assert.ok(nk.some((x) => x.text.includes("phá lệ: Sự cố vận hành")), JSON.stringify(nk));
  });
  await q.close();

  // ---- Kế toán (chỉ xem) ---------------------------------------------------------------------------------------------------------------------------------------
  const k = await env.as(ACCOUNTS.accounting, `/chuyen?id=${d.T2.id}`, DESK);
  await cho(k);
  await b.step("7", `Kế toán ${d.T2.ma}: xem đủ (dải bốn ô, điểm, điều kiện, nhật ký) nhưng KHÔNG nút nào; không lệnh ghi`, async () => {
    assert.deepEqual(await k.ev(nut), []);
    assert.equal(await k.ev(`document.querySelectorAll('.dp-cond[data-dat="false"]').length`), 2);
    assert.ok((await k.ev(nhatKy)).length >= 2);
    assert.equal(ghi(k).length, 0);
    // Task 8 Đợt 1: thấy nhóm Người đi kèm (bước 5b) nhưng không nút thêm.
    assert.match(await k.ev(`document.querySelector('main').innerText`), /Người đi kèm · 1/);
    assert.equal(await k.ev(`!!document.querySelector('[data-action="them-di-kem"]')`), false);
    assert.equal(await k.ev(noCode), "");
    await shotFull(k, "b2-chi-tiet-ke-toan-may-tinh.png");
  });
  await k.close();

  await b.step("8", "không lỗi console ở mọi trang đã mở", async () => {
    for (const pg of [p, pm, q, k]) assert.deepEqual(pg.consoleErrors, []);
  });
} finally {
  b.xong();
  await env.stop();
}

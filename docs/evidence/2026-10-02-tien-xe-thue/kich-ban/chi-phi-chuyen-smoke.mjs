// G2 — khối "Chi phí chuyến" trong Chi tiết chuyến (/chuyen?id=): ADR-0057 T2 C9, ADR-0095 Q4/Q5/Q9; bản vẽ docs/design/van-chuyen-dot-3-7/Chi phí xe thuê.dc.html màn 1b.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-02-tien-xe-thue node docs/evidence/2026-10-02-tien-xe-thue/kich-ban/chi-phi-chuyen-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: Bán hàng → Quản trị → Kế toán (trang mở sau cùng là của Kế toán). Lệnh gọi API của Kế toán (`call`) chỉ dùng TRƯỚC khi trình
// duyệt đăng nhập Kế toán (ADR-0075: một phiên mỗi tài khoản).
import { randomUUID } from "node:crypto";
import {
  ACCOUNTS, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungMoiTruong, fetchTrang, noCode, noOverflowX, shotFull, shotView, shown, txt, typeInto, vnDate,
} from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";
import { dungNenGia, taiXe, xe } from "./tx-lib.mjs";

const { env, call } = await dungMoiTruong();
const b = boDem("CHI PHI CHUYEN SMOKE");
try {
const XE_BIEN = ["79B-246.80", "79A-123.45", "79C-555.12"];
const n = await dungNenGia(env, call, (nx) => ({ tx: taiXe(env, nx.PT.id, "Trần Văn Thành"), xe: Object.fromEntries(XE_BIEN.map((bien) => [bien, xe(env, nx.PT.id, bien, 16)])) }));
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const TX = n.them.tx;
const NGAY = vnDate(5);
const taoChuyen = async (bien, tuyen, tu, den) => {
  const r = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: n.them.xe[bien], taiXePartyId: TX, tuyen, batDau: { ngay: NGAY, gio: tu }, ketThuc: { ngay: NGAY, gio: den } });
  dung(r, 201, `tạo chuyến ${bien}`);
  return r.json.chuyen;
};
const cpCua = async (id) => (await call(ACCOUNTS.accounting, "GET", `/api/van-chuyen/chuyen/${id}/chi-phi`)).json.chiPhi;
const dieuChinh = async (id, soTien, lyDo, ghiChu = null) =>
  dung(await call(ACCOUNTS.accounting, "POST", `/api/van-chuyen/chuyen/${id}/chi-phi/dieu-chinh`, { requestId: randomUUID(), phienBanChiPhi: (await cpCua(id)).phienBanChiPhi, soTien, lyDo, ghiChu }), 201, `điều chỉnh ${soTien}`);

const T_THIEU = await taoChuyen("79B-246.80", n.tuyen.DM, "07:00", "08:00"); // tuyến Đầm Môn chưa có giá ⇒ thiếu giá
const T_BANG = await taoChuyen("79A-123.45", n.tuyen.CR, "09:30", "10:30"); // giá bảng 450.000
await dieuChinh(T_BANG.id, 150_000, "CPX_CAU_DUONG", "Phí BOT theo biên lai");
const T_HUY = await taoChuyen("79C-555.12", n.tuyen.CR, "12:00", "13:00");
{
  const ct = (await call(ACCOUNTS.admin, "GET", `/api/van-chuyen/chuyen/${T_HUY.id}`)).json;
  const lyDo = ct.lyDo.find((l) => l.nhom === "HUY_CHUYEN").code;
  dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${T_HUY.id}/huy`, { requestId: randomUUID(), version: ct.chuyen.version, lyDo }), 200, "huỷ chuyến");
  await dieuChinh(T_HUY.id, 135_000, "CPX_HUY_MUON", "Huỷ trước giờ đón 14 tiếng — tính 30%");
}

const cho = (p) => p.waitFor(`!!document.querySelector('.dp-ct-title')`, "chi tiết chuyến dựng xong");
const choCp = (p) => p.waitFor(`!!document.querySelector('#ct-chi-phi .cp-tong')`, "khối chi phí dựng xong");
const dongCp = `[...document.querySelectorAll('#ct-chi-phi .cp-dong')].map((d) => ({ chip: [...d.querySelectorAll('.cp-chips .chip')].map((c) => c.textContent), so: d.querySelector('.cp-so').textContent, dao: d.classList.contains('is-dao') }))`;
const nutCp = `[...document.querySelectorAll('#ct-chi-phi .cp-nut button')].map((x) => x.textContent)`;
const tomTat = `[...document.querySelectorAll('#ct-chi-phi .cp-o')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`;
const dieuKienChu = `[...document.querySelectorAll('.dp-cond[data-dat]')].map((r) => r.innerText.replace(/\\s+/g, ' ').trim()).join(' | ')`;

  // ---- Bán hàng: không khối, không lời gọi /chi-phi; vẫn thấy lý do giữ (câu 4.4) -------------------------------------------------------------------------
  const s = await env.as(ACCOUNTS.salesA, `/chuyen?id=${T_THIEU.id}`, DESK);
  await cho(s);
  await b.step("1", "Bán hàng mở chuyến xe thuê thiếu giá: KHÔNG khối Chi phí chuyến, KHÔNG dải thiếu giá, KHÔNG lời gọi …/chi-phi; thẻ Điều kiện xuất bến vẫn có lý do 'Chuyến xe thuê chưa có giá', không số tiền", async () => {
    await new Promise((r) => setTimeout(r, 800));
    assert.equal(await s.ev(`!!document.querySelector('#ct-chi-phi')`), false);
    assert.equal(apiCalls(s).filter((r) => r.path.includes("/chi-phi")).length, 0);
    assert.match(await s.ev(dieuKienChu), /Chuyến xe thuê chưa có giá/);
    assert.equal(await s.ev(`document.querySelector('main').innerText.includes('₫')`), false, "không số tiền nào");
  });
  await s.close();

  // ---- Quản trị, máy tính -----------------------------------------------------------------------------------------------------------------------------------
  const p = await env.as(ACCOUNTS.admin, `/chuyen?id=${T_THIEU.id}`, DESK);
  await cho(p);
  await choCp(p);
  await b.step("2", `1b 1040 thiếu giá: dải cảnh báo + "Nhập giá thoả thuận"; khối cuối cột chính, chip "Chỉ Kế toán · Quản trị"; tóm tắt NHÀ XE / TUYẾN / NGUỒN GIÁ "Chưa có giá" / TỔNG "—"; "Chưa có dòng chi phí nào."; không "Lấy lại giá bảng" khi bảng giá chưa có${axeNote()}`, async () => {
    assert.equal(await p.ev(txt("#ct-chi-phi .cp-dai-thieu .banner-title")), "Chuyến xe thuê chưa có giá — chưa được xuất bến");
    assert.equal(await p.ev(txt("#ct-chi-phi .cp-dai-thieu li")), "Nhập giá thoả thuận với nhà xe, hoặc bổ sung giá vào Bảng giá thuê xe rồi lấy lại giá bảng.");
    assert.equal(await p.ev(`document.querySelector('.dp-ct-main').lastElementChild.id`), "ct-chi-phi", "khối ở cuối cột chính");
    assert.equal(await p.ev(txt("#cp-title")), "Chi phí chuyến");
    assert.equal(await p.ev(txt("#ct-chi-phi .cp-chip-ai")), "Chỉ Kế toán · Quản trị");
    assert.deepEqual(await p.ev(tomTat), ["NHÀ XE Nhà xe Phúc Thành", "TUYẾN Nha Trang – Đầm Môn", "NGUỒN GIÁ Chưa có giá", "TỔNG CHI PHÍ —"]);
    assert.equal(await p.ev(txt("#ct-chi-phi .cp-trong")), "Chưa có dòng chi phí nào.");
    assert.deepEqual(await p.ev(nutCp), ["Nhập giá thoả thuận"]);
    assert.equal(await p.ev(noCode), "");
    assert.ok(await p.ev(noOverflowX));
    await axe(p, "chi phí thiếu giá 1040");
    await shotFull(p, "g2-thieu-gia-may-tinh.png");
  });

  await b.step("3", `Bảng giá vừa có giá khớp (Kế toán thêm Đầm Môn · 10–16 khách 450.000) → tải lại: "Lấy lại giá bảng" + gợi ý có SỐ do máy chủ trả (câu 4.3 / ADR-0095 Q9)`, async () => {
    dung(await call(ACCOUNTS.accounting, "POST", "/api/van-chuyen/bang-gia", { requestId: randomUUID(), nhaXePartyId: n.PT.id, tuyen: n.tuyen.DM, coXe: n.co.C16, soTien: 450_000, tuNgay: vnDate(0), denNgay: null, ghiChu: null, thayDongId: null }), 201, "giá Đầm Môn");
    await p.send("Page.reload", {});
    await cho(p);
    await choCp(p);
    assert.deepEqual(await p.ev(nutCp), ["Nhập giá thoả thuận", "Lấy lại giá bảng"]);
    assert.equal(await p.ev(txt("#ct-chi-phi .cp-goi-y")), "Bảng giá vừa có giá 450.000 ₫ cho tuyến này — bấm “Lấy lại giá bảng” để dùng.");
    await shotFull(p, "g2-goi-y-gia-bang-may-tinh.png");
  });

  await b.step("4", `"Nhập giá thoả thuận" 1.350.000 (form nội tuyến, ghi chú bắt buộc) → nguồn "Giá thoả thuận", tổng 1.350.000 ₫ do máy chủ; dải thiếu giá + lý do giữ biến mất (V6 → V6b); thân có requestId + phienBanChiPhi`, async () => {
    await p.ev(click('#ct-chi-phi [data-action="nhap-thoa-thuan"]'));
    await p.waitFor(`!!document.querySelector('#ct-chi-phi .tx-form')`, "form thoả thuận");
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('#ct-chi-phi .tx-form label')].map((l) => l.textContent)`), ["Số tiền (₫) *", "Ghi chú thoả thuận *"]);
    await p.ev(typeInto("#cp-tt-tien", "1.350.000"));
    await p.ev(click('[data-action="luu-thoa-thuan"]'));
    await p.waitFor(`!document.querySelector('#ct-chi-phi .tx-loi').hidden`, "câu thiếu ghi chú");
    assert.equal(await p.ev(txt("#ct-chi-phi .tx-loi")), "Nhập ghi chú thoả thuận (thoả thuận với ai, ngày nào).");
    await p.ev(typeInto("#cp-tt-ghi", "Anh Thành báo giá điện thoại, đã chốt giá trọn gói"));
    const truoc = apiCalls(p).length;
    await p.ev(click('[data-action="luu-thoa-thuan"]'));
    await p.waitFor(`document.querySelector('#ct-chi-phi .cp-tong')?.dataset.tong === '1350000' && !document.querySelector('#ct-chi-phi .cp-dai-thieu')`, "đã có giá thoả thuận");
    const post = apiCalls(p).slice(truoc).find((r) => r.method === "POST");
    const body = JSON.parse(post.body);
    assert.deepEqual([body.soTien, body.phienBanChiPhi, /^[0-9a-f-]{36}$/.test(body.requestId)], [1_350_000, 0, true]);
    assert.deepEqual(await p.ev(tomTat), ["NHÀ XE Nhà xe Phúc Thành", "TUYẾN Nha Trang – Đầm Môn", "NGUỒN GIÁ Giá thoả thuận", "TỔNG CHI PHÍ 1.350.000 ₫"]);
    await p.waitFor(`!/Chuyến xe thuê chưa có giá/.test(${dieuKienChu})`, "thẻ điều kiện hết lý do thiếu giá");
    await shotFull(p, "g2-gia-thoa-thuan-may-tinh.png");
  });

  await b.step("5", `Giá bảng + một điều chỉnh (bản vẽ trạng thái 2): hai dòng, tổng 600.000 ₫; điều chỉnh "− 700.000" → câu máy chủ "Tổng chi phí chuyến sẽ âm…" (dấu trừ U+2212 đọc đúng); ô Ngày phát sinh TRỐNG mặc định (ADR-0095 Q4)`, async () => {
    await p.send("Page.navigate", { url: `${env.base}/chuyen?id=${T_BANG.id}` });
    await p.waitFor(`document.querySelector('.dp-ct-title')?.textContent === ${JSON.stringify(T_BANG.ma)}`, "chuyến giá bảng");
    await p.waitFor(`document.querySelector('#ct-chi-phi .cp-tong')?.dataset.tong === '600000'`, "tổng 600.000");
    assert.deepEqual(await p.ev(dongCp), [{ chip: ["Giá bảng"], so: "+ 450.000 ₫", dao: false }, { chip: ["Điều chỉnh"], so: "+ 150.000 ₫", dao: false }]);
    assert.match(await p.ev(`document.querySelector('#ct-chi-phi .cp-dong').innerText`), /Hệ thống ·/);
    assert.deepEqual(await p.ev(nutCp), ["Điều chỉnh"]);
    await p.ev(click('#ct-chi-phi [data-action="dieu-chinh"]'));
    await p.waitFor(`!!document.querySelector('#ct-chi-phi .tx-form')`, "form điều chỉnh");
    assert.equal(await p.ev(`document.querySelector('#cp-dc-ngay').value`), "", "ngày phát sinh để trống — máy chủ lấy ngày chạy");
    assert.equal(await p.ev(txt("#cp-dc-ngay + .vc-hint")), "Để trống: ngày chạy chuyến.");
    const lyDo = await p.ev(`[...document.querySelectorAll('#cp-dc-ly-do option')].map((o) => o.textContent)`);
    assert.ok(lyDo.includes("Nhập sai") && !lyDo.includes("Giá thoả thuận trước"), JSON.stringify(lyDo));
    await p.ev(typeInto("#cp-dc-tien", "− 700.000"));
    await p.ev(typeInto("#cp-dc-ly-do", "CPX_NHAP_SAI"));
    const truoc = apiCalls(p).length;
    await p.ev(click('[data-action="luu-dieu-chinh"]'));
    await p.waitFor(`!document.querySelector('#ct-chi-phi .tx-loi').hidden`, "câu tổng âm");
    assert.equal(await p.ev(txt("#ct-chi-phi .tx-loi")), "Tổng chi phí chuyến sẽ âm — đảo điều chỉnh giảm trước.");
    const body = JSON.parse(apiCalls(p).slice(truoc).find((r) => r.method === "POST").body);
    assert.equal(body.soTien, -700_000);
    assert.equal("ngay" in body, false, "không chọn ngày ⇒ không gửi ngay");
    await axe(p, "điều chỉnh tổng âm 1040");
    await shotFull(p, "g2-dieu-chinh-tong-am-may-tinh.png");
    await p.ev(click('[data-action="dong-form"]'));
  });

  await b.step("6", `"Đảo dòng" điều chỉnh (hộp: lý do + ghi chú, không ô ngày) → dòng gốc mờ + gạch, chip "đã đảo"; dòng "Đảo" mới; tổng 450.000 ₫`, async () => {
    await p.ev(`document.querySelectorAll('#ct-chi-phi .cp-dong')[1].querySelector('[data-action="dao-dong"]').click()`);
    await p.waitFor(`!!document.querySelector('.sheet [data-action="dao-gui"]')`, "hộp đảo");
    assert.equal(await p.ev(`document.querySelectorAll('.sheet input[type=date]').length`), 0);
    await p.ev(typeInto("#cp-dao-ly-do", "CPX_NHAP_SAI"));
    await shotView(p, "g2-dao-dong-may-tinh.png");
    await p.ev(click('[data-action="dao-gui"]'));
    await p.waitFor(`!document.querySelector('.sheet-root') && document.querySelector('#ct-chi-phi .cp-tong')?.dataset.tong === '450000'`, "đã đảo");
    const ds = await p.ev(dongCp);
    assert.deepEqual(ds[1], { chip: ["Điều chỉnh", "đã đảo"], so: "+ 150.000 ₫", dao: true });
    assert.deepEqual(ds[2], { chip: ["Đảo"], so: "− 150.000 ₫", dao: false });
  });

  await b.step("7", `Hai người cùng phiên bản: mở form, người khác ghi trước → 409 → dải đỏ "Chi phí chuyến vừa thay đổi — tải lại rồi thử lại." + "Tải lại"`, async () => {
    await p.ev(click('#ct-chi-phi [data-action="dieu-chinh"]'));
    await p.waitFor(`!!document.querySelector('#ct-chi-phi .tx-form')`, "form điều chỉnh");
    await dieuChinh(T_BANG.id, 50_000, "CPX_PHU_THU_CHO");
    await p.ev(typeInto("#cp-dc-tien", "100000"));
    await p.ev(typeInto("#cp-dc-ly-do", "CPX_CAU_DUONG"));
    await p.ev(click('[data-action="luu-dieu-chinh"]'));
    await p.waitFor(`!!document.querySelector('#ct-chi-phi .banner-danger [data-action="tai-lai"]')`, "dải vừa đổi");
    assert.equal(await p.ev(txt("#ct-chi-phi .banner-danger .banner-title")), "Chi phí chuyến vừa thay đổi — tải lại rồi thử lại.");
    await shotFull(p, "g2-vua-doi-may-tinh.png");
    await p.ev(click('#ct-chi-phi [data-action="tai-lai"]'));
    await p.waitFor(`!document.querySelector('#ct-chi-phi .banner-danger') && document.querySelector('#ct-chi-phi .cp-tong')?.dataset.tong === '500000'`, "đã tải lại");
  });

  await b.step("8", `Chuyến đã huỷ có phí huỷ (bản vẽ trạng thái 3): dòng giá bảng đã đảo, dòng "Đảo" do huỷ, "Điều chỉnh · phí huỷ" +135.000; gợi ý "Chuyến đã huỷ vẫn ghi được phí huỷ."; ngày phát sinh mặc định = ngày huỷ`, async () => {
    await p.send("Page.navigate", { url: `${env.base}/chuyen?id=${T_HUY.id}` });
    await p.waitFor(`document.querySelector('.dp-ct-title')?.textContent === ${JSON.stringify(T_HUY.ma)}`, "chuyến đã huỷ");
    await p.waitFor(`document.querySelector('#ct-chi-phi .cp-tong')?.dataset.tong === '135000'`, "tổng 135.000");
    const ds = await p.ev(dongCp);
    assert.deepEqual(ds.map((d) => d.chip.join("+")), ["Giá bảng+đã đảo", "Đảo", "Điều chỉnh · phí huỷ"]);
    assert.ok((await p.ev(`[...document.querySelectorAll('#ct-chi-phi .cp-goi-y')].map((x) => x.textContent)`)).includes("Chuyến đã huỷ vẫn ghi được phí huỷ."));
    await p.ev(click('#ct-chi-phi [data-action="dieu-chinh"]'));
    await p.waitFor(`!!document.querySelector('#cp-dc-ngay')`, "form");
    assert.equal(await p.ev(txt("#cp-dc-ngay + .vc-hint")), "Để trống: ngày huỷ chuyến.");
    await p.ev(click('[data-action="dong-form"]'));
    assert.equal(await p.ev(noCode), "");
    await axe(p, "chuyến huỷ 1040");
    await shotFull(p, "g2-chuyen-huy-may-tinh.png");
  });
  await p.close();

  // ---- Quản trị, điện thoại ---------------------------------------------------------------------------------------------------------------------------------
  const m = await env.as(ACCOUNTS.admin, `/chuyen?id=${T_BANG.id}`, MOB);
  await cho(m);
  await choCp(m);
  await b.step("9", `1b 390: khối cuối trang, không tràn ngang; "Điều chỉnh" mở tấm đáy (không form nội tuyến)${axeNote()}`, async () => {
    assert.ok(await m.ev(noOverflowX));
    await axe(m, "chi phí 390");
    await shotFull(m, "g2-chi-phi-dien-thoai.png");
    await m.ev(click('#ct-chi-phi [data-action="dieu-chinh"]'));
    await m.waitFor(`!!document.querySelector('.sheet [data-action="luu-dieu-chinh"]')`, "tấm đáy điều chỉnh");
    assert.equal(await m.ev(`!!document.querySelector('#ct-chi-phi .tx-form')`), false);
    await shotView(m, "g2-dieu-chinh-dien-thoai.png");
    await m.ev(`[...document.querySelectorAll('.sheet-foot button')].find((x) => x.textContent === 'Đóng').click()`);
  });
  await m.close();

  // ---- Kế toán (mở sau cùng) --------------------------------------------------------------------------------------------------------------------------------
  const k = await env.as(ACCOUNTS.accounting, `/chuyen?id=${T_BANG.id}`, DESK);
  await cho(k);
  await choCp(k);
  await b.step("10", "Kế toán: cùng khối, có nút Điều chỉnh / Đảo dòng (Quản trị = Kế toán ở bốn ô transport.*); đọc lại bằng phiên trang khớp tổng máy chủ", async () => {
    assert.deepEqual(await k.ev(nutCp), ["Điều chỉnh"]);
    const r = await fetchTrang(k, "GET", `/api/van-chuyen/chuyen/${T_BANG.id}/chi-phi`);
    assert.equal(String(r.json.chiPhi.tong), await k.ev(`document.querySelector('#ct-chi-phi .cp-tong').dataset.tong`));
  });
  await b.step("11", "không lỗi console ở mọi trang đã mở", async () => {
    for (const pg of [s, p, m, k]) assert.deepEqual(pg.consoleErrors, []);
  });
  await k.close();
} catch (e) {
  console.log("✗ dựng dữ liệu / kịch bản dừng:", e?.stack ?? e, "\n--- nhật ký máy chủ ---\n", env.logs.join("").slice(-4000));
  process.exitCode = 1;
} finally {
  b.xong();
  await env.stop();
}

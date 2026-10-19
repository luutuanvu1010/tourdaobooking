// B7 — V12: mốc 6 giờ + đặt gấp trên biểu mẫu đơn, trang đơn, bảng "Sửa thông tin chuyến" (ADR-0049 D2, I14, I31; bản vẽ docs/design/van-chuyen-dieu-phoi/project/07,
// khung 7a–7c; ruling R-P15 route mốc cho đơn chưa lưu, R-P18 bốn lý do theo bản vẽ; chủ H4 / N-14: văn phòng thấy đủ nhãn, Đối tác chỉ "Quản trị đã duyệt").
// Mốc đặt 2880 phút (48 giờ) bằng route chính sách để chặng đón NGÀY MAI luôn dưới mốc — không phụ thuộc giờ chạy kịch bản.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0049/kich-ban/dat-gap-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: Bán hàng → Quản trị → Đối tác (trang của tài khoản nào mở SAU CÙNG).
import {
  ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungMoiTruong, noCode, noOverflowX, shotFull, shotView, shown, sleep, txt, typeInto, vnDate,
} from "./dp-lib.mjs";
import { chonNoiJs } from "../../2026-10-18-tao-don-thiet-ke-lai/kich-ban/cham-that.mjs";

const DOI_TAC = { name: "Đối Tác Đặt Gấp", phone: "0900000432", pin: "246432", permissions: ["PARTNER"] };
const { env, call } = await dungMoiTruong([CHU, DOI_TAC]);
const b = boDem("DAT GAP SMOKE");
const MAI = vnDate(1);
const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
const base = { customerName: "Khách Đặt Gấp", customerPhone: "0903 000 111", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "" };
const donMoi = async (ai, ten) => {
  const r = await call(ai, "POST", "/api/orders", {
    ...base, customerName: ten,
    services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, ...NO_TRIP, departDate: MAI, pickupTime: "10:00", pickupPlace: "Sheraton Nha Trang" }],
  });
  assert.equal(r.status, 201, r.text);
  return r.json.order;
};
const legOf = (o) => o.services[0].legs[0];
// 2026-10-08 (ADR-0074/ADR-0075): `call` của dp-lib giữ MỘT phiên mỗi tài khoản, nhưng `env.as` đăng nhập lại và kết thúc phiên giữ sẵn đó ("bi_thay") →
// lời đọc bằng `call` sau khi mở trang của CÙNG tài khoản nhận 401 (bước 3, 7, 8, 10 từng đỏ "Cannot read properties of undefined"). Khi trang của tài
// khoản đó đang mở, đọc đơn QUA TRANG: cùng phiên, cùng người xem (Đối tác vẫn nhận DTO của Đối tác ở bước 10).
const donQuaTrang = async (p, id) => (await p.ev(`fetch('/api/orders/' + ${JSON.stringify(id)}).then((r) => r.json())`)).order;
const CAU_MOC = /^Giờ đón cách bây giờ \d+ giờ( \d+ phút)? — quá hạn chốt 48 giờ$/;
const LY_DO = ["Khách đoàn gọi gấp", "Chuyến bay đổi giờ", "Đơn bù cho khách bị lỡ chuyến", "Lý do khác"];
const card0 = `document.querySelector('#services .svc')`;
const dongConfirmDialog = async (p) => {
  await p.waitFor(`!!document.querySelector('.sheet[role=dialog] .sheet-close')`, "hộp thoại xác nhận gửi khách tự mở (moi=1)", 10000);
  await p.ev(`document.querySelector('.sheet[role=dialog] .sheet-close').click(); true`);
  await p.waitFor(`!document.querySelector('.sheet[role=dialog]')`, "đóng hộp thoại");
};
const themDichVuTrenForm = async (p, gio = "10:00") => {
  await p.waitFor(`!!document.getElementById('catalog-q')`, "ô tìm danh mục");
  await p.ev("document.getElementById('catalog-q').focus(); true");
  await p.ev(typeInto("#catalog-q", "TD101"));
  await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "TD101 trong danh mục");
  await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
  await p.waitFor(`document.querySelectorAll('#services .svc').length === 1`, "thẻ dịch vụ");
  await p.ev(typeInto("#orderDate", MAI));
  // ADR-0047 Phần B (2026-10-01): giờ / nơi đón nhập ở khối "Đưa đón" của thẻ (TD101 không có mẫu chặng → "+ Thêm đưa đón").
  await p.ev(click('#services .svc [data-action="them-dua-don"]'));
  await p.waitFor(`!!document.querySelector('#services .svc .dd-chang [data-o$=":don"]')`, "chặng đưa đón");
  // 18/10 (Tạo đơn thiết kế lại, việc 7): MỘT ô "Nơi đón" có gợi ý — bấm ô, gõ, chọn dòng "Gõ tự do: …" (thay ô chọn "tudo" + ô "Địa chỉ đón" riêng).
  assert.equal(await p.ev(chonNoiJs(`document.querySelector('#services .svc .dd-chang [data-o$=":don"]')`, "Sheraton Nha Trang", "Gõ tự do: ")), true, "ô Nơi đón có dòng 'Gõ tự do: …'");
  await p.waitFor(`document.querySelector('#services .svc .dd-chang [data-o$=":don"]').value === 'Sheraton Nha Trang'`, "ô Nơi đón mang chữ tự do");
  await p.ev(typeInto(`#services .svc .dd-chang [data-o$=":gio"]`, gio));
  await p.ev(typeInto("#customerName", "Khách Lập Trên Form"));
  await p.ev(typeInto("#customerPhone", "0903 222 333"));
};

try {
  // ---- dữ liệu dựng bằng API (không phụ thuộc cookie của Chrome) ----------------------------------------------------------------------------------------
  const cs = await call(CHU, "POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { minLeadMinutes: 2880, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 2880, refuseLeadMinutes: 720, officePhone: null, acceptWaitMinutes: 10, autoConfirmTransfer: true });
  assert.equal(cs.status, 201, cs.text);
  const o1 = await donMoi(ACCOUNTS.salesA, "Khách Một"); // nháp của Bán hàng, dưới mốc, chưa đặt gấp
  const o3 = await donMoi(ACCOUNTS.salesA, "Khách Ba"); // Quản trị đặt gấp + xác nhận bằng API → dùng cho bảng "Sửa thông tin chuyến"
  let r = await call(ACCOUNTS.admin, "POST", `/api/orders/${o3.id}/legs/${legOf(o3).id}/short-notice`, { lyDo: "DON_BU_LO_CHUYEN", ghiChu: "Bù chuyến 29/9" });
  assert.equal(r.status, 200, r.text);
  r = await call(ACCOUNTS.admin, "POST", `/api/orders/${o3.id}/status`, { status: "confirmed" });
  assert.equal(r.status, 200, r.text);
  const o2 = await donMoi(DOI_TAC, "Khách Đối Tác"); // nháp của Đối tác, Quản trị đặt gấp bằng API → Đối tác chỉ thấy cờ
  r = await call(ACCOUNTS.admin, "POST", `/api/orders/${o2.id}/legs/${legOf(o2).id}/short-notice`, { lyDo: "KHACH_DOAN_GOI_GAP", ghiChu: "Ghi chú nội bộ" });
  assert.equal(r.status, 200, r.text);

  // ---- Bán hàng --------------------------------------------------------------------------------------------------------------------------------------------
  const s = await env.as(ACCOUNTS.salesA, "/order-form", DESK);
  let o4Id = null;
  await b.step("1", `7b trên biểu mẫu CHƯA lưu (1040, Bán hàng): đọc mốc qua GET /api/orders/moc-toi-thieu; dải cát 'Giờ đón cách bây giờ … — dưới mốc 48 giờ' + 'Lưu nháp được. Xác nhận cần Quản trị duyệt đặt gấp.', KHÔNG nút Đặt gấp; đổi ngày ra xa thì hết, đổi lại thì hiện${axeNote()}`, async () => {
    await themDichVuTrenForm(s);
    await s.waitFor(shown(`#services .svc .dg-warn`), "dải cảnh báo dưới mốc");
    assert.ok(apiCalls(s).some((c) => c.method === "GET" && c.path === "/api/orders/moc-toi-thieu"), "biểu mẫu gọi route mốc (R-P15)");
    assert.match(await s.ev(txt("#services .svc .dg-warn .banner-title")), CAU_MOC);
    assert.equal(await s.ev(txt("#services .svc .dg-warn-sub")), "Lưu nháp được. Xác nhận cần Quản trị duyệt đặt gấp.");
    assert.equal(await s.ev(`!!document.querySelector('#services [data-action="mo-dat-gap"]')`), false, "Bán hàng không có nút Đặt gấp");
    await s.ev(typeInto("#orderDate", vnDate(4)));
    await s.waitFor(`!document.querySelector('#services .dg-warn')`, "đổi ngày ra xa → hết cảnh báo");
    await s.ev(typeInto("#orderDate", MAI));
    await s.waitFor(shown(`#services .svc .dg-warn`), "đổi lại → cảnh báo lại");
    assert.equal(await s.ev(noCode), "");
    await axe(s, "biểu mẫu Bán hàng dưới mốc");
    await shotFull(s, "b7-bieu-mau-ban-hang-may-tinh.png");
  });

  await b.step("2", "Bán hàng Lưu nháp được (không chặn); trang đơn: cảnh báo ở dịch vụ, nút 'Xác nhận đơn' KHOÁ + dòng khoá 'Cần Quản trị duyệt đặt gấp' (7b), không nút Đặt gấp", async () => {
    await s.ev(click("#save"));
    await s.waitFor(`location.pathname === '/order'`, "chuyển sang trang đơn sau khi lưu", 15000);
    o4Id = new URLSearchParams(await s.ev("location.search")).get("id");
    await dongConfirmDialog(s);
    await s.waitFor(shown("#order .dg-warn"), "cảnh báo ở trang đơn");
    assert.match(await s.ev(txt("#order .dg-warn .banner-title")), CAU_MOC);
    const nut = await s.ev(`(() => { const b = [...document.querySelectorAll('#actions button')].find((x) => x.textContent === 'Xác nhận đơn'); return b ? b.disabled : null; })()`);
    assert.equal(nut, true, "nút Xác nhận khoá");
    assert.equal(await s.ev(txt('#actions [data-chan="xac-nhan"]')), "Cần Quản trị duyệt đặt gấp");
    assert.equal(await s.ev(`!!document.querySelector('#actions [data-chan="xac-nhan"] svg')`), true, "có biểu tượng khoá");
    assert.equal(await s.ev(`!!document.querySelector('#order [data-action="mo-dat-gap"]')`), false);
    await axe(s, "trang đơn Bán hàng dưới mốc");
    await shotFull(s, "b7-don-ban-hang-may-tinh.png");
  });

  await b.step("3", "409 short_notice_required khi trang đã cũ (bật nút bằng tay, bấm Xác nhận): dải cát 'Còn chặng đón dưới mốc…' + dòng 'Chiều đi · Tour 4 đảo Nha Trang: Giờ đón … — dưới mốc 48 giờ', đơn vẫn nháp", async () => {
    await s.send("Page.navigate", { url: `${env.base}/order?id=${o1.id}` });
    await s.waitFor(shown("#order .dg-warn"), "trang đơn O1");
    await s.ev("window.confirm = () => true; true");
    await s.ev(`(() => { const b = [...document.querySelectorAll('#actions button')].find((x) => x.textContent === 'Xác nhận đơn'); b.disabled = false; b.click(); return true; })()`);
    await s.waitFor(`${txt("#error .banner-title")} === 'Còn lượt đưa đón quá hạn chốt — cần Quản trị duyệt đặt gấp trước khi xác nhận.'`, "dải 409");
    const dong = await s.ev(`[...document.querySelectorAll('#error .banner-lines li')].map((l) => l.textContent)`);
    assert.equal(dong.length, 1);
    assert.match(dong[0], /^Chiều đi · Tour 4 đảo Nha Trang: Giờ đón cách bây giờ \d+ giờ( \d+ phút)? — quá hạn chốt 48 giờ$/);
    assert.equal((await donQuaTrang(s, o1.id)).status, "draft");
    assert.equal(await s.ev(noCode), "");
  });

  await b.step("4", "Đơn đã đặt gấp + đã xác nhận, Bán hàng (văn phòng — chủ H4): nhãn ĐỦ 'Đặt gấp — Đơn bù cho khách bị lỡ chuyến — Quản Trị duyệt …' + ghi chú; sửa giờ đón vẫn dưới mốc → 409, câu máy chủ, KHÔNG khung Đặt gấp", async () => {
    await s.send("Page.navigate", { url: `${env.base}/order?id=${o3.id}` });
    await s.waitFor(shown("#order .dg-mark"), "nhãn đặt gấp");
    assert.equal(await s.ev(`document.querySelector('#order .dg-mark').dataset.datGap`), "du");
    assert.match(await s.ev(txt("#order .dg-mark")), /^Đặt gấp — Đơn bù cho khách bị lỡ chuyến — Quản Trị duyệt \d\d:\d\d “Bù chuyến 29\/9”$/);
    // ADR-0047 Phần B (2026-10-01): giờ đón sửa ở bảng "Sửa đưa đón" (lệnh PUT …/legs/:id), không còn ở "Sửa thông tin chuyến".
    await s.ev(click('[data-action="sua-dua-don"]'));
    await s.waitFor(shown('.sheet .dd-chang [data-o$=":gio"]'), "bảng sửa đưa đón");
    await s.ev(typeInto('.sheet .dd-chang [data-o$=":gio"]', "11:00"));
    await s.ev(click('.sheet [data-action="luu-dua-don"]'));
    await s.waitFor(`${txt(".sheet .banner .banner-title")} === 'Lượt đưa đón có giờ đón đã qua hạn chốt — chỉ Quản trị hoặc Toàn quyền sửa được, kèm lý do đặt gấp.'`, "câu 409 trong bảng");
    assert.equal(await s.ev(`!!document.querySelector('.sheet .dg-panel')`), false, "Bán hàng không có khung Đặt gấp");
    await sleep(600); // bảng ở ≥ 641px hiện dần (opacity, --m-base): chờ xong chuyển động rồi mới đo tương phản
    await axe(s, "bảng sửa chuyến Bán hàng 409");
    await s.ev(`document.querySelector('.sheet .sheet-close').click(); true`);
  });
  s.close();

  const sm = await env.as(ACCOUNTS.salesA, `/order?id=${o1.id}`, MOB);
  await b.step("5", "390 Bán hàng: trang đơn dưới mốc (khung 7b) — dải cảnh báo + dòng khoá, không tràn ngang, ô gõ ≥ 16px", async () => {
    await sm.waitFor(shown("#order .dg-warn"), "cảnh báo (390)");
    assert.ok(await sm.ev(noOverflowX));
    await axe(sm, "trang đơn 390 Bán hàng");
    await shotFull(sm, "b7-don-ban-hang-dien-thoai.png");
  });
  sm.close();

  // ---- Quản trị --------------------------------------------------------------------------------------------------------------------------------------------
  const a = await env.as(ACCOUNTS.admin, `/order?id=${o1.id}`, DESK);
  await b.step("6", "7a Quản trị (1040) trang đơn: dải cảnh báo + nút 'Đặt gấp'; nút Xác nhận khoá + 'Duyệt đặt gấp xong thì xác nhận được.'; khung: bốn lý do theo LY_DO_DAT_GAP, thiếu lý do → câu lỗi, ghi chú đếm /120", async () => {
    await a.waitFor(shown('#order [data-action="mo-dat-gap"]'), "nút Đặt gấp");
    assert.equal(await a.ev(txt('#actions [data-chan="xac-nhan"]')), "Duyệt đặt gấp xong thì xác nhận được.");
    assert.equal(await a.ev(txt("#order .dg-warn-sub")), "Xếp xe gấp cần Quản trị duyệt đặt gấp.");
    await a.ev(click('#order [data-action="mo-dat-gap"]'));
    await a.waitFor(shown("#order .dg-panel"), "khung Đặt gấp mở");
    assert.equal(await a.ev(`document.activeElement.dataset.dg`), "ly-do", "focus vào ô lý do");
    assert.deepEqual(await a.ev(`[...document.querySelectorAll('#order .dg-panel [data-dg="ly-do"] option')].slice(1).map((o) => o.textContent)`), LY_DO);
    await a.ev(click('#order [data-action="duyet-dat-gap"]'));
    await a.waitFor(`${txt("#order .dg-panel .vc-field-error")} === 'Chọn lý do đặt gấp.'`, "thiếu lý do → câu lỗi");
    await a.ev(`(() => { const s = document.querySelector('#order .dg-panel [data-dg="ly-do"]'); s.value = 'KHACH_DOAN_GOI_GAP'; s.dispatchEvent(new Event('change')); return true; })()`);
    assert.equal(await a.ev(`document.querySelector('#order .dg-panel .vc-field-error').hidden`), true, "chọn lý do thì câu lỗi cũ tắt");
    await a.ev(typeInto('#order .dg-panel [data-dg="ghi-chu"]', "Khách đoàn gọi lúc 07:40"));
    assert.equal(await a.ev(txt("#order .dg-panel .dp-count-text")), "24/120");
    assert.equal(await a.ev(noCode), "");
    await axe(a, "khung đặt gấp 1040");
    await shotFull(a, "b7-dat-gap-quan-tri-may-tinh.png");
  });

  await b.step("7", "Duyệt đặt gấp (route 30): báo đã duyệt; nhãn 7c 'Đặt gấp — Khách đoàn gọi gấp — Quản Trị duyệt HH:MM' + ghi chú; hết cảnh báo, nút Xác nhận mở; xác nhận được đơn", async () => {
    await a.ev(click('#order [data-action="duyet-dat-gap"]'));
    await a.waitFor(`${txt("#error .banner-title")} === 'Đã duyệt đặt gấp: Chiều đi · Tour 4 đảo Nha Trang.'`, "báo đã duyệt");
    assert.match(await a.ev(txt("#order .dg-mark")), /^Đặt gấp — Khách đoàn gọi gấp — Quản Trị duyệt \d\d:\d\d “Khách đoàn gọi lúc 07:40”$/);
    assert.equal(await a.ev(`!!document.querySelector('#order .dg-warn')`), false);
    assert.equal(await a.ev(`!!document.querySelector('#actions [data-chan]')`), false);
    const leg = legOf(await donQuaTrang(a, o1.id));
    assert.deepEqual([leg.datGap.lyDo, leg.datGap.ghiChu], ["KHACH_DOAN_GOI_GAP", "Khách đoàn gọi lúc 07:40"]);
    await axe(a, "nhãn đặt gấp 1040");
    await shotFull(a, "b7-da-dat-gap-quan-tri-may-tinh.png");
    await a.ev("window.confirm = () => true; true");
    await a.ev(`[...document.querySelectorAll('#actions button')].find((x) => x.textContent === 'Xác nhận đơn').click(); true`);
    await a.waitFor(`${txt("#order .badge")} === 'Đã xác nhận'`, "đơn đã xác nhận");
  });

  await b.step("8", "Sửa đưa đón đơn đã xác nhận dưới mốc (Quản trị, I14; bảng mới ADR-0047 Phần B): 409 → khung 'Đặt gấp' trong bảng → 'Duyệt đặt gấp' gửi lại kèm datGap → lưu được, dấu MỚI theo lý do vừa chọn", async () => {
    await a.send("Page.navigate", { url: `${env.base}/order?id=${o3.id}` });
    await a.waitFor(shown('[data-action="edit-trip"]'), "trang đơn O3");
    await a.ev(click('[data-action="sua-dua-don"]'));
    await a.waitFor(shown('.sheet .dd-chang [data-o$=":gio"]'), "bảng sửa đưa đón");
    await a.ev(typeInto('.sheet .dd-chang [data-o$=":gio"]', "11:30"));
    await a.ev(click('.sheet [data-action="luu-dua-don"]'));
    await a.waitFor(shown(".sheet .dg-panel"), "khung Đặt gấp trong bảng sau 409");
    await a.ev(`(() => { const s = document.querySelector('.sheet .dg-panel [data-dg="ly-do"]'); s.value = 'CHUYEN_BAY_DOI_GIO'; s.dispatchEvent(new Event('change')); return true; })()`);
    await sleep(600); // như bước 4: chờ bảng hiện hẳn
    await axe(a, "bảng sửa chuyến có khung đặt gấp");
    await shotView(a, "b7-sua-chuyen-dat-gap-may-tinh.png");
    await a.ev(click('.sheet [data-action="duyet-dat-gap"]'));
    await a.waitFor(`!document.querySelector('.sheet') && ${txt("#error .banner-title")} === 'Đã lưu đưa đón.'`, "lưu xong, bảng đóng");
    const put = apiCalls(a).filter((c) => c.method === "PUT" && /\/legs\/[^/]+$/.test(c.path));
    assert.equal(put.length, 2, "hai lần gửi: lần đầu không datGap (409), lần sau có");
    assert.equal(JSON.parse(put[0].body).datGap, undefined);
    assert.deepEqual(JSON.parse(put[1].body).datGap, { lyDo: "CHUYEN_BAY_DOI_GIO", ghiChu: null });
    const leg = legOf(await donQuaTrang(a, o3.id));
    assert.deepEqual([leg.pickupTime, leg.datGap.lyDo], ["11:30", "CHUYEN_BAY_DOI_GIO"]);
    assert.match(await a.ev(txt("#order .dg-mark")), /^Đặt gấp — Chuyến bay đổi giờ — Quản Trị duyệt \d\d:\d\d$/);
  });
  a.close();

  const am = await env.as(ACCOUNTS.admin, "/order-form", MOB);
  await b.step("9", "7a trên đơn CHƯA lưu (390, Quản trị): nút Đặt gấp trên thẻ; 'Duyệt đặt gấp' (nút phụ viền — chỉ #save là nút chính của form) = tự LƯU NHÁP rồi gọi lệnh đặt gấp (R-P15) → sang trang đơn thấy nhãn đặt gấp; không tràn ngang", async () => {
    await themDichVuTrenForm(am);
    await am.waitFor(shown('#services [data-action="mo-dat-gap"]'), "nút Đặt gấp trên thẻ");
    await am.ev(click('#services [data-action="mo-dat-gap"]'));
    await am.waitFor(shown("#services .dg-panel"), "khung Đặt gấp trên thẻ");
    await am.ev(`(() => { const s = document.querySelector('#services .dg-panel [data-dg="ly-do"]'); s.value = 'DON_BU_LO_CHUYEN'; s.dispatchEvent(new Event('change')); return true; })()`);
    await am.ev(typeInto('#services .dg-panel [data-dg="ghi-chu"]', "Bù cho khách lỡ tàu"));
    assert.ok(await am.ev(noOverflowX));
    const co = await am.ev(`[...document.querySelectorAll('#services .dg-panel input, #services .dg-panel select')].map((i) => parseFloat(getComputedStyle(i).fontSize))`);
    assert.ok(co.every((x) => x >= 16), JSON.stringify(co));
    await axe(am, "biểu mẫu Quản trị 390 khung đặt gấp");
    // Thang nút ba cấp của form Tạo đơn (thiết kế lại 18/10, việc 8 — đề bài "cho cả màn", chỉ "Lưu, chờ xác nhận" là nút chính): trong form chỉ #save mang .btn-primary;
    // "Duyệt đặt gấp" là nút phụ viền 1px (nền trắng, viền và chữ xanh). Trang đơn / bảng "Sửa đưa đón" (bước 6–8) giữ nút chính — không ở đây.
    const thangNut = await am.ev(`(() => { const b = document.querySelector('#services [data-action="duyet-dat-gap"]'); const s = getComputedStyle(b);
      const mau = (v, p) => { const d = document.createElement('div'); d.style[p] = v; document.body.append(d); const c = getComputedStyle(d)[p]; d.remove(); return c; };
      return { chinh: [...document.querySelectorAll('#order-form .btn-primary')].map((e) => e.id || e.textContent.trim()), nen: s.backgroundColor === mau('var(--c-surface)', 'backgroundColor'),
        vien: s.borderTopStyle + ' ' + s.borderTopWidth + ' ' + (s.borderTopColor === mau('var(--c-primary)', 'color')), chu: s.color === mau('var(--c-primary)', 'color') }; })()`);
    assert.deepEqual(thangNut, { chinh: ["save"], nen: true, vien: "solid 1px true", chu: true }, "thang nút form: 'Duyệt đặt gấp' là nút phụ viền, chỉ #save là nút chính");
    await am.ev(`document.querySelector('#services .dg-panel').scrollIntoView({ block: 'center' }); true`);
    await shotView(am, "b7-bieu-mau-dat-gap-quan-tri-dien-thoai.png");
    await am.ev(click('#services [data-action="duyet-dat-gap"]'));
    await am.waitFor(`location.pathname === '/order'`, "lưu nháp xong sang trang đơn", 15000);
    assert.equal(new URLSearchParams(await am.ev("location.search")).get("datgap"), null, "lệnh đặt gấp thành công → không có datgap=loi");
    await dongConfirmDialog(am);
    await am.waitFor(shown("#order .dg-mark"), "nhãn đặt gấp trên đơn vừa lưu");
    assert.match(await am.ev(txt("#order .dg-mark")), /^Đặt gấp — Đơn bù cho khách bị lỡ chuyến — Quản Trị duyệt \d\d:\d\d “Bù cho khách lỡ tàu”$/);
    const posts = apiCalls(am).filter((c) => c.method === "POST");
    assert.deepEqual(posts.map((c) => c.path.replace(/[0-9a-f-]{36}/g, ":id")), ["/api/orders", "/api/orders/:id/legs/:id/short-notice"]);
    await shotFull(am, "b7-da-dat-gap-dien-thoai.png");
  });
  am.close();

  // ---- Đối tác (mở SAU CÙNG) -------------------------------------------------------------------------------------------------------------------------------
  const d = await env.as(DOI_TAC, `/order?id=${o2.id}`, MOB);
  await b.step("10", "Đối tác (chủ H4): đơn của mình đã đặt gấp chỉ thấy 'Đặt gấp — Quản trị đã duyệt' — không lý do, không người duyệt, không ghi chú (DTO chỉ có cờ)", async () => {
    await d.waitFor(shown("#order .dg-mark"), "nhãn đặt gấp (Đối tác)");
    assert.equal(await d.ev(`document.querySelector('#order .dg-mark').dataset.datGap`), "co");
    assert.equal(await d.ev(txt("#order .dg-mark")), "Đặt gấp — Quản trị đã duyệt");
    // Khối dịch vụ (phần V12) không có lý do / ghi chú. Khối "Lịch sử" (nhật ký đơn của MÁY CHỦ) kiểm riêng ở bước 10b (bài canh R-P21).
    assert.equal(await d.ev(`(() => { const t = document.querySelector('#order .services').innerText; return t.includes('Ghi chú nội bộ') || t.includes('Khách đoàn gọi gấp'); })()`), false);
    assert.equal(await d.ev(`document.body.innerText.includes('Ghi chú nội bộ')`), false, "ghi chú đặt gấp không lộ ở đâu trên trang");
    const leg = legOf(await donQuaTrang(d, o2.id));
    assert.deepEqual(leg.datGap, { daDuyet: true });
    await axe(d, "trang đơn Đối tác");
    await shotFull(d, "b7-don-doi-tac-dien-thoai.png");
  });
  // BÀI CANH R-P21 (Q-B-5, điều phối 29/9): chủ H4 — Đối tác / HDV / Thực tập chỉ biết "Quản trị đã duyệt". Nhật ký đơn mà máy chủ trả cho Đối tác KHÔNG được
  // mang nhãn lý do đặt gấp hay tên người duyệt. Tới khi máy chủ vá R-P21, bước này ĐỎ ĐÚNG CHỖ ("đỏ chờ R-P21") — không sửa giao diện để che.
  await b.step("10b", "BÀI CANH R-P21 — Lịch sử đơn của Đối tác không có lý do đặt gấp, không có tên người duyệt (đỏ trước khi gộp máy chủ df32e83, xanh sau)", async () => {
    const lichSu = await d.ev(`[...document.querySelectorAll('.history li')].map((li) => li.innerText.replace(/\\s+/g, ' ').trim()).filter((t) => /đặt gấp/i.test(t))`);
    const lo = lichSu.filter((t) => t.includes("Khách đoàn gọi gấp") || t.includes(ACCOUNTS.admin.name));
    assert.deepEqual(lo, [], `dòng nhật ký lộ lý do / người duyệt cho Đối tác: ${JSON.stringify(lichSu)}`);
  });
  await b.step("11", "Không lỗi console (trừ 401/403/409 của tài nguyên — 409 là lỗi cố ý ở bước 3, 4, 8)", async () => {
    await sleep(200);
    for (const [ten, pg] of [["bán hàng 1040", s], ["bán hàng 390", sm], ["quản trị 1040", a], ["quản trị 390", am], ["đối tác", d]]) {
      const loi = pg.consoleErrors.filter((e) => !/Failed to load resource: the server responded with a status of 40[139]/.test(e));
      assert.deepEqual(loi, [], ten);
    }
  });
  d.close();
  void o4Id;
} finally {
  b.xong();
  await env.stop();
}

// B4–B6 + bấm thay (A15): Cuốc của tôi (/cuoc — V5, trang mở đầu của tài xế công ty, Q5), một chuyến của tài xế (/cuoc-chuyen — V6 Chuyến đang chạy, V7 Xuất
// bến), văn phòng bấm thay ở Chi tiết chuyến (/chuyen — thành phần A "xảy ra lúc"). ADR-0049 D3, ADR-0050 VK1-A; bản vẽ docs/design/van-chuyen-dieu-phoi/
// project/04, 05 (5a, 5b, 5c), 06 (6b, 6c, 6d); bản đối chiếu 2.5, H15; ruling R-P11, R-P14, R-P17; lệnh điều phối vòng 3 (mất mạng: "Chưa gửi được — bấm
// lại", CÙNG requestId, không tự gửi lại).
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0049/kich-ban/cuoc-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: Tài xế → Bán hàng → Kế toán (trang mở sau cùng là của Kế toán).
import { randomUUID } from "node:crypto";
import {
  ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, noCode, noOverflowX, shotFull, shotView, shown, sleep, txt,
  typeInto,
} from "./dp-lib.mjs";

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("CUOC SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
const AN = d.AN.account;
// Ngày mai của An: T4 (10:00, xe đủ giấy) có O4 (2 khách) — xếp bằng phá lệ vì đã trong mốc 48 giờ; T6 (14:00, xe 79A-222.22 THIẾU Bảo hiểm) trống.
const x4 = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${d.T4.id}/phan-bo`, { version: d.T4.version, requestId: randomUUID(), chang: [{ legId: d.O4.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } });
assert.equal(x4.status, 200, x4.text);
const t6 = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: d.XE_B.id, taiXePartyId: d.AN.partyId, batDau: { ngay: d.NGAY_KHOA, gio: "14:00" }, ketThuc: { ngay: d.NGAY_KHOA, gio: "15:00" } });
assert.equal(t6.status, 201, t6.text);
const T6 = t6.json.chuyen;
const TEN_O4 = ["Hành Khách Thử 5-1", "Hành Khách Thử 5-2"];
const SDT_O4 = "0903 100 205";

const tt = (p) => p.ev(`[...document.querySelectorAll('#tabbar a')].filter((a) => a.getClientRects().length).map((a) => [a.getAttribute('href'), a.innerText.trim(), a.getAttribute('aria-current')])`);
const html = (p) => p.ev(`document.querySelector('main').innerHTML`);
const posts = (p, duoi) => apiCalls(p).filter((r) => r.method === "POST" && r.path.endsWith(duoi));

try {
  // ---- Tài xế (điện thoại) -----------------------------------------------------------------------------------------------------------------------------------
  const p = await env.as(AN, "/", MOB);
  await b.step("1", `4a 390 tài xế mở "/" → /cuoc: "Hôm nay" (trống) + "Ngày mai" (2 chuyến theo giờ); chuyến thiếu giấy xe "Bị giữ" + "(văn phòng lo)"; KHÔNG tên / SĐT khách; ba tab${axeNote()}`, async () => {
    await p.waitFor(`location.pathname === '/cuoc' && document.querySelectorAll('.dp-cuoc-day').length === 2`, "Cuốc của tôi dựng xong", 12000);
    const g = await p.ev(`[...document.querySelectorAll('.dp-cuoc-day')].map((x) => ({ t: x.querySelector('.dp-cuoc-day-title').innerText, n: x.querySelectorAll('.dp-cuoc-the').length, trong: x.querySelector('.dp-cuoc-trong')?.innerText ?? null }))`);
    assert.deepEqual(g, [{ t: "Hôm nay", n: 0, trong: "Không có cuốc nào." }, { t: "Ngày mai", n: 2, trong: null }]);
    const the = await p.ev(`[...document.querySelectorAll('.dp-cuoc-the')].map((x) => ({ href: x.getAttribute('href'), text: x.innerText.replace(/\\s+/g, ' ').trim() }))`);
    assert.equal(the[0].href, `/cuoc-chuyen?id=${d.T4.id}`);
    assert.match(the[0].text, new RegExp(`^10:00 ${d.T4.ma} Đã lên kế hoạch 79A-111\\.11 · 2 khách · 1 điểm đón · 1 điểm trả$`));
    assert.match(the[1].text, new RegExp(`^14:00 ${T6.ma} Bị giữ 79A-222\\.22 · 0 khách · 0 điểm đón · 0 điểm trả .*\\(văn phòng lo\\)`));
    const h = await html(p);
    for (const x of [...TEN_O4, SDT_O4]) assert.ok(!h.includes(x), `không tên / SĐT khách ở Cuốc của tôi: ${x}`);
    assert.deepEqual(await tt(p), [["/tai-xe", "Trang chủ", null], ["/cuoc", "Cuốc của tôi", "page"], ["/account", "Tôi", null]]);
    assert.deepEqual(apiCalls(p).filter((r) => r.path.startsWith("/api/van-chuyen") && !r.path.startsWith("/api/van-chuyen/cuoc-cua-toi")), [], "chỉ route tài xế");
    assert.equal(await p.ev(noCode), "");
    assert.ok(await p.ev(noOverflowX));
    await axe(p, "Cuốc của tôi 390");
    await shotFull(p, "b4-cuoc-cua-toi-dien-thoai.png");
  });

  await b.step("2", `6b 390 chuyến bị giữ: CHỈ điều kiện còn thiếu "(văn phòng lo)", không hạn giấy tờ; "Xuất bến" khoá + "Chưa xuất bến được — văn phòng đang lo."`, async () => {
    await p.ev(click(`.dp-cuoc-the[data-chuyen="${T6.id}"]`));
    await p.waitFor(`location.pathname === '/cuoc-chuyen' && !!document.querySelector('[data-action="xuat-ben"]')`, "màn xuất bến");
    const dk = await p.ev(`[...document.querySelectorAll('.dp-cond')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`);
    assert.ok(dk.length >= 1 && dk.every((x) => x.endsWith("(văn phòng lo)")), JSON.stringify(dk));
    assert.ok(dk.some((x) => x.includes("79A-222.22")), JSON.stringify(dk));
    assert.ok(!(await html(p)).match(/hạn \d\d\/\d\d\/\d{4}/), "không hạn giấy tờ ở màn tài xế");
    assert.equal(await p.ev(`document.querySelector('[data-action="xuat-ben"]').disabled`), true);
    assert.equal(await p.ev(txt(".dp-cc-foot")), "Chưa xuất bến được — văn phòng đang lo.");
    assert.equal(await p.ev(txt(".bar-title")), `Xuất bến ${T6.ma}`);
    await shotFull(p, "b6-xuat-ben-chua-dat-dien-thoai.png");
  });

  await b.step("3", `6c → 5a 390: chuyến đủ điều kiện ("Đủ điều kiện xuất bến"), trước xuất bến KHÔNG tên khách; bấm "Xuất bến" (không ô giờ, thân không có xayRaLuc) → đang chạy: tên + năm sinh + liên hệ của đơn hiện${axeNote()}`, async () => {
    await p.send("Page.navigate", { url: `${env.base}/cuoc-chuyen?id=${d.T4.id}` });
    await p.waitFor(`!!document.querySelector('[data-action="xuat-ben"]') && location.search.includes('${d.T4.id}')`, "màn xuất bến T4");
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('.dp-cond')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`), ["✓ Đủ điều kiện xuất bến"]);
    assert.equal(await p.ev(`document.querySelector('[data-action="xuat-ben"]').disabled`), false);
    assert.match(await p.ev(txt(".dp-cc-foot")), /^Bấm lúc xe lăn bánh — giờ ghi là lúc bấm \(\d\d:\d\d\)\.$/);
    for (const x of TEN_O4) assert.ok(!(await html(p)).includes(x), "trước xuất bến (ngoài ngày chạy) không tên khách");
    await shotFull(p, "b6-xuat-ben-dat-dien-thoai.png");
    await p.ev(click('[data-action="xuat-ben"]'));
    await p.waitFor(`!!document.querySelector('.dp-run')`, "màn đang chạy");
    const body = JSON.parse(posts(p, "/xuat-ben").at(-1).body);
    assert.deepEqual(Object.keys(body), ["requestId"], "tài xế tự bấm: không xayRaLuc");
    assert.match(await p.ev(txt(".dp-cc-head")), /^Đang chạy 79A-111\.11 · xuất bến \d\d:\d\d · trên xe 0\/15$/);
    const k = await p.ev(`[...document.querySelectorAll('.dp-khach-ten')].map((x) => x.innerText)`);
    assert.deepEqual(k.sort(), TEN_O4, "đang chạy (trong ngày chạy): có tên khách");
    assert.match(await p.ev(txt(".dp-run-lien-he")), new RegExp(`^Liên hệ: Khách Điều Phối 5 ${SDT_O4}$`));
    assert.equal(await p.ev(`document.querySelector('.dp-run-lien-he a').getAttribute('href')`), "tel:0903100205");
    assert.equal(await p.ev(txt('.dp-run [data-action="da-toi"]')), "Đã tới");
    assert.equal(await p.ev(`document.querySelectorAll('.dp-khach-btn').length`), 0, "chưa tới điểm: chưa đánh dấu khách");
    assert.equal(await p.ev(`document.querySelector('[data-action="ket-thuc"]').disabled`), true);
    assert.equal(await p.ev(`document.querySelectorAll('.dp-thu-tu').length`), 4, "hai điểm chưa tới: nút lên / xuống (không kéo)");
    assert.equal(await p.ev(noCode), "");
    await axe(p, "chuyến đang chạy 390");
    await shotFull(p, "b5-chuyen-dang-chay-dien-thoai.png");
  });

  await b.step("4", `5a: "Đã tới" → khách có Đã đón / Vắng / Khách đã huỷ; "Đã đón" khách 1 → "Đã đón"; phản hồi lệnh không kèm liên hệ — màn GIỮ dòng liên hệ của lần tải`, async () => {
    await p.ev(click('.dp-run [data-action="da-toi"]'));
    await p.waitFor(`document.querySelectorAll('.dp-khach-btn[data-action="don"]').length === 2`, "nút khách").catch(async (e) => {
      throw new Error(`${e.message}\n    trang: ${await p.ev(txt("#cc-trang"))}\n    console: ${JSON.stringify(p.consoleErrors)}\n    POST: ${JSON.stringify(apiCalls(p).filter((r) => r.method === "POST").map((r) => r.path))}`);
    });
    await p.ev(click('.dp-khach-btn[data-action="don"]'));
    await p.waitFor(`document.querySelectorAll('.dp-khach-kq.is-ok').length === 1`, "một khách đã đón");
    // GA-55: phản hồi lệnh không còn tên / liên hệ — màn đọc lại chi tiết: tên vẫn đúng, không "Khách 1", không ô trống.
    assert.deepEqual((await p.ev(`[...document.querySelectorAll('.dp-khach-ten')].map((x) => x.innerText)`)).sort(), TEN_O4);
    assert.match(await p.ev(txt(".dp-run-lien-he")), /^Liên hệ: Khách Điều Phối 5/);
    assert.match(await p.ev(txt(".dp-cc-head")), / · trên xe 1\/15$/);
  });

  await b.step("5", `mất mạng: bấm "Vắng" → dòng "Chưa gửi được" + "Bấm lại" + dải "Mất mạng — 1 thao tác chưa gửi được"; máy KHÔNG tự gửi lại; có mạng, bấm lại → "Vắng", CÙNG requestId`, async () => {
    await p.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    const truoc = posts(p, "/vang").length;
    await p.ev(click('.dp-khach-btn[data-action="vang"]'));
    await p.waitFor(`!!document.querySelector('.dp-khach.is-cho [data-action="bam-lai"]')`, "dòng chưa gửi được");
    assert.equal(await p.ev(txt("#cc-trang > .banner-warning .banner-title")), "Mất mạng — 1 thao tác chưa gửi được");
    await shotFull(p, "b5-mat-mang-dien-thoai.png");
    await sleep(2500);
    assert.equal(posts(p, "/vang").length, truoc + 1, "không tự gửi lại");
    await p.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await p.ev(click('.dp-khach.is-cho [data-action="bam-lai"]'));
    await p.waitFor(`!!document.querySelector('.dp-khach-kq.is-vang')`, "khách vắng");
    const ids = posts(p, "/vang").slice(truoc).map((r) => JSON.parse(r.body).requestId);
    assert.equal(ids.length, 2);
    assert.equal(ids[0], ids[1], "bấm lại dùng CÙNG requestId");
    assert.equal(await p.ev(`!!document.querySelector('#cc-trang > .banner-warning')`), false);
  });

  await b.step("6", `5a: điểm trả "Đã trả" (tới điểm rồi trả khách trên xe) → "Kết thúc chuyến" mở → kết thúc; hộp "Kết thúc gián đoạn" có lý do nhóm Kết thúc gián đoạn, KHÔNG ô ghi chú`, async () => {
    await p.ev(click('[data-action="ket-thuc-gian-doan"]'));
    await p.waitFor(`!!document.querySelector('[data-action="gian-doan-gui"]')`, "hộp gián đoạn");
    await sleep(600);
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('.sheet .vc-reason')].map((x) => x.textContent)`), ["Xe hỏng", "Tai nạn", "Khác"]);
    assert.equal(await p.ev(`document.querySelectorAll('.sheet textarea').length`), 0);
    assert.equal(await p.ev(`document.querySelector('[data-action="gian-doan-gui"]').disabled`), true);
    await shotView(p, "b5-ket-thuc-gian-doan-dien-thoai.png");
    await p.ev(click(".sheet .vc-btn-ghost-primary"));
    await sleep(500);
    await p.ev(click('.dp-run [data-action="tra-het"]'));
    await p.waitFor(`!document.querySelector('[data-action="ket-thuc"]').disabled`, "kết thúc mở");
    await p.ev(click('[data-action="ket-thuc"]'));
    await p.waitFor(`/^Hoàn tất|^Đã kết thúc|^Kết thúc/.test(${txt(".dp-cc-head .chip")} ?? '')`, "chuyến đã kết thúc");
    assert.ok(await p.ev(`!!document.querySelector('.dp-ct-moc')`), "có mốc kết thúc");
    assert.equal(await p.ev(`document.querySelectorAll('.dp-run-btn, .dp-khach-btn').length`), 0);
    assert.deepEqual(p.consoleErrors, []);
  });
  await p.close();

  // ---- Bán hàng bấm thay (máy tính) --------------------------------------------------------------------------------------------------------------------------
  // Chờ hơn HAI phút kể từ lệnh cuối (chuyến trước của tài xế kết thúc ở bước 6): giờ sớm nhất khai được làm tròn LÊN phút, chờ một phút có khi vẫn trùng
  // phút lúc bấm (lần chạy thứ hai đã trùng) — hơn hai phút thì chắc chắn có một phút khai lùi hợp lệ khác lúc bấm.
  await sleep(125_000);
  const s = await env.as(ACCOUNTS.salesA, `/chuyen?id=${d.T1.id}`, DESK);
  await b.step("7", `6d 1040 Bán hàng: "Xuất bến thay tài xế" → hộp: "Đạt đủ … điều kiện", "Ghi thay tài xế …", ô "Xảy ra lúc" mặc định lúc bấm + "Sớm nhất" của máy chủ; giờ ngoài khoảng → câu dưới ô; khai đúng "Sớm nhất" → gửi xayRaLuc, mốc xuất bến HAI giờ + "giờ do văn phòng khai"${axeNote()}`, async () => {
    await s.waitFor(`!!document.querySelector('.dp-ct-actions [data-action="xuat-ben-thay"]')`, "nút xuất bến thay");
    await s.ev(click('.dp-ct-actions [data-action="xuat-ben-thay"]'));
    await s.waitFor(`!!document.querySelector('[data-action="khai-gio-gui"]')`, "hộp khai giờ");
    await sleep(600);
    assert.equal(await s.ev(txt(".sheet-title")), `Xuất bến ${d.T1.ma} — bấm thay tài xế`);
    assert.match(await s.ev(txt(".dp-sheet-khai-gio .dp-banner-ok")), /^Đạt đủ \d+ điều kiện xuất bến$/);
    assert.equal(await s.ev(txt(".dp-sheet-khai-gio .dp-sheet-text")), "Ghi thay tài xế Nguyễn Văn An. Tên bạn được ghi kèm mốc này.");
    const mac = await s.ev(`document.querySelector('#tdo-gio').value`);
    assert.match(await s.ev(txt("#tdo-gio-hint")), new RegExp(`^Để nguyên là lúc bấm \\(${mac}\\)\\. Sớm nhất: \\d\\d:\\d\\d( \\d\\d/\\d\\d)?\\.$`));
    await axe(s, "hộp khai giờ 1040");
    await shotView(s, "b2-xuat-ben-thay-may-tinh.png");
    // Giờ gõ nhầm 5 phút SAU lúc bấm → hôm nay (xayRaLucTu chọn ngày gần lúc bấm nhất) → máy chủ từ chối "chưa tới" (bản vẽ 6d); câu dưới ô (sát nửa đêm cũng vậy — xayRaLucTu xét cả ngày mai).
    const [gh, gm] = mac.split(":").map(Number);
    const sau = `${String(Math.floor(((gh * 60 + gm + 5) % 1440) / 60)).padStart(2, "0")}:${String((gm + 5) % 60).padStart(2, "0")}`;
    await s.ev(typeInto("#tdo-gio", sau));
    await s.ev(click('[data-action="khai-gio-gui"]'));
    await s.waitFor(`!document.querySelector('#tdo-gio-error').hidden`, "câu lỗi dưới ô");
    assert.match(await s.ev(txt("#tdo-gio-error")), /^Giờ này chưa tới — bây giờ là \d\d:\d\d\.$/);
    assert.equal(await s.ev(`document.querySelector('#tdo-gio').getAttribute('aria-invalid')`), "true");
    await shotView(s, "b2-khai-gio-loi-may-tinh.png");
    // Khai đúng giờ sớm nhất máy chủ cho (≥ 1 phút trước lúc bấm nhờ chờ hơn hai phút) → qua; mốc hiện hai giờ + dấu "giờ do văn phòng khai" (thành phần B).
    const som = (await s.ev(txt("#tdo-gio-hint"))).match(/Sớm nhất: (\d\d:\d\d)/)[1];
    assert.notEqual(som, mac, "giờ sớm nhất khác lúc bấm (đã chờ hơn hai phút)");
    await s.ev(typeInto("#tdo-gio", som));
    await s.ev(click('[data-action="khai-gio-gui"]'));
    await s.waitFor(`${txt(".dp-ct-head .chip")} === 'Đang chạy'`, "đã xuất bến");
    const bodies = posts(s, "/xuat-ben").map((r) => JSON.parse(r.body));
    assert.equal(bodies.length, 2);
    assert.ok(bodies.every((x) => typeof x.xayRaLuc === "string" && x.xayRaLuc.endsWith("Z")), "đã đổi giờ → gửi xayRaLuc (ISO có múi giờ)");
    assert.match(await s.ev(txt(".dp-ct-moc")), new RegExp(`^Xuất bến ${som}( \\d\\d/\\d\\d)? · ghi lúc \\d\\d:\\d\\d( \\d\\d/\\d\\d)? — Sales Một giờ do văn phòng khai$`));
  });

  await b.step("8", `5c 1040 Bán hàng: chuyến đang chạy — "Đã tới" để nguyên giờ → thân KHÔNG có xayRaLuc (I34), mốc MỘT giờ; GA-55: sau lệnh tên khách vẫn hiện đúng`, async () => {
    await s.waitFor(`!!document.querySelector('.dp-run [data-action="da-toi"]')`, "nút đã tới");
    await s.ev(click('.dp-run [data-action="da-toi"]'));
    await s.waitFor(`!!document.querySelector('[data-action="khai-gio-gui"]')`, "hộp khai giờ");
    const tenTruoc = await s.ev(`[...document.querySelectorAll('.dp-khach-ten')].map((x) => x.innerText)`);
    assert.deepEqual([...tenTruoc].sort(), ["Hành Khách Thử 1-1", "Hành Khách Thử 1-2", "Hành Khách Thử 1-3"], "thứ tự khách theo máy chủ");
    await s.ev(click('[data-action="khai-gio-gui"]'));
    await s.waitFor(`!document.querySelector('.sheet-root') && !!document.querySelector('.dp-run .dp-moc')`, "mốc đã tới");
    assert.match(await s.ev(txt(".dp-run .dp-moc")), /^Đã tới \d\d:\d\d( \d\d\/\d\d)?$/, "để nguyên → một giờ, không dấu văn phòng khai");
    assert.deepEqual(Object.keys(JSON.parse(posts(s, "/da-toi").at(-1).body)), ["requestId"], "để nguyên → không xayRaLuc (I34)");
    // GA-55: phản hồi lệnh không còn tên khách — màn đọc lại chi tiết, tên vẫn đúng (không "Khách 1", không ô trống, không "undefined").
    assert.deepEqual(await s.ev(`[...document.querySelectorAll('.dp-khach-ten')].map((x) => x.innerText)`), tenTruoc);
    assert.equal(await s.ev(`document.querySelectorAll('.dp-khach-btn[data-action="don"]').length`), 3, "đã tới → nút khách");
    assert.equal(await s.ev(noCode), "");
    await shotFull(s, "b2-dang-chay-bam-thay-may-tinh.png");
  });
  await s.close();

  // ---- Tài khoản vừa tài xế công ty vừa Bán hàng (kiểm độc lập K2b T2 — giả định bề mặt GA-K2b-T2 do điều phối chốt) ------------------------------------
  const tl = await call(ACCOUNTS.admin, "POST", "/api/staff", { fullName: "Lai Tài Xế Bán Hàng", phone: "0900000469", roles: ["DRIVER_INTERNAL", "SALES_STAFF"] });
  assert.equal(tl.status, 201, `tạo tài khoản lai: ${tl.text}`);
  const LAI = { name: "Lai Tài Xế Bán Hàng", phone: tl.json.staff.phone, pin: tl.json.pin, permissions: ["DRIVER", "SALES"] };
  const l = await env.as(LAI, "/", DESK);
  await b.step("9b", "K2b T2: tài khoản DRIVER + SALES — trang đầu KHÔNG đổi (ở Trang chủ); thanh bên có \"Cuốc của tôi\" → mở /cuoc; điện thoại: trang Tôi có dòng \"Cuốc của tôi\", thanh tab KHÔNG thêm tab, ở /cuoc tab \"Tôi\" sáng", async () => {
    await l.waitFor(`!!document.querySelector('#sidebar .sidebar-item')`, "thanh bên");
    await sleep(800);
    assert.equal(await l.ev("location.pathname"), "/", "trang đầu của tổ hợp này không đổi (Q5 chỉ cho tài khoản chỉ tài xế)");
    const muc = await l.ev(`[...document.querySelectorAll('#sidebar .sidebar-item')].map((a) => [a.innerText.trim(), a.getAttribute('href')])`);
    assert.ok(muc.some(([t, h]) => t === "Cuốc của tôi" && h === "/cuoc"), JSON.stringify(muc));
    await l.ev(click('#sidebar a[href="/cuoc"]'));
    await l.waitFor(`location.pathname === '/cuoc' && document.querySelectorAll('.dp-cuoc-day').length === 2`, "mở /cuoc");
    assert.equal(await l.ev(`document.querySelector('#sidebar a[href="/cuoc"]').getAttribute('aria-current')`), "page");
    assert.equal(await l.ev("!document.getElementById('error').hidden"), false);
    await l.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await l.send("Page.navigate", { url: env.base + "/account" });
    await l.waitFor(`!!document.querySelector('#vc-links')`, "trang Tôi");
    assert.deepEqual(await l.ev(`[...document.querySelectorAll('#vc-links .row-link')].map((a) => [a.innerText.trim(), a.getAttribute('href')])`), [["Điều phối xe", "/dieu-phoi"], ["Cuốc của tôi", "/cuoc"]]);
    const tabs = await tt(l);
    assert.ok(!tabs.some(([h]) => h === "/cuoc"), `không tab Cuốc của tôi: ${JSON.stringify(tabs)}`);
    await l.ev(click('#vc-links a[href="/cuoc"]'));
    await l.waitFor(`location.pathname === '/cuoc' && document.querySelectorAll('.dp-cuoc-day').length === 2`, "mở /cuoc (điện thoại)");
    assert.deepEqual((await tt(l)).filter(([, , c]) => c === "page").map(([h]) => h), ["/account"], "tab Tôi sáng ở /cuoc");
    await shotFull(l, "b4-cuoc-tai-khoan-lai-dien-thoai.png");
  });
  await l.close();

  // ---- Kế toán (chỉ xem) ---------------------------------------------------------------------------------------------------------------------------------------
  const k = await env.as(ACCOUNTS.accounting, `/chuyen?id=${d.T1.id}`, DESK);
  await b.step("9", "Kế toán mở chuyến đang chạy: thấy điểm, mốc; KHÔNG nút bấm thay nào (ô trip.progress)", async () => {
    await k.waitFor(`!!document.querySelector('.dp-run')`, "điểm dừng đang chạy");
    assert.equal(await k.ev(`document.querySelectorAll('.dp-run-btn, .dp-khach-btn, [data-action="ket-thuc"], [data-action="ket-thuc-gian-doan"], [data-action="xuat-ben-thay"]').length`), 0);
    assert.equal(apiCalls(k).filter((r) => r.method === "POST").length, 0);
  });
  await k.close();

  await b.step("10", "không lỗi console ở mọi trang đã mở", async () => {
    for (const pg of [s, l, k]) assert.deepEqual(pg.consoleErrors, []);
  });
} finally {
  b.xong();
  await env.stop();
}

// B3 — V3 Tạo / sửa chuyến (/chuyen-sua) cho VĂN PHÒNG. ADR-0049 V3 (route 2, 4), ADR-0050; bản vẽ docs/design/van-chuyen-dieu-phoi/project/03 Tao sua chuyen.dc.html
// (3a, 3b); bản đối chiếu DOI-CHIEU-2026-09-29.md mục 2.2 (tạo trong mốc không hỏi phá lệ), 2.3 (dời giờ không cần phá lệ; câu mốc chỉ khi đổi xe / tài xế của
// chuyến đang khoá), H18 (phá lệ khoảng nghỉ ở 3b), Q1 (không ô ghi chú).
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0049/kich-ban/chuyen-sua-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: làm hết các bước của một tài khoản rồi mới sang tài khoản khác (Bán hàng → Quản trị → Kế toán; trang mở sau cùng là của Kế toán).
import {
  ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, fetchTrang, noCode, noOverflowX, shotFull, shotView, shown, sleep, txt,
  typeInto,
} from "./dp-lib.mjs";

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("CHUYEN SUA SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
// Đợt 4 G3: một tuyến đang dùng + một tuyến đã ngưng (Kế toán giữ ô transport.rate.manage) — ô "Tuyến" chỉ liệt kê tuyến đang dùng.
const taoTuyen = async (ten) => {
  const r = await call(ACCOUNTS.accounting, "POST", "/api/van-chuyen/tuyen", { ten });
  assert.equal(r.status, 201, r.text);
  return r.json.tuyen.find((t) => t.ten === ten).ma;
};
const TUYEN = await taoTuyen("Nha Trang – sân bay Cam Ranh");
const TUYEN_NGUNG = await taoTuyen("Nha Trang – Hòn Tằm");
assert.equal((await call(ACCOUNTS.accounting, "PUT", `/api/van-chuyen/tuyen/${TUYEN_NGUNG}`, { dangDung: false })).status, 200);
const dm = (ngay) => `${ngay.slice(8, 10)}/${ngay.slice(5, 7)}`;
const di = async (p, path) => {
  await p.ev(`document.body.dataset.cu = '1'`);
  await p.send("Page.navigate", { url: env.base + path });
  await p.waitFor(`!document.body.dataset.cu && document.readyState === 'complete'`, `mở ${path}`);
};
const choForm = (p) => p.waitFor(`!document.querySelector('#cx-layout').hidden`, "form chuyến dựng xong");
const loi = (o) => txt(`#cx-${o}-error`);
const loiHien = `['xe','tai-xe','tu','den'].filter((o) => !document.getElementById('cx-' + o + '-error').hidden)`;
const gui = (p) => p.ev(click('[data-action="luu-chuyen"], [data-action="luu-chuyen-day"]'));
const ghi = (p) => apiCalls(p).filter((r) => r.method !== "GET" && r.path.startsWith("/api/van-chuyen/chuyen"));
const dongCot = `[...document.querySelectorAll('#cx-ngay .dp-hist-row[data-ma]')].map((r) => ({ ma: r.dataset.ma, trung: r.classList.contains('is-trung'), text: r.innerText.replace(/\\s+/g, ' ').trim() }))`;

try {
  // ---- Bán hàng, máy tính ------------------------------------------------------------------------------------------------------------------------------------
  const p = await env.as(ACCOUNTS.salesA, `/chuyen-sua?ngay=${d.NGAY_XA}`, DESK);
  await choForm(p);

  await b.step("1", `3a 1040 Bán hàng: tiêu đề "Chuyến mới · ${dm(d.NGAY_XA)}", ô Xe / Tài xế / hai ô giờ; xe bảo dưỡng hiện nhưng không chọn được; tài xế theo nhóm; KHÔNG ô ghi chú (Q1)${axeNote()}`, async () => {
    assert.equal(await p.ev(txt("#cx-title")), `Chuyến mới · ${dm(d.NGAY_XA)}`);
    assert.equal(await p.ev(txt("#cx-back")), `‹ Điều phối xe ${dm(d.NGAY_XA)}`);
    assert.equal(await p.ev(`document.querySelector('#cx-back').getAttribute('href')`), `/dieu-phoi?ngay=${d.NGAY_XA}`);
    const nhan = await p.ev(`[...document.querySelectorAll('#cx-form .vc-field > label')].map((l) => l.textContent)`);
    assert.deepEqual(nhan, ["Xe", "Tuyến", "Tài xế", "Giờ bắt đầu", "Giờ kết thúc"]);
    // Đợt 4 G3: ô Tuyến — "Chưa chọn tuyến" + chỉ tuyến đang dùng (tuyến ngưng không có), không số tiền.
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('#cx-tuyen option')].map((o) => o.textContent)`), ["Chưa chọn tuyến", "Nha Trang – sân bay Cam Ranh"]);
    assert.equal(await p.ev(`document.querySelector('#cx-tuyen').value`), "");
    assert.equal(await p.ev(`document.querySelectorAll('#cx-form textarea').length`), 0, "không ô ghi chú cho tài xế (chủ Q1)");
    const xe = await p.ev(`[...document.querySelectorAll('#cx-xe option')].map((o) => ({ t: o.textContent, off: o.disabled }))`);
    assert.deepEqual(xe.find((o) => o.t.startsWith("79A-333.33")), { t: "79A-333.33 · 15 chỗ · xe công ty · đang bảo dưỡng", off: true });
    assert.deepEqual(xe.find((o) => o.t.startsWith("79A-111.11")), { t: "79A-111.11 · 15 chỗ · xe công ty", off: false });
    const tx = await p.ev(`[...document.querySelectorAll('#cx-tai-xe optgroup')].map((g) => ({ g: g.label, ds: [...g.children].map((o) => o.textContent) }))`);
    const cty = tx.find((g) => g.g === "Tài xế công ty");
    assert.ok(cty && ["Nguyễn Văn An", "Phạm Văn Cường", "Lê Văn Bình"].every((t) => cty.ds.includes(t)), JSON.stringify(tx));
    assert.ok(await p.ev(shown("#cx-ngay")), "cột 'trong ngày' hiện ở máy tính");
    assert.equal(await p.ev(txt("#cx-ngay-title")), "Xe trong ngày");
    assert.equal(await p.ev(shown(".dp-cx-bottom")), false, "thanh nút đáy chỉ ở điện thoại");
    assert.equal(await p.ev(noCode), "");
    assert.ok(await p.ev(noOverflowX));
    await axe(p, "tạo chuyến 1040");
  });

  await b.step("2", "bấm Lưu khi trống: bốn câu dưới bốn ô + dải 'Chưa lưu được — sửa 4 ô…'; KHÔNG gửi lệnh nào", async () => {
    await gui(p);
    await p.waitFor(`${txt("#cx-banner")} !== null && ${txt("#cx-banner")}.startsWith('Chưa lưu được')`, "dải lỗi");
    assert.equal(await p.ev(txt("#cx-banner")), "Chưa lưu được — sửa 4 ô có đánh dấu bên dưới.");
    assert.deepEqual(await p.ev(`[${["xe", "tai-xe", "tu", "den"].map(loi).join(",")}]`), ["Chọn xe.", "Chọn tài xế.", "Nhập giờ bắt đầu.", "Nhập giờ kết thúc."]);
    assert.equal(await p.ev(`document.querySelector('#cx-xe').getAttribute('aria-invalid')`), "true");
    assert.equal(ghi(p).length, 0);
  });

  await b.step("3", "3a: xe 79A-111.11 + tài xế hạng B + 08:00–10:00 → máy chủ từ chối; hạng bằng dưới ô Tài xế, trùng giờ dưới ô Giờ kết thúc, cột phải tô đỏ chuyến trùng; dải đếm 2 ô", async () => {
    await p.ev(typeInto("#cx-xe", d.XE_A.id));
    await p.ev(typeInto("#cx-tai-xe", d.BINH.partyId));
    await p.ev(typeInto("#cx-tu", "08:00"));
    await p.ev(typeInto("#cx-den", "10:00"));
    await p.waitFor(`${txt("#cx-ngay-title")} === '79A-111.11 trong ngày'`, "cột phải theo xe đang chọn");
    assert.equal(await p.ev(txt("#cx-xe-hint")), "15 chỗ · xe công ty");
    await gui(p);
    await p.waitFor(`${txt("#cx-banner")} === 'Chưa lưu được — sửa 2 ô có đánh dấu bên dưới.'`, "dải 2 ô");
    assert.deepEqual(await p.ev(loiHien), ["tai-xe", "den"]);
    assert.equal(await p.ev(loi("tai-xe")), "Hạng bằng lái không đủ chở số chỗ của xe");
    assert.equal(await p.ev(loi("den")), `Xe trùng giờ với chuyến khác: ${d.T1.ma}`);
    const cot = await p.ev(dongCot);
    assert.deepEqual(cot.map((r) => [r.ma, r.trung]), [[d.T1.ma, true], [d.T3.ma, false]]);
    assert.equal(cot[0].text, `${d.T1.ma} 07:30–09:30 Trùng với giờ bạn chọn`);
    const posts = ghi(p);
    assert.equal(posts.length, 1);
    assert.equal(posts[0].method, "POST");
    const body = JSON.parse(posts[0].body);
    assert.match(body.requestId, /^[0-9a-f-]{36}$/);
    assert.deepEqual({ ...body, requestId: "x" }, { requestId: "x", xeId: d.XE_A.id, taiXePartyId: d.BINH.partyId, batDau: { ngay: d.NGAY_XA, gio: "08:00" }, ketThuc: { ngay: d.NGAY_XA, gio: "10:00" } });
    assert.equal(await p.ev(noCode), "");
    await shotFull(p, "b3-tao-chuyen-ba-loi-may-tinh.png");
  });

  await b.step("4", "khoảng nghỉ thiếu (Bán hàng — không có ô phá lệ): câu dưới ô Giờ bắt đầu nói cần Quản trị phá lệ; KHÔNG mở hộp Phá lệ", async () => {
    await p.ev(typeInto("#cx-xe", d.XE_B.id));
    await p.ev(typeInto("#cx-tai-xe", d.AN.partyId));
    await p.ev(typeInto("#cx-tu", "09:40"));
    await p.ev(typeInto("#cx-den", "10:30"));
    await gui(p);
    await p.waitFor(`${loi("tu")} !== null && !document.getElementById('cx-tu-error').hidden`, "câu dưới Giờ bắt đầu");
    assert.deepEqual(await p.ev(loiHien), ["tu"]);
    assert.match(await p.ev(loi("tu")), /^Chưa đủ khoảng nghỉ giữa hai chuyến — cần Quản trị phá lệ: CX-/);
    assert.equal(await p.ev(txt("#cx-banner")), "Chưa lưu được — sửa 1 ô có đánh dấu bên dưới.");
    await sleep(300);
    assert.equal(await p.ev(`!!document.querySelector('[data-action="pha-le-gui"]')`), false, "Bán hàng không có hộp phá lệ");
  });

  await b.step("5", "tạo thành công (79A-222.22 · Phạm Văn Cường · 12:00–13:00) → sang trang chi tiết chuyến mới; thân lệnh không kèm phá lệ", async () => {
    await p.ev(typeInto("#cx-tai-xe", d.CUONG.partyId));
    await p.ev(typeInto("#cx-tu", "12:00"));
    await p.ev(typeInto("#cx-den", "13:00"));
    await p.ev(typeInto("#cx-tuyen", TUYEN));
    const truoc = ghi(p).length;
    await gui(p);
    await p.waitFor(`location.pathname === '/chuyen'`, "sang /chuyen");
    const post = ghi(p).slice(truoc).find((r) => r.method === "POST");
    const body = JSON.parse(post.body);
    assert.equal(body.nghiPhaLe, undefined);
    assert.equal(body.taiXePartyId, d.CUONG.partyId);
    assert.equal(body.tuyen, TUYEN, "Đợt 4 G3: tạo chuyến gửi mã tuyến đã chọn");
    await p.waitFor(`!!document.querySelector('.dp-ct-title')`, "trang chi tiết dựng xong");
    assert.match(await p.ev(txt(".dp-ct-title")), /^CX-\d{4}-\d+$/);
  });

  await b.step("5b", "Đợt 4 G3: mở sửa chuyến vừa tạo → ô Tuyến điền sẵn tuyến đã chọn; bỏ tuyến → PUT chỉ gửi tuyen: null; tuyến đã ngưng dùng vẫn hiện là lựa chọn đang chọn", async () => {
    const idMoi = await p.ev(`new URLSearchParams(location.search).get('id')`);
    await di(p, `/chuyen-sua?id=${idMoi}`);
    await choForm(p);
    assert.equal(await p.ev(`document.querySelector('#cx-tuyen').value`), TUYEN);
    await p.ev(typeInto("#cx-tuyen", ""));
    const truoc = ghi(p).length;
    await gui(p);
    await p.waitFor(`location.pathname === '/chuyen'`, "sang /chuyen sau khi bỏ tuyến");
    const body = JSON.parse(ghi(p).slice(truoc)[0].body);
    assert.deepEqual(Object.keys(body).sort(), ["requestId", "tuyen", "version"], "chỉ gửi ô đã đổi");
    assert.equal(body.tuyen, null);
    // Tuyến đang gắn nhưng đã ngưng dùng: gắn bằng API (đường thật: gắn lúc còn dùng rồi ngưng).
    assert.equal((await call(ACCOUNTS.accounting, "PUT", `/api/van-chuyen/tuyen/${TUYEN_NGUNG}`, { dangDung: true })).status, 200);
    const ct = await fetchTrang(p, "GET", `/api/van-chuyen/chuyen/${idMoi}`);
    const gan = await fetchTrang(p, "PUT", `/api/van-chuyen/chuyen/${idMoi}`, { version: ct.json.chuyen.version, requestId: crypto.randomUUID(), tuyen: TUYEN_NGUNG });
    assert.equal(gan.status, 200, gan.text);
    assert.equal((await call(ACCOUNTS.accounting, "PUT", `/api/van-chuyen/tuyen/${TUYEN_NGUNG}`, { dangDung: false })).status, 200);
    await di(p, `/chuyen-sua?id=${idMoi}`);
    await choForm(p);
    assert.equal(await p.ev(`document.querySelector('#cx-tuyen').value`), TUYEN_NGUNG);
    assert.equal(await p.ev(`document.querySelector('#cx-tuyen').selectedOptions[0].textContent`), "Nha Trang – Hòn Tằm (đã ngưng dùng)");
    await shotFull(p, "g3-sua-chuyen-tuyen-may-tinh.png");
  });

  // ADR-0104 Đ1 (NỚI có tên, 2026-10-08): đổi tài xế chuyến dưới mốc = điều chỉnh khẩn cấp — Bán hàng có ô trip.urgent_adjust: hộp "Điều chỉnh khẩn cấp"
  // mở (Bán hàng chỉ mở rồi đóng; Quản trị gửi thật ở bước 9). Khoảng nghỉ ngoài mốc (bước 4) vẫn "cần Quản trị phá lệ".
  await b.step("6", "sửa chuyến đang khoá (Bán hàng): dải cảnh báo vùng khoá nói điều chỉnh khẩn cấp; đổi tài xế → câu dưới ô Tài xế + hộp 'Điều chỉnh khẩn cấp' ('Điều chỉnh khẩn cấp và lưu'); đóng, không gửi", async () => {
    await di(p, `/chuyen-sua?id=${d.T4.id}`);
    await choForm(p);
    assert.equal(await p.ev(txt("#cx-title")), `Sửa chuyến ${d.T4.ma}`);
    assert.equal(await p.ev(`document.querySelector('#cx-back').getAttribute('href')`), `/chuyen?id=${d.T4.id}`);
    assert.equal(await p.ev(txt("#cx-form .banner-title")), "Chuyến đã vào vùng khoá trước giờ xe chạy");
    assert.equal(await p.ev(txt("#cx-form .banner-lines")), "Đổi xe, đổi tài xế là điều chỉnh khẩn cấp — khi lưu, bạn sẽ chọn lý do. Đổi giờ không cần điều chỉnh khẩn cấp.");
    assert.equal(await p.ev(txt("#cx-xe-hint")), "15 chỗ · xe công ty · đang có 0 khách xếp");
    await p.ev(typeInto("#cx-tai-xe", d.CUONG.partyId));
    await gui(p);
    await p.waitFor(`!document.getElementById('cx-tai-xe-error').hidden && !!document.querySelector('[data-action="pha-le-gui"]')`, "câu dưới Tài xế + hộp điều chỉnh khẩn cấp");
    await sleep(600);
    assert.equal(await p.ev(loi("tai-xe")), "Đã qua hạn chốt trước giờ xe chạy — người xếp xe điều chỉnh khẩn cấp kèm lý do");
    assert.equal(await p.ev(txt(".dp-sheet-pha-le h2, .dp-sheet-pha-le .sheet-title")), "Điều chỉnh khẩn cấp");
    assert.equal(await p.ev(txt('[data-action="pha-le-gui"]')), "Điều chỉnh khẩn cấp và lưu");
    await shotView(p, "b3-khan-cap-ban-hang-may-tinh.png");
    await p.ev(`[...document.querySelectorAll('.dp-sheet-pha-le button')].find((x) => x.innerText.trim() === 'Đóng').click()`);
    await p.waitFor(`!document.querySelector('[data-action="pha-le-gui"]')`, "đóng hộp, không gửi");
    const put = ghi(p).at(-1);
    assert.equal(put.method, "PUT");
    assert.deepEqual(Object.keys(JSON.parse(put.body)).sort(), ["requestId", "taiXePartyId", "version"], "chỉ gửi ô đã đổi");
  });

  await b.step("7", "2.3: dời giờ chuyến đang khoá KHÔNG cần phá lệ (Bán hàng, 10:00 → 10:15) → lưu được, sang trang chi tiết; bấm Lưu khi chưa đổi gì → 'Chưa đổi gì'", async () => {
    await di(p, `/chuyen-sua?id=${d.T4.id}`);
    await choForm(p);
    await gui(p);
    await p.waitFor(`${txt("#cx-banner")} === 'Chưa đổi gì — không cần lưu.'`, "chưa đổi gì");
    await p.ev(typeInto("#cx-tu", "10:15"));
    const truoc = ghi(p).length;
    await gui(p);
    await p.waitFor(`location.pathname === '/chuyen'`, "sang /chuyen");
    const body = JSON.parse(ghi(p).slice(truoc)[0].body);
    assert.deepEqual(Object.keys(body).sort(), ["batDau", "ketThuc", "requestId", "version"]);
    assert.equal(body.phaLe, undefined);
  });
  await p.close();

  // ---- Bán hàng, điện thoại ----------------------------------------------------------------------------------------------------------------------------------
  const pm = await env.as(ACCOUNTS.salesA, `/chuyen-sua?id=${d.T3.id}`, MOB);
  await choForm(pm);
  await b.step("8", `390 Bán hàng sửa ${d.T3.ma}: một cột, không cột 'trong ngày', nút Huỷ bỏ + Lưu chuyến dính đáy, không tràn ngang${axeNote()}`, async () => {
    assert.equal(await pm.ev(shown("#cx-ngay")), false);
    assert.equal(await pm.ev(shown(".dp-cx-actions")), false);
    assert.ok(await pm.ev(shown('[data-action="luu-chuyen-day"]')));
    assert.deepEqual(await pm.ev(`[...document.querySelectorAll('#cx-bottom .vc-btn')].map((x) => x.textContent)`), ["Huỷ bỏ", "Lưu chuyến"]);
    assert.equal(await pm.ev(`document.querySelector('#cx-tu').value`), "14:30");
    assert.equal(await pm.ev(`getComputedStyle(document.querySelector('#cx-tu')).fontSize`), "17px", "ô gõ ≥ 16px");
    assert.ok(await pm.ev(noOverflowX));
    assert.equal(await pm.ev(noCode), "");
    await axe(pm, "sửa chuyến 390");
    await shotFull(pm, "b3-sua-chuyen-dien-thoai.png");
  });
  await pm.close();

  // ---- Quản trị, điện thoại (3b: đổi tài xế chuyến đang khoá → hộp phá lệ) -------------------------------------------------------------------------------------
  const qm = await env.as(ACCOUNTS.admin, `/chuyen-sua?id=${d.T4.id}`, MOB);
  await choForm(qm);
  await b.step("9", `3b 390 Quản trị: đổi tài xế ${d.T4.ma} (đang khoá) → hộp "Điều chỉnh khẩn cấp" (ADR-0104 Đ1; lý do nhóm Điều chỉnh khẩn cấp, phá lệ; nút khoá tới khi chọn) → gửi lại CHÍNH lệnh kèm lý do → sang chi tiết${axeNote()}`, async () => {
    assert.equal(await qm.ev(txt("#cx-form .banner-lines")), "Đổi xe, đổi tài xế là điều chỉnh khẩn cấp — khi lưu, bạn sẽ chọn lý do. Đổi giờ không cần điều chỉnh khẩn cấp.");
    await qm.ev(typeInto("#cx-tai-xe", d.CUONG.partyId));
    await gui(qm);
    await qm.waitFor(`!!document.querySelector('[data-action="pha-le-gui"]')`, "hộp điều chỉnh khẩn cấp mở");
    await sleep(600);
    assert.equal(await qm.ev(txt(".dp-sheet-pha-le h2, .dp-sheet-pha-le .sheet-title")), "Điều chỉnh khẩn cấp");
    assert.equal(await qm.ev(txt('[data-action="pha-le-gui"]')), "Điều chỉnh khẩn cấp và lưu");
    assert.deepEqual(await qm.ev(`[...document.querySelectorAll('.dp-sheet-pha-le .vc-reason')].map((x) => x.textContent)`), ["Sự cố vận hành", "Đơn đặt gấp", "Khác"]);
    assert.equal(await qm.ev(`document.querySelector('[data-action="pha-le-gui"]').disabled`), true);
    assert.match(await qm.ev(txt(".dp-sheet-pha-le .dp-sheet-sum")), new RegExp(`^${d.T4.ma} · .* Đã qua hạn chốt trước giờ xe chạy — người xếp xe điều chỉnh khẩn cấp kèm lý do$`));
    assert.equal(await qm.ev(loi("tai-xe")), "Đã qua hạn chốt trước giờ xe chạy — người xếp xe điều chỉnh khẩn cấp kèm lý do");
    await axe(qm, "hộp phá lệ 390");
    await shotView(qm, "b3-pha-le-dien-thoai.png");
    await qm.ev(click('.dp-sheet-pha-le .vc-reason[data-code="PHA_LE_SU_CO"]'));
    assert.equal(await qm.ev(`document.querySelector('[data-action="pha-le-gui"]').disabled`), false);
    await qm.ev(click('[data-action="pha-le-gui"]'));
    await qm.waitFor(`location.pathname === '/chuyen'`, "sang /chuyen");
    const puts = ghi(qm).filter((r) => r.method === "PUT").map((r) => JSON.parse(r.body));
    assert.equal(puts.length, 2);
    assert.equal(puts[0].phaLe, undefined);
    assert.deepEqual(puts[1].phaLe, { lyDo: "PHA_LE_SU_CO" });
    assert.equal(puts[1].nghiPhaLe, undefined);
    assert.notEqual(puts[0].requestId, puts[1].requestId, "lệnh kèm phá lệ là ý định mới → requestId mới");
    // ADR-0075 (một phiên mỗi tài khoản): đọc bằng phiên của trang — `call()` của Quản trị đã bị phiên trình duyệt đá (bài đỏ sẵn trước Đợt 4, sửa 2/10).
    const ct = await fetchTrang(qm, "GET", `/api/van-chuyen/chuyen/${d.T4.id}`);
    assert.equal(ct.json.chuyen.taiXe.ten, "Phạm Văn Cường");
  });
  await qm.close();

  // ---- Quản trị, máy tính (H18: phá lệ khoảng nghỉ khi tạo) ----------------------------------------------------------------------------------------------------
  const q = await env.as(ACCOUNTS.admin, `/chuyen-sua?ngay=${d.NGAY_XA}`, DESK);
  await choForm(q);
  await b.step("10", "H18 1040 Quản trị: tạo chuyến nghỉ thiếu → câu dưới Giờ bắt đầu + hộp Phá lệ → 'Phá lệ và lưu' gửi nghiPhaLe → tạo được", async () => {
    await q.ev(typeInto("#cx-xe", d.XE_B.id));
    await q.ev(typeInto("#cx-tai-xe", d.AN.partyId));
    await q.ev(typeInto("#cx-tu", "09:40"));
    await q.ev(typeInto("#cx-den", "10:30"));
    await gui(q);
    await q.waitFor(`!!document.querySelector('[data-action="pha-le-gui"]')`, "hộp phá lệ mở");
    await sleep(600);
    assert.match(await q.ev(loi("tu")), /^Chưa đủ khoảng nghỉ giữa hai chuyến — cần Quản trị phá lệ: CX-/);
    assert.equal(await q.ev(txt('[data-action="pha-le-gui"]')), "Phá lệ và lưu");
    await shotView(q, "b3-pha-le-nghi-may-tinh.png");
    await q.ev(click('.dp-sheet-pha-le .vc-reason[data-code="PHA_LE_KHAC"]'));
    await q.ev(click('[data-action="pha-le-gui"]'));
    await q.waitFor(`location.pathname === '/chuyen'`, "sang /chuyen");
    const posts = ghi(q).filter((r) => r.method === "POST").map((r) => JSON.parse(r.body));
    assert.equal(posts.length, 2);
    assert.deepEqual(posts[1].nghiPhaLe, { lyDo: "PHA_LE_KHAC" });
  });
  await q.close();

  // ---- Kế toán (chỉ xem lịch — không có ô xếp xe) -------------------------------------------------------------------------------------------------------------
  const k = await env.as(ACCOUNTS.accounting, `/chuyen-sua?ngay=${d.NGAY_XA}`, DESK);
  await b.step("11", "Kế toán mở /chuyen-sua: câu 'Tài khoản này không xếp xe được.', không form, không lệnh ghi", async () => {
    await k.waitFor(`!document.getElementById('error').hidden`, "câu từ chối");
    assert.equal(await k.ev(txt("#error")), "Tài khoản này không xếp xe được.");
    assert.equal(await k.ev(shown("#cx-layout")), false);
    assert.equal(ghi(k).length, 0);
    assert.equal(apiCalls(k).filter((r) => r.path.startsWith("/api/van-chuyen")).length, 0, "không gọi API lịch khi không có ô");
  });
  await k.close();

  await b.step("12", "không lỗi console ở mọi trang đã mở", async () => {
    for (const pg of [p, pm, qm, q, k]) assert.deepEqual(pg.consoleErrors, []);
  });
} finally {
  b.xong();
  await env.stop();
}

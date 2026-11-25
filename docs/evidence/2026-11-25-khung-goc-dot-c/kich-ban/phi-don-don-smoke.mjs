// BẢN CHÉP (đợt C khung gốc, 25/11/2026) của docs/evidence/2026-11-phi-don/kich-ban/phi-don-don-smoke.mjs — hồ sơ có ngày giữ nguyên. Không đổi bộ chọn. Sửa dựng dữ liệu: khoá cũ `phiDon` → `doiPhi` (ADR-0218; bản gốc chết 400 client_outdated). Vẫn đỏ ở bước 1 (trang sửa đơn) nên chưa tới bước 5 (màn Cấp độ đại lý). Ảnh ra OUT (mặc định /tmp/khung-goc-dot-c-tien, đặt ở ./dat-out.mjs).
import "./dat-out.mjs"; // đặt OUT TRƯỚC khi các thư viện gốc đọc biến (thứ tự nạp của ESM theo thứ tự import)
// Kịch bản Chrome THẬT cho phí đưa đón TRÊN ĐƠN (kế hoạch Phí đưa đón Đợt C, Task 6; vòng sửa 1 Task 6 ADR-0214: phí nay do văn phòng chọn — đơn lập kèm `phiDon` thay cho
// bảng mức theo khu vực; nhãn dòng không còn tên khu vực; câu nhắc ở Cấp độ đại lý đã ẩn). Ô chọn phí trên biểu mẫu và Còn vé: `phi-don-chon-smoke.mjs` cùng thư mục. Bấm đến cùng:
//   1) Biểu mẫu sửa đơn nháp có lượt đưa đón: Tóm tắt có dòng «Phí đưa đón — Tính khi lưu» (trình duyệt không tính phí); bấm «Lưu thay đổi» ⇒ về trang đơn.
//   2) Trang đơn nháp: thẻ Thanh toán có mục «Phí đưa đón (dự kiến)», mỗi lượt một dòng (chiều, khu vực, dòng phụ số khách × đơn giá, thành tiền bên phải); lượt về mức 0 đồng ghi
//      «Miễn phí»; «Tạm tính» = tiền dịch vụ + phí. Ảnh thẻ ở 1280 và 390.
//   3) Bấm «Xác nhận đơn» qua hộp hỏi lại ⇒ mục đổi thành «Phí đưa đón» (đã chụp, không còn «dự kiến»), số không đổi. Ảnh thẻ ở 1280 và 390.
//   4) «Xem ảnh gửi khách»: biên nhận máy chủ trả có khối phí với dòng 0 đồng; ảnh PNG thật của hộp thoại được lưu.
//   5) Màn Cấp độ đại lý (Kế toán): câu nhắc «Cấp độ đại lý cũng quyết định mức phí đưa đón…» KHÔNG hiện (ADR-0214: cấp không còn quyết định phí).
// Dùng lại cơ chế CDP của A2 (a2-cdp.mjs): D1 tạm + wrangler dev + Chrome headless; Turnstile TẮT; không đụng dữ liệu thật. Không cần mạng ngoài.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=<…/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh> node docs/evidence/2026-11-phi-don/kich-ban/phi-don-don-smoke.mjs
// `AXE_JS` thiếu thì kịch bản BỎ QUA kiểm màu (axe) và nói rõ ở dòng cuối. Ảnh ra thư mục `OUT` (mặc định: thư mục tạm của hệ điều hành); `OUT=docs/evidence/2026-11-phi-don`
// ghi ảnh bằng chứng cho chủ duyệt (tên tệp `phi-don-don-*.png`).
// Luật một máy (ADR-0075): mỗi lần đăng nhập đá phiên cũ — mọi lệnh ghi bằng API làm TRƯỚC khi mở trang; sau đó chỉ một trang mở mỗi lúc, cùng một tài khoản (Bán hàng), trừ bước 5 (Kế toán) mở sau cùng.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ACCOUNTS, clickText, ok, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const AXE = process.env.AXE_JS ? readFileSync(process.env.AXE_JS, "utf8") : null;
const OUT = process.env.OUT ?? mkdtempSync(join(tmpdir(), "phi-don-don-smoke-"));
mkdirSync(OUT, { recursive: true });
const DESK = { width: 1280, height: 900, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const HOM_NAY = vnDate(0);
const NGAY_DI = vnDate(3); // xa hơn mốc 6 giờ để xác nhận không cần đặt gấp
const S = String(Date.now()).slice(-6);
const CHU = S.replace(/\d/g, (d) => "ABCDEGHKLM"[d]); // tên không chứa dãy số dài
const BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (migration 0010)
const MUC = 70_000;

const env = await startEnv();
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}`, "idempotency-key": crypto.randomUUID() }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const phai = (r, status, ten) => { assert.equal(r.status, status, `${ten}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };
  const axe = async (p, nhan) => {
    if (!AXE) return;
    if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
    const v = await p.ev("axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length })))");
    const xau = v.filter((x) => x.impact === "critical" || x.impact === "serious");
    assert.deepEqual(xau, [], `axe (${nhan}): ${JSON.stringify(xau)}`);
  };
  const loiThat = (p) => p.consoleErrors.filter((e) => !/Failed to load resource/.test(e));
  /** Ảnh đúng khung một phần tử (thẻ Thanh toán): cuộn về đầu trang (thanh trên dính không đè lên thẻ) rồi cắt theo toạ độ trang. */
  const anhPhanTu = async (p, chon, tep) => {
    const r = await p.ev(`(() => { const e = document.querySelector(${JSON.stringify(chon)}); scrollTo(0, 0); const b = e.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height }; })()`);
    const k = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: r.w + 16, height: r.h + 16, scale: 1 } });
    writeFileSync(join(OUT, tep), Buffer.from(k.result.data, "base64"));
  };
  const THE = "[data-khoi=thanh-toan]";
  const khoiPhi = (p) => p.ev("(() => { const k = document.querySelector('[data-khoi=phi-dua-don]'); return k ? { tieuDe: k.querySelector('.phi-don-tieu-de').textContent, dong: [...k.querySelectorAll('.kv-phi-don')].map((d) => [d.firstChild.firstChild.textContent, d.querySelector('.phi-don-chi-tiet')?.textContent ?? null, d.lastChild.textContent]) } : null; })()");
  const tamTinh = (p) => p.ev("[...document.querySelectorAll('[data-khoi=thanh-toan] .kv')].find((d) => d.firstChild.textContent === 'Tạm tính')?.lastChild.textContent ?? null");
  const so = (s) => Number(String(s).replace(/[^\d]/g, ""));

  // ---- dữ liệu bằng API thật TRƯỚC khi mở trang ----
  // ADR-0214: bật phí khi bảng mức TRỐNG (ruling P3); mức đi theo từng lượt trên đơn — chiều đi «Số khác» 70.000 đ/khách, chiều về «Miễn phí».
  const tuLuc = phai(await call(ACCOUNTS.admin, "GET", "/api/pricing/phi-don"), 200, "đọc ngày áp").batDauAp.tuLuc;
  phai(await call(ACCOUNTS.admin, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: HOM_NAY, tuLucDaDoc: tuLuc }), 200, "bật phí từ hôm nay");
  const legs = [
    { direction: "OUT", pickupDate: "", pickupTime: "07:00", pickupLocationId: null, pickupPlace: `Khách sạn ${CHU}`, dropoffLocationId: BEN, dropoffPlace: "", doiPhi: { donGia: MUC, lyDo: "Số khác theo văn phòng" } }, // đợt C 25/11: khoá cũ phiDon ⇒ 400 client_outdated (ADR-0218) — chỉ sửa dựng dữ liệu
    { direction: "RETURN", pickupDate: NGAY_DI, pickupTime: "16:00", pickupLocationId: BEN, pickupPlace: "", dropoffLocationId: null, dropoffPlace: `Khách sạn ${CHU}`, doiPhi: { donGia: 0, lyDo: "Miễn phí chiều về" } },
  ];
  const tao = phai(await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: "Nguyễn Văn A", customerPhone: "0901 234 567",
    services: [{ kind: "catalog", catalogCode: "TD101", pax: { adult: 2 }, catalogPriceSeen: { adult: 1_350_000, child: 950_000, senior: 1_200_000, infant: 0 }, departDate: NGAY_DI, pickupChoice: "DON", legs }],
  }), 201, "lập đơn nháp có hai lượt");
  const don = tao.order;
  assert.equal(don.phiDuaDon?.duKien, true, "máy chủ: đơn nháp có phí dự kiến");
  assert.equal(don.subtotal, 2 * 1_350_000 + 2 * MUC, "máy chủ: tạm tính = dịch vụ + phí chiều đi (chiều về 0 đồng)");
  ok(`Dựng dữ liệu: phí áp từ hôm nay (bảng mức trống); đơn nháp ${don.orderCode} chiều đi Số khác 70.000 đ/khách, chiều về Miễn phí`);

  // ===================== 1) Biểu mẫu sửa nháp: «Phí đưa đón — Tính khi lưu», rồi Lưu =====================
  {
    const p = await env.as(ACCOUNTS.salesA, `/order-form?id=${don.id}`, DESK);
    await p.waitFor("!!document.querySelector('[data-phi-don]') && !document.querySelector('.summary-card [data-phi-don]').hidden", "dòng «Phí đưa đón» ở Tóm tắt hiện (đơn có lượt đưa đón)");
    assert.deepEqual(await p.ev("[...document.querySelector('.summary-card [data-phi-don]').children].map((c) => c.textContent)"), ["Phí đưa đón", "Tính khi lưu"], "Tóm tắt nói phí tính khi lưu, không tự tính số");
    assert.equal(so(await p.ev("document.getElementById('sum-subtotal').textContent")), 2 * 1_350_000, "Tạm tính xem trước của biểu mẫu chỉ là tiền dịch vụ (trình duyệt không cộng phí)");
    await axe(p, "biểu mẫu sửa nháp 1280");
    assert.equal(await p.ev("(() => { const b = document.getElementById('save'); if (b.disabled) return false; b.click(); return true; })()"), true, "bấm «Lưu thay đổi»");
    await p.waitFor("location.pathname === '/order' && !!document.querySelector('[data-khoi=phi-dua-don]')", "lưu xong về trang đơn, có mục Phí đưa đón", 15000);
    assert.deepEqual(loiThat(p), [], `lỗi console (biểu mẫu): ${loiThat(p)}`);
    p.close();
    ok(`Biểu mẫu: «Phí đưa đón — Tính khi lưu», tạm tính xem trước chưa gồm phí; «Lưu thay đổi» về trang đơn${AXE ? ", axe sạch" : ""}`);
  }

  const mongDoi = [
    ["Chiều đi", "2 khách × 70.000 ₫", "140.000 ₫"],
    ["Chiều về", null, "Miễn phí"],
  ];
  // ===================== 2) Trang đơn nháp: «Phí đưa đón (dự kiến)» =====================
  for (const [nhan, vp] of [["máy tính 1280", DESK], ["điện thoại 390", MOB]]) {
    const p = await env.as(ACCOUNTS.salesA, `/order?id=${don.id}`, vp);
    await p.waitFor("!!document.querySelector('[data-khoi=phi-dua-don]')", `mục Phí đưa đón hiện (${nhan})`);
    const k = await khoiPhi(p);
    assert.equal(k.tieuDe, "Phí đưa đón (dự kiến)", "nháp: ghi «dự kiến»");
    assert.deepEqual(k.dong, mongDoi, "mỗi lượt một dòng; mức 0 đồng ghi «Miễn phí»");
    assert.equal(so(await tamTinh(p)), 2 * 1_350_000 + 140_000, "Tạm tính trên trang đơn gồm phí");
    assert.doesNotMatch(await p.ev(`document.querySelector('${THE}').innerText`), /PER_PAX|PER_TRIP|RETURN|\bOUT\b|NGOAI_VUNG|CHR_PDD/, "không lộ mã thô");
    assert.equal(await p.ev("document.documentElement.scrollWidth <= window.innerWidth + 1"), true, `không tràn ngang (${nhan})`);
    await anhPhanTu(p, THE, `phi-don-don-nhap-${vp === DESK ? "may-tinh" : "dien-thoai"}.png`);
    await axe(p, `trang đơn nháp ${nhan}`);
    assert.deepEqual(loiThat(p), [], `lỗi console (trang đơn nháp ${nhan}): ${loiThat(p)}`);
    p.close();
    ok(`Trang đơn nháp (${nhan}): «Phí đưa đón (dự kiến)», chiều đi 2 × 70.000, chiều về «Miễn phí», tạm tính gồm phí${AXE ? ", axe sạch" : ""}`);
  }

  // ===================== 3) Xác nhận đơn ⇒ phí đã chụp =====================
  {
    const p = await env.as(ACCOUNTS.salesA, `/order?id=${don.id}`, DESK);
    await p.waitFor("!!document.querySelector('[data-khoi=phi-dua-don]')", "trang đơn nháp sẵn sàng");
    assert.equal(await p.ev("(() => { const b = [...document.querySelectorAll('button.btn-accent')].find((x) => x.textContent.trim() === 'Xác nhận đơn'); if (!b) return false; b.click(); return true; })()"), true, "bấm «Xác nhận đơn»");
    await p.waitFor("[...document.querySelectorAll('button.btn-danger')].some((x) => x.textContent.trim() === 'Xác nhận đơn')", "hộp hỏi lại hiện");
    assert.equal(await p.ev("(() => { const b = [...document.querySelectorAll('button.btn-danger')].find((x) => x.textContent.trim() === 'Xác nhận đơn'); b.click(); return true; })()"), true, "đồng ý trong hộp hỏi lại");
    await p.waitFor("document.querySelector('.phi-don-tieu-de')?.textContent === 'Phí đưa đón'", "sau xác nhận: mục đổi thành «Phí đưa đón» (đã chụp)", 15000);
    const k = await khoiPhi(p);
    assert.deepEqual(k.dong, mongDoi, "số đã chụp giống số dự kiến (bảng phí không đổi giữa hai lúc)");
    assert.equal(so(await tamTinh(p)), 2 * 1_350_000 + 140_000);
    await anhPhanTu(p, THE, "phi-don-don-da-xac-nhan-may-tinh.png");
    await axe(p, "trang đơn đã xác nhận 1280");

    // ---- 4) Biên nhận: khối phí có dòng 0 đồng «Miễn phí»; lưu ảnh PNG thật của hộp thoại ----
    const bn = await p.ev(`fetch('/api/orders/${don.id}/receipt').then((r) => r.json()).then((j) => ({ phi: j.receipt.phiDuaDon, duKien: j.receipt.phiDuKien ?? false }))`);
    assert.equal(bn.duKien, false, "biên nhận đơn đã xác nhận không ghi «dự kiến»");
    assert.deepEqual(bn.phi.map((d) => [d.quantity, d.unitPrice, d.lineTotal]), [[2, MUC, 140_000], [2, 0, 0]], "biên nhận: dòng chiều đi 140.000, dòng chiều về 0 đồng");
    assert.equal(await p.ev(clickText("#send", "Xem ảnh gửi khách")), true, "bấm «Xem ảnh gửi khách»");
    await p.waitFor("(() => { const i = document.querySelector('.sheet .confirm-img'); return !!i && i.complete && i.naturalWidth > 0; })()", "ảnh gửi khách hiện", 15000);
    const png = await p.ev("(() => { const i = document.querySelector('.sheet .confirm-img'); const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0); return c.toDataURL('image/png').split(',')[1]; })()");
    writeFileSync(join(OUT, "phi-don-don-bien-nhan.png"), Buffer.from(png, "base64"));
    assert.deepEqual(loiThat(p), [], `lỗi console (trang đơn đã xác nhận): ${loiThat(p)}`);
    p.close();
    ok(`Xác nhận đơn: mục thành «Phí đưa đón», số giữ nguyên; biên nhận có dòng 0 đồng, ảnh PNG đã lưu${AXE ? ", axe sạch" : ""}`);
  }
  {
    const p = await env.as(ACCOUNTS.salesA, `/order?id=${don.id}`, MOB);
    await p.waitFor("document.querySelector('.phi-don-tieu-de')?.textContent === 'Phí đưa đón'", "trang đơn đã xác nhận (390)");
    assert.deepEqual((await khoiPhi(p)).dong, mongDoi);
    assert.equal(await p.ev("document.documentElement.scrollWidth <= window.innerWidth + 1"), true, "không tràn ngang (390)");
    await anhPhanTu(p, THE, "phi-don-don-da-xac-nhan-dien-thoai.png");
    await axe(p, "trang đơn đã xác nhận 390");
    assert.deepEqual(loiThat(p), [], `lỗi console (390): ${loiThat(p)}`);
    p.close();
    ok(`Trang đơn đã xác nhận (điện thoại 390): «Phí đưa đón», không tràn ngang${AXE ? ", axe sạch" : ""}`);
  }

  // ===================== 5) Màn Cấp độ đại lý: câu nhắc phí đưa đón (Kế toán, mở SAU CÙNG vì đổi tài khoản) =====================
  {
    const p = await env.as(ACCOUNTS.accounting, "/cap-dai-ly", MOB);
    await p.waitFor("!!document.getElementById('cdl-nhac-phi-don') && document.readyState === 'complete'", "màn Cấp độ đại lý sẵn sàng");
    await new Promise((r) => setTimeout(r, 800)); // trang dựng xong phần đầu (initShell) rồi mới xét
    assert.equal(await p.ev("document.getElementById('cdl-nhac-phi-don').hidden"), true, "ADR-0214: câu nhắc «cấp quyết định phí đưa đón» không hiện");
    assert.equal(await p.ev("document.documentElement.scrollWidth <= window.innerWidth + 1"), true, "không tràn ngang (390)");
    await axe(p, "Cấp độ đại lý 390");
    assert.deepEqual(loiThat(p), [], `lỗi console (Cấp độ đại lý): ${loiThat(p)}`);
    p.close();
    ok(`Cấp độ đại lý (390): câu nhắc «cấp cũng quyết định mức phí đưa đón» KHÔNG hiện (ADR-0214)${AXE ? ", axe sạch" : ""}`);
  }

  console.log(AXE ? "SMOKE OK (đã gồm kiểm màu axe)" : "SMOKE OK (KHÔNG gồm kiểm màu: thiếu AXE_JS)");
  console.log(`Ảnh: ${OUT}`);
} finally {
  await env.stop();
}

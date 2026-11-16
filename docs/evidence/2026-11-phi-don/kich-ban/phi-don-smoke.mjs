// Kịch bản Chrome THẬT cho khu vực đón (màn Địa điểm) và màn «Phí đưa đón» (kế hoạch Phí đưa đón, Đợt A + B, Task 9). Bấm ĐẾN CÙNG, không chỉ mở trang:
//   Địa điểm  — «Sửa khu vực đón»: khung sửa THAY HẲN thẻ (không lồng thẻ trong thẻ), «Lưu» lưu và đóng khung, «Đóng» đóng khung (1040 và 390);
//   Phí đưa đón — (ADR-0214, Task 6 vòng sửa 1) màn hiện câu «Từ ADR-0214 phí trên đơn do văn phòng chọn; bảng này không còn dùng cho đơn.»; «Đặt ngày bắt đầu áp» lưu được
//                 khi bảng mức còn TRỐNG (ruling P3); thêm mức chung, «Thử tra» ra số, «Đổi mức phí» lưu được (dòng cũ hết nút), «Kết thúc mức» lưu được; kết thúc mức chung
//                 cuối lúc đang áp nay LƯU ĐƯỢC (không còn chốt «mức chung»), không băng «chưa có mức chung»; «Tắt phí đưa đón» qua hộp xác nhận (1040), rồi bố cục 390.
// Dùng lại cơ chế CDP của A2 (a2-cdp.mjs): D1 tạm + wrangler dev + Chrome headless; Turnstile TẮT; không đụng dữ liệu thật.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=<…/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh> node docs/evidence/2026-11-phi-don/kich-ban/phi-don-smoke.mjs
// `AXE_JS` thiếu thì kịch bản BỎ QUA kiểm màu (axe) và nói rõ ở dòng cuối — «SMOKE OK» khi đó KHÔNG gồm kiểm màu. Ảnh ra thư mục `OUT` (mặc định: thư mục tạm của hệ điều hành).
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ACCOUNTS, clickText, ok, setInput, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const AXE = process.env.AXE_JS ? readFileSync(process.env.AXE_JS, "utf8") : null;
const OUT = process.env.OUT ?? mkdtempSync(join(tmpdir(), "phi-don-smoke-"));
mkdirSync(OUT, { recursive: true });
const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const js = JSON.stringify;
const HOM_NAY = vnDate(0);
const S = String(Date.now()).slice(-6);
const ZONE = `CHR_${S}`;
const TEN_VUNG = `Khu vực Chrome ${S}`;
const TEN_VUNG_SAU = `${TEN_VUNG} (sửa 390)`; // tên sau hai lần đổi ở màn Địa điểm (1040 rồi 390)

const env = await startEnv();
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}`, "idempotency-key": crypto.randomUUID() }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const axe = async (p, nhan) => {
    if (!AXE) return;
    if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
    const v = await p.ev("axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length })))");
    const xau = v.filter((x) => x.impact === "critical" || x.impact === "serious");
    assert.deepEqual(xau, [], `axe (${nhan}): ${JSON.stringify(xau)}`);
  };
  const loiThat = (p) => p.consoleErrors.filter((e) => !/Failed to load resource/.test(e)); // 409 chủ ý của máy chủ làm trình duyệt in dòng này

  // ---- dữ liệu dựng bằng API thật TRƯỚC khi mở trang (luật một máy ADR-0075: đăng nhập lại sẽ đá cookie cũ)
  let r = await call(ACCOUNTS.admin, "POST", "/api/location-zones", { code: ZONE, name: TEN_VUNG, sortOrder: 5 });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  r = await call(ACCOUNTS.admin, "POST", "/api/locations", { code: `CHR_DIEM_${S}`, name: `Điểm Chrome ${S}`, locationTypeCode: "HOTEL", address: null, sortOrder: 90 });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const diem = r.json.location;
  r = await call(ACCOUNTS.admin, "PUT", `/api/locations/${diem.id}`, { name: diem.name, locationTypeCode: diem.locationTypeCode, address: null, sortOrder: diem.sortOrder, active: true, zoneCode: ZONE, expectedUpdatedAt: diem.updatedAt });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  r = await call(ACCOUNTS.accounting, "POST", "/api/pricing/muc-ta", { ten: `Đại lý cấp 1 ${S.replace(/\d/g, (d) => "ABCDEGHKLM"[d])}` });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const CAP = r.json.muc.code;
  // một mức theo cấp có sẵn: để thử «Kết thúc mức» ở dòng không phải mức chung, và để khối cảnh báo hiện sau khi UI thêm mức chung thấp hơn
  r = await call(ACCOUNTS.admin, "POST", "/api/pricing/phi-don", { kind: "PER_PAX", amount: 45_000, validFrom: HOM_NAY, validTo: null, note: null, dieuKien: [{ khoa: "ZONE", giaTri: ZONE }, { khoa: "TIER", giaTri: CAP }] });
  assert.equal(r.status, 201, JSON.stringify(r.json));

  // ===================== màn Địa điểm: «Sửa khu vực đón» =====================
  for (const [nhan, vp] of [["máy tính 1040", DESK], ["điện thoại 390", MOB]]) {
    const tenMoi = `${TEN_VUNG} (sửa ${vp.width})`;
    const p = await env.as(ACCOUNTS.admin, "/locations", vp);
    await p.waitFor("document.getElementById('zone-card') && !document.getElementById('zone-card').hidden && document.querySelectorAll('#zone-list [data-testid=zone-card]').length >= 2", "thẻ khu vực đón hiện, có ≥ 2 khu vực");
    const the = (ten) => `[...document.querySelectorAll('#zone-list [data-testid=zone-card]')].find((c) => c.textContent.includes(${js(ten)}))`;
    const tenHienTai = vp === DESK ? TEN_VUNG : `${TEN_VUNG} (sửa 1040)`;
    assert.equal(await p.ev(`!!(${the(tenHienTai)})`), true, `thẻ khu vực «${tenHienTai}» có trong danh sách`);
    assert.match(await p.ev(`${the(tenHienTai)}.textContent`), /1 địa điểm|2 địa điểm/, "thẻ ghi số địa điểm của khu vực");
    // mở khung sửa: khung THAY thẻ, nằm thẳng trong danh sách (không lồng trong một thẻ)
    assert.equal(await p.ev(`(() => { const b = ${the(tenHienTai)}.querySelector('button'); if (!b || b.textContent.trim() !== 'Sửa khu vực đón') return false; b.click(); return true; })()`), true, "bấm «Sửa khu vực đón»");
    await p.waitFor("!!document.querySelector('[data-testid=zone-editor]')", "khung sửa khu vực hiện");
    assert.equal(await p.ev("document.querySelector('[data-testid=zone-editor]').parentElement.id"), "zone-list", "khung sửa nằm thẳng trong danh sách, không lồng trong thẻ khác");
    assert.equal(await p.ev(`${the(tenHienTai)} === undefined`), true, "thẻ cũ đã được thay bằng khung sửa");
    // đổi tên, «Lưu»: lưu rồi KHUNG ĐÓNG, thẻ mang tên mới
    await p.ev(setInput("document.querySelector('[data-testid=zone-editor] input[type=text]')", tenMoi));
    assert.equal(await p.ev(clickText("[data-testid=zone-editor]", "Lưu")), true, "bấm «Lưu» ở khung sửa khu vực");
    await p.waitFor("!document.querySelector('[data-testid=zone-editor]')", "khung sửa đóng sau «Lưu»");
    await p.waitFor(`!!(${the(tenMoi)})`, "thẻ hiện tên khu vực mới");
    // mở lại rồi «Đóng»: khung đóng, không ghi gì
    assert.equal(await p.ev(`(() => { ${the(tenMoi)}.querySelector('button').click(); return true; })()`), true);
    await p.waitFor("!!document.querySelector('[data-testid=zone-editor]')", "khung sửa mở lại");
    assert.equal(await p.ev(clickText("[data-testid=zone-editor]", "Đóng")), true, "bấm «Đóng»");
    await p.waitFor("!document.querySelector('[data-testid=zone-editor]')", "khung sửa đóng sau «Đóng»");
    assert.equal(await p.ev(`!!(${the(tenMoi)})`), true, "«Đóng» giữ nguyên tên đã lưu");
    // địa điểm mang khu vực ở danh sách
    assert.match(await p.ev("document.querySelector('main').innerText"), new RegExp(TEN_VUNG.slice(0, 14)), "danh sách địa điểm hiện tên khu vực");
    assert.equal(await p.ev("document.documentElement.scrollWidth <= window.innerWidth + 1"), true, `không tràn ngang (${nhan})`);
    await p.shot(join(OUT, `dia-diem-${vp.width}.png`));
    await axe(p, `Địa điểm ${nhan}`);
    assert.deepEqual(loiThat(p), [], `lỗi console (Địa điểm ${nhan}): ${loiThat(p)}`);
    p.close();
    ok(`Địa điểm (${nhan}): «Sửa khu vực đón» thay thẻ, «Lưu» lưu và đóng khung, «Đóng» đóng khung${AXE ? ", axe sạch" : " (BỎ QUA axe: thiếu AXE_JS)"}`);
  }

  // ===================== màn Phí đưa đón (máy tính) =====================
  {
    const p = await env.as(ACCOUNTS.admin, "/phi-don", DESK);
    await p.waitFor("document.getElementById('pd-khung') && !document.getElementById('pd-khung').hidden", "khung Phí đưa đón hiện");
    const nhan = (goc, t) => `[...document.querySelectorAll(${js(goc + " label")})].find((l) => l.textContent.trim().startsWith(${js(t)}))`;
    const truong = (goc, t) => `${nhan(goc, t)}.querySelector('select, input')`;
    const chonOption = (goc, t, chu) => `(() => { const s = ${truong(goc, t)}; const o = [...s.options].find((x) => x.textContent.trim() === ${js(chu)}); if (!o) return false; s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;
    const bam = (goc, chu) => p.ev(clickText(goc, chu));
    const doiForm = (dk, what) => p.waitFor(dk, what);
    const mucText = () => p.ev("document.getElementById('pd-muc').innerText");
    const trangThai = () => p.ev("document.getElementById('pd-trang-thai').innerText");
    const formDong = "document.querySelectorAll('#pd-form [data-testid=pd-form-khung]').length === 0";

    assert.match(await trangThai(), /Chưa áp phí đưa đón/, "mở màn: chưa có ngày bắt đầu áp");
    assert.match(await p.ev("document.getElementById('pd-muc').innerText"), /Chưa có mức nào cho khu vực này/, "khu vực chưa có mức hiện câu «chưa có mức» (không bao giờ là 0 đồng)");
    assert.equal(await p.ev("document.querySelector('[data-chu=adr-0214]')?.textContent"), "Từ ADR-0214 phí trên đơn do văn phòng chọn; bảng này không còn dùng cho đơn.", "câu ADR-0214 trên màn");

    // --- «Đặt ngày bắt đầu áp» khi bảng mức còn TRỐNG (ADR-0214, ruling P3: ngày áp là công tắc ô chọn phí trên đơn, không đòi mức chung)
    assert.equal(await bam("#pd-trang-thai", "Đặt ngày bắt đầu áp"), true, "bấm «Đặt ngày bắt đầu áp»");
    await doiForm("!!document.querySelector('#pd-form [data-testid=pd-form-khung]')", "khung đặt ngày hiện");
    assert.equal(await bam("#pd-form", "Lưu ngày bắt đầu áp"), true, "bấm «Lưu ngày bắt đầu áp»");
    await doiForm(formDong, "khung đặt ngày đóng sau khi lưu (bảng trống vẫn lưu được)");
    await p.waitFor("/đang áp từ/.test(document.getElementById('pd-trang-thai').innerText)", "trạng thái «đang áp từ …»");
    assert.equal(await p.ev("document.getElementById('pd-thieu-chung').hidden"), true, "không băng «chưa có mức chung» (đã tắt từ ADR-0214)");
    ok(`Phí đưa đón: câu ADR-0214 hiện; «Đặt ngày bắt đầu áp» lưu được khi bảng TRỐNG — «${(await trangThai()).split("\n")[0]}»`);

    // --- thêm mức chung cho hai khu vực, bằng giao diện
    for (const [vung, tien] of [[TEN_VUNG_SAU, "30000"], ["Ngoài khu vực", "20000"]]) {
      assert.equal(await bam("#pd-khung", "＋ Thêm mức phí"), true, "bấm «＋ Thêm mức phí»");
      await doiForm("!!document.querySelector('#pd-form [data-testid=pd-form-khung]')", "khung thêm mức hiện");
      assert.equal(await p.ev(chonOption("#pd-form", "Khu vực đón", vung)), true, `chọn khu vực «${vung}»`);
      await p.ev(setInput(truong("#pd-form", "Số tiền"), tien));
      assert.equal(await bam("#pd-form", "Lưu mức phí"), true, "bấm «Lưu mức phí»");
      await doiForm(formDong, "khung thêm mức đóng sau khi lưu");
      await p.waitFor(`document.getElementById('pd-muc').innerText.includes(${js(`${tien.slice(0, 2)}.000 đ/khách`)})`, `bảng hiện mức ${tien}`);
    }
    // mức theo cấp (45.000) cao hơn mức chung (30.000) của khu vực thử ⇒ có cảnh báo (chỉ nhắc, không chặn)
    await p.waitFor("!document.getElementById('pd-canh-bao').hidden", "khối cảnh báo cấp trả cao hơn hiện");
    ok("Phí đưa đón: thêm hai mức chung bằng giao diện, bảng hiện đúng, cảnh báo cấp trả cao hơn hiện");

    // --- Thử tra
    assert.equal(await p.ev(chonOption("#pd-thu-tra", "Khu vực đón", TEN_VUNG_SAU)), true);
    await p.ev(setInput(truong("#pd-thu-tra", "Số khách"), "2"));
    assert.equal(await bam("#pd-thu-tra", "Thử tra"), true, "bấm «Thử tra»");
    await p.waitFor("!!document.querySelector('#pd-thu-tra .pd-kq-chinh')", "kết quả Thử tra hiện");
    const kq = await p.ev("document.querySelector('#pd-thu-tra .pd-kq-chinh').innerText");
    assert.match(kq, /Phí đón: 60\.000 đ/, `Thử tra: 2 khách × 30.000 = 60.000 — thấy «${kq}»`);
    assert.doesNotMatch(await p.ev("document.getElementById('pd-thu-tra').innerText"), /PER_PAX|PER_TRIP|ZONE|\bOUT\b/, "Thử tra không lộ mã thô");
    // thiếu mức: «xe riêng» chưa có mức ⇒ nói thiếu mức, KHÔNG phải 0 đồng
    assert.equal(await p.ev(chonOption("#pd-thu-tra", "Đi chung hay xe riêng", "Xe riêng")), true);
    assert.equal(await bam("#pd-thu-tra", "Thử tra"), true);
    await p.waitFor("document.querySelector('#pd-thu-tra .pd-kq-chinh') && !/60\\.000/.test(document.querySelector('#pd-thu-tra .pd-kq-chinh').innerText)", "kết quả xe riêng đổi");
    const thieu = await p.ev("document.querySelector('#pd-thu-tra .pd-kq-chinh').innerText");
    assert.doesNotMatch(thieu, /Phí đón: 0|miễn phí/i, `thiếu mức không được hiện thành 0 đồng — «${thieu}»`);
    ok(`Phí đưa đón: Thử tra ra «${kq}», thiếu mức nói «${thieu}»`);

    // --- «Đổi mức phí» (dòng chung của khu vực thử): lưu được; dòng cũ hết nút
    const dongChung = `[...document.querySelectorAll('#pd-muc table tbody tr')].find((tr) => tr.textContent.includes('30.000 đ/khách') && !tr.textContent.includes('Cấp'))`;
    assert.equal(await p.ev(`(() => { const b = [...${dongChung}.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Đổi mức phí'); if (!b) return false; b.click(); return true; })()`), true, "bấm «Đổi mức phí»");
    await doiForm("!!document.querySelector('#pd-form [data-testid=pd-form-khung]')", "khung đổi mức hiện");
    assert.match(await p.ev("document.querySelector('#pd-form [data-testid=pd-form-khung] strong').innerText"), /Đổi mức/);
    await p.ev(setInput(truong("#pd-form", "Số tiền"), "35000"));
    assert.equal(await bam("#pd-form", "Lưu mức phí"), true);
    await doiForm(formDong, "khung đổi mức đóng sau khi lưu");
    await p.waitFor("document.getElementById('pd-muc').innerText.includes('35.000 đ/khách')", "bảng hiện mức mới 35.000");
    const dongCu = `[...document.querySelectorAll('#pd-muc table tbody tr')].find((tr) => tr.textContent.includes('30.000 đ/khách') && !tr.textContent.includes('Cấp'))`;
    assert.equal(await p.ev(`!!(${dongCu})`), true, "dòng cũ 30.000 vẫn còn trong bảng (đã có ngày kết thúc)");
    assert.equal(await p.ev(`${dongCu}.querySelectorAll('button').length`), 0, "dòng cũ đã kết thúc: không còn nút");
    ok("Phí đưa đón: «Đổi mức phí» lưu được (dòng mới 35.000, dòng cũ hết nút)");

    // --- «Kết thúc mức» (mức theo cấp)
    const dongCap = `[...document.querySelectorAll('#pd-muc table tbody tr')].find((tr) => tr.textContent.includes('45.000 đ/khách'))`;
    assert.equal(await p.ev(`(() => { const b = [...${dongCap}.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Kết thúc mức'); if (!b) return false; b.click(); return true; })()`), true, "bấm «Kết thúc mức»");
    await doiForm("!!document.querySelector('#pd-form [data-testid=pd-form-khung]')", "khung kết thúc mức hiện");
    assert.equal(await bam("#pd-form", "Lưu ngày kết thúc"), true, "bấm «Lưu ngày kết thúc»");
    await doiForm(formDong, "khung kết thúc đóng sau khi lưu");
    await p.waitFor(`(() => { const tr = ${dongCap}; return !!tr && tr.querySelectorAll('button').length === 0; })()`, "mức theo cấp đã kết thúc: hết nút");
    ok("Phí đưa đón: «Kết thúc mức» lưu được (mức theo cấp hết nút)");

    // --- đang áp: kết thúc mức chung CUỐI của «Ngoài khu vực» nay LƯU ĐƯỢC (ADR-0214 / ruling P3 gỡ chốt «mức chung»)
    const dongNgoai = `[...document.querySelectorAll('#pd-muc table tbody tr')].find((tr) => tr.textContent.includes('20.000 đ/khách'))`;
    assert.equal(await p.ev(`(() => { const b = [...${dongNgoai}.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Kết thúc mức'); if (!b) return false; b.click(); return true; })()`), true);
    await doiForm("!!document.querySelector('#pd-form [data-testid=pd-form-khung]')", "khung kết thúc mức hiện");
    assert.equal(await bam("#pd-form", "Lưu ngày kết thúc"), true);
    await doiForm(formDong, "khung đóng sau khi lưu (không còn bị chặn)");
    await p.waitFor(`(() => { const tr = ${dongNgoai}; return !!tr && tr.querySelectorAll('button').length === 0; })()`, "mức chung cuối đã kết thúc: hết nút");
    assert.equal(await p.ev("document.getElementById('error').hidden"), true, "không câu lỗi");
    assert.equal(await p.ev("document.getElementById('pd-thieu-chung').hidden"), true, "không băng «chưa có mức chung»");
    ok("Phí đưa đón: đang áp mà kết thúc mức chung cuối ⇒ lưu được, không băng «chưa có mức chung»");

    // --- «Tắt phí đưa đón» qua hộp xác nhận
    assert.equal(await bam("#pd-trang-thai", "Tắt phí đưa đón"), true, "bấm «Tắt phí đưa đón»");
    await p.waitFor("!!document.querySelector('button.btn-danger')", "hộp xác nhận hiện");
    assert.equal(await p.ev("(() => { const b = [...document.querySelectorAll('button.btn-danger')].find((x) => x.textContent.trim() === 'Tắt phí đưa đón'); if (!b) return false; b.click(); return true; })()"), true, "xác nhận tắt");
    await p.waitFor("/Chưa áp phí đưa đón/.test(document.getElementById('pd-trang-thai').innerText)", "trạng thái về «Chưa áp»");
    ok("Phí đưa đón: «Tắt phí đưa đón» qua hộp xác nhận ⇒ trạng thái «Chưa áp phí đưa đón»");

    assert.equal(await p.ev("document.documentElement.scrollWidth <= window.innerWidth + 1"), true, "không tràn ngang (1040)");
    await p.shot(join(OUT, "phi-don-1040.png"));
    await axe(p, "Phí đưa đón 1040");
    assert.deepEqual(loiThat(p), [], `lỗi console (Phí đưa đón 1040): ${loiThat(p)}`);
    p.close();
  }

  // ===================== màn Phí đưa đón (điện thoại) =====================
  {
    const p = await env.as(ACCOUNTS.admin, "/phi-don", MOB);
    await p.waitFor("document.getElementById('pd-khung') && !document.getElementById('pd-khung').hidden", "khung Phí đưa đón hiện (390)");
    assert.equal(await p.ev("document.documentElement.scrollWidth <= window.innerWidth + 1"), true, "không tràn ngang (390)");
    assert.equal(await p.ev("(() => { const l = document.querySelector('#pd-muc .card-list'); return !!l && getComputedStyle(l).display !== 'none' && document.querySelectorAll('#pd-muc .card-list .card').length >= 2; })()"), true, "điện thoại: mức hiện dạng thẻ");
    assert.equal(await p.ev("(() => { const w = document.querySelector('#pd-muc .table-wrap'); return !w || w.offsetParent === null; })()"), true, "điện thoại: bảng ẩn");
    assert.equal(await p.ev("[...document.querySelectorAll('#pd-khung input[type=text], #pd-khung input[type=date], #pd-khung select')].every((e) => parseFloat(getComputedStyle(e).fontSize) >= 16)"), true, "ô nhập 16px trở lên (không bị iPhone phóng to)");
    await p.shot(join(OUT, "phi-don-390.png"));
    await axe(p, "Phí đưa đón 390");
    assert.deepEqual(loiThat(p), [], `lỗi console (Phí đưa đón 390): ${loiThat(p)}`);
    p.close();
    ok(`Phí đưa đón (điện thoại 390): thẻ, không tràn ngang, ô nhập ≥ 16px${AXE ? ", axe sạch" : " (BỎ QUA axe: thiếu AXE_JS)"}`);
  }

  console.log(AXE ? "SMOKE OK (đã gồm kiểm màu axe)" : "SMOKE OK (KHÔNG gồm kiểm màu: thiếu AXE_JS)");
  console.log(`Ảnh: ${OUT}`);
} finally {
  await env.stop();
}

// Kịch bản Chrome — Việc 3 (kế hoạch 16 việc, 21/11/2026): ô «Tìm đối tác» ở màn Tạo đơn nhận cả số điện thoại; «Điền thông tin đối tác» gặp hồ sơ chưa có số thì báo rõ
// kèm lối mở hồ sơ ở Danh bạ (tab mới). Hai khổ 390 và 1280. D1 local tạm (startEnv), tên và SĐT là GIẢ, không đụng dữ liệu thật; không cần mạng ngoài.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=$PWD/node_modules/axe-core/axe.min.js CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-11-21-tim-doi-tac-theo-so \
//     node docs/evidence/2026-11-21-tim-doi-tac-theo-so/kich-ban/tim-doi-tac-theo-so-smoke.mjs
// Bước (mỗi khổ): 1 nhãn + chữ gợi ý nói cả số điện thoại; 2 gõ số (dạng +84, có dấu cách) ⇒ ra đúng một cộng tác viên ⇒ chọn ⇒ «Điền thông tin đối tác» ⇒ ô SĐT khách đúng số;
//   3 số gõ chưa đủ ⇒ nhắc gõ đủ 10 số; 4 đối tác tạo từ Quản lý tài khoản (chưa có số liên hệ, Bán hàng không sửa được) ⇒ câu «nhờ Quản trị hoặc Toàn quyền» + «Mở hồ sơ ở Danh bạ»,
//   ô SĐT không bị điền số đăng nhập; 5 hồ sơ không gắn tài khoản chưa có số ⇒ «Thêm số ở Danh bạ»; 6 gõ tên vẫn tìm như cũ. Bước 7 (390): tài khoản chỉ Thực tập giữ chữ cũ,
//   gõ số không ra ai. Cuối cùng in «TIM DOI TAC THEO SO OK» hoặc danh sách bước đỏ (thoát 1). Ảnh (chỉ trên máy, .gitignore chặn) ở <OUT>/anh/.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, MOB, OUT, assert, axe, axeNote, boDem, dungMoiTruong, noOverflowX, sleep } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";
import { setInput } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const DESK = { width: 1280, height: 860, mobile: false };
const THUC_TAP = { name: "Thực Tập Tìm Số", phone: "0900000751", pin: "246751", permissions: ["INTERN"] };
const DAI_LY = { name: "Đại Lý Chưa Số", phone: "0900000731" }; // tài khoản Đối tác tạo từ Quản lý tài khoản: số đăng nhập KHÔNG thành số liên hệ (ADR-0001 mục 5)
const CTV_SO = { name: "Cộng Tác Viên Có Số", phone: "0900000741" }; // hồ sơ không gắn tài khoản, có số liên hệ, vai Cộng tác viên (được hưởng)
const CTV_KHONG = { name: "Cộng Tác Viên Chưa Số" }; // hồ sơ không gắn tài khoản, chưa có số liên hệ — Bán hàng sửa được

const { env, call } = await dungMoiTruong([THUC_TAP]);
const b = boDem("TIM DOI TAC THEO SO");
mkdirSync(join(OUT, "anh"), { recursive: true });
const phai = (r, ma, viec) => { assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`); return r.json; };

// ---- dựng dữ liệu bằng API TRƯỚC khi mở trang nào (mỗi lúc một phiên cho mỗi tài khoản) ----
const dl = phai(await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName: DAI_LY.name, phone: DAI_LY.phone, roles: ["TRAVEL_AGENCY"] }), 201, "Toàn quyền tạo tài khoản đại lý");
DAI_LY.partyId = dl.staff.partyId;
for (const ctv of [CTV_SO, CTV_KHONG]) {
  const tao = phai(await call(ACCOUNTS.admin, "POST", "/api/parties", { kind: "PERSON", fullName: ctv.name, ...(ctv.phone ? { contacts: [{ kind: "PHONE", value: ctv.phone }] } : {}) }), 201, `tạo hồ sơ ${ctv.name}`);
  ctv.partyId = tao.party.id;
  phai(await call(ACCOUNTS.admin, "POST", `/api/parties/${ctv.partyId}/roles`, { roleTypeCode: "COLLABORATOR" }), 201, `gán vai Cộng tác viên cho ${ctv.name}`);
}

const chup = async (p, ten, khung) => {
  await sleep(400);
  const cao = await p.ev("Math.ceil(document.documentElement.scrollHeight)");
  const dat = (h) => p.send("Emulation.setDeviceMetricsOverride", { width: khung.width, height: h, deviceScaleFactor: khung.mobile ? 2 : 1, mobile: khung.mobile });
  await dat(Math.max(khung.height, cao));
  await sleep(350);
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, "anh", `${ten}.png`), Buffer.from(r.result.data, "base64"));
  await dat(khung.height);
  await sleep(200);
};
const O_TIM = "document.querySelector('#dat-qua-doi-tac input[type=search]')";
const moTim = async (p) => {
  await p.ev("(document.querySelector('[data-action=\"dat-qua-doi\"]') ?? document.querySelector('[data-action=\"dat-qua-mo\"]')).click(); true");
  await p.waitFor(`!!${O_TIM}`, "ô tìm đối tác mở");
};
const go = (p, q) => p.ev(setInput(O_TIM, q));
const dsId = (p) => p.ev("[...document.querySelectorAll('#dat-qua-doi-tac .dqdt-dong')].map((x) => x.dataset.partyId)");
const chuDs = (p) => p.ev("document.querySelector('#dat-qua-doi-tac .dqdt-ket-qua').innerText.replace(/\\s+/g, ' ').trim()");
const chon = async (p, partyId) => {
  await p.waitFor(`!!document.querySelector('#dat-qua-doi-tac .dqdt-dong[data-party-id=${JSON.stringify(partyId)}]')`, `kết quả có ${partyId}`);
  await p.ev(`document.querySelector('#dat-qua-doi-tac .dqdt-dong[data-party-id=${JSON.stringify(partyId)}]').click(); true`);
  await p.waitFor("!!document.querySelector('#dat-qua-doi-tac .dqdt-chon-xanh')", "dòng đã chọn");
};
const bao = (p) => p.ev("(() => { const e = document.getElementById('use-partner-bao'); const a = e.querySelector('a'); return { hien: !e.hidden && e.getClientRects().length > 0, chu: e.innerText.replace(/\\s+/g, ' ').trim(), lienKet: a ? { chu: a.textContent, href: a.getAttribute('href'), target: a.target, rel: a.rel } : null }; })()");
const dien = async (p) => {
  await p.ev("document.getElementById('use-partner').click(); true");
  await sleep(900);
};
const o = (p, id) => p.ev(`document.getElementById(${JSON.stringify(id)}).value`);

for (const [hau, khung] of [["390", MOB], ["1280", DESK]]) {
  const p = await env.as(ACCOUNTS.salesA, "/order-form", khung);
  await p.waitFor("!!document.querySelector('[data-action=\"dat-qua-mo\"]')", "công tắc «Đơn của»");

  await b.step(`${hau}-1`, `${hau}: Bán hàng bấm «Qua đối tác» ⇒ nhãn «Tìm đối tác theo tên hoặc số điện thoại», chữ gợi ý «Gõ tên hoặc số điện thoại», ô cỡ 16px`, async () => {
    await moTim(p);
    const v = await p.ev(`(() => { const i = ${O_TIM}; return { nhan: i.closest('label').firstChild.textContent, goiY: i.placeholder, co: getComputedStyle(i).fontSize }; })()`);
    assert.deepEqual(v, { nhan: "Tìm đối tác theo tên hoặc số điện thoại", goiY: "Gõ tên hoặc số điện thoại", co: "16px" });
    await p.waitFor("document.querySelectorAll('#dat-qua-doi-tac .dqdt-dong').length >= 1", "danh sách đối tác");
    await chup(p, `${hau}-1-o-tim`, khung);
  });

  await b.step(`${hau}-2`, `${hau}: gõ «+84 900 000 741» ⇒ ra đúng một cộng tác viên ⇒ chọn ⇒ «Điền thông tin đối tác» ⇒ ô tên + SĐT khách đúng; không tràn ngang${axeNote()}`, async () => {
    await go(p, "+84 900 000 741");
    await p.waitFor(`document.querySelectorAll('#dat-qua-doi-tac .dqdt-dong').length === 1`, "một kết quả theo số", 6000);
    assert.deepEqual(await dsId(p), [CTV_SO.partyId]);
    await chon(p, CTV_SO.partyId);
    await dien(p);
    assert.deepEqual([await o(p, "customerName"), await o(p, "customerPhone")], [CTV_SO.name, CTV_SO.phone]);
    assert.equal((await bao(p)).hien, false, "có số thì không hiện câu báo");
    assert.equal(await p.ev(noOverflowX), true, "không tràn ngang");
    await axe(p, `đã điền đối tác ${hau}`);
    await chup(p, `${hau}-2-dien-theo-so`, khung);
  });

  await b.step(`${hau}-3`, `${hau}: «Đổi» rồi gõ «0900 00» (chưa đủ số) ⇒ nhắc «Gõ đủ 10 số để tìm theo số điện thoại.»`, async () => {
    await moTim(p);
    await go(p, "0900 00");
    await p.waitFor(`/Gõ đủ 10 số/.test(document.querySelector('#dat-qua-doi-tac .dqdt-ket-qua').innerText)`, "câu nhắc gõ đủ số", 6000);
    assert.equal(await chuDs(p), "Gõ đủ 10 số để tìm theo số điện thoại.");
    await chup(p, `${hau}-3-go-chua-du-so`, khung);
  });

  await b.step(`${hau}-4`, `${hau}: đối tác tạo từ Quản lý tài khoản (chưa có số liên hệ) ⇒ câu nhờ Quản trị hoặc Toàn quyền + «Mở hồ sơ ở Danh bạ» (tab mới); ô SĐT không nhận số đăng nhập${axeNote()}`, async () => {
    await go(p, DAI_LY.name);
    await chon(p, DAI_LY.partyId);
    const truoc = await o(p, "customerPhone");
    await dien(p);
    const v = await bao(p);
    assert.equal(v.hien, true);
    assert.equal(v.chu, "Đối tác này chưa có số điện thoại. Nhờ Quản trị hoặc Toàn quyền thêm số. Mở hồ sơ ở Danh bạ");
    assert.deepEqual(v.lienKet, { chu: "Mở hồ sơ ở Danh bạ", href: `/parties?id=${DAI_LY.partyId}`, target: "_blank", rel: "noopener" });
    assert.equal(await o(p, "customerPhone"), truoc, "không điền rỗng, không xoá ô đang có");
    assert.equal(await p.ev("document.querySelector('#use-partner-bao a').getClientRects().length"), 1, "liên kết nằm trọn một dòng (không gãy giữa chữ)");
    assert.notEqual(await o(p, "customerPhone"), DAI_LY.phone, "không tự chép số đăng nhập");
    await axe(p, `câu báo chưa có số ${hau}`);
    await chup(p, `${hau}-4-chua-co-so-gan-tai-khoan`, khung);
  });

  await b.step(`${hau}-5`, `${hau}: hồ sơ không gắn tài khoản, chưa có số (Bán hàng sửa được) ⇒ «Thêm số ở Danh bạ»`, async () => {
    await moTim(p);
    await go(p, CTV_KHONG.name);
    await chon(p, CTV_KHONG.partyId);
    await dien(p);
    const v = await bao(p);
    assert.equal(v.chu, "Đối tác này chưa có số điện thoại. Thêm số ở Danh bạ");
    assert.deepEqual(v.lienKet, { chu: "Thêm số ở Danh bạ", href: `/parties?id=${CTV_KHONG.partyId}`, target: "_blank", rel: "noopener" });
    await chup(p, `${hau}-5-chua-co-so-sua-duoc`, khung);
  });

  await b.step(`${hau}-6`, `${hau}: gõ tên vẫn tìm như cũ («Có Số» ⇒ cộng tác viên có số); số không thuộc đối tác nào ⇒ «Không có đối tác nào có tên hoặc số điện thoại này.»`, async () => {
    await moTim(p);
    await go(p, "Có Số");
    await p.waitFor(`[...document.querySelectorAll('#dat-qua-doi-tac .dqdt-dong')].some((x) => x.dataset.partyId === ${JSON.stringify(CTV_SO.partyId)})`, "tìm theo tên", 6000);
    await go(p, "0911 222 333");
    await p.waitFor(`/Không có đối tác nào/.test(document.querySelector('#dat-qua-doi-tac .dqdt-ket-qua').innerText)`, "câu rỗng", 6000);
    assert.equal(await chuDs(p), "Không có đối tác nào có tên hoặc số điện thoại này.");
  });
  p.close();
}

await b.step("390-7", "tài khoản chỉ Thực tập (không xem được hồ sơ): nhãn cũ «Tìm đối tác theo tên»; gõ số của cộng tác viên ⇒ «Không có đối tác nào tên như vậy.»", async () => {
  const p = await env.as(THUC_TAP, "/order-form", MOB);
  await p.waitFor("!!document.querySelector('[data-action=\"dat-qua-mo\"]')", "công tắc «Đơn của» (Thực tập có ô — coODatQuaDoiTac)");
  await moTim(p);
  assert.equal(await p.ev(`${O_TIM}.closest('label').firstChild.textContent`), "Tìm đối tác theo tên");
  assert.equal(await p.ev(`${O_TIM}.placeholder`), "Gõ tên đại lý / cộng tác viên");
  await go(p, CTV_SO.phone);
  await p.waitFor(`/Không có đối tác nào/.test(document.querySelector('#dat-qua-doi-tac .dqdt-ket-qua').innerText)`, "câu rỗng của Thực tập", 6000);
  assert.equal(await chuDs(p), "Không có đối tác nào tên như vậy.");
  assert.deepEqual(await dsId(p), []);
  await chup(p, "390-7-thuc-tap", MOB);
  p.close();
});

await env.stop();
b.xong();

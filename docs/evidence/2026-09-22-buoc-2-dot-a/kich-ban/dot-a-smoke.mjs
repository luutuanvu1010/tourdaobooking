// Kiểm 5 trang vừa đổi từ bảng sang thẻ ở khổ điện thoại (Bước 2 Đợt A: Nhân viên/Dịch vụ/Địa điểm/Hồ sơ/Nhật ký).
// Dùng lại đúng cơ chế CDP của A2 (KHÔNG viết lại): startEnv()/ACCOUNTS/ok từ ../../2026-09-20-a2/kich-ban/a2-cdp.mjs.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=<…/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/dot-a-smoke.mjs
// Ghi ảnh vào docs/evidence/2026-09-22-buoc-2-dot-a/anh/*.png (10 ảnh: 5 trang × 2 khổ).
// Đặt vé của đối tác, lượt 1 (Task 4, 2026-11-02): thêm khối «Bộ lọc theo vai trò» ở Quản lý tài khoản (/staff), đặt TRƯỚC vòng năm trang vì kịch bản đỏ sẵn ở trang thứ 5 (/audit): bấm một vai → số dòng của BẢNG và của THẺ khớp số trong nút; «Tất cả» → đủ dòng;
// tải lại trang → lựa chọn còn (sessionStorage `tk-loc-vai`); lựa chọn nhớ không còn nút (vai hết người, chữ rác) → về «Tất cả»; điện thoại 390: thẻ lọc, bảng ẩn.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-22-buoc-2-dot-a";
const AXE = readFileSync(process.env.AXE_JS, "utf8");
mkdirSync(join(OUT, "anh"), { recursive: true });

const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };

// 5 trang của Đợt A, cả 5 đều chỉ ADMIN vào được (staff.ts/catalog.ts/locations.ts/audit.ts chặn ngay ở đầu trang; parties.ts mở cho mọi nhân sự văn phòng nhưng ADMIN vẫn vào được).
const PAGES = [
  ["nhan-vien", "/staff"],
  ["dich-vu", "/catalog"],
  ["dia-diem", "/locations"],
  ["ho-so", "/parties"],
  ["nhat-ky", "/audit"],
];

const env = await startEnv();
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, {
      method,
      headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  };

  // Dữ liệu tối thiểu để MỖI trang có ít nhất 1 thẻ ở khổ điện thoại: Dịch vụ (3 mục) và Nhân viên (4 tài khoản) đã có sẵn từ
  // seed của startEnv() (CATALOG_SQL + ACCOUNTS); Địa điểm, Hồ sơ và Nhật ký thì trống nên phải tạo trước bằng API thật (không phải
  // để kiểm giao diện lập đơn/địa điểm — chỉ để có dữ liệu cho trang danh sách render ra thẻ).
  const loc = await call(ACCOUNTS.admin, "POST", "/api/locations", { code: "VP_KIEM_THE", name: "Văn phòng kiểm thẻ", locationTypeCode: "OFFICE", address: null, sortOrder: 0 });
  assert.equal(loc.status, 201, JSON.stringify(loc.json));
  const party = await call(ACCOUNTS.admin, "POST", "/api/parties", { kind: "PERSON", fullName: "Khách Kiểm Thẻ", contacts: [] });
  assert.equal(party.status, 201, JSON.stringify(party.json));
  // Tạo một đơn (ADMIN có quyền order.create) chỉ để sinh một dòng nhật ký "created" — trang /audit đọc bảng audit_log, seed
  // insertStaffSql không đi qua logic ứng dụng nên không tự sinh nhật ký nào.
  // 2026-09-26 (DK-T3-01 R1, chủ dự án "loại bỏ hoàn toàn dịch vụ nhập tay"): API không nhận dịch vụ nhập tay MỚI (400) → đơn dùng dịch vụ danh mục
  // giả TTB06 của a2-cdp.mjs (trước: dịch vụ nhập tay "Xe đưa đón"). Loại dịch vụ không liên quan điều kịch bản khẳng định (5 trang bảng → thẻ).
  const order = await call(ACCOUNTS.admin, "POST", "/api/orders", {
    customerName: "Khách Kiểm Nhật Ký",
    customerPhone: "0909 000 111",
    customerEmail: "",
    customerNote: "",
    discount: 0,
    depositAmount: 0,
    depositMethod: null,
    paymentNote: "",
    services: [
      {
        kind: "catalog", pickupChoice: "KHONG_DON",
        catalogCode: "TTB06",
        pax: { adult: 1, child: 0, senior: 0, infant: 0 },
        catalogPriceSeen: { adult: 800000 },
        departDate: "",
        departTime: "",
        pickupTime: "",
        pickupPlace: "",
        checkinDate: "",
        checkinTime: "",
        checkinPlace: "",
        note: "",
      },
    ],
  });
  assert.equal(order.status, 201, JSON.stringify(order.json));

  const write = (name, r) => writeFileSync(join(OUT, "anh", name), Buffer.from(r.result.data, "base64"));
  const shot = async (p, name) => write(name, await p.send("Page.captureScreenshot", { format: "png" }));

  /** axe-core: 0 vi phạm mức critical/serious. */
  const axe = async (p, label) => {
    if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
    const v = await p.ev(
      `axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help })))`,
    );
    const bad = v.filter((x) => x.impact === "critical" || x.impact === "serious");
    assert.deepEqual(bad, [], `axe (${label}): ${JSON.stringify(bad)}`);
  };

  // `table.items` nằm TRONG `.table-wrap` — mốc bảng→thẻ (app.css) đặt `display:none` lên `.table-wrap` dưới 900px, không phải
  // lên chính bảng, nên đọc getComputedStyle(table).display sẽ luôn ra "table" bất kể khổ nào. offsetParent === null là cách
  // đáng tin để biết một phần tử có đang thật sự HIỆN RA hay không (kể cả khi display:none nằm ở tổ tiên). `.card-list` thì
  // ngược lại — nó TỰ mang class có display:none ở khổ máy tính — nên đọc thẳng getComputedStyle cho đúng cơ chế thật của mốc.
  const measure = (p) =>
    p.ev(`(() => {
      const table = document.querySelector('table.items');
      const cardList = document.querySelector('.card-list');
      return {
        tableVisible: table !== null && table.offsetParent !== null,
        cardListDisplay: cardList ? getComputedStyle(cardList).display : null,
        cardListVisible: cardList !== null && cardList.offsetParent !== null,
        cardCount: document.querySelectorAll('.card-list .card').length,
      };
    })()`);

  // CHẠY TRƯỚC vòng PAGES: kịch bản này ĐÃ ĐỎ SẴN ở trang thứ 5 (/audit chỉ Toàn quyền — `audit.view` là `chiToanQuyen()`, còn tài khoản `admin` chỉ có quyền Quản trị nên trang trả 403 và
  // `waitFor` thẻ hết giờ ném lỗi, vòng lặp không có try) — khối đặt SAU vòng sẽ không bao giờ chạy tới. Không sửa chỗ đỏ sẵn đó (ngoài phạm vi); chỉ đặt khối lọc ở trước nó.
  // ---- Bộ lọc theo vai trò (/staff) — Task 4, đặt vé của đối tác lượt 1 ----
  // Dữ liệu: ba tài khoản MANG VAI (Toàn quyền tạo qua API thật, đúng cách so-dai-ly-smoke.mjs): hai «Nhân viên kinh doanh», một «Công ty lữ hành». Bốn tài khoản có sẵn của startEnv() chưa gán vai
  // (chỉ có quyền) → nút «Chưa gán vai trò». Số dòng KHÔNG gõ cứng ngoài hai con số của chính dữ liệu vừa tạo.
  for (const [ten, sdt, vai] of [["Lọc Bán Một", "0900000381", "SALES_STAFF"], ["Lọc Bán Hai", "0900000382", "SALES_STAFF"], ["Lọc Đại Lý", "0900000383", "TRAVEL_AGENCY"]]) {
    const r = await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName: ten, phone: sdt, roles: [vai] });
    assert.equal(r.status, 201, `Toàn quyền tạo tài khoản ${ten} (${vai}): ${r.status} ${JSON.stringify(r.json)}`);
  }
  /** Trạng thái bộ lọc + số dòng của bảng và của thẻ (đếm trong DOM, và đếm cái ĐANG HIỆN: `offsetParent`). */
  const docLoc = (p) =>
    p.ev(`(() => {
      const hien = (e) => e.offsetParent !== null;
      const khung = document.getElementById('loc-vai');
      return {
        an: khung.hidden,
        nhom: khung.getAttribute('role') + '|' + khung.getAttribute('aria-label'),
        nut: [...khung.querySelectorAll('.loc-nut')].map((b) => ({ khoa: b.dataset.loc, chu: b.textContent.trim(), bam: b.getAttribute('aria-pressed') })),
        bang: document.querySelectorAll('#list > tr').length,
        the: document.querySelectorAll('#list-cards > .card').length,
        bangHien: [...document.querySelectorAll('#list > tr')].filter(hien).length,
        theHien: [...document.querySelectorAll('#list-cards > .card')].filter(hien).length,
        chuaGanTrongBang: [...document.querySelectorAll('#list > tr')].every((r) => r.textContent.includes('chưa gán vai trò')),
      };
    })()`);
  const soTrongNut = (chu) => Number(/\((\d+)\)$/.exec(chu)?.[1]);
  const nutCua = (s, khoa) => s.nut.find((n) => n.khoa === khoa);
  const bam = (p, khoa) => p.ev(`document.querySelector('#loc-vai .loc-nut[data-loc="${khoa}"]').click(); true`);
  const DOI_NUT = "document.querySelectorAll('#loc-vai .loc-nut').length >= 3";
  /** Tải lại /staff; chờ trang CŨ biến mất (cờ `__truocTai` mất) rồi nút lọc dựng lại. */
  const taiLai = async (p) => {
    await p.ev("window.__truocTai = true; true");
    await p.send("Page.navigate", { url: `${env.base}/staff` });
    await p.waitFor(`!window.__truocTai && document.readyState === 'complete' && ${DOI_NUT}`, "/staff tải lại xong, nút lọc dựng lại");
  };

  {
    const p = await env.as(ACCOUNTS.admin, "/staff", DESK);
    await p.waitFor(DOI_NUT, "hàng nút lọc hiện đủ nút (Tất cả + vai + Chưa gán)");
    const s0 = await docLoc(p);
    assert.equal(s0.an, false, `hàng nút lọc hiện khi có dữ liệu — ${JSON.stringify(s0)}`);
    assert.equal(s0.nhom, "group|Lọc theo vai trò", `nhóm nút có role=group và tên — ${s0.nhom}`);
    assert.equal(s0.nut[0].khoa, "tat-ca", `nút đầu là «Tất cả» — ${JSON.stringify(s0.nut)}`);
    assert.match(s0.nut[0].chu, /^Tất cả \(\d+\)$/, `nhãn «Tất cả (n)» — ${s0.nut[0].chu}`);
    assert.equal(s0.nut[0].bam, "true", "mặc định đang chọn «Tất cả»");
    assert.equal(soTrongNut(s0.nut[0].chu), s0.bang, `«Tất cả» khớp số dòng bảng — ${JSON.stringify(s0)}`);
    assert.equal(s0.bang, s0.the, `bảng và thẻ cùng số dòng — ${JSON.stringify(s0)}`);
    assert.equal(soTrongNut(nutCua(s0, "SALES_STAFF")?.chu ?? ""), 2, `hai tài khoản Nhân viên kinh doanh — ${JSON.stringify(s0.nut)}`);
    assert.equal(soTrongNut(nutCua(s0, "TRAVEL_AGENCY")?.chu ?? ""), 1, `một tài khoản Công ty lữ hành — ${JSON.stringify(s0.nut)}`);
    assert.equal(s0.nut.at(-1).khoa, "chua-gan", `«Chưa gán vai trò» đứng cuối — ${JSON.stringify(s0.nut)}`);
    assert.equal(s0.nut.at(-1).chu.replace(/ \(\d+\)$/, ""), "Chưa gán vai trò");
    const TONG = s0.bang;

    // Bấm một vai → bảng VÀ thẻ cùng lọc, số dòng khớp số trong nút, nút được chọn đổi aria-pressed.
    await bam(p, "SALES_STAFF");
    await p.waitFor("document.querySelectorAll('#list > tr').length === 2", "bấm Nhân viên kinh doanh → bảng còn 2 dòng");
    const s1 = await docLoc(p);
    assert.deepEqual([s1.bang, s1.the], [soTrongNut(nutCua(s1, "SALES_STAFF").chu), soTrongNut(nutCua(s1, "SALES_STAFF").chu)], `bảng và thẻ cùng khớp số trong nút — ${JSON.stringify(s1)}`);
    assert.deepEqual(s1.nut.filter((n) => n.bam === "true").map((n) => n.khoa), ["SALES_STAFF"], `chỉ nút vừa bấm được chọn — ${JSON.stringify(s1.nut)}`);
    await shot(p, "nhan-vien-loc-vai-may-tinh.png");

    // Tải lại trang: lựa chọn còn (nhớ theo phiên).
    await taiLai(p);
    const s2 = await docLoc(p);
    assert.deepEqual([s2.bang, s2.the, nutCua(s2, "SALES_STAFF").bam], [2, 2, "true"], `tải lại: vẫn đang lọc Nhân viên kinh doanh — ${JSON.stringify(s2)}`);

    // «Tất cả» → đủ dòng.
    await bam(p, "tat-ca");
    await p.waitFor(`document.querySelectorAll('#list > tr').length === ${TONG}`, "bấm Tất cả → đủ dòng");
    const s3 = await docLoc(p);
    assert.deepEqual([s3.bang, s3.the], [TONG, TONG], `«Tất cả»: đủ dòng ở cả bảng và thẻ — ${JSON.stringify(s3)}`);

    // «Chưa gán vai trò» → chỉ tài khoản chưa có vai (dòng nào cũng ghi «chưa gán vai trò»).
    await bam(p, "chua-gan");
    const soChua = soTrongNut(nutCua(s3, "chua-gan").chu);
    await p.waitFor(`document.querySelectorAll('#list > tr').length === ${soChua}`, "bấm Chưa gán vai trò → đúng số dòng");
    const s4 = await docLoc(p);
    assert.deepEqual([s4.bang, s4.the, s4.chuaGanTrongBang], [soChua, soChua, true], `«Chưa gán vai trò» — ${JSON.stringify(s4)}`);

    // Lựa chọn đã nhớ mà KHÔNG còn nút (vai không còn ai giữ; chữ rác) → về «Tất cả», không để bảng trống không lý do.
    for (const nho of ["DIRECTOR", "rác"]) {
      await p.ev(`sessionStorage.setItem('tk-loc-vai', ${JSON.stringify(nho)}); true`);
      await taiLai(p);
      const sx = await docLoc(p);
      assert.deepEqual([sx.bang, sx.the, nutCua(sx, "tat-ca").bam], [TONG, TONG, "true"], `lựa chọn nhớ «${nho}» không còn nút → về «Tất cả» — ${JSON.stringify(sx)}`);
    }
    assert.deepEqual(p.consoleErrors, [], `lỗi console (bộ lọc máy tính): ${p.consoleErrors}`);
    p.close();
    ok(`bộ lọc theo vai trò (máy tính 1040×800): bấm vai → bảng và thẻ cùng lọc, khớp số trong nút; «Tất cả» đủ ${TONG} dòng; «Chưa gán vai trò» ${soChua} dòng; tải lại còn lựa chọn; lựa chọn không còn nút về «Tất cả»`);
  }

  {
    // Điện thoại 390: lọc ở THẺ (bảng ẩn). Trang mới = sessionStorage mới → mặc định «Tất cả».
    const p = await env.as(ACCOUNTS.admin, "/staff", MOB);
    await p.waitFor(DOI_NUT, "hàng nút lọc hiện đủ nút (điện thoại)");
    const s0 = await docLoc(p);
    assert.deepEqual([s0.bangHien, s0.theHien], [0, s0.the], `điện thoại: bảng ẩn, thẻ hiện đủ — ${JSON.stringify(s0)}`);
    await bam(p, "SALES_STAFF");
    await p.waitFor("document.querySelectorAll('#list-cards > .card').length === 2", "bấm Nhân viên kinh doanh → còn 2 thẻ");
    const s1 = await docLoc(p);
    assert.deepEqual([s1.theHien, s1.bangHien], [2, 0], `điện thoại: 2 thẻ hiện, bảng vẫn ẩn — ${JSON.stringify(s1)}`);
    const trachNgang = await p.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth");
    assert.ok(trachNgang <= 1, `không tràn ngang ở 390px — lệch ${trachNgang}px`);
    await axe(p, "nhan-vien-loc-vai");
    await shot(p, "nhan-vien-loc-vai-dien-thoai.png");
    assert.deepEqual(p.consoleErrors, [], `lỗi console (bộ lọc điện thoại): ${p.consoleErrors}`);
    p.close();
    ok("bộ lọc theo vai trò (điện thoại 390×844): lọc ở thẻ, bảng ẩn, không tràn ngang, axe không vi phạm critical/serious");
  }

  for (const [label, path] of PAGES) {
    // ---- khổ máy tính (1040×800): table.items HIỆN, .card-list ẨN ----
    let p = await env.as(ACCOUNTS.admin, path, DESK);
    await p.waitFor("document.querySelectorAll('.card-list .card').length >= 1", `${label}: thẻ đã dựng xong (máy tính)`);
    const desk = await measure(p);
    assert.equal(desk.tableVisible, true, `${label} (máy tính): table.items phải HIỆN — ${JSON.stringify(desk)}`);
    assert.equal(desk.cardListDisplay, "none", `${label} (máy tính): .card-list phải có display:none — ${JSON.stringify(desk)}`);
    assert.equal(desk.cardListVisible, false, `${label} (máy tính): .card-list phải ẨN — ${JSON.stringify(desk)}`);
    assert.deepEqual(p.consoleErrors, [], `lỗi console (${label} máy tính): ${p.consoleErrors}`);
    await shot(p, `${label}-may-tinh.png`);
    p.close();
    ok(`${label} (máy tính, 1040×800): table.items hiện, .card-list ẩn`);

    // ---- khổ điện thoại (390×844): table.items ẨN, .card-list HIỆN với ≥1 .card, axe không critical/serious ----
    p = await env.as(ACCOUNTS.admin, path, MOB);
    await p.waitFor("document.querySelectorAll('.card-list .card').length >= 1", `${label}: thẻ đã dựng xong (điện thoại)`);
    const mob = await measure(p);
    assert.equal(mob.tableVisible, false, `${label} (điện thoại): table.items phải ẨN — ${JSON.stringify(mob)}`);
    assert.notEqual(mob.cardListDisplay, "none", `${label} (điện thoại): .card-list phải HIỆN — ${JSON.stringify(mob)}`);
    assert.equal(mob.cardListVisible, true, `${label} (điện thoại): .card-list phải HIỆN — ${JSON.stringify(mob)}`);
    assert.ok(mob.cardCount >= 1, `${label} (điện thoại): .card-list phải có ít nhất 1 .card — có ${mob.cardCount}`);
    await shot(p, `${label}-dien-thoai.png`);
    await axe(p, label);
    assert.deepEqual(p.consoleErrors, [], `lỗi console (${label} điện thoại): ${p.consoleErrors}`);
    p.close();
    ok(`${label} (điện thoại, 390×844): table.items ẩn, .card-list hiện với ${mob.cardCount} thẻ, axe không vi phạm critical/serious`);
  }
} finally {
  await env.stop();
}
console.log("DOT A SMOKE OK");

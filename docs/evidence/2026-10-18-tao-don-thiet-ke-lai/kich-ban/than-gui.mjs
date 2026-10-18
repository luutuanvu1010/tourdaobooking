// Thân POST / PUT gửi lên máy chủ cho CÙNG một chuỗi thao tác — trước và sau việc "thẻ dịch vụ gập" (Task 5, 18/10/2026). Phải giống nhau TỪNG BYTE sau khi bỏ
// id ngẫu nhiên (UUID) và dấu khoá lạc quan (`expectedUpdatedAt`) — khuôn T5 của đợt bốn bước (docs/evidence/2026-10-14-tao-don-bon-buoc/kich-ban/chup-anh.mjs, so-sanh.py).
// Mọi ô đều điền bằng `setInput` / `.click()` của JS (chạy được cả khi ô đang nằm trong thẻ gập — `hidden` không chặn sự kiện), nên CÙNG kịch bản chạy được trên bản trước lẫn bản sau.
// Kịch bản (mỗi khổ 390 + 1040, tài khoản Bán hàng, D1 tạm, không cần mạng ngoài):
//   1) lập đơn ba dịch vụ: TD101 (2 người lớn + 1 trẻ em, đơn giá người lớn sửa tay, một chặng đưa đón "Gõ tự do" + giờ đón), TTB03 Phao chuối (7 khách), TTB06 Motor nước (2 người lớn) → POST;
//   2) mở lại đơn, Lưu không đụng gì → PUT-1;
//   3) mở lại đơn, đổi số khách ở thẻ Phao chuối (bản sau: thẻ đang GẬP) và bỏ trẻ em của TD101 → PUT-2.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   GIAI_DOAN=truoc CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-18-tao-don-thiet-ke-lai/kich-ban/than-gui.mjs
//   GIAI_DOAN=sau   … (cùng lệnh) — ghi than-gui-sau.json rồi SO với than-gui-truoc.json, in "THAN GUI GIONG NHAU" hoặc chỗ khác (thoát 1).
// Task 6 (lưới số khách + dòng tiền, 18/10/2026) thêm hai biến, vắng thì y như trên:
//   THU_MUC=<thư mục>  ghi / so tệp ở thư mục khác (hồ sơ của Task 5 ở the-gap/ không bị ghi lại);
//   CACH=luoi          thao tác QUA GIAO DIỆN thật thay vì điền thẳng vào ô: bấm nút "Tăng …" / "Giảm …" của bộ đếm (khẳng định nút đang HIỆN — thẻ được mở bằng
//                      đầu thẻ trước), mở "Sửa giá" nếu thẻ có (bản trước Task 6 không có: ô đơn giá luôn hiện) rồi mới gõ đơn giá (khẳng định ô HIỆN). Tệp mang tên
//                      than-gui-luoi-<giai đoạn>.json. Cùng chuỗi thao tác cho ra cùng bản nháp nên thân phải giống bản `CACH` mặc định từng byte.
//   vd: THU_MUC=docs/evidence/2026-10-18-tao-don-thiet-ke-lai/luoi-khach-tien CACH=luoi GIAI_DOAN=truoc … (trên 847cd72e), rồi GIAI_DOAN=sau sau khi sửa.
// Task 7 (đưa đón MỘT ô "Nơi đón" / "Nơi trả", 18/10/2026):
//   - Bước chặng của hai cách trên nhận ra bản đang chạy: còn ô chọn `select[data-o$=":don"]` (bản trước) → chọn "tudo" + gõ ô địa chỉ như cũ; không còn (bản sau) → chạm ô
//     "Nơi đón" thật, gõ địa chỉ, chạm dòng "Gõ tự do: …" (cham-that.mjs). Cùng bản nháp nên thân vẫn phải giống tệp đã ghi.
//   - CACH=noi (tệp than-gui-noi-<giai đoạn>.json, nên đặt THU_MUC=…/dua-don-mot-o): kịch bản RIÊNG cho hai nhánh chọn nơi, cả nơi đón lẫn nơi trả:
//     TD101 chặng đi: đón = điểm danh mục "Khách sạn Biển Xanh" (gieo vào D1 tạm, đứng CUỐI danh sách — bản sau gõ "bien xanh" để lọc), trả = gõ tự do "Cảng Cầu Đá, Nha Trang",
//     giờ 07:30, rồi "+ Thêm chiều về" (chiều về tự đảo: đón = chữ tự do, trả = điểm danh mục); TTB06: đón = gõ tự do "12 Trần Phú, Nha Trang", trả = điểm "Bến cảng Vinpearl"
//     → POST; mở lại, Lưu không đụng gì → PUT-1; mở lại, đổi đón của TD101 sang "Quầy vé 03" và sửa địa chỉ đón TTB06 thành "15 Trần Phú, Nha Trang" → PUT-2.
//     Bản trước: điền ô chọn / ô địa chỉ bằng JS (ô chọn của máy không bấm được qua CDP). Bản sau: CHẠM THẬT (cảm ứng ở 390, chuột ở 1040) và gõ bằng Input.insertText.
//     Ngoài so từng byte (đã bỏ UUID), kiểm THÔ từng thân: đúng id điểm đã chọn ở đúng ô, chữ tự do đúng ô — bộ chuẩn hoá thay mọi UUID bằng <id> nên chọn nhầm điểm vẫn "giống".
// Vòng sửa 1 của việc 7 (người kiểm I-1 — chữ gõ ở ô nơi mất lặng lẽ khi không chạm dòng "Gõ tự do: …"; chủ chọn phương án A):
//   - CACH=goluu (tệp than-gui-goluu-<giai đoạn>.json, đặt THU_MUC=…/dua-don-mot-o): thao tác TỰ NHIÊN trên điện thoại — gõ địa chỉ rồi chạm Lưu, KHÔNG chạm dòng gợi ý nào. Mỗi khổ:
//     POST-A: TD101 + "+ Thêm đưa đón"; chạm ô Nơi đón, gõ "12 Trần Phú, Nha Trang", chạm thẳng "Lưu, chờ xác nhận";
//     POST-B: TTB06 có MẪU đưa đón (gieo vc_leg_template: một chiều, nơi trả mặc định Bến cảng Vinpearl — chặng tạo sẵn với Nơi trả = Vinpearl); chạm Nơi đón, gõ "Bãi Dài, Cam Lâm",
//             chạm ô Nơi trả (rời ô đón bằng cách chạm ô khác trong cùng chặng), gõ "Cảng Cầu Đá, Nha Trang" đè điểm mẫu, chạm Lưu;
//     PUT-A:  mở lại đơn A, mở chặng gọn bằng chạm thật, chạm ô Nơi đón, chọn hết chữ, gõ "15 Trần Phú, Nha Trang", chạm Lưu.
//     Bản trước (081ba279, ô chọn + ô "Địa chỉ đón/trả"): cùng thao tác theo cách cũ — chọn "tudo" ở ô chọn rồi gõ ô địa chỉ (ô địa chỉ cũ ghi từng phím). Kiểm thô từng thân.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { cham, chonNoiMotO, dsCua, goChu } from "./cham-that.mjs";

// Việc 8 (thanh dính cuối trang, thanh toán chỉ hiện ô khi có trả trước, 18/10/2026):
//   - CACH=tratruoc (tệp than-gui-tratruoc-<giai đoạn>.json, đặt THU_MUC=…/thanh-dinh): lập đơn TD101 (2 người lớn) + TTB06 (2 người lớn), giảm giá 100.000, trả trước 2.000.000
//     rồi mới chọn "Tiền mặt" + "Tôi thu" (bản sau: hai ô chỉ hiện SAU khi có số trả trước — khẳng định ô HIỆN trước khi chọn), chạm Lưu → bắt thân POST /api/orders VÀ thân
//     POST /api/orders/:id/payments (bước hai ghi lần thu); đọc tổng trên thanh / Tóm tắt TRƯỚC khi lưu và so với `total` máy chủ trả (GET đơn) sau khi lưu; mở lại đơn, Lưu
//     không đụng gì → PUT-1. Tổng máy chủ ghi vào tệp (khoá TONG-…) để so trước/sau cùng các thân.
const GIAI_DOAN = process.env.GIAI_DOAN ?? "truoc";
const LUOI = process.env.CACH === "luoi";
const NOI = process.env.CACH === "noi";
const GOLUU = process.env.CACH === "goluu";
const TRATRUOC = process.env.CACH === "tratruoc";
const OUT = process.env.THU_MUC ?? "docs/evidence/2026-10-18-tao-don-thiet-ke-lai/the-gap";
const TEN = LUOI ? "than-gui-luoi" : NOI ? "than-gui-noi" : GOLUU ? "than-gui-goluu" : TRATRUOC ? "than-gui-tratruoc" : "than-gui";
mkdirSync(OUT, { recursive: true });
const KHO = [["390", { width: 390, height: 844, mobile: true }], ["1040", { width: 1040, height: 900, mobile: false }]];

const chuanHoa = (txt) =>
  JSON.stringify(JSON.parse(txt), (k, v) => (k === "expectedUpdatedAt" ? "<dau-thoi-gian>" : v)).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<id>");
const layThanTho = (p, method) => p.requests.filter((r) => r.method === method && /\/api\/orders(\/[^/]+)?$/.test(new URL(r.url).pathname)).map((r) => r.postData).at(-1);
const layThan = (p, method) => chuanHoa(layThanTho(p, method));

const the = (i) => `document.querySelectorAll('#services .svc')[${i}]`;
const demDem = (i, nhan) => `${the(i)}.querySelector('.counter-field[aria-label=${JSON.stringify(nhan)}]')`;
const hien = (sel) => `(() => { const e = ${sel}; return !!e && e.getClientRects().length > 0; })()`;
const chang = (i, j) => `${the(i)}.querySelectorAll('.dd-chang')[${j}]`;
const oNoi = (i, j, loai) => `${chang(i, j)}.querySelector('[data-o$=":${loai}"]')`;
/** Bản trước (Task 7) còn ô chọn của máy cho nơi đón / nơi trả. */
const banCu = (p) => p.ev(`!!document.querySelector('#services select[data-o$=":don"]')`);
// CACH=noi: điểm danh mục (id cố định — 8 điểm gieo sẵn ở migrations/0010_locations.sql + một khách sạn gieo thêm, đứng cuối danh sách).
const KS_BIEN_XANH = "b1e5a000-7a57-4d0a-9c1e-000000000001";
const BEN_VINPEARL = "ec67ff94-bb00-4546-842a-aedb5f916b0a";
const QUAY_VE_03 = "2e863e6c-fdb5-4907-be7d-496fac57bf3a";

const env = await startEnv();
if (NOI) env.sql(`INSERT INTO loc_location (id, code, name, location_type_code, sort_order, created_at, updated_at) VALUES ('${KS_BIEN_XANH}', 'KS_BIEN_XANH', 'Khách sạn Biển Xanh', 'HOTEL', 20, '2026-10-18T00:00:00.000Z', '2026-10-18T00:00:00.000Z')`);
// CACH=goluu: mẫu đưa đón của TTB06 = một chiều, nơi trả mặc định Bến cảng Vinpearl (chọn TTB06 → chặng chiều đi tạo sẵn với Nơi trả = Vinpearl, "gợi ý theo dịch vụ").
if (GOLUU) env.sql(`INSERT INTO vc_leg_template (id, code, mode, return_time_hint, default_dropoff_location_id, valid_from_at, created_at, updated_at) VALUES ('b1e5a000-7a57-4d0a-9c1e-0000000000f6', 'TTB06', 'ONE_WAY', NULL, '${BEN_VINPEARL}', '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z')`);
const than = {};
try {
  /** CACH=luoi: bấm nút bộ đếm `nut` ("Tăng" | "Giảm") của loại `nhan` ở thẻ i, `lan` lần — nút phải đang hiện (thẻ mở). */
  const bamDem = async (p, i, nut, nhan, lan) => {
    const sel = `${the(i)}.querySelector('.counter-btn[aria-label=${JSON.stringify(`${nut} ${nhan}`)}]')`;
    assert.equal(await p.ev(hien(sel)), true, `nút "${nut} ${nhan}" của thẻ ${i + 1} đang hiện`);
    for (let k = 0; k < lan; k++) await p.ev(`(${sel}).click(); true`);
    await sleep(100);
  };
  /** CACH=luoi: mở thẻ i bằng đầu thẻ nếu đang gập. */
  const moThe = async (p, i) => {
    if ((await p.ev(`${the(i)}.querySelector('.svc-mo')?.getAttribute('aria-expanded')`)) === "false") await p.ev(`${the(i)}.querySelector('.svc-mo').click(); true`);
    await sleep(150);
  };
  /** Gõ đơn giá người lớn của thẻ 0. CACH=luoi: mở "Sửa giá" nếu thẻ có, khẳng định ô đơn giá HIỆN rồi mới gõ. */
  const goDonGia = async (p, chu) => {
    if (!LUOI) return p.ev(setInput(`${the(0)}.querySelector('.price-field')`, chu)); // y như bản Task 5
    const o = `${the(0)}.querySelector('.price-field[aria-label="Đơn giá người lớn"]')`;
    {
      const suaGia = `${the(0)}.querySelector('[data-action="sua-gia"]')`;
      if (await p.ev(`!!${suaGia}`)) {
        assert.equal(await p.ev(hien(o)), false, "trước khi bấm Sửa giá: ô đơn giá ẩn");
        await p.ev(`(${suaGia}).click(); true`);
        await sleep(150);
      }
      assert.equal(await p.ev(hien(o)), true, "ô đơn giá người lớn đang hiện trước khi gõ");
    }
    await p.ev(setInput(o, chu));
  };
  /** Ô nơi `loai` ("don" | "tra") của chặng j thẻ i = chữ tự do `chu`. Bản trước: ô chọn → "tudo", gõ ô địa chỉ (đã có thì gõ thẳng). Bản sau: chạm ô, gõ, chạm "Gõ tự do: …". */
  const goTuDo = async (p, mobile, i, j, loai, chu) => {
    if (await banCu(p)) {
      if (!(await p.ev(`!!${chang(i, j)}.querySelector('[data-o$=":${loai}-chu"]')`))) {
        await p.ev(setInput(oNoi(i, j, loai), "tudo"));
        await p.waitFor(`!!${chang(i, j)}.querySelector('[data-o$=":${loai}-chu"]')`, `ô địa chỉ ${loai}`);
      }
      await p.ev(setInput(`${chang(i, j)}.querySelector('[data-o$=":${loai}-chu"]')`, chu));
      return;
    }
    await chonNoiMotO(p, mobile, oNoi(i, j, loai), { tim: chu, dong: "Gõ tự do: ", xoaTruoc: true });
    assert.equal(await p.ev(`(${oNoi(i, j, loai)}).value`), chu, `ô ${loai} hiện đúng chữ tự do vừa chọn`);
  };
  /** Ô nơi `loai` của chặng j thẻ i = điểm danh mục `id` (bản sau: gõ `tim`, chạm dòng bắt đầu bằng `ten`). */
  const chonDiem = async (p, mobile, i, j, loai, id, tim, ten) => {
    if (await banCu(p)) return p.ev(setInput(oNoi(i, j, loai), id));
    await chonNoiMotO(p, mobile, oNoi(i, j, loai), { tim, dong: ten });
    assert.match(await p.ev(`(${oNoi(i, j, loai)}).value`), new RegExp(`^${ten}`), `ô ${loai} hiện điểm vừa chọn`);
  };
  /** Bản sau: mở thẻ i (chạm đầu thẻ thật) và chặng j nếu đang gọn một dòng (chạm dòng tóm tắt thật) — để chạm được ô nơi. Bản trước: ô luôn trong cây DOM, không cần. */
  const moChang = async (p, mobile, i, j) => {
    if (await banCu(p)) return;
    if ((await p.ev(`${the(i)}.querySelector('.svc-mo')?.getAttribute('aria-expanded')`)) === "false") await cham(p, mobile, `${the(i)}.querySelector('.svc-mo')`);
    const tt = `${chang(i, j)}.closest('.dd-chang-khung')?.querySelector('.dd-tom-tat')`;
    if (await p.ev(hien(tt))) await cham(p, mobile, tt);
    assert.equal(await p.ev(hien(oNoi(i, j, "don"))), true, `ô nơi đón chặng ${j + 1} thẻ ${i + 1} đang hiện`);
  };
  const chon = async (p, tim, soThe) => {
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(setInput("document.getElementById('catalog-q')", tim));
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", `lọc ${tim}`);
    await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await p.waitFor(`document.querySelectorAll('#services .svc').length === ${soThe}`, `thẻ thứ ${soThe}`);
    await sleep(200);
  };
  const moLai = async (p, id, soThe = 3) => {
    await p.send("Page.navigate", { url: `${env.base}/order-form?id=${id}` });
    await sleep(500);
    await p.waitFor(`location.pathname === '/order-form' && document.querySelectorAll('#services .svc').length === ${soThe}`, "form sửa đơn dựng xong", 15000);
    await sleep(600);
  };
  const luuXong = async (p, nhan) => {
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor("location.pathname === '/order' && !!new URLSearchParams(location.search).get('id')", nhan, 15000);
  };
  /** CACH=noi — hai nhánh chọn nơi (điểm danh mục, gõ tự do) ở cả ô đón lẫn ô trả; xem chú thích đầu tệp. Kiểm thô từng thân rồi trả bản đã chuẩn hoá. */
  const kichBanNoi = async (p, kho, mobile) => {
    const leg = (t, k, j) => JSON.parse(t).services[k].legs[j];
    const kiemLeg = (t, k, j, mong, ten) => {
      const l = leg(t, k, j);
      const co = Object.fromEntries(Object.keys(mong).map((x) => [x, l[x]]));
      assert.deepEqual(co, mong, `${ten} (${kho}): thân thô dịch vụ ${k + 1} chặng ${j + 1}`);
    };
    await chon(p, "TD101", 1);
    await p.ev(setInput(demDem(0, "Người lớn"), "2"));
    await p.ev(`${the(0)}.querySelector('[data-action="them-dua-don"]').click(); true`);
    await p.waitFor(`!!${oNoi(0, 0, "don")}`, "chặng đưa đón TD101");
    await chonDiem(p, mobile, 0, 0, "don", KS_BIEN_XANH, "bien xanh", "Khách sạn Biển Xanh");
    await goTuDo(p, mobile, 0, 0, "tra", "Cảng Cầu Đá, Nha Trang");
    await p.ev(setInput(`${chang(0, 0)}.querySelector('[data-o$=":gio"]')`, "07:30"));
    await p.ev(`${the(0)}.querySelector('[data-action="them-chieu-ve"]').click(); true`);
    await p.waitFor(`${the(0)}.querySelectorAll('.dd-chang').length === 2`, "chiều về TD101");
    await chon(p, "TTB06", 2);
    await p.ev(setInput(demDem(1, "Người lớn"), "2"));
    await p.ev(`${the(1)}.querySelector('[data-action="them-dua-don"]').click(); true`);
    await p.waitFor(`!!${oNoi(1, 0, "don")}`, "chặng đưa đón TTB06");
    await goTuDo(p, mobile, 1, 0, "don", "12 Trần Phú, Nha Trang");
    await chonDiem(p, mobile, 1, 0, "tra", BEN_VINPEARL, "vinpearl", "Bến cảng Vinpearl");
    await p.ev(setInput("document.getElementById('customerName')", "Khách Một Ô Nơi"));
    await p.ev(setInput("document.getElementById('customerPhone')", "0912345671"));
    await sleep(300);
    await luuXong(p, "lưu đơn mới (CACH=noi)");
    const post = layThanTho(p, "POST");
    kiemLeg(post, 0, 0, { direction: "OUT", pickupLocationId: KS_BIEN_XANH, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Cảng Cầu Đá, Nha Trang", pickupTime: "07:30" }, "POST");
    kiemLeg(post, 0, 1, { direction: "RETURN", pickupLocationId: null, pickupPlace: "Cảng Cầu Đá, Nha Trang", dropoffLocationId: KS_BIEN_XANH, dropoffPlace: "" }, "POST");
    kiemLeg(post, 1, 0, { direction: "OUT", pickupLocationId: null, pickupPlace: "12 Trần Phú, Nha Trang", dropoffLocationId: BEN_VINPEARL, dropoffPlace: "" }, "POST");
    than[`POST-${kho}`] = chuanHoa(post);
    const id = await p.ev("new URLSearchParams(location.search).get('id')");
    await moLai(p, id, 2);
    await luuXong(p, "lưu thay đổi (không đụng gì, CACH=noi)");
    const put1 = layThanTho(p, "PUT");
    kiemLeg(put1, 0, 0, { pickupLocationId: KS_BIEN_XANH, dropoffPlace: "Cảng Cầu Đá, Nha Trang" }, "PUT-1");
    kiemLeg(put1, 1, 0, { pickupPlace: "12 Trần Phú, Nha Trang", dropoffLocationId: BEN_VINPEARL }, "PUT-1");
    than[`PUT-1-${kho}`] = chuanHoa(put1);
    await moLai(p, id, 2);
    await moChang(p, mobile, 0, 0);
    await chonDiem(p, mobile, 0, 0, "don", QUAY_VE_03, "quay ve 03", "Quầy vé 03");
    await moChang(p, mobile, 1, 0);
    await goTuDo(p, mobile, 1, 0, "don", "15 Trần Phú, Nha Trang");
    await sleep(300);
    await luuXong(p, "lưu thay đổi (đổi nơi đón, CACH=noi)");
    const put2 = layThanTho(p, "PUT");
    kiemLeg(put2, 0, 0, { pickupLocationId: QUAY_VE_03, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Cảng Cầu Đá, Nha Trang" }, "PUT-2");
    kiemLeg(put2, 0, 1, { pickupPlace: "Cảng Cầu Đá, Nha Trang", dropoffLocationId: KS_BIEN_XANH }, "PUT-2");
    kiemLeg(put2, 1, 0, { pickupLocationId: null, pickupPlace: "15 Trần Phú, Nha Trang", dropoffLocationId: BEN_VINPEARL }, "PUT-2");
    than[`PUT-2-${kho}`] = chuanHoa(put2);
  };
  /** Chạm THẬT nút "Lưu, chờ xác nhận" / "Lưu thay đổi" (cả hai bản) rồi chờ chuyển sang trang đơn. */
  const luuCham = async (p, mobile, nhan) => {
    await cham(p, mobile, "document.getElementById('save')");
    await p.waitFor("location.pathname === '/order' && !!new URLSearchParams(location.search).get('id')", nhan, 15000);
  };
  const moFormMoi = async (p) => {
    await p.send("Page.navigate", { url: `${env.base}/order-form` });
    await p.waitFor("location.pathname === '/order-form' && !!document.getElementById('catalog-q') && !document.getElementById('catalog-q').disabled", "form mới sẵn sàng", 15000);
    await sleep(600);
    await p.ev(setInput("document.getElementById('orderDate')", vnDate(3)));
  };
  /** Bản sau: ô nơi đang mở danh sách (chưa chạm dòng nào). */
  const dangMo = (o) => `(() => { const ds = ${dsCua(o)}; return !!ds && !ds.hidden; })()`;
  /** Bản trước: chọn "tudo" ở ô chọn rồi gõ ô địa chỉ (ô địa chỉ cũ ghi từng phím) — cùng bản nháp mà bản sau phải ra khi gõ rồi rời ô. */
  const goTuDoCu = async (p, i, j, loai, chu) => {
    if (!(await p.ev(`!!${chang(i, j)}.querySelector('[data-o$=":${loai}-chu"]')`))) {
      await p.ev(setInput(oNoi(i, j, loai), "tudo"));
      await p.waitFor(`!!${chang(i, j)}.querySelector('[data-o$=":${loai}-chu"]')`, `ô địa chỉ ${loai}`);
    }
    await p.ev(setInput(`${chang(i, j)}.querySelector('[data-o$=":${loai}-chu"]')`, chu));
  };
  /** CACH=goluu — gõ rồi Lưu, không chạm dòng gợi ý (xem chú thích đầu tệp). Kiểm thô từng thân rồi trả bản đã chuẩn hoá. */
  const kichBanGoLuu = async (p, kho, mobile) => {
    const leg = (t, k, j) => JSON.parse(t).services[k].legs[j];
    const kiemLeg = (t, k, j, mong, ten) => {
      const l = leg(t, k, j);
      const co = Object.fromEntries(Object.keys(mong).map((x) => [x, l[x]]));
      assert.deepEqual(co, mong, `${ten} (${kho}): thân thô dịch vụ ${k + 1} chặng ${j + 1}`);
    };
    // POST-A: gõ ở Nơi đón rồi chạm thẳng Lưu
    await chon(p, "TD101", 1);
    await p.ev(setInput(demDem(0, "Người lớn"), "2"));
    await p.ev(`${the(0)}.querySelector('[data-action="them-dua-don"]').click(); true`);
    await p.waitFor(`!!${oNoi(0, 0, "don")}`, "chặng đưa đón TD101");
    await p.ev(setInput("document.getElementById('customerName')", "Khách Gõ Lưu A"));
    await p.ev(setInput("document.getElementById('customerPhone')", "0912345681"));
    const cu = await banCu(p);
    if (cu) await goTuDoCu(p, 0, 0, "don", "12 Trần Phú, Nha Trang");
    else {
      await cham(p, mobile, oNoi(0, 0, "don"));
      await goChu(p, "12 Trần Phú, Nha Trang");
      assert.equal(await p.ev(dangMo(oNoi(0, 0, "don"))), true, "đang gõ: danh sách còn mở — KHÔNG chạm dòng 'Gõ tự do: …'");
    }
    await luuCham(p, mobile, "lưu đơn A (gõ nơi đón rồi chạm Lưu)");
    const postA = layThanTho(p, "POST");
    kiemLeg(postA, 0, 0, { direction: "OUT", pickupLocationId: null, pickupPlace: "12 Trần Phú, Nha Trang", dropoffLocationId: null, dropoffPlace: "" }, "POST-A");
    than[`POST-A-${kho}`] = chuanHoa(postA);
    const idA = await p.ev("new URLSearchParams(location.search).get('id')");
    // POST-B: nơi trả có sẵn theo mẫu dịch vụ; gõ Nơi đón, chạm ô Nơi trả, gõ đè địa chỉ khác, chạm Lưu
    await moFormMoi(p);
    await chon(p, "TTB06", 1);
    await p.waitFor(`!!${oNoi(0, 0, "tra")}`, "chặng tạo sẵn theo mẫu TTB06");
    if (cu) assert.equal(await p.ev(`(${oNoi(0, 0, "tra")}).value`), BEN_VINPEARL, "bản trước: Nơi trả tạo sẵn = Vinpearl");
    else assert.equal(await p.ev(`(${oNoi(0, 0, "tra")}).value`), "Bến cảng Vinpearl · bến cảng", "bản sau: Nơi trả tạo sẵn = Vinpearl");
    await p.ev(setInput(demDem(0, "Người lớn"), "2"));
    await p.ev(setInput("document.getElementById('customerName')", "Khách Gõ Lưu B"));
    await p.ev(setInput("document.getElementById('customerPhone')", "0912345682"));
    if (cu) {
      await goTuDoCu(p, 0, 0, "don", "Bãi Dài, Cam Lâm");
      await goTuDoCu(p, 0, 0, "tra", "Cảng Cầu Đá, Nha Trang");
    } else {
      await cham(p, mobile, oNoi(0, 0, "don"));
      await goChu(p, "Bãi Dài, Cam Lâm");
      await cham(p, mobile, oNoi(0, 0, "tra"));
      assert.equal(await p.ev(`(${oNoi(0, 0, "don")}).value`), "Bãi Dài, Cam Lâm", "rời ô Nơi đón bằng cách chạm ô Nơi trả: chữ vừa gõ ở lại ô đón");
      assert.equal(await p.ev(`document.activeElement === ${oNoi(0, 0, "tra")}`), true, "cú chạm vào ô Nơi trả không bị nuốt: tiêu điểm ở ô Nơi trả");
      await goChu(p, "Cảng Cầu Đá, Nha Trang");
      assert.equal(await p.ev(dangMo(oNoi(0, 0, "tra"))), true, "đang gõ ở Nơi trả: danh sách còn mở — KHÔNG chạm dòng nào");
    }
    await luuCham(p, mobile, "lưu đơn B (nơi trả theo mẫu, gõ đè rồi chạm Lưu)");
    const postB = layThanTho(p, "POST");
    kiemLeg(postB, 0, 0, { direction: "OUT", pickupLocationId: null, pickupPlace: "Bãi Dài, Cam Lâm", dropoffLocationId: null, dropoffPlace: "Cảng Cầu Đá, Nha Trang" }, "POST-B");
    than[`POST-B-${kho}`] = chuanHoa(postB);
    // PUT-A: mở lại đơn A, sửa địa chỉ gõ tự do, chạm Lưu
    await moLai(p, idA, 1);
    if (cu) await goTuDoCu(p, 0, 0, "don", "15 Trần Phú, Nha Trang");
    else {
      await moChang(p, mobile, 0, 0);
      await cham(p, mobile, oNoi(0, 0, "don"));
      assert.equal(await p.ev(`(${oNoi(0, 0, "don")}).value`), "12 Trần Phú, Nha Trang", "mở ô đang là chữ tự do: giữ chữ để sửa");
      await p.ev(`(${oNoi(0, 0, "don")}).select(); true`);
      await goChu(p, "15 Trần Phú, Nha Trang");
    }
    await luuCham(p, mobile, "lưu thay đổi đơn A (sửa địa chỉ rồi chạm Lưu)");
    const putA = layThanTho(p, "PUT");
    kiemLeg(putA, 0, 0, { pickupLocationId: null, pickupPlace: "15 Trần Phú, Nha Trang" }, "PUT-A");
    than[`PUT-A-${kho}`] = chuanHoa(putA);
  };
  /** CACH=tratruoc — giảm giá + trả trước + hình thức / người nhận tiền (xem chú thích đầu tệp). */
  const kichBanTraTruoc = async (p, kho, mobile) => {
    const so = (t) => Number(String(t).replace(/[^0-9]/g, ""));
    await chon(p, "TD101", 1);
    await p.ev(setInput(demDem(0, "Người lớn"), "2"));
    await chon(p, "TTB06", 2);
    await p.ev(setInput(demDem(1, "Người lớn"), "2"));
    await p.ev(setInput("document.getElementById('customerName')", "Khách Trả Trước"));
    await p.ev(setInput("document.getElementById('customerPhone')", "0912345690"));
    await p.ev(setInput("document.getElementById('discount')", "100000"));
    await p.ev(setInput("document.getElementById('prepaidAmount')", "2000000"));
    await sleep(200);
    for (const id of ["prepaidMethod", "prepaidCollector"]) assert.equal(await p.ev(hien(`document.getElementById('${id}')`)), true, `ô ${id} đang hiện sau khi nhập số trả trước`);
    await p.ev(setInput("document.getElementById('prepaidMethod')", "CASH"));
    await p.ev(setInput("document.getElementById('prepaidCollector')", "toi"));
    await sleep(200);
    const truocLuu = await p.ev("({ thanh: document.getElementById('mobile-total').textContent, tomTat: document.getElementById('sum-total').textContent })");
    assert.equal(truocLuu.thanh, truocLuu.tomTat, `${kho}: tổng thanh dính = tổng Tóm tắt`);
    await luuCham(p, mobile, "lưu đơn có trả trước");
    const post = layThanTho(p, "POST");
    const thanhToan = p.requests.filter((r) => r.method === "POST" && /\/api\/orders\/[^/]+\/payments$/.test(new URL(r.url).pathname)).map((r) => r.postData).at(-1);
    assert.ok(thanhToan, `${kho}: có gửi lần thu trả trước`);
    assert.deepEqual(JSON.parse(thanhToan), { soTien: 2000000, hinhThuc: "CASH", nguoiThu: "toi" }, `${kho}: thân lần thu (thô)`);
    const id = await p.ev("new URLSearchParams(location.search).get('id')");
    const may = await p.ev(`fetch('/api/orders/${id}').then((r) => r.json()).then((j) => ({ subtotal: j.order.subtotal, discount: j.order.discount, total: j.order.total }))`);
    assert.equal(may.total, so(truocLuu.thanh), `${kho}: tổng máy chủ (${may.total}) = tổng trên thanh trước khi lưu (${truocLuu.thanh})`);
    than[`POST-${kho}`] = chuanHoa(post);
    than[`THANH-TOAN-${kho}`] = chuanHoa(thanhToan);
    than[`TONG-${kho}`] = JSON.stringify(may);
    await moLai(p, id, 2);
    await luuXong(p, "lưu thay đổi (không đụng gì, CACH=tratruoc)");
    than[`PUT-1-${kho}`] = layThan(p, "PUT");
  };
  for (const [kho, vp] of KHO) {
    const p = await env.as(ACCOUNTS.salesA, "/order-form", vp);
    await p.waitFor("!!document.getElementById('catalog-q') && !document.getElementById('catalog-q').disabled", "ô tìm danh mục sẵn sàng", 15000);
    await sleep(600);
    await p.ev(setInput("document.getElementById('orderDate')", vnDate(3)));
    if (TRATRUOC) {
      await kichBanTraTruoc(p, kho, vp.mobile);
      assert.deepEqual(p.consoleErrors.filter((e) => !/favicon/.test(e)), [], `lỗi console ${kho}`);
      p.close();
      ok(`thân gửi ${kho} (CACH=tratruoc): POST, lần thu trả trước, tổng máy chủ = tổng trên thanh, PUT-1`);
      continue;
    }
    if (NOI) {
      await kichBanNoi(p, kho, vp.mobile);
      assert.deepEqual(p.consoleErrors.filter((e) => !/favicon/.test(e)), [], `lỗi console ${kho}`);
      p.close();
      ok(`thân gửi ${kho} (CACH=noi): POST, PUT-1, PUT-2 — kiểm thô id điểm / chữ tự do từng ô đạt`);
      continue;
    }
    if (GOLUU) {
      await kichBanGoLuu(p, kho, vp.mobile);
      assert.deepEqual(p.consoleErrors.filter((e) => !/favicon/.test(e)), [], `lỗi console ${kho}`);
      p.close();
      ok(`thân gửi ${kho} (CACH=goluu): POST-A, POST-B, PUT-A — gõ rồi chạm Lưu, không chạm dòng gợi ý; kiểm thô chữ tự do từng ô đạt`);
      continue;
    }
    await chon(p, "TD101", 1);
    if (LUOI) {
      await bamDem(p, 0, "Tăng", "Người lớn", 1); // thẻ mới: 1 người lớn → 2
      await bamDem(p, 0, "Tăng", "Trẻ em", 1);
    } else {
      await p.ev(setInput(demDem(0, "Người lớn"), "2"));
      await p.ev(setInput(demDem(0, "Trẻ em"), "1"));
    }
    await sleep(200);
    await goDonGia(p, "1.300.000");
    await p.ev(`${the(0)}.querySelector('[data-action="them-dua-don"]').click(); true`);
    await p.waitFor(`!!${oNoi(0, 0, "don")}`, "chặng đưa đón");
    await goTuDo(p, vp.mobile, 0, 0, "don", "12 Trần Phú, Nha Trang");
    await p.ev(setInput(`${the(0)}.querySelector('[data-o$=":gio"]')`, "07:30"));
    await chon(p, "phao", 2);
    if (LUOI) await bamDem(p, 1, "Tăng", "Số khách", 6); // 1 → 7
    else await p.ev(setInput(demDem(1, "Số khách"), "7"));
    await chon(p, "TTB06", 3);
    if (GIAI_DOAN === "sau") assert.deepEqual(await p.ev("[...document.querySelectorAll('#services .svc .svc-mo')].map((b) => b.getAttribute('aria-expanded'))"), ["false", "false", "true"], "bản sau: thêm dịch vụ thì thẻ trước gập, thẻ mới mở");
    if (LUOI) await bamDem(p, 2, "Tăng", "Người lớn", 1);
    else await p.ev(setInput(demDem(2, "Người lớn"), "2"));
    await p.ev(setInput("document.getElementById('customerName')", "Khách Thân Gửi"));
    await p.ev(setInput("document.getElementById('customerPhone')", "0912345670"));
    await sleep(300);
    await luuXong(p, "lưu đơn mới");
    than[`POST-${kho}`] = layThan(p, "POST");
    const id = await p.ev("new URLSearchParams(location.search).get('id')");
    // PUT-1: mở lại, không đụng gì
    await moLai(p, id);
    await luuXong(p, "lưu thay đổi (không đụng gì)");
    than[`PUT-1-${kho}`] = layThan(p, "PUT");
    // PUT-2: mở lại, đổi số khách thẻ 2 (Phao chuối) + bỏ trẻ em của thẻ 1
    await moLai(p, id);
    if (GIAI_DOAN === "sau") {
      // Bản sau: nháp "sạch" nạp lại → cả ba thẻ GẬP (thân chỉ ẩn bằng `hidden`); thao tác dưới đây đi vào ô của thẻ đang gập — thân gửi vẫn phải giống bản trước.
      assert.deepEqual(await p.ev("[...document.querySelectorAll('#services .svc .svc-mo')].map((b) => b.getAttribute('aria-expanded'))"), ["false", "false", "false"], "bản sau: ba thẻ của nháp sạch đang gập");
      assert.equal(await p.ev(`${demDem(1, "Số khách")}.getClientRects().length`), 0, "ô số khách của thẻ gập đang ẩn (vẫn trong cây DOM)");
    }
    if (LUOI) {
      await moThe(p, 1); // chạm đầu thẻ Phao chuối (thẻ khác tự gập) — chỉ đổi hiển thị, không đổi bản nháp
      await bamDem(p, 1, "Tăng", "Số khách", 1); // 7 → 8
      await moThe(p, 0);
      await bamDem(p, 0, "Giảm", "Trẻ em", 1); // 1 → 0
    } else {
      await p.ev(setInput(demDem(1, "Số khách"), "8"));
      await p.ev(setInput(demDem(0, "Trẻ em"), "0"));
    }
    await sleep(300);
    await luuXong(p, "lưu thay đổi (đổi số khách)");
    than[`PUT-2-${kho}`] = layThan(p, "PUT");
    for (const k of [`POST-${kho}`, `PUT-1-${kho}`, `PUT-2-${kho}`]) assert.ok(typeof than[k] === "string" && than[k].length > 50, `${k}: không bắt được thân`);
    assert.deepEqual(p.consoleErrors.filter((e) => !/favicon/.test(e)), [], `lỗi console ${kho}`);
    p.close();
    ok(`thân gửi ${kho}: POST, PUT-1, PUT-2`);
  }
  writeFileSync(join(OUT, `${TEN}-${GIAI_DOAN}.json`), JSON.stringify(than, null, 1) + "\n");
  if (GIAI_DOAN === "sau") {
    const truocTep = join(OUT, `${TEN}-truoc.json`);
    assert.ok(existsSync(truocTep), `thiếu ${TEN}-truoc.json (chạy GIAI_DOAN=truoc trên bản trước)`);
    const truoc = JSON.parse(readFileSync(truocTep, "utf8"));
    const khac = Object.keys({ ...truoc, ...than }).filter((k) => truoc[k] !== than[k]);
    if (khac.length) {
      for (const k of khac) console.log(`✗ ${k}\n  trước: ${truoc[k]}\n  sau:   ${than[k]}`);
      process.exitCode = 1;
    } else console.log(`THAN GUI GIONG NHAU (${Object.keys(than).length} thân: ${Object.keys(than).join(", ")})`);
  } else console.log("THAN GUI DA GHI");
} finally {
  await env.stop();
}

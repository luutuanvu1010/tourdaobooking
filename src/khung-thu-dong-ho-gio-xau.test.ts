// HÀNG RÀO «giờ xấu nhất trong ngày» của khung thử điều phối (tests/audit/dong-ho-gio-xau.mjs, nối vào `don()` / `taoChuyen()` của tests/audit/dieu-phoi-khung.mjs).
// Bài này ghim CHÍNH hàng rào đó (Hiến pháp P16: cơ chế kiểm chỉ đáng tin sau khi thấy nó chặn thật), nên nằm trong `npm test` mãi mãi: ai tắt / làm lỏng
// hàng rào thì bài này đỏ.
// VÌ SAO CÓ HÀNG RÀO: bài bật `batDongHo(<giờ thật>)` thì đồng hồ giả ĐỨNG YÊN ở giờ thật lúc bài bắt đầu; mốc tối thiểu 6 giờ của ADR-0049 tính theo đồng hồ đó.
// Gieo chuyến «ngày mai» có giờ đón / bắt đầu trước 06:00 thì xanh cả ngày rồi ĐỎ từ khoảng 23 giờ đêm (13–14/10/2026: năm bài ADR-0113 của tu-choi.test.ts). Với
// ngày cách đồng hồ k ngày và giờ T, khoảng cách nhỏ nhất qua mọi giờ trong ngày = (k − 1) × 24 giờ + T; đỏ ở một giờ nào đó khi giá trị ấy < mốc (+ lề).
// Hàng rào tính con số đó NGAY LÚC GIEO nên bắt được ở mọi giờ chạy, không phải chờ đến đêm.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import {
  DUNG_SAI_GIO_THAT_PHUT, LE_PHUT, MOC_MAC_DINH_PHUT, dongHoHienTai, ghiNhanDongHo, kiemGioTheoDongHo, xoaDongHo,
} from "../tests/audit/dong-ho-gio-xau.mjs";
import { DRIVER, NGAY, SUP, batDongHo, chuyenSan, denGio, don, setup, taoChuyen, vnMs, xe } from "../tests/audit/dieu-phoi-khung.mjs";
import { msToVnLocal } from "./shared/vn-date.ts";

const PHUT = 60_000;
const GIO_THAT = { ms: Date.now(), theoGioThat: true };
const CO_DINH = { ms: vnMs(NGAY, "06:00"), theoGioThat: false };
/** Ngày VN thật + n (khuôn `ngayThat` của tu-choi.test.ts — gọi SAU `batDongHo`). */
const ngayThat = (n: number) => msToVnLocal(Date.now() + n * 86_400_000).date;
/** `kiemGioTheoDongHo` với đồng hồ cho trước; trả thông báo lỗi (null = qua). */
function thu(ngayLech: number, gio: string, v: { dongHo?: any; mocPhut?: number } = {}): string | null {
  const dongHo = v.dongHo ?? GIO_THAT;
  const ngay = msToVnLocal(dongHo.ms + ngayLech * 86_400_000).date;
  try {
    kiemGioTheoDongHo({ nhan: "bài thử", ngay, gio, mocPhut: v.mocPhut ?? MOC_MAC_DINH_PHUT, dongHo });
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

test("hàng rào giờ xấu nhất — công thức: ngày kia luôn qua; ngày mai chỉ từ 06:30 (đúng mốc + lề là qua); hôm nay và quá khứ luôn bị chặn", () => {
  assert.equal(MOC_MAC_DINH_PHUT, 360);
  assert.equal(LE_PHUT, 30);
  assert.equal(thu(2, "00:00"), null, "ngày kia 00:00: cách ≥ 24 giờ ở giờ xấu nhất");
  assert.equal(thu(3, "05:00"), null);
  assert.equal(thu(1, "06:30"), null, "đúng mốc + lề (390 phút) là qua");
  assert.match(thu(1, "06:29") ?? "", /giờ xấu nhất/, "thiếu một phút là chặn");
  assert.match(thu(1, "05:00") ?? "", /giờ xấu nhất/, "ca đã làm đỏ tu-choi.test.ts (13–14/10/2026)");
  assert.match(thu(1, "05:30") ?? "", /giờ xấu nhất/);
  assert.match(thu(0, "13:00") ?? "", /giờ xấu nhất/, "hôm nay: chạy vào buổi tối thì giờ hẹn đã qua");
  assert.match(thu(0, "23:59") ?? "", /giờ xấu nhất/);
  assert.match(thu(-1, "13:00") ?? "", /giờ xấu nhất/, "ngày đã qua");
  assert.equal(thu(1, "14:00"), null, "ca trip_not_planned của tu-choi.test.ts: chuyến 14:00 ngày mai");
});

test("hàng rào giờ xấu nhất — mốc lấy theo chính sách của thế giới thử (240 phút thì ngày mai 04:30 qua, 04:29 chặn)", () => {
  assert.equal(thu(1, "04:30", { mocPhut: 240 }), null);
  assert.match(thu(1, "04:29", { mocPhut: 240 }) ?? "", /giờ xấu nhất/);
  assert.match(thu(1, "08:00", { mocPhut: 1440 }) ?? "", /giờ xấu nhất/, "mốc 24 giờ: ngày mai 08:00 chỉ cách 8 giờ ở giờ xấu nhất");
});

test("hàng rào giờ xấu nhất — đồng hồ CỐ ĐỊNH (batDongHo() không tham số, mốc NOW_GIA) không bị chặn oan, kể cả giờ sớm và ngày gần", () => {
  assert.equal(thu(1, "00:30", { dongHo: CO_DINH }), null);
  assert.equal(thu(0, "04:00", { dongHo: CO_DINH }), null);
  assert.equal(thu(-1, "05:00", { dongHo: CO_DINH }), null);
});

test("hàng rào giờ xấu nhất — thông báo lỗi nói rõ ngày, giờ, k, số phút xấu nhất và cách sửa", () => {
  const m = thu(1, "05:30") ?? "";
  assert.match(m, /bài thử/);
  assert.match(m, /05:30/);
  assert.match(m, /k = 1/);
  assert.match(m, /330 phút/, "(1 − 1) × 24 giờ + 05:30 = 330 phút");
  assert.match(m, /360 phút/);
  assert.match(m, /ngày thật \+ 2/);
  assert.match(m, /06:30/);
});

test("hàng rào giờ xấu nhất — nhận ra đồng hồ theo giờ thật: lệch ≤ 5 phút (bài `tre` 2 phút) là thật, lệch xa là cố định", () => {
  try {
    assert.equal(DUNG_SAI_GIO_THAT_PHUT, 5);
    ghiNhanDongHo(Date.now() - 2 * PHUT);
    assert.equal(dongHoHienTai().theoGioThat, true, "chậm 2 phút vẫn theo giờ thật");
    ghiNhanDongHo(Date.now() + 90 * PHUT);
    assert.equal(dongHoHienTai().theoGioThat, false, "xa 90 phút: không phải giờ thật");
    ghiNhanDongHo(vnMs(NGAY, "06:00"));
    assert.equal(dongHoHienTai().theoGioThat, false, "NOW_GIA 2027-03-11");
    xoaDongHo();
    assert.equal(dongHoHienTai().theoGioThat, true, "chưa ai bật đồng hồ giả = đồng hồ thật");
    assert.ok(Math.abs(dongHoHienTai().ms - Date.now()) < PHUT);
  } finally {
    xoaDongHo();
  }
});

test("hàm tắt của batDongHo() trả hàng rào về đồng hồ thật — đồng hồ cố định của bài trước không dính sang bài sau", () => {
  const tat = batDongHo(); // cố định NOW_GIA
  assert.equal(dongHoHienTai().theoGioThat, false);
  tat();
  assert.equal(dongHoHienTai().theoGioThat, true);
  assert.ok(Math.abs(dongHoHienTai().ms - Date.now()) < PHUT);
});

// ---- Nối dây vào khung: hàng rào PHẢI nằm trên đường `don()` / `taoChuyen()` / `chuyenSan()`, TRƯỚC khi gọi máy chủ ------------------------------------------
test("nối dây: don() — đồng hồ giả = giờ thật, ngày mai, đón 05:30 → ném lỗi giờ xấu nhất, đơn chưa được tạo", async () => {
  const tat = batDongHo(Date.now());
  try {
    const w = setup();
    await assert.rejects(() => don(w, { ngay: ngayThat(1), gio: "05:30" }), /giờ xấu nhất/);
    assert.equal(w.q("SELECT count(*) n FROM orders")[0].n, 0, "chặn TRƯỚC khi gọi máy chủ");
  } finally {
    tat();
  }
});

test("nối dây: taoChuyen() — đồng hồ giả = giờ thật, ngày mai, bắt đầu 05:00 → ném lỗi, chuyến chưa được tạo", async () => {
  const tat = batDongHo(Date.now());
  try {
    const w = setup();
    await assert.rejects(() => taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, ngay: ngayThat(1), bd: "05:00", kt: "07:00" }), /giờ xấu nhất/);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip")[0].n, 0);
  } finally {
    tat();
  }
});

test("nối dây: chuyenSan() — đúng mẫu bản cũ của tu-choi.test.ts (chuyến 05:00, khách đón 05:30, ngày mai) → ném lỗi", async () => {
  const tat = batDongHo(Date.now());
  try {
    const w = setup();
    await assert.rejects(() => chuyenSan(w, { ngay: ngayThat(1), bd: "05:00", kt: "07:00", gio: "05:30" }), /giờ xấu nhất/);
  } finally {
    tat();
  }
});

test("nối dây: mốc đọc từ chính sách của thế giới thử — chính sách 240 phút thì don() ngày mai 04:30 qua hàng rào (máy chủ vẫn xét mốc thật)", async () => {
  const tat = batDongHo(Date.now());
  try {
    const w = setup();
    const p = await w.call("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", {
      as: SUP,
      body: { minLeadMinutes: 240, warnLeadMinutes: 60, restMinutes: 45, requireManifest: true, proxyBackdateMaxMinutes: 90, dutyDayMaxMinutes: 600, tripNoBreakMaxMinutes: 300, departureWindowMinutes: 1440, refuseLeadMinutes: 720, officePhone: null, acceptWaitMinutes: 10, autoConfirmTransfer: true },
    });
    assert.equal(p.status, 201, p.text);
    const d = await don(w, { ngay: ngayThat(1), gio: "04:30" });
    assert.ok(d.id);
    await assert.rejects(() => don(w, { ngay: ngayThat(1), gio: "04:29" }), /giờ xấu nhất/);
  } finally {
    tat();
  }
});

test("nối dây: đồng hồ giả theo giờ thật nhưng ngày kia và đón 05:30 (cách sửa của tu-choi.test.ts) → qua hàng rào, chuyến dựng được", async () => {
  const tat = batDongHo(Date.now());
  try {
    const w = setup();
    const c = await chuyenSan(w, { ngay: ngayThat(2), bd: "05:00", kt: "07:00", gio: "05:30" });
    assert.ok(c.id);
  } finally {
    tat();
  }
});

test("nối dây: đồng hồ cố định ở giờ lẻ + đón 04:00 hôm sau (khuôn nghi-chup-lai.test.ts) → không bị chặn oan", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "21:00"));
  try {
    const w = setup();
    const d = await don(w, { ngay: NGAY, gio: "04:00" });
    assert.ok(d.id, "7 giờ trước giờ đón: máy chủ cho xác nhận, hàng rào im vì đồng hồ cố định");
  } finally {
    tat();
  }
});

test("nối dây: hàng rào nhớ NGÀY GỐC của đồng hồ — sau denGio() tiến xa khỏi giờ thật vẫn còn bật (gieo chuyến 05:00 ngày mai vẫn bị chặn)", async () => {
  const tat = batDongHo(Date.now());
  try {
    const w = setup();
    const ngay = ngayThat(1);
    denGio("00:05", ngay);
    await assert.rejects(() => chuyenSan(w, { ngay, bd: "05:00", kt: "07:00", gio: "05:30" }), /giờ xấu nhất/);
  } finally {
    tat();
  }
});

test("nối dây: bài đưa đồng hồ giả tiến bằng denGio() rồi gieo thêm trong ngày chạy — k tính từ NGÀY GỐC của đồng hồ, không phải từ giờ vừa tiến tới (không đỏ oan)", async () => {
  const tat = batDongHo(Date.now());
  try {
    const w = setup();
    const ngay = ngayThat(2);
    denGio("00:05", ngay);
    const d = await don(w, { ngay, gio: "13:00" });
    assert.ok(d.id, "tiến tới 00:05 ngày chạy rồi gieo đơn 13:00 cùng ngày: hàng rào không được coi là «hôm nay»");
  } finally {
    tat();
  }
});

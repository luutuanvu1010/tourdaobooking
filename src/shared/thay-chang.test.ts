// Luật ghép "Đổi sang chặng khác" (C14) — thay-chang.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LY_DO_THAY_CHANG, cauChanMoc, ghepThayChang, laLyDoThayChang, lenhChanMoc, xetMocLenh } from "./thay-chang.ts";
import { vnLocalToMs } from "./vn-date.ts";
import type { LyDoDongChang } from "./chang-dua-don.ts";

type Chieu = "OUT" | "RETURN";
const bo = (ten: string, direction: Chieu, lyDo: LyDoDongChang = "REPLACED") => ({ ten, leg: { direction }, lyDo });
const moi = (ten: string, direction: Chieu) => ({ ten, direction });
const tenCua = (k: { thay: { bo: { ten: string }; moi: { ten: string } }[]; boLe: { ten: string }[]; moiLe: { ten: string }[] }) => ({
  thay: k.thay.map((c) => `${c.bo.ten}>${c.moi.ten}`),
  boLe: k.boLe.map((b) => b.ten),
  moiLe: k.moiLe.map((m) => m.ten),
});

test("đúng một bỏ (REPLACED) ↔ một thêm cùng chiều → một cặp thay; không còn lệnh rời", () => {
  assert.deepEqual(tenCua(ghepThayChang([bo("b1", "OUT")], [moi("m1", "OUT")])), { thay: ["b1>m1"], boLe: [], moiLe: [] });
});

test("mỗi chiều xét riêng: đi và về đều có cặp → hai cặp; thứ tự theo danh sách bỏ", () => {
  assert.deepEqual(tenCua(ghepThayChang([bo("bv", "RETURN"), bo("bd", "OUT")], [moi("md", "OUT"), moi("mv", "RETURN")])), { thay: ["bv>mv", "bd>md"], boLe: [], moiLe: [] });
});

test("lý do 'Nhập nhầm' (WRONG_ENTRY) cũng ghép — lệnh thay mang đúng lý do đó; 'Không cần nữa' (NOT_NEEDED) → giữ lệnh rời", () => {
  const k = ghepThayChang([bo("b1", "OUT", "WRONG_ENTRY")], [moi("m1", "OUT")]);
  assert.deepEqual(tenCua(k), { thay: ["b1>m1"], boLe: [], moiLe: [] });
  assert.equal(k.thay[0]!.bo.lyDo, "WRONG_ENTRY");
  assert.deepEqual(tenCua(ghepThayChang([bo("b1", "OUT", "NOT_NEEDED")], [moi("m1", "OUT")])), { thay: [], boLe: ["b1"], moiLe: ["m1"] });
});

test("laLyDoThayChang: đúng hai mã REPLACED, WRONG_ENTRY (một nguồn cho máy chủ và giao diện)", () => {
  assert.deepEqual([...LY_DO_THAY_CHANG], ["REPLACED", "WRONG_ENTRY"]);
  for (const v of ["REPLACED", "WRONG_ENTRY"]) assert.equal(laLyDoThayChang(v), true, v);
  for (const v of ["NOT_NEEDED", "replaced", "", null, undefined, 1, "toString"]) assert.equal(laLyDoThayChang(v), false, String(v));
});

test("không xác định chắc → giữ rời: bỏ hai thêm một, bỏ một thêm hai, hai bỏ cùng chiều mà chỉ một REPLACED, khác chiều", () => {
  assert.deepEqual(tenCua(ghepThayChang([bo("b1", "OUT"), bo("b2", "OUT")], [moi("m1", "OUT")])), { thay: [], boLe: ["b1", "b2"], moiLe: ["m1"] });
  assert.deepEqual(tenCua(ghepThayChang([bo("b1", "OUT")], [moi("m1", "OUT"), moi("m2", "OUT")])), { thay: [], boLe: ["b1"], moiLe: ["m1", "m2"] });
  assert.deepEqual(tenCua(ghepThayChang([bo("b1", "OUT"), bo("b2", "OUT", "NOT_NEEDED")], [moi("m1", "OUT")])), { thay: [], boLe: ["b1", "b2"], moiLe: ["m1"] });
  assert.deepEqual(tenCua(ghepThayChang([bo("b1", "OUT")], [moi("m1", "RETURN")])), { thay: [], boLe: ["b1"], moiLe: ["m1"] });
});

test("một chiều ghép được, chiều kia không → chỉ ghép chiều đủ điều kiện; phần còn lại giữ nguyên thứ tự", () => {
  const k = ghepThayChang([bo("bd", "OUT"), bo("bv1", "RETURN"), bo("bv2", "RETURN")], [moi("mv", "RETURN"), moi("md", "OUT")]);
  assert.deepEqual(tenCua(k), { thay: ["bd>md"], boLe: ["bv1", "bv2"], moiLe: ["mv"] });
});

test("không bỏ / không thêm → rỗng; chỉ thêm → giữ rời", () => {
  assert.deepEqual(tenCua(ghepThayChang([], [])), { thay: [], boLe: [], moiLe: [] });
  assert.deepEqual(tenCua(ghepThayChang([], [moi("m1", "OUT")])), { thay: [], boLe: [], moiLe: ["m1"] });
});

// ---- Kiểm mốc CẢ kế hoạch trước lệnh đầu (bảng Sửa đưa đón, người không có ô đặt gấp — người điều phối quyết 2026-10-08) ----------------------------------

const NGAY = "2027-03-11";
const BAY_GIO = vnLocalToMs(NGAY, "08:00")!;
/** Chặng đang lưu (LegDto rút gọn) và thân gửi (LegInput rút gọn) — chữ tự do, trả ở điểm danh mục. */
const luu = (gio: string | null, noi = "Khách sạn A") => ({ pickupDate: NGAY, pickupTime: gio, pickupLocationId: null, pickupPlace: noi, dropoffLocationId: "loc-ben", dropoffPlace: null });
const gui = (gio: string, noi = "Khách sạn A", ngay = NGAY) => ({ pickupDate: ngay, pickupTime: gio, pickupLocationId: null, pickupPlace: noi, dropoffLocationId: "loc-ben", dropoffPlace: "" });

test("xetMocLenh: thêm → (null, mới; ngày trống = ngày đi, giờ trống = chưa chốt); thay → (cũ, mới); sửa → (cũ, mới) trừ khi chỉ đổi ô phụ → null; bỏ → null", () => {
  assert.deepEqual(xetMocLenh({ loai: "them", moi: gui("13:00", "Khách sạn A", "") }, NGAY), { cu: null, moi: { pickupDate: NGAY, pickupTime: "13:00" } });
  assert.deepEqual(xetMocLenh({ loai: "them", moi: gui("") }, NGAY), { cu: null, moi: { pickupDate: NGAY, pickupTime: null } });
  assert.deepEqual(xetMocLenh({ loai: "thay", cu: luu("13:00"), moi: gui("16:00") }, NGAY), { cu: { pickupDate: NGAY, pickupTime: "13:00" }, moi: { pickupDate: NGAY, pickupTime: "16:00" } });
  assert.deepEqual(xetMocLenh({ loai: "sua", cu: luu("13:00"), moi: gui("13:00", "Khách sạn B") }, NGAY), { cu: { pickupDate: NGAY, pickupTime: "13:00" }, moi: { pickupDate: NGAY, pickupTime: "13:00" } });
  // Chỉ đổi ô phụ (số hiệu, số người về…): ngày, giờ, nơi y nguyên — máy chủ không xét mốc (chiDoiOPhu). Chữ tự do khác khoảng trắng vẫn là "y nguyên" (cleanText).
  assert.equal(xetMocLenh({ loai: "sua", cu: luu("13:00"), moi: gui("13:00") }, NGAY), null);
  assert.equal(xetMocLenh({ loai: "sua", cu: luu("13:00"), moi: gui("13:00", "  Khách   sạn A ") }, NGAY), null);
  assert.equal(xetMocLenh({ loai: "bo" }, NGAY), null);
});

test("lenhChanMoc: chỉ lệnh máy chủ CHẮC CHẮN chặn — thêm dưới mốc, sửa / thay mà cũ HOẶC mới dưới mốc; sửa chỉ ô phụ, bỏ chặng, chưa chốt giờ, trên mốc thì không", () => {
  const ds = [
    { nhan: "thêm dưới mốc", xet: xetMocLenh({ loai: "them", moi: gui("13:00") }, NGAY) },
    { nhan: "sửa dời ra xa", xet: xetMocLenh({ loai: "sua", cu: luu("13:00"), moi: gui("16:00") }, NGAY) },
    { nhan: "sửa ô phụ", xet: xetMocLenh({ loai: "sua", cu: luu("13:00"), moi: gui("13:00") }, NGAY) },
    { nhan: "thay trên mốc", xet: xetMocLenh({ loai: "thay", cu: luu("16:00"), moi: gui("17:00") }, NGAY) },
    { nhan: "thay cũ dưới mốc", xet: xetMocLenh({ loai: "thay", cu: luu("13:00"), moi: gui("17:00") }, NGAY) },
    { nhan: "thêm chưa chốt giờ", xet: xetMocLenh({ loai: "them", moi: gui("") }, NGAY) },
    { nhan: "bỏ", xet: xetMocLenh({ loai: "bo" }, NGAY) },
  ];
  assert.deepEqual(lenhChanMoc(ds, 360, BAY_GIO).map((l) => l.nhan), ["thêm dưới mốc", "sửa dời ra xa", "thay cũ dưới mốc"]);
  assert.deepEqual(lenhChanMoc(ds, 360, vnLocalToMs(NGAY, "06:00")!).map((l) => l.nhan), [], "06:00: 13:00 còn 7 giờ — mọi lệnh trên mốc");
});

test("cauChanMoc: một câu tiếng Việt, tên chặng không lặp, số giờ theo mốc thật", () => {
  assert.equal(cauChanMoc(["Chiều đi · Tour đảo"], 360), "Lượt Chiều đi · Tour đảo đã qua hạn chốt (6 giờ trước giờ đón) — cần đặt gấp; chưa lưu gì.");
  assert.equal(cauChanMoc(["Chiều đi · Tour đảo", "Chiều đi · Tour đảo", "Chiều về · Tour đảo"], 390), "Lượt Chiều đi · Tour đảo, Chiều về · Tour đảo đã qua hạn chốt (6 giờ 30 phút trước giờ đón) — cần đặt gấp; chưa lưu gì.");
});

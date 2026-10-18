// Danh sách gợi ý của ô "Nơi đón" / "Nơi trả" bản MỘT ô (Tạo đơn thiết kế lại 18/10/2026, việc 7): điểm danh mục khớp chữ gõ (thứ tự và luật lọc của ô tìm điểm cũ — `locDiem`),
// dòng "Chưa chốt" đầu danh sách khi được hỏi (ô Nơi trả đang có giá trị), dòng cuối LUÔN là gõ tự do.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chuLuuKhiDong, dongTuDo, goiYNoi, NHAN_GO_TU_DO } from "./goi-y-noi.ts";

const ds = [
  { id: "a", nhan: "Khách sạn Mường Thanh Luxury Nha Trang · khách sạn" },
  { id: "b", nhan: "Sân bay Cam Ranh · sân bay" },
  { id: "c", nhan: "Ga cáp treo Vinpearl · ga cáp treo" },
  { id: "d", nhan: "Văn phòng Trần Phú · văn phòng" },
];
const tom = (r: ReturnType<typeof goiYNoi>) => r.map((d) => (d.loai === "diem" ? d.id : d.loai === "tu-do" ? `tu-do:${d.chu}` : "chua-chot"));

test("ô trống: mọi điểm theo đúng thứ tự danh mục, dòng cuối 'Gõ tự do…' (chữ rỗng)", () => {
  const r = goiYNoi(ds, "", { coChuaChot: false });
  assert.deepEqual(tom(r), ["a", "b", "c", "d", "tu-do:"]);
  assert.equal(r.at(-1)!.nhan, "Gõ tự do…");
  assert.equal(NHAN_GO_TU_DO, "Gõ tự do…");
});

test("có chữ: chỉ điểm khớp (bỏ dấu, không phân biệt hoa thường — luật ô tìm điểm cũ), dòng cuối 'Gõ tự do: “…”' mang đúng chữ đã gõ", () => {
  const r = goiYNoi(ds, "muong", { coChuaChot: false });
  assert.deepEqual(tom(r), ["a", "tu-do:muong"]);
  assert.equal(r.at(-1)!.nhan, "Gõ tự do: “muong”");
  assert.deepEqual(tom(goiYNoi(ds, "SAN BAY", { coChuaChot: false })), ["b", "tu-do:SAN BAY"]);
  assert.deepEqual(tom(goiYNoi(ds, "  tran   phu ", { coChuaChot: false })), ["d", "tu-do:tran   phu"]);
});

test("nhiều điểm khớp giữ thứ tự danh mục; không khớp gì → chỉ còn dòng gõ tự do", () => {
  assert.deepEqual(tom(goiYNoi(ds, "a", { coChuaChot: false })).slice(0, -1), ["a", "b", "c", "d"]);
  assert.deepEqual(tom(goiYNoi(ds, "12 Trần Phú, Nha Trang", { coChuaChot: false })), ["tu-do:12 Trần Phú, Nha Trang"]);
});

test("chữ gõ tự do: bỏ khoảng trắng hai đầu (thân gửi vẫn cắt như cũ); chỉ dấu cách = chưa gõ", () => {
  const r = goiYNoi(ds, "  15 Trần Phú  ", { coChuaChot: false });
  assert.deepEqual(r.at(-1), { loai: "tu-do", chu: "15 Trần Phú", nhan: "Gõ tự do: “15 Trần Phú”" });
  assert.deepEqual(goiYNoi(ds, "   ", { coChuaChot: false }).at(-1), { loai: "tu-do", chu: "", nhan: "Gõ tự do…" });
});

test("điểm danh mục: tên và loại điểm tách từ nhãn '<tên> · <loại>' (hiện 'tên · loại'), nhãn đầy đủ giữ nguyên", () => {
  const [d] = goiYNoi(ds, "cam ranh", { coChuaChot: false });
  assert.deepEqual(d, { loai: "diem", id: "b", ten: "Sân bay Cam Ranh", loaiDiem: "sân bay", nhan: "Sân bay Cam Ranh · sân bay" });
  const [x] = goiYNoi([{ id: "x", nhan: "Điểm không loại" }], "", { coChuaChot: false });
  assert.deepEqual(x, { loai: "diem", id: "x", ten: "Điểm không loại", loaiDiem: "", nhan: "Điểm không loại" });
});

// Vòng sửa 1 của việc 7 (người kiểm I-1, chủ chọn phương án A): rời ô (chạm ra ngoài, chạm ô / nút khác, Tab, "Xong" của bàn phím iPhone, Enter khi chưa trỏ dòng nào) mà đã GÕ chữ
// thì chữ đó được giữ thành địa chỉ gõ tự do — như ô "Địa chỉ đón" cũ ghi từng phím. Esc là HUỶ có chủ đích.
test("chuLuuKhiDong: rời ô sau khi gõ → giữ chữ (bỏ khoảng trắng hai đầu) thành gõ tự do", () => {
  assert.equal(chuLuuKhiDong({ cach: "roi", daGo: true, chu: "  12 Trần Phú, Nha Trang ", hienThi: "" }), "12 Trần Phú, Nha Trang");
  // đang là điểm danh mục (ô hiện nhãn điểm) mà gõ chữ khác → chữ gõ thắng (không lưu lặng lẽ điểm cũ)
  assert.equal(chuLuuKhiDong({ cach: "roi", daGo: true, chu: "Bãi Dài", hienThi: "Bến cảng Vinpearl · bến cảng" }), "Bãi Dài");
  // đang là chữ tự do, sửa thành chữ khác
  assert.equal(chuLuuKhiDong({ cach: "roi", daGo: true, chu: "15 Trần Phú", hienThi: "12 Trần Phú" }), "15 Trần Phú");
});

test("chuLuuKhiDong: Esc huỷ; chưa gõ gì; chỉ dấu cách; chữ trùng giá trị đang có → không lưu gì (giữ giá trị cũ)", () => {
  assert.equal(chuLuuKhiDong({ cach: "huy", daGo: true, chu: "12 Trần Phú", hienThi: "" }), null, "Esc là huỷ có chủ đích");
  assert.equal(chuLuuKhiDong({ cach: "roi", daGo: false, chu: "", hienThi: "Quầy vé 03 · quầy vé" }), null, "mở ô rồi rời đi, không gõ");
  assert.equal(chuLuuKhiDong({ cach: "roi", daGo: false, chu: "12 Trần Phú", hienThi: "12 Trần Phú" }), null, "chữ tự do đang có, không gõ thêm");
  assert.equal(chuLuuKhiDong({ cach: "roi", daGo: true, chu: "   ", hienThi: "Quầy vé 03 · quầy vé" }), null, "chỉ dấu cách = chưa gõ");
  assert.equal(chuLuuKhiDong({ cach: "roi", daGo: true, chu: " 12 Trần Phú ", hienThi: "12 Trần Phú" }), null, "trùng chữ đang có (sau khi cắt) → không ghi lại");
});

test("dongTuDo: dòng gõ tự do (cùng dòng cuối của danh sách gợi ý) — chữ đã cắt, nhãn 'Gõ tự do: “…”'", () => {
  assert.deepEqual(dongTuDo("  Bãi Dài "), { loai: "tu-do", chu: "Bãi Dài", nhan: "Gõ tự do: “Bãi Dài”" });
  assert.deepEqual(dongTuDo(""), { loai: "tu-do", chu: "", nhan: "Gõ tự do…" });
  assert.deepEqual(goiYNoi(ds, "Bãi Dài", { coChuaChot: false }).at(-1), dongTuDo("Bãi Dài"));
});

test("coChuaChot (ô Nơi trả đang có giá trị): dòng 'Chưa chốt' ĐẦU danh sách, kể cả khi đang gõ; dòng cuối vẫn là gõ tự do", () => {
  assert.deepEqual(tom(goiYNoi(ds, "", { coChuaChot: true })), ["chua-chot", "a", "b", "c", "d", "tu-do:"]);
  assert.deepEqual(tom(goiYNoi(ds, "vinpearl", { coChuaChot: true })), ["chua-chot", "c", "tu-do:vinpearl"]);
  assert.equal(goiYNoi(ds, "", { coChuaChot: true })[0]!.nhan, "Chưa chốt");
});

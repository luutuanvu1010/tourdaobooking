// Danh sách gợi ý của ô "Nơi đón" / "Nơi trả" bản MỘT ô (Tạo đơn thiết kế lại 18/10/2026, việc 7): điểm danh mục khớp chữ gõ (thứ tự và luật lọc của ô tìm điểm cũ — `locDiem`),
// dòng "Chưa chốt" đầu danh sách khi được hỏi (ô Nơi trả đang có giá trị), dòng cuối LUÔN là gõ tự do.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cachDungLaiHen, chuLuuKhiDong, dongTuDo, goiYNoi, NHAN_GO_TU_DO } from "./goi-y-noi.ts";

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

// Vòng sửa 2 của việc 7 (người kiểm lại: I-1 còn mở): gõ ở ô nơi rồi chạm NGAY ô Giờ đón / Ngày đón — lần dựng lại khối đã hẹn không được thay phần tử đang nhận thao tác (bộ chọn
// ngày / giờ của máy gắn với chính phần tử đó; ô gõ chữ đang có bàn phím), cũng không được thay phần tử mà lần dựng lại không trả tiêu điểm về được (không `data-o` / `data-gap`).
const tieuDiem = (the: string, kieu = "", coKhoaTraVe = true, trongKhoi = true) => ({ trongKhoi, the, kieu, coKhoaTraVe });
test("cachDungLaiHen: tiêu điểm ngoài khối / không có → dựng lại ngay", () => {
  assert.equal(cachDungLaiHen(null), "ngay");
  assert.equal(cachDungLaiHen(tieuDiem("BODY", "", false, false)), "ngay", "rời hẳn khối (chạm vùng trống, ô khách)");
  assert.equal(cachDungLaiHen(tieuDiem("BUTTON", "submit", false, false)), "ngay", "nút Lưu ngoài khối");
  assert.equal(cachDungLaiHen(tieuDiem("INPUT", "time", true, false)), "ngay", "ô giờ của thẻ dịch vụ khác (khối khác)");
});
test("cachDungLaiHen: ô ngày / giờ / ô gõ chữ / ô chọn trong khối → CHỜ tiêu điểm rời nó (dù có khoá trả tiêu điểm)", () => {
  for (const kieu of ["time", "date", "text", "search", "number", "tel", "email", "url", "datetime-local", ""]) {
    assert.equal(cachDungLaiHen(tieuDiem("INPUT", kieu)), "cho", `input type=${kieu || "(trống)"}`);
  }
  assert.equal(cachDungLaiHen(tieuDiem("input", "TIME")), "cho", "không phân biệt hoa thường");
  assert.equal(cachDungLaiHen(tieuDiem("SELECT")), "cho");
  assert.equal(cachDungLaiHen(tieuDiem("TEXTAREA")), "cho");
});
test("cachDungLaiHen: phần tử xong ở cú bấm VÀ lần dựng lại trả tiêu điểm về được → dựng ngay; không trả về được → chờ", () => {
  assert.equal(cachDungLaiHen(tieuDiem("DIV")), "ngay", "đầu chặng (tabindex -1, data-o …:dau)");
  assert.equal(cachDungLaiHen(tieuDiem("BUTTON", "button")), "ngay", "nút 'Thêm chi tiết' (data-gap), công tắc Xe riêng (data-o)");
  for (const kieu of ["checkbox", "radio", "button", "submit", "reset", "image"]) assert.equal(cachDungLaiHen(tieuDiem("INPUT", kieu)), "ngay", `input type=${kieu} có khoá`);
  assert.equal(cachDungLaiHen(tieuDiem("BUTTON", "button", false)), "cho", "nút 'Đón khác ngày' / dòng tóm tắt / 'Bỏ chặng' (không khoá): dựng lại sẽ làm rơi tiêu điểm");
  assert.equal(cachDungLaiHen(tieuDiem("INPUT", "radio", false)), "cho");
  assert.equal(cachDungLaiHen(tieuDiem("DIV", "", false)), "cho");
});

test("coChuaChot (ô Nơi trả đang có giá trị): dòng 'Chưa chốt' ĐẦU danh sách, kể cả khi đang gõ; dòng cuối vẫn là gõ tự do", () => {
  assert.deepEqual(tom(goiYNoi(ds, "", { coChuaChot: true })), ["chua-chot", "a", "b", "c", "d", "tu-do:"]);
  assert.deepEqual(tom(goiYNoi(ds, "vinpearl", { coChuaChot: true })), ["chua-chot", "c", "tu-do:vinpearl"]);
  assert.equal(goiYNoi(ds, "", { coChuaChot: true })[0]!.nhan, "Chưa chốt");
});

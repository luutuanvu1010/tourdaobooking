// Luật thuần "văn phòng sửa số khách sau xác nhận" (ADR-0063 D1, chủ duyệt 2026-10-08): mã lý do đóng (ADR-0023 điều 4), bộ đọc thân, ai thấy nút, câu tổng âm.
// Bài route thật (quyền, thứ tự từ chối, nhật ký, tin): src/modules/orders/so-khach-van-phong-route.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CAU_GIAM_GIA_VUOT, CAU_KHUYEN_MAI_KHI_BOT_KHACH, LY_DO_SUA_SO_KHACH, MA_LY_DO_SUA_SO_KHACH, canhBaoGiamGiaVuot, canhBaoKhuyenMai, docThanSuaSoKhach, duocSuaSoKhachVanPhong,
  nguonBangSuaSoKhach, soKhachTraTien, thanSuaSoKhach,
} from "./so-khach-van-phong.ts";
import { EDIT_REASON_QUICK } from "./viec-cua-toi.ts";
import { PERMISSION_CODES, type PermissionCode } from "./permissions.ts";

test("lý do: đúng bốn mã của ADR-0023 điều 4, nhãn tiếng Việt cố định, 'Khác' không kèm ô chữ", () => {
  assert.deepEqual(MA_LY_DO_SUA_SO_KHACH, ["THEM_NGUOI", "BOT_NGUOI", "DOI_DICH_VU", "KHAC"]);
  assert.deepEqual(Object.values(LY_DO_SUA_SO_KHACH), ["Khách thêm người", "Khách bớt người", "Đổi dịch vụ", "Khác"]);
  for (const nhan of Object.values(LY_DO_SUA_SO_KHACH)) assert.doesNotMatch(nhan, /\d/, "nhãn không chứa chữ số");
});

test("lý do: ba nút chọn nhanh của hướng dẫn viên (EDIT_REASON_QUICK) trùng chữ ba mã đầu — một bộ chữ, khi HDV đổi sang mã thì chữ không đổi", () => {
  assert.deepEqual([...EDIT_REASON_QUICK], MA_LY_DO_SUA_SO_KHACH.slice(0, 3).map((m) => LY_DO_SUA_SO_KHACH[m]));
});

const SV = [{ id: "s1", pax: { adult: 2, child: 0, senior: 0, infant: 0 } }];

test("đọc thân: mã hợp lệ → nhãn cố định do máy chủ chọn + danh sách dịch vụ đi tiếp nguyên dạng", () => {
  for (const ma of MA_LY_DO_SUA_SO_KHACH) {
    const r = docThanSuaSoKhach({ lyDo: ma, services: SV });
    assert.ok(r.ok, ma);
    assert.equal(r.ma, ma);
    assert.equal(r.nhan, LY_DO_SUA_SO_KHACH[ma]);
    assert.equal(r.services, SV);
  }
});

test("đọc thân: thiếu mã / mã lạ / mã không phải chuỗi / mã là khoá kế thừa của Object → 400 kèm câu tiếng Việt", () => {
  const sai: unknown[] = [undefined, "", "khac", "OTHER", 3, null, "toString", "__proto__", "constructor"];
  for (const lyDo of sai) {
    const r = docThanSuaSoKhach(lyDo === undefined ? { services: SV } : { lyDo, services: SV });
    assert.equal(r.ok, false, String(lyDo));
    if (!r.ok) assert.match(r.message, /[À-ỹ]/);
  }
});

test("đọc thân: có trường chữ lý do tự gõ (reason, ghiChu, note…) hay trường lạ (kể cả số tiền) → 400, không bao giờ đi tiếp", () => {
  for (const them of [{ reason: "Khách báo thêm" }, { ghiChu: "gọi 0905123456" }, { note: "x" }, { lyDoKhac: "y" }, { subtotal: 1 }, { total: 0 }, { subtotalAfter: 5 }]) {
    const r = docThanSuaSoKhach({ lyDo: "KHAC", services: SV, ...them });
    assert.equal(r.ok, false, JSON.stringify(them));
  }
  assert.equal(docThanSuaSoKhach(null).ok, false);
});

const NGUOI_LAP = "u-lap";
const KHAC = "u-khac";
const don = (o: Partial<{ staffId: string; status: "draft" | "confirmed" | "cancelled"; deliveredAt: string | null }> = {}) => ({
  staffId: NGUOI_LAP, status: "confirmed" as const, deliveredAt: null, ...o,
});
const ai = (id: string, ...permissions: PermissionCode[]) => ({ id, permissions });

test("ai thấy nút: Bán hàng đơn MÌNH lập; Kế toán, Quản trị, Toàn quyền mọi đơn; HDV, Đối tác, Thực tập, Tài xế, Nhân sự không — KHÔNG có nhánh 'đang phụ trách'", () => {
  assert.equal(duocSuaSoKhachVanPhong(ai(NGUOI_LAP, "SALES"), don()), true);
  assert.equal(duocSuaSoKhachVanPhong(ai(KHAC, "SALES"), don()), false);
  // Tài khoản lai Bán hàng + HDV: kể cả đang phụ trách đơn người khác lập, hàm không có tham số "đang phụ trách" nên vẫn KHÔNG.
  assert.equal(duocSuaSoKhachVanPhong(ai(KHAC, "SALES", "FIELD"), don()), false);
  for (const p of ["ACCOUNTING", "ADMIN", "SUPER_ADMIN"] as const) assert.equal(duocSuaSoKhachVanPhong(ai(KHAC, p), don()), true, p);
  const khong = PERMISSION_CODES.filter((p) => !["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"].includes(p));
  assert.deepEqual([...khong].sort(), ["DRIVER", "DRIVER_PARTNER", "FIELD", "HR", "INTERN", "PARTNER"]);
  for (const p of khong) assert.equal(duocSuaSoKhachVanPhong(ai(NGUOI_LAP, p), don()), false, `${p} (kể cả là người lập)`);
});

test("ai thấy nút: chỉ đơn ĐÃ XÁC NHẬN, chưa 'Đã giao' (sau ngày đi vẫn thấy — văn phòng không bị chặn theo ngày)", () => {
  const ktoan = ai(KHAC, "ACCOUNTING");
  assert.equal(duocSuaSoKhachVanPhong(ktoan, don({ status: "draft" })), false);
  assert.equal(duocSuaSoKhachVanPhong(ktoan, don({ status: "cancelled" })), false);
  assert.equal(duocSuaSoKhachVanPhong(ktoan, don({ deliveredAt: "2026-10-08T00:00:00.000Z" })), false);
  assert.equal(duocSuaSoKhachVanPhong(ktoan, don()), true);
});

test("giảm giá vượt tạm tính (ADR-0109 QĐ3): chỉ cảnh báo, điều kiện giảm giá > tạm tính HIỆN HÀNH (so nghiêm, kể cả tạm tính 0); bằng hoặc nhỏ hơn → không có câu", () => {
  assert.equal(canhBaoGiamGiaVuot({ subtotal: 500000, discount: 800000 }), CAU_GIAM_GIA_VUOT);
  assert.equal(canhBaoGiamGiaVuot({ subtotal: 0, discount: 800000 }), CAU_GIAM_GIA_VUOT, "tạm tính về 0 (vd chỉ còn em bé giá 0)");
  assert.equal(canhBaoGiamGiaVuot({ subtotal: 500000, discount: 500001 }), CAU_GIAM_GIA_VUOT);
  assert.equal(canhBaoGiamGiaVuot({ subtotal: 500000, discount: 500000 }), null, "bằng nhau: phải thu 0 nhưng không có phần giảm giá vượt");
  assert.equal(canhBaoGiamGiaVuot({ subtotal: 500000, discount: 0 }), null);
  assert.equal(canhBaoGiamGiaVuot({ subtotal: 0, discount: 0 }), null);
  assert.match(CAU_GIAM_GIA_VUOT, /Kế toán/);
  assert.match(CAU_GIAM_GIA_VUOT, /hoàn/);
  assert.doesNotMatch(CAU_GIAM_GIA_VUOT, /\d/, "câu cố định, không số tiền");
  // Phiếu phản biện ADR-0109 (tiền đề sai 3): câu còn hiện sau khi đã hoàn / Đã giao / Hoàn thành ⇒ không được khẳng định "toàn bộ tiền đã trả thành tiền trả dư".
  assert.doesNotMatch(CAU_GIAM_GIA_VUOT, /Toàn bộ tiền khách đã trả/);
  assert.match(CAU_GIAM_GIA_VUOT, /nếu chưa hoàn/);
});

// ---- ADR-0114 D1: nhắc khuyến mại khi bớt khách (chỉ cảnh báo; tính từ trạng thái hiện hành, không lưu cờ) ----------------------------------------------

test("D1: ví dụ của chủ — 10 khách giảm giá còn 2 khách mà giảm giá vẫn giữ ⇒ nhắc; giảm giá 0, khách y nguyên hoặc tăng ⇒ không nhắc; 10 → 2 → 3 vẫn nhắc", () => {
  const co = { giamGiaHieuLuc: 50000 };
  assert.equal(canhBaoKhuyenMai(co, 10, 2), CAU_KHUYEN_MAI_KHI_BOT_KHACH);
  assert.equal(canhBaoKhuyenMai(co, 10, 3), CAU_KHUYEN_MAI_KHI_BOT_KHACH, "10 → 2 → 3: so với lúc xác nhận, không so với lần sửa trước");
  assert.equal(canhBaoKhuyenMai(co, 10, 9), CAU_KHUYEN_MAI_KHI_BOT_KHACH, "chỉ bớt một người cũng nhắc");
  assert.equal(canhBaoKhuyenMai({ giamGiaHieuLuc: 0 }, 10, 2), null, "không có giảm giá thì không có khuyến mại để nhắc");
  assert.equal(canhBaoKhuyenMai(co, 10, 10), null, "đủ lại số lúc xác nhận");
  assert.equal(canhBaoKhuyenMai(co, 10, 12), null, "tăng khách");
});

// "Đơn có giảm giá" hỏi bằng GIẢM GIÁ HIỆU LỰC (số do `effectiveMoney` trả, ADR-0109) — hàm này không tự so/trừ `discount`, nên hàng rào H1 (`phai-thu-mot-ham.test.ts`) không
// phải mở thêm mục cho phép. Hệ quả ở biên: tạm tính hiện hành về 0 ⇒ giảm giá hiệu lực 0 ⇒ KHÔNG nhắc khuyến mại (giảm giá đã không còn trừ được đồng nào; khi đó đã có
// câu `canhBaoGiamGiaVuot`, bài ngay trên). Ghi lệch nhỏ so với chữ "đơn có giảm giá" của ADR-0114 D1 trong báo cáo cuối việc để chủ biết.
test("D1: biên — tạm tính hiện hành về 0 thì giảm giá hiệu lực về 0, không nhắc khuyến mại (đã có cảnh báo giảm giá vượt)", () => {
  assert.equal(canhBaoKhuyenMai({ giamGiaHieuLuc: 0 }, 10, 1), null);
  assert.equal(canhBaoKhuyenMai({ giamGiaHieuLuc: 1 }, 10, 1), CAU_KHUYEN_MAI_KHI_BOT_KHACH, "giảm giá hiệu lực còn một đồng vẫn là có giảm giá");
});

test("D1: câu nhắc đúng nguyên văn ADR-0114, KHÔNG có chữ số; khác hẳn câu cảnh báo giảm giá vượt (hai câu độc lập)", () => {
  assert.equal(CAU_KHUYEN_MAI_KHI_BOT_KHACH, "Đơn có giảm giá nhưng số khách đã giảm so với lúc xác nhận, giảm giá vẫn giữ nguyên. Kế toán xem lại khuyến mại.");
  assert.doesNotMatch(CAU_KHUYEN_MAI_KHI_BOT_KHACH, /\d/);
  assert.notEqual(CAU_KHUYEN_MAI_KHI_BOT_KHACH, CAU_GIAM_GIA_VUOT);
});

test("D1: số khách trả tiền = người lớn + trẻ em + người cao tuổi, cộng MỌI dịch vụ; em bé không tính", () => {
  const pax = (adult: number, child: number, senior: number, infant: number) => ({ pax: { adult, child, senior, infant } });
  assert.equal(soKhachTraTien([pax(5, 3, 1, 4), pax(2, 0, 0, 1)]), 11);
  assert.equal(soKhachTraTien([pax(0, 0, 0, 3)]), 0, "chỉ em bé");
  assert.equal(soKhachTraTien([]), 0);
});

// ---- Bảng "Sửa số khách dịch vụ" trên trang đơn (web/sheet-so-khach.ts): nguồn dòng + thân gửi đi — luật thuần để bài khoá được không cần trình duyệt.
const P = (adult: number, child = 0, senior = 0, infant = 0) => ({ adult, child, senior, infant });
const DV_TOUR = { id: "s-tour", catalogCode: "ZA1", pax: P(2, 1) };
const DV_TAY = { id: "s-tay", catalogCode: null, pax: P(0) };
const DV_THIEU_GIA = { id: "s-thieu", catalogCode: "ZB2", pax: P(3) };

test("bảng: máy chủ không gửi suaSoKhach (người xem không có ô / đơn không đủ điều kiện) → không có bảng, không có nút", () => {
  assert.equal(nguonBangSuaSoKhach([DV_TOUR], null), null);
});

test("bảng: không dịch vụ nào có loại khách sửa được (chỉ nhập tay / thiếu giá đã lưu) → không có nút (không mở bảng rỗng)", () => {
  assert.equal(nguonBangSuaSoKhach([DV_TAY, DV_THIEU_GIA], [{ serviceId: "s-thieu", loaiKhach: [] }]), null);
});

test("bảng: dịch vụ danh mục lấy loại khách sửa được TỪ MÁY CHỦ; dịch vụ nhập tay luôn chỉ xem, kể cả khi máy chủ (lỗi) gửi loại khách cho nó", () => {
  const n = nguonBangSuaSoKhach([DV_TOUR, DV_TAY, DV_THIEU_GIA], [
    { serviceId: "s-tour", loaiKhach: ["adult", "child"] },
    { serviceId: "s-tay", loaiKhach: ["adult"] },
    { serviceId: "s-thieu", loaiKhach: [] },
  ]);
  assert.deepEqual(n?.map((s) => [s.id, [...s.editablePaxCodes]]), [["s-tour", ["adult", "child"]], ["s-tay", []], ["s-thieu", []]]);
});

test("thân: { lyDo: mã, services: ĐỦ mọi dịch vụ danh mục (kể cả không sửa được — giữ số đang có), KHÔNG dịch vụ nhập tay } — bộ đọc thân của máy chủ nhận nguyên", () => {
  const n = nguonBangSuaSoKhach([DV_TOUR, DV_TAY, DV_THIEU_GIA], [{ serviceId: "s-tour", loaiKhach: ["adult", "child"] }, { serviceId: "s-thieu", loaiKhach: [] }])!;
  const than = thanSuaSoKhach("BOT_NGUOI", n, new Map([["s-tour", { adult: 1 }], ["s-thieu", { adult: 9 }]]));
  assert.deepEqual(than, { lyDo: "BOT_NGUOI", services: [{ id: "s-tour", pax: P(1, 1) }, { id: "s-thieu", pax: P(3) }] }, "loại khách không sửa được giữ số đang có, kể cả khi bản nháp có số");
  const doc = docThanSuaSoKhach(than);
  assert.ok(doc.ok && doc.nhan === "Khách bớt người" && doc.services === than.services);
});

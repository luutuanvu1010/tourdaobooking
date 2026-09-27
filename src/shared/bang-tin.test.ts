// Bài kiểm hàm thuần của Bảng tin (ADR-0022). Task 1: nhãn kết nối/sự kiện + NT-3 (đối chiếu MATRIX, không chép tay).
// Task 2: hàm thuần phía trình duyệt (chờ nối lại, quyết định thông báo nổi TD-4, kiểm tin hợp lệ).
import { test } from "node:test";
import assert from "node:assert/strict";
import { MATRIX, PERMISSION_CODES, can, holdsPartner, type PermissionCode } from "./permissions.ts";
import {
  THAY_DOI,
  choNoiLai,
  laSuKienHopLe,
  nhanKetNoi,
  nhanSuKien,
  thayDoiCuaHandler,
  thongBaoNoi,
  type SuKienDon,
  type TrangThaiPhuTrach,
} from "./bang-tin.ts";

test("THAY_DOI đúng 9 giá trị (điều 4 + điều 7 ADR-0022)", () => {
  assert.deepEqual([...THAY_DOI], ["tao", "tao_cho_nhan", "nhan", "giao", "xac_nhan", "huy", "sua", "chuyen", "tien"]);
});

// 128 tập con của 7 mã quyền — suy kỳ vọng từ MATRIX/can(), không chép tay (P16: bài kiểm không được tự khoá giá trị đọc nhầm là luật).
function moiTapCon<T>(mang: readonly T[]): T[][] {
  if (mang.length === 0) return [[]];
  const [dau, ...con] = mang;
  const conCacTap = moiTapCon(con);
  return [...conCacTap, ...conCacTap.map((t) => [dau as T, ...t])];
}

test("nhanKetNoi: mọi tập con quyền (128) khớp can(order.view)/(can(dispatch.claim) && !holdsPartner) suy từ MATRIX (ADR-0030 S20-8)", () => {
  const tapCon = moiTapCon(PERMISSION_CODES as readonly PermissionCode[]);
  assert.equal(tapCon.length, 128);
  for (const permissions of tapCon) {
    const staff = { id: "nv1", permissions };
    const ky_vong = new Set<string>(["nguoi:nv1"]);
    if (can(staff, "order.view")) ky_vong.add("tat-ca");
    if (can(staff, "dispatch.claim") && !holdsPartner(staff)) ky_vong.add("cho-nhan");
    assert.deepEqual(nhanKetNoi(staff), [...ky_vong].sort(), `permissions=${JSON.stringify(permissions)}`);
  }
});

test("nhanKetNoi: tài khoản lai Đối tác + quyền có dispatch.claim (SALES/ADMIN/SUPER_ADMIN) KHÔNG có cho-nhan (ADR-0030 S20-8, Q-M)", () => {
  // holdsPartner áp bất kể quyền đi kèm (chủ dự án 2026-09-26: "Có quyền Đối tác là áp") — cùng luật với checkAssignee.
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["PARTNER", "SALES"] }), ["nguoi:x", "tat-ca"], "lai PARTNER+SALES: tat-ca có (order.view=any qua SALES), cho-nhan KHÔNG");
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["PARTNER", "ADMIN"] }), ["nguoi:x", "tat-ca"], "lai PARTNER+ADMIN: cho-nhan KHÔNG");
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["PARTNER", "SUPER_ADMIN"] }), ["nguoi:x", "tat-ca"], "lai PARTNER+SUPER_ADMIN: cho-nhan KHÔNG (SUPER_ADMIN any ở mọi ô nhưng holdsPartner vẫn chặn)");
});

test("nhanKetNoi: bảng ảnh chụp hôm nay theo từng quyền đơn lẻ", () => {
  const nhomDayDu = ["cho-nhan", "nguoi:x", "tat-ca"];
  const nhomTatCa = ["nguoi:x", "tat-ca"];
  const chiNguoi = ["nguoi:x"];
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["SALES"] }), nhomDayDu);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["ADMIN"] }), nhomDayDu);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["SUPER_ADMIN"] }), nhomDayDu);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["ACCOUNTING"] }), nhomTatCa);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["FIELD"] }), ["cho-nhan", "nguoi:x"], "ADR-0030 S20-8: hướng dẫn viên nhận tin hàng chờ (cho-nhan), KHÔNG có tat-ca");
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["PARTNER"] }), chiNguoi);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["INTERN"] }), chiNguoi);
});

// NT-3 (thay, ADR-0030 S20-8/9, đỏ có chủ ý — chủ đã duyệt): trước đây (bài cũ) mọi mã quyền có dispatch.claim ≠ none đều có order.view = any,
// nên nhãn cho-nhan không bao giờ thêm người nhận ngoài tat-ca — bất biến đó vỡ khi FIELD nhận dispatch.claim mà VẪN order.view hẹp (Task 1.5,
// lượt 1). Luật thật (bất biến phải giữ mãi, không chỉ hôm nay): với MỌI kết nối suy từ MATRIX mà KHÔNG có nhãn tat-ca, và MỌI sự kiện dựng
// bằng nhanSuKien() từ mọi tổ hợp (người lập/người phụ trách X/Y phân biệt với chính kết nối đó để không match qua nguoi:), kết nối đó chỉ
// nhận được sự kiện QUA NHÃN cho-nhan khi đơn đang ở hàng chờ (sau = chưa ai) hoặc VỪA rời hàng chờ (trước = chưa ai, biết) — never khi
// "đơn đang có người khác phụ trách, trước không biết". Test mô phỏng ĐÚNG cách trạm ghép cặp: một kết nối nhận sự kiện khi và chỉ khi giao
// giữa nhãn kết nối và nhãn sự kiện không rỗng (`phatDon`, `src/modules/bangtin/index.ts:41`).
const CHU = "chu-lap-don"; // người lập — không trùng id kết nối đang xét lẫn X/Y, để không match qua nguoi:<ownerId>
const HX: TrangThaiPhuTrach = { coNguoi: true, staffId: "hx-nguoi-phu-trach" };
const HY: TrangThaiPhuTrach = { coNguoi: true, staffId: "hy-nguoi-phu-trach" };
const CHUA_AI: TrangThaiPhuTrach = { coNguoi: false, staffId: null };
const TRUOC_TO_HOP: (TrangThaiPhuTrach | null)[] = [null, CHUA_AI, HX, HY]; // không biết, chưa ai, có người X, có người Y
const SAU_TO_HOP: TrangThaiPhuTrach[] = [CHUA_AI, HX, HY];

test("NT-3 (thay): kết nối không có tat-ca chỉ nhận sự kiện qua cho-nhan khi hàng chờ đổi (sau=chưa ai, hoặc trước=chưa ai VÀ biết) — không bao giờ khi trước KHÔNG BIẾT", () => {
  // Ghi chú: TRƯỚC Task 1.5 (FIELD dispatch.claim vẫn "none"), mọi mã quyền có dispatch.claim ≠ none cũng có order.view = any nên bị bỏ qua
  // (skip "coi kết nối không có tat-ca") — bài này chưa có ca coChoNhan=true THẬT để soi trên mã hôm nay; nó đã được CHỨNG MINH bắt lỗi bằng
  // đột biến tay (dispatch.claim FIELD tạm "any" + nhanSuKien/mặc định kiểu cũ) trước khi commit — xem báo cáo thi công. Sau Task 1.5 bài này
  // chạy có ý nghĩa thật với FIELD.
  const tapCon = moiTapCon(PERMISSION_CODES as readonly PermissionCode[]);
  for (const permissions of tapCon) {
    const staff = { id: "ket-noi-dang-xet", permissions };
    const nhanKN = nhanKetNoi(staff);
    if (nhanKN.includes("tat-ca")) continue; // phạm vi của NT-3 chỉ nói về kết nối KHÔNG có tat-ca
    const coChoNhan = nhanKN.includes("cho-nhan");
    for (const handlerTruoc of TRUOC_TO_HOP) {
      for (const handlerSau of SAU_TO_HOP) {
        const nhanSK = nhanSuKien({ ownerId: CHU, handlerTruoc, handlerSau });
        const giaoNhau = nhanKN.some((n) => nhanSK.includes(n)); // đúng cách trạm ghép cặp (phatDon): giao khác rỗng
        const doiHangCho = !handlerSau.coNguoi || (handlerTruoc !== null && !handlerTruoc.coNguoi);
        const kyVongNhanQuaChoNhan = coChoNhan && doiHangCho;
        assert.equal(
          giaoNhau,
          kyVongNhanQuaChoNhan,
          `permissions=${JSON.stringify(permissions)} truoc=${JSON.stringify(handlerTruoc)} sau=${JSON.stringify(handlerSau)} — ` +
            `nhanKetNoi=${JSON.stringify(nhanKN)} nhanSuKien=${JSON.stringify(nhanSK)}`,
        );
      }
    }
  }
});

// Hàng rào (docs/SO-HANG-RAO.md) — mô phỏng ĐÚNG biểu thức mặc định của gốc lắp ráp `src/index.ts:47`
// (`nhanSuKien({ ..., handlerTruoc: e.handlerTruoc ?? MAC_DINH_HOM_NAY, ... })`), vì `bang-tin.test.ts` (thuần, không I/O) KHÔNG được import
// `src/index.ts` (Worker, mở Durable Object). `MAC_DINH_HOM_NAY` PHẢI khớp giá trị thật ở đó — người sửa `src/index.ts:47` mà quên sửa đây (hoặc
// ngược lại) thì hai nơi lệch nhau; bài test không tự phát hiện lệch đó, chỉ giữ đúng GIÁ TRỊ ĐÚNG hôm nay (giới hạn ghi ở docs/SO-HANG-RAO.md).
const MAC_DINH_HOM_NAY: TrangThaiPhuTrach | null = null; // "không biết" — PHẢI khớp src/index.ts:47

test("hàng rào: mặc định handlerTruoc của gốc lắp ráp (mô phỏng src/index.ts:47) là 'không biết' — route không truyền handlerTruoc cho đơn ĐÃ có người không được gắn cho-nhan", () => {
  // Mô phỏng chính xác một lô ghi không truyền handlerTruoc (ví dụ POST /status xác nhận đơn mà HDV B đang phụ trách): route không đọc lại
  // trạng thái trước, `e.handlerTruoc` là `undefined`, gốc lắp ráp coi `undefined ?? MAC_DINH_HOM_NAY`.
  const eHandlerTruoc: TrangThaiPhuTrach | undefined = undefined;
  const daCoNguoiPhuTrach: TrangThaiPhuTrach = { coNguoi: true, staffId: "hdv-b" };
  const suKien = nhanSuKien({ ownerId: "chu", handlerTruoc: eHandlerTruoc ?? MAC_DINH_HOM_NAY, handlerSau: daCoNguoiPhuTrach });
  assert.ok(!suKien.includes("cho-nhan"), `mặc định phải là 'không biết' (null) — đơn HDV B đang phụ trách không được lộ cho-nhan cho HDV khác: ${JSON.stringify(suKien)}`);
});

test("nhanSuKien: luôn có tat-ca + nguoi:owner; thêm nguoi:handler khi có tài khoản; cho-nhan theo luật (a)/(b) — ADR-0030 S20-8/9", () => {
  const chuaAi: TrangThaiPhuTrach = { coNguoi: false, staffId: null };
  const coTaiKhoan = (id: string): TrangThaiPhuTrach => ({ coNguoi: true, staffId: id });
  const khongTaiKhoan: TrangThaiPhuTrach = { coNguoi: true, staffId: null };
  const khongBiet = null; // ADR-0030 S20-8/9: "không biết trạng thái trước" — mặc định của gốc lắp ráp khi route không tự đọc lại

  assert.deepEqual(
    nhanSuKien({ ownerId: "chu", handlerTruoc: chuaAi, handlerSau: chuaAi }),
    ["cho-nhan", "nguoi:chu", "tat-ca"],
    "đơn mới chưa ai phụ trách — luật (a): sau=chưa ai",
  );
  assert.deepEqual(
    nhanSuKien({ ownerId: "chu", handlerTruoc: chuaAi, handlerSau: coTaiKhoan("nv2") }),
    ["cho-nhan", "nguoi:chu", "nguoi:nv2", "tat-ca"],
    "vừa có người nhận (trước=chưa ai, BIẾT) — luật (b): đơn vừa rời hàng chờ, các HDV khác phải gỡ nó khỏi danh sách chờ nhận",
  );
  assert.deepEqual(
    nhanSuKien({ ownerId: "chu", handlerTruoc: coTaiKhoan("nv2"), handlerSau: coTaiKhoan("nv3") }),
    ["nguoi:chu", "nguoi:nv2", "nguoi:nv3", "tat-ca"],
    "đổi người phụ trách (đã có người → có người khác) — không cho-nhan (không (a) không (b))",
  );
  assert.deepEqual(
    nhanSuKien({ ownerId: "chu", handlerTruoc: coTaiKhoan("nv2"), handlerSau: chuaAi }),
    ["cho-nhan", "nguoi:chu", "nguoi:nv2", "tat-ca"],
    "huỷ phụ trách — lại chưa ai — luật (a): sau=chưa ai",
  );
  assert.deepEqual(
    nhanSuKien({ ownerId: "chu", handlerTruoc: chuaAi, handlerSau: khongTaiKhoan }),
    ["cho-nhan", "nguoi:chu", "tat-ca"],
    "người phụ trách MỚI là hồ sơ KHÔNG tài khoản: không có nhãn nguoi: cho người đó, nhưng vẫn cho-nhan qua luật (b) (trước=chưa ai, biết) — đơn vẫn vừa rời hàng chờ",
  );
  assert.deepEqual(
    nhanSuKien({ ownerId: "chu", handlerTruoc: chuaAi, handlerSau: coTaiKhoan("chu") }),
    ["cho-nhan", "nguoi:chu", "tat-ca"],
    "owner = handler → một nhãn, không trùng lặp; luật (b) vẫn áp (trước=chưa ai, biết) dù người mới = chính người lập",
  );

  // "Không biết" (null) — ADR-0030 S20-8/9: KHÔNG BAO GIỜ sinh cho-nhan qua luật (b), và KHÔNG thêm nguoi: cho người phụ trách trước.
  assert.deepEqual(
    nhanSuKien({ ownerId: "chu", handlerTruoc: khongBiet, handlerSau: coTaiKhoan("nv2") }),
    ["nguoi:chu", "nguoi:nv2", "tat-ca"],
    "không biết trước + sau đã có người (ví dụ 'xác nhận' đơn nv2 đang phụ trách) — KHÔNG cho-nhan (đây là ca lộ tin nếu coi nhầm 'không biết' = 'chưa ai')",
  );
  assert.deepEqual(
    nhanSuKien({ ownerId: "chu", handlerTruoc: khongBiet, handlerSau: chuaAi }),
    ["cho-nhan", "nguoi:chu", "tat-ca"],
    "không biết trước + sau chưa ai — vẫn cho-nhan qua luật (a) (sau=chưa ai không phụ thuộc trước)",
  );
  assert.deepEqual(
    nhanSuKien({ ownerId: "chu", handlerTruoc: khongBiet, handlerSau: khongTaiKhoan }),
    ["nguoi:chu", "tat-ca"],
    "không biết trước + sau có người không tài khoản — không cho-nhan, không nguoi: nào cho trước (không biết)",
  );
});

test("thayDoiCuaHandler: nhan khi tự đặt mình vào đơn chưa có người, còn lại giao", () => {
  const chuaAi: TrangThaiPhuTrach = { coNguoi: false, staffId: null };
  const coTaiKhoan = (id: string): TrangThaiPhuTrach => ({ coNguoi: true, staffId: id });
  assert.equal(thayDoiCuaHandler({ nguoiGoi: "nv2", handlerTruoc: chuaAi, handlerSau: coTaiKhoan("nv2") }), "nhan");
  assert.equal(thayDoiCuaHandler({ nguoiGoi: "nv2", handlerTruoc: coTaiKhoan("nv1"), handlerSau: coTaiKhoan("nv2") }), "giao");
  assert.equal(thayDoiCuaHandler({ nguoiGoi: "quantri", handlerTruoc: chuaAi, handlerSau: coTaiKhoan("nv2") }), "giao");
  assert.equal(thayDoiCuaHandler({ nguoiGoi: "nv2", handlerTruoc: coTaiKhoan("nv2"), handlerSau: coTaiKhoan("nv3") }), "giao");
});

test("choNoiLai: lần 0 nằm trong [1000, 2000), ngauNhien=0 cho dãy tăng gấp đôi tới trần 30000", () => {
  assert.equal(choNoiLai(0, 0), 1000);
  assert.ok(choNoiLai(0, 0.999999) < 2000, "lần 0, ngauNhien gần 1 vẫn dưới 2000");
  assert.ok(choNoiLai(0, 0.999999) >= 1000);
  assert.equal(choNoiLai(1, 0), 2000, "gấp đôi lần 0");
  assert.equal(choNoiLai(2, 0), 4000, "gấp đôi lần 1");
  assert.equal(choNoiLai(3, 0), 8000);
  assert.equal(choNoiLai(4, 0), 16000);
  assert.equal(choNoiLai(5, 0), 30000, "chạm trần (1000*2^5=32000 > 30000)");
  assert.equal(choNoiLai(10, 0), 30000, "vẫn ở trần, không tăng thêm");
});

test("choNoiLai: đã tới trần chỉ cộng thêm tối đa 20%, không bao giờ vượt 36000", () => {
  assert.equal(choNoiLai(5, 1), 36000, "ngauNhien=1 (biên trên lý thuyết) đúng bằng trần cộng 20%");
  assert.ok(choNoiLai(5, 0.999) < 36000);
  assert.ok(choNoiLai(20, 0.5) <= 36000);
  assert.ok(choNoiLai(20, 0.5) >= 30000);
});

// Cố định thời điểm/mã đơn cho mọi bài `thongBaoNoi`.
const suKien = (thayDoi: SuKienDon["thayDoi"]): SuKienDon => ({
  loai: "don",
  orderId: "order1",
  maDon: "TD1",
  thayDoi,
  luc: "2026-09-26T00:00:00.000Z",
});
const vanPhong = { id: "nv1", permissions: ["SALES"] as const }; // order.view=any, dispatch.claim=any
const ketToan = { id: "nv2", permissions: ["ACCOUNTING"] as const }; // order.view=any, dispatch.claim=none
const huongDanVien = { id: "nv3", permissions: ["FIELD"] as const }; // order.view=assigned, dispatch.claim=any (ADR-0030 S20-6), có FIELD
const doiTac = { id: "nv4", permissions: ["PARTNER"] as const };
const thucTap = { id: "nv5", permissions: ["INTERN"] as const };

test("thongBaoNoi: văn phòng thấy đủ 5 loại có thông báo nổi (TD-4), câu đúng chữ, liên kết /order?id=", () => {
  assert.deepEqual(thongBaoNoi(vanPhong, suKien("tao_cho_nhan")), {
    cau: "Có đơn mới chưa có người phụ trách: TD1",
    lienKet: "/order?id=order1",
  });
  assert.deepEqual(thongBaoNoi(vanPhong, suKien("nhan")), { cau: "Đơn TD1 vừa có người nhận", lienKet: "/order?id=order1" });
  assert.deepEqual(thongBaoNoi(vanPhong, suKien("giao")), { cau: "Đơn TD1 vừa đổi người phụ trách", lienKet: "/order?id=order1" });
  assert.deepEqual(thongBaoNoi(vanPhong, suKien("xac_nhan")), { cau: "Đơn TD1 đã được xác nhận", lienKet: "/order?id=order1" });
  assert.deepEqual(thongBaoNoi(vanPhong, suKien("huy")), { cau: "Đơn TD1 đã bị huỷ", lienKet: "/order?id=order1" });
});

test("thongBaoNoi: tao/sua/chuyen/tien không hiện thông báo nổi (chỉ làm mới màn hình)", () => {
  assert.equal(thongBaoNoi(vanPhong, suKien("tao")), null);
  assert.equal(thongBaoNoi(vanPhong, suKien("sua")), null);
  assert.equal(thongBaoNoi(vanPhong, suKien("chuyen")), null);
  assert.equal(thongBaoNoi(vanPhong, suKien("tien")), null);
});

test("thongBaoNoi: tao_cho_nhan chỉ hiện cho ai có dispatch.claim (Kế toán không có → null)", () => {
  assert.equal(thongBaoNoi(ketToan, suKien("tao_cho_nhan")), null);
  assert.deepEqual(thongBaoNoi(ketToan, suKien("nhan")), { cau: "Đơn TD1 vừa có người nhận", lienKet: "/order?id=order1" });
});

test("thongBaoNoi: tài khoản lai Đối tác + văn phòng (dispatch.claim=any qua SALES) KHÔNG hiện tao_cho_nhan (ADR-0030 S20-8, giống nhanKetNoi)", () => {
  const laiDoiTacVanPhong = { id: "nv6", permissions: ["PARTNER", "SALES"] as const }; // isOffice=true (qua SALES) → vanPhong
  assert.equal(thongBaoNoi(laiDoiTacVanPhong, suKien("tao_cho_nhan")), null, "lai Đối tác+SALES: có dispatch.claim (qua SALES) nhưng holdsPartner chặn");
  assert.deepEqual(
    thongBaoNoi(laiDoiTacVanPhong, suKien("nhan")),
    { cau: "Đơn TD1 vừa có người nhận", lienKet: "/order?id=order1" },
    "các loại khác tao_cho_nhan không bị chặn bởi holdsPartner",
  );
});

test("thongBaoNoi: tài khoản lai Đối tác + Hướng dẫn viên (không văn phòng) KHÔNG hiện tao_cho_nhan", () => {
  const laiDoiTacHdv = { id: "nv7", permissions: ["PARTNER", "FIELD"] as const }; // không văn phòng, có FIELD → huongDanVien
  assert.equal(thongBaoNoi(laiDoiTacHdv, suKien("tao_cho_nhan")), null, "lai Đối tác+FIELD: có dispatch.claim (qua FIELD, ADR-0030 S20-6) nhưng holdsPartner chặn");
  assert.deepEqual(thongBaoNoi(laiDoiTacHdv, suKien("giao")), { cau: "Đơn TD1 vừa đổi người phụ trách", lienKet: "/account" });
});

test("thongBaoNoi: Hướng dẫn viên (không văn phòng) thấy các loại còn lại, liên kết /account", () => {
  assert.deepEqual(thongBaoNoi(huongDanVien, suKien("nhan")), { cau: "Đơn TD1 vừa có người nhận", lienKet: "/account" });
  assert.deepEqual(thongBaoNoi(huongDanVien, suKien("giao")), { cau: "Đơn TD1 vừa đổi người phụ trách", lienKet: "/account" });
  assert.deepEqual(
    thongBaoNoi(huongDanVien, suKien("tao_cho_nhan")),
    { cau: "Có đơn mới chưa có người phụ trách: TD1", lienKet: "/account" },
    "ADR-0030 S20-6/S20-8: FIELD có dispatch.claim → thấy đơn mới chờ nhận (liên kết giữ /account tới khi có thiết kế màn HDV — Task 1.8)",
  );
});

test("thongBaoNoi: Đối tác/Thực tập KHÔNG BAO GIỜ hiện thông báo nổi (Q-C ADR-0022)", () => {
  for (const thayDoi of THAY_DOI) {
    assert.equal(thongBaoNoi(doiTac, suKien(thayDoi)), null, `Đối tác × ${thayDoi}`);
    assert.equal(thongBaoNoi(thucTap, suKien(thayDoi)), null, `Thực tập × ${thayDoi}`);
  }
});

test("thongBaoNoi: không câu nào lộ mã thô ra người dùng", () => {
  for (const thayDoi of THAY_DOI) {
    const kq = thongBaoNoi(vanPhong, suKien(thayDoi));
    if (kq === null) continue;
    for (const maThoRaw of THAY_DOI) assert.ok(!kq.cau.includes(maThoRaw), `câu "${kq.cau}" lộ mã "${maThoRaw}"`);
    assert.ok(!kq.cau.includes("FIELD") && !kq.cau.includes("PARTNER"), `câu "${kq.cau}" lộ mã quyền`);
  }
});

test("laSuKienHopLe: đúng 5 khoá của điều 4, thayDoi thuộc THAY_DOI → true", () => {
  assert.equal(laSuKienHopLe(suKien("nhan")), true);
  for (const thayDoi of THAY_DOI) assert.equal(laSuKienHopLe(suKien(thayDoi)), true, thayDoi);
});

test("laSuKienHopLe: khoá thừa, khoá thiếu, thayDoi lạ, kiểu sai, không phải object → false", () => {
  const hopLe = suKien("nhan");
  assert.equal(laSuKienHopLe({ ...hopLe, thua: 1 }), false, "khoá thừa");
  const { luc, ...thieuLuc } = hopLe;
  assert.equal(laSuKienHopLe(thieuLuc), false, "thiếu khoá luc");
  assert.equal(laSuKienHopLe({ ...hopLe, thayDoi: "khong_ton_tai" }), false, "thayDoi lạ");
  assert.equal(laSuKienHopLe({ ...hopLe, loai: "khac" }), false, "loai sai");
  assert.equal(laSuKienHopLe({ ...hopLe, orderId: 1 }), false, "orderId sai kiểu");
  assert.equal(laSuKienHopLe(null), false);
  assert.equal(laSuKienHopLe("chuoi"), false);
  assert.equal(laSuKienHopLe(42), false);
  assert.equal(laSuKienHopLe([hopLe]), false, "mảng không phải sự kiện");
});

// Bài kiểm hàm thuần của Bảng tin (ADR-0022). Task 1: nhãn kết nối/sự kiện + NT-3 (đối chiếu MATRIX, không chép tay).
// Task 2: hàm thuần phía trình duyệt (chờ nối lại, quyết định thông báo nổi TD-4, kiểm tin hợp lệ).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MATRIX, PERMISSION_CODES, can, holdsPartner, type PermissionCode } from "./permissions.ts";
import {
  HANDLER_TRUOC_KHONG_BIET,
  THAY_DOI,
  choNoiLai,
  duocThayTinDoi,
  duocThayTinDon,
  laSuKienChuyenHopLe,
  laSuKienHopLe,
  nhanKetNoi,
  nhanSuKien,
  nhanSuKienChuyen,
  thayDoiCuaHandler,
  thongBaoNoi,
  type SuKienDon,
  type TrangThaiPhuTrach,
} from "./bang-tin.ts";

test("THAY_DOI đúng 11 giá trị (điều 4 + điều 7 ADR-0022; + chot_giao, hoan_thanh — ADR-0025 điều 8)", () => {
  assert.deepEqual([...THAY_DOI], ["tao", "tao_cho_nhan", "nhan", "giao", "xac_nhan", "huy", "sua", "chuyen", "tien", "chot_giao", "hoan_thanh"]);
});

// 512 tập con của 9 mã quyền (ADR-0040 D3 thêm DRIVER, ADR-0048 D2 thêm DRIVER_PARTNER) — suy kỳ vọng từ MATRIX/can(), không chép tay (P16: bài kiểm không được tự khoá giá trị đọc nhầm là luật).
function moiTapCon<T>(mang: readonly T[]): T[][] {
  if (mang.length === 0) return [[]];
  const [dau, ...con] = mang;
  const conCacTap = moiTapCon(con);
  return [...conCacTap, ...conCacTap.map((t) => [dau as T, ...t])];
}

test("nhanKetNoi: mọi tập con quyền (1024) khớp can(order.view)/(can(dispatch.claim) && !holdsPartner)/can(trip.view) suy từ MATRIX (ADR-0030 S20-8; 'dieu-xe' — ADR-0052 D6.4, đã duyệt)", () => {
  const tapCon = moiTapCon(PERMISSION_CODES as readonly PermissionCode[]);
  assert.equal(tapCon.length, 1024); // 10 mã (ADR-0071 thêm HR)
  for (const permissions of tapCon) {
    const staff = { id: "nv1", permissions };
    const ky_vong = new Set<string>(["nguoi:nv1"]);
    if (can(staff, "order.view")) ky_vong.add("tat-ca");
    if (can(staff, "dispatch.claim") && !holdsPartner(staff)) ky_vong.add("cho-nhan");
    if (can(staff, "trip.view")) ky_vong.add("dieu-xe"); // ADR-0052 D6.4: trip.view KHÔNG ngữ cảnh (ô any)
    assert.deepEqual(nhanKetNoi(staff), [...ky_vong].sort(), `permissions=${JSON.stringify(permissions)}`);
  }
});

// ADR-0048 D2 ("Bảng tin: không đổi luật"): nhanKetNoi suy từ can() nên tài khoản chỉ Tài xế đối tác chỉ mang nhãn của CHÍNH MÌNH — khẳng định tường minh.
test("nhanKetNoi: tài khoản chỉ Tài xế đối tác (DRIVER_PARTNER) chỉ mang nguoi:<id> — không tat-ca, không cho-nhan (ADR-0048 D2)", () => {
  assert.deepEqual(nhanKetNoi({ id: "tx-dt", permissions: ["DRIVER_PARTNER"] }), ["nguoi:tx-dt"]);
});

test("nhanKetNoi: tài khoản lai Đối tác + quyền có dispatch.claim (SALES/ADMIN/SUPER_ADMIN) KHÔNG có cho-nhan (ADR-0030 S20-8, Q-M)", () => {
  // holdsPartner áp bất kể quyền đi kèm (chủ dự án 2026-09-26: "Có quyền Đối tác là áp") — cùng luật với checkAssignee. `dieu-xe` (ADR-0052 D6.4) theo trip.view
  // của quyền văn phòng đi kèm — holdsPartner không chặn nhãn này (ADR chỉ nói "trip.view = any").
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["PARTNER", "SALES"] }), ["dieu-xe", "nguoi:x", "tat-ca"], "lai PARTNER+SALES: tat-ca có (order.view=any qua SALES), cho-nhan KHÔNG");
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["PARTNER", "ADMIN"] }), ["dieu-xe", "nguoi:x", "tat-ca"], "lai PARTNER+ADMIN: cho-nhan KHÔNG");
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["PARTNER", "SUPER_ADMIN"] }), ["dieu-xe", "nguoi:x", "tat-ca"], "lai PARTNER+SUPER_ADMIN: cho-nhan KHÔNG (SUPER_ADMIN any ở mọi ô nhưng holdsPartner vẫn chặn)");
});

test("nhanKetNoi: bảng ảnh chụp hôm nay theo từng quyền đơn lẻ (ADR-0052 D6.4: SALES, ACCOUNTING, ADMIN, SUPER_ADMIN thêm 'dieu-xe')", () => {
  const nhomDayDu = ["cho-nhan", "dieu-xe", "nguoi:x", "tat-ca"];
  const nhomTatCa = ["dieu-xe", "nguoi:x", "tat-ca"];
  const chiNguoi = ["nguoi:x"];
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["SALES"] }), nhomDayDu);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["ADMIN"] }), nhomDayDu);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["SUPER_ADMIN"] }), nhomDayDu);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["ACCOUNTING"] }), nhomTatCa);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["FIELD"] }), ["cho-nhan", "nguoi:x"], "ADR-0030 S20-8: hướng dẫn viên nhận tin hàng chờ (cho-nhan), KHÔNG có tat-ca");
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["PARTNER"] }), chiNguoi);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["INTERN"] }), chiNguoi);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["DRIVER"] }), chiNguoi, "tài xế: trip.view chỉ assigned — không dieu-xe");
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["DRIVER_PARTNER"] }), chiNguoi);
  assert.deepEqual(nhanKetNoi({ id: "x", permissions: ["HR"] }), chiNguoi);
});

test("ADR-0052 D6.4: kết nối có trip.view KHÔNG ngữ cảnh mới mang 'dieu-xe'; tài xế (assigned), HDV, Đối tác, Thực tập, Tài xế đối tác thì không", () => {
  for (const p of ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"] as const) assert.ok(nhanKetNoi({ id: "x", permissions: [p] }).includes("dieu-xe"), p);
  for (const p of ["DRIVER", "DRIVER_PARTNER", "FIELD", "PARTNER", "INTERN", "HR"] as const) assert.ok(!nhanKetNoi({ id: "x", permissions: [p] }).includes("dieu-xe"), p);
});
test("nhanSuKienChuyen: luôn dieu-xe + nguoi:<tài xế>; KHÔNG BAO GIỜ tat-ca / cho-nhan / noi-bo", () => {
  assert.deepEqual(nhanSuKienChuyen(["b", "a", "a"]), ["dieu-xe", "nguoi:a", "nguoi:b"]);
  assert.deepEqual(nhanSuKienChuyen([]), ["dieu-xe"]);
  for (const ds of [[], ["a"], ["tat-ca"], ["a", "b", "c"]]) {
    const n = nhanSuKienChuyen(ds);
    for (const cam of ["tat-ca", "cho-nhan", "noi-bo"]) assert.ok(!n.includes(cam), `${cam} trong ${JSON.stringify(n)}`);
  }
});
test("laSuKienChuyenHopLe: đúng 4 khoá (loai, maChuyen, thayDoi, luc) — thêm tripId / tên → từ chối", () => {
  const e = { loai: "chuyen", maChuyen: "CX-1", thayDoi: "huy", luc: "2027-03-11T00:00:00.000Z" };
  assert.ok(laSuKienChuyenHopLe(e));
  assert.ok(!laSuKienChuyenHopLe({ ...e, tripId: "t" }));
  assert.ok(!laSuKienChuyenHopLe({ ...e, ten: "Khách" }));
  assert.ok(!laSuKienChuyenHopLe({ ...e, thayDoi: "zzz" }));
  assert.ok(!laSuKienChuyenHopLe({ loai: "chuyen", maChuyen: "CX-1", thayDoi: "huy" }));
  assert.ok(!laSuKienHopLe(e), "sự kiện chuyến không lọt vào nhánh sự kiện đơn");
  assert.ok(!laSuKienChuyenHopLe({ loai: "don", orderId: "o", maDon: "DH-1", thayDoi: "huy", luc: "x" }), "sự kiện đơn không lọt vào nhánh chuyến");
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

// Hàng rào (docs/SO-HANG-RAO.md, dòng "Bảng tin không lộ đơn người khác cho HDV") — mặc định `handlerTruoc` của gốc lắp ráp (`baoThayDoi` ở
// `src/index.ts`) phải là "KHÔNG BIẾT" (`null`), không phải "chưa ai phụ trách". `bang-tin.test.ts` (thuần, không I/O) KHÔNG import được
// `src/index.ts` (nạp lớp Durable Object của `cloudflare:workers`), nên canh bằng HAI lớp cùng một nguồn — vòng sửa 1 sau kiểm độc lập lượt 1
// (phát hiện I-1: bản cũ dùng hằng CHÉP TAY `MAC_DINH_HOM_NAY`, đổi dòng thật ở `src/index.ts` về "chưa ai" thì bài này vẫn xanh):
//   (1) GIÁ TRỊ: hằng dùng chung `HANDLER_TRUOC_KHONG_BIET` (src/shared/bang-tin.ts) là `null` và không sinh `cho-nhan` cho đơn đã có người;
//   (2) NƠI GỌI THẬT: đọc mã nguồn `src/index.ts`, đúng MỘT lời gọi `nhanSuKien(` và đối số `handlerTruoc:` của nó ĐÚNG là
//       `e.handlerTruoc ?? HANDLER_TRUOC_KHONG_BIET` (bỏ khoảng trắng) — viết tay giá trị khác ở nơi gọi (kể cả `{ coNguoi: false, staffId: null }`)
//       hoặc bỏ hằng thì đỏ.
const INDEX_TS = readFileSync(new URL("../index.ts", import.meta.url), "utf8");

/** Đoạn đối số của MỌI lời gọi `nhanSuKien(` trong một tệp nguồn (khớp ngoặc tròn; KHÔNG xử lý ngoặc nằm trong chuỗi/chú thích — đủ cho mã của gốc lắp ráp, ngoặc lệch thì bài đỏ chứ không xanh nhầm). */
function doiSoCacLoiGoi(nguon: string, ham: string): string[] {
  const kq: string[] = [];
  const mau = new RegExp(`\\b${ham}\\(`, "g");
  for (let m = mau.exec(nguon); m !== null; m = mau.exec(nguon)) {
    let sau = 1;
    let i = m.index + m[0].length;
    const dau = i;
    for (; i < nguon.length && sau > 0; i++) {
      if (nguon[i] === "(") sau++;
      else if (nguon[i] === ")") sau--;
    }
    kq.push(nguon.slice(dau, i - 1));
  }
  return kq;
}

test("hàng rào (1): HANDLER_TRUOC_KHONG_BIET là 'không biết' (null) — route không truyền handlerTruoc cho đơn ĐÃ có người không được gắn cho-nhan", () => {
  assert.equal(HANDLER_TRUOC_KHONG_BIET, null, "mặc định phải là 'không biết' (null), không phải 'chưa ai phụ trách'");
  // Mô phỏng một lô ghi không truyền handlerTruoc (ví dụ POST /status xác nhận đơn mà HDV B đang phụ trách): route không đọc lại trạng thái trước,
  // `e.handlerTruoc` là `undefined`, gốc lắp ráp dùng `e.handlerTruoc ?? HANDLER_TRUOC_KHONG_BIET` — nơi gọi thật do bài (2) canh.
  const eHandlerTruoc: TrangThaiPhuTrach | undefined = undefined;
  const daCoNguoiPhuTrach: TrangThaiPhuTrach = { coNguoi: true, staffId: "hdv-b" };
  const suKien = nhanSuKien({ ownerId: "chu", handlerTruoc: eHandlerTruoc ?? HANDLER_TRUOC_KHONG_BIET, handlerSau: daCoNguoiPhuTrach });
  assert.ok(!suKien.includes("cho-nhan"), `đơn HDV B đang phụ trách không được lộ cho-nhan cho HDV khác: ${JSON.stringify(suKien)}`);
});

test("hàng rào (2): gốc lắp ráp src/index.ts gọi nhanSuKien với handlerTruoc: e.handlerTruoc ?? HANDLER_TRUOC_KHONG_BIET (không viết tay giá trị mặc định)", () => {
  assert.match(
    INDEX_TS,
    /import\s*\{[^}]*\bHANDLER_TRUOC_KHONG_BIET\b[^}]*\}\s*from\s*"\.\/shared\/bang-tin"/,
    "src/index.ts phải import HANDLER_TRUOC_KHONG_BIET từ ./shared/bang-tin (một nguồn cho giá trị mặc định)",
  );
  const loiGoi = doiSoCacLoiGoi(INDEX_TS, "nhanSuKien");
  assert.equal(loiGoi.length, 1, `src/index.ts phải có ĐÚNG một lời gọi nhanSuKien( — thấy ${loiGoi.length}`);
  const doiSo = loiGoi[0]!.replace(/\s+/g, "");
  const m = /handlerTruoc:([^,{}]*(?:\{[^}]*\}[^,}]*)?)/.exec(doiSo);
  assert.ok(m, `lời gọi nhanSuKien ở src/index.ts phải truyền handlerTruoc: … — thấy: ${doiSo}`);
  assert.equal(
    m![1],
    "e.handlerTruoc??HANDLER_TRUOC_KHONG_BIET",
    `mặc định handlerTruoc ở nơi gọi thật phải là hằng dùng chung ('không biết'), không viết tay giá trị khác — thấy: ${m![1]}`,
  );
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

test("thongBaoNoi: văn phòng thấy đủ 4 loại có thông báo nổi (TD-4), câu đúng chữ, liên kết /order?id=", () => {
  assert.deepEqual(thongBaoNoi(vanPhong, suKien("nhan")), { cau: "Đơn TD1 vừa có người nhận", lienKet: "/order?id=order1" });
  assert.deepEqual(thongBaoNoi(vanPhong, suKien("giao")), { cau: "Đơn TD1 vừa đổi người phụ trách", lienKet: "/order?id=order1" });
  assert.deepEqual(thongBaoNoi(vanPhong, suKien("xac_nhan")), { cau: "Đơn TD1 đã được xác nhận", lienKet: "/order?id=order1" });
  assert.deepEqual(thongBaoNoi(vanPhong, suKien("huy")), { cau: "Đơn TD1 đã bị huỷ", lienKet: "/order?id=order1" });
});

test("thongBaoNoi: tao/tao_cho_nhan/sua/chuyen/tien không hiện thông báo nổi (chỉ làm mới màn hình; ADR-0045: lưu nháp không báo)", () => {
  assert.equal(thongBaoNoi(vanPhong, suKien("tao")), null);
  assert.equal(thongBaoNoi(vanPhong, suKien("tao_cho_nhan")), null);
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

test("thongBaoNoi: Hướng dẫn viên (không văn phòng) thấy các loại còn lại TRỪ 'nhan', liên kết /account", () => {
  // Đảo có chủ đích (vòng sửa 1, phát hiện I-3): chủ dự án quyết 2026-09-27 (AskUserQuestion, progress.md mục "Chủ đã quyết") — một HDV Nhận đơn ở hàng
  // chờ thì HDV khác KHÔNG thấy thông báo nổi, chỉ danh sách hàng chờ tự cập nhật. Trước vòng sửa ca này khoá { cau: "Đơn TD1 vừa có người nhận", … }.
  assert.equal(thongBaoNoi(huongDanVien, suKien("nhan")), null, "HDV không văn phòng: 'nhan' không thông báo nổi (quyết định chủ 2026-09-27)");
  assert.deepEqual(thongBaoNoi(huongDanVien, suKien("giao")), { cau: "Đơn TD1 vừa đổi người phụ trách", lienKet: "/account" });
  assert.equal(thongBaoNoi(huongDanVien, suKien("tao_cho_nhan")), null, "ADR-0045: lưu nháp không báo ai, kể cả HDV có dispatch.claim — chờ nhận nảy ra lúc Xác nhận");
});

// Vòng sửa 1 (I-3) — quyết định chủ dự án 2026-09-27: "nhan" (một người tự Nhận đơn ở hàng chờ — `thayDoiCuaHandler` chỉ trả "nhan" khi TRƯỚC chưa ai
// phụ trách và người mới = chính người gọi, tức luôn là ca (b) "đơn rời hàng chờ" của S20-8) KHÔNG hiện thông báo nổi cho kết nối nhận tin hàng chờ
// (`cho-nhan`) mà không xem mọi đơn (không `tat-ca`) — theo ĐÚNG `nhanKetNoi`, một nguồn. Kết nối đó nhận khung "nhan" chỉ vì (1) CHÍNH mình vừa nhận
// (không cần báo việc mình làm) hoặc (2) đang chờ nhận (chủ: chỉ danh sách tự cập nhật). Nhãn `cho-nhan` VẪN gắn như cũ (khung vẫn tới, trang vẫn tải lại
// danh sách hàng chờ) — chỉ bỏ CHỮ nổi. Mọi kết nối khác và mọi loại khác giữ nguyên: suy kỳ vọng từ `nhanKetNoi` + loại đối chứng `xac_nhan` (cùng
// tập người được thông báo nổi như "nhan" trước vòng sửa), không chép tay.
test("thongBaoNoi: 'nhan' → null ĐÚNG cho kết nối có cho-nhan mà không có tat-ca (theo nhanKetNoi); kết nối khác giữ như loại xac_nhan — 512 tập con quyền", () => {
  const tapCon = moiTapCon(PERMISSION_CODES as readonly PermissionCode[]);
  let soCaImLang = 0;
  for (const permissions of tapCon) {
    const staff = { id: "ket-noi", permissions };
    const nhan = nhanKetNoi(staff);
    const chiHangCho = nhan.includes("cho-nhan") && !nhan.includes("tat-ca");
    const kq = thongBaoNoi(staff, suKien("nhan"));
    const doiChung = thongBaoNoi(staff, suKien("xac_nhan"));
    if (chiHangCho) {
      soCaImLang++;
      assert.equal(kq, null, `permissions=${JSON.stringify(permissions)} nhanKetNoi=${JSON.stringify(nhan)}: 'nhan' không được nổi`);
    } else {
      assert.equal(kq === null, doiChung === null, `permissions=${JSON.stringify(permissions)}: 'nhan' phải cùng người nhận thông báo nổi với 'xac_nhan'`);
      if (kq !== null) assert.deepEqual(kq, { cau: "Đơn TD1 vừa có người nhận", lienKet: doiChung!.lienKet });
    }
  }
  assert.ok(soCaImLang > 0, "phải có ít nhất một tập quyền thật (FIELD) rơi vào ca im lặng — không thì bài này không canh gì");
});

test("thongBaoNoi: vòng sửa I-3 CHỈ đổi 'nhan' — HDV vẫn thấy giao/xac_nhan/huy; văn phòng/kế toán vẫn thấy 'nhan'; tao_cho_nhan không nổi (ADR-0045)", () => {
  for (const thayDoi of ["giao", "xac_nhan", "huy"] as const) {
    assert.notEqual(thongBaoNoi(huongDanVien, suKien(thayDoi)), null, `HDV × ${thayDoi} vẫn nổi`);
  }
  assert.equal(thongBaoNoi(huongDanVien, suKien("tao_cho_nhan")), null, "ADR-0045: lưu nháp không báo ai");
  assert.deepEqual(thongBaoNoi(vanPhong, suKien("nhan")), { cau: "Đơn TD1 vừa có người nhận", lienKet: "/order?id=order1" });
  assert.deepEqual(thongBaoNoi(ketToan, suKien("nhan")), { cau: "Đơn TD1 vừa có người nhận", lienKet: "/order?id=order1" });
  // nhanKetNoi (nguồn luật lai + nhãn cho-nhan) KHÔNG đổi: HDV vẫn nhận khung hàng chờ để trang tải lại danh sách.
  assert.deepEqual(nhanKetNoi(huongDanVien), ["cho-nhan", "nguoi:nv3"]);
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

test("duocThayTinDon: văn phòng/HDV thấy; Đối tác/Thực tập không; tin chờ nhận cần dispatch.claim", () => {
  const ai = (...p: PermissionCode[]) => ({ id: "x", permissions: p });
  assert.equal(duocThayTinDon(ai("SALES"), false), true);
  assert.equal(duocThayTinDon(ai("ACCOUNTING"), false), true);
  assert.equal(duocThayTinDon(ai("FIELD"), false), true);
  assert.equal(duocThayTinDon(ai("PARTNER"), false), false);
  assert.equal(duocThayTinDon(ai("INTERN"), false), false);
  assert.equal(duocThayTinDon(ai("SALES"), true), true); // SALES có dispatch.claim
  assert.equal(duocThayTinDon(ai("ACCOUNTING"), true), false); // Kế toán không nhận đơn
  assert.equal(duocThayTinDon(ai("FIELD"), true), true); // FIELD dispatch.claim = any (ADR-0030 S20-6/S20-12 — HDV tự nhận đơn chờ)
});

// ADR-0062 Đ3 + câu 5 = Có (NT-B9): mở hẹp CHỈ cho tin "đơn đổi sau xác nhận" — Đối tác / Thực tập là NGƯỜI LẬP. duocThayTinDon và thongBaoNoi KHÔNG đổi.
test("duocThayTinDoi: văn phòng + HDV như duocThayTinDon; Đối tác / Thực tập chỉ khi là người lập; tài xế, Nhân sự, Tài xế đối tác không", () => {
  const ai = (id: string, ...p: PermissionCode[]) => ({ id, permissions: p });
  for (const p of ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN", "FIELD"] as const) assert.equal(duocThayTinDoi(ai("x", p), "khac"), true, p);
  for (const p of ["PARTNER", "INTERN"] as const) {
    assert.equal(duocThayTinDoi(ai("x", p), "x"), true, `${p} người lập`);
    assert.equal(duocThayTinDoi(ai("x", p), "khac"), false, `${p} không phải người lập`);
    assert.equal(duocThayTinDon(ai("x", p), false), false, `${p}: duocThayTinDon giữ nguyên`);
  }
  for (const p of ["DRIVER", "DRIVER_PARTNER", "HR"] as const) assert.equal(duocThayTinDoi(ai("x", p), "x"), false, p);
  // thongBaoNoi vẫn loại Đối tác / Thực tập với MỌI loại thay đổi (Q-C ADR-0022 giữ — tin đổi không thông báo nổi).
  for (const p of ["PARTNER", "INTERN"] as const) {
    for (const thayDoi of THAY_DOI) assert.equal(thongBaoNoi(ai("x", p), { loai: "don", orderId: "o1", maDon: "TD1", thayDoi, luc: "2026-10-08T00:00:00.000Z" }), null, `${p} ${thayDoi}`);
  }
});

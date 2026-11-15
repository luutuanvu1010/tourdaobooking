// Danh mục trường chỉnh được của bảng điều khiển giao diện (ADR-0194 đợt 1, nhiệm vụ 1) + luật thuần cộng gộp nhiều quyền.
// Hàng rào: (a) mọi trường danh mục có thật trong `contracts.ts` (đọc tên từ interface); (b) mọi trường mà máy chủ BẮT BUỘC phải có mặt trong danh mục với
// cờ «không được ẩn / không được bỏ bắt buộc»; (c) luật cộng gộp: ẩn chỉ khi MỌI quyền ẩn; bỏ bắt buộc chỉ khi mọi quyền bỏ; dòng ngoài danh mục / cờ không cho thì bỏ qua.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHE_DO, DANH_MUC_UI, MAN_UI, giaiChinhSach, laCheDoHopLe, timMuc, traCuuChinhSach, mucChinhDuoc, nhanTruong, NHAN_MAN, NHAN_CHE_DO, cheDoChoChon, type DongChinhSach } from "./ui-truong.ts";
import { DIEU_KIEN, dieuKienCuaDichVu, laDieuKien, NHAN_DIEU_KIEN } from "./ui-dieu-kien.ts";
import { PERMISSION_CODES } from "./permissions.ts";

const CONTRACTS = readFileSync(new URL("./contracts.ts", import.meta.url), "utf8");

/**
 * Tên các trường khai trong thân `export interface <ten> … { … }` HOẶC `export type <ten> = [Pick<Gốc, "a" | "b"> &] { … }` của contracts.ts (đếm ngoặc nhọn; bỏ trường lồng sâu hơn mức 1).
 * Với `Pick<Gốc, …>`: mỗi tên được chọn PHẢI có trong `Gốc` (đệ quy), rồi cộng vào. Chỉ đọc khối `{}` ĐẦU TIÊN sau dấu `=` / tên (phần `& Omit<…>` phía sau không đọc).
 */
function truongCua(ten: string): Set<string> {
  const m = new RegExp(`export (?:interface ${ten}\\b[^{]*|type ${ten}\\s*=\\s*(?:Pick<\\s*(\\w+)\\s*,([^>]*)>\\s*&\\s*)?)\\{`).exec(CONTRACTS);
  assert.ok(m, `contracts.ts không có interface / type ${ten}`);
  const kq = new Set<string>();
  if (m[1]) {
    const goc = truongCua(m[1]);
    for (const t of m[2]!.matchAll(/"(\w+)"/g)) {
      assert.ok(goc.has(t[1]!), `${ten}: Pick<${m[1]}> chọn «${t[1]}» mà ${m[1]} không có`);
      kq.add(t[1]!);
    }
  }
  let sau = m.index + m[0].length;
  let muc = 1;
  let dong = "";
  for (; sau < CONTRACTS.length && muc > 0; sau++) {
    const c = CONTRACTS[sau]!;
    if (c === "{") muc++;
    else if (c === "}") muc--;
    if (muc === 1 && c !== "\n") dong += c;
    if (c === "\n" || muc === 0) {
      const t = /^\s*(?:readonly\s+)?([A-Za-z_]\w*)\??\s*:/.exec(dong);
      if (t) kq.add(t[1]!);
      dong = "";
    }
  }
  return kq;
}

test("(a) mọi mục danh mục có thật trong interface khai ở contracts.ts", () => {
  assert.ok(DANH_MUC_UI.length > 0);
  for (const m of DANH_MUC_UI) {
    const cac = truongCua(m.giaoDien);
    assert.ok(cac.has(m.truong), `danh mục ${m.man}/${m.truong}: interface ${m.giaoDien} không có trường này`);
  }
});

test("(a2) khoá (màn, trường) không trùng; màn nằm trong MAN_UI; tám màn (bốn của đợt 1 + bốn của ADR-0195) đủ mặt", () => {
  const thay = new Set<string>();
  for (const m of DANH_MUC_UI) {
    assert.ok((MAN_UI as readonly string[]).includes(m.man), `màn lạ ${m.man}`);
    const k = `${m.man}/${m.truong}`;
    assert.ok(!thay.has(k), `trùng ${k}`);
    thay.add(k);
    assert.ok(m.loai === "nhap" || m.loai === "xem");
  }
  assert.deepEqual([...MAN_UI].sort(), ["chi-tiet-don", "danh-sach-dich-vu", "danh-sach-don", "danh-sach-tai-khoan", "dich-vu-trong-don", "ho-tro", "quan-ly-doi-tac", "tao-don"]);
});

test("(b) trường máy chủ BẮT BUỘC / tiền / ngày đi / người phụ trách có mặt trong danh mục với cờ «không được ẩn, không được bỏ bắt buộc»", () => {
  // Khai ở ĐÂY (bài), không đọc từ danh mục: bớt một dòng khỏi danh mục hoặc bật cờ là bài đỏ.
  const MAY_CHU_BAT_BUOC: readonly (readonly [string, string])[] = [
    ["tao-don", "customerName"], ["tao-don", "customerPhone"], ["tao-don", "services"], ["tao-don", "discount"], ["tao-don", "declaredDeposit"],
    ["tao-don", "paymentTerm"], ["tao-don", "handlerStaffId"], ["tao-don", "bookerPartyId"], ["tao-don", "newBooker"],
    // ADR-0195 Đ3: ngày khởi hành và lựa chọn đón của dịch vụ (rà soát 10/11: trước đây chưa được canh), cùng bốn ô giờ chủ đưa ra khỏi đợt này.
    ["dich-vu-trong-don", "departDate"], ["dich-vu-trong-don", "pickupChoice"],
    ["dich-vu-trong-don", "departTime"], ["dich-vu-trong-don", "checkinDate"], ["dich-vu-trong-don", "checkinTime"], ["dich-vu-trong-don", "checkinPlace"],
  ];
  for (const [man, truong] of MAY_CHU_BAT_BUOC) {
    const m = timMuc(man, truong);
    assert.ok(m, `danh mục thiếu ${man}/${truong}`);
    assert.equal(m.anDuoc, false, `${man}/${truong} không được ẩn`);
    assert.equal(m.boBatBuocDuoc, false, `${man}/${truong} không được bỏ bắt buộc`);
  }
});

test("(b2) phần ADR nêu cho Tạo đơn: email, ghi chú khách, hành khách, ghi chú thanh toán ẩn được", () => {
  for (const t of ["customerEmail", "customerNote", "passengers", "paymentNote"]) assert.equal(timMuc("tao-don", t)?.anDuoc, true, t);
});

test("(b3) màn ngoài Tạo đơn / Dịch vụ trong đơn: chỉ cột xem (loai = xem), không trường nhập; nghi ngờ thì để không ẩn được", () => {
  for (const m of DANH_MUC_UI.filter((x) => x.man !== "tao-don" && x.man !== "dich-vu-trong-don")) assert.equal(m.loai, "xem", `${m.man}/${m.truong}`);
});

const dong = (truong: string, quyen: string, cheDo: string, man = "tao-don"): DongChinhSach => ({ man, truong, quyen, cheDo }) as DongChinhSach;
const kq = (ds: DongChinhSach[], quyen: string[]) => giaiChinhSach(ds, quyen as never);

test("(c1) bảng rỗng = không đổi gì", () => assert.deepEqual(kq([], ["SALES"]), []));

test("(c2) ẩn chỉ khi MỌI quyền của người đó ẩn trường", () => {
  const ds = [dong("passengers", "SALES", "AN")];
  assert.deepEqual(kq(ds, ["SALES"]), [{ man: "tao-don", truong: "passengers", an: true, batBuoc: false }]);
  assert.deepEqual(kq(ds, ["SALES", "ACCOUNTING"]), [], "quyền Kế toán không ẩn ⇒ vẫn thấy");
  assert.deepEqual(kq([...ds, dong("passengers", "ACCOUNTING", "AN")], ["SALES", "ACCOUNTING"]), [{ man: "tao-don", truong: "passengers", an: true, batBuoc: false }]);
  assert.deepEqual(kq(ds, ["ACCOUNTING"]), []);
});

test("(c3) bắt buộc (trường tuỳ chọn mặc định) chỉ khi MỌI quyền đòi", () => {
  const ds = [dong("customerEmail", "SALES", "BAT_BUOC")];
  assert.deepEqual(kq(ds, ["SALES"]), [{ man: "tao-don", truong: "customerEmail", an: false, batBuoc: true }]);
  assert.deepEqual(kq(ds, ["SALES", "ACCOUNTING"]), []);
});

test("(c4) trường ngoài danh mục, màn lạ, quyền lạ, chế độ lạ ⇒ bỏ qua dòng", () => {
  assert.deepEqual(kq([dong("khongCoTruongNay", "SALES", "AN")], ["SALES"]), []);
  assert.deepEqual(kq([dong("passengers", "SALES", "AN", "man-la")], ["SALES"]), []);
  assert.deepEqual(kq([dong("passengers", "KHONG_PHAI_QUYEN", "AN")], ["KHONG_PHAI_QUYEN"]), []);
  assert.deepEqual(kq([dong("passengers", "SALES", "ANH")], ["SALES"]), []);
});

test("(c5) cờ không cho ⇒ bỏ qua: không ẩn customerName/customerPhone/tiền/dịch vụ; không đòi bắt buộc trường đã bắt buộc", () => {
  for (const t of ["customerName", "customerPhone", "services", "discount", "declaredDeposit", "paymentTerm"]) {
    for (const cd of CHE_DO) assert.deepEqual(kq([dong(t, "SALES", cd)], ["SALES"]), [], `${t}/${cd}`);
  }
});

test("(c6) HIEN và TUY_CHON trên trường tuỳ chọn mặc định không đổi gì; chế độ chỉ áp được cho mục cho phép (laCheDoHopLe)", () => {
  assert.deepEqual(kq([dong("customerNote", "SALES", "HIEN"), dong("paymentNote", "SALES", "TUY_CHON")], ["SALES"]), []);
  assert.equal(laCheDoHopLe("tao-don", "passengers", "AN"), true);
  assert.equal(laCheDoHopLe("tao-don", "passengers", "BAT_BUOC"), true);
  assert.equal(laCheDoHopLe("tao-don", "customerName", "AN"), false);
  assert.equal(laCheDoHopLe("tao-don", "customerName", "HIEN"), true, "HIEN luôn hợp lệ cho mục có trong danh mục (đặt lại mặc định)");
  assert.equal(laCheDoHopLe("tao-don", "khongCo", "HIEN"), false);
  assert.equal(laCheDoHopLe("danh-sach-tai-khoan", "createdAt", "BAT_BUOC"), false, "cột xem không bắt buộc");
});

test("(c7) hợp của mọi quyền: kết quả không phụ thuộc thứ tự quyền / thứ tự dòng", () => {
  const ds = [dong("passengers", "SALES", "AN"), dong("passengers", "INTERN", "AN"), dong("customerNote", "SALES", "AN")];
  const a = kq(ds, ["SALES", "INTERN"]);
  const b = kq([...ds].reverse(), ["INTERN", "SALES"]);
  assert.deepEqual(a, b);
  assert.deepEqual(a.map((x) => x.truong), ["passengers"]);
  assert.ok(PERMISSION_CODES.length > 0);
});

test("(d) traCuuChinhSach: tra an / batBuoc theo (màn, trường); không có ⇒ false; danh sách rỗng ⇒ mặc định đầy đủ", () => {
  const rong = traCuuChinhSach([]);
  assert.equal(rong.an("tao-don", "passengers"), false);
  assert.equal(rong.batBuoc("tao-don", "customerEmail"), false);
  const t = traCuuChinhSach([{ man: "tao-don", truong: "passengers", an: true, batBuoc: false }, { man: "tao-don", truong: "customerEmail", an: false, batBuoc: true }]);
  assert.equal(t.an("tao-don", "passengers"), true);
  assert.equal(t.an("danh-sach-dich-vu", "passengers"), false, "khác màn");
  assert.equal(t.batBuoc("tao-don", "customerEmail"), true);
  assert.equal(t.batBuoc("tao-don", "passengers"), false);
});

test("(e) mọi mục chỉnh được có tên tiếng Việt, không lộ mã thô; mọi màn và chế độ có tên; mục không chỉnh được không xuất hiện ở màn chỉnh", () => {
  for (const man of MAN_UI) {
    assert.ok(NHAN_MAN[man].length > 0);
    for (const m of mucChinhDuoc(man)) {
      const ten = nhanTruong(m.man, m.truong);
      assert.ok(ten && ten.length > 0, `${m.man}/${m.truong} chưa có tên`);
      assert.doesNotMatch(ten, /[a-z][A-Z]|_|\b(?:id|code|passengers|customer)\b/, `tên ${ten} lộ mã`);
    }
  }
  for (const c of CHE_DO) assert.ok(NHAN_CHE_DO[c].length > 0);
  assert.deepEqual(mucChinhDuoc("tao-don").map((m) => m.truong).sort(), ["customerEmail", "customerNote", "passengers", "paymentNote"]);
  assert.deepEqual(mucChinhDuoc("dich-vu-trong-don").map((m) => m.truong).sort(), ["flightCode", "note", "paxOverride"]);
  assert.deepEqual(cheDoChoChon(timMuc("tao-don", "customerName")!), ["HIEN"], "không chỉnh được ⇒ chỉ HIEN");
  assert.deepEqual(cheDoChoChon(timMuc("danh-sach-tai-khoan", "createdAt")!), ["HIEN", "AN"], "cột xem: không có BAT_BUOC");
});


// ================= ADR-0195: màn mới, trường cấp dịch vụ, điều kiện =================================================================================================

/** Bảng đối chiếu «trường — interface DTO — tên khoá» của nhóm 1 + nhóm 2 (ADR-0195, «Phạm vi trường»). Khai TRONG bài: bớt hay đổi chỗ một dòng khỏi danh mục là bài đỏ. */
const BANG_DOI_CHIEU: readonly (readonly [man: string, truong: string, giaoDien: string, khoaGui?: string])[] = [
  ["dich-vu-trong-don", "flightCode", "LegInput", "services[].legs[].flightCode"],
  ["dich-vu-trong-don", "paxOverride", "LegInput", "services[].legs[].paxOverride"],
  ["dich-vu-trong-don", "note", "TripInput", "services[].note"],
  ["chi-tiet-don", "customerEmail", "OrderDto"], ["chi-tiet-don", "customerNote", "OrderDto"], ["chi-tiet-don", "paymentNote", "OrderDto"], ["chi-tiet-don", "staffName", "OrderDto"],
  ["danh-sach-don", "customerNote", "OrderSummaryDto"], ["danh-sach-don", "pickupPlace", "OrderSummaryTripDto"], ["danh-sach-don", "staffName", "OrderSummaryDto"],
  ["danh-sach-don", "createdAt", "OrderSummaryDto"], ["danh-sach-don", "pax", "OrderSummaryDto"],
  ["danh-sach-tai-khoan", "active", "StaffAccount"], ["danh-sach-tai-khoan", "passkeyCount", "StaffAccountDto"],
  ["ho-tro", "orderCode", "FeedbackTicketDto"],
];

test("(a3) bảng đối chiếu ADR-0195: mỗi trường có đúng trong danh mục, đúng interface, và có thật trong contracts.ts (kể cả qua Pick<…> của OrderSummaryDto)", () => {
  for (const [man, truong, giaoDien, khoaGui] of BANG_DOI_CHIEU) {
    const m = timMuc(man, truong);
    assert.ok(m, `danh mục thiếu ${man}/${truong}`);
    assert.equal(m.giaoDien, giaoDien, `${man}/${truong}`);
    assert.ok(truongCua(giaoDien).has(truong), `${giaoDien} không có ${truong}`);
    assert.equal(m.khoaGui, khoaGui, `${man}/${truong}: tên khoá gửi lên`);
  }
  assert.ok(truongCua("OrderSummaryDto").has("pax") && truongCua("OrderSummaryDto").has("customerNote"), "bài đọc được cả phần Pick lẫn phần {…} của alias");
  assert.ok(truongCua("ServiceInput").has("pickupChoice"), "bài đọc được type alias ServiceInput");
});

test("(a4) khoá gửi lên của trường cấp dịch vụ theo quy ước: services[].<trường> (TripInput / ServiceInput) hoặc services[].legs[].<trường> (LegInput)", () => {
  for (const m of DANH_MUC_UI.filter((x) => x.man === "dich-vu-trong-don")) {
    assert.ok(m.khoaGui, `${m.truong} thiếu khoaGui`);
    const dung = m.giaoDien === "LegInput" ? `services[].legs[].${m.truong}` : `services[].${m.truong}`;
    assert.equal(m.khoaGui, dung);
    assert.ok(["TripInput", "LegInput", "ServiceInput"].includes(m.giaoDien), m.truong);
  }
});

test("(b4) bốn ô giờ đợt này KHÔNG ẩn được (chủ đưa ra 10/11); cột xem của màn mới ẩn được; trường nhóm 2 ẩn được và cho điều kiện", () => {
  for (const t of ["departTime", "checkinDate", "checkinTime", "checkinPlace", "departDate", "pickupChoice"]) {
    assert.equal(timMuc("dich-vu-trong-don", t)?.anDuoc, false, t);
    assert.deepEqual(timMuc("dich-vu-trong-don", t)?.dieuKien ?? [], [], `${t} không nhận điều kiện`);
  }
  for (const t of ["flightCode", "paxOverride", "note"]) {
    assert.equal(timMuc("dich-vu-trong-don", t)?.anDuoc, true, t);
    assert.deepEqual(timMuc("dich-vu-trong-don", t)?.dieuKien, [...DIEU_KIEN], t);
    assert.equal(timMuc("dich-vu-trong-don", t)?.loai, "nhap");
  }
  for (const [man, truong] of BANG_DOI_CHIEU.filter((x) => x[0] !== "dich-vu-trong-don")) {
    assert.equal(timMuc(man, truong)?.loai, "xem", `${man}/${truong}`);
    assert.equal(timMuc(man, truong)?.anDuoc, true, `${man}/${truong}`);
    assert.deepEqual(timMuc(man, truong)?.dieuKien ?? [], [], `${man}/${truong}: màn chỉ xem không có điều kiện`);
  }
  assert.equal(laCheDoHopLe("dich-vu-trong-don", "paxOverride", "BAT_BUOC"), false, "số người chiều về không bắt buộc được (chỉ chặng VỀ)");
  // Người kiểm độc lập 10/11: máy chủ đòi số hiệu ở MỌI chặng khi «Bắt buộc», giao diện chỉ có ô ở chặng sân bay ⇒ chưa cho bắt buộc (tránh kẹt người lập).
  assert.equal(laCheDoHopLe("dich-vu-trong-don", "flightCode", "BAT_BUOC"), false, "số hiệu chuyến bay chưa bắt buộc được (chặng không ở sân bay không có ô)");
  assert.equal(laCheDoHopLe("dich-vu-trong-don", "departTime", "AN"), false);
});

test("(e2) mọi màn mới có tên tiếng Việt; mọi điều kiện có tên; mọi mục chỉnh được của màn mới có tên không lộ mã", () => {
  for (const man of ["dich-vu-trong-don", "chi-tiet-don", "danh-sach-don", "ho-tro"] as const) assert.ok(NHAN_MAN[man].length > 0, man);
  for (const dk of DIEU_KIEN) assert.ok(NHAN_DIEU_KIEN[dk].length > 0, dk);
  for (const [man, truong] of BANG_DOI_CHIEU) assert.ok(nhanTruong(man, truong), `${man}/${truong} chưa có tên`);
});

const dk = (truong: string, quyen: string, cheDo: string, dieuKien: string | null, man = "dich-vu-trong-don"): DongChinhSach => ({ man, truong, quyen, cheDo, dieuKien }) as DongChinhSach;

test("(f1) DIEU_KIEN khai đúng hai điều kiện; hàm thuần tính từ lựa chọn đón của dịch vụ; chưa chọn / vắng ⇒ không thoả điều kiện nào", () => {
  assert.deepEqual([...DIEU_KIEN], ["DICH_VU_KHONG_DON", "DICH_VU_CO_DON"]);
  assert.deepEqual(dieuKienCuaDichVu({ pickupChoice: "KHONG_DON" }), ["DICH_VU_KHONG_DON"]);
  assert.deepEqual(dieuKienCuaDichVu({ pickupChoice: "DON" }), ["DICH_VU_CO_DON"]);
  assert.deepEqual(dieuKienCuaDichVu({ pickupChoice: null }), []);
  assert.deepEqual(dieuKienCuaDichVu({}), []);
  assert.equal(laDieuKien("DICH_VU_KHONG_DON"), true);
  assert.equal(laDieuKien("KHAC"), false);
});

test("(f2) dòng CÓ điều kiện thắng khi dịch vụ thoả; dòng trống làm mặc định cho phần còn lại; chỉ điều kiện mục cho phép được tính", () => {
  const ds = [dk("note", "SALES", "AN", "DICH_VU_KHONG_DON")];
  assert.deepEqual(giaiChinhSach(ds, ["SALES"], null), [], "mặc định (không điều kiện): hiện đủ");
  assert.deepEqual(giaiChinhSach(ds, ["SALES"], "DICH_VU_KHONG_DON"), [{ man: "dich-vu-trong-don", truong: "note", dieuKien: "DICH_VU_KHONG_DON", an: true, batBuoc: false }]);
  assert.deepEqual(giaiChinhSach(ds, ["SALES"], "DICH_VU_CO_DON"), [], "dịch vụ có đón: dòng KHÔNG ĐÓN không áp");
  // dòng trống AN + dòng điều kiện HIEN: dịch vụ có đón vẫn hiện
  const ds2 = [dk("note", "SALES", "AN", null), dk("note", "SALES", "HIEN", "DICH_VU_CO_DON")];
  assert.deepEqual(giaiChinhSach(ds2, ["SALES"], null).map((x) => x.an), [true]);
  assert.deepEqual(giaiChinhSach(ds2, ["SALES"], "DICH_VU_KHONG_DON").map((x) => x.an), [true], "không có dòng điều kiện KHÔNG ĐÓN ⇒ theo dòng trống");
  assert.deepEqual(giaiChinhSach(ds2, ["SALES"], "DICH_VU_CO_DON"), [], "dòng có điều kiện HIEN thắng dòng trống AN");
  // điều kiện mục không cho phép (màn Tạo đơn, mục passengers không khai điều kiện) ⇒ bỏ qua dòng
  assert.deepEqual(giaiChinhSach([dk("passengers", "SALES", "AN", "DICH_VU_KHONG_DON", "tao-don")], ["SALES"], "DICH_VU_KHONG_DON"), []);
  assert.deepEqual(giaiChinhSach([dk("note", "SALES", "AN", "DIEU_KIEN_LA")], ["SALES"], "DIEU_KIEN_LA"), []);
});

test("(f3) cộng gộp quyền SAU khi chọn dòng theo điều kiện: ẩn chỉ khi MỌI quyền (mỗi quyền đã giải điều kiện) ẩn", () => {
  const ds = [dk("note", "SALES", "AN", "DICH_VU_KHONG_DON"), dk("note", "ACCOUNTING", "AN", null)];
  assert.deepEqual(giaiChinhSach(ds, ["SALES", "ACCOUNTING"], "DICH_VU_KHONG_DON").map((x) => x.an), [true], "SALES ẩn nhờ dòng điều kiện, ACCOUNTING ẩn nhờ dòng trống");
  assert.deepEqual(giaiChinhSach(ds, ["SALES", "ACCOUNTING"], "DICH_VU_CO_DON"), [], "có đón: SALES hiện ⇒ không ẩn");
  assert.deepEqual(giaiChinhSach(ds, ["SALES", "ACCOUNTING"], null), [], "không điều kiện: SALES hiện");
});

test("(f4) tra cứu cho giao diện: an(man, trường, điều kiện hiện có); dòng điều kiện HIEN đè dòng trống AN; gọi cũ không truyền điều kiện vẫn chạy", () => {
  const ds = [dk("note", "SALES", "AN", null), dk("note", "SALES", "HIEN", "DICH_VU_CO_DON"), dk("flightCode", "SALES", "AN", "DICH_VU_KHONG_DON")];
  const t = traCuuChinhSach(giaiChinhSach(ds, ["SALES"]));
  assert.equal(t.an("dich-vu-trong-don", "note"), true, "không truyền điều kiện = mặc định");
  assert.equal(t.an("dich-vu-trong-don", "note", ["DICH_VU_KHONG_DON"]), true);
  assert.equal(t.an("dich-vu-trong-don", "note", ["DICH_VU_CO_DON"]), false, "dòng điều kiện HIEN đè dòng trống AN dù kết quả bằng mặc định ‘hiện’");
  assert.equal(t.an("dich-vu-trong-don", "flightCode", ["DICH_VU_KHONG_DON"]), true);
  assert.equal(t.an("dich-vu-trong-don", "flightCode", ["DICH_VU_CO_DON"]), false);
  assert.equal(t.an("dich-vu-trong-don", "flightCode"), false);
  assert.equal(t.an("tao-don", "passengers"), false);
  assert.equal(traCuuChinhSach([{ man: "tao-don", truong: "passengers", an: true, batBuoc: false }]).an("tao-don", "passengers"), true, "dạng cũ không có khoá dieuKien");
});

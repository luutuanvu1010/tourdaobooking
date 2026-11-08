// Luật giờ của Trả sau (ADR-0172 Đ3, ADR-0173 Đ1 mục 3, Đ2 mục 1, Đ3 mục 2). Không I/O. Số của tiêu chí nghiệm thu ADR-0172 mục 4: 36 giờ, ân hạn 12 giờ.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GIO_TOI_DA, hanTraTu, hetAnHanTu, kiemNoiHan, moVeDuoc, ngayCuaMoc, quaHan, soNgayTuongThich, tinNhacDenLuc, trangThaiHan, kiemSoGio,
} from "./tra-sau.ts";

const T = "2026-11-06T03:00:00.000Z";
const sau = (gio: number): string => new Date(Date.parse(T) + gio * 3_600_000).toISOString();
const HAN = hanTraTu(T, 36);
const HET = hetAnHanTu(HAN, 12);

test("hai mốc: hạn trả = xác nhận + thời hạn; hết ân hạn = hạn trả + ân hạn (tính liên tục, ISO UTC)", () => {
  assert.equal(HAN, "2026-11-07T15:00:00.000Z");
  assert.equal(HET, "2026-11-08T03:00:00.000Z");
  // Liên tục qua cuối tuần, qua đêm: 72 giờ từ thứ Sáu 20:00 giờ VN tới thứ Hai 20:00 giờ VN.
  assert.equal(hanTraTu("2026-11-06T13:00:00.000Z", 72), "2026-11-09T13:00:00.000Z");
  assert.equal(hetAnHanTu(HAN, 0), HAN);
});

test("ADR-0172 tiêu chí 4: T+35 trong hạn, T+37 trong ân hạn (chưa chặn), T+49 quá hạn (chặn); hết nợ thì không quá hạn", () => {
  const tt = (gio: number, no = 1_000) => trangThaiHan({ hanTra: HAN, hetAnHan: HET, bayGio: sau(gio), no });
  assert.equal(tt(35), "trong_han");
  assert.equal(tt(36), "trong_han"); // đúng mốc hạn trả chưa quá
  assert.equal(tt(37), "an_han");
  assert.equal(tt(48), "an_han"); // đúng mốc hết ân hạn vẫn còn ân hạn
  assert.equal(tt(49), "qua_han");
  assert.equal(tt(49, 0), "trong_han");
  assert.equal(quaHan({ hanTra: HAN, hetAnHan: HET, bayGio: sau(37), no: 9 }), false, "trong ân hạn không chặn");
  assert.equal(quaHan({ hanTra: HAN, hetAnHan: HET, bayGio: sau(49), no: 9 }), true);
  assert.equal(quaHan({ hanTra: null, hetAnHan: null, bayGio: sau(999), no: 9 }), false, "đơn chưa có mốc không quá hạn");
});

test("so bằng dấu thời gian đầy đủ, không so theo ngày: cùng ngày VN mà khác giờ vẫn khác trạng thái", () => {
  // Hạn 15:00Z = 22:00 giờ VN; 21:59 giờ VN cùng ngày là trong hạn, 22:01 là ân hạn.
  assert.equal(trangThaiHan({ hanTra: HAN, hetAnHan: HET, bayGio: "2026-11-07T14:59:00.000Z", no: 1 }), "trong_han");
  assert.equal(trangThaiHan({ hanTra: HAN, hetAnHan: HET, bayGio: "2026-11-07T15:01:00.000Z", no: 1 }), "an_han");
});

test("moVeDuoc theo mốc hết ân hạn: trong ân hạn vẫn mở; hết ân hạn còn nợ thì vé chưa mở bị chặn, vé đã mở vẫn xem", () => {
  const ts = { hanTra: HAN, hetAnHan: HET, no: 5 };
  assert.equal(moVeDuoc({ thuDu: false, traSau: ts, veDaMo: false, bayGio: sau(40) }), true);
  assert.equal(moVeDuoc({ thuDu: false, traSau: ts, veDaMo: false, bayGio: sau(49) }), false);
  assert.equal(moVeDuoc({ thuDu: false, traSau: ts, veDaMo: true, bayGio: sau(49) }), true);
  assert.equal(moVeDuoc({ thuDu: false, traSau: { ...ts, no: 0 }, veDaMo: false, bayGio: sau(49) }), true, "thu đủ thì mở lại");
  assert.equal(moVeDuoc({ thuDu: false, traSau: null, veDaMo: false, bayGio: sau(1) }), false, "Trả trước phải thu đủ");
});

test("kiemSoGio: thời hạn từ 1, ân hạn từ 0, tối đa 365 ngày, phải là số nguyên", () => {
  assert.equal(GIO_TOI_DA, 8760);
  assert.equal(kiemSoGio(1, 1), true);
  assert.equal(kiemSoGio(0, 1), false);
  assert.equal(kiemSoGio(0, 0), true);
  assert.equal(kiemSoGio(8760, 1), true);
  assert.equal(kiemSoGio(8761, 0), false);
  assert.equal(kiemSoGio(1.5, 1), false);
  assert.equal(kiemSoGio("36", 1), false);
});

test("cột ngày cũ vẫn ghi để lùi bản an toàn: số ngày = trần giờ/24 kẹp 1..365; ngày của mốc theo giờ Việt Nam", () => {
  assert.equal(soNgayTuongThich(1), 1);
  assert.equal(soNgayTuongThich(36), 2);
  assert.equal(soNgayTuongThich(48), 2);
  assert.equal(soNgayTuongThich(8760), 365);
  assert.equal(ngayCuaMoc("2026-11-07T16:59:00.000Z"), "2026-11-07");
  assert.equal(ngayCuaMoc("2026-11-07T17:00:00.000Z"), "2026-11-08");
});

test("ADR-0173 Đ1 mục 3: nới hạn chỉ về sau, bắt buộc lý do, hết ân hạn tính lại theo số giờ ân hạn CỦA ĐƠN", () => {
  const moi = sau(60);
  const ok = kiemNoiHan({ hanCu: HAN, hetAnHanCu: HET, hanMoi: moi, lyDo: "Đại lý xin thêm hai ngày", bayGio: sau(50) });
  assert.deepEqual(ok, { ok: true, hanMoi: moi, hetAnHanMoi: sau(72) });
  assert.equal((kiemNoiHan({ hanCu: HAN, hetAnHanCu: HET, hanMoi: moi, lyDo: "  ", bayGio: sau(50) }) as { status: number }).status, 400);
  assert.equal((kiemNoiHan({ hanCu: HAN, hetAnHanCu: HET, hanMoi: sau(20), lyDo: "x", bayGio: sau(10) }) as { status: number }).status, 409, "rút ngắn");
  assert.equal((kiemNoiHan({ hanCu: HAN, hetAnHanCu: HET, hanMoi: HAN, lyDo: "x", bayGio: sau(10) }) as { status: number }).status, 409, "bằng hạn cũ");
  assert.equal((kiemNoiHan({ hanCu: HAN, hetAnHanCu: HET, hanMoi: "2026-11-09", lyDo: "x", bayGio: sau(10) }) as { status: number }).status, 400, "không phải mốc giờ đầy đủ");
  assert.equal((kiemNoiHan({ hanCu: HAN, hetAnHanCu: HET, hanMoi: sau(10 + 8761), lyDo: "x", bayGio: sau(10) }) as { status: number }).status, 400, "quá 365 ngày kể từ bây giờ");
  // Mốc gửi từ trình duyệt dạng khác (không có mili-giây) được chuẩn hoá về toISOString để so chuỗi đúng.
  const chuan = kiemNoiHan({ hanCu: HAN, hetAnHanCu: HET, hanMoi: "2026-11-09T03:00:00Z", lyDo: "x", bayGio: sau(10) });
  assert.equal((chuan as { hanMoi: string }).hanMoi, "2026-11-09T03:00:00.000Z");
});

test("ADR-0173 Đ3 mục 2: tin nhắc trước hạn 6 giờ và lúc quá hạn; đơn hết nợ không nhắc", () => {
  const nhac = (gio: number, no = 1) => tinNhacDenLuc({ hanTra: HAN, bayGio: sau(gio), no });
  assert.deepEqual(nhac(29), []);
  assert.deepEqual(nhac(30), ["TRUOC_HAN"]);
  assert.deepEqual(nhac(35), ["TRUOC_HAN"]);
  assert.deepEqual(nhac(36), ["TRUOC_HAN"]);
  assert.deepEqual(nhac(36.5), ["QUA_HAN"]);
  assert.deepEqual(nhac(100), ["QUA_HAN"]);
  assert.deepEqual(nhac(35, 0), []);
  assert.deepEqual(nhac(40, 0), []);
  assert.deepEqual(tinNhacDenLuc({ hanTra: null, bayGio: sau(40), no: 5 }), []);
});

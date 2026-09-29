// Luật thuần nhắc "gọi báo khách" (ADR-0051 GB1; TC-GB-3) — bảng ca: mục có / không theo bốn điều; một mục mỗi chặng; kiểm lệnh "Đã gọi báo" / "Bỏ đánh dấu".
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NHAC_GOI_SO_NGAY, NHAN_GIO_HEN_DOI, NHAN_TU_CHOI_GOI_BAO, daGoiBao, kiemBoDanhDau, kiemDaGoiBao, mocHienHanh, moTaDoiGio, mucGioHenDoi,
  type ChangGoiBao, type MocVao, type SuatGoiBao,
} from "./goi-bao.ts";

const G = (gio: string | null, ngay = "2026-09-30") => ({ ngay, gio });
const XEP: MocVao = { seq: 1, loai: "XEP", gio: G("09:00"), truoc: null, luc: "2026-09-29T20:00:00.000Z", nguoiId: "s-1" };
const chang = (gio: string | null, ngay = "2026-09-30"): ChangGoiBao => ({ legId: "leg-1", orderId: "o-1", orderCode: "TD-0018", chieu: "OUT", gio: G(gio, ngay) });
const suat = (v: Partial<SuatGoiBao> = {}): SuatGoiBao => ({ tripId: "t-1", maChuyen: "CX-3009-07", ngayChuyen: "2026-09-30", trangThaiChuyen: "PLANNED", trangThai: "WAITING", mo: true, ...v });
const muc = (c: ChangGoiBao | null, s: SuatGoiBao[] = [suat()], moc: MocVao[] = [XEP]) => mucGioHenDoi({ chang: c, moc, suat: s });

test("hằng + chữ: nhãn tiếng Việt, 14 ngày, câu từ chối không lộ mã", () => {
  assert.equal(NHAN_GIO_HEN_DOI, "Giờ hẹn đổi — gọi báo khách");
  assert.equal(NHAC_GOI_SO_NGAY, 14);
  for (const c of Object.values(NHAN_TU_CHOI_GOI_BAO)) assert.doesNotMatch(c, /[a-z]+_[a-z]+/);
});

test("TC-GB-3: bảng ca mục 'Giờ hẹn đổi'", () => {
  assert.equal(muc(chang("09:00")), null, "không đổi → không mục");
  const m = muc(chang("09:15"));
  assert.deepEqual(m, { legId: "leg-1", orderId: "o-1", orderCode: "TD-0018", chieu: "OUT", cu: G("09:00"), moi: G("09:15"), phienBan: 1, maChuyen: ["CX-3009-07"], ngayChuyen: "2026-09-30" },
    "09:00 → 09:15 trên chuyến 09:00–10:45 → CÓ mục (ca bản vẽ)");
  assert.deepEqual(muc(chang("09:00", "2026-10-01"))?.moi, G("09:00", "2026-10-01"), "đổi ngày → có mục");
  assert.deepEqual(muc(chang(null))?.moi, G(null), "giờ → chưa chốt giờ → có mục");
  assert.equal(muc(chang("09:00"), [suat()], [XEP, { ...XEP, seq: 2, loai: "DA_GOI", gio: G("09:15"), truoc: G("09:00") }, { ...XEP, seq: 3, loai: "BO_DANH_DAU", gio: G("09:00"), truoc: G("09:15") }]), null,
    "đổi rồi đổi về giờ mốc → không mục");
  for (const trangThai of ["BOARDED", "NO_SHOW", "CANCELLED_AT_STOP"] as const) assert.equal(muc(chang("09:15"), [suat({ trangThai })]), null, `khách ${trangThai} → không mục`);
  for (const trangThaiChuyen of ["ENDED", "ENDED_INTERRUPTED", "CANCELLED"] as const) assert.equal(muc(chang("09:15"), [suat({ trangThaiChuyen })]), null, `chuyến ${trangThaiChuyen}`);
  assert.ok(muc(chang("09:15"), [suat({ trangThaiChuyen: "RUNNING" })]), "chuyến đang chạy còn khách chờ → có mục");
  assert.equal(muc(chang("09:15"), [suat({ mo: false })]), null, "suất đã đóng (rút / dời khỏi mọi xe)");
  assert.equal(muc(null), null, "đơn huỷ / chặng đóng (không đọc được giờ hiện hành) → không mục");
  assert.equal(muc(chang("09:15"), [suat()], []), null, "chặng chưa có mốc → không mục");
  const hai = muc(chang("09:15"), [suat({ tripId: "t-2", maChuyen: "CX-3009-09" }), suat(), suat()]);
  assert.deepEqual([hai?.maChuyen, hai?.ngayChuyen], [["CX-3009-07", "CX-3009-09"], "2026-09-30"], "chặng trên hai chuyến → MỘT mục, hai mã chuyến");
});

test("mốc hiện hành = seq lớn nhất; dấu 'đã gọi báo' chỉ khi mốc cuối DA_GOI và giờ hiện hành = giờ của mốc", () => {
  const goi: MocVao = { ...XEP, seq: 2, loai: "DA_GOI", gio: G("09:15"), truoc: G("09:00"), nguoiId: "s-2" };
  assert.equal(mocHienHanh([goi, XEP])?.seq, 2);
  assert.equal(daGoiBao({ chang: chang("09:15"), moc: [XEP, goi], suat: [suat()] })?.seq, 2);
  assert.equal(daGoiBao({ chang: chang("09:30"), moc: [XEP, goi], suat: [suat()] }), null, "đổi giờ nữa sau khi bấm → không còn dấu (mục hiện lại)");
  assert.deepEqual(muc(chang("09:30"), [suat()], [XEP, goi])?.cu, G("09:15"), "mục hiện lại 'giờ đã báo → giờ mới'");
  assert.equal(daGoiBao({ chang: chang("09:15"), moc: [XEP, goi], suat: [suat({ trangThai: "BOARDED" })] }), null);
});

test("kiemDaGoiBao / kiemBoDanhDau: không còn mục → khong_con_can_goi; phiên bản / giờ màn gửi lệch → gio_hen_vua_doi", () => {
  const m = muc(chang("09:15"))!;
  assert.deepEqual(kiemDaGoiBao({ muc: m, phienBan: 1, gioMoi: G("09:15") }), { ok: true });
  assert.deepEqual(kiemDaGoiBao({ muc: null, phienBan: 1, gioMoi: G("09:15") }), { ok: false, ma: "khong_con_can_goi" });
  assert.deepEqual(kiemDaGoiBao({ muc: m, phienBan: 2, gioMoi: G("09:15") }), { ok: false, ma: "gio_hen_vua_doi" });
  assert.deepEqual(kiemDaGoiBao({ muc: m, phienBan: 1, gioMoi: G("09:10") }), { ok: false, ma: "gio_hen_vua_doi" });
  const goi: MocVao = { ...XEP, seq: 2, loai: "DA_GOI", gio: G("09:15"), truoc: G("09:00") };
  assert.deepEqual(kiemBoDanhDau({ moc: [XEP, goi], phienBan: 2, suat: [suat()] }), { ok: true });
  assert.deepEqual(kiemBoDanhDau({ moc: [XEP, goi], phienBan: 1, suat: [suat()] }), { ok: false, ma: "gio_hen_vua_doi" });
  assert.deepEqual(kiemBoDanhDau({ moc: [XEP], phienBan: 1, suat: [suat()] }), { ok: false, ma: "gio_hen_vua_doi" }, "dòng cuối không phải DA_GOI");
  assert.deepEqual(kiemBoDanhDau({ moc: [XEP, goi], phienBan: 2, suat: [suat({ trangThai: "BOARDED" })] }), { ok: false, ma: "khong_con_can_goi" });
});

test("moTaDoiGio (G-GB-3): cùng ngày chỉ giờ; khác ngày kèm dd/mm; NULL → 'chưa chốt giờ'", () => {
  assert.equal(moTaDoiGio(G("09:00"), G("09:15")), "09:00 → 09:15");
  assert.equal(moTaDoiGio(G("09:00", "2026-09-30"), G("09:15", "2026-10-01")), "30/09 09:00 → 01/10 09:15");
  assert.equal(moTaDoiGio(G("09:00"), G(null)), "09:00 → chưa chốt giờ");
});

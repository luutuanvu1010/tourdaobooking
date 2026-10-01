// Lịch sử mẫu đưa đón ở màn Danh mục (bản vẽ M7, docs/design/2026-10-01-dua-don-hanh-khach/) — cột "Lúc" và "Cũ → mới". Câu ví dụ của bản vẽ:
// "Một chiều → Hai chiều, giờ về 16:30" · "Không đưa đón → Một chiều, nơi trả gợi ý Ga cáp treo Vinpearl".
import { test } from "node:test";
import assert from "node:assert/strict";
import type { MauChangBanDto } from "./contracts.ts";
import { dongLichSuMauChang, lucLichSuMauChang, nhanCheDoCua } from "./lich-su-mau-chang.ts";

const GA = { id: "11111111-1111-4111-8111-111111111111", ten: "Ga cáp treo Vinpearl", dangDung: true };
const BEN = { id: "22222222-2222-4222-8222-222222222222", ten: "Bến cảng Vinpearl", dangDung: true };
const ban = (mode: MauChangBanDto["mode"], v: Partial<MauChangBanDto> = {}): MauChangBanDto => ({ mode, returnTimeHint: null, noiTraMacDinh: null, tuLuc: "2026-09-30T02:12:00.000Z", createdBy: null, ...v });
const doi = (ds: MauChangBanDto[]) => dongLichSuMauChang(ds).map((x) => x.doi);

test("đúng hai câu ví dụ của bản vẽ M7 (mới nhất trước; bản cũ nhất so với 'Không đưa đón')", () => {
  const ds = [ban("ROUND_TRIP", { returnTimeHint: "16:30", noiTraMacDinh: GA }), ban("ONE_WAY", { noiTraMacDinh: GA, tuLuc: "2026-09-12T07:30:00.000Z" })];
  assert.deepEqual(doi(ds), ["Một chiều → Hai chiều, giờ về 16:30", "Không đưa đón → Một chiều, nơi trả gợi ý Ga cáp treo Vinpearl"]);
});

test("ca bản vẽ không vẽ (giả định bề mặt, ghi ở nhật ký thi công): chỉ đổi giờ về, bỏ giờ về, đổi / bỏ nơi trả, điểm đã ngưng, lưu lại y nguyên, tắt đưa đón", () => {
  assert.deepEqual(doi([ban("ROUND_TRIP", { returnTimeHint: "17:00" }), ban("ROUND_TRIP", { returnTimeHint: "16:30" })]).at(0), "Giờ về 16:30 → 17:00");
  assert.deepEqual(doi([ban("ROUND_TRIP", { returnTimeHint: "17:00" }), ban("ROUND_TRIP")]).at(0), "Giờ về 17:00");
  assert.deepEqual(doi([ban("ROUND_TRIP"), ban("ROUND_TRIP", { returnTimeHint: "16:30" })]).at(0), "Bỏ giờ về 16:30");
  assert.deepEqual(doi([ban("ONE_WAY", { noiTraMacDinh: BEN }), ban("ONE_WAY", { noiTraMacDinh: GA })]).at(0), "Nơi trả gợi ý Ga cáp treo Vinpearl → Bến cảng Vinpearl");
  assert.deepEqual(doi([ban("ONE_WAY"), ban("ONE_WAY", { noiTraMacDinh: GA })]).at(0), "Bỏ nơi trả gợi ý Ga cáp treo Vinpearl");
  assert.deepEqual(doi([ban("ONE_WAY", { noiTraMacDinh: { ...GA, dangDung: false } })]).at(0), "Không đưa đón → Một chiều, nơi trả gợi ý Ga cáp treo Vinpearl (điểm đã ngưng dùng)");
  assert.deepEqual(doi([ban("ONE_WAY", { noiTraMacDinh: GA }), ban("ONE_WAY", { noiTraMacDinh: GA })]).at(0), "Lưu lại, không đổi");
  // Tắt đưa đón: giờ về và nơi trả mất theo — chỉ nêu chế độ.
  assert.deepEqual(doi([ban("NONE"), ban("ROUND_TRIP", { returnTimeHint: "16:30", noiTraMacDinh: GA })]).at(0), "Hai chiều → Không đưa đón");
  assert.deepEqual(doi([ban("NONE")]).at(0), "Lưu lại, không đổi", "bản đầu tiên là Không đưa đón = như chưa cài");
});

test("cột Lúc: dd/mm/yyyy hh:mm giờ Việt Nam; nhãn chip: chưa cài = Không đưa đón", () => {
  assert.equal(lucLichSuMauChang("2026-09-30T02:12:00.000Z"), "30/09/2026 09:12");
  assert.equal(lucLichSuMauChang("2026-09-30T17:05:00.000Z"), "01/10/2026 00:05", "qua nửa đêm giờ VN");
  assert.deepEqual(dongLichSuMauChang([ban("ONE_WAY")]).map((x) => x.luc), ["30/09/2026 09:12"]);
  assert.equal(nhanCheDoCua(undefined), "Không đưa đón");
  assert.equal(nhanCheDoCua("ROUND_TRIP"), "Hai chiều");
  assert.equal(nhanCheDoCua("ONE_WAY"), "Một chiều");
});

test("cột \"Người đổi\" (bản vẽ M7; nợ nhỏ 2026-10-01): createdBy ghép tên qua danh sách tài khoản như lịch sử nhóm — null → \"Hệ thống\", id lạ → \"Người dùng cũ\"", () => {
  const LAN = "33333333-3333-4333-8333-333333333333";
  const ten = new Map([[LAN, "Lan"]]);
  const ds = [ban("ROUND_TRIP", { createdBy: LAN }), ban("ONE_WAY", { createdBy: "44444444-4444-4444-8444-444444444444" }), ban("NONE")];
  assert.deepEqual(dongLichSuMauChang(ds, ten).map((x) => x.ai), ["Lan", "Người dùng cũ", "Hệ thống"]);
  assert.deepEqual(dongLichSuMauChang([ban("ONE_WAY", { createdBy: LAN })]).map((x) => x.ai), ["Người dùng cũ"], "chưa tải được danh sách tài khoản → Map rỗng");
});

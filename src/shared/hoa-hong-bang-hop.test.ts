// Đợt 2 của PR 2 «giao diện Hoa hồng đối tác»: luật thuần cho bảng «ai hưởng gì» (lọc, chính sách của loại, hiệu lực) và thân Đổi mức.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { CommissionRuleDto, MucTaListResponse } from "./contracts.ts";
import { CAU_THEO_LOAI_KHACH, chinhSachCuaLoai, locBangLoai, nhanHieuLuc } from "./hoa-hong-hien-thi.ts";
import { docThanDoiMuc } from "./so-dai-ly-nhap.ts";

const HOM_NAY = "2026-10-09";
const ten = {
  dichVu: (c: string) => ({ HONTAM: "Hòn Tằm" })[c],
  nhom: (c: string) => ({ DTH: "Du thuyền" })[c],
};
const muc = (o: Partial<CommissionRuleDto>): CommissionRuleDto => ({
  id: "m1", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY", ten: "Đại lý du lịch" }, phamVi: "ALL", catalogCode: null, groupCode: null, kieu: "RATE", tyLeBp: 1250, moiKhach: null,
  theoLoai: null, tuNgay: "2026-01-01", denNgay: null, ghiChu: null, conHieuLuc: true, ...o,
});

test("nhanHieuLuc — có ngày ngừng thì «đến», không thì «không thời hạn»", () => {
  assert.equal(nhanHieuLuc({ tuNgay: "2026-01-01", denNgay: null }), "Từ 01/01/2026 · không thời hạn");
  assert.equal(nhanHieuLuc({ tuNgay: "2026-01-01", denNgay: "2026-12-31" }), "Từ 01/01/2026 · đến 31/12/2026");
});

test("chinhSachCuaLoai — chỉ lấy gắn đang áp dụng của đúng loại", () => {
  const gan = (id: string, loai: string, conHieuLuc: boolean) => ({ id, loai: { code: loai, ten: loai }, muc: { code: "MT_A", ten: "Cấp 1" }, tuNgay: "2026-01-01", denNgay: null, conHieuLuc });
  const mt: MucTaListResponse = {
    homNay: HOM_NAY, loai: [], ganRieng: [],
    muc: [
      { code: "MT_A", ten: "Cấp 1", dangBat: true, dong: [], gan: [gan("g1", "L1", false), gan("g2", "L2", true), gan("g3", "L1", true)] },
      { code: "MT_B", ten: "Cấp 2", dangBat: true, dong: [], gan: [gan("g4", "L3", false)] },
    ],
  };
  assert.equal(chinhSachCuaLoai(mt, "L1")?.gan.id, "g3");
  assert.equal(chinhSachCuaLoai(mt, "L1")?.muc.code, "MT_A");
  assert.equal(chinhSachCuaLoai(mt, "L3"), null);
  assert.equal(chinhSachCuaLoai(mt, "L9"), null);
});

test("locBangLoai — mặc định bỏ dòng đã ngừng; ô tìm khớp tên loại hoặc dòng; loại không khớp ẩn", () => {
  const loai = [{ code: "A", ten: "Đại lý du lịch" }, { code: "B", ten: "Khách sạn" }];
  const dong = [
    muc({ id: "1", doiTuong: { loai: "VAI", code: "A", ten: "Đại lý du lịch" }, phamVi: "SERVICE", catalogCode: "HONTAM" }),
    muc({ id: "2", doiTuong: { loai: "VAI", code: "A", ten: "Đại lý du lịch" }, conHieuLuc: false, denNgay: "2026-01-31" }),
    muc({ id: "3", doiTuong: { loai: "VAI", code: "B", ten: "Khách sạn" } }),
    muc({ id: "4", doiTuong: { loai: "DOI_TAC", partyId: "p", ten: "Đối tác lẻ" } }),
  ];
  const ids = (r: { loai: { code: string }; dong: CommissionRuleDto[] }[]) => r.map((x) => `${x.loai.code}:${x.dong.map((d) => d.id).join(",")}`);
  assert.deepEqual(ids(locBangLoai(loai, dong, { chiConHieuLuc: true, tim: "" }, HOM_NAY, ten)), ["A:1", "B:3"]);
  assert.deepEqual(ids(locBangLoai(loai, dong, { chiConHieuLuc: false, tim: "" }, HOM_NAY, ten)), ["A:1,2", "B:3"]);
  assert.deepEqual(ids(locBangLoai(loai, dong, { chiConHieuLuc: true, tim: "khach san" }, HOM_NAY, ten)), ["B:3"]);
  assert.deepEqual(ids(locBangLoai(loai, dong, { chiConHieuLuc: true, tim: "hòn tằm" }, HOM_NAY, ten)), ["A:1"]);
  assert.deepEqual(ids(locBangLoai(loai, dong, { chiConHieuLuc: true, tim: "không có gì" }, HOM_NAY, ten)), []);
});

test("câu dưới ba ô theo loại khách đúng nguyên văn bàn giao", () => {
  assert.equal(CAU_THEO_LOAI_KHACH, "Nhóm khách nào không trả hoa hồng thì ghi 0; ba ô đều phải điền. Em bé không tính hoa hồng. Dịch vụ tính theo lượt (phao chuối, dù bay): dùng số của người lớn cho mỗi lượt.");
});

test("docThanDoiMuc — thân Đổi không mang đối tượng / phạm vi", () => {
  const f = { kieu: "RATE" as const, tyLe: "15", moiKhach: "", tuNgay: "2026-11-01", denNgay: "", ghiChu: "" };
  const kq = docThanDoiMuc(f);
  assert.ok(kq.ok);
  if (kq.ok) {
    assert.deepEqual(kq.body, { kieu: "RATE", tyLeBp: 1500, tuNgay: "2026-11-01" });
    for (const k of ["doiTuong", "phamVi", "catalogCode", "groupCode"]) assert.equal(k in kq.body, false);
  }
  const loi = docThanDoiMuc({ ...f, tyLe: "abc" });
  assert.ok(!loi.ok);
  if (!loi.ok) assert.equal(loi.loi[0]?.truong, "muc");
  assert.ok(!docThanDoiMuc({ ...f, tuNgay: "" }).ok);
  const theoLoai = docThanDoiMuc({ kieu: "PER_PAX", tyLe: "", moiKhach: "50.000", theoLoai: true, treEm: "30.000", nguoiCaoTuoi: "0", tuNgay: "2026-11-01", denNgay: "", ghiChu: "" });
  assert.ok(theoLoai.ok);
  if (theoLoai.ok) assert.deepEqual(theoLoai.body, { kieu: "PER_PAX", moiKhach: 50000, theoLoai: { treEm: 30000, nguoiCaoTuoi: 0 }, tuNgay: "2026-11-01" });
});

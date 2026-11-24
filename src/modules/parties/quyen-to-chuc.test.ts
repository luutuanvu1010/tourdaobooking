// Hàm kiểm vai trên đối tượng của tổ chức (ADR-0213 Đ6; chủ duyệt 16/11 «Duyệt cả hai»). Hàm thuần — bảng ca.
import { test } from "node:test";
import assert from "node:assert/strict";
import { quyenToChuc } from "./quyen-to-chuc.ts";

const toi = { id: "s-1", partyId: "p-1" };
const hlToi = { staffId: "s-1", personPartyId: "p-1" };

test("quyenToChuc: chỉ người quản lý CÓ HIỆU LỰC là chính người gọi mới «quanLy»; thành viên mở mới «thanhVien»; liên kết người quản lý (kể cả không hiệu lực) ⇒ «laQuanLyMo»", () => {
  const ca: [string, Parameters<typeof quyenToChuc>[0], Parameters<typeof quyenToChuc>[1], [boolean, boolean, boolean]][] = [
    ["người quản lý có hiệu lực", toi, { hl: hlToi, lienKetCuaToi: "MANAGER" }, [true, false, true]],
    ["người quản lý không hiệu lực", toi, { hl: null, lienKetCuaToi: "MANAGER" }, [false, false, true]],
    ["hl là người khác (dữ liệu lệch)", toi, { hl: { staffId: "s-2", personPartyId: "p-2" }, lienKetCuaToi: "MANAGER" }, [false, false, true]],
    ["hl trùng tài khoản nhưng khác hồ sơ", toi, { hl: { staffId: "s-1", personPartyId: "p-9" }, lienKetCuaToi: "MANAGER" }, [false, false, true]],
    ["hl là tôi nhưng không có liên kết của tôi", toi, { hl: hlToi, lienKetCuaToi: null }, [false, false, false]],
    ["thành viên", toi, { hl: { staffId: "s-2", personPartyId: "p-2" }, lienKetCuaToi: "MEMBER" }, [false, true, false]],
    ["người lạ", toi, { hl: { staffId: "s-2", personPartyId: "p-2" }, lienKetCuaToi: null }, [false, false, false]],
    ["tài khoản không hồ sơ", { id: "s-1", partyId: null }, { hl: hlToi, lienKetCuaToi: "MANAGER" }, [false, false, false]],
  ];
  for (const [ten, who, v, [quanLy, thanhVien, laQuanLyMo]] of ca) assert.deepEqual(quyenToChuc(who, v), { quanLy, thanhVien, laQuanLyMo }, ten);
});

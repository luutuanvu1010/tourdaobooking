// Cột «Cấp độ đại lý» ở Quản lý tài khoản (ADR-0155 Đ2; kế hoạch lượt 2 Task 4.2). CHỈ web/staff.ts nhập tệp này (bài src/cot-cap-dai-ly-noi-day.test.ts) — mã cột không vào gói trang khác.
// Gọi: GET /api/pricing/cap-hien-hanh (CapHienHanhResponse, một lần cho mọi hồ sơ), GET /api/pricing/muc-ta (cấp đang bật), GET /api/pricing/muc-rieng/:id/sua (ngày sớm nhất khi đã có đơn chụp)
// và ĐÚNG ba route ghi có sẵn của trang Hoa hồng (đặt, đổi, ngừng cấp riêng) — địa chỉ do `yeuCauGhiCap` (src/shared/cap-hien-hanh-hien-thi.ts) dựng, không chép tay ở đây.
// Giao diện KHÔNG tự tính cấp: chữ trong ô lấy từ `oCapCuaDong`, ngày mặc định từ `macDinhBangCap` — cả hai chỉ dịch kết quả máy chủ (từ đúng `tomTatHoaHongHoSo`). Máy chủ kiểm lại mọi lệnh ghi.
// Lỗi đọc KHÔNG chặn bảng tài khoản: ô hiện «—». Lỗi lúc lưu hiện ngay trong bảng bấm. Không confirm / alert / innerHTML; dựng bằng h().
import { ApiError, api, type Api, type StaffAccount } from "./api";
import { moBangTruot } from "./bang-truot";
import { h } from "./dom";
import { hienBaoNgan } from "./toast";
import { CHU_CAP, cauNgayMacDinh, macDinhBangCap, nhanTheoVaiTu, nutMoBang, oCapCuaDong, yeuCauGhiCap, type LenhGhiCap } from "../src/shared/cap-hien-hanh-hien-thi";
import type { CapHienHanhDto } from "../src/shared/contracts";

type DongTaiKhoan = Pick<StaffAccount, "permissions" | "partyId" | "fullName">;
const TRANG_HOA_HONG = "/hoa-hong";
/** Ngày hôm nay THEO MÁY CHỦ (giờ Việt Nam) của lần đọc gần nhất — bảng bấm cần để chọn ngày mặc định khi chưa có cấp riêng (khi đó không có lần gọi `…/sua` nào mang `homNay`). */
let homNayMay = "";

/** Nạp cấp hiện hành của mọi hồ sơ được hưởng. Lỗi bất kỳ ⇒ null (trang vẫn vẽ bảng, ô hiện «—»). Chỉ gọi khi `thayCotCap`. */
export async function taiCapHienHanh(): Promise<Map<string, CapHienHanhDto> | null> {
  try {
    const r = await api<Api.CapHienHanhResponse>("/api/pricing/cap-hien-hanh");
    homNayMay = r.homNay;
    return new Map(r.hoSo.map((x) => [x.partyId, x]));
  } catch {
    return null;
  }
}

/** Ô khi KHÔNG đọc được cấp (route lỗi): «—» cho dòng giữ quyền Đối tác, trống cho dòng khác. */
export function oCapKhongTai(dong: DongTaiKhoan): HTMLElement | null {
  return oCapCuaDong(dong, undefined) === null ? null : h("span", { class: "muted", "data-cap": "khong-tai" }, CHU_CAP.khongTaiDuoc);
}

const baoLoi = (el: HTMLElement, cau: string): void => {
  el.textContent = cau;
  el.hidden = false;
};
const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : CHU_CAP.khongKetNoi);

/**
 * Ô «Cấp độ đại lý» của MỘT dòng tài khoản (dùng cho cả hàng bảng lẫn thẻ điện thoại). null ⇒ dòng không giữ quyền Đối tác (ô trống).
 * `v` undefined ⇒ hồ sơ không mang vai trò được hưởng (hoặc chưa có hồ sơ) ⇒ «Chưa có vai trò», không bấm được.
 * `suaDuoc` = `suaDuocCot(người đang xem)`; `lamMoi` = nạp lại cấp rồi vẽ lại bảng sau khi lưu.
 */
export function oCap(dong: DongTaiKhoan, v: CapHienHanhDto | undefined, suaDuoc: boolean, lamMoi: () => Promise<void>): HTMLElement | null {
  const o = oCapCuaDong(dong, v);
  if (o === null) return null;
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  let chinh: HTMLElement;
  if (v !== undefined && nutMoBang(o, suaDuoc)) {
    const nut = h("button", { type: "button", class: "btn btn-link", "aria-label": `${CHU_CAP.nhanCot} của ${dong.fullName}: ${o.chu}` }, o.chu);
    nut.addEventListener("click", () => void moBangDatCap(dong, v, nut, loi, lamMoi));
    chinh = nut;
  } else {
    chinh = h("span", o.moBang ? null : { class: "muted" }, o.chu);
  }
  return h(
    "div",
    { class: "cot-cap", "data-nguon": v?.nguon ?? "CHUA_CO_VAI_TRO" },
    h("div", null, chinh),
    o.coMucRieng && h("div", null, h("a", { class: "badge badge-draft", href: TRANG_HOA_HONG }, CHU_CAP.coMucRieng)),
    o.theoVaiTu !== null && h("div", { class: "muted" }, nhanTheoVaiTu(o.theoVaiTu)),
    o.troHoaHong && h("div", null, h("a", { href: TRANG_HOA_HONG }, CHU_CAP.troHoaHong)),
    loi,
  );
}

/** Mở bảng bấm: chọn cấp + «Từ ngày» (+ «Dùng cấp theo vai trò» khi máy chủ nhận). Mọi dữ liệu của bảng tải ở đây; lỗi tải hiện ngay trong ô, không mở bảng. */
async function moBangDatCap(dong: DongTaiKhoan, v: CapHienHanhDto, opener: HTMLElement, loiO: HTMLElement, lamMoi: () => Promise<void>): Promise<void> {
  loiO.hidden = true;
  let mt: Api.MucTaListResponse;
  let xem: Api.SuaXemTruocResponse | null;
  try {
    [mt, xem] = await Promise.all([
      api<Api.MucTaListResponse>("/api/pricing/muc-ta"),
      v.rieng === null ? Promise.resolve(null) : api<Api.SuaXemTruocResponse>(`/api/pricing/muc-rieng/${encodeURIComponent(v.rieng.id)}/sua`),
    ]);
  } catch (err) {
    // 400 của `…/sua` = cấp riêng này không sửa được theo luật máy chủ ⇒ không cho đổi ở đây, trỏ trang Hoa hồng.
    return baoLoi(loiO, err instanceof ApiError && err.status === 400 && v.rieng !== null ? CHU_CAP.khongSuaDuoc : lyDoLoi(err));
  }
  const homNay = homNayMay !== "" ? homNayMay : (xem?.homNay ?? "");
  const m = macDinhBangCap(v, homNay, xem);
  const bat = mt.muc.filter((c) => c.dangBat);
  if (bat.length === 0 && !m.dungTheoVaiDuoc) return baoLoi(loiO, CHU_CAP.khongCoCapNaoBat);

  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const oMuc = h("select", { id: "cap-chon", class: "vc-input" }, h("option", { value: "" }, CHU_CAP.chonCap), ...bat.map((c) => h("option", { value: c.code }, c.ten)));
  const oTu = h("input", { id: "cap-tu-ngay", class: "vc-input", type: "date", value: m.tuNgay, min: m.tuNgay });
  const luu = h("button", { type: "button", class: "btn btn-primary btn-block" }, CHU_CAP.luu);
  const dung = m.dungTheoVaiDuoc ? h("button", { type: "button", class: "btn", id: "cap-dung-theo-vai-tro" }, CHU_CAP.dungTheoVaiTro) : null;
  const bang = moBangTruot({
    title: `${CHU_CAP.nhanCot}: ${dong.fullName}`,
    body: [
      h(
        "div",
        { class: "vc-gt" },
        h("div", { class: "vc-field" }, h("label", { for: "cap-chon" }, CHU_CAP.nhanCot), oMuc),
        h("div", { class: "vc-field" }, h("label", { for: "cap-tu-ngay" }, CHU_CAP.tuNgay), oTu, h("div", { class: "vc-hint" }, cauNgayMacDinh(m, v, homNay, xem))),
        dung && h("div", { class: "vc-field" }, dung, h("div", { class: "vc-hint" }, CHU_CAP.hieuLucNgayMai)),
        loi,
      ),
    ],
    foot: [luu],
    opener,
  });
  if (!bang) return;
  const gui = async (lenh: LenhGhiCap): Promise<void> => {
    loi.hidden = true;
    if (lenh.kieu !== "DUNG_THEO_VAI_TRO" && lenh.muc === "") return baoLoi(loi, CHU_CAP.chuaChonCap);
    const yc = yeuCauGhiCap(lenh, v, homNay);
    if (yc === null) return baoLoi(loi, CHU_CAP.khongSuaDuoc);
    bang.setBusy(true);
    luu.disabled = true;
    if (dung) dung.disabled = true;
    try {
      await api(yc.url, { method: "POST", body: yc.body });
    } catch (err) {
      bang.setBusy(false);
      luu.disabled = false;
      if (dung) dung.disabled = false;
      return baoLoi(loi, lyDoLoi(err));
    }
    bang.setBusy(false);
    bang.close(false); // lamMoi vẽ lại cả bảng nên nút mở không còn
    hienBaoNgan(CHU_CAP.luuXong);
    await lamMoi();
  };
  luu.addEventListener("click", () => void gui({ kieu: m.kieu, muc: oMuc.value, tuNgay: oTu.value }));
  dung?.addEventListener("click", () => void gui({ kieu: "DUNG_THEO_VAI_TRO" }));
  oMuc.focus();
}

// Cột «Cấp độ đại lý» ở Quản lý tài khoản (ADR-0155 Đ2; kế hoạch lượt 2 Task 4.2) và ô cấp của màn gom (đặc tả 2026-11-04-man-cap-dai-ly). CHỈ web/staff.ts, web/cap-dai-ly.ts nhập tệp này (bài src/cot-cap-dai-ly-noi-day.test.ts) — mã cột không vào gói trang khác.
// Gọi: GET /api/pricing/cap-hien-hanh (CapHienHanhResponse, một lần cho mọi hồ sơ), GET /api/pricing/muc-ta (cấp đang bật), GET /api/pricing/muc-rieng/:id/sua (ngày sớm nhất khi đã có đơn chụp)
// và ĐÚNG ba route ghi có sẵn của trang Hoa hồng (đặt, đổi, ngừng cấp riêng) — địa chỉ do `yeuCauGhiCap` (src/shared/cap-hien-hanh-hien-thi.ts) dựng, qua `thucHienLenhGhiCap`, không chép tay ở đây.
// Ngày «hôm nay» KHÔNG giữ từ lúc tải trang (trang mở xuyên nửa đêm sẽ cũ một ngày — kiểm độc lập N-1, ruling R12): bảng đặt / đổi lấy ngày máy chủ lúc MỞ (`ngayMayLucMo`), «Dùng cấp theo vai trò» đọc lại ngày máy chủ lúc BẤM.
// Giao diện KHÔNG tự tính cấp: chữ trong ô lấy từ `oCapCuaDong`, ngày mặc định từ `macDinhBangCap` — cả hai chỉ dịch kết quả máy chủ (từ đúng `tomTatHoaHongHoSo`). Máy chủ kiểm lại mọi lệnh ghi.
// Lỗi đọc KHÔNG chặn bảng tài khoản: ô hiện «—». Lỗi lúc lưu hiện ngay trong bảng bấm. Không confirm / alert / innerHTML; dựng bằng h().
import { ApiError, api, type Api, type StaffAccount } from "./api";
import { moBangTruot } from "./bang-truot";
import { h } from "./dom";
import { hienBaoNgan } from "./toast";
import { CHU_CAP, cauNgayMacDinh, macDinhBangCap, nhanTheoVaiTu, ngayMayLucMo, nutMoBang, oCapCuaDong, oCapCuaHoSo, thucHienLenhGhiCap, type OCap, type DuongGhiCap, type YDinhGhiCap } from "../src/shared/cap-hien-hanh-hien-thi";
import type { CapHienHanhDto } from "../src/shared/contracts";

type DongTaiKhoan = Pick<StaffAccount, "permissions" | "partyId" | "fullName">;
const TRANG_HOA_HONG = "/hoa-hong";

/** Nạp cấp hiện hành của mọi hồ sơ được hưởng. Lỗi bất kỳ ⇒ null (trang vẫn vẽ bảng, ô hiện «—»). Chỉ gọi khi `thayCotCap`. */
export async function taiCapHienHanh(): Promise<Map<string, CapHienHanhDto> | null> {
  try {
    const r = await api<Api.CapHienHanhResponse>("/api/pricing/cap-hien-hanh");
    return new Map(r.hoSo.map((x) => [x.partyId, x]));
  } catch {
    return null;
  }
}

/** Ô trong lúc cấp CHƯA về (lần nạp đầu, chạy song song với danh sách tài khoản): «Đang tải…» cho dòng giữ quyền Đối tác, trống cho dòng khác. */
export function oCapDangNap(dong: DongTaiKhoan): HTMLElement | null {
  return oCapCuaDong(dong, undefined) === null ? null : h("span", { class: "muted", "data-cap": "dang-tai", "aria-busy": "true" }, CHU_CAP.dangTai);
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
 * Sau khi lưu và vẽ lại cả bảng, nút đã mở bảng không còn: đưa tiêu điểm bàn phím về ô của ĐÚNG hồ sơ vừa lưu (nút nếu còn, không thì chính ô). Bảng máy tính và thẻ điện thoại cùng dựng ô;
 * lấy ô đang hiện (kiểm độc lập m-4).
 */
export function datTieuDiemODongCap(partyId: string): void {
  const o = [...document.querySelectorAll<HTMLElement>(".cot-cap")].find((x) => x.dataset.party === partyId && x.getClientRects().length > 0);
  if (o) (o.querySelector<HTMLElement>("button") ?? o).focus();
}

/**
 * Ô «Cấp độ đại lý» của MỘT dòng tài khoản (dùng cho cả hàng bảng lẫn thẻ điện thoại). null ⇒ dòng không giữ quyền Đối tác (ô trống).
 * `v` undefined ⇒ hồ sơ không mang vai trò được hưởng (hoặc chưa có hồ sơ) ⇒ «Chưa có vai trò», không bấm được.
 * `suaDuoc` = `suaDuocCot(người đang xem)`; `lamMoi(partyId)` = nạp lại cấp, vẽ lại bảng và đặt tiêu điểm về ô của hồ sơ đó, sau khi lưu.
 */
export function oCap(dong: DongTaiKhoan, v: CapHienHanhDto | undefined, suaDuoc: boolean, lamMoi: (partyId: string) => Promise<void>): HTMLElement | null {
  const o = oCapCuaDong(dong, v);
  if (o === null) return null;
  return dungO(o, dong.partyId, dong.fullName, v, suaDuoc, lamMoi);
}

/**
 * Ô cấp của MỘT hồ sơ ở màn «Cấp độ đại lý» (có cả hồ sơ chưa có tài khoản): cùng ô và cùng bảng đặt cấp với dòng tài khoản, nhưng không hỏi quyền của hồ sơ. Máy chủ đã chỉ trả hồ sơ đang mang vai trò được hưởng.
 */
export function oCapHoSo(ho: { partyId: string; ten: string }, v: CapHienHanhDto, suaDuoc: boolean, lamMoi: (partyId: string) => Promise<void>): HTMLElement {
  return dungO(oCapCuaHoSo(v), ho.partyId, ho.ten, v, suaDuoc, lamMoi);
}

/** Phần dựng chung của ô: chữ, nút mở bảng, nhãn phụ. `ten` chỉ để đọc cho người dùng (nhãn nút, tiêu đề bảng). */
function dungO(o: OCap, partyId: string | null, ten: string, v: CapHienHanhDto | undefined, suaDuoc: boolean, lamMoi: (partyId: string) => Promise<void>): HTMLElement {
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  let chinh: HTMLElement;
  if (v !== undefined && nutMoBang(o, suaDuoc)) {
    const nut = h("button", { type: "button", class: "btn btn-link", "aria-label": `${CHU_CAP.nhanCot} của ${ten}: ${o.chu}` }, o.chu);
    nut.addEventListener("click", () => void moBangDatCap(ten, v, nut, loi, lamMoi));
    chinh = nut;
  } else {
    chinh = h("span", o.moBang ? null : { class: "muted" }, o.chu);
  }
  return h(
    "div",
    { class: "cot-cap", tabindex: -1, "data-party": partyId ?? "", "data-nguon": v?.nguon ?? "CHUA_CO_VAI_TRO" },
    h("div", null, chinh),
    o.coMucRieng && h("div", null, h("a", { class: "badge badge-draft", href: TRANG_HOA_HONG }, CHU_CAP.coMucRieng)),
    o.theoVaiTu !== null && h("div", { class: "muted" }, nhanTheoVaiTu(o.theoVaiTu)),
    o.troHoaHong && h("div", null, h("a", { href: TRANG_HOA_HONG }, CHU_CAP.troHoaHong)),
    loi,
  );
}

/** Mở bảng bấm: chọn cấp + «Từ ngày» (+ «Dùng cấp theo vai trò» khi máy chủ nhận). Mọi dữ liệu của bảng tải ở đây; lỗi tải hiện ngay trong ô, không mở bảng. */
async function moBangDatCap(ten: string, v: CapHienHanhDto, opener: HTMLElement, loiO: HTMLElement, lamMoi: (partyId: string) => Promise<void>): Promise<void> {
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
  const homNay = ngayMayLucMo(xem, mt.homNay); // ngày máy chủ vừa trả lúc MỞ bảng, không phải ngày lúc tải trang
  const m = macDinhBangCap(v, homNay, xem);
  const bat = mt.muc.filter((c) => c.dangBat);
  if (bat.length === 0 && !m.dungTheoVaiDuoc) return baoLoi(loiO, CHU_CAP.khongCoCapNaoBat);

  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const oMuc = h("select", { id: "cap-chon", class: "vc-input" }, h("option", { value: "" }, CHU_CAP.chonCap), ...bat.map((c) => h("option", { value: c.code }, c.ten)));
  const oTu = h("input", { id: "cap-tu-ngay", class: "vc-input", type: "date", value: m.tuNgay, min: m.tuNgay });
  const luu = h("button", { type: "button", class: "btn btn-primary btn-block" }, CHU_CAP.luu);
  const dung = m.dungTheoVaiDuoc ? h("button", { type: "button", class: "btn", id: "cap-dung-theo-vai-tro" }, CHU_CAP.dungTheoVaiTro) : null;
  const bang = moBangTruot({
    title: `${CHU_CAP.nhanCot}: ${ten}`,
    body: [
      h(
        "div",
        { class: "vc-gt" },
        h("div", { class: "vc-field" }, h("label", { for: "cap-chon" }, CHU_CAP.nhanCot), oMuc),
        h("div", { class: "vc-field" }, h("label", { for: "cap-tu-ngay" }, CHU_CAP.tuNgay), oTu, h("div", { class: "vc-hint" }, cauNgayMacDinh(m, v, homNay, xem))),
        dung && h("div", { class: "vc-field" }, dung, h("div", { class: "vc-hint" }, CHU_CAP.dungTheoVaiTroLuuY)),
        loi,
      ),
    ],
    foot: [luu],
    opener,
  });
  if (!bang) return;
  const dep: DuongGhiCap = {
    // «Dùng cấp theo vai trò» không có ô ngày để người dùng thấy: đọc LẠI ngày máy chủ ngay lúc bấm bằng route có sẵn (mang `homNay`). Lỗi ⇒ null ⇒ hàm thuần không gửi gì.
    docNgayMay: async () => {
      if (v.rieng === null) return null;
      try {
        return (await api<Api.SuaXemTruocResponse>(`/api/pricing/muc-rieng/${encodeURIComponent(v.rieng.id)}/sua`)).homNay;
      } catch {
        return null;
      }
    },
    gui: async (yc) => {
      try {
        await api(yc.url, { method: "POST", body: yc.body });
        return null;
      } catch (err) {
        return lyDoLoi(err);
      }
    },
  };
  const gui = async (y: YDinhGhiCap): Promise<void> => {
    loi.hidden = true;
    if (y.kieu !== "DUNG_THEO_VAI_TRO" && y.muc === "") return baoLoi(loi, CHU_CAP.chuaChonCap);
    bang.setBusy(true);
    luu.disabled = true;
    if (dung) dung.disabled = true;
    const cauLoi = await thucHienLenhGhiCap(y, v, dep);
    bang.setBusy(false);
    if (cauLoi !== null) {
      luu.disabled = false;
      if (dung) dung.disabled = false;
      return baoLoi(loi, cauLoi);
    }
    bang.close(false); // lamMoi vẽ lại cả bảng nên nút mở không còn
    hienBaoNgan(CHU_CAP.luuXong);
    await lamMoi(v.partyId);
  };
  luu.addEventListener("click", () => void gui({ kieu: m.kieu, muc: oMuc.value, tuNgay: oTu.value }));
  dung?.addEventListener("click", () => void gui({ kieu: "DUNG_THEO_VAI_TRO" }));
  oMuc.focus();
}

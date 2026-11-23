// Khối «Mức giảm phí đưa đón» ở màn Cấp độ đại lý (ADR-0218 Đ1.4): mỗi cấp một số tiền trừ cho MỖI KHÁCH đi chung, áp chung mọi dịch vụ.
// Đợt 1 chỉ đặt và hiện số; máy tính phí dùng số này ở Đợt 2. Gọi: GET/POST /api/pricing/giam-phi-don, POST …/:id/ket-thuc. Máy chủ hỏi lại ô partner.commission.write. Không innerHTML.
import { ApiError, api, type Api } from "./api";
import { h, replaceChildren } from "./dom";
import { nhanDong } from "../src/shared/so-dai-ly-nhan";

const URL = "/api/pricing/giam-phi-don";
const LOI_MANG = "Không kết nối được. Kiểm tra mạng rồi thử lại.";
const tien = (n: number): string => `${nhanDong(n)} đ`;
const ngay = (iso: string): string => iso.split("-").reverse().join("/");
const homNay = (): string => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

export async function khoiGiamPhiDon(el: HTMLElement): Promise<void> {
  const ve = async (): Promise<void> => {
    let r: Api.GiamPhiDonResponse;
    try {
      r = await api<Api.GiamPhiDonResponse>(URL);
    } catch {
      el.hidden = true;
      return;
    }
    const loi = h("p", { class: "alert", role: "alert", hidden: true });
    const baoLoi = (err: unknown): void => {
      loi.textContent = err instanceof ApiError ? err.message : LOI_MANG;
      loi.hidden = false;
    };
    const hienHanh = (code: string): Api.GiamPhiDonDto | undefined => r.dong.filter((d) => d.tierCode === code && d.validToDate === null).sort((a, b) => a.validFromDate.localeCompare(b.validFromDate)).pop();
    const bang = h("div", { class: "dd-cot" });
    for (const c of r.cap) {
      const d = hienHanh(c.code);
      const vung = h("div", { class: "khoi dd-cot" });
      const dongTieuDe = h("div", null, h("strong", null, c.name), " · ", d ? `${tien(d.amount)} mỗi khách, từ ${ngay(d.validFromDate)}` : "Chưa đặt");
      const o = h("input", { class: "o", type: "text", inputmode: "numeric", id: `gpd-tien-${c.code}`, "aria-label": `Mức giảm mỗi khách của ${c.name}, đồng`, autocomplete: "off", value: d ? String(d.amount) : "" });
      const tu = h("input", { class: "o", type: "date", id: `gpd-ngay-${c.code}`, "aria-label": `Ngày bắt đầu mức giảm của ${c.name}`, min: homNay(), value: homNay() });
      const luu = h("button", { class: "nut", "data-cap": "chinh", type: "button" }, "Lưu mức giảm");
      luu.addEventListener("click", async () => {
        loi.hidden = true;
        const so = Number(o.value.replace(/[.\s]/g, ""));
        if (o.value.trim() === "" || !Number.isSafeInteger(so) || so < 0) return baoLoi(new ApiError(400, "invalid_input", "Nhập số tiền giảm là số nguyên, từ 0 đồng."));
        luu.disabled = true;
        try {
          const body: Api.GiamPhiDonRequest = { tierCode: c.code, amount: so, validFromDate: tu.value, ...(d ? { thayCho: { id: d.id, expectedUpdatedAt: d.updatedAt } } : {}) };
          await api<Api.GiamPhiDonGhiResponse>(URL, { method: "POST", body });
          await ve();
        } catch (err) {
          baoLoi(err);
          luu.disabled = false;
        }
      });
      vung.append(dongTieuDe);
      if (r.doiDuoc) {
        vung.append(h("div", { class: "toolbar" }, o, tu, luu));
        if (d && d.validFromDate <= homNay()) {
          const ketThuc = h("button", { class: "nut", "data-cap": "phu", type: "button" }, "Kết thúc mức giảm");
          ketThuc.addEventListener("click", async () => {
            loi.hidden = true;
            ketThuc.disabled = true;
            try {
              await api<Api.GiamPhiDonGhiResponse>(`${URL}/${encodeURIComponent(d.id)}/ket-thuc`, { method: "POST", body: { expectedUpdatedAt: d.updatedAt } });
              await ve();
            } catch (err) {
              baoLoi(err);
              ketThuc.disabled = false;
            }
          });
          vung.append(ketThuc);
        }
      }
      bang.append(vung);
    }
    replaceChildren(
      el,
      h("h2", { id: "gpd-heading" }, "Mức giảm phí đưa đón"),
      h("p", { class: "muted" }, "Số tiền trừ cho mỗi khách đi chung, theo cấp độ đại lý, áp cho mọi dịch vụ. Xe riêng không giảm. Giảm quá giá gốc thì phí là 0 đồng."),
      loi,
      r.cap.length === 0 ? h("p", { class: "muted" }, "Chưa có cấp độ đại lý nào đang bật.") : bang,
    );
    el.hidden = false;
  };
  await ve();
}

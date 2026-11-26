// Khối «Nhận đăng ký mới» của Toàn quyền ở trang «Phiếu đăng ký đối tác» (ADR-0219 Đ3), ngay trên hàng chờ phiếu đăng ký (ADR-0206 Đ9; PHU-LUC lượt A «Nhận đăng ký mới (Bật, Tắt)»; đợt 1 Task 12 vòng sửa 1).
// Chỉ hiện khi `can(staff, "registration.policy.write")` (chỉ Toàn quyền); máy chủ kiểm lại. Công tắc Bật / Tắt và ô chọn loại mở (bốn vai cá nhân, không bao giờ Công ty lữ hành);
// «Lưu» gửi kèm khoá lạc quan `dangHieuLuc` (dòng chính sách đang thấy); người khác vừa đổi ⇒ 409, nạp lại. Mỗi lần lưu là một dòng chính sách mới. Chỉ dựng DOM bằng h().
// Vỏ khối, nhóm chọn, thanh nút theo khung gốc (ADR-0222; đợt D1) — chỉ trang Phiếu đăng ký đối tác dùng tệp này.
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import { h, replaceChildren } from "./dom";
import { thanhNut } from "./khung";

type ChinhSach = { id: string | null; nhanDangKy: boolean; loaiMo: string[]; loaiCoThe: { ma: string; ten: string; laLoaiDoiTac: boolean; lyDoChuaMo: string | null }[]; coChinhSachRiengTu: boolean; tuLuc: string | null };

export function dungChinhSachDangKy(goc: HTMLElement, staff: Api.StaffProfile): void {
  if (!can(staff, "registration.policy.write")) return;
  const bao = h("p", { class: "hint", role: "status", id: "dk-cs-bao", hidden: true });
  const than = h("div", { id: "dk-cs-than", class: "luoi" }, h("p", { class: "muted" }, "Đang tải…"));
  const ve = (d: ChinhSach) => {
    const bat = h("input", { type: "radio", name: "dk-cs-cong-tac", value: "1", id: "dk-cs-bat", checked: d.nhanDangKy }) as HTMLInputElement;
    const tat = h("input", { type: "radio", name: "dk-cs-cong-tac", value: "0", id: "dk-cs-tat", checked: !d.nhanDangKy }) as HTMLInputElement;
    const o = d.loaiCoThe.map((l) => h("label", { class: "xm-ly-do" }, h("input", { type: "checkbox", value: l.ma, name: "dk-cs-loai", checked: d.loaiMo.includes(l.ma), disabled: l.lyDoChuaMo !== null }), h("span", null, l.lyDoChuaMo ? `${l.ten} — ${l.lyDoChuaMo}` : l.ten)));
    const luu = h("button", { type: "button", class: "nut", "data-cap": "chinh", id: "dk-cs-luu" }, "Lưu") as HTMLButtonElement;
    luu.addEventListener("click", async () => {
      luu.disabled = true;
      bao.hidden = true;
      try {
        const loaiMo = [...than.querySelectorAll<HTMLInputElement>("input[name=dk-cs-loai]:checked")].map((x) => x.value);
        const moi = await api<ChinhSach>("/api/dang-ky/chinh-sach", { method: "POST", body: { nhanDangKy: bat.checked, loaiMo, dangHieuLuc: d.id } });
        ve(moi);
        bao.textContent = moi.nhanDangKy ? "Đã lưu: đang nhận đăng ký mới." : "Đã lưu: đã tạm ngừng nhận đăng ký mới.";
      } catch (e) {
        bao.textContent = e instanceof ApiError ? e.message : "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
        if (e instanceof ApiError && e.status === 409 && e.code === "stale") void tai();
      } finally {
        bao.hidden = false;
        luu.disabled = false;
      }
    });
    replaceChildren(than,
      h("fieldset", { class: "nhom-chon" }, h("legend", null, "Nhận đăng ký mới"),
        h("label", { class: "xm-ly-do" }, bat, h("span", null, "Bật")), h("label", { class: "xm-ly-do" }, tat, h("span", null, "Tắt"))),
      h("fieldset", { class: "nhom-chon" }, h("legend", null, "Vai người dùng được đăng ký"), ...o),
      d.coChinhSachRiengTu ? null : h("p", { class: "xm-chan", id: "dk-cs-chua-rieng-tu" }, "Chưa có chính sách riêng tư đang hiệu lực nên chưa bật được. Hãy đăng chính sách riêng tư trước."),
      thanhNut(null, luu));
  };
  const tai = async () => {
    try { ve(await api<ChinhSach>("/api/dang-ky/chinh-sach")); } catch (e) { replaceChildren(than, h("p", { class: "o-loi" }, e instanceof ApiError ? e.message : "Không tải được.")); }
  };
  replaceChildren(goc,
    h("header", { class: "khoi-dau" }, h("h2", { id: "dk-cs-heading" }, "Nhận đăng ký mới")),
    h("p", { class: "khoi-mo-ta" }, "Tắt thì không ai mở được phiếu đăng ký mới; phiếu đã có vẫn đi tiếp. Mỗi lần lưu ghi một dòng chính sách mới, các con số khác giữ nguyên."),
    bao, than);
  goc.hidden = false;
  void tai();
}

// Màn «Hồ sơ tổ chức» của NGƯỜI QUẢN LÝ tổ chức (ADR-0213 Đ2, Đ5, Đ6; mốc B1 Task 14): ai là người quản lý, thành viên, gửi yêu cầu «Chuyển quyền quản lý» (chỉ gửi — văn phòng quyết, Đ6),
// gỡ thành viên, cấp độ đại lý của tổ chức (chỉ đọc) và công nợ Trả sau của tổ chức. Mở bằng `/to-chuc?id=<mã hồ sơ tổ chức>` từ trang Tôi.
//   GET /api/to-chuc/:id · GET /api/pricing/cap-cua-to-chuc/:id · GET /api/tra-sau/cua-toi (phần `toChuc`) · POST /api/to-chuc/:id/{yeu-cau-chuyen, go-thanh-vien}
// Màn chỉ ẩn / hiện; máy chủ kiểm lại vai người quản lý có hiệu lực ở mọi lời gọi. Số nợ và hạn do máy chủ tính, giờ theo giờ Việt Nam. Không innerHTML; dựng bằng h().
import { ApiError, api, type Api } from "./api";
import { hoiXacNhan } from "./bang-truot";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";
import { cauDonNo, cauGio } from "../src/shared/han-muc-tra-sau-hien-thi";
import { holdsPartner } from "../src/shared/permissions";
import { dongTien } from "../src/shared/tra-sau";
import { ngayVN } from "../src/shared/giay-to-hien-thi";
import { vnDateTimeText } from "../src/shared/vn-date";

const errorEl = byId("error");
const okEl = byId("ok");
const khungEl = byId("tc-khung");
const lyDoLoi = (e: unknown): string => (e instanceof ApiError ? e.message : "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
const hienLoi = (cau: string | null): void => { showError(errorEl, cau); if (cau) errorEl.scrollIntoView({ block: "nearest" }); };
const hienOk = (cau: string | null): void => { okEl.hidden = cau === null; okEl.textContent = cau ?? ""; };

const staff = await initShell();
const id = new URLSearchParams(location.search).get("id") ?? "";

/** Lệnh ghi: khoá nút trong lúc gửi; xong thì báo và nạp lại (người quản lý / thành viên đổi thì màn phải theo kịp). */
async function lenh(nut: HTMLButtonElement, viec: () => Promise<string>): Promise<void> {
  nut.disabled = true;
  hienLoi(null);
  hienOk(null);
  try {
    const cau = await viec();
    await nap();
    hienOk(cau);
  } catch (e) {
    hienLoi(lyDoLoi(e));
    nut.disabled = false;
  }
}

function veThanhVien(t: Api.ToChucDto): void {
  const dangCho = t.yeuCauChuyen[0] ?? null;
  const ds = t.thanhVien.length === 0
    ? [h("p", { class: "muted" }, "Tổ chức chưa có thành viên nào.")]
    : t.thanhVien.map((tv) => {
        const nutChuyen = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-chuyen": tv.partyId }, "Chuyển quyền quản lý") as HTMLButtonElement;
        nutChuyen.disabled = dangCho !== null;
        nutChuyen.addEventListener("click", () => void (async () => {
          const dongY = await hoiXacNhan({
            tieuDe: "Chuyển quyền quản lý",
            hauQua: `Tour Đảo sẽ xem yêu cầu và quyết định. Nếu được duyệt, ${tv.ten} làm người quản lý; văn phòng sẽ xem và quyết định bạn còn là thành viên hay không.`,
            nhanNguyHiem: "Chuyển quyền quản lý", nhanGiu: "Thôi", opener: nutChuyen,
          });
          if (!dongY) return;
          await lenh(nutChuyen, async () => { await api(`/api/to-chuc/${encodeURIComponent(id)}/yeu-cau-chuyen`, { method: "POST", body: { personPartyId: tv.partyId } }); return `Đã gửi yêu cầu chuyển quyền quản lý cho ${tv.ten}. Tour Đảo sẽ xử lý.`; });
        })());
        const nutGo = h("button", { type: "button", class: "nut", "data-tong": "nguy-hiem", "data-go": tv.partyId }, "Gỡ thành viên") as HTMLButtonElement;
        nutGo.addEventListener("click", () => void (async () => {
          const dongY = await hoiXacNhan({ tieuDe: "Gỡ thành viên", hauQua: `${tv.ten} sẽ không còn là thành viên của tổ chức và không đặt đơn thay mặt tổ chức được nữa.`, nhanNguyHiem: "Gỡ thành viên", nhanGiu: "Thôi", opener: nutGo });
          if (!dongY) return;
          await lenh(nutGo, async () => { await api(`/api/to-chuc/${encodeURIComponent(id)}/go-thanh-vien`, { method: "POST", body: { personPartyId: tv.partyId } }); return `Đã gỡ ${tv.ten} khỏi tổ chức.`; });
        })());
        return h("div", { class: "dong tc-dong", "data-thanh-vien": tv.partyId }, h("span", { class: "tc-dong-ten" }, tv.ten, " ", h("span", { class: "muted" }, `từ ${ngayVN(tv.tuNgay)}`)), nutChuyen, nutGo);
      });
  replaceChildren(byId("tc-tv"), ...ds,
    dangCho ? h("p", { class: "muted", id: "tc-yeu-cau" }, `Đang chờ Tour Đảo xử lý yêu cầu chuyển quyền quản lý cho ${dangCho.nguoiDeXuat.ten} (gửi ${vnDateTimeText(dangCho.luc)}).`) : null);
}

function veCongNo(r: Api.TraSauToChucDto | undefined): void {
  const goc = byId("tc-ts");
  if (!r || (!r.coHanMuc && r.dangNo <= 0)) { replaceChildren(goc, h("p", { class: "muted" }, "Tổ chức chưa được Trả sau và không còn nợ.")); return; }
  const dong1 = r.gioTra === null ? "Tổ chức được Trả sau." : `Tổ chức được Trả sau, trả trong ${cauGio(r.gioTra)} kể từ khi đơn được xác nhận${r.gioAnHan ? `, sau đó còn ${cauGio(r.gioAnHan)} ân hạn` : ""}.`;
  replaceChildren(goc,
    h("p", null, dong1),
    h("p", null, `Đang nợ ${dongTien(r.dangNo)}`),
    r.don.length === 0
      ? h("p", { class: "muted" }, "Không có đơn nào còn nợ.")
      : h("ul", null, ...r.don.map((d) => h("li", { "data-trang-thai": d.trangThai }, h("a", { href: `/order?id=${encodeURIComponent(d.orderId)}` }, d.maDon), ` · ${cauDonNo(d)}`))));
}

async function nap(): Promise<boolean> {
  try {
    const [tc, cap, ts] = await Promise.all([
      api<Api.ToChucResponse>(`/api/to-chuc/${encodeURIComponent(id)}`),
      api<Api.CapCuaToChucResponse>(`/api/pricing/cap-cua-to-chuc/${encodeURIComponent(id)}`).catch(() => null),
      api<Api.TraSauCuaToiResponse>("/api/tra-sau/cua-toi").catch(() => null),
    ]);
    const t = tc.toChuc;
    byId("tc-ten").textContent = t.ten;
    document.title = `${t.ten} — Island Booking System`;
    replaceChildren(byId("tc-ql"), h("p", null, t.nguoiQuanLy ? `${t.nguoiQuanLy.ten} (từ ${ngayVN(t.nguoiQuanLy.tuNgay)})` : "Chưa có"),
      h("p", { class: "muted" }, "Muốn đổi người quản lý, chọn một thành viên rồi bấm «Chuyển quyền quản lý». Tour Đảo xem yêu cầu và quyết định."));
    veThanhVien(t);
    replaceChildren(byId("tc-cap"), h("p", null, cap === null ? "Không xem được cấp lúc này." : cap.cap?.cap ? cap.cap.cap.ten : "Chưa có cấp"),
      h("p", { class: "muted" }, "Chỉ để xem. Cấp do Tour Đảo đặt."));
    veCongNo(ts?.toChuc.find((x) => x.partyId === id));
    khungEl.hidden = false;
    return true;
  } catch (e) {
    khungEl.hidden = true;
    hienLoi(e instanceof ApiError && e.status === 403 ? "Chỉ người quản lý của tổ chức xem được màn này." : lyDoLoi(e));
    return false;
  }
}

if (!holdsPartner(staff) || id === "") hienLoi("Màn này dành cho người quản lý của một tổ chức. Mở từ trang Tôi.");
else await nap();

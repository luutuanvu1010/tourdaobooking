// Bước 1 khung chung (N10, 13/11/2026): tệp ĐẦU TRANG, chạy đồng bộ trong <head> trước lần vẽ đầu (không phải module, không import gì ngoài hằng thuần). Đứng
// ngoài gói trang nên không cộng vào trần dung lượng các trang (src/goi-trang-nhe.test.ts). Ba việc, chỉ đọc / ghi con số + tên (không nội dung):
//  1. Dải đầu trang (tin quan trọng, nhắc bảo mật…) chèn muộn từng đẩy cả trang 53–61 px. Lần trước trong thẻ có dải ⇒ đặt `--dai-giu` + `data-giu-dai` lên <html>;
//     CSS giữ chỗ cho `#strips` (viết sẵn trong HTML) từ lần vẽ đầu; dải thật lấp đúng chỗ.
//  2. Ghi nhớ: theo dõi `#strips` — có `.dai` thì nhớ chiều cao + loại (`data-loai`) và thôi giữ chỗ; hết dải thì quên. Đang giữ chỗ mà sau CHO_DAI ms dải chưa về
//     (lần này không có dải) thì thả chỗ và quên (trang biểu mẫu không vẽ dải bảo mật: ở đó không quên trí nhớ «bao-mat»). Không cần mã nào trong gói trang.
//  3. Khối theo quyền vẽ sau mã trang (web/giu-khoi.ts ghi): lần trước trang này có khối nào ⇒ `data-giu-khoi`, CSS giữ chỗ.
import { KHOA_CAO_DAI, KHOA_KHOI } from "../src/shared/dai-chu.ts";

const html = document.documentElement;
const ss = (() => {
  try {
    return sessionStorage;
  } catch {
    return null; // sessionStorage bị chặn: không giữ chỗ, như trước
  }
})();
const tha = (): void => void delete html.dataset.giuDai;
/** Chờ dải tối đa bao lâu (ms) — dải về chậm nhất đo được ~2 s ở 4G chậm + CPU 4×; quá hạn coi là lần này không có dải. */
const CHO_DAI = 8000;
if (ss) {
  const nho = (): void => {
    const d = document.querySelector<HTMLElement>("#strips > .dai");
    if (d) {
      ss.setItem(KHOA_CAO_DAI, `${d.offsetHeight}|${d.dataset.loai ?? ""}`);
      tha();
    }
    else if (!(html.dataset.giuDai === "bao-mat" && document.body.dataset.khuon === "bieu-mau")) ss.removeItem(KHOA_CAO_DAI);
  };
  const [cao, loai] = (ss.getItem(KHOA_CAO_DAI) ?? "").split("|");
  if (+cao! > 0) {
    html.style.setProperty("--dai-giu", `${+cao!}px`);
    html.dataset.giuDai = loai || "co";
    setTimeout(() => {
      if (!document.querySelector("#strips > .dai")) nho();
      tha();
    }, CHO_DAI);
  }
  const khoi = ss.getItem(KHOA_KHOI + location.pathname);
  if (khoi) html.dataset.giuKhoi = khoi;

  let strips: Element | null = null;
  const theo = new MutationObserver(() => {
    if (!strips && (strips = document.getElementById("strips"))) {
      theo.disconnect();
      new MutationObserver(nho).observe(strips, { childList: true });
    }
  });
  theo.observe(document, { childList: true, subtree: true });
}

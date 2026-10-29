// Trang «Không có trang» (404): Workers Assets trả public/404.html cho mọi địa chỉ lạ ngoài /api (wrangler.jsonc `not_found_handling`). Chưa đăng nhập thì initShell tự đưa về /login.
import { homeRedirect } from "../src/shared/start-page";
import { initShell } from "./shell";
import { trangThaiToanTrang } from "./trang-thai-he-thong";

const staff = await initShell();
trangThaiToanTrang("404", { trangDau: homeRedirect(staff) ?? "/" });

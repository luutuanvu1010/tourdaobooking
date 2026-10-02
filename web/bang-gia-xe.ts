// Bảng giá thuê xe (/bang-gia-xe — ADR-0057 T1, ADR-0095 Q3; bản vẽ Đợt 4 màn 1a). Khung trang (Task G0); nội dung ở Task G1.
import { can } from "../src/shared/permissions";
import { byId } from "./dom";
import { datCrumb } from "./giay-to-ui";
import { initShell, showError } from "./shell";

const staff = await initShell();
datCrumb("Vận chuyển", "Bảng giá thuê xe");
if (!can(staff, "transport.rate.view")) showError(byId("error"), "Tài khoản này không xem được bảng giá thuê xe.");

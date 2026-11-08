// Bảy tài khoản thử dùng chung cho dev-iphone.mjs (D1 tạm) và lam-moi-dev.mjs (D1 Development). PIN ngẫu nhiên mỗi lần gọi; không lưu vào đâu.
import { randomInt } from "node:crypto";
import { isWeakPin } from "../src/modules/staff/rules.ts";

const pin = () => {
  for (;;) {
    const p = String(randomInt(100000, 1000000));
    if (!isWeakPin(p)) return p;
  }
};

export function taoTaiKhoanThu() {
  return [
    { name: "Admin Thử", phone: "0900000001", pin: pin(), permissions: ["SALES", "ADMIN"] },
    { name: "Nhân viên Thử", phone: "0900000002", pin: pin(), permissions: ["SALES"] },
    { name: "Toàn quyền Thử", phone: "0900000003", pin: pin(), permissions: ["SUPER_ADMIN"] },
    { name: "Kế toán Thử", phone: "0900000004", pin: pin(), permissions: ["ACCOUNTING"] },
    { name: "Hướng dẫn viên Thử", phone: "0900000005", pin: pin(), permissions: ["FIELD"] },
    { name: "Tài xế Thử", phone: "0900000006", pin: pin(), permissions: ["DRIVER"] },
    { name: "Tài xế đối tác Thử", phone: "0900000007", pin: pin(), permissions: ["DRIVER_PARTNER"] },
  ];
}

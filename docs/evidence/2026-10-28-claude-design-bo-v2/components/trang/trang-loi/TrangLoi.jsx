import React from "react";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";
import { Nut } from "../../hanh-dong/nut/Nut.jsx";

const LOAI = {
  "khong-quyen": { bt: "lock", tieuDe: "Bạn chưa có quyền xem trang này", cau: "Trang này dành cho vai trò khác. Nếu công việc cần, nhờ quản trị cấp thêm quyền.", phu: "Nhờ cấp quyền", ma: "403" },
  "khong-co-trang": { bt: "search", tieuDe: "Không có trang này", cau: "Địa chỉ có thể gõ sai, hoặc trang đã chuyển chỗ. Dữ liệu của bạn vẫn còn nguyên.", phu: "Báo địa chỉ sai", ma: "404" },
};

export function TrangLoi({ loai = "khong-co-trang", duongDan, onVeTrangChu, onPhu, className = "" }) {
  const l = LOAI[loai] || LOAI["khong-co-trang"];
  return (
    <main className={"ib-trang-bao " + className}>
      <span className="ib-trang-bao__bt"><BieuTuong ten={l.bt} co={24} /></span>
      <h1 className="ib-trang-bao__tieu-de">{l.tieuDe}</h1>
      <p className="ib-trang-bao__cau">{l.cau}</p>
      <div className="ib-trang-bao__nut">
        <Nut cap="chinh" bieuTuong="home" onClick={onVeTrangChu}>Về Trang chủ</Nut>
        <Nut cap="loi-nho" onClick={onPhu}>{l.phu}</Nut>
      </div>
      <p className="ib-trang-bao__ma">Mã {l.ma}{duongDan ? <React.Fragment> · <span className="ib-so">{duongDan}</span></React.Fragment> : null}</p>
    </main>
  );
}

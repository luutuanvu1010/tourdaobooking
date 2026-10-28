import React from "react";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";
import { BIEU_TUONG_TONG } from "../../hien-thi/huy-hieu/HuyHieu.jsx";
import { Nut } from "../../hanh-dong/nut/Nut.jsx";

export function DaiTrenTrang({ ton = "cat", chiTiet, hanhDong, thuGon, macDinhThuGon = false, onThuGon, children, className = "" }) {
  const [gonNoi, datGon] = React.useState(macDinhThuGon);
  const gon = thuGon ?? gonNoi;
  const id = React.useId();
  const doi = () => { const v = !gon; datGon(v); onThuGon && onThuGon(v); };
  return (
    <div className={"ib-dai-tren ib-dai-tren--" + ton + (gon ? " is-gon" : "") + " " + className} role={ton === "do" ? "alert" : "status"}>
      <div className="ib-dai-tren__ruot">
        <BieuTuong ten={BIEU_TUONG_TONG[ton]} className="ib-dai-tren__bt" />
        <div className="ib-dai-tren__chu">
          <p className="ib-dai-tren__cau">{children}</p>
          {!gon && chiTiet ? <p className="ib-dai-tren__chi-tiet" id={id}>{chiTiet}</p> : null}
        </div>
        {hanhDong ? <Nut cap="loi-nho" className="ib-dai-tren__hd" dangTai={hanhDong.dangTai} onClick={hanhDong.onClick}>{hanhDong.nhan}</Nut> : null}
        {chiTiet ? <Nut cap="loi-nho" bieuTuong="chevron-down" nhan={gon ? "Mở thông báo" : "Thu gọn thông báo"} aria-expanded={gon ? "false" : "true"} className={"ib-dai-tren__gap" + (gon ? "" : " is-mo")} onClick={doi} /> : null}
      </div>
    </div>
  );
}

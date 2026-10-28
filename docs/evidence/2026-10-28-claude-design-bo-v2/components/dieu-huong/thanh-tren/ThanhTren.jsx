import React from "react";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";
import { Nut } from "../../hanh-dong/nut/Nut.jsx";

export function ThanhTren({ ten = "Island Booking System", logo, onTaoDon, soThongBao = 0, chuTat = "", onTroLy, onChuong, onTaiKhoan, className = "" }) {
  return (
    <header className={"ib-thanh-tren " + className}>
      <a className="ib-thanh-tren__hieu" href="#" aria-label={ten + " — Trang chủ"}>
        {logo ? <img className="ib-thanh-tren__logo" src={logo} alt="" width="30" height="30" /> : null}
        <span className="ib-thanh-tren__ten">{ten}</span>
      </a>
      <div className="ib-thanh-tren__phai">
        {onTaoDon ? <Nut cap="san-ho" bieuTuong="plus" className="ib-thanh-tren__tao" onClick={onTaoDon}>Tạo đơn</Nut> : null}
        <button type="button" className="ib-thanh-tren__nut" aria-label="Trợ lý" onClick={onTroLy}><BieuTuong ten="chat" co={24} /></button>
        <button type="button" className="ib-thanh-tren__nut" aria-label={soThongBao ? "Thông báo, " + soThongBao + " tin chưa đọc" : "Thông báo"} onClick={onChuong}>
          <BieuTuong ten="bell" co={24} />
          {soThongBao ? <span className="ib-thanh-tren__so" aria-hidden="true">{soThongBao > 99 ? "99+" : soThongBao}</span> : null}
        </button>
        <button type="button" className="ib-thanh-tren__nut" aria-label="Tài khoản" onClick={onTaiKhoan}>
          {chuTat ? <span className="ib-thanh-tren__nguoi" aria-hidden="true">{chuTat}</span> : <BieuTuong ten="me" co={24} />}
        </button>
      </div>
    </header>
  );
}

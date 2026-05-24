@echo off
:: Cấu hình màu nền console (Nền đen, Chữ xanh lá cây)
color 0A
title E-Magazine Portal - Trinh Khoi Dong Nhanh

echo =================================================================
echo   KHOI DONG NHANH - ỨNG DỤNG E-MAGAZINE PORTAL (NEXT.JS)
echo =================================================================
echo.

:: Bước 1: Kiểm tra thư mục node_modules
echo [Buoc 1/2] Dang kiem tra cac thu vien phu thuoc (Dependencies)...
if not exist "node_modules\" (
    echo [!] Khong tim thay thu muc node_modules.
    echo [*] Dang chay "npm install" de tu dong cai dat cac thu vien. Vui long cho trong giay lat...
    call npm install
    if %errorlevel% neq 0 (
        echo [X] Cai dat cac goi thu vien that bai. Vui long kiem tra lai ket noi mang.
        goto error
    )
    echo [ok] Da cai dat cac thu vien phu thuoc thanh cong!
) else (
    echo [ok] Cac thu vien phu thuoc da san sang.
)
echo.

:: Bước 2: Tự động mở trình duyệt đến địa chỉ localhost
echo [Buoc 2/2] Dang mo trinh duyet den dia chi http://localhost:3000...
start http://localhost:3000
echo.

:: Bước 3: Khởi chạy Development Server
echo =================================================================
echo   DANG KHOI DONG MAY CHU PHAT TRIEN NEXT.JS (npm run dev)...
echo   (Nhan to hop phim Ctrl + C de tat may chu bat cu luc nao)
echo =================================================================
echo.
call npm run dev

:error
echo.
echo Gặp lỗi trong quá trình khởi chạy.
pause

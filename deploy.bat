@echo off
title Wangchu Deploy

cd /d D:\wangchu\frontend

echo ============================
echo Building...
echo ============================
call npm run build

echo ============================
echo Git Add...
echo ============================
call git add .

echo ============================
echo Commit...
echo ============================
call git commit -m "update homepage"

echo ============================
echo Push...
echo ============================
call git push

echo ============================
echo Deploy Complete!
echo ============================

timeout /t 2 >nul
exit
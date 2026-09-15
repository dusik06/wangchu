@echo off
setlocal EnableExtensions
title Wangchu Deploy

cd /d "D:\wangchu\frontend"
if errorlevel 1 goto :folder_error

rem Disable automatic Git housekeeping for this repository BEFORE any Git command.
git config --local gc.auto 0
git config --local gc.autoPackLimit 0
git config --local maintenance.auto false

echo.
echo ========================================
echo        WANGCHU DEPLOY START
echo ========================================
echo.

echo [1/4] Building...
call npm run build
if errorlevel 1 goto :build_error

echo.
echo [2/4] Git add...
git add -A
if errorlevel 1 goto :git_error

echo.
echo [3/4] Commit...
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "update homepage"
    if errorlevel 1 goto :git_error
) else (
    echo No changed files to commit.
)

echo.
echo [4/4] Push...
git push
if errorlevel 1 (
    echo First push failed. Retrying in 3 seconds...
    timeout /t 3 /nobreak >nul
    git push
    if errorlevel 1 goto :push_error
)

echo.
echo ========================================
echo        DEPLOY COMPLETE
echo ========================================
echo Vercel deployment has started.
echo.
pause
exit /b 0

:folder_error
echo ERROR: Cannot open D:\wangchu\frontend
pause
exit /b 1

:build_error
echo ERROR: npm run build failed. Nothing was pushed.
pause
exit /b 1

:git_error
echo ERROR: Git command failed.
pause
exit /b 1

:push_error
echo ERROR: git push failed twice.
pause
exit /b 1

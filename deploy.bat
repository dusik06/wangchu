@echo off
setlocal EnableExtensions
title Wangchu Deploy

cd /d "D:\wangchu\frontend"
if errorlevel 1 goto :folder_error

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
    rem Disable Git automatic gc/repack during commit.
    rem This avoids Windows pack .idx unlink prompts caused by another process holding the file.
    git -c gc.auto=0 commit -m "update homepage"
    if errorlevel 1 goto :git_error
) else (
    echo No changed files to commit.
)

echo.
echo [4/4] Push...
git -c gc.auto=0 push
if errorlevel 1 (
    echo First push failed. Retrying in 3 seconds...
    timeout /t 3 /nobreak >nul
    git -c gc.auto=0 push
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
echo.
echo ERROR: Cannot open D:\wangchu\frontend
pause
exit /b 1

:build_error
echo.
echo ERROR: npm run build failed.
echo Nothing was pushed.
pause
exit /b 1

:git_error
echo.
echo ERROR: Git command failed.
pause
exit /b 1

:push_error
echo.
echo ERROR: git push failed twice.
pause
exit /b 1

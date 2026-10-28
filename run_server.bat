@echo off
chcp 65001 >nul
title ЕГЭ 2026 Физика - Интерактивное пособие
echo Запуск локального сервера...
python "%~dp0run_server.py"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ОШИБКА] Не удалось запустить Python. Проверьте установку Python в системе.
    pause
)

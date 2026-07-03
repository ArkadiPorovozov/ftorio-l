@echo off
title MASTER CONSOLE
cd /d "%~dp0"
chcp 65001 >nul
node launcher.js
pause
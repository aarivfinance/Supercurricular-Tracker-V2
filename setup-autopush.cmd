@echo off
rem Double-click to make autopush start by itself whenever you log in.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-autopush.ps1" -NoPause

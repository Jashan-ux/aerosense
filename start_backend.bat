@echo off
echo Starting Wind Farm A Dashboard Backend...
echo.
echo Backend:   http://127.0.0.1:8000
echo API Docs:  http://127.0.0.1:8000/docs
echo WebSocket: ws://127.0.0.1:8000/ws/live
echo.
cd /d "%~dp0backend"
python main.py

@echo off
echo Starting Venus Backend...
python -m uvicorn app.main:app --reload
pause

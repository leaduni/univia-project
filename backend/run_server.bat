@echo off
echo Starting Univia Backend...
python -m uvicorn app.main:app --reload
pause

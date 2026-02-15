@echo off
echo Starting Univia Backend...
python -m uvicorn main:app --reload
pause

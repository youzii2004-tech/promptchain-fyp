@echo off
title PromptChain IDE Toolkit - Launcher

echo ==========================================
echo Starting PromptChain IDE Toolkit
echo ==========================================
echo.

echo [1/2] Starting FastAPI Backend...
:: Open a new command window, navigate to backend, activate virtual environment, and start uvicorn
start "PromptChain Backend" cmd /k "cd backend && call venv\Scripts\activate.bat && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo [2/2] Starting React Frontend...
:: Open a new command window, navigate to frontend, and start Vite dev server
start "PromptChain Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo Services are starting in separate windows!
echo ==========================================
echo.
echo Frontend (UI):   http://localhost:5173
echo Backend (API):   http://localhost:8000
echo.
echo Press any key to exit this launcher (the services will keep running in their own windows).
pause > nul

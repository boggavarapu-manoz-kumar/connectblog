@echo off
echo Starting ConnectBlog...

:: Kill existing node processes on 3000 and 5000 if needed
:: taskkill /F /FI "LISTENING" /IM node.exe 2>NUL

echo Starting Backend on Port 5000...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    call npm install
)
start "ConnectBlog Backend" cmd /c "npm run dev"

echo Waiting for backend to start...
timeout /t 5 /nobreak > NUL

echo Starting Frontend on Port 3000...
cd ../frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)
start "ConnectBlog Frontend" cmd /c "npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Access the app at http://localhost:3000
echo.
pause

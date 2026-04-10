@echo off
echo.🍕 Freemato Setup Script
echo.============================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
    echo.✅ Node.js installed: %NODE_VER%
) else (
    echo.❌ Node.js is not installed
    echo.   Download from: https://nodejs.org/
    exit /b 1
)

:: Check npm
where npm >nul 2>nul
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('npm --version') do set NPM_VER=%%v
    echo.✅ npm installed: %NPM_VER%
) else (
    echo.❌ npm is not installed
    exit /b 1
)

:: Check MongoDB
where mongod >nul 2>nul
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('mongod --version ^| findstr "db version"') do set MONGO_VER=%%v
    echo.✅ MongoDB installed: %MONGO_VER%
) else (
    echo.⚠️  MongoDB not found in PATH
    echo.   If MongoDB is installed, you may need to add it to PATH
    echo.   Download from: https://www.mongodb.com/try/download/community
)

echo.
echo.📦 Installing dependencies...
call npm install

echo.
echo.📝 Setting up environment file...
if not exist .env (
    copy .env.example .env >nul
    echo.✅ Created .env file from template
    echo.   Database endpoints and ports are set by default.
) else (
    echo.ℹ️  .env file already exists
)

echo.
echo.📁 Creating public directory...
if not exist public mkdir public
echo.✅ Public directory ready

echo.
echo.✨ Setup Complete!
echo.
echo.Next steps:
echo.1. Ensure MongoDB is running before proceeding. If not, start it:
echo.   "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath="C:\data\db"
echo.
echo.2. Start the Ngrok server to expose your localhost to WhatsApp/Telegram:
echo.   ngrok http 3000
echo.
echo.3. Open a new terminal and Start the Freemato Backend Server:
echo.   npm start
echo.
echo.4. Complete your configuration!
echo.   Open your browser and navigate to the Onboarding Wizard:
echo.   👉 http://localhost:3000/restaurant
echo.
echo.🎉 Everything including Ngrok, Telegram, and WhatsApp will be configured inside the UI wizard!
pause

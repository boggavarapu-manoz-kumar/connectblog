#!/bin/bash

# Get the directory where the script is located
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"

echo "🚀 Starting ConnectBlog..."
echo "📂 Project Root: $BASE_DIR"

# Function to cleanup background processes on exit
cleanup() {
    echo "🛑 Stopping servers..."
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit
}

# Trap SIGINT (Ctrl+C) to run cleanup
trap cleanup SIGINT

# Kill any existing node processes on ports 3000 and 5000 (optional cleanup)
echo "🧹 Cleaning up previous processes..."
lsof -ti:5000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Start Backend
echo "Backend: Starting on Port 5000..."
cd "$BASE_DIR/backend"
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi
npm run dev > "$BASE_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait a bit for backend to initialize
echo "⏳ Waiting for backend..."
sleep 5

# Start Frontend
echo "Frontend: Starting on Port 3000..."
cd "$BASE_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi
npm run dev > "$BASE_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo "✅ Both servers are running!"
echo "Backend logs: $BASE_DIR/backend.log"
echo "Frontend logs: $BASE_DIR/frontend.log"
echo "🌐 Access the app at http://localhost:3000"

# Keep script running to maintain processes
wait

#!/usr/bin/env bash

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Install backend deps
cd backend
pip install -r requirements.txt
cd ..

# Serve frontend and start Flask
cd ..
npx serve -s frontend/build &
python backend/app.py
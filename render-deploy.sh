#!/usr/bin/env bash

# Go to frontend and build
cd frontend
npm install
npm run build
cd ..

# Start Flask backend
cd backend
pip install -r requirements.txt

# Run frontend and backend together
cd ..
npx serve -s frontend/build & python backend/app.py
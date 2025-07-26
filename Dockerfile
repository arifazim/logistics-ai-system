# ----------- FRONTEND BUILD STAGE -----------
    FROM node:18 AS frontend-build

    WORKDIR /app/frontend
    
    # Copy package files
    COPY frontend/package*.json ./
    RUN npm install --legacy-peer-deps
    
    # Copy source and build
    COPY frontend/ ./
    RUN npm run build
    
    # ----------- BACKEND BUILD STAGE -----------
    FROM python:3.9-alpine AS backend-build
    
    WORKDIR /app/backend
    
    # Install build dependencies
    RUN apk add --no-cache build-base python3-dev libffi-dev
    
    # Create virtual environment
    RUN python3 -m venv /venv
    
    # Upgrade pip and install dependencies
    COPY backend/requirements.txt .
    RUN /venv/bin/pip install --upgrade pip setuptools wheel && \
        /venv/bin/pip install --no-cache-dir -r requirements.txt
    
    # Copy backend source code
    COPY backend/ .
    
    # ----------- FINAL STAGE -----------
    FROM nginx:alpine AS production
    
    WORKDIR /app
    
    # Copy frontend build
    COPY --from=frontend-build /app/frontend/build /usr/share/nginx/html
    
    # Configure Nginx
    RUN rm -f /etc/nginx/conf.d/default.conf
    COPY ./nginx.conf /etc/nginx/conf.d/default.conf
    
    # Copy backend code and virtual environment
    COPY --from=backend-build /app/backend /app/backend
    COPY --from=backend-build /venv /venv
    
    # ✅ DEBUG: Verify that /venv/bin/python exists
    RUN if [ ! -f /venv/bin/python ]; then \
    echo "❌ ERROR: /venv/bin/python does NOT exist!" && \
    ls -la /venv/bin || \
    exit 1; \
    else \
    echo "✅ /venv/bin/python exists"; \
    fi
    
    # Install Supervisor
    RUN apk add --no-cache supervisor python3 libffi
    
    # Ensure virtual environment is used
    ENV PATH="/venv/bin:$PATH"
    
    # Copy Supervisor config
    COPY ./supervisord.conf /etc/supervisord.conf
    
    # Expose port (Render uses dynamic port, but Nginx listens on 80)
    #EXPOSE 80
    
    # Start Supervisor
    CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
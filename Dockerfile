# ----------- FRONTEND BUILD STAGE -----------
    FROM node:18 AS frontend-build
    WORKDIR /app/frontend
    COPY frontend/package*.json ./
    RUN npm install --legacy-peer-deps
    COPY frontend/ ./
    RUN npm run build
    
    # ----------- BACKEND BUILD STAGE -----------
    FROM python:3.9-alpine AS backend-build
    
    WORKDIR /app/backend
    
    # Install build dependencies
    RUN apk add --no-cache build-base python3-dev libffi-dev
    
    # Set up virtual environment to avoid PEP 668 issues
    RUN python3 -m venv /venv
    ENV PATH="/venv/bin:$PATH"
    
    # Install Python packages in virtual environment
    COPY backend/requirements.txt .
    RUN pip install --upgrade pip setuptools wheel && \
        pip install --no-cache-dir -r requirements.txt
    
    # Copy backend source
    COPY backend/ .
    
    # ----------- FINAL STAGE -----------
    FROM nginx:alpine AS production
    
    WORKDIR /app
    
    # Copy frontend build to nginx
    COPY --from=frontend-build /app/frontend/build /usr/share/nginx/html
    
    # Configure nginx
    RUN rm /etc/nginx/conf.d/default.conf
    COPY ./nginx.conf /etc/nginx/conf.d/default.conf
    
    # Copy backend code
    COPY --from=backend-build /app/backend /app/backend
    COPY --from=backend-build /venv /venv
    
    # Install runtime deps
    RUN apk add --no-cache supervisor python3 libffi
    
    # Set PATH to use virtual environment Python
    ENV PATH="/venv/bin:$PATH"
    
    # Copy supervisord config
    COPY ./supervisord.conf /etc/supervisord.conf
    
    EXPOSE 80
    
    # Start both backend and frontend via supervisor
    CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]    
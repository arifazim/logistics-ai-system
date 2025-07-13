# ----------- FRONTEND BUILD STAGE -----------
FROM node:16-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build frontend
RUN npm run build

# ----------- BACKEND BUILD STAGE -----------
FROM python:3.9-alpine AS backend-build

WORKDIR /app/backend

# Copy backend requirements
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ .

# ----------- FINAL STAGE -----------
FROM nginx:alpine AS production

WORKDIR /app

# Copy frontend build to nginx html dir
COPY --from=frontend-build /app/frontend/build /usr/share/nginx/html

# Copy nginx config
RUN rm /etc/nginx/conf.d/default.conf
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Copy backend code
COPY --from=backend-build /app/backend /app/backend

# Install dependencies
RUN apk add --no-cache supervisor python3 py3-pip && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

# Expose port
EXPOSE 80

# Copy supervisord config
COPY ./supervisord.conf /etc/supervisord.conf

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
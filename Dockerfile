# Use an official Python image
FROM python:3.11-slim

# Install Node.js for React build
RUN apt-get update && apt-get install -y nodejs npm nginx supervisor curl && \
    npm install -g serve && \
    rm -rf /var/lib/apt/lists/*

# Create app directories
WORKDIR /app

# Copy and install backend
COPY backend /app/backend
COPY backend/requirements.txt /app/
RUN pip install --upgrade pip && pip install -r /app/requirements.txt

# Copy frontend and build
COPY frontend /app/frontend
WORKDIR /app/frontend
RUN npm install && npm run build

# Move React build to NGINX directory
RUN mkdir -p /var/www/html && cp -r build/* /var/www/html/

# Copy config files
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Set the working directory back to root
WORKDIR /app

# Expose the port Render expects
EXPOSE 80

# Start supervisor to manage services
CMD ["/usr/bin/supervisord"]

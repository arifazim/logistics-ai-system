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
        pip install --no-cache-dir gunicorn
    
    # Expose port
    EXPOSE 80
    
    # Copy supervisord config
    COPY ./supervisord.conf /etc/supervisord.conf
    
    CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
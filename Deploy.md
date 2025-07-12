🐳 Dockerization Summary
1. Dockerfile
-  Multi-stage build:
    - Builds the React frontend and Flask backend separately.
    - Final image uses nginx to serve the frontend and supervisord to run both nginx and the backend (via gunicorn).
- No credentials baked in: Assumes credentials.json and .env are mounted at runtime.

2. docker-compose.yml
- Two services:
    - backend: Flask app via gunicorn, mounts credentials and .env.
    - frontend: nginx serving the React build, proxies /api to backend.
- Ports: Exposes 80 for frontend, backend is internal on 5000.
- Builds: Uses the same Dockerfile for both services.

3. nginx.conf
- Serves the React app.
- Proxies /api requests to the backend service.

4. supervisord.conf
- Runs both nginx and the backend (gunicorn) in the same container for the production image.

🚀 How to Deploy
1. Place your credentials.json and .env in backend/ (or mount them as secrets/volumes).

2. Build and run with:

    Access the app at http://<your-server-ip>/

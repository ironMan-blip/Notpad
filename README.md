# Notpad

A dockerized multi-container note-taking application powered by FastAPI, React (Vite), and PostgreSQL.

---

## 🚀 Getting Started

Follow these simple steps to initialize and run the application locally:

### 1. Prerequisites
Ensure you have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed on your system.

### 2. Initialization & Spin Up
Start the entire stack with a single command from the project root:

```bash
docker compose up --build
```

This command builds the frontend and backend Docker images, sets up the PostgreSQL database, and spins up the development environments with hot-reloading enabled.

### 3. Service Endpoints
Once the containers are running, you can access the services at:

*   **Frontend Application:** [http://localhost:5173](http://localhost:5173)
*   **Backend API:** [http://localhost:8000](http://localhost:8000)
*   **API Documentation (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Stopping the Application
To stop the services, press `Ctrl+C` in your terminal or run:
```bash
docker compose down
```
To also clear the persistent database and media volumes:
```bash
docker compose down -v
```

---

## 🧠 What I Learned

This project was a comprehensive learning experience spanning full-stack development, database management, DevOps, and version control. Key takeaways include:

### 🐙 Version Control (Git & GitHub)
*   **Git vs. GitHub/GitLab:** Solidified understanding of Git as a local, independent version control tool versus cloud platforms (GitHub/GitLab) used for remote hosting.
*   **Branching Workflows:** Learned to create, navigate, and manage feature branches to safely build and isolate new updates without affecting the main codebase.
*   **Syncing Repositories:** Mastered repository synchronization workflows, specifically pulling remote changes and pushing local commits.

### ⚡ Backend Development (FastAPI)
*   **API Design:** Developed API routes using FastAPI's modern, asynchronous, and Pythonic syntax.
*   **Data Validation:** Utilized Pydantic schemas to validate incoming client request data and structure outgoing API responses.
*   **Virtual Environments:** Originally utilized virtual environments (`.venv`) to isolate project-specific dependencies before transitioning to a fully containerized architecture.
*   **Security & Middleware:**
    *   **Dependencies:** Implemented custom dependencies to execute logic (such as rate limiting or authentication checks) prior to endpoint execution.
    *   **Middleware:** Integrated middleware to inspect, validate, and intercept requests/responses globally (e.g., verifying frontend requests).
*   **Configuration Management:** Used environment variables (`.env`) to securely separate configuration settings and secrets from the codebase.
*   **API Testing:** Leveraged FastAPI's interactive Swagger UI (`/docs`) and Postman to construct requests, customize headers, and test routes.

### 💾 Databases & Architecture
*   **Database Management:** Worked with PostgreSQL, learning to interact with relational databases and query data using Python-based structures.
*   **Problem-Solving & Generalization:** Focused on modular design—breaking down complex problems into reusable, generalized logic and components to reduce code duplication.

### ⚛️ Frontend Development (React)
*   **Component-Driven Development:** Leveraged React to build structured, modular, and dynamic user interfaces, finding it much more maintainable than traditional multi-page HTML/CSS setups.
*   **Reusability:** Designed customizable, reusable frontend components that can be reused across different views.

### 🤖 AI Integration
*   **LLM API Integration:** Configured and connected to Groq's inference engine to leverage AI models, integrating intelligent features directly into the backend.

### 🐳 DevOps & Orchestration (Docker)
*   **Containerization:** Replaced local virtual environments with Docker, packaging the frontend, backend, and database into separate, isolated containers (services) with precise dependencies and environment versions.
*   **Orchestration:** Used Docker Compose to orchestrate all services, allowing the entire multi-container application to spin up, connect, and sync automatically with a single command (`docker compose up`).
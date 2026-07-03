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

This project was a comprehensive learning journey spanning backend development, frontend design, database management, and modern DevOps practices. Here are the key takeaways:

*   **Docker & Containerization:** Learned how to containerize frontend, backend, and database services into a multi-container stack, ensuring consistent environments across different systems.
*   **FastAPI & API Development:** Mastered building robust APIs in Python using FastAPI, incorporating dependencies, middlewares for security
*   **React & Vite (Frontend):** Gained experience structuring React applications, designing reusable components, and managing frontend state.
*   **PostgreSQL & Databases:** Learned how to set up, connect, and query a relational database.
*   **Environment Management & Security:** Managed dependencies with virtual environments (`.venv`), secured sensitive credentials using `.env` files, and integrated AI API keys safely.
*   **API Verification & Testing:** Used Postman to test and verify endpoints, ensuring proper backend-to-frontend communication.
*   **Version Control & Problem Solving:** Improved Git workflow and learned to break complex problems into smaller, manageable tasks.
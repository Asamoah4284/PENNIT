# PENNIT Backend

Node.js + Express API with MongoDB for the PENNIT literary platform.

## Prerequisites

- Node.js 18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

## Setup

1. Install dependencies:

   ```bash
   cd Backend
   npm install
   ```

2. Create a `.env` file (copy from `.env.example`):

   ```bash
   cp .env.example .env
   ```

3. Update `.env` if needed:

   - `PORT` – API server port (default: 3000)
   - `MONGODB_URI` – MongoDB connection string (default: `mongodb://localhost:27017/pennit`)

4. Seed the database with sample data:

   ```bash
   npm run seed
   ```

5. Start the server:

   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000`.

## API Endpoints

| Method | Endpoint            | Description                |
|--------|---------------------|----------------------------|
| GET    | /api/health         | Health check               |
| GET    | /api/works          | List all works             |
| GET    | /api/works/:id      | Get single work            |
| GET    | /api/authors/:id    | Get author with their works|

## Running with the Frontend

1. Start the backend: `cd Backend && npm run dev`
2. Start the frontend: `cd Frontend && npm run dev`
3. The Vite dev server proxies `/api` to `http://localhost:3000`.

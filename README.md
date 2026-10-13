# Freelance Task Engine - On-Demand Service Marketplace & Task Bidding Backend API

A production-ready REST API built with Node.js, Express 5, and MongoDB for an on-demand service marketplace and freelance task bidding platform (similar to TaskRabbit and Urban Company).

The system handles customer task requests, provider business listings with geospatial location queries, a competitive bidding engine, and post-service review workflows.

---

## What Problem Does This Solve?

Hiring local service providers (electricians, cleaners, designers, handymen) usually involves calling multiple vendors without price transparency. 

Task.io solves this by flipping the process:
1. **Customers post tasks** with their budget, timeline, and location.
2. **Local providers place competitive bids** with their quotes and proposals.
3. **Customers compare bids**, review ratings, and award the job to the best provider.

---

## Core Engineering Highlights

### 1. Competitive Bidding Engine
- **Task Lifecycle:** `open` -> `assigned` -> `in-progress` -> `completed` / `cancelled`.
- **Bid Negotiation:** Service providers bid with custom pricing and turnaround estimates.
- **Atomic Assignment:** When a customer accepts a bid, the winning provider is locked in, the task status updates, and competing bids are flagged.

### 2. Geospatial Search (MongoDB 2dsphere)
- Service provider businesses store GeoJSON coordinates (`Point` schema with longitude & latitude).
- Queries use `$near` / `$geoWithin` operators to find verified businesses within a specific radius (e.g., 5km, 10km) from the customer's location.

### 3. Dual-Token JWT Authentication
- Short-lived Access Tokens (24h) coupled with long-lived Refresh Tokens (30d) stored securely via HTTP-only cookies.
- Role-based authorization middleware protecting customer, provider, and administrative routes.

### 4. Dynamic Review & Reputation Pipeline
- Completed tasks unlock a review window for customers.
- MongoDB Aggregation Pipelines compute real-time average star ratings and total review volume on business profiles.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Runtime** | Node.js (v18+) |
| **Framework** | Express 5 |
| **Database** | MongoDB with Mongoose ODM |
| **Authentication** | JWT (jsonwebtoken) & Cookie-Parser |
| **Validation** | Joi |
| **File Handling** | Multer |
| **Password Security**| bcryptjs |
| **Email Service** | Nodemailer |

---

## Project Structure

```text
taskio-backend/
+-- config/             # Database connection & third-party configs
+-- constants/          # System messages and response codes
+-- controllers/        # Route controllers and business logic
¦   +-- admin/          # Admin-specific handlers
+-- middleware/         # Auth verification and role gates
+-- models/             # Mongoose schemas (Task, Bid, Business, User, etc.)
+-- routes/             # Express API routes
¦   +-- admin/          # Admin routing
+-- utils/              # Helper utilities, mailer, token generators
+-- validatons/         # Joi request validation schemas
+-- .env.example        # Environment variables template
+-- .gitignore          # Repository ignore rules
+-- server.js           # Express app entry point
+-- package.json
```

---

## Key API Endpoints

### Auth (`/api/v1/auth`)
- `POST /register` — Register a customer or service provider
- `POST /login` — Authenticate and receive tokens
- `POST /refresh-token` — Rotate access token
- `POST /logout` — Invalidate session

### Tasks (`/api/v1/tasks`)
- `POST /` — Post a new task with budget and attachments
- `GET /` — Browse open tasks (filterable by category and city)
- `GET /:id` — Get full task details
- `PATCH /:id/status` — Update task status

### Bids (`/api/v1/bids`)
- `POST /` — Place a bid on an open task
- `GET /task/:taskId` — View all bids placed on a task
- `PATCH /:bidId/accept` — Accept bid and award job

### Businesses (`/api/v1/businesses`)
- `POST /` — Create a service provider business profile
- `GET /` — Search businesses by distance, city, and service category
- `GET /:id` — Get business profile and portfolio

### Reviews (`/api/v1/reviews`)
- `POST /` — Submit a review and star rating for a completed task
- `GET /business/:id` — Get verified reviews for a business

---

## Local Development Setup

### 1. Clone & Install Dependencies
```bash
git clone <YOUR_REPO_URL>
cd taskio-backend
npm install
```

### 2. Environment Variables
Create a local `.env` file from the provided example:
```bash
cp .env.example .env
```

Set your configuration values:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/taskio_db
JWT_SECRET=your_jwt_secret_here
REFRESH_TOKEN_SECRET=your_refresh_secret_here
FRONTEND_URL=http://localhost:3000
default_start_point=/api/v1
```

### 3. Start the Server
```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

The API will be live at `http://localhost:5000/api/v1`.
A health check is available at `GET http://localhost:5000/health`.

---

## License

This project is open-source and available under the [MIT License](LICENSE).

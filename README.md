# Task.io — On-Demand Service Marketplace & Task Bidding Backend API

A production-grade RESTful API backend built for on-demand local service marketplaces and freelance task bidding platforms (inspired by platforms like TaskRabbit, Urban Company, and Thumbtack). 

The platform connects customers who need everyday or specialized services with verified service providers who bid competitively on posted tasks.

---

## Architecture & System Overview

Task.io manages the full lifecycle of service procurement, from job posting to multi-bid evaluation, geospatial search, and review completion.

```text
[Customer] ---- Posts Task ----> [Task.io API Engine] <---- Browse & Bid ---- [Service Provider]
     |                                   |                                             |
     |                              Assigns Bid                                        |
     +------------ Reviews ------------->|<------------- Completes Task ---------------+
```

---

## Key Features

### 1. Task Lifecycle & Competitive Bidding Engine
- **Task Creation:** Customers post jobs with detailed descriptions, categories, budget range, and attachments.
- **Provider Bidding:** Service providers submit customized bids including offer amount, estimated completion time, and proposal pitches.
- **Bid Acceptance:** Task posters compare bids, review provider portfolios, and accept the winning proposal.
- **State Machine:** Automated status transitions: `open` ? `assigned` ? `in-progress` ? `completed` / `cancelled`.

### 2. Business Profiles & Geospatial Discovery
- **Multi-Service Profiles:** Providers register individual businesses or multi-branch service profiles.
- **Geospatial Queries:** Powered by MongoDB `2dsphere` indexes to calculate distance, filter by radius (e.g. within 10 km), and sort by proximity.
- **Business Hours & Availability:** Real-time open/closed status detection based on configured operational hours.

### 3. Ratings, Reviews & Trust System
- **Verified Reviews:** Only customers with completed tasks can submit reviews and ratings.
- **Real-Time Aggregation:** Average star ratings and review counts calculated dynamically using MongoDB Aggregation Pipelines.

### 4. Admin Management & Moderation
- Dedicated admin endpoints for category management, business verification, dispute handling, and platform reports.

### 5. Security & Authentication
- Dual-token authentication with JSON Web Tokens (Access Token + Refresh Token).
- Password encryption using `bcryptjs`.
- Request payload validation powered by `Joi`.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js 5
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JSON Web Tokens (JWT) & Cookie Parser
- **Validation:** Joi
- **File Uploads:** Multer
- **Communications:** Nodemailer (Transactional Email Notifications)

---

## Project Structure

```text
taskio-backend/
+-- config/             # Database connection & third-party configurations
+-- constants/          # System messages, status codes, and constants
+-- controllers/        # Request handlers & business logic
¦   +-- admin/          # Admin-specific controllers
+-- middleware/         # Auth verification, role checks, and error handling
+-- models/             # Mongoose schemas (User, Task, Bid, Business, Review, etc.)
+-- routes/             # REST API route definitions
¦   +-- admin/          # Admin route grouping
+-- utils/              # Helper utilities & tokens
+-- validatons/         # Joi schema validations
+-- .env.example        # Environment variables template
+-- .gitignore          # Repository ignore rules
+-- server.js           # Express application entry point
+-- package.json
```

---

## Core API Endpoints

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/register` | Register a new user (Customer / Provider) |
| `POST` | `/login` | User login & token generation |
| `POST` | `/refresh-token` | Renew access token |
| `POST` | `/logout` | Clear auth cookies & sessions |

### Tasks (`/api/v1/tasks`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/` | Create a new task (with attachments) |
| `GET` | `/` | List all open tasks (filter by category/location) |
| `GET` | `/:id` | Get single task details |
| `PUT` | `/:id` | Update task details |
| `PATCH` | `/:id/status` | Update task status |

### Bids (`/api/v1/bids`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/` | Submit a bid on a task |
| `GET` | `/task/:taskId` | Get all bids submitted for a task |
| `PATCH` | `/:bidId/accept` | Accept bid and assign task |

### Businesses (`/api/v1/businesses`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/` | Register business profile |
| `GET` | `/` | Geospatial search businesses by distance/radius |
| `GET` | `/:id` | Get business details & portfolio |

### Reviews (`/api/v1/reviews`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/` | Post review for completed task |
| `GET` | `/business/:id`| Get all reviews for a business |

---

## Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB](https://www.mongodb.com/) running locally or MongoDB Atlas connection URI

### 1. Installation
```bash
git clone <YOUR_REPO_URL>
cd taskio-backend
npm install
```

### 2. Environment Setup
Create a `.env` file from the example:
```bash
cp .env.example .env
```

Configure your environment variables:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/taskio_db
JWT_SECRET=your_secret_key
REFRESH_TOKEN_SECRET=your_refresh_secret_key
FRONTEND_URL=http://localhost:3000
default_start_point=/api/v1
```

### 3. Run Development Server
```bash
npm run dev
```
The server will start at `http://localhost:5000`.

---

## License

This project is licensed under the MIT License.

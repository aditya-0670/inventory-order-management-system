# Inventory & Order Management System

## Overview

Inventory & Order Management System is a production-style full-stack application for managing products, customers, orders, stock levels, and operational dashboard metrics.

The project is built as a clean modular monolith with a FastAPI backend, React frontend, PostgreSQL database, and Docker Compose orchestration. It is designed for a software engineering assessment and emphasizes correctness, maintainability, validation, transaction safety, and deployment readiness.

## Features

- Product management
  - Create, list, view, update, and soft-delete products.
  - Enforce globally unique SKUs.
  - Validate non-negative price and stock.
  - Generate deterministic name-based SKU suggestions.
  - Check SKU availability before product creation or update.

- Customer management
  - Create, list, view, update, and soft-delete customers.
  - Enforce unique customer email addresses.
  - Validate and normalize phone numbers to E.164 format.
  - Preserve order history when customers are deactivated.

- Order management
  - Create orders for existing customers and products.
  - Add one or more products per order.
  - Prevent duplicate products in the same order.
  - Calculate totals on the backend using current database prices.
  - Reduce stock transactionally when an order is placed.
  - Cancel orders and restore stock.
  - Prevent insufficient-stock orders.

- Dashboard
  - Total products.
  - Total customers.
  - Total orders.
  - Low-stock products based on configurable threshold.

- Platform
  - FastAPI validation and centralized error responses.
  - Structured request logging with request IDs.
  - Health, readiness, and metrics endpoints.
  - PostgreSQL migrations with Alembic.
  - Backend and frontend test suites.
  - Full Docker Compose stack.

## Notable Assessment Enhancements

These features go beyond the minimum CRUD flow while staying scoped to a clean modular monolith.

| Enhancement | What It Adds | Implementation Notes |
| --- | --- | --- |
| Smart SKU Suggestion System | Suggests readable, available SKUs from a product name. | Rule-based and deterministic, not AI-based. Backend generates and validates suggestions; frontend shows the first two suggestions and still allows manual SKUs. Product creation and update continue to enforce uniqueness in the backend and database. |
| SKU Availability Checks | Warns users before submitting duplicate SKUs. | Supports edit mode with `exclude_product_id`, so the current product's SKU is not incorrectly marked as taken. |
| Country-Aware Phone Input | Users select a country/region code, then enter the national phone number. | Frontend uses `libphonenumber-js`; backend uses `phonenumbers`. Stored values are normalized to E.164 strings. No fixed 10-digit rule and no phone-number uniqueness constraint. |
| Customer and Product Detail Views | Users can open individual records from list pages. | Supports required `GET /products/{id}` and `GET /customers/{id}` flows from the UI. |
| Duplicate Order Item Protection | Prevents selecting the same product multiple times in one order. | Frontend disables already-selected products in other rows; backend rejects duplicate product IDs as validation safety. |
| Transactional Inventory Logic | Keeps stock and order records consistent. | Failed order creation rolls back completely; successful order creation reduces stock; cancellation restores stock. |
| Deployment Hardening | Production-ready Render/Vercel/Docker setup. | Includes Render PostgreSQL, Render backend, Vercel frontend, Docker Compose, Docker Hub image, health checks, CORS configuration, and README deployment docs. |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | Python, FastAPI, SQLAlchemy, Alembic, Pydantic v2 |
| Frontend | React, Vite, React Router, Axios, TanStack Query, React Hook Form, Zod |
| Database | PostgreSQL |
| Testing | pytest, Vitest, React Testing Library, MSW |
| Logging/Monitoring | Structured console logs, request ID middleware, health/readiness/metrics endpoints |
| Containerization | Docker, Docker Compose |
| Deployment Targets | Render, Vercel, Docker Hub |

## Architecture

The backend uses a clean modular monolith. Route handlers stay thin, services own business rules, repositories own database access, and SQLAlchemy models define persistence.

```mermaid
flowchart LR
    User["User / Browser"] --> Frontend["React + Vite Frontend"]
    Frontend --> ApiClient["Axios API Client"]
    ApiClient --> FastAPI["FastAPI Backend"]
    FastAPI --> Routers["API Routers"]
    Routers --> Services["Service Layer"]
    Services --> Repositories["Repository Layer"]
    Repositories --> ORM["SQLAlchemy ORM"]
    ORM --> Postgres["PostgreSQL"]

    FastAPI --> Logging["Structured Logging"]
    FastAPI --> Health["Health / Ready / Metrics"]
```

## Database ERD

```mermaid
erDiagram
    CUSTOMERS ||--o{ ORDERS : places
    ORDERS ||--|{ ORDER_ITEMS : contains
    PRODUCTS ||--o{ ORDER_ITEMS : referenced_by

    CUSTOMERS {
        int id PK
        string full_name
        string email UK
        string phone_number
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    PRODUCTS {
        int id PK
        string name
        string sku UK
        decimal price
        int quantity_in_stock
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    ORDERS {
        int id PK
        int customer_id FK
        decimal total_amount
        string status
        datetime created_at
        datetime updated_at
    }

    ORDER_ITEMS {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
        decimal unit_price
        decimal line_total
    }
```

## Order Creation Flow

```mermaid
sequenceDiagram
    participant UI as React Orders Page
    participant API as FastAPI Orders API
    participant Service as Order Service
    participant Inventory as Inventory Service
    participant DB as PostgreSQL

    UI->>API: POST /api/v1/orders
    API->>Service: Validate request schema
    Service->>DB: Verify customer exists
    Service->>Service: Reject duplicate product IDs
    Service->>Inventory: Lock product rows
    Inventory->>DB: SELECT products FOR UPDATE
    Inventory->>Inventory: Validate stock
    Inventory->>Inventory: Calculate line totals
    Inventory->>DB: Reduce stock
    Service->>DB: Create order and order items
    Service->>DB: Commit transaction
    API-->>UI: 201 Created with backend total
```

## Design Patterns

| Pattern | Where Used | Why |
| --- | --- | --- |
| Repository Pattern | Product, customer, order, dashboard repositories | Keeps SQLAlchemy queries out of route handlers and services. |
| Service Layer Pattern | Product, customer, order, inventory, dashboard services | Centralizes business rules and makes behavior easier to test. |
| Unit of Work / Transaction Pattern | Order creation and cancellation | Ensures stock updates, order creation, and order item creation succeed or fail together. |
| Builder Pattern | Backend test builders | Keeps tests readable and avoids repetitive fixture setup. |
| Factory-style Setup | App creation, settings, database session creation | Keeps application bootstrapping consistent and testable. |
| Strategy-ready Boundaries | Inventory and pricing logic | Allows future discount/pricing strategies without changing route handlers. |

## Business Rules

### Products

- SKU must be globally unique.
- SKU remains unique even after soft delete.
- Price cannot be negative.
- Quantity in stock cannot be negative.
- Missing products return `404`.
- Duplicate SKUs return `409`.
- Validation errors return `422`.
- Products are soft-deleted with `is_active = false`.

### Customers

- Email must be unique.
- Email must be valid.
- Phone numbers are stored as strings in E.164 format.
- Phone numbers are not unique.
- Customer deletion uses soft delete to preserve order history.
- Missing customers return `404`.
- Duplicate emails return `409`.
- Validation errors return `422`.

### Orders and Inventory

- Customer must exist before an order can be placed.
- Every product in an order must exist.
- Order items cannot be empty.
- Quantity ordered must be greater than zero.
- Duplicate product IDs in the same order are rejected.
- Orders cannot be placed if stock is insufficient.
- Creating an order reduces product stock.
- Cancelling an order restores stock.
- Total amount is calculated by the backend from database prices.
- Order creation is transactional.
- Failed order creation does not reduce stock or create a partial order.
- Order statuses are `PLACED` and `CANCELLED`.

## API Documentation

Base API prefix:

```text
/api/v1
```

Health endpoints are not version-prefixed.

### Products

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/v1/products` | Create a product. |
| `GET` | `/api/v1/products` | List active products. |
| `GET` | `/api/v1/products/{product_id}` | Retrieve product details. |
| `PUT` | `/api/v1/products/{product_id}` | Update product details. |
| `DELETE` | `/api/v1/products/{product_id}` | Soft-delete a product. |
| `GET` | `/api/v1/products/sku-suggestions?name=Wireless%20Mouse&limit=2` | Generate available name-based SKU suggestions. |
| `GET` | `/api/v1/products/sku-availability?sku=LAPTOP-001` | Check SKU availability. |
| `GET` | `/api/v1/products/sku-availability?sku=LAPTOP-001&exclude_product_id=1` | Check SKU availability while editing a product. |

### Customers

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/v1/customers` | Create a customer. |
| `GET` | `/api/v1/customers` | List active customers. |
| `GET` | `/api/v1/customers/{customer_id}` | Retrieve customer details. |
| `PUT` | `/api/v1/customers/{customer_id}` | Update customer details. |
| `DELETE` | `/api/v1/customers/{customer_id}` | Soft-delete a customer. |

### Orders

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/v1/orders` | Create an order and reduce stock. |
| `GET` | `/api/v1/orders` | List orders. |
| `GET` | `/api/v1/orders/{order_id}` | Retrieve order details. |
| `DELETE` | `/api/v1/orders/{order_id}` | Cancel an order and restore stock. |

### Dashboard

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/v1/dashboard/summary` | Return product, customer, order, and low-stock metrics. |

### Health and Monitoring

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Basic application health. |
| `GET` | `/ready` | Database readiness check. |
| `GET` | `/metrics` | Prometheus-compatible metrics. |

### Error Response Shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "price",
        "message": "Input should be greater than or equal to 0"
      }
    ]
  }
}
```

## Folder Structure

```text
inventory-order-management/
├── README.md
├── .gitignore
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── utils/
│   ├── alembic/
│   ├── tests/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── alembic.ini
│   └── requirements.txt
└── frontend/
    ├── public/
    ├── src/
    │   ├── api/
    │   ├── components/
    │   ├── hooks/
    │   ├── pages/
    │   ├── tests/
    │   └── utils/
    ├── Dockerfile
    ├── .dockerignore
    ├── nginx.conf
    ├── package.json
    └── vite.config.js
```

## Environment Variables

Create a local `.env` file using the following template. Never commit real secrets.

```env
POSTGRES_USER=inventory_user
POSTGRES_PASSWORD=change_me
POSTGRES_DB=inventory_db
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

DATABASE_URL=postgresql+psycopg2://inventory_user:change_me@postgres:5432/inventory_db

BACKEND_PORT=8000
FRONTEND_PORT=3000

CORS_ALLOW_ORIGINS=http://localhost:3000,http://localhost:5173
LOG_LEVEL=INFO
LOW_STOCK_THRESHOLD=5

VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_DEFAULT_COUNTRY=IN
```

### Production Backend Variables

```env
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:PORT/DB_NAME
CORS_ALLOW_ORIGINS=https://your-frontend-domain.vercel.app
LOG_LEVEL=INFO
LOW_STOCK_THRESHOLD=5
```

### Production Frontend Variables

```env
VITE_API_BASE_URL=https://your-backend-domain.com/api/v1
VITE_DEFAULT_COUNTRY=IN
```

Vite variables are baked into the static frontend build. If `VITE_API_BASE_URL` changes, rebuild and redeploy the frontend.

## Local Setup

### Backend

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment for your operating system:

| Operating system / shell | Command |
| --- | --- |
| macOS / Linux | `source .venv/bin/activate` |
| Windows PowerShell | `.venv\Scripts\Activate.ps1` |
| Windows Command Prompt | `.venv\Scripts\activate.bat` |

If PowerShell blocks script execution, allow it for the current terminal session only:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\Activate.ps1
```

Then install dependencies, run migrations, and start the API:

```bash
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Backend URLs:

- API docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`
- Readiness: `http://localhost:8000/ready`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend dev URL:

```text
http://localhost:5173
```

## Docker Setup

The Docker Compose stack runs:

- `postgres`: PostgreSQL 16 with a named volume.
- `backend`: FastAPI backend with Alembic migrations at startup.
- `frontend`: Vite production build served by Nginx.

Start the full stack:

```bash
docker compose up --build
```

Run in detached mode:

```bash
docker compose up --build -d
```

Inspect services:

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
```

Stop services:

```bash
docker compose down
```

Stop services and remove the database volume:

```bash
docker compose down -v
```

Docker URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api/v1`
- Swagger docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`
- Readiness: `http://localhost:8000/ready`

## Testing

Backend tests:

```bash
cd backend
pytest -q
```

Backend coverage:

```bash
cd backend
pytest --cov=app tests/
```

Frontend tests:

```bash
cd frontend
npm test
```

Frontend production build:

```bash
cd frontend
npm run build
```

## Logging and Monitoring

The backend includes structured console logging and request tracing.

Logs include:

- timestamp
- log level
- request ID
- method
- path
- status code
- duration

Request ID behavior:

- If the client sends `X-Request-ID`, the backend reuses it.
- Otherwise, the backend generates a request ID.

Monitoring endpoints:

| Endpoint | Purpose |
| --- | --- |
| `/health` | Confirms the application process is running. |
| `/ready` | Confirms the backend can connect to PostgreSQL. |
| `/metrics` | Exposes metrics suitable for Prometheus-style scraping. |

## Deployment Guide

### Backend Deployment

Recommended platforms:

- Render
- Railway
- Fly.io

The backend can be deployed from source or as a Docker image.
This repository includes a root `render.yaml` Blueprint for Render. It provisions:

- A Docker-based backend web service using `backend/Dockerfile`.
- A Render PostgreSQL database.
- `DATABASE_URL` wired from the Render database connection string.
- A `/health` health check.

Required production variables:

```env
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:PORT/DB_NAME
CORS_ALLOW_ORIGINS=https://your-frontend-domain.vercel.app
LOG_LEVEL=INFO
LOW_STOCK_THRESHOLD=5
```

Production start command:

```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

### Database Migrations

Run migrations locally:

```bash
cd backend
alembic upgrade head
```

Run migrations inside Docker:

```bash
docker compose exec backend alembic upgrade head
```

The backend Dockerfile already runs migrations before starting the API server.

### CORS Setup

Set `CORS_ALLOW_ORIGINS` to the deployed frontend domain:

```env
CORS_ALLOW_ORIGINS=https://your-frontend-domain.vercel.app
```

For multiple domains:

```env
CORS_ALLOW_ORIGINS=https://your-frontend-domain.vercel.app,https://your-netlify-domain.netlify.app
```

Do not use `*` for production unless the assessment explicitly allows it.

### Docker Hub Backend Image

Build and push the backend image:

```bash
docker build -t aditya0670/inventory-order-backend:latest ./backend
docker push aditya0670/inventory-order-backend:latest
```

Optional versioned release:

```bash
docker tag aditya0670/inventory-order-backend:latest aditya0670/inventory-order-backend:v1.0.0
docker push aditya0670/inventory-order-backend:v1.0.0
```

Docker Hub backend image:

[aditya0670/inventory-order-backend](https://hub.docker.com/repository/docker/aditya0670/inventory-order-backend/)

### Frontend Deployment

Recommended platforms:

- Vercel
- Netlify

This repository includes `frontend/vercel.json` so React Router routes such as `/products/:id` and `/orders/:id` fall back to `index.html` on Vercel.

Build settings:

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Install command | `npm install` |
| Build command | `npm run build` |
| Publish directory | `dist` |

Set the frontend production variable:

```env
VITE_API_BASE_URL=https://your-backend-domain.com/api/v1
```

## Demo Links

- GitHub Repository: `https://github.com/aditya-0670/inventory-order-management-system`
- Docker Hub Backend Image: `https://hub.docker.com/repository/docker/aditya0670/inventory-order-backend/`
- Live Frontend URL: `https://inventory-order-management-frontend.vercel.app`
- Live Backend API URL: `https://inventory-order-backend-ehpp.onrender.com`

## Screenshots

### Dashboard

![Dashboard summary with product, customer, order, and low-stock metrics](docs/screenshots/dashboard.png)

### Product Management

![Products page with product creation form and product list](docs/screenshots/products.png)

### Smart SKU Suggestions

![Product form showing deterministic SKU suggestions generated from product name](docs/screenshots/sku-suggestions.png)

### Customer Management

![Customers page with phone-region selector and customer list](docs/screenshots/customers.png)

The customer form separates the country/region code from the local phone number so values can be validated by region and stored in E.164 format.

### Order Management

![Orders page with create-order workflow and order list](docs/screenshots/orders.png)

### API Documentation

![FastAPI Swagger documentation for product and customer endpoints](docs/screenshots/api-docs.png)

## Future Improvements

- Authentication and role-based authorization.
- Product categories, brands, and barcode support.
- Import/export workflows for products and customers.
- Pagination, sorting, and advanced filtering for large datasets.
- Audit logs for inventory and order changes.
- Email notifications for low stock and order events.
- Background jobs for reporting and scheduled inventory checks.
- Production observability with hosted logs, metrics, and alerts.
- End-to-end tests with Playwright or Cypress.

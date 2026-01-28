# Annam Backend Server

Node.js/Express backend for the Annam food donation platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

## API Endpoints

### POST /api/signup
Create a new user account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "role": "farmer"
}
```

**Response:**
```json
{
  "message": "Account created successfully! Please login.",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "farmer"
  }
}
```

### POST /api/login
Login to an existing account.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "farmer"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### GET /api/health
Check if the server is running.

**Response:**
```json
{
  "status": "Backend server is running"
}
```

## Database

Uses SQLite for data storage. Database file: `annam.db`

## Security Notes

- Update `JWT_SECRET` in production
- Add rate limiting for API endpoints
- Add input validation
- Use environment variables for sensitive data

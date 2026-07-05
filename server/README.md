# AETHER OS Backend Server

This is the production-ready, modular, and scalable Node.js + Express.js + Socket.IO + MongoDB backend server for **AETHER OS**.

## Architecture Overview

The codebase is organized following **Clean Architecture** patterns to keep components decoupled, testable, and highly maintainable:

- **src/config**: Setup for databases, environments, and socket middleware.
- **src/controllers**: Handles HTTP request parsing, status responses, and mapping parameters to services.
- **src/services**: Core business logic. Communicates with models and external integrations.
- **src/models**: Mongoose database schemas.
- **src/middleware**: Error handling, authentication checks, custom logging, and validation routines.
- **src/routes**: Maps URL endpoints to controllers.
- **src/socket**: Manages real-time Socket.IO event processing, handshakes, and rooms.
- **src/utils**: Reusable components such as standardized API wrappers, error classes, and loggers.
- **src/vision**, **src/ai**, **src/automation**: Sub-domains dedicated to OpenCV python bridges, LLM managers, and system control utilities.

## Requirements

- Node.js (v18+)
- MongoDB

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Setup Environment Variables:
   Configure the `.env` file according to `.env.example`.

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Run for production:
   ```bash
   npm start
   ```

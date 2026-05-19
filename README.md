# Conference Management Platform

A comprehensive full-stack web application for managing academic conferences, events, and related content.

## Features

- **Role-based Access Control**: Admin, Editor, and Member roles with granular permissions
- **Content Management**: Dual-mode content creation (Markdown/HTML) with live preview
- **Event Management**: Complete conference and event lifecycle management
- **Registration System**: Event registration with capacity management
- **Comment System**: Moderated commenting with sensitive word filtering
- **Analytics Dashboard**: Comprehensive reporting and data visualization
- **Notification System**: Email notifications with template management

## Tech Stack

### Frontend
- **Next.js 14** with TypeScript
- **TailwindCSS** for styling
- **React** components with modern hooks

### Backend
- **NestJS** with TypeScript
- **Prisma ORM** with PostgreSQL
- **JWT Authentication** with Passport.js
- **Redis** for caching and queues

### Infrastructure
- **Docker Compose** for development environment
- **PostgreSQL** database
- **Redis** for caching and job queues

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd conference-management-platform
   ```

2. **Start the development environment**
   ```bash
   docker-compose up -d
   ```

3. **Set up the database**
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma db seed
   ```

4. **Access the applications**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/api/docs

### Manual Development (without Docker)

1. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

2. **Set up environment variables**
   ```bash
   # Copy and configure environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.local.example frontend/.env.local
   ```

3. **Start PostgreSQL and Redis**
   ```bash
   # Using Docker for databases only
   docker-compose up postgres redis -d
   ```

4. **Run database migrations**
   ```bash
   cd backend
   npx prisma migrate dev
   ```

5. **Start development servers**
   ```bash
   # Backend (terminal 1)
   cd backend
   npm run start:dev
   
   # Frontend (terminal 2)
   cd frontend
   npm run dev
   ```

## Project Structure

```
conference-management-platform/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # Next.js app directory
│   │   ├── components/      # Reusable React components
│   │   └── lib/             # Utility functions and configurations
│   └── package.json
├── backend/                  # NestJS backend application
│   ├── src/
│   │   ├── auth/            # Authentication module
│   │   ├── events/          # Events management module
│   │   ├── users/           # User management module
│   │   └── prisma/          # Database service
│   ├── prisma/              # Database schema and migrations
│   └── package.json
├── docker-compose.yml        # Development environment setup
└── README.md
```

## Available Scripts

### Backend
- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://conference_user:conference_pass@localhost:5432/conference_db
JWT_SECRET=your-jwt-secret-key-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key-here
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
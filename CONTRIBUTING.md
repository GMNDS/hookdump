# Contributing to Hookdump

Thank you for your interest in contributing to Hookdump! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Docker (optional, for containerized development)

### Development Setup

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/YOUR_USERNAME/hookdump.git
   cd hookdump
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the shared package:

   ```bash
   npm run build -w shared
   ```

4. Start the development servers:

   ```bash
   # Terminal 1: Backend
   npm run dev:backend

   # Terminal 2: Frontend
   npm run dev:frontend
   ```

5. Open http://localhost:5173 in your browser.

## Project Structure

```
hookdump/
├── shared/           # Shared Zod schemas and TypeScript types
├── backend/          # Fastify API server
│   └── src/
│       ├── db/       # Drizzle ORM + SQLite
│       └── routes/   # API endpoints
├── frontend/         # React + Vite UI
│   └── src/
│       ├── components/
│       └── api/
└── docker-compose.yml
```

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, browser)

### Suggesting Features

1. Open an issue with the `enhancement` label
2. Describe the use case and proposed solution
3. Be open to discussion and alternatives

### Submitting Pull Requests

1. Create a feature branch from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the code style guidelines

3. Test your changes locally

4. Commit with clear, descriptive messages:

   ```bash
   git commit -m "Add feature: description of what it does"
   ```

5. Push and create a Pull Request

### Code Style Guidelines

- Use TypeScript for all new code
- Follow existing code patterns and naming conventions
- Keep functions small and focused
- Write self-documenting code; add comments only when necessary
- All code, comments, and documentation must be in English

### Commit Message Format

```
<type>: <short description>

<optional longer description>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Assume good intentions

## Questions?

Feel free to open an issue for any questions about contributing.

Thank you for helping make Hookdump better!

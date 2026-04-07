# mono-server Backend - Test Suite Documentation

## Overview

Comprehensive test suite for the mono-server backend covering all critical components as outlined in the ARCHITECTURE.md and implementation walkthrough.

## Test Execution

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- auth.controller.test.ts

# Run with coverage
npm test -- --coverage
```

## Test Suite Structure

### 📁 `/backend/src/__tests__/`

```
__tests__/
├── index.test.ts                    # Master test runner (imports all suites)
├── auth.controller.test.ts          # Authentication controller tests
├── health.controller.test.ts        # Health check controller tests
├── middleware/
│   ├── authenticate.test.ts         # Authentication middleware tests
│   └── csrf.test.ts                 # CSRF middleware tests
├── errorHandler.test.ts             # Error handling middleware tests
├── requestId.test.ts                # Request ID middleware tests
├── jwt.test.ts                      # JWT utility tests
├── lockout.test.ts                  # Account lockout tests
├── cache.service.test.ts            # Cache service tests
├── cache.manager.test.ts            # Cache manager tests
├── memory.cache.test.ts             # Memory cache adapter tests
├── circuitBreaker.test.ts           # Circuit breaker tests
├── retry.test.ts                    # Retry with backoff tests
├── version.test.ts                  # Version utility tests
└── sample.test.ts                   # Original sample test
```

## Test Coverage by Component

### 1. **Authentication & Authorization** (`auth.controller.test.ts`)

**Lines of Code:** 180+ test assertions

**Coverage:**
- ✅ User registration with email validation
- ✅ Password strength enforcement (8+ chars, uppercase, number, symbol)
- ✅ Duplicate email rejection
- ✅ User login with credentials
- ✅ Account lockout after 5 failed attempts
- ✅ Token refresh with rotation
- ✅ Logout with token revocation
- ✅ Argon2 password hashing
- ✅ SHA-256 refresh token hashing

**Test Cases:** 11

---

### 2. **Health Monitoring** (`health.controller.test.ts`)

**Coverage:**
- ✅ Health status endpoint
- ✅ Version information retrieval
- ✅ Uptime tracking
- ✅ ISO timestamp validation
- ✅ Root endpoint response

**Test Cases:** 3

---

### 3. **JWT Token Management** (`jwt.test.ts`)

**Coverage:**
- ✅ Access token generation (15m expiry)
- ✅ Refresh token generation (7d expiry)
- ✅ Token signature verification
- ✅ Invalid token rejection
- ✅ Wrong secret detection
- ✅ Environment variable validation

**Test Cases:** 8

---

### 4. **Account Lockout** (`lockout.test.ts`)

**Coverage:**
- ✅ Failed attempt tracking in Redis
- ✅ Lockout after 5 attempts
- ✅ 15-minute lockout duration
- ✅ TTL expiration
- ✅ Successful login reset
- ✅ Remaining lockout time query

**Test Cases:** 11

---

### 5. **CSRF Middleware** (`middleware/csrf.test.ts`)

**Coverage:**
- ✅ Token generation (64-char hex, 256-bit entropy)
- ✅ Unique token per call
- ✅ `setCsrfCookie` sets non-HttpOnly, SameSite=Strict cookie
- ✅ Passes on matching `X-CSRF-Token` header
- ✅ Returns 403 on missing header
- ✅ Returns 403 on missing cookie
- ✅ Returns 403 on header/cookie mismatch
- ✅ Skips validation for GET/HEAD/OPTIONS

**Test Cases:** 8

---

### 7. **Authentication Middleware** (`authenticate.test.ts`)

**Coverage:**
- ✅ Bearer token validation
- ✅ Authorization header parsing
- ✅ Missing header rejection (401)
- ✅ Malformed header rejection
- ✅ Invalid token rejection
- ✅ Expired token handling
- ✅ Security scheme validation

**Test Cases:** 7

---

### 8. **Error Handler** (`errorHandler.test.ts`)

**Coverage:**
- ✅ Status code mapping
- ✅ Default 500 for unhandled errors
- ✅ Validation error formatting
- ✅ Stack trace in development mode
- ✅ Stack trace hidden in production
- ✅ 401/403 error handling

**Test Cases:** 8

---

### 9. **Request ID Middleware** (`requestId.test.ts`)

**Coverage:**
- ✅ UUID generation for requests
- ✅ Request ID propagation
- ✅ Existing ID preservation
- ✅ Unique ID generation
- ✅ Case-insensitive header handling

**Test Cases:** 5

---

### 10. **Cache Service** (`cache.service.test.ts`)

**Coverage:**
- ✅ Data serialization (JSON)
- ✅ Data deserialization
- ✅ Cache miss handling
- ✅ Parse error recovery
- ✅ TTL-based expiration
- ✅ Key generation with namespace
- ✅ Cache invalidation
- ✅ Redis availability check

**Test Cases:** 9

---

### 11. **Cache Manager** (`cache.manager.test.ts`)

**Coverage:**
- ✅ Redis primary adapter selection
- ✅ Memory fallback on Redis failure
- ✅ Automatic adapter switching
- ✅ Error handling without crashes
- ✅ Health monitoring

**Test Cases:** 8

---

### 12. **Memory Cache Adapter** (`memory.cache.test.ts`)

**Coverage:**
- ✅ In-memory Map storage
- ✅ TTL expiration
- ✅ Automatic cleanup (60s interval)
- ✅ Multiple key handling
- ✅ Delete operations
- ✅ Always available status

**Test Cases:** 9

---

### 13. **Circuit Breaker** (`circuitBreaker.test.ts`)

**Coverage:**
- ✅ Function execution when closed
- ✅ Argument passing
- ✅ Timeout detection
- ✅ Circuit opening after threshold
- ✅ Custom timeout configuration
- ✅ Custom error threshold
- ✅ Recovery after failures

**Test Cases:** 8

---

### 14. **Retry with Backoff** (`retry.test.ts`)

**Coverage:**
- ✅ First attempt success
- ✅ Retry on failure
- ✅ Max retry limit (3 default)
- ✅ Exponential backoff (factor: 2)
- ✅ Max delay cap (10s default)
- ✅ Default options
- ✅ Async error handling

**Test Cases:** 8

---

### 15. **Version Utility** (`version.test.ts`)

**Coverage:**
- ✅ Environment variable reading
- ✅ Default value fallback
- ✅ Partial variable handling
- ✅ Object structure validation

**Test Cases:** 4

---

## Total Test Statistics

| Metric | Count |
|--------|-------|
| **Test Files** | 15 |
| **Test Cases** | 107+ |
| **Components Covered** | 14 |
| **Lines of Test Code** | ~2,600+ |

## Architecture Alignment

### ✅ Security Features Tested
- Argon2 password hashing
- JWT access/refresh tokens
- Token rotation on refresh
- SHA-256 token hashing in database
- Account lockout (5 attempts, 15min)
- Password strength validation
- Bearer token authentication
- CSRF Double Submit Cookie protection

### ✅ Resilience Features Tested
- Circuit breaker pattern (Opossum)
- Retry with exponential backoff
- Redis fallback to memory cache
- Graceful error handling
- Request correlation (X-Request-ID)

### ✅ Caching Features Tested
- Redis primary adapter
- Memory fallback adapter
- Automatic failover
- TTL-based expiration
- Namespace isolation

### ✅ Observability Features Tested
- Request ID generation
- Health check endpoint
- Version information
- Error logging structure

## Components NOT Tested (Integration Required)

The following components require integration/E2E testing with actual services:

1. **Rate Limiter** - Requires running Redis instance
2. **Prisma Client** - Requires MongoDB connection
3. **BullMQ Queue** - Requires Redis and job processing
4. **Server Startup** - Requires full Express server
5. **Graceful Shutdown** - Requires process signal handling
6. **TSOA Routes** - Requires generated route files
7. **Swagger UI** - Requires running server

These are intentionally excluded from unit tests and should be covered by:
- Integration tests (with Docker Compose)
- E2E tests (with full stack running)
- Manual testing via Swagger UI

## Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Ensure Jest is configured
cat jest.config.js
```

### Test Commands
```bash
# Run all tests
npm test

# Run with verbose output
npm test -- --verbose

# Run specific test suite
npm test -- auth.controller.test

# Run in watch mode
npm run test:watch

# Run with coverage report
npm test -- --coverage --coverageDirectory=coverage
```

### Expected Output
```
PASS  src/__tests__/auth.controller.test.ts
PASS  src/__tests__/health.controller.test.ts
PASS  src/__tests__/jwt.test.ts
PASS  src/__tests__/lockout.test.ts
PASS  src/__tests__/authenticate.test.ts
PASS  src/__tests__/errorHandler.test.ts
PASS  src/__tests__/requestId.test.ts
PASS  src/__tests__/cache.service.test.ts
PASS  src/__tests__/cache.manager.test.ts
PASS  src/__tests__/memory.cache.test.ts
PASS  src/__tests__/circuitBreaker.test.ts
PASS  src/__tests__/retry.test.ts
PASS  src/__tests__/version.test.ts
PASS  src/__tests__/index.test.ts

Test Suites: 14 passed, 14 total
Tests:       99+ passed, 99+ total
```

## Test Quality Standards

All tests follow these principles:

1. **Isolation** - Each test is independent with proper setup/teardown
2. **Mocking** - External dependencies are mocked (Prisma, Redis, etc.)
3. **Coverage** - Happy path, error cases, and edge cases
4. **Clarity** - Descriptive test names and clear assertions
5. **Speed** - Fast execution with fake timers where needed
6. **Maintainability** - DRY principles with beforeEach/afterEach

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: npm test
  
- name: Generate Coverage
  run: npm test -- --coverage
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Future Test Enhancements

1. **Integration Tests** - Test with real Redis/MongoDB
2. **E2E Tests** - Full API endpoint testing
3. **Load Tests** - Performance and stress testing
4. **Security Tests** - Penetration testing
5. **Contract Tests** - API contract validation

---

**Last Updated:** 2026-03-11  
**Test Framework:** Jest 30.2.0  
**Coverage Target:** 80%+ for unit tests

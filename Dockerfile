# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS dependencies

WORKDIR /app

# Install system dependencies for Prisma and native modules
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    python3 \
    make \
    g++

# Enable Corepack for Yarn 4
RUN corepack enable

# Copy package management files
COPY .yarnrc.yml package.json yarn.lock ./

# Copy workspace structure (needed for yarn workspaces)
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/
COPY packages/ai/package.json ./packages/ai/
COPY packages/integrations/package.json ./packages/integrations/
COPY packages/logger/package.json ./packages/logger/
COPY packages/design-system/package.json ./packages/design-system/
COPY packages/api-client/package.json ./packages/api-client/

# Install dependencies
RUN yarn install --immutable

# ============================================
# Stage 2: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    openssl \
    libc6-compat

# Enable Corepack
RUN corepack enable

# Copy package files and dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY .yarnrc.yml package.json yarn.lock ./

# Copy source code
COPY nx.json tsconfig.json ./
COPY prisma ./prisma
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts

# Generate Prisma Client
RUN yarn prisma:generate

# Build the API
RUN yarn build:api

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    dumb-init

# Enable Corepack
RUN corepack enable

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodejs

# Copy package files
COPY --from=builder --chown=nodejs:nodejs /app/package.json /app/yarn.lock /app/.yarnrc.yml ./

# Copy node_modules (production dependencies)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy Prisma schema (needed at runtime)
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Copy start script
COPY --from=builder --chown=nodejs:nodejs /app/scripts/start-api.mjs ./scripts/start-api.mjs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["yarn", "start:api"]
# Docker Build Notes

## Image Structure

The production Docker image includes:

- **Runtime**: Node 20 Alpine
- **User**: Non-root user `nodejs` (uid 1001)
- **Port**: 3000
- **Entry point**: `dumb-init` (for proper signal handling)
- **Command**: `yarn start:api`

## What's Included in the Runtime Image

The multi-stage build ensures the runtime image contains only what's needed:

- `package.json`, `yarn.lock`, `.yarnrc.yml` - Package management
- `node_modules/` - All production dependencies
- `dist/api/` - Compiled application
- `prisma/` - Prisma schema (needed at runtime)
- `scripts/start-api.mjs` - Startup script
- `nx.json` - Nx configuration (used by start script)

## Startup Process

The container starts with:

```bash
yarn start:api
```

Which executes:

```javascript
// scripts/start-api.mjs
await import("dist/api/server.mjs")
```

This is safe because:
1. Yarn 4 is available via Corepack
2. All necessary config files are present
3. The compiled application is in `dist/api/`

## Alternative: Direct Node Execution

If you encounter issues with Yarn in the container, you can change the CMD to:

```dockerfile
CMD ["node", "scripts/start-api.mjs"]
```

This bypasses Yarn entirely and runs Node directly. However, the current `yarn start:api` command is preferred as it:
- Matches local development
- Uses the same script defined in package.json
- Is more maintainable

## Testing Locally

Test the production image locally:

```bash
# Build the image
docker build -t interviews-tracker:test .

# Run with environment variables
docker run --rm -p 3000:3000 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="your-db-url" \
  interviews-tracker:test

# Test health endpoint
curl http://localhost:3000/health
```

## Image Size

- **Full image**: ~1.35GB (uncompressed)
- **Compressed**: ~270MB
- **Layers**: Optimized for caching (dependencies layer cached separately)

## Security

- ✅ Non-root user (nodejs:nodejs)
- ✅ Minimal Alpine base
- ✅ No build tools in runtime image
- ✅ Explicit HEALTHCHECK
- ✅ Proper signal handling via dumb-init

## Troubleshooting

### Container exits immediately

Check logs:
```bash
docker logs <container-id>
```

Common causes:
- Missing environment variable (DATABASE_URL, etc.)
- Port already in use
- Database connection failed

### "yarn: not found"

This should not happen as Corepack is enabled, but if it does:

1. Verify Corepack is enabled:
   ```dockerfile
   RUN corepack enable
   ```

2. Alternative: Change CMD to:
   ```dockerfile
   CMD ["node", "scripts/start-api.mjs"]
   ```

### Health check failing

The HEALTHCHECK runs:
```bash
node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
```

If failing:
- Check if app is listening on port 3000
- Verify `/health` endpoint exists and returns 200
- Check application logs for startup errors

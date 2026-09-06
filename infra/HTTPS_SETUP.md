# HTTPS Setup for AWS Infrastructure

This document explains how to enable HTTPS for the interviews-tracker API.

## Why HTTPS is Required

The frontend is deployed on Vercel at `https://interviews-tracker.vercel.app` (HTTPS). Modern browsers block mixed content, which means:
- ❌ HTTPS frontend → HTTP API = **BLOCKED**
- ✅ HTTPS frontend → HTTPS API = **WORKS**

Without HTTPS on the API, all requests from the production frontend will fail with mixed content errors.

## What's Included

This PR adds:

1. **ACM Certificate** (`infra/acm.tf`)
   - SSL/TLS certificate for `api.interviews.trackylab.com`
   - DNS validation using Route53
   - Automatic validation record creation

2. **HTTPS ALB Listener** (`infra/alb.tf`)
   - Port 443 listener with TLS 1.3 support
   - HTTP → HTTPS redirect on port 80
   - Modern security policy: `ELBSecurityPolicy-TLS13-1-2-2021-06`

3. **Updated Environment** (`.env.production`)
   - API URL changed from `http://` to `https://`

## Prerequisites

✅ Route53 hosted zone for `trackylab.com` must exist  
✅ `create_route53_records = true` in `terraform.tfvars`  
✅ Domain must be properly delegated to AWS Route53  

## Deployment Steps

### 1. Apply Terraform Changes

```bash
cd infra

# Review the changes
terraform plan

# Apply (will create ACM certificate and validation records)
terraform apply
```

### 2. Wait for Certificate Validation

ACM will automatically validate the certificate using DNS:

```bash
# Check certificate status
aws acm describe-certificate \
  --certificate-arn $(terraform output -raw certificate_arn) \
  --region eu-central-1
```

Validation usually takes 5-15 minutes.

### 3. Verify HTTPS Works

```bash
# Test HTTPS endpoint
curl -I https://api.interviews.trackylab.com/health

# Should return:
# HTTP/2 200
# content-type: application/json
```

### 4. Test HTTP Redirect

```bash
# Test HTTP redirects to HTTPS
curl -I http://api.interviews.trackylab.com/health

# Should return:
# HTTP/1.1 301 Moved Permanently
# Location: https://api.interviews.trackylab.com/health
```

## Infrastructure Changes

### Before (HTTP Only)
```
Browser (HTTPS) ─X→ ALB:80 (HTTP) → ECS:3000
                Mixed content blocked!
```

### After (HTTPS Enabled)
```
Browser (HTTPS) ─✓→ ALB:443 (HTTPS) → ECS:3000
                   ↑ Certificate validated
HTTP requests ──────┘ 301 redirect to HTTPS
```

## Security

- **TLS 1.3**: Uses the latest TLS protocol
- **Modern Cipher Suites**: `ELBSecurityPolicy-TLS13-1-2-2021-06`
- **Automatic Renewal**: ACM certificates auto-renew
- **HTTP Redirect**: All HTTP traffic redirected to HTTPS

## Cost Impact

- **ACM Certificate**: FREE (managed by AWS)
- **ALB HTTPS**: No additional cost (same ALB)
- **Data Transfer**: Same as before

## Troubleshooting

### Certificate Stuck in "Pending Validation"

Check Route53 records:
```bash
aws route53 list-resource-record-sets \
  --hosted-zone-id $(terraform output -raw route53_zone_id) \
  --query "ResourceRecordSets[?Type=='CNAME']"
```

### HTTPS Not Working After Apply

1. Verify certificate is issued:
   ```bash
   aws acm list-certificates --region eu-central-1
   ```

2. Check ALB listener:
   ```bash
   aws elbv2 describe-listeners \
     --load-balancer-arn $(terraform output -raw alb_arn)
   ```

3. Verify DNS resolves correctly:
   ```bash
   dig api.interviews.trackylab.com
   ```

### Mixed Content Errors in Frontend

Verify the frontend is using HTTPS:
```bash
# In browser console:
console.log(import.meta.env.VITE_API_BASE_URL)
// Should output: https://api.interviews.trackylab.com/api
```

## Rollback

If you need to rollback to HTTP:

1. Comment out the HTTPS listener in `infra/alb.tf`
2. Change HTTP listener back to `forward` instead of `redirect`
3. Update `.env.production` to use `http://`
4. Run `terraform apply`

**Note**: This will break production since browsers block mixed content.

## Next Steps After Merge

1. ✅ Merge this PR
2. ✅ Run `terraform apply` in production
3. ✅ Wait for certificate validation (~5-15 min)
4. ✅ Verify HTTPS endpoint works
5. ✅ Merge frontend PR #160
6. ✅ Vercel will redeploy with HTTPS API URL
7. ✅ Production frontend will work correctly

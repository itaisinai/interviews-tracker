# ============================================
# Route53 - DNS Configuration
# ============================================
# Optional: Only provisions DNS records if create_route53_records = true
# Requires an existing Route53 hosted zone for the specified domain

# Data source to get the existing hosted zone
# IMPORTANT: This should be your root domain's hosted zone (e.g., trackylab.com)
# If your hosted zone is "trackylab.com", update var.root_domain_name
data "aws_route53_zone" "main" {
  count = var.create_route53_records ? 1 : 0

  name         = var.root_domain_name != "" ? var.root_domain_name : var.domain_name
  private_zone = false
}

# A record for API subdomain (api.interviews.trackylab.com)
resource "aws_route53_record" "api" {
  count = var.create_route53_records ? 1 : 0

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# WWW redirect temporarily disabled (requires CloudFront)

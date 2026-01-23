# Cloudflare Security Rules Configuration

Recommended WAF and security rules for MakeTicket protection.

## 1. Rate Limiting Rules (WAF)

**Rule Name:** API Abuse Protection
- **Condition:** `http.request.uri.path contains "/api/"` AND `http.request.method in {"POST", "PUT", "DELETE"}`
- **Action:** Block or Managed Challenge
- **Threshold:** 100 requests per 1 minute
- **Key:** IP Address

**Rule Name:** Login Burst Protection
- **Condition:** `http.request.uri.path eq "/api/auth/login"`
- **Action:** Managed Challenge
- **Threshold:** 5 requests per 10 seconds
- **Key:** IP Address

## 2. Firewall Rules

**Rule Name:** Block High Risk Countries (Optional)
- **Condition:** `ip.geoip.country in {"CN", "RU", "KP"}` (Customize based on target market)
- **Action:** Managed Challenge

**Rule Name:** Block Known Bots
- **Condition:** `cf.client.bot`
- **Action:** Block
- **Exception:** Verified Bots (Google, Bing)

**Rule Name:** Admin Access Restriction
- **Condition:** `http.request.uri.path contains "/dashboard/admin"` AND `ip.src ne <YOUR_OFFICE_IP>`
- **Action:** Managed Challenge (adds extra layer of protection)

## 3. Page Rules

**Rule:** Cache Static Assets
- **URL Match:** `*maketicket.app/_next/static/*`
- **Setting:** Cache Level: Cache Everything, Edge Cache TTL: 1 month

**Rule:** Securing Uploads
- **URL Match:** `*maketicket.app/uploads/*`
- **Setting:** Security Level: High

## 4. Bot Fight Mode
- **Enable:** JavaScript Detections
- **Enable:** Bot Fight Mode

## 5. DDoS Protection
- **Setting:** Under Attack Mode (Enable only during active attack)
- **Setting:** Challenge Passage: 30 minutes
- **Setting:** Browser Integrity Check: On

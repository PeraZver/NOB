# Architecture Summary: Domain Registration → Public Web Presence via Cloudflare Tunnel (No Port Forwarding)

## 1) Domain and DNS Ownership
The internet domain nob.hr was registered and delegated to Cloudflare DNS by configuring the registrar’s nameservers to Cloudflare.
Cloudflare became the authoritative DNS provider for the zone, enabling centralized DNS management and advanced edge services.


## 2) Original Hosting Intent (Home-hosted Application)
The target workload is a self-hosted web application running on a home server with LAN address 192.168.0.88.
The application stack is containerized with Docker Compose:
 * Node.js application (HTTP service, internal port 3000)
 * MySQL database (internal port 3306, persisted volume)

## 3) Dynamic DNS Attempt (Abandoned in Final Design)
A DDNS-style approach was initially configured using a Cloudflare DDNS container to keep A records aligned with the home public IP.
During validation, the container was found to be using a different expected environment variable (API_KEY vs API_TOKEN) and was corrected; authentication and zone/record discovery succeeded.
However, the solution still depended on router port forwarding (80/443) to expose the service, which was not feasible due to provider/router constraints.

## 4) Reverse Proxy / TLS Attempt (Blocked by Inbound Connectivity)
A reverse proxy (Caddy) was introduced to terminate TLS and proxy to the application, with the intention of obtaining Let’s Encrypt certificates.
ACME issuance failed with connection refused on public 443, confirming that external inbound connectivity was blocked/not forwarded correctly. This validated that a classic “home web server behind NAT” pattern was not currently viable.

## 5) Final Architecture Decision: Cloudflare Tunnel (Recommended Pattern)
To eliminate the dependency on inbound port forwarding and to harden the perimeter, the design was shifted to Cloudflare Tunnel:

## Key design elements
A Cloudflare Tunnel was created in Cloudflare Zero Trust.
A connector (cloudflared) was deployed on the home server as a Docker container.
The tunnel’s ingress routing was configured as:
 * nob.hr → http://app:3000
 * www.nob.hr → http://app:3000
This establishes an outbound-only connection from the home environment to Cloudflare’s edge, allowing Cloudflare to publish the service without exposing the home router.

## 6) DNS Cutover for Tunnel Routing
Existing A records (@ and www) were removed because Cloudflare Tunnel routing requires dedicated hostname records.
Cloudflare automatically created CNAME records for nob.hr and www.nob.hr pointing to the tunnel endpoint (e.g., *.cfargotunnel.com).
This resolved route conflicts and ensured that all traffic for these hostnames is handled via the tunnel.

## 7) Security and Connectivity Outcomes
No inbound ports (80/443) are required on the home router. This materially reduces attack surface and avoids NAT/ISP limitations.
Public users connect via HTTPS at the Cloudflare edge using Cloudflare-managed certificates.
Cloudflare-to-home connectivity is protected by the tunnel (encrypted connection); the origin application remains private on the Docker network.
The prior DDNS mechanism is now obsolete and was recommended to be stopped/removed to prevent DNS record contention.

## 8) Operational Notes / Best Practices
The MySQL container does not require published host ports; Docker networking allows inter-service connectivity via service name (e.g., db:3306). This is both functional and more secure.
With Tunnel in place, edge-layer security controls can be added incrementally:
 * Cloudflare Access (identity-based access)
 * WAF/rate limiting
 * geo/IP restrictions
The system is resilient to residential IP changes because Cloudflare Tunnel does not depend on the public IP being stable.

## Result
The final deployed solution provides a production-grade publication pattern for a home-hosted application: Cloudflare-managed DNS + Cloudflare Tunnel + internal-only origin services, delivering https://nob.hr publicly without port forwarding while improving security posture and operational stability.


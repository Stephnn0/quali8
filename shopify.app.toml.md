client_id = "34da8696cbfc709d9fdc83cb99b19030"
name = "OneApp - Your Features"
handle = "quali8"
application_url = "https://quali8-production-1000301086677.us-central1.run.app"
embedded = true

[build]
automatically_update_urls_on_dev = false # ! important

[webhooks]
api_version = "2025-04"

[[webhooks.subscriptions]]
topics = [
"app_subscriptions/update",
"app/scopes_update",
"app/uninstalled",
]

uri = "/webhooks"
compliance_topics = [ "customers/data_request", "customers/redact", "shop/redact" ]

[access_scopes]

# Learn more at https://shopify.dev/docs/apps/tools/cli/configuration#access_scopes

scopes = "write_products, read_customers, read_shipping, write_discounts, read_orders, read_files, read_online_store_navigation, write_online_store_navigation, write_shipping"

[auth]
redirect_urls = [
"https://quali8-production-1000301086677.us-central1.run.app/auth/callback",
"https://quali8-production-1000301086677.us-central1.run.app/auth/shopify/callback",
"https://quali8-production-1000301086677.us-central1.run.app/api/auth/callback"
]

[pos]
embedded = false

[app_proxy]
url = "https://quali8-production-1000301086677.us-central1.run.app/proxy"
prefix = "apps"
subpath = "quali8"

<!-- ! ----------------------------------------------------------------- -->
<!-- ! ----------------------------------------------------------------- -->
<!-- ! ----------------------------------------------------------------- -->
<!-- ! ----------------------------------------------------------------- -->
<!-- ! ----------------------------------------------------------------- -->
<!-- ! ----------------------------------------------------------------- -->
<!-- ! ----------------------------------------------------------------- -->
<!-- ! ----------------------------------------------------------------- -->
<!-- ! ----------------------------------------------------------------- -->
<!-- ! ----------------------------------------------------------------- -->
<!-- ! ----------------------------------------------------------------- -->
<!-- ! -------------------PRODUCTION CONFIGURATION---------------------- -->
<!-- ! ----------------------------------------------------------------- -->
<!-- ! ----------------------------------------------------------------- -->
<!-- ! ----------------------------------------------------------------- -->
<!-- ! ----------------------------------------------------------------- -->

## Production Configuration

```toml
# Learn more about configuring your app at https://shopify.dev/docs/apps/tools/cli/configuration
```

client_id = "34da8696cbfc709d9fdc83cb99b19030"
name = "Quali8"
handle = "quali8"
application_url = "https://quali8.fly.dev"
embedded = true

[build]
automatically_update_urls_on_dev = false # ! important
include_config_on_deploy = true

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

scopes = "write_products, read_customers, read_shipping, write_discounts, read_orders"

[auth]
redirect_urls = [
"https://quali8.fly.dev/auth/callback",
"https://quali8.fly.dev/auth/shopify/callback",
"https://quali8.fly.dev/api/auth/callback"
]

[pos]
embedded = false

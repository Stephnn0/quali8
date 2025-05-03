fly launch
flyctl postgres create
fly deploy
fly scale count 1
flyctl config save -a 8instruments-postgres
flyctl machines destroy
fly ips list
fly ips allocate-v4 --app 8instruments-postgres

fly certs show 8instruments.com
fly certs list
fly certs add www.8instruments.com
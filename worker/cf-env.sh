# Exporta credenciais para o wrangler a partir do login do `cf` (renova o token antes).
# Uso: source ./cf-env.sh
cf auth whoami >/dev/null 2>&1
export CLOUDFLARE_API_TOKEN="$(python3 -I -c 'import json,os;print(json.load(open(os.path.expanduser("~/Library/Preferences/cloudflare/config/default.json")))["oauth_token"])')"
export CLOUDFLARE_ACCOUNT_ID="$(cf auth whoami 2>/dev/null | python3 -I -c 'import json,sys;print(json.load(sys.stdin)["accounts"][0]["id"])')"

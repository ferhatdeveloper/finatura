#!/usr/bin/env bash
set -euo pipefail
KEY="${OPENROUTER_API_KEY:-}"
if [[ -z "$KEY" ]]; then
  echo "OPENROUTER_API_KEY gerekli" >&2
  exit 1
fi
MODEL="${LLM_MODEL:-openai/gpt-4o-mini}"
echo "==> OpenRouter models (auth check)"
code=$(curl -sS -o /tmp/or_models.json -w "%{http_code}" \
  -H "Authorization: Bearer ${KEY}" \
  https://openrouter.ai/api/v1/models)
echo "HTTP $code"
if [[ "$code" != "200" ]]; then
  head -c 300 /tmp/or_models.json; echo; exit 1
fi
echo "models ok"
echo "==> chat.completions smoke"
curl -sS -o /tmp/or_chat.json -w "HTTP %{http_code}\n" \
  -H "Authorization: Bearer ${KEY}" \
  -H "Content-Type: application/json" \
  -H "HTTP-Referer: https://finatura.app" \
  -H "X-Title: Finatura" \
  https://openrouter.ai/api/v1/chat/completions \
  -d "{\"model\":\"${MODEL}\",\"messages\":[{\"role\":\"user\",\"content\":\"Say only: finatura-ok\"}],\"max_tokens\":16}"
head -c 500 /tmp/or_chat.json; echo

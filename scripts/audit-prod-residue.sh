#!/usr/bin/env bash
# audit-prod-residue.sh
# =============================================================================
# Audit "residus dev" AVANT un merge prod. Verifie qu'une ref (branche/commit)
# destinee a la prod ne contient AUCUN residu de developpement dans le code
# applicatif (src/). A lancer sur la branche de release, ou en diff vs main.
#
# Usage :
#   scripts/audit-prod-residue.sh                 # audite le working tree courant
#   scripts/audit-prod-residue.sh origin/main     # audite le DIFF net main -> HEAD
#
# Sortie : liste chaque probleme trouve. Code retour != 0 si au moins un
# probleme BLOQUANT est detecte (a integrer en garde-fou avant le merge prod).
#
# Ce que ca attrape (lecons du Chantier Qualite, aout 2026) :
#   - outillage dev branche sur la base dev (ref Supabase dev, IS_DEV_DB)
#   - comptes/donnees de test (dev.local, mot de passe dev)
#   - imports de mock data dans le code applicatif
#   - secrets/tokens en dur
#   - debugger / tests .only / .skip
#   - liens de nav ou routes morts (best-effort)
# =============================================================================
set -uo pipefail

BASE_REF="${1:-}"
FAILS=0

say()  { printf '%s\n' "$*"; }
ko()   { printf '  [BLOQUANT] %s\n' "$*"; FAILS=$((FAILS+1)); }
warn() { printf '  [A VERIFIER] %s\n' "$*"; }
ok()   { printf '  [OK] %s\n' "$*"; }

# Selon qu'on audite un diff (vs BASE_REF) ou l'arbre courant.
if [ -n "$BASE_REF" ]; then
  say "== Audit du DIFF NET $BASE_REF -> HEAD (ce qui irait en prod) =="
  SCOPE_CMD() { git diff "$BASE_REF"...HEAD -- "$@"; }
  GREP_SCOPE() { git diff "$BASE_REF"...HEAD -- src/ | grep -E '^\+' ; }
else
  say "== Audit du working tree courant (src/) =="
  SCOPE_CMD() { git --no-pager grep -n "$1" -- "${@:2}" 2>/dev/null || true; }
  GREP_SCOPE() { true; }
fi

# 1. Ref Supabase DEV / gate IS_DEV_DB / seed dev, dans src/
say "1. Outillage dev branche sur la base DEV (src/)"
HITS=$(git --no-pager grep -niE 'nkgdgxwejqqnqmwqwegy|IS_DEV_DB|DevQuickLogin|dev\.local|naturedev' -- 'src/' 2>/dev/null || true)
if [ -n "$HITS" ]; then ko "residu dev dans src/ :"; printf '%s\n' "$HITS" | sed 's/^/      /'; else ok "aucun"; fi

# 2. Fichiers dev-only qui ne doivent jamais partir en prod
say "2. Fichiers dev-only presents ?"
for f in src/components/auth/DevQuickLogin.tsx scripts/seed-dev-testdata.sql; do
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then ko "present : $f"; else ok "absent : $f"; fi
done

# 3. Import de mock data dans le code applicatif (hors tests / mock / stories)
say "3. Import de mock data en prod"
HITS=$(git --no-pager grep -niE "from ['\"].*data/mock|import .*mock(Users|Posts|Data)" -- 'src/**/*.ts' 'src/**/*.tsx' 2>/dev/null \
  | grep -viE '\.test\.|/mock/|__tests__|\.stories\.' || true)
if [ -n "$HITS" ]; then ko "mock importe en prod :"; printf '%s\n' "$HITS" | sed 's/^/      /'; else ok "aucun"; fi

# 4. Secrets / tokens en dur
say "4. Secrets/tokens en dur (src/)"
HITS=$(git --no-pager grep -niE "eyJ[A-Za-z0-9_-]{20,}|service_role|sk_live|sk_test" -- 'src/' 2>/dev/null \
  | grep -viE 'import\.meta\.env|placeholder|\.test\.' || true)
if [ -n "$HITS" ]; then ko "secret potentiel en dur :"; printf '%s\n' "$HITS" | sed 's/^/      /'; else ok "aucun"; fi

# 5. debugger / .only / .skip
say "5. debugger / tests .only / .skip (src/)"
HITS=$(git --no-pager grep -niE 'debugger|\b(it|describe|test)\.only\b|\b(it|describe|test)\.skip\b' -- 'src/' 2>/dev/null || true)
if [ -n "$HITS" ]; then ko "a retirer :"; printf '%s\n' "$HITS" | sed 's/^/      /'; else ok "aucun"; fi

# 6. Liens de nav vers des routes absentes du router (best-effort, informatif)
say "6. Liens de nav admin vs routes du router (best-effort)"
if [ -f src/router.tsx ]; then
  NAVS=$(git --no-pager grep -ohE "to: '/admin[a-z/]*'" -- 'src/**/*.tsx' 2>/dev/null | grep -oE "/admin[a-z/]*" | sort -u || true)
  for r in $NAVS; do
    leaf=$(basename "$r")
    if [ "$r" = "/admin" ]; then continue; fi
    if ! git --no-pager grep -qE "path:? ['\"]?($leaf|$r)" -- src/router.tsx 2>/dev/null; then
      warn "lien nav '$r' sans route evidente dans router.tsx (verifier si mort)"
    fi
  done
  ok "cross-check nav/routes fait"
fi

say ""
if [ "$FAILS" -gt 0 ]; then
  say "==> ECHEC : $FAILS probleme(s) BLOQUANT(s). NE PAS merger en prod avant correction."
  exit 1
else
  say "==> PROPRE : aucun residu bloquant. OK pour poursuivre le process de release."
  exit 0
fi

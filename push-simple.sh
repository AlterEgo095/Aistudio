#!/bin/bash
# ============================================================
# AI Film Studio — Push ULTRA SIMPLE
# ============================================================
# Mode d'emploi :
#   1. Ouvrez un terminal (dans le sandbox Z.ai ou ailleurs)
#   2. Tapez : export GH_TOKEN='votre_token_ici'
#   3. Tapez : cd /home/z/my-project && ./push-simple.sh
# ============================================================

set -e

if [ -z "$GH_TOKEN" ]; then
  echo "❌ Token non défini."
  echo "Tapez d'abord : export GH_TOKEN='votre_token_ici'"
  echo "Puis relancez : ./push-simple.sh"
  exit 1
fi

cd /home/z/my-project

echo "📡 Push en cours..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://AlterEgo095:${GH_TOKEN}@github.com/AlterEgo095/Aistudio.git"
git push -u origin main

# Nettoyage
git remote set-url origin https://github.com/AlterEgo095/Aistudio.git
unset GH_TOKEN

echo ""
echo "✅ Terminé ! Voir : https://github.com/AlterEgo095/Aistudio"
echo "⚠️  N'oubliez pas de révoquer votre token : https://github.com/settings/tokens"

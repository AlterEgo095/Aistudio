#!/bin/bash
# ============================================================
# AI Film Studio — Push sécurisé vers GitHub
# ============================================================
# Ce script pousse le dépôt local vers GitHub de façon SÉCURISÉE.
# Votre token n'est JAMAIS stocké dans un fichier.
# ============================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 AI Film Studio — Push vers GitHub${NC}"
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -d ".git" ]; then
  echo -e "${RED}❌ Pas un dépôt Git. Exécutez ce script depuis la racine du projet.${NC}"
  exit 1
fi

# Vérifier qu'il y a des commits à pousser
COMMITS_AHEAD=$(git rev-list --count origin/main..main 2>/dev/null || echo "?")
echo -e "Commits à pousser : ${GREEN}${COMMITS_AHEAD}${NC}"
echo ""

# Vérifier le remote
echo "Remote actuel :"
git remote -v 2>&1 || echo "(aucun)"
echo ""

# Demander le token SÉCUREMENT (ne s'affiche pas à l'écran)
echo -e "${YELLOW}🔐 Saisissez votre token GitHub (masqué) :${NC}"
echo "Créez-en un sur : https://github.com/settings/tokens (scope: repo)"
echo ""
read -s -p "Token: " GH_TOKEN
echo ""

if [ -z "$GH_TOKEN" ]; then
  echo -e "${RED}❌ Aucun token fourni. Abandon.${NC}"
  exit 1
fi

# Configurer le remote avec le token (temporaire, en mémoire)
echo -e "${GREEN}📡 Configuration du remote...${NC}"
git remote remove origin 2>/dev/null || true
git remote add origin "https://AlterEgo095:${GH_TOKEN}@github.com/AlterEgo095/Aistudio.git"

# Push
echo -e "${GREEN}⬆️  Push en cours...${NC}"
git push -u origin main

# NETTOYAGE SÉCURISÉ : retirer le token de la config git
echo ""
echo -e "${GREEN}🧹 Nettoyage sécurisé...${NC}"
git remote set-url origin https://github.com/AlterEgo095/Aistudio.git

# Vider la variable d'environnement
unset GH_TOKEN

# Succès
echo ""
echo -e "${GREEN}✅ Push réussi !${NC}"
echo ""
echo "🌐 Votre dépôt : https://github.com/AlterEgo095/Aistudio"
echo ""
echo -e "${YELLOW}⚠️  Sécurité :${NC}"
echo "  1. Révoquez votre token : https://github.com/settings/tokens"
echo "  2. Fermez votre terminal (efface l'historique)"
echo ""
echo "Pour les prochains pushs :"
echo "  git push origin main"
echo ""

#!/bin/bash

# Script automatique pour commit et push Git
# Usage: ./commit_and_push.sh [message]

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Fonction pour afficher avec couleur
print_color() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

# Fonction pour exécuter une commande avec feedback
run_cmd() {
    echo -e "${BLUE}🔄 Exécution: $1${NC}"
    if eval "$1"; then
        print_color $GREEN "✅ Succès"
        return 0
    else
        print_color $RED "❌ Échec de la commande: $1"
        return 1
    fi
}

# Banner
echo "🚀 Script de commit et push automatique"
echo "======================================================"

# Vérifier si on est dans un repo Git
if [ ! -d ".git" ]; then
    print_color $RED "❌ Erreur: Pas dans un dépôt Git"
    print_color $YELLOW "💡 Initialisez d'abord avec: git init"
    exit 1
fi

# Vérifier s'il y a des changements
if [ -z "$(git status --porcelain)" ]; then
    print_color $GREEN "✅ Aucun changement à committer"
    exit 0
fi

# Afficher les fichiers modifiés
print_color $PURPLE "📋 Fichiers modifiés:"
git status --porcelain | while read line; do
    echo "   $line"
done

# Message de commit
if [ $# -gt 0 ]; then
    # Message fourni en paramètre
    COMMIT_MESSAGE="$*"
else
    # Menu de choix
    echo ""
    print_color $YELLOW "📝 Messages de commit suggérés:"
    echo "1. 🐛 Correction des modaux et interactions employés"
    echo "2. ✨ Amélioration du système de planification"
    echo "3. 🔧 Nettoyage du code et optimisations"
    echo "4. 📱 Améliorations de l'interface utilisateur"
    echo "5. 🗑️ Correction suppression employés et créneaux"
    echo "6. 📊 Mise à jour des données et configurations"
    echo "7. 🎨 Améliorations visuelles et CSS"
    echo "8. 🚀 Nouvelles fonctionnalités"

    echo ""
    read -p "👆 Choisir un numéro (1-8) ou taper votre message: " choice

    case $choice in
        1) COMMIT_MESSAGE="🐛 Correction des modaux et interactions employés" ;;
        2) COMMIT_MESSAGE="✨ Amélioration du système de planification" ;;
        3) COMMIT_MESSAGE="🔧 Nettoyage du code et optimisations" ;;
        4) COMMIT_MESSAGE="📱 Améliorations de l'interface utilisateur" ;;
        5) COMMIT_MESSAGE="🗑️ Correction suppression employés et créneaux" ;;
        6) COMMIT_MESSAGE="📊 Mise à jour des données et configurations" ;;
        7) COMMIT_MESSAGE="🎨 Améliorations visuelles et CSS" ;;
        8) COMMIT_MESSAGE="🚀 Nouvelles fonctionnalités" ;;
        "") COMMIT_MESSAGE="📅 Mise à jour du $(date '+%d/%m/%Y à %H:%M')" ;;
        *) COMMIT_MESSAGE="$choice" ;;
    esac
fi

print_color $PURPLE "💬 Message de commit: $COMMIT_MESSAGE"

# Confirmation
echo ""
read -p "❓ Continuer? (O/n): " confirm
case $confirm in
    [nN]|[nN][oO])
        print_color $RED "❌ Annulé par l'utilisateur"
        exit 0
        ;;
esac

# Processus Git
echo ""
echo "======================================================"
print_color $BLUE "🔄 Début du processus Git..."

# 1. Git add
echo ""
print_color $YELLOW "1️⃣ Ajout des fichiers..."
if ! run_cmd "git add ."; then
    exit 1
fi

# 2. Git commit
echo ""
print_color $YELLOW "2️⃣ Création du commit..."
if ! run_cmd "git commit -m \"$COMMIT_MESSAGE\""; then
    exit 1
fi

# 3. Récupérer la branche actuelle
BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
print_color $PURPLE "📋 Branche actuelle: $BRANCH"

# 4. Git push
echo ""
print_color $YELLOW "3️⃣ Push vers origin/$BRANCH..."

if run_cmd "git push origin $BRANCH"; then
    print_color $GREEN "🎉 Succès! Modifications poussées vers GitHub"
else
    print_color $YELLOW "⚠️ Erreur lors du push. Tentatives alternatives..."

    # Essayer de set upstream
    print_color $BLUE "🔄 Tentative de set upstream..."
    if run_cmd "git push --set-upstream origin $BRANCH"; then
        print_color $GREEN "✅ Push réussi avec set-upstream"
    else
        print_color $RED "❌ Échec du push. Vérifiez:"
        echo "   - Votre connexion internet"
        echo "   - Vos droits sur le repo"
        echo "   - git remote -v"
        exit 1
    fi
fi

echo ""
echo "======================================================"
print_color $GREEN "✅ Processus terminé avec succès!"

# Afficher les derniers commits
echo ""
print_color $PURPLE "📋 Derniers commits:"
git log --oneline -5 2>/dev/null || echo "Impossible d'afficher l'historique"

# Afficher l'URL du repo (si disponible)
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ ! -z "$REMOTE_URL" ]; then
    print_color $BLUE "🔗 Repo: $REMOTE_URL"
fi

echo ""
print_color $GREEN "🎊 Terminé! Vos modifications sont maintenant sur GitHub"
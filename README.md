# 🍽️ Planning Restaurant

Une application web moderne pour gérer les plannings d'équipiers de restaurant avec interface drag & drop intuitive.

![Planning Restaurant](https://img.shields.io/badge/Python-3.8+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-2.3+-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## ✨ Fonctionnalités

### 📅 Gestion du Planning
- **Vue semaine** style Google Agenda
- **Drag & Drop** pour déplacer les créneaux
- **Redimensionnement** des créneaux par les bordures
- **Navigation** entre les semaines
- **Double-clic** pour créer/modifier rapidement

### 👥 Gestion des Équipiers
- **CRUD complet** des employés
- **Types de postes** : Cuisinier, Serveur, Barman, Manager, etc.
- **Codes couleurs** par type de poste
- **Informations détaillées** : taux horaire, contact

### 📊 Statistiques
- **Heures totales** par semaine
- **Répartition** par équipier
- **Coûts estimés** selon les taux horaires
- **Statistiques en temps réel**

### 🎨 Interface Moderne
- **Design responsive** pour mobile/desktop
- **Animations fluides** et transitions
- **Notifications** en temps réel
- **Modals** intuitives
- **Thème moderne** avec dégradés

## 🚀 Installation Rapide

### Prérequis
- Python 3.8+
- pip (gestionnaire de paquets Python)

### 1. Cloner le projet
```bash
git clone <votre-repo>
cd planning_restaurant
```

### 2. Créer l'environnement virtuel
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Installer les dépendances
```bash
pip install -r requirements.txt
```

### 4. Lancer l'application
```bash
python run.py
```

### 5. Accéder à l'application
Ouvrir votre navigateur à : **http://localhost:5000**

## 📁 Structure du Projet

```
planning_restaurant/
├── app/                     # Code de l'application
│   ├── models/             # Modèles de données
│   │   ├── employee.py     # Gestion des employés
│   │   ├── shift.py        # Gestion des créneaux
│   │   └── planning.py     # Logique métier planning
│   ├── routes/             # Routes Flask
│   │   ├── main.py         # Routes principales
│   │   └── api.py          # API REST
│   ├── templates/          # Templates HTML
│   │   ├── base.html       # Template de base
│   │   ├── index.html      # Page planning
│   │   └── planning.html   # Planning détaillé
│   ├── static/             # Fichiers statiques
│   │   ├── css/style.css   # Styles CSS
│   │   └── js/planning.js  # JavaScript
│   └── utils/              # Utilitaires
├── data/                   # Données JSON
│   ├── employees.json      # Base employés
│   └── shifts.json         # Base créneaux
├── tests/                  # Tests unitaires
├── requirements.txt        # Dépendances Python
├── config.py              # Configuration
├── run.py                 # Point d'entrée
└── README.md              # Documentation
```

## 🎮 Utilisation

### Ajouter un Équipier
1. Cliquer sur "**Nouvel équipier**"
2. Remplir le formulaire (nom, prénom, poste, taux horaire)
3. Valider

### Créer un Créneau
1. **Double-cliquer** sur une cellule du planning
2. Ou cliquer "**Ajouter un créneau**"
3. Sélectionner l'équipier, jour, heure et durée
4. Valider

### Déplacer un Créneau
1. **Glisser-déposer** le bloc coloré vers une nouvelle position
2. La validation se fait automatiquement
3. Les conflits sont détectés et signalés

### Modifier la Durée
1. **Survoler** un créneau pour voir les poignées
2. **Glisser** les bordures haut/bas pour redimensionner
3. La modification est automatique

## 🔧 Configuration PyCharm

### 1. Ouvrir le projet
- File → Open → Sélectionner le dossier `planning_restaurant`

### 2. Configurer l'interpréteur
- File → Settings → Project → Python Interpreter
- Choisir "Existing environment"
- Sélectionner `venv/Scripts/python.exe` (Windows) ou `venv/bin/python` (Linux/Mac)

### 3. Marquer les sources
- Clic droit sur le dossier `app` → Mark Directory as → Sources Root

### 4. Configuration de run
- Run → Edit Configurations
- Ajouter une nouvelle configuration Python
- Script path : `run.py`
- Working directory : dossier racine du projet

### 5. Lancer en debug
- Cliquer sur le bouton Debug ou appuyer sur **Shift+F9**

## 🌐 API REST

L'application expose une API REST complète :

### Employés
```bash
GET    /api/employees          # Liste des employés
POST   /api/employees          # Créer un employé
GET    /api/employees/{id}     # Détail d'un employé
PUT    /api/employees/{id}     # Modifier un employé
DELETE /api/employees/{id}     # Supprimer un employé
```

### Créneaux
```bash
GET    /api/shifts             # Liste des créneaux
POST   /api/shifts             # Créer un créneau
GET    /api/shifts/{id}        # Détail d'un créneau
PUT    /api/shifts/{id}        # Modifier un créneau
DELETE /api/shifts/{id}        # Supprimer un créneau
```

### Statistiques
```bash
GET    /api/stats/weekly       # Statistiques hebdomadaires
GET    /api/conflicts/{id}     # Vérifier les conflits
```

## 📱 Responsive Design

L'interface s'adapte automatiquement :
- **Desktop** : Vue complète avec toutes les fonctionnalités
- **Tablette** : Interface optimisée, navigation simplifiée
- **Mobile** : Vue condensée, interactions tactiles

## 🎨 Personnalisation

### Couleurs des Postes
Modifier dans `config.py` :
```python
EMPLOYEE_TYPES = {
    'cuisinier': {'color': '#74b9ff', 'name': 'Cuisinier'},
    'serveur': {'color': '#00b894', 'name': 'Serveur/se'},
    # Ajouter d'autres types...
}
```

### Heures de Service
```python
HOURS_RANGE = list(range(8, 24)) + list(range(0, 3))  # 8h-23h + 0h-2h
```

### Jours de la Semaine
```python
DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
```

## 🐛 Dépannage

### Erreur de port
Si le port 5000 est occupé :
```python
# Dans run.py
app.run(port=5001)  # Changer le port
```

### Problème de permissions
```bash
# Windows
pip install --user -r requirements.txt

# Linux/Mac
sudo pip install -r requirements.txt
```

### Base de données corrompue
```bash
# Supprimer les fichiers JSON pour reset
rm data/employees.json data/shifts.json
```

## 🚀 Déploiement

### Production avec Gunicorn
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 run:app
```

### Docker
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "run.py"]
```

## 🤝 Contribution

1. **Fork** le projet
2. Créer une **branche feature** (`git checkout -b feature/nouvelle-fonctionnalite`)
3. **Commit** les changements (`git commit -am 'Ajouter nouvelle fonctionnalité'`)
4. **Push** sur la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créer une **Pull Request**

## 📄 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 👨‍💻 Support

Pour toute question ou problème :
- Créer une **issue** sur GitHub
- Consulter la **documentation** dans le code
- Vérifier les **logs** dans la console

---

**Fait avec ❤️ pour simplifier la gestion des plannings restaurant**
# app/utils/helpers.py
"""
Fonctions utilitaires
"""

from datetime import datetime, timedelta
from typing import List, Dict


def get_week_dates(week_offset: int = 0) -> List[datetime]:
    """Calcule les dates d'une semaine avec offset"""
    today = datetime.now()
    monday = today - timedelta(days=today.weekday()) + timedelta(weeks=week_offset)

    week_dates = []
    for i in range(7):
        week_dates.append(monday + timedelta(days=i))

    return week_dates


def format_duration(hours: float) -> str:
    """Formate une durée en heures"""
    if hours == 0:
        return "0h"
    elif hours == int(hours):
        return f"{int(hours)}h"
    else:
        return f"{hours:.1f}h"


def validate_email(email: str) -> bool:
    """Validation basique d'email"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_phone(phone: str) -> bool:
    """Validation basique de téléphone français"""
    import re
    # Formats acceptés: 06.12.34.56.78, 06 12 34 56 78, 0612345678
    pattern = r'^0[1-9](?:[.\s]?\d{2}){4}$'
    return re.match(pattern, phone) is not None


def calculate_age(birth_date: datetime) -> int:
    """Calcule l'âge à partir de la date de naissance"""
    today = datetime.now()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))


def generate_week_number(date: datetime = None) -> str:
    """Génère le numéro de semaine au format YYYY-WW"""
    if date is None:
        date = datetime.now()
    year, week, _ = date.isocalendar()
    return f"{year}-{week:02d}"


def parse_week_number(week_str: str) -> datetime:
    """Parse un numéro de semaine YYYY-WW vers la date du lundi"""
    try:
        year, week = map(int, week_str.split('-'))
        # Premier jour de l'année
        jan1 = datetime(year, 1, 1)
        # Premier lundi de l'année
        first_monday = jan1 + timedelta(days=(7 - jan1.weekday()) % 7)
        # Lundi de la semaine demandée
        return first_monday + timedelta(weeks=week - 1)
    except:
        return datetime.now()

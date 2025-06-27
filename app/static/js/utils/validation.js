/**
 * UTILITAIRES TEMPS - Planning Restaurant
 * Remplace quarter-hour-system.js, granularity-manager.js et utils temps dispersés
 * Gestion centralisée du temps, granularité et calculs temporels
 */

class TimeUtils {
    constructor() {
        this.currentGranularity = 60; // minutes
        this.supportedGranularities = [15, 30, 60];
        this.workingHours = { start: 8, end: 24 };
        this.nightHours = { start: 0, end: 3 };

        console.log('⏰ Time Utils initialisé');
    }

    // ==================== GRANULARITÉ ====================

    /**
     * Définit la granularité actuelle
     */
    setGranularity(granularity) {
        if (!this.supportedGranularities.includes(granularity)) {
            throw new Error(`Granularité ${granularity} non supportée. Valeurs possibles: ${this.supportedGranularities.join(', ')}`);
        }

        const oldGranularity = this.currentGranularity;
        this.currentGranularity = granularity;

        console.log(`⏰ Granularité changée: ${oldGranularity}min → ${granularity}min`);

        // Émettre l'événement de changement
        window.EventBus?.emit('timeutils:granularity_changed', {
            old: oldGranularity,
            new: granularity
        });

        return this;
    }

    /**
     * Obtient la granularité actuelle
     */
    getGranularity() {
        return this.currentGranularity;
    }

    /**
     * Vérifie si une granularité est supportée
     */
    isGranularitySupported(granularity) {
        return this.supportedGranularities.includes(granularity);
    }

    /**
     * Obtient la hauteur de cellule selon la granularité
     */
    getCellHeight(granularity = null) {
        const gran = granularity || this.currentGranularity;

        const heights = {
            15: 15,
            30: 30,
            60: 60
        };

        return heights[gran] || 60;
    }

    // ==================== GÉNÉRATION DE CRÉNEAUX TEMPORELS ====================

    /**
     * Génère les créneaux temporels selon la granularité
     */
    generateTimeSlots(granularity = null, hoursRange = null) {
        const gran = granularity || this.currentGranularity;
        const hours = hoursRange || this.getDefaultHoursRange();

        const slots = [];

        hours.forEach(hour => {
            if (gran === 60) {
                // Granularité 1 heure - seulement les heures pleines
                slots.push({
                    hour,
                    minutes: 0,
                    display: this.formatTime(hour, 0),
                    key: `${hour}_0`,
                    isMainHour: true,
                    isSubSlot: false,
                    granularity: gran
                });
            } else {
                // Granularité fine - créer tous les sous-créneaux
                const slotsPerHour = 60 / gran;

                for (let slot = 0; slot < slotsPerHour; slot++) {
                    const minutes = slot * gran;

                    slots.push({
                        hour,
                        minutes,
                        display: this.formatTime(hour, minutes),
                        key: `${hour}_${minutes}`,
                        isMainHour: minutes === 0,
                        isSubSlot: minutes !== 0,
                        granularity: gran
                    });
                }
            }
        });

        console.log(`⏰ ${slots.length} créneaux générés (granularité ${gran}min)`);
        return slots;
    }

    /**
     * Obtient la plage d'heures par défaut
     */
    getDefaultHoursRange() {
        // Heures de service standard + heures de nuit
        const dayHours = [];
        for (let h = this.workingHours.start; h < this.workingHours.end; h++) {
            dayHours.push(h);
        }

        const nightHours = [];
        for (let h = this.nightHours.start; h <= this.nightHours.end; h++) {
            nightHours.push(h);
        }

        return [...dayHours, ...nightHours];
    }

    /**
     * Génère les créneaux pour un jour spécifique
     */
    generateDayTimeSlots(day, granularity = null) {
        const slots = this.generateTimeSlots(granularity);

        return slots.map(slot => ({
            ...slot,
            day,
            fullKey: `${day}_${slot.key}`,
            datetime: this.createDateTime(day, slot.hour, slot.minutes)
        }));
    }

    // ==================== FORMATAGE DU TEMPS ====================

    /**
     * Formate une heure avec minutes
     */
    formatTime(hour, minutes = 0, format = '24h') {
        if (format === '12h') {
            return this.formatTime12h(hour, minutes);
        }

        return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    /**
     * Formate en format 12h (AM/PM)
     */
    formatTime12h(hour, minutes = 0) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

        return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    /**
     * Formate une durée en heures et minutes
     */
    formatDuration(totalHours) {
        const hours = Math.floor(totalHours);
        const minutes = Math.round((totalHours - hours) * 60);

        if (hours === 0) {
            return `${minutes}min`;
        } else if (minutes === 0) {
            return `${hours}h`;
        } else {
            return `${hours}h ${minutes}min`;
        }
    }

    /**
     * Formate une plage horaire
     */
    formatTimeRange(startHour, startMinutes, endHour, endMinutes) {
        const start = this.formatTime(startHour, startMinutes);
        const end = this.formatTime(endHour, endMinutes);

        return `${start} - ${end}`;
    }

    /**
     * Formate une plage horaire avec durée
     */
    formatTimeRangeWithDuration(startHour, startMinutes, duration) {
        const { endHour, endMinutes } = this.addDuration(startHour, startMinutes, duration);
        return this.formatTimeRange(startHour, startMinutes, endHour, endMinutes);
    }

    // ==================== CALCULS TEMPORELS ====================

    /**
     * Ajoute une durée à une heure de début
     */
    addDuration(startHour, startMinutes, durationHours) {
        const totalMinutes = startMinutes + (durationHours * 60);
        const endHour = startHour + Math.floor(totalMinutes / 60);
        const endMinutes = totalMinutes % 60;

        return {
            endHour: endHour % 24, // Gérer le passage à minuit
            endMinutes: Math.round(endMinutes)
        };
    }

    /**
     * Calcule la durée entre deux heures
     */
    calculateDuration(startHour, startMinutes, endHour, endMinutes) {
        let startTotalMinutes = startHour * 60 + startMinutes;
        let endTotalMinutes = endHour * 60 + endMinutes;

        // Gérer le passage à minuit
        if (endTotalMinutes < startTotalMinutes) {
            endTotalMinutes += 24 * 60; // Ajouter 24h
        }

        const durationMinutes = endTotalMinutes - startTotalMinutes;
        return durationMinutes / 60; // Convertir en heures
    }

    /**
     * Convertit une heure en minutes depuis minuit
     */
    timeToMinutes(hour, minutes = 0) {
        return hour * 60 + minutes;
    }

    /**
     * Convertit des minutes en heure/minutes
     */
    minutesToTime(totalMinutes) {
        const hour = Math.floor(totalMinutes / 60) % 24;
        const minutes = totalMinutes % 60;

        return { hour, minutes };
    }

    /**
     * Arrondit une heure selon la granularité
     */
    roundToGranularity(hour, minutes, granularity = null) {
        const gran = granularity || this.currentGranularity;

        if (gran === 60) {
            return { hour, minutes: 0 };
        }

        const roundedMinutes = Math.round(minutes / gran) * gran;

        if (roundedMinutes >= 60) {
            return { hour: hour + 1, minutes: 0 };
        }

        return { hour, minutes: roundedMinutes };
    }

    /**
     * Trouve le créneau temporel le plus proche
     */
    findNearestTimeSlot(targetHour, targetMinutes, granularity = null) {
        const gran = granularity || this.currentGranularity;
        const slots = this.generateTimeSlots(gran);

        let nearestSlot = slots[0];
        let minDiff = Infinity;

        const targetTotalMinutes = this.timeToMinutes(targetHour, targetMinutes);

        slots.forEach(slot => {
            const slotTotalMinutes = this.timeToMinutes(slot.hour, slot.minutes);
            const diff = Math.abs(targetTotalMinutes - slotTotalMinutes);

            if (diff < minDiff) {
                minDiff = diff;
                nearestSlot = slot;
            }
        });

        return nearestSlot;
    }

    // ==================== VALIDATION TEMPORELLE ====================

    /**
     * Valide une heure
     */
    isValidTime(hour, minutes = 0) {
        return hour >= 0 && hour <= 23 && minutes >= 0 && minutes <= 59;
    }

    /**
     * Valide une durée
     */
    isValidDuration(duration) {
        return duration > 0 && duration <= 24;
    }

    /**
     * Vérifie si une heure est dans les heures de service
     */
    isWorkingHour(hour) {
        return (hour >= this.workingHours.start && hour < this.workingHours.end) ||
               (hour >= this.nightHours.start && hour <= this.nightHours.end);
    }

    /**
     * Vérifie si une heure est dans les heures de nuit
     */
    isNightHour(hour) {
        return hour >= this.nightHours.start && hour <= this.nightHours.end;
    }

    /**
     * Valide un créneau horaire complet
     */
    validateTimeSlot(startHour, startMinutes, duration) {
        const errors = [];

        if (!this.isValidTime(startHour, startMinutes)) {
            errors.push('Heure de début invalide');
        }

        if (!this.isValidDuration(duration)) {
            errors.push('Durée invalide (max 24h)');
        }

        const { endHour, endMinutes } = this.addDuration(startHour, startMinutes, duration);
        if (!this.isValidTime(endHour, endMinutes)) {
            errors.push('Heure de fin calculée invalide');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // ==================== CONFLITS TEMPORELS ====================

    /**
     * Vérifie si deux créneaux se chevauchent
     */
    doTimeSlotsOverlap(slot1, slot2) {
        const start1 = this.timeToMinutes(slot1.startHour, slot1.startMinutes || 0);
        const end1 = start1 + (slot1.duration * 60);

        const start2 = this.timeToMinutes(slot2.startHour, slot2.startMinutes || 0);
        const end2 = start2 + (slot2.duration * 60);

        return start1 < end2 && start2 < end1;
    }

    /**
     * Calcule le chevauchement entre deux créneaux
     */
    calculateOverlap(slot1, slot2) {
        if (!this.doTimeSlotsOverlap(slot1, slot2)) {
            return { duration: 0, startTime: null, endTime: null };
        }

        const start1 = this.timeToMinutes(slot1.startHour, slot1.startMinutes || 0);
        const end1 = start1 + (slot1.duration * 60);

        const start2 = this.timeToMinutes(slot2.startHour, slot2.startMinutes || 0);
        const end2 = start2 + (slot2.duration * 60);

        const overlapStart = Math.max(start1, start2);
        const overlapEnd = Math.min(end1, end2);
        const overlapDuration = (overlapEnd - overlapStart) / 60; // en heures

        return {
            duration: overlapDuration,
            startTime: this.minutesToTime(overlapStart),
            endTime: this.minutesToTime(overlapEnd)
        };
    }

    /**
     * Trouve un créneau libre adjacent
     */
    findAdjacentFreeSlot(existingSlots, targetSlot, direction = 'after') {
        const targetStart = this.timeToMinutes(targetSlot.startHour, targetSlot.startMinutes || 0);
        const targetDuration = targetSlot.duration * 60; // en minutes

        if (direction === 'after') {
            const searchStart = targetStart + targetDuration;
            return this.findFreeSlotAfter(existingSlots, searchStart, targetDuration);
        } else {
            const searchEnd = targetStart;
            return this.findFreeSlotBefore(existingSlots, searchEnd, targetDuration);
        }
    }

    /**
     * Trouve un créneau libre après une heure donnée
     */
    findFreeSlotAfter(existingSlots, searchStartMinutes, durationMinutes) {
        const dayMinutes = 24 * 60;
        let currentStart = searchStartMinutes;

        while (currentStart + durationMinutes <= dayMinutes) {
            const proposedSlot = {
                startHour: Math.floor(currentStart / 60),
                startMinutes: currentStart % 60,
                duration: durationMinutes / 60
            };

            let hasConflict = false;
            for (const slot of existingSlots) {
                if (this.doTimeSlotsOverlap(proposedSlot, slot)) {
                    const slotEnd = this.timeToMinutes(slot.startHour, slot.startMinutes || 0) + (slot.duration * 60);
                    currentStart = slotEnd;
                    hasConflict = true;
                    break;
                }
            }

            if (!hasConflict) {
                return proposedSlot;
            }
        }

        return null;
    }

    /**
     * Trouve un créneau libre avant une heure donnée
     */
    findFreeSlotBefore(existingSlots, searchEndMinutes, durationMinutes) {
        let currentEnd = searchEndMinutes;

        while (currentEnd - durationMinutes >= 0) {
            const proposedStart = currentEnd - durationMinutes;
            const proposedSlot = {
                startHour: Math.floor(proposedStart / 60),
                startMinutes: proposedStart % 60,
                duration: durationMinutes / 60
            };

            let hasConflict = false;
            for (const slot of existingSlots) {
                if (this.doTimeSlotsOverlap(proposedSlot, slot)) {
                    const slotStart = this.timeToMinutes(slot.startHour, slot.startMinutes || 0);
                    currentEnd = slotStart;
                    hasConflict = true;
                    break;
                }
            }

            if (!hasConflict) {
                return proposedSlot;
            }
        }

        return null;
    }

    // ==================== DATES ET SEMAINES ====================

    /**
     * Crée un objet Date pour un jour et une heure donnés
     */
    createDateTime(day, hour, minutes = 0) {
        const now = new Date();
        const dayIndex = this.getDayIndex(day);

        // Calculer le début de la semaine courante (lundi)
        const currentDay = now.getDay();
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);

        // Calculer la date du jour demandé
        const targetDate = new Date(monday);
        targetDate.setDate(monday.getDate() + dayIndex);
        targetDate.setHours(hour, minutes, 0, 0);

        return targetDate;
    }

    /**
     * Obtient l'index numérique d'un jour (0=Lundi, 6=Dimanche)
     */
    getDayIndex(day) {
        const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        return days.indexOf(day);
    }

    /**
     * Obtient le nom du jour à partir d'un index
     */
    getDayName(index) {
        const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        return days[index] || 'Inconnu';
    }

    /**
     * Calcule la durée totale d'une liste de créneaux
     */
    calculateTotalDuration(slots) {
        return slots.reduce((total, slot) => total + (slot.duration || 0), 0);
    }

    /**
     * Groupe les créneaux par jour
     */
    groupSlotsByDay(slots) {
        const grouped = {};

        slots.forEach(slot => {
            const day = slot.day || 'Inconnu';
            if (!grouped[day]) {
                grouped[day] = [];
            }
            grouped[day].push(slot);
        });

        // Trier les créneaux de chaque jour par heure
        Object.keys(grouped).forEach(day => {
            grouped[day].sort((a, b) => {
                const timeA = this.timeToMinutes(a.startHour, a.startMinutes || 0);
                const timeB = this.timeToMinutes(b.startHour, b.startMinutes || 0);
                return timeA - timeB;
            });
        });

        return grouped;
    }

    /**
     * Calcule les statistiques temporelles d'une liste de créneaux
     */
    calculateTimeStats(slots) {
        const stats = {
            totalSlots: slots.length,
            totalHours: this.calculateTotalDuration(slots),
            averageDuration: 0,
            shortestSlot: null,
            longestSlot: null,
            byDay: {},
            workingDays: 0,
            nightSlots: 0
        };

        if (slots.length === 0) return stats;

        // Calcul de la durée moyenne
        stats.averageDuration = stats.totalHours / slots.length;

        // Trouver le plus court et le plus long
        let shortest = slots[0];
        let longest = slots[0];

        slots.forEach(slot => {
            if ((slot.duration || 0) < (shortest.duration || 0)) {
                shortest = slot;
            }
            if ((slot.duration || 0) > (longest.duration || 0)) {
                longest = slot;
            }

            // Compter les créneaux de nuit
            if (this.isNightHour(slot.startHour)) {
                stats.nightSlots++;
            }
        });

        stats.shortestSlot = shortest;
        stats.longestSlot = longest;

        // Grouper par jour et calculer les statistiques
        const byDay = this.groupSlotsByDay(slots);
        stats.workingDays = Object.keys(byDay).length;

        Object.entries(byDay).forEach(([day, daySlots]) => {
            stats.byDay[day] = {
                slots: daySlots.length,
                hours: this.calculateTotalDuration(daySlots),
                firstStart: daySlots[0] ? this.formatTime(daySlots[0].startHour, daySlots[0].startMinutes) : null,
                lastEnd: null
            };

            // Calculer la fin du dernier créneau
            if (daySlots.length > 0) {
                const lastSlot = daySlots[daySlots.length - 1];
                const { endHour, endMinutes } = this.addDuration(
                    lastSlot.startHour,
                    lastSlot.startMinutes || 0,
                    lastSlot.duration || 0
                );
                stats.byDay[day].lastEnd = this.formatTime(endHour, endMinutes);
            }
        });

        return stats;
    }

    // ==================== UTILITAIRES DE GRANULARITÉ ====================

    /**
     * Convertit une durée en nombre de créneaux selon la granularité
     */
    durationToSlots(duration, granularity = null) {
        const gran = granularity || this.currentGranularity;

        if (gran === 60) {
            return Math.ceil(duration);
        }

        return Math.ceil((duration * 60) / gran);
    }

    /**
     * Convertit un nombre de créneaux en durée
     */
    slotsToDuration(slots, granularity = null) {
        const gran = granularity || this.currentGranularity;

        if (gran === 60) {
            return slots;
        }

        return (slots * gran) / 60;
    }

    /**
     * Calcule le nombre de créneaux entre deux heures
     */
    getSlotsBetween(startHour, startMinutes, endHour, endMinutes, granularity = null) {
        const duration = this.calculateDuration(startHour, startMinutes, endHour, endMinutes);
        return this.durationToSlots(duration, granularity);
    }

    /**
     * Génère une grille temporelle pour l'affichage
     */
    generateTimeGrid(granularity = null, hoursRange = null) {
        const gran = granularity || this.currentGranularity;
        const hours = hoursRange || this.getDefaultHoursRange();

        const grid = {
            granularity: gran,
            cellHeight: this.getCellHeight(gran),
            totalSlots: 0,
            hours: []
        };

        hours.forEach(hour => {
            const hourData = {
                hour,
                display: this.formatTime(hour, 0),
                slots: []
            };

            if (gran === 60) {
                hourData.slots.push({
                    minutes: 0,
                    display: this.formatTime(hour, 0),
                    key: `${hour}_0`,
                    isMainSlot: true
                });
                grid.totalSlots++;
            } else {
                const slotsPerHour = 60 / gran;
                for (let i = 0; i < slotsPerHour; i++) {
                    const minutes = i * gran;
                    hourData.slots.push({
                        minutes,
                        display: this.formatTime(hour, minutes),
                        key: `${hour}_${minutes}`,
                        isMainSlot: minutes === 0
                    });
                    grid.totalSlots++;
                }
            }

            grid.hours.push(hourData);
        });

        return grid;
    }

    // ==================== MÉTHODES DE CONFIGURATION ====================

    /**
     * Configure les heures de travail
     */
    setWorkingHours(start, end) {
        this.workingHours = { start, end };
        console.log(`⏰ Heures de travail mises à jour: ${start}h-${end}h`);
        return this;
    }

    /**
     * Configure les heures de nuit
     */
    setNightHours(start, end) {
        this.nightHours = { start, end };
        console.log(`⏰ Heures de nuit mises à jour: ${start}h-${end}h`);
        return this;
    }

    /**
     * Ajoute une granularité supportée
     */
    addSupportedGranularity(granularity) {
        if (!this.supportedGranularities.includes(granularity)) {
            this.supportedGranularities.push(granularity);
            this.supportedGranularities.sort((a, b) => a - b);
            console.log(`⏰ Granularité ${granularity}min ajoutée`);
        }
        return this;
    }

    // ==================== EXPORT ET IMPORT ====================

    /**
     * Exporte la configuration temporelle
     */
    exportConfig() {
        return {
            currentGranularity: this.currentGranularity,
            supportedGranularities: [...this.supportedGranularities],
            workingHours: { ...this.workingHours },
            nightHours: { ...this.nightHours }
        };
    }

    /**
     * Importe une configuration temporelle
     */
    importConfig(config) {
        if (config.currentGranularity) {
            this.setGranularity(config.currentGranularity);
        }

        if (config.supportedGranularities) {
            this.supportedGranularities = [...config.supportedGranularities];
        }

        if (config.workingHours) {
            this.workingHours = { ...config.workingHours };
        }

        if (config.nightHours) {
            this.nightHours = { ...config.nightHours };
        }

        console.log('⏰ Configuration temporelle importée');
        return this;
    }

    // ==================== DEBUG ET TESTS ====================

    /**
     * Debug - Affiche l'état complet
     */
    debug() {
        console.group('⏰ TimeUtils Debug');
        console.log('Granularité actuelle:', this.currentGranularity);
        console.log('Granularités supportées:', this.supportedGranularities);
        console.log('Heures de travail:', this.workingHours);
        console.log('Heures de nuit:', this.nightHours);
        console.log('Créneaux générés:', this.generateTimeSlots().length);
        console.groupEnd();
    }

    /**
     * Teste les fonctionnalités temporelles
     */
    test() {
        console.log('🧪 Test des utilitaires temps...');

        // Test génération de créneaux
        const slots15 = this.generateTimeSlots(15);
        const slots30 = this.generateTimeSlots(30);
        const slots60 = this.generateTimeSlots(60);

        console.log(`Créneaux 15min: ${slots15.length}`);
        console.log(`Créneaux 30min: ${slots30.length}`);
        console.log(`Créneaux 60min: ${slots60.length}`);

        // Test calculs
        const duration = this.calculateDuration(9, 30, 17, 45);
        console.log(`Durée 9:30-17:45: ${duration}h`);

        const { endHour, endMinutes } = this.addDuration(9, 30, 8);
        console.log(`9:30 + 8h = ${endHour}:${endMinutes.toString().padStart(2, '0')}`);

        // Test validation
        const validation = this.validateTimeSlot(9, 30, 8);
        console.log(`Validation 9:30 (8h):`, validation);

        // Test chevauchement
        const slot1 = { startHour: 9, startMinutes: 0, duration: 4 };
        const slot2 = { startHour: 12, startMinutes: 0, duration: 4 };
        const overlap = this.doTimeSlotsOverlap(slot1, slot2);
        console.log(`Chevauchement 9h-13h vs 12h-16h:`, overlap);

        console.log('✅ Tests terminés');
    }

    /**
     * Benchmark des performances
     */
    benchmark() {
        console.log('📊 Benchmark TimeUtils...');

        const iterations = 1000;

        // Test génération de créneaux
        console.time('Génération créneaux 15min');
        for (let i = 0; i < iterations; i++) {
            this.generateTimeSlots(15);
        }
        console.timeEnd('Génération créneaux 15min');

        // Test calculs de durée
        console.time('Calculs de durée');
        for (let i = 0; i < iterations; i++) {
            this.calculateDuration(9, 30, 17, 45);
        }
        console.timeEnd('Calculs de durée');

        // Test détection de conflits
        const testSlots = [
            { startHour: 9, startMinutes: 0, duration: 4 },
            { startHour: 12, startMinutes: 0, duration: 4 },
            { startHour: 15, startMinutes: 0, duration: 3 }
        ];

        console.time('Détection conflits');
        for (let i = 0; i < iterations; i++) {
            for (let j = 0; j < testSlots.length; j++) {
                for (let k = j + 1; k < testSlots.length; k++) {
                    this.doTimeSlotsOverlap(testSlots[j], testSlots[k]);
                }
            }
        }
        console.timeEnd('Détection conflits');

        console.log('✅ Benchmark terminé');
    }
}

// Instance globale unique
if (!window.TimeUtils) {
    window.TimeUtils = new TimeUtils();

    // Exposer pour debugging
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugTime = () => window.TimeUtils.debug();
        window.testTime = () => window.TimeUtils.test();
        window.benchmarkTime = () => window.TimeUtils.benchmark();
    }
}

// Export pour modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimeUtils;
}
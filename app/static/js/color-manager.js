/**
 * Planning Restaurant - Gestionnaire des couleurs
 * Attribution et gestion des couleurs pour les employés et créneaux
 */

class ColorManager {
    constructor() {
        this.employeeColors = new Map();
        this.colorIndex = 0;
        this.usedColors = new Set();

        // Palette de couleurs moderne et accessible
        this.colorPalette = [
            { bg: '#74b9ff', border: '#0984e3', text: 'white', name: 'Bleu océan' },
            { bg: '#00b894', border: '#00a085', text: 'white', name: 'Vert émeraude' },
            { bg: '#fdcb6e', border: '#e17055', text: 'white', name: 'Orange coucher' },
            { bg: '#a29bfe', border: '#6c5ce7', text: 'white', name: 'Violet lavande' },
            { bg: '#fd79a8', border: '#e84393', text: 'white', name: 'Rose bonbon' },
            { bg: '#6c5ce7', border: '#5f3dc4', text: 'white', name: 'Indigo profond' },
            { bg: '#ff6b6b', border: '#ee5a24', text: 'white', name: 'Rouge corail' },
            { bg: '#4ecdc4', border: '#26d0ce', text: 'white', name: 'Turquoise' },
            { bg: '#45b7d1', border: '#3742fa', text: 'white', name: 'Bleu ciel' },
            { bg: '#96ceb4', border: '#6c5ce7', text: 'white', name: 'Vert menthe' },
            { bg: '#feca57', border: '#ff9ff3', text: 'white', name: 'Jaune soleil' },
            { bg: '#ff9ff3', border: '#f368e0', text: 'white', name: 'Rose fuchsia' }
        ];

        // Couleurs par type de poste (plus spécialisées)
        this.typeColors = {
            'cuisinier': { bg: '#74b9ff', border: '#0984e3', text: 'white', name: 'Bleu chef' },
            'serveur': { bg: '#00b894', border: '#00a085', text: 'white', name: 'Vert service' },
            'barman': { bg: '#fdcb6e', border: '#e17055', text: 'white', name: 'Orange bar' },
            'manager': { bg: '#a29bfe', border: '#6c5ce7', text: 'white', name: 'Violet management' },
            'aide': { bg: '#6c5ce7', border: '#5f3dc4', text: 'white', name: 'Indigo aide' },
            'commis': { bg: '#fd79a8', border: '#e84393', text: 'white', name: 'Rose commis' }
        };

        this.init();
    }

    /**
     * Initialise le gestionnaire de couleurs
     */
    init() {
        this.loadStoredColors();
        Logger.debug('ColorManager initialisé');
    }

    /**
     * Charge les couleurs sauvegardées
     */
    loadStoredColors() {
        try {
            const stored = localStorage.getItem('planning_employee_colors');
            if (stored) {
                const colors = JSON.parse(stored);
                this.employeeColors = new Map(Object.entries(colors));

                // Marquer les couleurs comme utilisées
                this.employeeColors.forEach(color => {
                    this.usedColors.add(this.getColorKey(color));
                });

                Logger.debug(`${this.employeeColors.size} couleurs d'employés chargées`);
            }
        } catch (error) {
            Logger.warn('Erreur lors du chargement des couleurs:', error);
            this.employeeColors.clear();
        }
    }

    /**
     * Sauvegarde les couleurs
     */
    saveColors() {
        try {
            const colors = Object.fromEntries(this.employeeColors);
            localStorage.setItem('planning_employee_colors', JSON.stringify(colors));
            Logger.debug('Couleurs sauvegardées');
        } catch (error) {
            Logger.warn('Erreur lors de la sauvegarde des couleurs:', error);
        }
    }

    /**
     * Obtient la couleur pour un employé
     */
    getEmployeeColor(employeeId) {
        // Vérifier si l'employé a déjà une couleur assignée
        if (this.employeeColors.has(employeeId)) {
            return this.employeeColors.get(employeeId);
        }

        // Obtenir l'employé pour connaître son type
        const employee = AppState.employees.get(employeeId);
        let color;

        if (employee && this.typeColors[employee.poste]) {
            // Utiliser la couleur du type si disponible
            color = { ...this.typeColors[employee.poste] };
        } else {
            // Sinon, prendre la prochaine couleur de la palette
            color = this.getNextAvailableColor();
        }

        // Assigner et sauvegarder
        this.employeeColors.set(employeeId, color);
        this.usedColors.add(this.getColorKey(color));
        this.saveColors();

        Logger.debug(`Couleur assignée à ${employeeId}:`, color);
        return color;
    }

    /**
     * Obtient la prochaine couleur disponible
     */
    getNextAvailableColor() {
        // Essayer de trouver une couleur non utilisée
        for (let i = 0; i < this.colorPalette.length; i++) {
            const color = this.colorPalette[(this.colorIndex + i) % this.colorPalette.length];
            const colorKey = this.getColorKey(color);

            if (!this.usedColors.has(colorKey)) {
                this.colorIndex = (this.colorIndex + i + 1) % this.colorPalette.length;
                return { ...color };
            }
        }

        // Si toutes les couleurs sont utilisées, générer une variation
        const baseColor = this.colorPalette[this.colorIndex % this.colorPalette.length];
        this.colorIndex = (this.colorIndex + 1) % this.colorPalette.length;

        return this.generateColorVariation(baseColor);
    }

    /**
     * Génère une variation d'une couleur
     */
    generateColorVariation(baseColor) {
        const variation = this.adjustColorBrightness(baseColor.bg, 0.1 + Math.random() * 0.2);
        const borderVariation = this.adjustColorBrightness(baseColor.border, 0.1 + Math.random() * 0.2);

        return {
            bg: variation,
            border: borderVariation,
            text: baseColor.text,
            name: `${baseColor.name} (variation)`
        };
    }

    /**
     * Ajuste la luminosité d'une couleur hexadécimale
     */
    adjustColorBrightness(hex, factor) {
        // Convertir hex en RGB
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        // Ajuster la luminosité
        const newR = Math.min(255, Math.max(0, Math.round(r * (1 + factor))));
        const newG = Math.min(255, Math.max(0, Math.round(g * (1 + factor))));
        const newB = Math.min(255, Math.max(0, Math.round(b * (1 + factor))));

        // Reconvertir en hex
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }

    /**
     * Crée une clé unique pour une couleur
     */
    getColorKey(color) {
        return `${color.bg}-${color.border}`;
    }

    /**
     * Change la couleur d'un employé
     */
    setEmployeeColor(employeeId, color) {
        if (!color || !color.bg || !color.border) {
            Logger.warn('Couleur invalide fournie');
            return false;
        }

        // Supprimer l'ancienne couleur des couleurs utilisées
        const oldColor = this.employeeColors.get(employeeId);
        if (oldColor) {
            this.usedColors.delete(this.getColorKey(oldColor));
        }

        // Assigner la nouvelle couleur
        this.employeeColors.set(employeeId, { ...color });
        this.usedColors.add(this.getColorKey(color));
        this.saveColors();

        Logger.debug(`Couleur changée pour ${employeeId}:`, color);
        EventBus.emit('color:changed', { employeeId, color });
        return true;
    }

    /**
     * Génère une couleur aléatoire pour un employé
     */
    generateRandomEmployeeColor(employeeId) {
        const randomColor = this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
        const variation = this.generateColorVariation(randomColor);

        return this.setEmployeeColor(employeeId, variation);
    }

    /**
     * Supprime la couleur d'un employé
     */
    removeEmployeeColor(employeeId) {
        const color = this.employeeColors.get(employeeId);
        if (color) {
            this.usedColors.delete(this.getColorKey(color));
            this.employeeColors.delete(employeeId);
            this.saveColors();

            Logger.debug(`Couleur supprimée pour ${employeeId}`);
            EventBus.emit('color:removed', { employeeId });
            return true;
        }
        return false;
    }

    /**
     * Réinitialise toutes les couleurs
     */
    resetColors() {
        this.employeeColors.clear();
        this.usedColors.clear();
        this.colorIndex = 0;
        this.saveColors();

        Logger.info('Toutes les couleurs ont été réinitialisées');
        EventBus.emit('color:reset');
    }

    /**
     * Obtient une couleur contrastante pour le texte
     */
    getContrastingTextColor(backgroundColor) {
        // Convertir la couleur de fond en RGB
        const r = parseInt(backgroundColor.slice(1, 3), 16);
        const g = parseInt(backgroundColor.slice(3, 5), 16);
        const b = parseInt(backgroundColor.slice(5, 7), 16);

        // Calculer la luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Retourner blanc ou noir selon la luminance
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    /**
     * Génère un dégradé CSS à partir d'une couleur
     */
    generateGradient(color, direction = '135deg') {
        return `linear-gradient(${direction}, ${color.bg}, ${color.border})`;
    }

    /**
     * Obtient une couleur plus claire
     */
    getLighterColor(color, factor = 0.3) {
        return {
            ...color,
            bg: this.adjustColorBrightness(color.bg, factor),
            border: this.adjustColorBrightness(color.border, factor)
        };
    }

    /**
     * Obtient une couleur plus foncée
     */
    getDarkerColor(color, factor = 0.3) {
        return {
            ...color,
            bg: this.adjustColorBrightness(color.bg, -factor),
            border: this.adjustColorBrightness(color.border, -factor)
        };
    }

    /**
     * Vérifie si deux couleurs sont similaires
     */
    areColorsSimilar(color1, color2, threshold = 50) {
        const rgb1 = this.hexToRgb(color1.bg);
        const rgb2 = this.hexToRgb(color2.bg);

        if (!rgb1 || !rgb2) return false;

        const distance = Math.sqrt(
            Math.pow(rgb1.r - rgb2.r, 2) +
            Math.pow(rgb1.g - rgb2.g, 2) +
            Math.pow(rgb1.b - rgb2.b, 2)
        );

        return distance < threshold;
    }

    /**
     * Convertit une couleur hex en RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * Convertit RGB en hex
     */
    rgbToHex(r, g, b) {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    /**
     * Génère une palette de couleurs harmonieuses
     */
    generateHarmoniousPalette(baseColor, count = 5) {
        const palette = [baseColor];
        const baseRgb = this.hexToRgb(baseColor.bg);

        if (!baseRgb) return palette;

        for (let i = 1; i < count; i++) {
            const hue = (i * 360 / count) % 360;
            const newColor = this.hslToRgb(hue, 0.7, 0.6);

            palette.push({
                bg: this.rgbToHex(newColor.r, newColor.g, newColor.b),
                border: this.rgbToHex(
                    Math.max(0, newColor.r - 30),
                    Math.max(0, newColor.g - 30),
                    Math.max(0, newColor.b - 30)
                ),
                text: 'white',
                name: `Couleur harmonieuse ${i}`
            });
        }

        return palette;
    }

    /**
     * Convertit HSL en RGB
     */
    hslToRgb(h, s, l) {
        h /= 360;
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        const r = Math.round(this.hueToRgb(p, q, h + 1/3) * 255);
        const g = Math.round(this.hueToRgb(p, q, h) * 255);
        const b = Math.round(this.hueToRgb(p, q, h - 1/3) * 255);

        return { r, g, b };
    }

    /**
     * Aide pour la conversion HSL vers RGB
     */
    hueToRgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    }

    /**
     * Crée un sélecteur de couleurs
     */
    createColorPicker(containerId, currentColor, onColorChange) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        container.className = 'color-picker-grid';

        // Ajouter les couleurs de la palette
        this.colorPalette.forEach((color, index) => {
            const colorOption = document.createElement('div');
            colorOption.className = 'color-option';
            colorOption.style.background = this.generateGradient(color);
            colorOption.title = color.name;

            if (currentColor && this.getColorKey(currentColor) === this.getColorKey(color)) {
                colorOption.classList.add('selected');
            }

            colorOption.addEventListener('click', () => {
                // Supprimer la sélection précédente
                container.querySelectorAll('.color-option').forEach(el => {
                    el.classList.remove('selected');
                });

                // Marquer comme sélectionné
                colorOption.classList.add('selected');

                // Callback
                if (onColorChange) {
                    onColorChange(color);
                }
            });

            container.appendChild(colorOption);
        });
    }

    /**
     * Exporte les couleurs
     */
    exportColors() {
        const data = {
            employeeColors: Object.fromEntries(this.employeeColors),
            colorPalette: this.colorPalette,
            typeColors: this.typeColors,
            timestamp: new Date().toISOString()
        };

        return JSON.stringify(data, null, 2);
    }

    /**
     * Importe les couleurs
     */
    importColors(jsonData) {
        try {
            const data = JSON.parse(jsonData);

            if (data.employeeColors) {
                this.employeeColors = new Map(Object.entries(data.employeeColors));
                this.usedColors.clear();

                this.employeeColors.forEach(color => {
                    this.usedColors.add(this.getColorKey(color));
                });
            }

            if (data.colorPalette) {
                this.colorPalette = data.colorPalette;
            }

            if (data.typeColors) {
                this.typeColors = data.typeColors;
            }

            this.saveColors();
            Logger.info('Couleurs importées avec succès');
            EventBus.emit('color:imported');

            return true;
        } catch (error) {
            Logger.error('Erreur lors de l\'import des couleurs:', error);
            return false;
        }
    }

    /**
     * Obtient les statistiques des couleurs
     */
    getStats() {
        return {
            totalEmployees: this.employeeColors.size,
            totalColors: this.colorPalette.length,
            usedColors: this.usedColors.size,
            availableColors: this.colorPalette.length - this.usedColors.size,
            typeColors: Object.keys(this.typeColors).length
        };
    }

    /**
     * Destruction propre
     */
    destroy() {
        this.saveColors();
        this.employeeColors.clear();
        this.usedColors.clear();
        Logger.info('ColorManager détruit');
    }
}

// Styles CSS pour le sélecteur de couleurs
const colorPickerStyles = `
    .color-picker-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
        gap: 8px;
        padding: 16px;
        max-width: 300px;
    }

    .color-option {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.2s ease;
        position: relative;
    }

    .color-option:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    .color-option.selected {
        border-color: #333;
        transform: scale(1.1);
    }

    .color-option.selected::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-weight: bold;
        text-shadow: 0 0 3px rgba(0,0,0,0.5);
    }
`;

// Ajouter les styles au DOM
function addColorPickerStyles() {
    if (!document.getElementById('color-picker-styles')) {
        const style = document.createElement('style');
        style.id = 'color-picker-styles';
        style.textContent = colorPickerStyles;
        document.head.appendChild(style);
    }
}

// Instance globale
let colorManagerInstance = null;

/**
 * Factory pour créer/récupérer l'instance
 */
function getColorManager() {
    if (!colorManagerInstance) {
        colorManagerInstance = new ColorManager();
        addColorPickerStyles();
    }
    return colorManagerInstance;
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.ColorManager = getColorManager();
    window.addColorPickerStyles = addColorPickerStyles;
}

// Pour les modules CommonJS/ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ColorManager, getColorManager, addColorPickerStyles };
}

Logger.info('ColorManager chargé avec succès');
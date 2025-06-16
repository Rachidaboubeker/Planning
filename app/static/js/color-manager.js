/**
 * Gestionnaire de couleurs
 */
class ColorManager {
    static colorPalette = [
        { bg: '#74b9ff', border: '#0984e3', text: 'white' },
        { bg: '#00b894', border: '#00a085', text: 'white' },
        { bg: '#fdcb6e', border: '#e17055', text: 'white' },
        { bg: '#a29bfe', border: '#6c5ce7', text: 'white' },
        { bg: '#fd79a8', border: '#e84393', text: 'white' },
        { bg: '#6c5ce7', border: '#5f3dc4', text: 'white' },
        { bg: '#ff6b6b', border: '#ee5a24', text: 'white' },
        { bg: '#4ecdc4', border: '#26d0ce', text: 'white' }
    ];

    static employeeColors = new Map();
    static colorIndex = 0;

    static getEmployeeColor(employeeId) {
        if (!this.employeeColors.has(employeeId)) {
            const color = this.colorPalette[this.colorIndex % this.colorPalette.length];
            this.employeeColors.set(employeeId, color);
            this.colorIndex++;
        }
        return this.employeeColors.get(employeeId);
    }

    static resetColors() {
        this.employeeColors.clear();
        this.colorIndex = 0;
    }
}

window.ColorManager = ColorManager;
console.log('🎨 ColorManager chargé');
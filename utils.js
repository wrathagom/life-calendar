export function getWeeksLived(dob) {
    const birthDate = new Date(dob);
    const now = new Date();
    const diffTime = now - birthDate;
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    return Math.max(0, diffWeeks);
}

export function getWeekIndexForDate(dob, date) {
    const birthDate = new Date(dob);
    const targetDate = new Date(date);
    const diffTime = targetDate - birthDate;
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks;
}

export function getPeriodPolygons(count) {
    // Returns array of SVG polygon point strings for each segment
    // Using 100x100 viewBox coordinates
    switch (count) {
        case 2:
            // Diagonal split: top-left triangle, bottom-right triangle
            return [
                '0,0 100,0 0,100',
                '100,0 100,100 0,100'
            ];
        case 3:
            // Y-split / pinwheel: top, bottom-right, bottom-left
            return [
                '0,0 100,0 50,50',
                '100,0 100,100 50,50',
                '0,0 50,50 100,100 0,100'
            ];
        case 4:
            // X-split into quarters: left, top, right, bottom
            return [
                '0,0 50,50 0,100',
                '0,0 100,0 50,50',
                '100,0 100,100 50,50',
                '50,50 100,100 0,100'
            ];
        default:
            return [];
    }
}

export function getMomentShapeSVG(shape, color) {
    switch (shape) {
        case 'star':
            return `<svg viewBox="0 0 24 24" fill="${color}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
        case 'heart':
            return `<svg viewBox="0 0 24 24" fill="${color}"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
        case 'diamond':
            return `<svg viewBox="0 0 24 24" fill="${color}"><path d="M12 2L2 12l10 10 10-10L12 2z"/></svg>`;
        case 'circle':
            return `<svg viewBox="0 0 24 24" fill="${color}"><circle cx="12" cy="12" r="10"/></svg>`;
        default:
            return `<svg viewBox="0 0 24 24" fill="${color}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
    }
}

export function getShapeSymbol(shape) {
    switch (shape) {
        case 'star': return '★';
        case 'heart': return '♥';
        case 'diamond': return '◆';
        case 'circle': return '●';
        default: return '★';
    }
}

export function formatWeekDate(date, weekIndex) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const age = Math.floor(weekIndex / 52);
    const weekOfYear = (weekIndex % 52) + 1;
    return `${month} ${year} (Age ${age}, Week ${weekOfYear})`;
}

export function isMobile() {
    return window.innerWidth <= 768;
}

export function calculateGrid(totalWeeks, numCalendars = 1) {
    const gap = 2;
    // Use visualViewport if available (more accurate on mobile), otherwise fall back to window
    const visualVP = window.visualViewport;
    let viewportWidth = visualVP ? visualVP.width : window.innerWidth;
    let viewportHeight = visualVP ? visualVP.height : window.innerHeight;

    // Add padding to account for browser chrome and prevent overflow
    // Mobile browsers have dynamic toolbars that can cause issues
    const padding = 16;
    viewportWidth -= padding * 2;
    viewportHeight -= padding * 2;

    // On mobile, calendars are shown one at a time (swipe view), so don't divide width
    const effectiveNumCalendars = isMobile() ? 1 : numCalendars;

    // Divide width by number of calendars (with gap between them)
    const calendarGap = 24;
    const availableWidth = (viewportWidth - (effectiveNumCalendars - 1) * calendarGap) / effectiveNumCalendars;

    let bestColumns = 52;
    let bestRows = Math.ceil(totalWeeks / 52);
    let bestCellSize = 1;

    // Try different column counts to find the one that maximizes cell size
    // while fitting everything on screen
    for (let cols = 30; cols <= 150; cols++) {
        const rows = Math.ceil(totalWeeks / cols);

        // Calculate the cell size needed to fit this grid
        // Total width = cols * cellSize + (cols - 1) * gap
        // Total height = rows * cellSize + (rows - 1) * gap
        const maxCellWidth = (availableWidth - (cols - 1) * gap) / cols;
        const maxCellHeight = (viewportHeight - (rows - 1) * gap) / rows;
        const cellSize = Math.min(maxCellWidth, maxCellHeight);

        if (cellSize > bestCellSize && cellSize >= 2) {
            bestCellSize = cellSize;
            bestColumns = cols;
            bestRows = rows;
        }
    }

    return {
        columns: bestColumns,
        rows: bestRows,
        cellSize: Math.floor(bestCellSize)
    };
}

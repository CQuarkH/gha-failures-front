export const CANVAS_CONSTANTS = {
    SCREEN_WIDTH: typeof window !== 'undefined' ? window.innerWidth : 1920,
    MIN_LAYER_SPACING: typeof window !== 'undefined' ? window.innerWidth / 10 : 192,
    BOX_SPACING: 10,
    START_X: 80,
    START_Y: 80,
    MICROPRINT_SIZE: 9,
    MICROPRINT_COLUMNS: 40,
    GRID_SIZE: 50,
    SMALL_GRID_SIZE: 10,
    ZOOM: {
        MIN: 0.1,
        MAX: 3,
        SENSITIVITY: 0.1
    }
} as const;

export const LAYER_LABELS = {
    1: 'Runs',
    2: 'Attempts',
    3: 'Jobs',
    4: 'Steps',
    5: 'Microprint'
} as const;
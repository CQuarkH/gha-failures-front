import type { MicroprintLayout } from '../types/canvas';

export const calculateOptimalLayout = (totalSegments: number): MicroprintLayout => {
    if (totalSegments <= 0) return { columns: 1, rows: 1, actualRatio: 1, efficiency: 100 };

    let targetRatio: number;
    let maxColumns: number;

    if (totalSegments <= 100) {
        targetRatio = 2.5;
        maxColumns = 12;
    } else if (totalSegments <= 1000) {
        targetRatio = 3.0;
        maxColumns = 25;
    } else if (totalSegments <= 10000) {
        targetRatio = 3.5;
        maxColumns = 50;
    } else if (totalSegments <= 50000) {
        targetRatio = 4.0;
        maxColumns = 100;
    } else {
        // Para casos extremos como 199k segmentos
        targetRatio = 5.0;
        maxColumns = 200;
    }

    // Calcular columnas ideales basadas en la relación objetivo
    const idealColumns = Math.ceil(Math.sqrt(totalSegments * targetRatio));

    // Aplicar límites dinámicos
    const minColumns = Math.min(3, totalSegments);
    const columns = Math.max(minColumns, Math.min(maxColumns, idealColumns));
    const rows = Math.ceil(totalSegments / columns);

    const actualRatio = columns / rows;
    const efficiency = (totalSegments / (columns * rows)) * 100;

    return { columns, rows, actualRatio, efficiency };
};
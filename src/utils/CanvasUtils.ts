interface LogSegment {
    text: string;
    isError: boolean;
}

export class CanvasUtils {
    static normalizeValue(value: number, min: number, max: number, range: [number, number]): number {
        const [rangeMin, rangeMax] = range;
        if (max === min) return rangeMin;
        return rangeMin + ((value - min) / (max - min)) * (rangeMax - rangeMin);
    }

    static getStatusColor(status: string): string {
        const colors = {
            'success': '#22c55e',
            'failure': '#ef4444',
            'cancelled': '#9ca3af',
            'unknown': '#d1d5db'
        };
        return colors[status as keyof typeof colors] || colors.unknown;
    }

    static parseLogSegments(log: string): LogSegment[] {
        const lines = log.split('\n');
        const errorPatterns = ['ERROR', 'FATAL', 'EXCEPTION', 'FAILED', 'FAIL:', 'Exception:', 'at java.', 'at com.', 'Caused by:'];

        return lines.map(line => ({
            text: line,
            isError: errorPatterns.some(pattern =>
                line.toUpperCase().includes(pattern.toUpperCase())
            )
        }));
    }
}
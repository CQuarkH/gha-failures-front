export class TimeUtils {
    /**
     * Converts a time in seconds to a formatted string (HH:MM:SS).
     * @param seconds - The time in seconds.
     * @returns A string formatted as HH:MM:SS.
     */
    static formatTime(seconds: number): string {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        const parts: string[] = [];
        if (hrs > 0) {
            parts.push(hrs + ' hr' + (hrs === 1 ? '' : 's'));
        }
        if (mins > 0) {
            parts.push(mins + ' min' + (mins === 1 ? '' : 's'));
        }
        if (secs > 0 || parts.length === 0) {
            parts.push(secs + ' sec' + (secs === 1 ? '' : 's'));
        }

        return parts.join(', ');
    }
}
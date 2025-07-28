import type { CanvasElement, LogSegment } from "../../pages/WorkflowCanvasPage";
import { TimeUtils } from "../../utils/TimeUtils";

interface TooltipProps {
    x: number;
    y: number;
    element: CanvasElement;
    visible: boolean;
}

export default function Tooltip({ x, y, element, visible }: TooltipProps) {
    if (!visible || !element) return null;

    const getTooltipContent = () => {
        switch (element.type) {
            case 'run':
                return `Run: ${element.data.name}\nStatus: ${element.data.conclusion}\nTime: ${TimeUtils.formatTime(element.data.totalExecutionTime)}`;
            case 'attempt':
                return `Attempt\nStatus: ${element.data.conclusion}\nJobs: ${element.data.jobs.length}\nTime: ${TimeUtils.formatTime(element.data.executionTime)}`;
            case 'job':
                return `Job: ${element.data.name}\nSteps: ${element.data.steps.length}\nTime: ${TimeUtils.formatTime(element.data.executionTime)}`;
            case 'step':
                return `Step: ${element.data.name}\nStatus: ${element.data.conclusion}\nTime: ${TimeUtils.formatTime(element.data.executionTime)}`;
            case 'microprint':
                return `Log Microprint\nSegments: ${element.data.segments.length}\nErrors: ${element.data.segments.filter((s: LogSegment) => s.isError).length}`;
            default:
                return '';
        }
    };

    return (
        <div
            className="fixed bg-black bg-opacity-80 text-white text-xs p-2 rounded shadow-lg pointer-events-none z-50 whitespace-pre-line"
            style={{
                left: x + 10,
                top: y - 10,
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.2s'
            }}
        >
            {getTooltipContent()}
        </div>
    );
}

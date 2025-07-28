import { useCallback, useState } from 'react';
import type {
    CanvasElement,
    LogSegment,
    SelectedMicroprintSegment,
    LogPanelState,
    TooltipState
} from '../types/canvas';
import type { Point } from '../hooks/useCanvasNavigation';
import { CANVAS_CONSTANTS } from '../constants/canvas';

interface UseCanvasInteractionsProps {
    elements: CanvasElement[];
    isPointInRect: (point: Point, element: CanvasElement) => boolean;
    createAttemptsLayer: (attempts: any[], parentRun: any) => void;
    createJobsLayer: (jobs: any[], parentAttempt: any) => void;
    createStepsLayer: (steps: any[], parentJob: any) => void;
    createMicroprintLayer: (log: string, parentStep: any) => void;
}

export const useCanvasInteractions = ({
    elements,
    isPointInRect,
    createAttemptsLayer,
    createJobsLayer,
    createStepsLayer,
    createMicroprintLayer
}: UseCanvasInteractionsProps) => {
    const [hoveredElement, setHoveredElement] = useState<CanvasElement | null>(null);
    const [selectedElements, setSelectedElements] = useState<Map<number, CanvasElement>>(new Map());
    const [selectedMicroprintSegment, setSelectedMicroprintSegment] = useState<SelectedMicroprintSegment | null>(null);
    const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, visible: false });
    const [logPanel, setLogPanel] = useState<LogPanelState>({
        segments: [],
        selectedSegment: {
            segmentIndex: -1,
            text: '',
        },
        visible: false
    });

    const getElementAt = useCallback((worldPos: Point): CanvasElement | null => {
        for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i];
            if (isPointInRect(worldPos, el)) {
                return el;
            }
        }
        return null;
    }, [elements, isPointInRect]);

    const getMicroprintSegmentAt = useCallback((worldPos: Point, element: CanvasElement): number => {
        const relativeX = worldPos.x - element.x;
        const relativeY = worldPos.y - element.y;
        const layout = element.data.layout;
        const columns = layout?.columns || CANVAS_CONSTANTS.MICROPRINT_COLUMNS;

        const col = Math.floor(relativeX / (CANVAS_CONSTANTS.MICROPRINT_SIZE + 1));
        const row = Math.floor(relativeY / (CANVAS_CONSTANTS.MICROPRINT_SIZE + 1));

        const index = row * columns + col;

        if (index >= 0 && index < element.data.segments.length &&
            col >= 0 && col < columns) {
            return index;
        }

        return -1;
    }, []);

    const getMicroprintSegments = useCallback((element: CanvasElement): LogSegment[] => {
        return element.data.segments || [];
    }, []);

    const getMicroprintSegmentText = useCallback((index: number, element: CanvasElement): string => {
        if (index < 0 || index >= element.data.segments.length) return '';
        return element.data.segments[index].text;
    }, []);

    const handleElementClick = useCallback((worldPos: Point, _event: MouseEvent) => {
        const element = getElementAt(worldPos);

        if (element) {
            setSelectedElements(prev => new Map(prev.set(element.layer, element)));

            switch (element.type) {
                case 'run':
                    createAttemptsLayer(element.data.attempts, element.data);
                    break;
                case 'attempt':
                    createJobsLayer(element.data.jobs, element.data);
                    break;
                case 'job':
                    createStepsLayer(element.data.steps, element.data);
                    break;
                case 'step':
                    console.log('Step clicked:', element.data);
                    console.log('Log: ', element.data.log);
                    if (element.data.conclusion === 'failure' && element.data.log) {
                        createMicroprintLayer(element.data.log, element.data);
                    }
                    break;
                case 'microprint':
                    const segmentIndex = getMicroprintSegmentAt(worldPos, element);
                    if (segmentIndex !== -1) {
                        const text = getMicroprintSegmentText(segmentIndex, element);
                        setSelectedMicroprintSegment({
                            elementId: element.id,
                            segmentIndex: segmentIndex
                        });
                        setLogPanel({
                            selectedSegment: { segmentIndex: segmentIndex, text: text },
                            visible: true,
                            segments: getMicroprintSegments(element)
                        });
                    }
                    break;
            }
        }
    }, [
        getElementAt,
        createAttemptsLayer,
        createJobsLayer,
        createStepsLayer,
        createMicroprintLayer,
        getMicroprintSegmentAt,
        getMicroprintSegmentText,
        getMicroprintSegments
    ]);

    const handleElementHover = useCallback((worldPos: Point, screenPos: Point, _event: MouseEvent) => {
        const element = getElementAt(worldPos);

        if (element !== hoveredElement) {
            setHoveredElement(element);

            if (element) {
                setTooltip({
                    x: screenPos.x,
                    y: screenPos.y,
                    visible: true
                });
            } else {
                setTooltip(prev => ({ ...prev, visible: false }));
            }
        }
    }, [getElementAt, hoveredElement]);

    const handleMouseLeave = useCallback(() => {
        setHoveredElement(null);
        setTooltip(prev => ({ ...prev, visible: false }));
    }, []);

    return {
        hoveredElement,
        selectedElements,
        selectedMicroprintSegment,
        tooltip,
        logPanel,
        setLogPanel,
        handleElementClick,
        handleElementHover,
        handleMouseLeave
    };
};
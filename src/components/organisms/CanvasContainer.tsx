import { useCallback, useEffect } from 'react';
import { CanvasRenderer } from './CanvasRenderer';
import Tooltip from '../atoms/Tooltip';
import LogPanel from '../molecules/LogPanel';
import { useCanvasLayers } from '../../hooks/useCanvasLayers';
import { useCanvasInteractions } from '../../hooks/useCanvasInteractions';
import { useCanvasNavigation } from '../../hooks/useCanvasNavigation';
import { CANVAS_CONSTANTS } from '../../constants/canvas';
import WorkflowStats from '../molecules/WorkflowStats';
import WorkflowActors from '../molecules/WorkflowActors';
import { CanvasControls } from '../molecules/CanvasControls';

interface CanvasContainerProps {
    data: any[];
}

export const CanvasContainer = ({ data }: CanvasContainerProps) => {
    // Hook de navegación
    const navigation = useCanvasNavigation({
        minZoom: CANVAS_CONSTANTS.ZOOM.MIN,
        maxZoom: CANVAS_CONSTANTS.ZOOM.MAX,
        zoomSensitivity: CANVAS_CONSTANTS.ZOOM.SENSITIVITY
    });

    const {
        canvasRef,
        applyTransform,
        restoreTransform,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
        handleContextMenu,
        getScaledLineWidth,
        isPointInRect,
        getCursor,
        fitToContent,
        zoomLevel
    } = navigation;

    // Hook de capas
    const {
        elements,
        connections,
        getLayerBounds,
        createRunsLayer,
        createAttemptsLayer,
        createJobsLayer,
        createStepsLayer,
        createMicroprintLayer
    } = useCanvasLayers();

    // Hook de interacciones
    const {
        hoveredElement,
        selectedElements,
        selectedMicroprintSegment,
        tooltip,
        logPanel,
        setLogPanel,
        handleElementClick,
        handleElementHover,
        handleMouseLeave
    } = useCanvasInteractions({
        elements,
        isPointInRect,
        createAttemptsLayer,
        createJobsLayer,
        createStepsLayer,
        createMicroprintLayer
    });

    // Event handlers combinados
    const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        handleMouseDown(e, handleElementClick);
    }, [handleMouseDown, handleElementClick]);

    const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        handleMouseMove(e, handleElementHover);
    }, [handleMouseMove, handleElementHover]);

    const onMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        handleMouseUp(e);
    }, [handleMouseUp]);

    const handleLogPanelClose = useCallback(() => {
        setLogPanel({
            selectedSegment: { segmentIndex: -1, text: '' },
            visible: false,
            segments: []
        });
    }, [setLogPanel]);

    // Renderer del canvas
    CanvasRenderer({
        canvasRef,
        elements,
        connections,
        selectedElements,
        hoveredElement,
        selectedMicroprintSegment,
        applyTransform,
        restoreTransform,
        getScaledLineWidth,
        getLayerBounds,
        zoomLevel
    });

    // Initialize with runs
    useEffect(() => {
        createRunsLayer(data);
    }, [data, createRunsLayer]);

    return (
        <div className="flex-1 rounded-lg overflow-hidden relative">
            <div className="flex flex-col gap-5 absolute top-0 left-0 p-5">
                <WorkflowStats runs={data} />
                <WorkflowActors runs={data} />
            </div>

            <CanvasControls
                zoomLevel={zoomLevel}
                elements={elements}
                fitToContent={fitToContent}
            />

            <canvas
                ref={canvasRef}
                width={CANVAS_CONSTANTS.SCREEN_WIDTH}
                height={1000}
                className={`block cursor-${getCursor()}`}
                onMouseMove={onMouseMove}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onMouseLeave={handleMouseLeave}
                onWheel={handleWheel}
                onContextMenu={handleContextMenu}
            />

            <Tooltip
                x={tooltip.x}
                y={tooltip.y}
                element={hoveredElement!}
                visible={tooltip.visible}
            />

            {logPanel.visible && (
                <LogPanel
                    segments={logPanel.segments}
                    selectedSegment={logPanel.selectedSegment}
                    visible={logPanel.visible}
                    onClose={handleLogPanelClose}
                />
            )}
        </div>
    );
};
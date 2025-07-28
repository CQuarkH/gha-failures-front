import { useCallback, useEffect } from 'react';
import type { CanvasElement, Connection, LayerBounds, SelectedMicroprintSegment } from '../../types/canvas';
import { CANVAS_CONSTANTS, LAYER_LABELS } from '../../constants/canvas';

interface CanvasRendererProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    elements: CanvasElement[];
    connections: Connection[];
    selectedElements: Map<number, CanvasElement>;
    hoveredElement: CanvasElement | null;
    selectedMicroprintSegment: SelectedMicroprintSegment | null;
    applyTransform: (ctx: CanvasRenderingContext2D) => void;
    restoreTransform: (ctx: CanvasRenderingContext2D) => void;
    getScaledLineWidth: (width: number) => number;
    getLayerBounds: (layer: number) => LayerBounds;
    zoomLevel: number;
}

export const CanvasRenderer = ({
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
}: CanvasRendererProps) => {
    const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
        const canvas = canvasRef.current!;

        // Calcular área visible (considerando zoom y pan)
        const transform = ctx.getTransform();
        const viewportLeft = -transform.e / transform.a;
        const viewportTop = -transform.f / transform.d;
        const viewportRight = (canvas.width - transform.e) / transform.a;
        const viewportBottom = (canvas.height - transform.f) / transform.d;

        // Expandir un poco el área para evitar cortes
        const padding = CANVAS_CONSTANTS.GRID_SIZE * 2;
        const startX = Math.floor((viewportLeft - padding) / CANVAS_CONSTANTS.GRID_SIZE) * CANVAS_CONSTANTS.GRID_SIZE;
        const endX = Math.ceil((viewportRight + padding) / CANVAS_CONSTANTS.GRID_SIZE) * CANVAS_CONSTANTS.GRID_SIZE;
        const startY = Math.floor((viewportTop - padding) / CANVAS_CONSTANTS.GRID_SIZE) * CANVAS_CONSTANTS.GRID_SIZE;
        const endY = Math.ceil((viewportBottom + padding) / CANVAS_CONSTANTS.GRID_SIZE) * CANVAS_CONSTANTS.GRID_SIZE;

        // Líneas principales de la grilla
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.lineWidth = getScaledLineWidth(0.5);

        for (let x = startX; x <= endX; x += CANVAS_CONSTANTS.GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }

        for (let y = startY; y <= endY; y += CANVAS_CONSTANTS.GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }

        // Líneas secundarias de la grilla
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = getScaledLineWidth(0.25);

        const smallStartX = Math.floor((viewportLeft - padding) / CANVAS_CONSTANTS.SMALL_GRID_SIZE) * CANVAS_CONSTANTS.SMALL_GRID_SIZE;
        const smallEndX = Math.ceil((viewportRight + padding) / CANVAS_CONSTANTS.SMALL_GRID_SIZE) * CANVAS_CONSTANTS.SMALL_GRID_SIZE;
        const smallStartY = Math.floor((viewportTop - padding) / CANVAS_CONSTANTS.SMALL_GRID_SIZE) * CANVAS_CONSTANTS.SMALL_GRID_SIZE;
        const smallEndY = Math.ceil((viewportBottom + padding) / CANVAS_CONSTANTS.SMALL_GRID_SIZE) * CANVAS_CONSTANTS.SMALL_GRID_SIZE;

        for (let x = smallStartX; x <= smallEndX; x += CANVAS_CONSTANTS.SMALL_GRID_SIZE) {
            if (x % CANVAS_CONSTANTS.GRID_SIZE !== 0) {
                ctx.beginPath();
                ctx.moveTo(x, smallStartY);
                ctx.lineTo(x, smallEndY);
                ctx.stroke();
            }
        }

        for (let y = smallStartY; y <= smallEndY; y += CANVAS_CONSTANTS.SMALL_GRID_SIZE) {
            if (y % CANVAS_CONSTANTS.GRID_SIZE !== 0) {
                ctx.beginPath();
                ctx.moveTo(smallStartX, y);
                ctx.lineTo(smallEndX, y);
                ctx.stroke();
            }
        }
    }, [canvasRef, getScaledLineWidth]);

    const drawConnections = useCallback((ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = getScaledLineWidth(1);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        connections.forEach(conn => {
            const startX = conn.from.x;
            const startY = conn.from.y;
            const endX = conn.to.x;
            const endY = conn.to.y;

            // Calcular puntos intermedios
            const midX = startX + (endX - startX) * 0.5;
            const cornerRadius = getScaledLineWidth(6);

            ctx.beginPath();
            ctx.moveTo(startX, startY);

            // Si las alturas son muy diferentes, crear esquinas redondeadas
            if (Math.abs(endY - startY) > cornerRadius * 2) {
                // Línea horizontal hasta antes del primer giro
                ctx.lineTo(midX - cornerRadius, startY);

                // Primera esquina redondeada
                ctx.arcTo(midX, startY, midX, startY + (endY > startY ? cornerRadius : -cornerRadius), cornerRadius);

                // Línea vertical
                ctx.lineTo(midX, endY + (endY > startY ? -cornerRadius : cornerRadius));

                // Segunda esquina redondeada
                ctx.arcTo(midX, endY, midX + cornerRadius, endY, cornerRadius);

                // Línea horizontal final
                ctx.lineTo(endX, endY);
            } else {
                // Si están a la misma altura o muy cerca, línea directa
                ctx.lineTo(endX, endY);
            }

            ctx.stroke();

            // Dibujar flecha triangular
            const arrowLength = getScaledLineWidth(8);
            const arrowWidth = getScaledLineWidth(4);

            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - arrowLength, endY - arrowWidth);
            ctx.lineTo(endX - arrowLength, endY + arrowWidth);
            ctx.closePath();
            ctx.fillStyle = '#6b7280';
            ctx.fill();
        });
    }, [connections, getScaledLineWidth]);

    const drawElements = useCallback((ctx: CanvasRenderingContext2D) => {
        elements.forEach(element => {
            const isSelected = selectedElements.get(element.layer) === element;
            const isHovered = hoveredElement === element;

            // Fill
            ctx.fillStyle = element.color;
            ctx.fillRect(element.x, element.y, element.width, element.height);

            // Stroke
            if (element.type !== 'microprint') {
                ctx.strokeStyle = isSelected ? '#3b82f6' : '#d1d5db';
                ctx.lineWidth = getScaledLineWidth(isSelected ? 2 : 1);
                ctx.strokeRect(element.x, element.y, element.width, element.height);
            }

            if (element.type === 'microprint') {
                const layout = element.data.layout;
                const columns = layout?.columns || CANVAS_CONSTANTS.MICROPRINT_COLUMNS;

                element.data.segments.forEach((segment: any, index: number) => {
                    const row = Math.floor(index / columns);
                    const col = index % columns;
                    const x = element.x + col * (CANVAS_CONSTANTS.MICROPRINT_SIZE + 1);
                    const y = element.y + row * (CANVAS_CONSTANTS.MICROPRINT_SIZE + 1);

                    const isSegmentSelected = selectedMicroprintSegment?.elementId === element.id &&
                        selectedMicroprintSegment?.segmentIndex === index;

                    let segmentColor = segment.isError ? '#ef4444' : '#6b7280';

                    if (isSegmentSelected) {
                        segmentColor = segment.isError ? '#dc2626' : '#3b82f6';
                    }

                    ctx.fillStyle = segmentColor;
                    ctx.fillRect(x, y, CANVAS_CONSTANTS.MICROPRINT_SIZE, CANVAS_CONSTANTS.MICROPRINT_SIZE);

                    if (isSegmentSelected) {
                        ctx.strokeStyle = '#1d4ed8';
                        ctx.lineWidth = getScaledLineWidth(2);
                        ctx.strokeRect(x, y, CANVAS_CONSTANTS.MICROPRINT_SIZE, CANVAS_CONSTANTS.MICROPRINT_SIZE);
                    }
                });
            }

            // Hover effect
            if (isHovered && element.type !== 'microprint') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(element.x, element.y, element.width, element.height);
            }
        });
    }, [elements, selectedElements, hoveredElement, selectedMicroprintSegment, getScaledLineWidth]);

    const drawLayerLabels = useCallback((ctx: CanvasRenderingContext2D) => {
        // Configurar estilo del texto
        const fontSize = Math.max(14 / zoomLevel, 10);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = '#374151';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Dibujar label para cada capa que tenga elementos
        Object.entries(LAYER_LABELS).forEach(([layerNum, label]) => {
            const layer = parseInt(layerNum);
            const layerElements = elements.filter(el => el.layer === layer);

            if (layerElements.length === 0) return;

            const bounds = getLayerBounds(layer);

            const labelX = (bounds.minX + bounds.maxX) / 2;
            const labelY = bounds.minY - 10;

            const textWidth = ctx.measureText(label).width;
            const padding = 8;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(
                labelX - textWidth / 2 - padding,
                labelY - fontSize - padding / 2,
                textWidth + padding * 2,
                fontSize + padding
            );

            ctx.strokeStyle = '#d1d5db';
            ctx.lineWidth = getScaledLineWidth(1);
            ctx.strokeRect(
                labelX - textWidth / 2 - padding,
                labelY - fontSize - padding / 2,
                textWidth + padding * 2,
                fontSize + padding
            );

            ctx.fillStyle = '#374151';
            ctx.fillText(label, labelX, labelY);
        });
    }, [elements, getLayerBounds, getScaledLineWidth, zoomLevel]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Aplicar transformación de cámara
        applyTransform(ctx);

        drawGrid(ctx);
        drawConnections(ctx);
        drawElements(ctx);
        drawLayerLabels(ctx);

        // Restaurar transformación
        restoreTransform(ctx);
    }, [
        canvasRef,
        applyTransform,
        restoreTransform,
        drawGrid,
        drawConnections,
        drawElements,
        drawLayerLabels
    ]);

    useEffect(() => {
        draw();
    }, [draw]);

    return { draw };
};
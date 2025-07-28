import { useCallback, useEffect, useState } from "react";
import type { GHRun } from "../models/GHRun";
import type { GHStep } from "../models/GHStep";
import type { GHRunAttempt } from "../models/GHRunAttempt";
import type { GHJob } from "../models/GHJob";
import { CanvasUtils } from "../utils/CanvasUtils";
import Tooltip from "../components/atoms/Tooltip";
import LogPanel from "../components/molecules/LogPanel";
import {
    useCanvasNavigation,
    type Point,
    type ElementClickHandler,
    type ElementHoverHandler
} from "../hooks/useCanvasNavigation";
import WorkflowStats from "../components/molecules/WorkflowStats";
import WorkflowActors from "../components/molecules/WorkflowActors";

export interface LogSegment {
    text: string;
    isError: boolean;
}

export interface CanvasElement {
    id: string;
    type: 'run' | 'attempt' | 'job' | 'step' | 'microprint';
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    data: any;
    layer: number;
    parent?: CanvasElement;
}

interface Connection {
    from: { x: number; y: number };
    to: { x: number; y: number };
}

// Interfaz para tracking de posiciones de capas
interface LayerBounds {
    layer: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export const WorkflowLayerDesign = ({ data, name }: { data: GHRun[], name: string }) => {
    // Hook de navegación
    const navigation = useCanvasNavigation({
        minZoom: 0.1,
        maxZoom: 3,
        zoomSensitivity: 0.1
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

    // Estados existentes
    const [elements, setElements] = useState<CanvasElement[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [hoveredElement, setHoveredElement] = useState<CanvasElement | null>(null);
    const [selectedElements, setSelectedElements] = useState<Map<number, CanvasElement>>(new Map());
    const [selectedMicroprintSegment, setSelectedMicroprintSegment] = useState<{ elementId: string; segmentIndex: number } | null>(null);
    const [tooltip, setTooltip] = useState({ x: 0, y: 0, visible: false });
    const [logPanel, setLogPanel] = useState<{ segments: LogSegment[]; selectedSegment: { segmentIndex: number; text: string }; visible: boolean }>({
        segments: [],
        selectedSegment: {
            segmentIndex: -1,
            text: '',
        },
        visible: false
    });

    // Layout constants mejorados
    const SCREEN_WIDTH = window.innerWidth;
    // const SCREEN_HEIGHT = window.innerHeight;
    const MIN_LAYER_SPACING = (SCREEN_WIDTH / 10);
    const BOX_SPACING = 10;
    const START_X = 80;
    const START_Y = 80;
    const MICROPRINT_SIZE = 9;
    const MICROPRINT_COLUMNS = 40;

    // Funciones existentes (sin cambios)
    const getLayerBounds = useCallback((layerNumber: number): LayerBounds => {
        const layerElements = elements.filter(el => el.layer === layerNumber);

        if (layerElements.length === 0) {
            return {
                layer: layerNumber,
                minX: START_X,
                maxX: START_X,
                minY: START_Y,
                maxY: START_Y
            };
        }

        const minX = Math.min(...layerElements.map(el => el.x));
        const maxX = Math.max(...layerElements.map(el => el.x + el.width));
        const minY = Math.min(...layerElements.map(el => el.y));
        const maxY = Math.max(...layerElements.map(el => el.y + el.height));

        return { layer: layerNumber, minX, maxX, minY, maxY };
    }, [elements]);

    const getNextLayerX = useCallback((currentLayer: number): number => {
        if (currentLayer === 1) return START_X;

        const previousLayerBounds = getLayerBounds(currentLayer - 1);
        return previousLayerBounds.maxX + MIN_LAYER_SPACING;
    }, [getLayerBounds]);

    const alignWithParent = useCallback(<T extends CanvasElement>(_parentElement: CanvasElement, childElements: T[]): T[] => {
        if (childElements.length === 0) return childElements;

        let currentY = START_Y;

        return childElements.map((child) => {
            const newElement = {
                ...child,
                y: currentY
            } as T;

            currentY += child.height + BOX_SPACING;
            return newElement;
        });
    }, []);

    const clearLayersFrom = useCallback((layer: number) => {
        setElements(prev => prev.filter(el => el.layer < layer));

        setConnections(prev => prev.filter(conn => {
            const toElement = elements.find(el =>
                conn.to.x >= el.x && conn.to.x <= el.x + el.width &&
                conn.to.y >= el.y - el.height / 2 && conn.to.y <= el.y + el.height / 2
            );
            return !toElement || toElement.layer < layer;
        }));
    }, [elements]);

    const clearConnectionsFromElement = useCallback((fromElement: CanvasElement) => {
        setConnections(prev => prev.filter(conn => {
            const isFromThisElement =
                conn.from.x === fromElement.x + fromElement.width &&
                Math.abs(conn.from.y - (fromElement.y + fromElement.height / 2)) < 1;

            return !isFromThisElement;
        }));
    }, []);

    const getConnectionsToElement = useCallback((toElement: CanvasElement): Connection[] => {
        return connections.filter(conn => {
            const isToThisElement =
                Math.abs(conn.to.x - toElement.x) < 1 &&
                Math.abs(conn.to.y - (toElement.y + toElement.height / 2)) < 1;
            return isToThisElement;
        });
    }, [connections]);

    // Funciones de creación de capas (sin cambios en la lógica)
    const createRunsLayer = useCallback((runs: GHRun[]) => {
        const newElements: CanvasElement[] = [];
        let currentY = START_Y;

        runs.forEach((run, index) => {
            const times = runs.map(r => r.getTotalExecutionTime());
            const height = CanvasUtils.normalizeValue(run.getTotalExecutionTime(), Math.min(...times), Math.max(...times), [30, 80]);
            const width = Math.max(run.attempts!.length * 20 + 20, 60);

            const element: CanvasElement = {
                id: `run-${index}`,
                type: 'run',
                x: START_X,
                y: currentY,
                width,
                height,
                color: CanvasUtils.getStatusColor(run.conclusion!),
                data: run,
                layer: 1
            };

            newElements.push(element);
            currentY += height + BOX_SPACING;
        });

        setElements(newElements);
        setConnections([]);
    }, []);

    const createAttemptsLayer = useCallback((attempts: GHRunAttempt[], parentRun: GHRun) => {
        const parentElement = elements.find(el => el.data === parentRun);
        if (!parentElement) return;

        clearConnectionsFromElement(parentElement);
        clearLayersFrom(2);

        const existingElements = elements.filter(el => el.layer < 2);
        const x = getNextLayerX(2);

        let attemptElements = attempts.map((attempt, index) => {
            const times = attempts.map(a => a.getExecutionTime());
            const height = CanvasUtils.normalizeValue(attempt.getExecutionTime(), Math.min(...times), Math.max(...times), [30, 120]);
            const width = Math.max(attempt.jobs!.length * 15 + 15, 40);

            return {
                id: `attempt-${index}`,
                type: 'attempt' as const,
                x,
                y: 0,
                width,
                height,
                color: CanvasUtils.getStatusColor(attempt.conclusion!),
                data: attempt,
                layer: 2,
                parent: parentElement
            };
        });

        attemptElements = alignWithParent(parentElement, attemptElements);

        const newConnections = attemptElements.map(element => ({
            from: { x: parentElement.x + parentElement.width, y: parentElement.y + parentElement.height / 2 },
            to: { x: element.x, y: element.y + element.height / 2 }
        }));

        const connectionsToParent = getConnectionsToElement(parentElement);

        setElements([...existingElements, ...attemptElements]);
        setConnections([...connectionsToParent, ...newConnections]);
    }, [elements, clearConnectionsFromElement, clearLayersFrom, getNextLayerX, alignWithParent, getConnectionsToElement]);

    const createJobsLayer = useCallback((jobs: GHJob[], parentAttempt: GHRunAttempt) => {
        const parentElement = elements.find(el => el.data === parentAttempt);
        if (!parentElement) return;

        clearConnectionsFromElement(parentElement);
        clearLayersFrom(3);

        const existingElements = elements.filter(el => el.layer < 3);
        const x = getNextLayerX(3);

        let jobElements = jobs.map((job, index) => {
            const times = jobs.map(j => j.getExecutionTime());
            const height = CanvasUtils.normalizeValue(job.getExecutionTime(), Math.min(...times), Math.max(...times), [20, 100]);
            const width = Math.max(job.steps!.length * 10 + 10, 30);

            return {
                id: `job-${index}`,
                type: 'job' as const,
                x,
                y: 0,
                width,
                height,
                color: CanvasUtils.getStatusColor(job.conclusion!),
                data: job,
                layer: 3,
                parent: parentElement
            };
        });

        jobElements = alignWithParent(parentElement, jobElements);

        const newConnections = jobElements.map(element => ({
            from: { x: parentElement.x + parentElement.width, y: parentElement.y + parentElement.height / 2 },
            to: { x: element.x, y: element.y + element.height / 2 }
        }));

        const existingConnections = connections.filter(conn => {
            const fromElement = elements.find(el =>
                conn.from.x === el.x + el.width &&
                Math.abs(conn.from.y - (el.y + el.height / 2)) < 1
            );
            return fromElement && fromElement.layer < 3;
        });

        setElements([...existingElements, ...jobElements]);
        setConnections([...existingConnections, ...newConnections]);
    }, [elements, connections, clearConnectionsFromElement, clearLayersFrom, getNextLayerX, alignWithParent]);

    const createStepsLayer = useCallback((steps: GHStep[], parentJob: GHJob) => {
        const parentElement = elements.find(el => el.data === parentJob);
        if (!parentElement) return;

        clearConnectionsFromElement(parentElement);
        clearLayersFrom(4);

        const existingElements = elements.filter(el => el.layer < 4);
        const x = getNextLayerX(4);

        let stepElements = steps.map((step, index) => {
            const times = steps.map(s => s.executionTime);
            const height = CanvasUtils.normalizeValue(step.executionTime, Math.min(...times), Math.max(...times), [15, 50]);
            const width = 20;

            return {
                id: `step-${index}`,
                type: 'step' as const,
                x,
                y: 0,
                width,
                height,
                color: CanvasUtils.getStatusColor(step.conclusion!),
                data: step,
                layer: 4,
                parent: parentElement
            };
        });

        stepElements = alignWithParent(parentElement, stepElements);

        const newConnections = stepElements.map(element => ({
            from: { x: parentElement.x + parentElement.width, y: parentElement.y + parentElement.height / 2 },
            to: { x: element.x, y: element.y + element.height / 2 }
        }));

        const existingConnections = connections.filter(conn => {
            const fromElement = elements.find(el =>
                conn.from.x === el.x + el.width &&
                Math.abs(conn.from.y - (el.y + el.height / 2)) < 1
            );
            return fromElement && fromElement.layer < 4;
        });

        setElements([...existingElements, ...stepElements]);
        setConnections([...existingConnections, ...newConnections]);
    }, [elements, connections, clearConnectionsFromElement, clearLayersFrom, getNextLayerX, alignWithParent]);

    const createMicroprintLayer = useCallback((log: string, parentStep: GHStep) => {
        const parentElement = elements.find(el => el.data === parentStep);
        if (!parentElement || !log) return;

        clearConnectionsFromElement(parentElement);
        clearLayersFrom(5);

        const segments = CanvasUtils.parseLogSegments(log);

        const calculateOptimalLayout = (totalSegments: number) => {
            if (totalSegments <= 0) return { columns: 1, rows: 1 };

            let targetRatio, maxColumns;

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

            return { columns, rows };
        };

        const { columns, rows } = calculateOptimalLayout(segments.length);

        const actualRatio = columns / rows;
        const efficiency = (segments.length / (columns * rows) * 100).toFixed(1);

        // Dimensiones del canvas
        const width = columns * (MICROPRINT_SIZE + 1);
        const height = Math.max(rows * (MICROPRINT_SIZE + 1), 30);
        const x = getNextLayerX(5);

        const element: CanvasElement = {
            id: 'microprint',
            type: 'microprint',
            x,
            y: START_Y,
            width,
            height,
            color: 'rgba(59, 130, 246, 0.1)',
            data: {
                step: parentStep,
                segments,
                layout: { columns, rows, actualRatio, efficiency: parseFloat(efficiency) }
            },
            layer: 5,
            parent: parentElement
        };

        const existingElements = elements.filter(el => el.layer < 5);
        const newConnection = {
            from: { x: parentElement.x + parentElement.width, y: parentElement.y + parentElement.height / 2 },
            to: { x, y: START_Y + height / 2 }
        };

        const existingConnections = connections.filter(conn => {
            const fromElement = elements.find(el =>
                conn.from.x === el.x + el.width &&
                Math.abs(conn.from.y - (el.y + el.height / 2)) < 1
            );
            return fromElement && fromElement.layer < 5;
        });

        setElements([...existingElements, element]);
        setConnections([...existingConnections, newConnection]);
    }, [elements, connections, clearConnectionsFromElement, clearLayersFrom, getNextLayerX]);

    // Funciones auxiliares actualizadas para usar coordenadas del mundo
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
        const columns = layout?.columns || MICROPRINT_COLUMNS; // Fallback a constante

        const col = Math.floor(relativeX / (MICROPRINT_SIZE + 1));
        const row = Math.floor(relativeY / (MICROPRINT_SIZE + 1));

        // ✅ USAR COLUMNAS DINÁMICAS EN EL CÁLCULO DEL ÍNDICE
        const index = row * columns + col;

        // Validar que el índice esté dentro del rango válido
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

    // Handlers actualizados para usar el hook de navegación
    const handleElementClick: ElementClickHandler = useCallback((worldPos, _event) => {
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
    }, [getElementAt, createAttemptsLayer, createJobsLayer, createStepsLayer, createMicroprintLayer, getMicroprintSegmentAt, getMicroprintSegmentText, getMicroprintSegments]);

    const handleElementHover: ElementHoverHandler = useCallback((worldPos, screenPos, _event) => {
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

    const handleMouseLeave = useCallback(() => {
        setHoveredElement(null);
        setTooltip(prev => ({ ...prev, visible: false }));
    }, []);

    const drawLayerLabels = useCallback((ctx: CanvasRenderingContext2D) => {
        const layerLabels = {
            1: 'Runs',
            2: 'Attempts',
            3: 'Jobs',
            4: 'Steps',
            5: 'Microprint'
        };

        // Configurar estilo del texto
        const fontSize = Math.max(14 / zoomLevel, 10); // Ajustar tamaño según zoom
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = '#374151';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Dibujar label para cada capa que tenga elementos
        Object.entries(layerLabels).forEach(([layerNum, label]) => {
            const layer = parseInt(layerNum);
            const layerElements = elements.filter(el => el.layer === layer);

            if (layerElements.length === 0) return;

            // Obtener bounds de la capa
            const bounds = getLayerBounds(layer);

            // Posición del label (centrado horizontalmente sobre la capa)
            const labelX = (bounds.minX + bounds.maxX) / 2;
            const labelY = bounds.minY - 10; // 10px arriba del contenido

            // Dibujar fondo semi-transparente para el label
            const textWidth = ctx.measureText(label).width;
            const padding = 8;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(
                labelX - textWidth / 2 - padding,
                labelY - fontSize - padding / 2,
                textWidth + padding * 2,
                fontSize + padding
            );

            // Dibujar borde del fondo
            ctx.strokeStyle = '#d1d5db';
            ctx.lineWidth = getScaledLineWidth(1);
            ctx.strokeRect(
                labelX - textWidth / 2 - padding,
                labelY - fontSize - padding / 2,
                textWidth + padding * 2,
                fontSize + padding
            );

            // Dibujar el texto del label
            ctx.fillStyle = '#374151';
            ctx.fillText(label, labelX, labelY);
        });
    }, [elements, getLayerBounds, getScaledLineWidth, zoomLevel]);

    // Función de dibujo actualizada
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Aplicar transformación de cámara
        applyTransform(ctx);

        const drawGrid = () => {
            const gridSize = 50; // Tamaño de la cuadrícula
            const smallGridSize = 10; // Cuadrícula más pequeña

            // Calcular área visible (considerando zoom y pan)
            const transform = ctx.getTransform();
            const viewportLeft = -transform.e / transform.a;
            const viewportTop = -transform.f / transform.d;
            const viewportRight = (canvas.width - transform.e) / transform.a;
            const viewportBottom = (canvas.height - transform.f) / transform.d;

            // Expandir un poco el área para evitar cortes
            const padding = gridSize * 2;
            const startX = Math.floor((viewportLeft - padding) / gridSize) * gridSize;
            const endX = Math.ceil((viewportRight + padding) / gridSize) * gridSize;
            const startY = Math.floor((viewportTop - padding) / gridSize) * gridSize;
            const endY = Math.ceil((viewportBottom + padding) / gridSize) * gridSize;

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)'; // Muy sutil
            ctx.lineWidth = getScaledLineWidth(0.5);

            // Líneas verticales
            for (let x = startX; x <= endX; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, startY);
                ctx.lineTo(x, endY);
                ctx.stroke();
            }

            // Líneas horizontales
            for (let y = startY; y <= endY; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(startX, y);
                ctx.lineTo(endX, y);
                ctx.stroke();
            }

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'; // Extremadamente sutil
            ctx.lineWidth = getScaledLineWidth(0.25);

            const smallStartX = Math.floor((viewportLeft - padding) / smallGridSize) * smallGridSize;
            const smallEndX = Math.ceil((viewportRight + padding) / smallGridSize) * smallGridSize;
            const smallStartY = Math.floor((viewportTop - padding) / smallGridSize) * smallGridSize;
            const smallEndY = Math.ceil((viewportBottom + padding) / smallGridSize) * smallGridSize;

            // Líneas verticales pequeñas
            for (let x = smallStartX; x <= smallEndX; x += smallGridSize) {
                if (x % gridSize !== 0) { // No dibujar sobre las líneas principales
                    ctx.beginPath();
                    ctx.moveTo(x, smallStartY);
                    ctx.lineTo(x, smallEndY);
                    ctx.stroke();
                }
            }

            // Líneas horizontales pequeñas
            for (let y = smallStartY; y <= smallEndY; y += smallGridSize) {
                if (y % gridSize !== 0) { // No dibujar sobre las líneas principales
                    ctx.beginPath();
                    ctx.moveTo(smallStartX, y);
                    ctx.lineTo(smallEndX, y);
                    ctx.stroke();
                }
            }
        };

        drawGrid();

        // Draw connections
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = getScaledLineWidth(1);

        connections.forEach(conn => {
            ctx.beginPath();
            ctx.moveTo(conn.from.x, conn.from.y);
            ctx.lineTo(conn.to.x, conn.to.y);
            ctx.stroke();

            // Draw arrow
            const angle = Math.atan2(conn.to.y - conn.from.y, conn.to.x - conn.from.x);
            const arrowLength = getScaledLineWidth(8);

            ctx.beginPath();
            ctx.moveTo(conn.to.x, conn.to.y);
            ctx.lineTo(
                conn.to.x - arrowLength * Math.cos(angle - Math.PI / 6),
                conn.to.y - arrowLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(conn.to.x, conn.to.y);
            ctx.lineTo(
                conn.to.x - arrowLength * Math.cos(angle + Math.PI / 6),
                conn.to.y - arrowLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
        });

        // Draw elements
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
                // 🔧 OBTENER LAYOUT DINÁMICO
                const layout = element.data.layout;
                const columns = layout?.columns || MICROPRINT_COLUMNS;

                element.data.segments.forEach((segment: LogSegment, index: number) => {
                    const row = Math.floor(index / columns);
                    const col = index % columns;
                    const x = element.x + col * (MICROPRINT_SIZE + 1);
                    const y = element.y + row * (MICROPRINT_SIZE + 1);

                    const isSegmentSelected = selectedMicroprintSegment?.elementId === element.id &&
                        selectedMicroprintSegment?.segmentIndex === index;

                    let segmentColor = segment.isError ? '#ef4444' : '#6b7280';

                    if (isSegmentSelected) {
                        segmentColor = segment.isError ? '#dc2626' : '#3b82f6';
                    }

                    ctx.fillStyle = segmentColor;
                    ctx.fillRect(x, y, MICROPRINT_SIZE, MICROPRINT_SIZE);

                    if (isSegmentSelected) {
                        ctx.strokeStyle = '#1d4ed8';
                        ctx.lineWidth = getScaledLineWidth(2);
                        ctx.strokeRect(x, y, MICROPRINT_SIZE, MICROPRINT_SIZE);
                    }
                });

            }

            // Hover effect
            if (isHovered && element.type !== 'microprint') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(element.x, element.y, element.width, element.height);
            }
        });

        drawLayerLabels(ctx);

        // Restaurar transformación
        restoreTransform(ctx);
    }, [elements, connections, selectedElements, hoveredElement, selectedMicroprintSegment, applyTransform, restoreTransform, getScaledLineWidth]);

    // Initialize with runs
    useEffect(() => {
        createRunsLayer(data);
    }, [data, createRunsLayer]);

    // Redraw canvas when elements change
    useEffect(() => {
        draw();
    }, [draw]);

    const visibleLayers = ['Runs'];
    if (elements.some(el => el.layer === 2)) visibleLayers.push('Attempts');
    if (elements.some(el => el.layer === 3)) visibleLayers.push('Jobs');
    if (elements.some(el => el.layer === 4)) visibleLayers.push('Steps');
    if (elements.some(el => el.layer === 5)) visibleLayers.push('Microprint');

    return (
        <div className="flex flex-col gap-10 h-screen w-screen p-10 bg-white">
            <h1 className="text-3xl font-semibold w-full flex flex-col gap-3">
                <p className="text-lg font-normal">Workflow Analysis</p>
                {name}

            </h1>
            <div className="flex gap-5 h-full w-full bg-white border border-gray-300 rounded-lg">
                <div className="flex-1 rounded-lg overflow-hidden relative">
                    <div className="flex flex-col gap-5 absolute top-0 left-0 p-5">
                        <WorkflowStats runs={data} />
                        <WorkflowActors runs={data} />
                    </div>

                    {/* Controles de navegación */}
                    <div className="flex justify-center gap-2 px-5 absolute bottom-4 right-0 z-10">

                        <button
                            onClick={() => fitToContent(elements)}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                        >
                            Fit to Content
                        </button>
                        <span className="px-3 py-1 bg-gray-200 rounded text-sm">
                            Zoom: {zoomLevel}%
                        </span>
                    </div>
                    <canvas
                        ref={canvasRef}
                        width={SCREEN_WIDTH}
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

                    {/* Instrucciones de uso */}
                    <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
                        <div>• Rueda del mouse: Zoom</div>
                        <div>• Clic derecho + arrastrar: Mover</div>
                    </div>
                    {logPanel.visible && (
                        <LogPanel
                            segments={logPanel.segments}
                            selectedSegment={logPanel.selectedSegment}
                            visible={logPanel.visible}
                            onClose={() => setLogPanel({ selectedSegment: { segmentIndex: -1, text: '' }, visible: false, segments: [] })}
                        />
                    )}
                </div>


            </div>
        </div>
    );
};
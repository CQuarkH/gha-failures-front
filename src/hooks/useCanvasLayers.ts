import { useCallback, useState } from 'react';
import type { CanvasElement, Connection, LayerBounds } from '../types/canvas';
import type { GHRun } from '../models/GHRun';
import type { GHRunAttempt } from '../models/GHRunAttempt';
import type { GHJob } from '../models/GHJob';
import type { GHStep } from '../models/GHStep';
import { CanvasUtils } from '../utils/CanvasUtils';
import { calculateOptimalLayout } from '../utils/MicroprintUtils';
import { CANVAS_CONSTANTS } from '../constants/canvas';

export const useCanvasLayers = () => {
    const [elements, setElements] = useState<CanvasElement[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);

    const getLayerBounds = useCallback((layerNumber: number): LayerBounds => {
        const layerElements = elements.filter(el => el.layer === layerNumber);

        if (layerElements.length === 0) {
            return {
                layer: layerNumber,
                minX: CANVAS_CONSTANTS.START_X,
                maxX: CANVAS_CONSTANTS.START_X,
                minY: CANVAS_CONSTANTS.START_Y,
                maxY: CANVAS_CONSTANTS.START_Y
            };
        }

        const minX = Math.min(...layerElements.map(el => el.x));
        const maxX = Math.max(...layerElements.map(el => el.x + el.width));
        const minY = Math.min(...layerElements.map(el => el.y));
        const maxY = Math.max(...layerElements.map(el => el.y + el.height));

        return { layer: layerNumber, minX, maxX, minY, maxY };
    }, [elements]);

    const getNextLayerX = useCallback((currentLayer: number): number => {
        if (currentLayer === 1) return CANVAS_CONSTANTS.START_X;

        const previousLayerBounds = getLayerBounds(currentLayer - 1);
        return previousLayerBounds.maxX + CANVAS_CONSTANTS.MIN_LAYER_SPACING;
    }, [getLayerBounds]);

    const alignWithParent = useCallback(<T extends CanvasElement>(
        _parentElement: CanvasElement,
        childElements: T[]
    ): T[] => {
        if (childElements.length === 0) return childElements;

        let currentY = CANVAS_CONSTANTS.START_Y;

        return childElements.map((child) => {
            const newElement = {
                ...child,
                y: currentY
            } as T;

            currentY += child.height + CANVAS_CONSTANTS.BOX_SPACING;
            return newElement;
        });
    }, []);

    const clearLayersFrom = useCallback((layer: number) => {
        setElements(prev => prev.filter(el => el.layer < layer));

        // Eliminar todas las conexiones que involucren capas >= layer
        setConnections(prev => prev.filter(conn =>
            conn.fromLayer < layer && conn.toLayer < layer
        ));
    }, []);

    const clearConnectionsFromElement = useCallback((fromElement: CanvasElement) => {
        setConnections(prev => prev.filter(conn => {
            const isFromThisElement =
                conn.from.x === fromElement.x + fromElement.width &&
                Math.abs(conn.from.y - (fromElement.y + fromElement.height / 2)) < 1 &&
                conn.fromLayer === fromElement.layer;

            return !isFromThisElement;
        }));
    }, []);

    const clearConnectionsFromLayer = useCallback((layer: number) => {
        setConnections(prev => prev.filter(conn => conn.fromLayer !== layer));
    }, []);

    const clearConnectionsToLayer = useCallback((layer: number) => {
        setConnections(prev => prev.filter(conn => conn.toLayer !== layer));
    }, []);

    const getConnectionsToElement = useCallback((toElement: CanvasElement): Connection[] => {
        return connections.filter(conn => {
            const isToThisElement =
                Math.abs(conn.to.x - toElement.x) < 1 &&
                Math.abs(conn.to.y - (toElement.y + toElement.height / 2)) < 1 &&
                conn.toLayer === toElement.layer;
            return isToThisElement;
        });
    }, [connections]);

    const createConnection = useCallback((
        fromElement: CanvasElement,
        toElement: CanvasElement
    ): Connection => {
        return {
            from: {
                x: fromElement.x + fromElement.width,
                y: fromElement.y + fromElement.height / 2
            },
            to: {
                x: toElement.x,
                y: toElement.y + toElement.height / 2
            },
            fromLayer: fromElement.layer,
            toLayer: toElement.layer
        };
    }, []);

    const createRunsLayer = useCallback((runs: GHRun[]) => {
        const newElements: CanvasElement[] = [];
        let currentY = CANVAS_CONSTANTS.START_Y;

        runs.forEach((run, index) => {
            const times = runs.map(r => r.getTotalExecutionTime());
            const height = CanvasUtils.normalizeValue(
                run.getTotalExecutionTime(),
                Math.min(...times),
                Math.max(...times),
                [30, 80]
            );
            const width = Math.max(run.attempts!.length * 20 + 20, 60);

            const element: CanvasElement = {
                id: `run-${index}`,
                type: 'run',
                x: CANVAS_CONSTANTS.START_X,
                y: currentY,
                width,
                height,
                color: CanvasUtils.getStatusColor(run.conclusion!),
                data: run,
                layer: 1
            };

            newElements.push(element);
            currentY += height + CANVAS_CONSTANTS.BOX_SPACING;
        });

        setElements(newElements);
        setConnections([]);
    }, []);

    const createAttemptsLayer = useCallback((attempts: GHRunAttempt[], parentRun: GHRun) => {
        const parentElement = elements.find(el => el.data === parentRun);
        if (!parentElement) return;

        // Limpiar conexiones del elemento padre y capas superiores
        clearConnectionsFromElement(parentElement);
        clearLayersFrom(2);

        const existingElements = elements.filter(el => el.layer < 2);
        const x = getNextLayerX(2);

        let attemptElements = attempts.map((attempt, index) => {
            const times = attempts.map(a => a.getExecutionTime());
            const height = CanvasUtils.normalizeValue(
                attempt.getExecutionTime(),
                Math.min(...times),
                Math.max(...times),
                [30, 120]
            );
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

        // Crear nuevas conexiones usando la función helper
        const newConnections = attemptElements.map(element =>
            createConnection(parentElement, element)
        );

        // Obtener conexiones existentes hacia el elemento padre
        const connectionsToParent = getConnectionsToElement(parentElement);

        setElements([...existingElements, ...attemptElements]);
        setConnections([...connectionsToParent, ...newConnections]);
    }, [elements, clearConnectionsFromElement, clearLayersFrom, getNextLayerX, alignWithParent, getConnectionsToElement, createConnection]);

    const createJobsLayer = useCallback((jobs: GHJob[], parentAttempt: GHRunAttempt) => {
        const parentElement = elements.find(el => el.data === parentAttempt);
        if (!parentElement) return;

        // Limpiar conexiones del elemento padre y capas superiores
        clearConnectionsFromElement(parentElement);
        clearLayersFrom(3);

        const existingElements = elements.filter(el => el.layer < 3);
        const x = getNextLayerX(3);

        let jobElements = jobs.map((job, index) => {
            const times = jobs.map(j => j.getExecutionTime());
            const height = CanvasUtils.normalizeValue(
                job.getExecutionTime(),
                Math.min(...times),
                Math.max(...times),
                [20, 100]
            );
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

        // Crear nuevas conexiones usando la función helper
        const newConnections = jobElements.map(element =>
            createConnection(parentElement, element)
        );

        // Solo mantener conexiones que no involucren la capa 3 o superior
        const existingConnections = connections.filter(conn =>
            conn.fromLayer < 3 && conn.toLayer < 3
        );

        setElements([...existingElements, ...jobElements]);
        setConnections([...existingConnections, ...newConnections]);
    }, [elements, connections, clearConnectionsFromElement, clearLayersFrom, getNextLayerX, alignWithParent, createConnection]);

    const createStepsLayer = useCallback((steps: GHStep[], parentJob: GHJob) => {
        const parentElement = elements.find(el => el.data === parentJob);
        if (!parentElement) return;

        // Limpiar conexiones del elemento padre y capas superiores
        clearConnectionsFromElement(parentElement);
        clearLayersFrom(4);

        const existingElements = elements.filter(el => el.layer < 4);
        const x = getNextLayerX(4);

        let stepElements = steps.map((step, index) => {
            const times = steps.map(s => s.executionTime);
            const height = CanvasUtils.normalizeValue(
                step.executionTime,
                Math.min(...times),
                Math.max(...times),
                [15, 50]
            );
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

        // Crear nuevas conexiones usando la función helper
        const newConnections = stepElements.map(element =>
            createConnection(parentElement, element)
        );

        // Solo mantener conexiones que no involucren la capa 4 o superior
        const existingConnections = connections.filter(conn =>
            conn.fromLayer < 4 && conn.toLayer < 4
        );

        setElements([...existingElements, ...stepElements]);
        setConnections([...existingConnections, ...newConnections]);
    }, [elements, connections, clearConnectionsFromElement, clearLayersFrom, getNextLayerX, alignWithParent, createConnection]);

    const createMicroprintLayer = useCallback((log: string, parentStep: GHStep) => {
        const parentElement = elements.find(el => el.data === parentStep);
        if (!parentElement || !log) return;

        // Limpiar conexiones del elemento padre y capas superiores
        clearConnectionsFromElement(parentElement);
        clearLayersFrom(5);

        const segments = CanvasUtils.parseLogSegments(log);
        const layout = calculateOptimalLayout(segments.length);

        // Dimensiones del canvas
        const width = layout.columns * (CANVAS_CONSTANTS.MICROPRINT_SIZE + 1);
        const height = Math.max(layout.rows * (CANVAS_CONSTANTS.MICROPRINT_SIZE + 1), 30);
        const x = getNextLayerX(5);

        const element: CanvasElement = {
            id: 'microprint',
            type: 'microprint',
            x,
            y: CANVAS_CONSTANTS.START_Y,
            width,
            height,
            color: 'rgba(59, 130, 246, 0.1)',
            data: {
                step: parentStep,
                segments,
                layout
            },
            layer: 5,
            parent: parentElement
        };

        const existingElements = elements.filter(el => el.layer < 5);

        // Crear nueva conexión usando la función helper
        const newConnection: Connection = {
            from: {
                x: parentElement.x + parentElement.width,
                y: parentElement.y + parentElement.height / 2
            },
            to: {
                x,
                y: CANVAS_CONSTANTS.START_Y + height / 2
            },
            fromLayer: parentElement.layer,
            toLayer: 5
        };

        // Solo mantener conexiones que no involucren la capa 5 o superior
        const existingConnections = connections.filter(conn =>
            conn.fromLayer < 5 && conn.toLayer < 5
        );

        setElements([...existingElements, element]);
        setConnections([...existingConnections, newConnection]);
    }, [elements, connections, clearConnectionsFromElement, clearLayersFrom, getNextLayerX]);

    return {
        elements,
        connections,
        setElements,
        setConnections,
        getLayerBounds,
        createRunsLayer,
        createAttemptsLayer,
        createJobsLayer,
        createStepsLayer,
        createMicroprintLayer,
        clearConnectionsFromLayer,
        clearConnectionsToLayer,
        createConnection
    };
};
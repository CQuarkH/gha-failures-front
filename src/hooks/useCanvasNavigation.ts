import { useState, useCallback, useRef, type RefObject } from 'react';

export interface Point {
    x: number;
    y: number;
}

export interface Camera {
    x: number;
    y: number;
    zoom: number;
}

export interface CanvasElement {
    x: number;
    y: number;
    width: number;
    height: number;
    [key: string]: any;
}

export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface UseCanvasNavigationOptions {
    minZoom?: number;
    maxZoom?: number;
    zoomSensitivity?: number;
}

// Callback para manejar clicks en elementos
export type ElementClickHandler = (worldPos: Point, event: MouseEvent) => void;

// Callback para manejar hover en elementos
export type ElementHoverHandler = (worldPos: Point, screenPos: Point, event: MouseEvent) => void;

// Tipo de retorno del hook
export interface UseCanvasNavigationReturn {
    // Estados
    camera: Camera;
    isDragging: boolean;
    canvasRef: RefObject<HTMLCanvasElement>;

    // Funciones de transformación
    screenToWorld: (screenX: number, screenY: number) => Point;
    worldToScreen: (worldX: number, worldY: number) => Point;
    applyTransform: (ctx: CanvasRenderingContext2D) => void;
    restoreTransform: (ctx: CanvasRenderingContext2D) => void;

    // Event handlers
    handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>, onElementClick?: ElementClickHandler) => boolean;
    handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>, onElementHover?: ElementHoverHandler) => boolean;
    handleMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => boolean;
    handleWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
    handleContextMenu: (e: React.MouseEvent<HTMLCanvasElement>) => void;

    // Utilidades
    resetView: () => void;
    fitToContent: (elements: CanvasElement[], margin?: number) => void;
    getScaledLineWidth: (width?: number) => number;
    isPointInRect: (point: Point, rect: Rectangle) => boolean;
    getCursor: () => string;
    getMousePos: (e: React.MouseEvent<HTMLCanvasElement>) => Point;

    // Información del estado
    zoomLevel: number;
}

/**
 * Hook para manejar navegación de canvas (pan, zoom, coordenadas)
 */
export const useCanvasNavigation = (
    options: UseCanvasNavigationOptions = {}
): UseCanvasNavigationReturn => {
    const {
        minZoom = 0.1,
        maxZoom = 5,
        zoomSensitivity = 0.1
    } = options;

    // Estados
    const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });

    // Ref para el canvas
    const canvasRef = useRef<HTMLCanvasElement>({} as HTMLCanvasElement);

    // Función para convertir coordenadas de pantalla a mundo
    const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
        return {
            x: (screenX - camera.x) / camera.zoom,
            y: (screenY - camera.y) / camera.zoom
        };
    }, [camera]);

    // Función para convertir coordenadas de mundo a pantalla
    const worldToScreen = useCallback((worldX: number, worldY: number): Point => {
        return {
            x: worldX * camera.zoom + camera.x,
            y: worldY * camera.zoom + camera.y
        };
    }, [camera]);

    // Aplicar transformación al contexto del canvas
    const applyTransform = useCallback((ctx: CanvasRenderingContext2D): void => {
        ctx.save();
        ctx.translate(camera.x, camera.y);
        ctx.scale(camera.zoom, camera.zoom);
    }, [camera]);

    // Restaurar transformación del contexto
    const restoreTransform = useCallback((ctx: CanvasRenderingContext2D): void => {
        ctx.restore();
    }, []);

    // Obtener coordenadas del mouse relativas al canvas
    const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }, []);

    // Manejar mouse down
    const handleMouseDown = useCallback((
        e: React.MouseEvent<HTMLCanvasElement>,
        onElementClick?: ElementClickHandler
    ): boolean => {
        const mousePos = getMousePos(e);
        const worldPos = screenToWorld(mousePos.x, mousePos.y);

        // Si es clic derecho o con tecla Ctrl/Cmd, iniciar pan
        if (e.button === 2 || e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setIsDragging(true);
            setDragStart(mousePos);
            return true; // Indica que se manejó el evento para pan
        }

        // Si hay callback para clic en elemento, ejecutarlo
        if (onElementClick) {
            onElementClick(worldPos, e.nativeEvent);
        }

        return false; // Indica que no se manejó para pan
    }, [getMousePos, screenToWorld]);

    // Manejar movimiento del mouse
    const handleMouseMove = useCallback((
        e: React.MouseEvent<HTMLCanvasElement>,
        onElementHover?: ElementHoverHandler
    ): boolean => {
        const mousePos = getMousePos(e);

        // Si estamos arrastrando para hacer pan
        if (isDragging) {
            const deltaX = mousePos.x - dragStart.x;
            const deltaY = mousePos.y - dragStart.y;

            setCamera(prev => ({
                ...prev,
                x: prev.x + deltaX,
                y: prev.y + deltaY
            }));

            setDragStart(mousePos);
            return true; // Indica que se manejó el evento para pan
        }

        // Si hay callback para hover, ejecutarlo con coordenadas del mundo
        if (onElementHover) {
            const worldPos = screenToWorld(mousePos.x, mousePos.y);
            onElementHover(worldPos, mousePos, e.nativeEvent);
        }

        return false; // Indica que no se manejó para pan
    }, [isDragging, dragStart, getMousePos, screenToWorld]);

    // Manejar mouse up
    const handleMouseUp = useCallback((_e: React.MouseEvent<HTMLCanvasElement>): boolean => {
        const wasDragging = isDragging;
        setIsDragging(false);
        return wasDragging; // Indica si estaba haciendo pan
    }, [isDragging]);

    // Manejar zoom con rueda del mouse
    const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>): void => {
        e.preventDefault();

        const mousePos = getMousePos(e);

        // Factor de zoom
        const delta = e.deltaY > 0 ? -zoomSensitivity : zoomSensitivity;
        const zoomFactor = 1 + delta;
        const newZoom = Math.max(minZoom, Math.min(maxZoom, camera.zoom * zoomFactor));

        // Calcular nuevo offset para zoom hacia el cursor
        const zoomRatio = newZoom / camera.zoom;
        const newX = mousePos.x - (mousePos.x - camera.x) * zoomRatio;
        const newY = mousePos.y - (mousePos.y - camera.y) * zoomRatio;

        setCamera({
            x: newX,
            y: newY,
            zoom: newZoom
        });
    }, [camera, getMousePos, minZoom, maxZoom, zoomSensitivity]);

    // Prevenir menú contextual
    const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>): void => {
        e.preventDefault();
    }, []);

    // Resetear vista
    const resetView = useCallback((): void => {
        setCamera({ x: 0, y: 0, zoom: 1 });
    }, []);

    // Ajustar vista al contenido
    const fitToContent = useCallback((elements: CanvasElement[], margin: number = 50): void => {
        if (!elements || elements.length === 0) return;

        // Encontrar bounding box de todos los elementos
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        elements.forEach(element => {
            minX = Math.min(minX, element.x);
            minY = Math.min(minY, element.y);
            maxX = Math.max(maxX, element.x + element.width);
            maxY = Math.max(maxY, element.y + element.height);
        });

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const canvas = canvasRef.current;

        if (!canvas) return;

        // Calcular zoom para que quepa todo con margen
        const zoomX = (canvas.width - margin * 2) / contentWidth;
        const zoomY = (canvas.height - margin * 2) / contentHeight;
        const newZoom = Math.min(zoomX, zoomY, 1); // No hacer zoom mayor a 1

        // Centrar el contenido
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const newX = canvas.width / 2 - centerX * newZoom;
        const newY = canvas.height / 2 - centerY * newZoom;

        setCamera({ x: newX, y: newY, zoom: newZoom });
    }, []);

    // Obtener grosor de línea ajustado al zoom
    const getScaledLineWidth = useCallback((width: number = 1): number => {
        return width / camera.zoom;
    }, [camera.zoom]);

    // Verificar si un punto está dentro de un rectángulo (en coordenadas del mundo)
    const isPointInRect = useCallback((point: Point, rect: Rectangle): boolean => {
        return point.x >= rect.x &&
            point.x <= rect.x + rect.width &&
            point.y >= rect.y &&
            point.y <= rect.y + rect.height;
    }, []);

    // Obtener cursor apropiado
    const getCursor = useCallback((): string => {
        return isDragging ? 'grabbing' : 'grab';
    }, [isDragging]);

    return {
        // Estados
        camera,
        isDragging,
        canvasRef,

        // Funciones de transformación
        screenToWorld,
        worldToScreen,
        applyTransform,
        restoreTransform,

        // Event handlers
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
        handleContextMenu,

        // Utilidades
        resetView,
        fitToContent,
        getScaledLineWidth,
        isPointInRect,
        getCursor,
        getMousePos,

        // Información del estado
        zoomLevel: Math.round(camera.zoom * 100)
    };
};
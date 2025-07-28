import type { CanvasElement } from '../../types/canvas';

interface CanvasControlsProps {
    zoomLevel: number;
    elements: CanvasElement[];
    fitToContent: (elements: CanvasElement[]) => void;
}

export const CanvasControls = ({ zoomLevel, elements, fitToContent }: CanvasControlsProps) => {
    return (
        <>
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

            {/* Instrucciones de uso */}
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
                <div>• Rueda del mouse: Zoom</div>
                <div>• Clic derecho + arrastrar: Mover</div>
            </div>
        </>
    );
};
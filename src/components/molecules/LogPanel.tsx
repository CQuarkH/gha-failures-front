import { useEffect, useRef, useState, useMemo } from 'react';
import type { LogSegment } from '../../pages/WorkflowLayerDesign';

interface LogPanelProps {
    segments: LogSegment[];
    selectedSegment: { segmentIndex: number; text: string };
    visible: boolean;
    onClose: () => void;
}

const LogPanel = ({ segments, selectedSegment, visible, onClose }: LogPanelProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedRef = useRef<HTMLDivElement>(null);
    const WINDOW_SIZE = 25; // Segmentos hacia arriba y abajo del seleccionado
    const LOAD_BATCH = 15; // Cantidad a cargar de una vez

    const [viewportStart, setViewportStart] = useState(0);
    const [viewportEnd, setViewportEnd] = useState(WINDOW_SIZE * 2);

    const visibleRange = useMemo(() => {
        const selectedIndex = selectedSegment.segmentIndex;
        const totalSegments = segments.length;

        // Rango inicial centrado en el elemento seleccionado
        let start = Math.max(0, selectedIndex - WINDOW_SIZE);
        let end = Math.min(totalSegments, selectedIndex + WINDOW_SIZE + 1);

        // Expandir con el viewport actual (para lazy loading)
        start = Math.min(start, viewportStart);
        end = Math.max(end, viewportEnd);

        // Asegurar que no exceda los límites
        start = Math.max(0, start);
        end = Math.min(totalSegments, end);

        return { start, end };
    }, [selectedSegment.segmentIndex, segments.length, viewportStart, viewportEnd, WINDOW_SIZE]);

    const visibleSegments = useMemo(() => {
        return segments.slice(visibleRange.start, visibleRange.end).map((segment, index) => ({
            ...segment,
            originalIndex: visibleRange.start + index
        }));
    }, [segments, visibleRange]);

    // 🔄 RESET VIEWPORT CUANDO CAMBIA EL SEGMENTO SELECCIONADO
    useEffect(() => {
        const selectedIndex = selectedSegment.segmentIndex;
        const newStart = Math.max(0, selectedIndex - WINDOW_SIZE);
        const newEnd = Math.min(segments.length, selectedIndex + WINDOW_SIZE + 1);

        setViewportStart(newStart);
        setViewportEnd(newEnd);
    }, [selectedSegment.segmentIndex, segments.length, WINDOW_SIZE]);

    // 📜 LAZY LOADING EN SCROLL
    const handleScroll = () => {
        const container = containerRef.current;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        const scrollPercentage = scrollTop / (scrollHeight - clientHeight);

        // 🔝 CARGAR MÁS HACIA ARRIBA (scroll cerca del inicio)
        if (scrollPercentage < 0.1 && viewportStart > 0) {
            const newStart = Math.max(0, viewportStart - LOAD_BATCH);
            setViewportStart(newStart);
        }

        // 🔽 CARGAR MÁS HACIA ABAJO (scroll cerca del final)
        if (scrollPercentage > 0.9 && viewportEnd < segments.length) {
            const newEnd = Math.min(segments.length, viewportEnd + LOAD_BATCH);
            setViewportEnd(newEnd);
        }
    };

    useEffect(() => {
        if (selectedRef.current && visible) {
            // Pequeño delay para asegurar que el DOM se ha actualizado
            setTimeout(() => {
                selectedRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                });
            }, 100);
        }
    }, [selectedSegment.segmentIndex, visible]);

    if (!visible) return null;

    return (
        <div className='flex flex-col w-[30%] absolute top-0 right-0 h-full p-4 z-50'>
            <div className="bg-white rounded-t-lg shadow-xl flex flex-col w-full border border-gray-300">
                <div className="p-4 border-b border-gray-300 rounded-t-lg relative">
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600"
                    >
                        ×
                    </button>
                    <h3 className="font-semibold text-lg">Log Output</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Segment {selectedSegment.segmentIndex + 1} of {segments.length.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        📋 Showing {visibleSegments.length} of {segments.length.toLocaleString()} segments
                        ({visibleRange.start + 1}-{visibleRange.end})
                    </p>
                </div>

                <div
                    ref={containerRef}
                    className="flex-1 overflow-y-auto overflow-x-hidden p-4 max-h-96 scroll-smooth"
                    onScroll={handleScroll}
                >
                    {/* 🔝 INDICADOR DE MÁS CONTENIDO ARRIBA */}
                    {visibleRange.start > 0 && (
                        <div className="text-center py-2 text-xs text-gray-500 bg-gray-100 rounded mb-2">
                            ⬆️ {visibleRange.start.toLocaleString()} segments above...
                        </div>
                    )}

                    <div className="space-y-1">
                        {visibleSegments.map((segment, _relativeIndex) => {
                            const originalIndex = segment.originalIndex;
                            const isSelected = originalIndex === selectedSegment.segmentIndex;

                            return (
                                <div
                                    key={`segment-${originalIndex}`}
                                    ref={isSelected ? selectedRef : null}
                                    className={`
                                        p-2 rounded text-sm font-mono whitespace-pre-wrap
                                        transition-all duration-200
                                        ${isSelected
                                            ? 'bg-blue-100 border-2 border-blue-500 shadow-md transform scale-101'
                                            : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                                        }
                                        ${segment.isError
                                            ? (isSelected ? 'bg-red-100 border-red-500' : 'bg-red-50 border-red-200 text-red-800')
                                            : 'text-gray-800'
                                        }
                                    `}
                                >
                                    <div className="flex items-start gap-2">
                                        <span className={`
                                            text-xs px-1 py-0.5 rounded flex-shrink-0 mt-0.5 min-w-[3rem] text-center
                                            ${isSelected
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-400 text-white'
                                            }
                                        `}>
                                            {originalIndex + 1}
                                        </span>
                                        <span className="flex-1 break-words">
                                            {segment.text || `[Segment ${originalIndex + 1}]`}
                                        </span>
                                        {segment.isError && (
                                            <span className="text-xs bg-red-500 text-white px-1 py-0.5 rounded flex-shrink-0">
                                                ERROR
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* 🔽 INDICADOR DE MÁS CONTENIDO ABAJO */}
                    {visibleRange.end < segments.length && (
                        <div className="text-center py-2 text-xs text-gray-500 bg-gray-100 rounded mt-2">
                            ⬇️ {(segments.length - visibleRange.end).toLocaleString()} segments below...
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                    <div className="text-xs text-gray-600">
                        <strong>Selected:</strong> {selectedSegment.text ? selectedSegment.text.substring(0, 100) + (selectedSegment.text.length > 100 ? '...' : '') : 'No content'}
                    </div>
                </div>
                <div className='h-5'></div>
            </div>

            <div className='flex flex-col bg-white shadow-lg rounded-b-lg border-l border-r border-b border-gray-300'>
                <div className='p-4 text-sm flex flex-col gap-6'>
                    <h3 className="font-semibold text-lg">Explanation</h3>
                    <p>The selected segment: {selectedSegment.text} has a problem probably with how it is being processed in the workflow. For handle that, you can try to adjust the workflow configuration or check the input data for inconsistencies.</p>
                </div>
            </div>
        </div>
    );
};

export default LogPanel;
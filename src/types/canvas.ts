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

export interface Connection {
    from: { x: number; y: number };
    to: { x: number; y: number };
}

export interface LayerBounds {
    layer: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export interface MicroprintLayout {
    columns: number;
    rows: number;
    actualRatio: number;
    efficiency: number;
}

export interface LogPanelState {
    segments: LogSegment[];
    selectedSegment: {
        segmentIndex: number;
        text: string;
    };
    visible: boolean;
}

export interface TooltipState {
    x: number;
    y: number;
    visible: boolean;
}

export interface SelectedMicroprintSegment {
    elementId: string;
    segmentIndex: number;
}
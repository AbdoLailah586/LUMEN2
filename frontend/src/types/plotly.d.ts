declare module 'react-plotly.js' {
    import * as React from 'react';
    import * as Plotly from 'plotly.js';

    export interface PlotParams {
        data: Plotly.Data[];
        layout: Partial<Plotly.Layout>;
        frames?: Plotly.Frame[];
        config?: Partial<Plotly.Config>;
        onInitialized?: (figure: Readonly<PlotFigure>, graphDiv: Readonly<HTMLElement>) => void;
        onUpdate?: (figure: Readonly<PlotFigure>, graphDiv: Readonly<HTMLElement>) => void;
        onPurge?: (figure: Readonly<PlotFigure>, graphDiv: Readonly<HTMLElement>) => void;
        onError?: (err: Readonly<Error>) => void;
        style?: React.CSSProperties;
        className?: string;
        useResizeHandler?: boolean;
        debug?: boolean;
    }

    export interface PlotFigure {
        data: Plotly.Data[];
        layout: Partial<Plotly.Layout>;
    }

    export default class Plot extends React.Component<PlotParams> {}
}

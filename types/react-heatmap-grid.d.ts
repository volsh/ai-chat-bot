// react-heatmap-grid.d.ts
declare module "react-heatmap-grid" {
  import React from "react";
  interface HeatMapGridProps {
    data: number[][];
    xLabels: string[];
    yLabels: string[];
    square?: boolean;
    cellStyle?: (xIndex: number, yIndex: number, value: number) => React.CSSProperties;
    cellRender?: (value: number) => React.ReactNode;
  }
  export const HeatMapGrid: React.FC<HeatMapGridProps>;
}

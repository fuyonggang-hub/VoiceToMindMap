
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MindMapNode } from '../types';

interface Props {
  data: MindMapNode;
}

interface LayoutNode {
  id: string;
  label: string;
  x: number;
  y: number;
  px?: number;
  py?: number;
  hasChildren: boolean;
  isCollapsed: boolean;
}

export const MindMap: React.FC<Props> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState({ x: 50, y: 150, scale: 0.8 });
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  
  const pointerCache = useRef<Map<number, PointerEvent>>(new Map());
  const lastDist = useRef<number | null>(null);
  const lastPoint = useRef<{ x: number, y: number } | null>(null);

  // Layout constants
  const nodeWidth = 160;
  const nodeHeight = 50;
  const verticalGap = 30;
  const horizontalGap = 200;

  // Assign IDs to nodes if they don't have them (using path for uniqueness)
  const dataWithIds = useMemo(() => {
    const addId = (node: MindMapNode, path: string): MindMapNode => ({
      ...node,
      id: path,
      children: node.children?.map((c, i) => addId(c, `${path}-${i}`))
    });
    return addId(data, 'root');
  }, [data]);

  // Hierarchical layout that respects collapsed state
  const nodes = useMemo(() => {
    const flat: LayoutNode[] = [];
    
    const calculatePositions = (node: MindMapNode, depth: number, yOffset: { val: number }) => {
      const id = node.id!;
      const isCollapsed = collapsedIds.has(id);
      const hasChildren = !!(node.children && node.children.length > 0);
      
      const current = {
        id,
        label: node.label,
        x: depth * horizontalGap,
        y: 0,
        hasChildren,
        isCollapsed,
        childrenNodes: [] as any[]
      };

      if (!hasChildren || isCollapsed) {
        current.y = yOffset.val;
        yOffset.val += nodeHeight + verticalGap;
      } else {
        const startY = yOffset.val;
        node.children!.forEach(child => {
          current.childrenNodes.push(calculatePositions(child, depth + 1, yOffset));
        });
        const endY = yOffset.val - (nodeHeight + verticalGap);
        current.y = (startY + endY) / 2;
      }
      return current;
    };

    const tree = calculatePositions(dataWithIds, 0, { val: 0 });

    const flatten = (n: any, px?: number, py?: number) => {
      flat.push({ 
        id: n.id, 
        label: n.label, 
        x: n.x, 
        y: n.y, 
        px, 
        py, 
        hasChildren: n.hasChildren, 
        isCollapsed: n.isCollapsed 
      });
      if (!n.isCollapsed) {
        n.childrenNodes.forEach((c: any) => flatten(c, n.x + nodeWidth, n.y + nodeHeight / 2));
      }
    };
    flatten(tree);
    return flat;
  }, [dataWithIds, collapsedIds]);

  const toggleNode = (id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetView = () => {
    setTransform({ x: 50, y: 150, scale: 0.8 });
    setCollapsedIds(new Set());
  };

  // Interaction handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerCache.current.set(e.pointerId, e.nativeEvent);
    lastPoint.current = { x: e.clientX, y: e.clientY };
    if (svgRef.current) svgRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    pointerCache.current.set(e.pointerId, e.nativeEvent);
    const pointers = Array.from(pointerCache.current.values());

    if (pointers.length === 1 && lastPoint.current) {
      const dx = e.clientX - lastPoint.current.x;
      const dy = e.clientY - lastPoint.current.y;
      setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
      lastPoint.current = { x: e.clientX, y: e.clientY };
    } else if (pointers.length === 2) {
      const p1 = pointers[0];
      const p2 = pointers[1];
      const dist = Math.sqrt(Math.pow(p2.clientX - p1.clientX, 2) + Math.pow(p2.clientY - p1.clientY, 2));
      if (lastDist.current !== null) {
        const delta = dist / lastDist.current;
        setTransform(t => ({ ...t, scale: Math.max(0.1, Math.min(5, t.scale * delta)) }));
      }
      lastDist.current = dist;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    pointerCache.current.delete(e.pointerId);
    if (pointerCache.current.size < 2) lastDist.current = null;
    if (pointerCache.current.size === 0) lastPoint.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const scaleFactor = 1 - e.deltaY * 0.001;
    setTransform(t => ({ ...t, scale: Math.max(0.1, Math.min(5, t.scale * scaleFactor)) }));
  };

  return (
    <div className="w-full h-[500px] bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden touch-none relative group">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <button 
          onClick={resetView}
          className="bg-white p-2 rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 text-indigo-600 transition-colors flex items-center gap-2 text-sm font-bold"
          title="重置视图"
        >
          <i className="fa-solid fa-expand"></i>
          显示全部
        </button>
      </div>

      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {nodes.map((node) => (
            <g key={node.id}>
              {node.px !== undefined && (
                <path
                  d={`M ${node.px} ${node.py} C ${node.px + 40} ${node.py}, ${node.x - 40} ${node.y + nodeHeight / 2}, ${node.x} ${node.y + nodeHeight / 2}`}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  className="transition-all duration-300"
                />
              )}
              
              <g 
                onClick={(e) => { e.stopPropagation(); if(node.hasChildren) toggleNode(node.id); }}
                className={node.hasChildren ? "cursor-pointer" : ""}
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={nodeWidth}
                  height={nodeHeight}
                  rx="8"
                  fill="white"
                  stroke={node.isCollapsed ? "#6366f1" : "#e2e8f0"}
                  strokeWidth={node.isCollapsed ? "2" : "1.5"}
                  className="shadow-sm transition-all duration-300"
                />
                <foreignObject x={node.x + 5} y={node.y + 5} width={nodeWidth - 10} height={nodeHeight - 10} className="pointer-events-none">
                  <div className="h-full flex items-center justify-center text-center text-[11px] font-bold text-slate-800 leading-tight overflow-hidden">
                    {node.label}
                  </div>
                </foreignObject>
                
                {node.hasChildren && (
                  <circle
                    cx={node.x + nodeWidth}
                    cy={node.y + nodeHeight / 2}
                    r="8"
                    fill={node.isCollapsed ? "#6366f1" : "white"}
                    stroke="#6366f1"
                    strokeWidth="1.5"
                  />
                )}
                {node.hasChildren && (
                  <path
                    d={node.isCollapsed 
                      ? `M ${node.x + nodeWidth - 4} ${node.y + nodeHeight/2} h 8 M ${node.x + nodeWidth} ${node.y + nodeHeight/2 - 4} v 8`
                      : `M ${node.x + nodeWidth - 4} ${node.y + nodeHeight/2} h 8`}
                    stroke={node.isCollapsed ? "white" : "#6366f1"}
                    strokeWidth="1.5"
                  />
                )}
              </g>
            </g>
          ))}
        </g>
      </svg>
      
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200 text-[11px] text-slate-500 font-medium shadow-sm pointer-events-none">
        <i className="fa-solid fa-hand-pointer mr-2"></i>
        点击节点展开/折叠 · 双指缩放 · 单指拖动
      </div>
    </div>
  );
};

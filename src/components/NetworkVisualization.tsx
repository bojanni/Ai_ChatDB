import { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { getAllRelationshipsForVisualization } from '../utils/relationshipService';

interface Node {
  id: string;
  title: string;
  ai_source: string;
  tags: string[];
  created_at: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface Edge {
  source: string;
  target: string;
  strength: number;
  type: string;
}

interface NetworkVisualizationProps {
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
  selectedChatId?: string | null;
}

export default function NetworkVisualization({ onClose, onSelectChat, selectedChatId }: NetworkVisualizationProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (nodes.length > 0) {
      initializePositions();
      startSimulation();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes.length, edges.length]);

  useEffect(() => {
    drawGraph();
  }, [nodes, edges, zoom, offset, selectedChatId]);

  const loadData = async () => {
    setLoading(true);
    const data = await getAllRelationshipsForVisualization();
    setNodes(data.nodes);
    setEdges(data.edges);
    setLoading(false);
  };

  const initializePositions = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 3;

    setNodes((prevNodes) =>
      prevNodes.map((node, i) => {
        const angle = (i / prevNodes.length) * 2 * Math.PI;
        return {
          ...node,
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
          vx: 0,
          vy: 0,
        };
      })
    );
  };

  const startSimulation = () => {
    let iteration = 0;
    const maxIterations = 300;

    const simulate = () => {
      if (iteration++ > maxIterations) return;

      setNodes((prevNodes) => {
        const newNodes = prevNodes.map((node) => ({ ...node }));

        for (let i = 0; i < newNodes.length; i++) {
          let fx = 0;
          let fy = 0;

          for (let j = 0; j < newNodes.length; j++) {
            if (i === j) continue;

            const dx = newNodes[j].x! - newNodes[i].x!;
            const dy = newNodes[j].y! - newNodes[i].y!;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;

            const repulsion = 5000 / (distance * distance);
            fx -= (dx / distance) * repulsion;
            fy -= (dy / distance) * repulsion;
          }

          edges.forEach((edge) => {
            let other: Node | undefined;
            if (edge.source === newNodes[i].id) {
              other = newNodes.find((n) => n.id === edge.target);
            } else if (edge.target === newNodes[i].id) {
              other = newNodes.find((n) => n.id === edge.source);
            }

            if (other) {
              const dx = other.x! - newNodes[i].x!;
              const dy = other.y! - newNodes[i].y!;
              const distance = Math.sqrt(dx * dx + dy * dy) || 1;

              const attraction = (distance - 150) * 0.1 * edge.strength;
              fx += (dx / distance) * attraction;
              fy += (dy / distance) * attraction;
            }
          });

          newNodes[i].vx = (newNodes[i].vx || 0) * 0.8 + fx * 0.01;
          newNodes[i].vy = (newNodes[i].vy || 0) * 0.8 + fy * 0.01;

          newNodes[i].x = newNodes[i].x! + newNodes[i].vx!;
          newNodes[i].y = newNodes[i].y! + newNodes[i].vy!;
        }

        return newNodes;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    simulate();
  };

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    edges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      if (sourceNode && targetNode && sourceNode.x && sourceNode.y && targetNode.x && targetNode.y) {
        ctx.strokeStyle = `rgba(132, 204, 22, ${edge.strength * 0.6})`;
        ctx.lineWidth = edge.strength * 3;
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();
      }
    });

    nodes.forEach((node) => {
      if (!node.x || !node.y) return;

      const isSelected = node.id === selectedChatId;
      const radius = isSelected ? 30 : 20;

      const aiColors: Record<string, string> = {
        'ChatGPT': '#10a37f',
        'Claude': '#cc785c',
        'Gemini': '#4285f4',
        'Perplexity': '#20808d',
        'Other': '#84cc16',
      };

      const color = aiColors[node.ai_source] || aiColors['Other'];

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const maxWidth = 100;
      const title = node.title.length > 15 ? node.title.substring(0, 15) + '...' : node.title;

      ctx.strokeText(title, node.x, node.y - radius - 15, maxWidth);
      ctx.fillText(title, node.x, node.y - radius - 15, maxWidth);
    });

    ctx.restore();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / zoom;
    const y = (e.clientY - rect.top - offset.y) / zoom;

    const clickedNode = nodes.find((node) => {
      if (!node.x || !node.y) return false;
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    });

    if (clickedNode) {
      onSelectChat(clickedNode.id);
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.2, 0.3));
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-mocha-800 rounded-xl p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-cream-50 dark:bg-mocha-800 rounded-xl shadow-2xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-lime-400 to-lime-500 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Chat Network Map</h2>
              <p className="text-white/80 text-sm mt-1">
                {nodes.length} chats • {edges.length} connections
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 relative bg-mocha-900">
          <canvas
            ref={canvasRef}
            width={1200}
            height={800}
            className="w-full h-full cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />

          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button
              onClick={handleZoomIn}
              className="p-3 bg-white dark:bg-mocha-700 rounded-lg shadow-lg hover:bg-sand-100 dark:hover:bg-mocha-600 transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={20} className="text-mocha-900 dark:text-cream-50" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-3 bg-white dark:bg-mocha-700 rounded-lg shadow-lg hover:bg-sand-100 dark:hover:bg-mocha-600 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={20} className="text-mocha-900 dark:text-cream-50" />
            </button>
            <button
              onClick={handleReset}
              className="p-3 bg-white dark:bg-mocha-700 rounded-lg shadow-lg hover:bg-sand-100 dark:hover:bg-mocha-600 transition-colors"
              title="Reset View"
            >
              <Maximize2 size={20} className="text-mocha-900 dark:text-cream-50" />
            </button>
          </div>

          <div className="absolute top-4 left-4 bg-white dark:bg-mocha-700 rounded-lg shadow-lg p-4 space-y-2">
            <h3 className="font-bold text-mocha-900 dark:text-cream-50 text-sm mb-2">AI Sources</h3>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#10a37f]"></div>
              <span className="text-sm text-mocha-700 dark:text-sand-300">ChatGPT</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#cc785c]"></div>
              <span className="text-sm text-mocha-700 dark:text-sand-300">Claude</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#4285f4]"></div>
              <span className="text-sm text-mocha-700 dark:text-sand-300">Gemini</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#20808d]"></div>
              <span className="text-sm text-mocha-700 dark:text-sand-300">Perplexity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#84cc16]"></div>
              <span className="text-sm text-mocha-700 dark:text-sand-300">Other</span>
            </div>
          </div>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-white text-lg mb-2">No chats to visualize yet</p>
                <p className="text-white/60 text-sm">Import or create chats to see connections</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
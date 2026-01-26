import React, { useState, useEffect, useRef, useId, useCallback } from 'react';
import mermaid from 'mermaid';
import copy from 'copy-to-clipboard';
import { Clipboard, CheckMark } from '@librechat/client';
import { ChevronDown, ChevronUp, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useLocalize } from '~/hooks';
import cn from '~/utils/cn';

type MermaidPreviewProps = {
  code: string;
};

// Initialize mermaid with neutral theme for better text visibility
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

/**
 * Preprocesses mermaid code to handle special characters in node labels.
 * Wraps unquoted node text containing special characters in quotes.
 */
const preprocessMermaidCode = (code: string): string => {
  // Pattern to match node definitions with brackets: NODE_ID[text] or NODE_ID(text) etc.
  // We need to quote text that contains special characters like : ' & "
  const lines = code.split('\n');

  return lines
    .map((line) => {
      // Skip comment lines
      if (line.trim().startsWith('%%')) return line;

      // Match node definitions with various bracket types: [], (), {}, (())
      // and wrap their content in quotes if it contains special characters
      return line.replace(
        /([\w]+)(\[|\(|\{|\(\()([^\])}]+)(\]|\)|\}|\)\))/g,
        (match, nodeId, openBracket, content, closeBracket) => {
          // Check if content already has quotes
          if (content.startsWith('"') && content.endsWith('"')) {
            return match;
          }
          // Check if content contains special characters that need quoting
          if (/[:'"|&]/.test(content)) {
            // Escape any existing quotes in the content
            const escapedContent = content.replace(/"/g, '#quot;');
            return `${nodeId}${openBracket}"${escapedContent}"${closeBracket}`;
          }
          return match;
        },
      );
    })
    .join('\n');
};

const MermaidPreview: React.FC<MermaidPreviewProps> = ({ code }) => {
  const localize = useLocalize();
  const uniqueId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code.trim()) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Clean the mermaid ID to be valid
        const cleanId = `mermaid-${uniqueId.replace(/:/g, '-')}`;

        const processedCode = preprocessMermaidCode(code.trim());
        const { svg: renderedSvg } = await mermaid.render(cleanId, processedCode);
        setSvg(renderedSvg);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [code, uniqueId]);

  const handleCopy = () => {
    copy(code.trim(), { format: 'text/plain' });
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      panStart.current = { x: pan.x, y: pan.y };
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Use native event listener to properly prevent default browser zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setZoom((prev) => Math.min(Math.max(prev + delta, MIN_ZOOM), MAX_ZOOM));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="w-full rounded-md bg-gray-900 text-xs text-white/80">
      {/* Header bar */}
      <div className="relative flex items-center justify-between rounded-tl-md rounded-tr-md bg-gray-700 px-4 py-2 font-sans text-xs text-gray-200">
        <span>{localize('com_ui_mermaid')}</span>
        <div className="flex items-center gap-4">
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded p-1 hover:bg-gray-600 hover:text-white"
              onClick={handleZoomOut}
              title={localize('com_ui_zoom_out')}
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="rounded p-1 hover:bg-gray-600 hover:text-white"
              onClick={handleZoomIn}
              title={localize('com_ui_zoom_in')}
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded p-1 hover:bg-gray-600 hover:text-white"
              onClick={handleResetZoom}
              title={localize('com_ui_reset_zoom')}
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 hover:text-white"
            onClick={() => setShowCode(!showCode)}
          >
            {showCode ? (
              <>
                <ChevronUp className="h-4 w-4" />
                {localize('com_ui_hide_code')}
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                {localize('com_ui_show_code')}
              </>
            )}
          </button>
          <button type="button" className="ml-auto flex gap-2" onClick={handleCopy}>
            {isCopied ? (
              <>
                <CheckMark className="h-[18px] w-[18px]" />
                {localize('com_ui_copied')}
              </>
            ) : (
              <>
                <Clipboard />
                {localize('com_ui_copy_code')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsible code view */}
      {showCode && (
        <div className="border-b border-gray-600 bg-gray-800 p-4">
          <pre className="overflow-x-auto">
            <code className="hljs language-mermaid !whitespace-pre text-xs">{code}</code>
          </pre>
        </div>
      )}

      {/* Diagram preview */}
      <div
        ref={containerRef}
        className={cn(
          'overflow-hidden p-4',
          'flex items-center justify-center',
          'min-h-[200px] bg-white',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            {localize('com_ui_rendering')}
          </div>
        )}
        {error && !isLoading && (
          <div className="rounded-md bg-red-900/50 p-4 text-red-300">
            <p className="font-semibold">{localize('com_ui_mermaid_error')}</p>
            <pre className="mt-2 whitespace-pre-wrap text-xs">{error}</pre>
          </div>
        )}
        {svg && !isLoading && !error && (
          <div
            className={cn(
              'mermaid-svg-container origin-center select-none',
              !isDragging && 'transition-transform duration-150',
            )}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
    </div>
  );
};

export default MermaidPreview;

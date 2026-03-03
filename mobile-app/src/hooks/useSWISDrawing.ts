import { useState, useEffect, useCallback, useRef } from 'react';
import { SWISDrawing } from '../types/mission';

interface UseSWISDrawingOptions {
  dataChannel: RTCDataChannel | null;
}

export const useSWISDrawing = (options: UseSWISDrawingOptions) => {
  const { dataChannel } = options;
  
  const [remoteAnchors, setRemoteAnchors] = useState<SWISDrawing[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<SWISDrawing['type']>('arrow');
  const [currentColor, setCurrentColor] = useState('#00FF00');
  
  const pendingDrawings = useRef<SWISDrawing[]>([]);

  useEffect(() => {
    if (!dataChannel) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const drawCommand = JSON.parse(event.data);
        
        if (drawCommand.type === 'clear') {
          setRemoteAnchors([]);
          return;
        }

        const newAnchor: SWISDrawing = {
          id: `SWIS-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: drawCommand.type || 'arrow',
          transform: drawCommand.transform,
          label: drawCommand.label || '',
          color: drawCommand.color || currentColor,
          createdBy: drawCommand.expertId || 'remote',
          timestamp: Date.now(),
        };

        setRemoteAnchors(prev => [...prev, newAnchor]);
        console.log(`🎨 Remote drawing received: ${drawCommand.type}`);
      } catch (error) {
        console.error('Failed to parse SWIS drawing:', error);
      }
    };

    dataChannel.onmessage = handleMessage;

    return () => {
      dataChannel.onmessage = null;
    };
  }, [dataChannel, currentColor]);

  const sendDrawing = useCallback(async (
    transform: number[],
    type?: SWISDrawing['type'],
    label?: string
  ): Promise<void> => {
    if (!dataChannel || dataChannel.readyState !== 'open') {
      console.warn('Data channel not ready for drawing');
      return;
    }

    const drawing = {
      type: type || currentTool,
      transform,
      label: label || '',
      color: currentColor,
      expertId: 'analyst',
      timestamp: Date.now(),
    };

    try {
      dataChannel.send(JSON.stringify(drawing));
      console.log(`📤 Drawing sent: ${drawing.type}`);
    } catch (error) {
      console.error('Failed to send drawing:', error);
    }
  }, [dataChannel, currentTool, currentColor]);

  const clearDrawings = useCallback((): void => {
    setRemoteAnchors([]);
    
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify({ type: 'clear' }));
    }
    console.log('🧹 SWIS drawings cleared');
  }, [dataChannel]);

  const undoLastDrawing = useCallback((): void => {
    setRemoteAnchors(prev => prev.slice(0, -1));
  }, []);

  const setTool = useCallback((tool: SWISDrawing['type']): void => {
    setCurrentTool(tool);
    console.log(`🛠️ SWIS tool changed to: ${tool}`);
  }, []);

  const setColor = useCallback((color: string): void => {
    setCurrentColor(color);
    console.log(`🎨 SWIS color changed to: ${color}`);
  }, []);

  const startDrawing = useCallback((): void => {
    setIsDrawing(true);
  }, []);

  const stopDrawing = useCallback((): void => {
    setIsDrawing(false);
  }, []);

  const getDrawingsByType = useCallback((
    type: SWISDrawing['type']
  ): SWISDrawing[] => {
    return remoteAnchors.filter(d => d.type === type);
  }, [remoteAnchors]);

  const getDrawingsSummary = useCallback(() => {
    return {
      total: remoteAnchors.length,
      arrows: remoteAnchors.filter(d => d.type === 'arrow').length,
      circles: remoteAnchors.filter(d => d.type === 'circle').length,
      text: remoteAnchors.filter(d => d.type === 'text').length,
      measures: remoteAnchors.filter(d => d.type === 'measure').length,
    };
  }, [remoteAnchors]);

  return {
    remoteAnchors,
    isDrawing,
    currentTool,
    currentColor,
    sendDrawing,
    clearDrawings,
    undoLastDrawing,
    setTool,
    setColor,
    startDrawing,
    stopDrawing,
    getDrawingsByType,
    getDrawingsSummary,
  };
};

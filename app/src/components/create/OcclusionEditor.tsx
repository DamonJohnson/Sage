import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius } from '@/theme';
import type { OcclusionShape, OcclusionShapeType } from '@sage/shared';
import { extractOcclusionLabel } from '@/services/ai';

const MAX_OCCLUSIONS = 20;
const OCCLUSION_COLOR = '#D96830'; // Orange
const HANDLE_SIZE = 10;

type DragMode = 'none' | 'draw' | 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se';

// Image bounds within container (accounting for object-fit: contain)
interface ImageBounds {
  offsetX: number;
  offsetY: number;
  renderedWidth: number;
  renderedHeight: number;
}

// Calculate actual rendered image bounds within a container using object-fit: contain
function calculateImageBounds(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): ImageBounds {
  if (!containerWidth || !containerHeight || !imageWidth || !imageHeight) {
    return { offsetX: 0, offsetY: 0, renderedWidth: containerWidth, renderedHeight: containerHeight };
  }

  const containerAspect = containerWidth / containerHeight;
  const imageAspect = imageWidth / imageHeight;

  let renderedWidth: number;
  let renderedHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (imageAspect > containerAspect) {
    // Image is wider than container - letterbox top/bottom
    renderedWidth = containerWidth;
    renderedHeight = containerWidth / imageAspect;
    offsetX = 0;
    offsetY = (containerHeight - renderedHeight) / 2;
  } else {
    // Image is taller than container - letterbox left/right
    renderedHeight = containerHeight;
    renderedWidth = containerHeight * imageAspect;
    offsetX = (containerWidth - renderedWidth) / 2;
    offsetY = 0;
  }

  return { offsetX, offsetY, renderedWidth, renderedHeight };
}

interface OcclusionEditorProps {
  imageUri: string;
  imageBase64?: string; // For AI label extraction
  occlusions: OcclusionShape[];
  onOcclusionsChange: (occlusions: OcclusionShape[]) => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  enableAiLabeling?: boolean; // Enable AI auto-labeling on draw
}

export function OcclusionEditor({
  imageUri,
  imageBase64,
  occlusions,
  onOcclusionsChange,
  enableAiLabeling = true,
}: OcclusionEditorProps) {
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  const [tool, setTool] = useState<OcclusionShapeType>('rectangle');
  const [selectedOcclusionId, setSelectedOcclusionId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelText, setLabelText] = useState('');
  const [loadingLabelIds, setLoadingLabelIds] = useState<Set<string>>(new Set());
  const [failedLabelIds, setFailedLabelIds] = useState<Set<string>>(new Set()); // Track failed AI extractions
  const [drawingEnabled, setDrawingEnabled] = useState(true); // Controls whether drawing is active

  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOcclusionStart, setDragOcclusionStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [currentDraw, setCurrentDraw] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Track natural image dimensions and container dimensions for proper scaling
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [imageBounds, setImageBounds] = useState<ImageBounds>({ offsetX: 0, offsetY: 0, renderedWidth: 0, renderedHeight: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);

  // Load image dimensions when URI changes
  useEffect(() => {
    if (Platform.OS === 'web' && imageUri) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = imageUri;
    }
  }, [imageUri]);

  // Update image bounds when container or image dimensions change
  useEffect(() => {
    if (containerDimensions.width && containerDimensions.height && imageDimensions.width && imageDimensions.height) {
      const bounds = calculateImageBounds(
        containerDimensions.width,
        containerDimensions.height,
        imageDimensions.width,
        imageDimensions.height
      );
      setImageBounds(bounds);
    }
  }, [containerDimensions, imageDimensions]);

  // Get mouse position relative to the actual rendered image (as percentage of image)
  const getMousePosition = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();

    // Get position relative to container
    const containerX = e.clientX - rect.left;
    const containerY = e.clientY - rect.top;

    // Convert to position relative to the actual rendered image
    const imageX = containerX - imageBounds.offsetX;
    const imageY = containerY - imageBounds.offsetY;

    // Convert to percentage of image dimensions
    const x = imageBounds.renderedWidth > 0 ? (imageX / imageBounds.renderedWidth) * 100 : 0;
    const y = imageBounds.renderedHeight > 0 ? (imageY / imageBounds.renderedHeight) * 100 : 0;

    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  }, [imageBounds]);

  // Check if point is on an existing occlusion
  const findOcclusionAtPoint = useCallback((percentX: number, percentY: number): OcclusionShape | null => {
    for (let i = occlusions.length - 1; i >= 0; i--) {
      const occ = occlusions[i];
      const inX = percentX >= occ.x && percentX <= occ.x + occ.width;
      const inY = percentY >= occ.y && percentY <= occ.y + occ.height;
      if (inX && inY) {
        return occ;
      }
    }
    return null;
  }, [occlusions]);

  // Check if point is on a resize handle
  const getHandleAtPoint = useCallback((percentX: number, percentY: number, occ: OcclusionShape): DragMode => {
    const handleThreshold = 3; // percentage

    const nearLeft = Math.abs(percentX - occ.x) < handleThreshold;
    const nearRight = Math.abs(percentX - (occ.x + occ.width)) < handleThreshold;
    const nearTop = Math.abs(percentY - occ.y) < handleThreshold;
    const nearBottom = Math.abs(percentY - (occ.y + occ.height)) < handleThreshold;

    if (nearLeft && nearTop) return 'resize-nw';
    if (nearRight && nearTop) return 'resize-ne';
    if (nearLeft && nearBottom) return 'resize-sw';
    if (nearRight && nearBottom) return 'resize-se';

    return 'none';
  }, []);

  // Mouse down handler
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getMousePosition(e);

    // Check if we're clicking on the selected occlusion's handles first
    if (selectedOcclusionId) {
      const selectedOcc = occlusions.find(o => o.id === selectedOcclusionId);
      if (selectedOcc) {
        const handle = getHandleAtPoint(pos.x, pos.y, selectedOcc);
        if (handle !== 'none') {
          setDragMode(handle);
          setDragStart(pos);
          setDragOcclusionStart({ x: selectedOcc.x, y: selectedOcc.y, width: selectedOcc.width, height: selectedOcc.height });
          return;
        }

        // Check if clicking inside the selected occlusion to move it
        const inX = pos.x >= selectedOcc.x && pos.x <= selectedOcc.x + selectedOcc.width;
        const inY = pos.y >= selectedOcc.y && pos.y <= selectedOcc.y + selectedOcc.height;
        if (inX && inY) {
          setDragMode('move');
          setDragStart(pos);
          setDragOcclusionStart({ x: selectedOcc.x, y: selectedOcc.y, width: selectedOcc.width, height: selectedOcc.height });
          return;
        }
      }
    }

    // Check if clicking on any existing occlusion
    const existingOcclusion = findOcclusionAtPoint(pos.x, pos.y);
    if (existingOcclusion) {
      setSelectedOcclusionId(existingOcclusion.id);
      setDragMode('move');
      setDragStart(pos);
      setDragOcclusionStart({ x: existingOcclusion.x, y: existingOcclusion.y, width: existingOcclusion.width, height: existingOcclusion.height });
      return;
    }

    // Only allow drawing if enabled and under max
    if (!drawingEnabled || occlusions.length >= MAX_OCCLUSIONS) return;

    // Start drawing new occlusion
    setDragMode('draw');
    setDragStart(pos);
    setCurrentDraw({ x: pos.x, y: pos.y, width: 0, height: 0 });
    setSelectedOcclusionId(null);
  }, [occlusions, selectedOcclusionId, drawingEnabled, getMousePosition, findOcclusionAtPoint, getHandleAtPoint]);

  // Mouse move handler
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragMode === 'none') return;

    const pos = getMousePosition(e);
    const deltaX = pos.x - dragStart.x;
    const deltaY = pos.y - dragStart.y;

    if (dragMode === 'draw') {
      const minX = Math.min(dragStart.x, pos.x);
      const minY = Math.min(dragStart.y, pos.y);
      const maxX = Math.max(dragStart.x, pos.x);
      const maxY = Math.max(dragStart.y, pos.y);

      setCurrentDraw({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      });
    } else if (dragMode === 'move' && selectedOcclusionId) {
      const newX = Math.max(0, Math.min(100 - dragOcclusionStart.width, dragOcclusionStart.x + deltaX));
      const newY = Math.max(0, Math.min(100 - dragOcclusionStart.height, dragOcclusionStart.y + deltaY));

      const newOcclusions = occlusions.map(o =>
        o.id === selectedOcclusionId ? { ...o, x: newX, y: newY } : o
      );
      onOcclusionsChange(newOcclusions);
    } else if (dragMode.startsWith('resize-') && selectedOcclusionId) {
      let newX = dragOcclusionStart.x;
      let newY = dragOcclusionStart.y;
      let newWidth = dragOcclusionStart.width;
      let newHeight = dragOcclusionStart.height;

      if (dragMode === 'resize-nw') {
        newX = Math.min(dragOcclusionStart.x + dragOcclusionStart.width - 5, dragOcclusionStart.x + deltaX);
        newY = Math.min(dragOcclusionStart.y + dragOcclusionStart.height - 5, dragOcclusionStart.y + deltaY);
        newWidth = dragOcclusionStart.width - (newX - dragOcclusionStart.x);
        newHeight = dragOcclusionStart.height - (newY - dragOcclusionStart.y);
      } else if (dragMode === 'resize-ne') {
        newY = Math.min(dragOcclusionStart.y + dragOcclusionStart.height - 5, dragOcclusionStart.y + deltaY);
        newWidth = Math.max(5, dragOcclusionStart.width + deltaX);
        newHeight = dragOcclusionStart.height - (newY - dragOcclusionStart.y);
      } else if (dragMode === 'resize-sw') {
        newX = Math.min(dragOcclusionStart.x + dragOcclusionStart.width - 5, dragOcclusionStart.x + deltaX);
        newWidth = dragOcclusionStart.width - (newX - dragOcclusionStart.x);
        newHeight = Math.max(5, dragOcclusionStart.height + deltaY);
      } else if (dragMode === 'resize-se') {
        newWidth = Math.max(5, dragOcclusionStart.width + deltaX);
        newHeight = Math.max(5, dragOcclusionStart.height + deltaY);
      }

      // Clamp to canvas bounds
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      if (newX + newWidth > 100) newWidth = 100 - newX;
      if (newY + newHeight > 100) newHeight = 100 - newY;

      const newOcclusions = occlusions.map(o =>
        o.id === selectedOcclusionId ? { ...o, x: newX, y: newY, width: newWidth, height: newHeight } : o
      );
      onOcclusionsChange(newOcclusions);
    }
  }, [dragMode, dragStart, dragOcclusionStart, selectedOcclusionId, occlusions, getMousePosition, onOcclusionsChange]);

  // AI label extraction for an occlusion (called manually via "Try AI" button)
  const extractLabelForOcclusion = useCallback(async (occlusion: OcclusionShape) => {
    if (!imageBase64) {
      return;
    }

    // Add to loading set
    setLoadingLabelIds(prev => new Set(prev).add(occlusion.id));
    // Close editor while loading
    setEditingLabel(null);

    try {
      const imageDataUri = imageBase64.startsWith('data:')
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      const response = await extractOcclusionLabel({
        imageBase64: imageDataUri,
        occlusionRegion: {
          x: occlusion.x,
          y: occlusion.y,
          width: occlusion.width,
          height: occlusion.height,
        },
      });

      // Check for success with a non-empty label
      const label = response.success && response.data?.label ? response.data.label.trim() : '';

      if (label && label !== 'Sample Label') {
        // AI succeeded with a real label
        onOcclusionsChange(
          occlusions.map(o =>
            o.id === occlusion.id
              ? { ...o, label: label, labelSource: 'ai' as const }
              : o
          )
        );
        // Clear from failed set if it was there
        setFailedLabelIds(prev => {
          const next = new Set(prev);
          next.delete(occlusion.id);
          return next;
        });
      } else {
        // AI returned no label - mark as failed and re-open manual editor
        console.log('AI label extraction returned no result');
        setFailedLabelIds(prev => new Set(prev).add(occlusion.id));
        setLabelText('');
        setEditingLabel(occlusion.id);
      }
    } catch (error) {
      console.error('Failed to extract occlusion label:', error);
      // Mark as failed and re-open the label editor
      setFailedLabelIds(prev => new Set(prev).add(occlusion.id));
      setLabelText('');
      setEditingLabel(occlusion.id);
    } finally {
      // Remove from loading set
      setLoadingLabelIds(prev => {
        const next = new Set(prev);
        next.delete(occlusion.id);
        return next;
      });
    }
  }, [imageBase64, occlusions, onOcclusionsChange]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    if (dragMode === 'draw' && currentDraw && currentDraw.width >= 2 && currentDraw.height >= 2) {
      const newOcclusion: OcclusionShape = {
        id: `occ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: tool,
        x: currentDraw.x,
        y: currentDraw.y,
        width: currentDraw.width,
        height: currentDraw.height,
        label: '',
        color: OCCLUSION_COLOR,
      };

      const updatedOcclusions = [...occlusions, newOcclusion];
      onOcclusionsChange(updatedOcclusions);
      setSelectedOcclusionId(newOcclusion.id);

      // Disable drawing after creating an occlusion (user must click "Add New" to draw again)
      setDrawingEnabled(false);

      // Immediately open label editor for the new occlusion
      // User can type manually or click "Try AI" to attempt auto-detection
      setLabelText('');
      setEditingLabel(newOcclusion.id);

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setDragMode('none');
    setCurrentDraw(null);
  }, [dragMode, currentDraw, tool, occlusions, onOcclusionsChange]);

  // Delete occlusion
  const handleDeleteOcclusion = (id: string) => {
    const newOcclusions = occlusions.filter(o => o.id !== id);
    onOcclusionsChange(newOcclusions);
    if (selectedOcclusionId === id) {
      setSelectedOcclusionId(null);
    }
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Start editing label
  const handleEditLabel = (id: string) => {
    const occlusion = occlusions.find(o => o.id === id);
    if (occlusion) {
      setLabelText(occlusion.label);
      setEditingLabel(id);
    }
  };

  // Save label (marks as manually edited)
  const handleSaveLabel = () => {
    if (!editingLabel) return;

    const newOcclusions = occlusions.map(o =>
      o.id === editingLabel ? { ...o, label: labelText, labelSource: 'manual' as const } : o
    );
    onOcclusionsChange(newOcclusions);

    // Clear from failed set
    setFailedLabelIds(prev => {
      const next = new Set(prev);
      next.delete(editingLabel);
      return next;
    });

    setEditingLabel(null);
    setLabelText('');

    if (Platform.OS !== 'web') Haptics.selectionAsync();
  };

  // Clear all occlusions
  const handleClearAll = () => {
    onOcclusionsChange([]);
    setSelectedOcclusionId(null);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  // Get cursor based on position
  const getCursor = useCallback((e: React.MouseEvent): string => {
    if (dragMode === 'draw') return 'crosshair';
    if (dragMode === 'move') return 'move';
    if (dragMode.startsWith('resize-')) {
      if (dragMode === 'resize-nw' || dragMode === 'resize-se') return 'nwse-resize';
      return 'nesw-resize';
    }

    const pos = getMousePosition(e);

    if (selectedOcclusionId) {
      const selectedOcc = occlusions.find(o => o.id === selectedOcclusionId);
      if (selectedOcc) {
        const handle = getHandleAtPoint(pos.x, pos.y, selectedOcc);
        if (handle === 'resize-nw' || handle === 'resize-se') return 'nwse-resize';
        if (handle === 'resize-ne' || handle === 'resize-sw') return 'nesw-resize';

        const inX = pos.x >= selectedOcc.x && pos.x <= selectedOcc.x + selectedOcc.width;
        const inY = pos.y >= selectedOcc.y && pos.y <= selectedOcc.y + selectedOcc.height;
        if (inX && inY) return 'move';
      }
    }

    const occ = findOcclusionAtPoint(pos.x, pos.y);
    if (occ) return 'move';

    // Show crosshair only if drawing is enabled
    return drawingEnabled ? 'crosshair' : 'default';
  }, [dragMode, selectedOcclusionId, occlusions, drawingEnabled, getMousePosition, getHandleAtPoint, findOcclusionAtPoint]);

  // Render resize handles for selected occlusion (using pixel positions)
  const renderResizeHandles = (occ: OcclusionShape) => {
    // Calculate pixel positions from percentages
    const left = imageBounds.offsetX + (occ.x / 100) * imageBounds.renderedWidth;
    const top = imageBounds.offsetY + (occ.y / 100) * imageBounds.renderedHeight;
    const right = imageBounds.offsetX + ((occ.x + occ.width) / 100) * imageBounds.renderedWidth;
    const bottom = imageBounds.offsetY + ((occ.y + occ.height) / 100) * imageBounds.renderedHeight;

    const handles = [
      { id: 'nw', left: left, top: top },
      { id: 'ne', left: right, top: top },
      { id: 'sw', left: left, top: bottom },
      { id: 'se', left: right, top: bottom },
    ];

    return handles.map(h => (
      <div
        key={h.id}
        style={{
          position: 'absolute',
          left: h.left,
          top: h.top,
          transform: 'translate(-50%, -50%)',
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          backgroundColor: '#FFFFFF',
          border: `2px solid ${OCCLUSION_COLOR}`,
          borderRadius: 2,
          pointerEvents: 'none',
        }}
      />
    ));
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="desktop-outline" size={48} color={textSecondary} />
        <Text style={[styles.webOnlyText, { color: textSecondary }]}>
          Image occlusion editor is currently available on desktop only.
        </Text>
      </View>
    );
  }

  const selectedOcclusion = occlusions.find(o => o.id === selectedOcclusionId);

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: surface, borderColor: border }]}>
        <View style={styles.toolGroup}>
          <TouchableOpacity
            style={[
              styles.toolButton,
              { backgroundColor: tool === 'rectangle' ? accent.orange + '30' : surfaceHover },
            ]}
            onPress={() => setTool('rectangle')}
          >
            <Ionicons
              name="square-outline"
              size={20}
              color={tool === 'rectangle' ? accent.orange : textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toolButton,
              { backgroundColor: tool === 'ellipse' ? accent.orange + '30' : surfaceHover },
            ]}
            onPress={() => setTool('ellipse')}
          >
            <Ionicons
              name="ellipse-outline"
              size={20}
              color={tool === 'ellipse' ? accent.orange : textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.toolDivider} />

        {/* Add New Occlusion button - shown when drawing is disabled */}
        {occlusions.length > 0 && !drawingEnabled && occlusions.length < MAX_OCCLUSIONS && (
          <TouchableOpacity
            style={[styles.addOcclusionButton, { backgroundColor: accent.orange }]}
            onPress={() => {
              setDrawingEnabled(true);
              setSelectedOcclusionId(null);
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addOcclusionText}>Add Occlusion</Text>
          </TouchableOpacity>
        )}

        {/* Drawing mode indicator */}
        {drawingEnabled && occlusions.length < MAX_OCCLUSIONS && (
          <View style={[styles.drawingModeIndicator, { backgroundColor: accent.green + '20' }]}>
            <View style={[styles.drawingDot, { backgroundColor: accent.green }]} />
            <Text style={[styles.drawingModeText, { color: accent.green }]}>Drawing</Text>
          </View>
        )}

        <Text style={[styles.toolbarInfo, { color: textSecondary }]}>
          {occlusions.length}/{MAX_OCCLUSIONS}
        </Text>

        <View style={{ flex: 1 }} />

        {/* Clear all */}
        <TouchableOpacity
          style={[styles.toolButton, { backgroundColor: surfaceHover }]}
          onPress={() => {
            handleClearAll();
            setDrawingEnabled(true); // Re-enable drawing after clearing
          }}
          disabled={occlusions.length === 0}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={occlusions.length > 0 ? accent.red : textSecondary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        {/* Image canvas */}
        <View style={[styles.canvasContainer, { backgroundColor: surface, borderColor: border }]}>
          <div
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              userSelect: 'none',
            }}
            onMouseDown={handleMouseDown as any}
            onMouseMove={(e) => {
              handleMouseMove(e as any);
              // Update cursor
              const target = e.currentTarget as HTMLDivElement;
              target.style.cursor = getCursor(e as any);

              // Track container dimensions on first interaction
              if (!containerDimensions.width || !containerDimensions.height) {
                const rect = e.currentTarget.getBoundingClientRect();
                setContainerDimensions({ width: rect.width, height: rect.height });
              }
            }}
            onMouseUp={handleMouseUp as any}
            onMouseLeave={handleMouseUp as any}
          >
            <img
              src={imageUri}
              alt="Occlusion target"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
              }}
              onLoad={(e) => {
                // Track container dimensions when image loads
                if (canvasRef.current) {
                  const rect = canvasRef.current.getBoundingClientRect();
                  setContainerDimensions({ width: rect.width, height: rect.height });
                }
              }}
            />

            {/* Render existing occlusions - position relative to actual image bounds */}
            {occlusions.map(occ => {
              const isSelected = occ.id === selectedOcclusionId;
              // Calculate pixel position from percentage, relative to actual image bounds
              const left = imageBounds.offsetX + (occ.x / 100) * imageBounds.renderedWidth;
              const top = imageBounds.offsetY + (occ.y / 100) * imageBounds.renderedHeight;
              const width = (occ.width / 100) * imageBounds.renderedWidth;
              const height = (occ.height / 100) * imageBounds.renderedHeight;

              return (
                <div key={occ.id}>
                  <div
                    style={{
                      position: 'absolute',
                      left: left,
                      top: top,
                      width: width,
                      height: height,
                      backgroundColor: OCCLUSION_COLOR,
                      borderRadius: occ.type === 'ellipse' ? '50%' : 4,
                      border: isSelected ? '2px solid white' : 'none',
                      boxSizing: 'border-box',
                      pointerEvents: 'none',
                      opacity: 0.85,
                    }}
                  />
                  {isSelected && renderResizeHandles(occ)}
                </div>
              );
            })}

            {/* Render current drawing - position relative to actual image bounds */}
            {currentDraw && currentDraw.width > 0 && currentDraw.height > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: imageBounds.offsetX + (currentDraw.x / 100) * imageBounds.renderedWidth,
                  top: imageBounds.offsetY + (currentDraw.y / 100) * imageBounds.renderedHeight,
                  width: (currentDraw.width / 100) * imageBounds.renderedWidth,
                  height: (currentDraw.height / 100) * imageBounds.renderedHeight,
                  backgroundColor: `${OCCLUSION_COLOR}60`,
                  borderRadius: tool === 'ellipse' ? '50%' : 4,
                  border: `2px dashed ${OCCLUSION_COLOR}`,
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        </View>

        {/* Occlusion list panel */}
        <View style={[styles.listPanel, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.listHeader}>
            <Text style={[styles.listTitle, { color: textPrimary }]}>Occlusions</Text>
          </View>

          <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
            {occlusions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="shapes-outline" size={32} color={textSecondary} />
                <Text style={[styles.emptyText, { color: textSecondary }]}>
                  Click and drag on the image to draw occlusions
                </Text>
              </View>
            ) : (
              occlusions.map((occ, index) => {
                const isLoading = loadingLabelIds.has(occ.id);

                return (
                  <View
                    key={occ.id}
                    style={[
                      styles.listItem,
                      {
                        backgroundColor: selectedOcclusionId === occ.id ? accent.orange + '20' : 'transparent',
                        borderColor: selectedOcclusionId === occ.id ? accent.orange : border,
                      },
                    ]}
                  >
                    {editingLabel === occ.id ? (
                      <View style={styles.editLabelContainer}>
                        {failedLabelIds.has(occ.id) && (
                          <View style={[styles.aiFailedBanner, { backgroundColor: accent.orange + '15' }]}>
                            <Ionicons name="information-circle-outline" size={14} color={accent.orange} />
                            <Text style={[styles.aiFailedText, { color: accent.orange }]}>
                              AI couldn't detect the label. Please enter it manually.
                            </Text>
                          </View>
                        )}
                        <TextInput
                          style={[styles.labelInput, { backgroundColor: background, color: textPrimary, borderColor: border }]}
                          value={labelText}
                          onChangeText={setLabelText}
                          placeholder="Enter label (e.g., Mitochondria, Paris, H2O)..."
                          placeholderTextColor={textSecondary}
                          autoFocus
                          onSubmitEditing={handleSaveLabel}
                        />
                        <View style={styles.editLabelButtons}>
                          {imageBase64 && (
                            <TouchableOpacity
                              style={[styles.smallButton, { backgroundColor: accent.purple + '20' }]}
                              onPress={() => {
                                extractLabelForOcclusion(occ);
                              }}
                            >
                              <Ionicons name="sparkles" size={12} color={accent.purple} />
                              <Text style={[styles.smallButtonText, { color: accent.purple, marginLeft: 4 }]}>
                                {failedLabelIds.has(occ.id) ? 'Retry AI' : 'Try AI'}
                              </Text>
                            </TouchableOpacity>
                          )}
                          <View style={{ flex: 1 }} />
                          <TouchableOpacity
                            style={[styles.smallButton, { backgroundColor: surfaceHover }]}
                            onPress={() => {
                              setEditingLabel(null);
                              // Clear from failed set when canceling
                              setFailedLabelIds(prev => {
                                const next = new Set(prev);
                                next.delete(occ.id);
                                return next;
                              });
                            }}
                          >
                            <Text style={[styles.smallButtonText, { color: textSecondary }]}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.smallButton, { backgroundColor: accent.orange }]}
                            onPress={handleSaveLabel}
                          >
                            <Text style={[styles.smallButtonText, { color: '#FFFFFF' }]}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.listItemMain}
                          onPress={() => setSelectedOcclusionId(occ.id)}
                        >
                          <View style={[styles.occlusionPreview, { backgroundColor: OCCLUSION_COLOR }]}>
                            {isLoading ? (
                              <Ionicons name="sync" size={16} color="#FFFFFF" />
                            ) : (
                              <Text style={styles.occlusionNumber}>{index + 1}</Text>
                            )}
                          </View>
                          <View style={styles.listItemInfo}>
                            <View style={styles.listItemTitleRow}>
                              <Text style={[styles.listItemTitle, { color: textPrimary }]}>
                                {isLoading ? 'Extracting label...' : (occ.label || `Occlusion ${index + 1}`)}
                              </Text>
                              {occ.labelSource === 'ai' && occ.label && (
                                <View style={[styles.aiLabelBadge, { backgroundColor: accent.purple + '20' }]}>
                                  <Ionicons name="sparkles" size={10} color={accent.purple} />
                                  <Text style={[styles.aiLabelText, { color: accent.purple }]}>AI</Text>
                                </View>
                              )}
                            </View>
                            <Text style={[styles.listItemMeta, { color: textSecondary }]}>
                              {occ.type === 'rectangle' ? 'Rectangle' : 'Ellipse'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        <View style={styles.listItemActions}>
                          <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: surfaceHover }]}
                            onPress={() => handleEditLabel(occ.id)}
                            disabled={isLoading}
                          >
                            <Ionicons name="pencil-outline" size={16} color={isLoading ? textSecondary : accent.orange} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: surfaceHover }]}
                            onPress={() => handleDeleteOcclusion(occ.id)}
                          >
                            <Ionicons name="trash-outline" size={16} color={accent.red} />
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Selected occlusion info */}
          {selectedOcclusion && (
            <View style={[styles.selectedInfo, { borderTopColor: border }]}>
              <Text style={[styles.selectedInfoText, { color: textSecondary }]}>
                Selected: Drag to move, corners to resize
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={[styles.instructionText, { color: textSecondary }]}>
          Draw: Click and drag • Move: Drag occlusion • Resize: Drag corners • Select: Click occlusion
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing[3],
  },
  toolGroup: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  toolButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#3A3A3A',
    marginHorizontal: spacing[3],
  },
  toolbarInfo: {
    fontSize: typography.sizes.sm,
    marginLeft: spacing[2],
  },
  addOcclusionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  addOcclusionText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  drawingModeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  drawingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  drawingModeText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing[4],
  },
  canvasContainer: {
    flex: 2,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 400,
  },
  listPanel: {
    flex: 1,
    minWidth: 250,
    maxWidth: 300,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listHeader: {
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3A',
  },
  listTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  listScroll: {
    flex: 1,
    padding: spacing[2],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[4],
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginTop: spacing[3],
    lineHeight: 20,
  },
  listItem: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing[2],
    overflow: 'hidden',
  },
  listItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    gap: spacing[3],
  },
  occlusionPreview: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  occlusionNumber: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },
  listItemInfo: {
    flex: 1,
  },
  listItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  listItemTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    flex: 1,
  },
  aiLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing[1],
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  aiLabelText: {
    fontSize: 9,
    fontWeight: '600',
  },
  listItemMeta: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  listItemActions: {
    flexDirection: 'row',
    gap: spacing[1],
    paddingRight: spacing[2],
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editLabelContainer: {
    padding: spacing[3],
  },
  aiFailedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[2],
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
  },
  aiFailedText: {
    fontSize: typography.sizes.xs,
    flex: 1,
  },
  labelInput: {
    borderRadius: borderRadius.md,
    padding: spacing[2],
    fontSize: typography.sizes.sm,
    borderWidth: 1,
    marginBottom: spacing[2],
  },
  editLabelButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  smallButtonText: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
  },
  selectedInfo: {
    padding: spacing[3],
    borderTopWidth: 1,
  },
  selectedInfoText: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  instructions: {
    marginTop: spacing[3],
    paddingHorizontal: spacing[2],
  },
  instructionText: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  webOnlyText: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginTop: spacing[4],
    paddingHorizontal: spacing[6],
  },
});

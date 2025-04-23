import { useRoute } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text, Dimensions, Alert } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { Canvas, Path, useCanvasRef } from '@shopify/react-native-skia';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Rect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const EditScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { croppedUri: imageUri } = route.params as { croppedUri: string };
  const [rectangles, setRectangles] = useState<Rect[]>([]);
  const [imageSize, setImageSize] = useState<any>({ width: 0, height: 0 });
  const [drawMode, setDrawMode] = useState(false);
  const [currentRect, setCurrentRect] = useState<Rect | null>(null);
  const [selectedRectIndex, setSelectedRectIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const imageRef = useRef(null);
  const canvasRef = useCanvasRef();

  // Get actual image dimensions for proper coordinate calculation
  useEffect(() => {
    if (imageUri) {
      Image.getSize(
        imageUri,
        (width, height) => {
          // Calculate aspect ratio to fit screen
          const scaleFactor = SCREEN_WIDTH / width;
          setImageSize({
            width: SCREEN_WIDTH,
            height: height * scaleFactor,
            originalWidth: width,
            originalHeight: height,
            scaleFactor,
          });
        },
        (error) => console.error('Failed to get image size:', error)
      );
    }
  }, [imageUri]);

  const startDrawing = (x: number, y: number) => {
    if (!drawMode) return;

    const newRect: Rect = {
      id: Date.now().toString(),
      x: x,
      y: y,
      width: 0,
      height: 0,
    };

    setCurrentRect(newRect);
  };

  const updateDrawing = (x: number, y: number) => {
    if (!drawMode || !currentRect) return;

    setCurrentRect((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        width: x - prev.x,
        height: y - prev.y,
      };
    });
  };

  const finishDrawing = () => {
    if (!drawMode || !currentRect) return;

    // Normalize rectangle coordinates (handle negative width/height)
    const normalizedRect: Rect = {
      ...currentRect,
      x: currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x,
      y: currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y,
      width: Math.abs(currentRect.width),
      height: Math.abs(currentRect.height),
    };

    // Only add if rectangle has meaningful size
    if (normalizedRect.width > 10 && normalizedRect.height > 10) {
      setRectangles((prev) => [...prev, normalizedRect]);
    }

    setCurrentRect(null);
  };

  const finishMoving = () => {
    setSelectedRectIndex(null);
  };

  // Check if a point is inside a rectangle
  const isPointInRect = (x: number, y: number, rect: Rect): boolean => {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  };

  // Find which rectangle was clicked
  const findSelectedRect = (x: number, y: number): number | null => {
    for (let i = rectangles.length - 1; i >= 0; i--) {
      if (isPointInRect(x, y, rectangles[i])) {
        return i;
      }
    }
    return null;
  };

  const startMoving = (x: number, y: number) => {
    const index = findSelectedRect(x, y);
    if (index !== null) {
      setSelectedRectIndex(index);
      setDragOffset({
        x: x - rectangles[index].x,
        y: y - rectangles[index].y,
      });
    }
  };

  const updateMoving = (x: number, y: number) => {
    if (selectedRectIndex === null) return;

    setRectangles((prev) => {
      const newRects = [...prev];
      newRects[selectedRectIndex] = {
        ...newRects[selectedRectIndex],
        x: x - dragOffset.x,
        y: y - dragOffset.y,
      };
      return newRects;
    });
  };

  // Replace useAnimatedGestureHandler with Gesture.Pan()
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      if (drawMode) {
        runOnJS(startDrawing)(event.x, event.y);
        runOnJS(startMoving)(event.x, event.y);
      }
    })
    .onUpdate((event) => {
      if (drawMode) {
        runOnJS(updateDrawing)(event.x, event.y);
        runOnJS(updateMoving)(event.x, event.y);
      }
    })
    .onEnd(() => {
      if (drawMode) {
        runOnJS(finishDrawing)();
        runOnJS(finishMoving)();
      }
    });

  const toggleDrawMode = () => {
    setDrawMode(!drawMode);
  };

  const handleUndo = () => {
    if (rectangles.length > 0) {
      setRectangles((prev) => prev.slice(0, -1));
    }
  };

  const handleSaveImage = async () => {
    // If no rectangles, return to camera
    if (rectangles.length === 0) {
      navigation.navigate('menu/index');
      return;
    }

    /// TODO: Code to save the image with the squares
  };

  // Render all rectangles including the current one being drawn
  const renderRectangles = () => {
    const allRects = [...rectangles];
    if (currentRect) {
      // Add current rectangle being drawn
      const normalizedRect: Rect = {
        ...currentRect,
        x: currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x,
        y: currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y,
        width: Math.abs(currentRect.width),
        height: Math.abs(currentRect.height),
      };
      allRects.push(normalizedRect);
    }

    return allRects.map((rect, index) => (
      <View
        key={rect.id || index}
        style={[
          styles.rectangle,
          {
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            borderColor: '#ffffff',
            borderWidth: selectedRectIndex === index ? 2 : 1,
          },
        ]}
      />
    ));
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{drawMode ? 'EDIT MAIL' : 'Photo Editor'}</Text>
      </View>

      <View style={styles.imageContainer}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={styles.gestureContainer}>
            <Image
              ref={imageRef}
              source={{ uri: imageUri }}
              style={[styles.image, { width: imageSize.width, height: imageSize.height }]}
              resizeMode='contain'
            />

            {/* Draw rectangles overlay */}
            {renderRectangles()}
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity style={[styles.button, drawMode ? styles.activeButton : null]} onPress={toggleDrawMode}>
          <Text style={styles.buttonText}>{drawMode ? 'Back' : 'Hide PII'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, rectangles.length === 0 ? styles.disabledButton : null]}
          onPress={handleUndo}
          disabled={rectangles.length === 0}
        >
          <Text style={styles.buttonText}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleSaveImage}>
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          {drawMode
            ? 'Tap and drag to draw black rectangle to hide information'
            : "Select 'Draw' to begin"}
        </Text>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 10,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
  },
  gestureContainer: {
    position: 'relative',
  },
  image: {
    flex: 1,
    resizeMode: 'contain',
  },
  rectangle: {
    position: 'absolute',
    backgroundColor: 'black',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#1a1a1a',
  },
  button: {
    backgroundColor: '#444',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  activeButton: {
    backgroundColor: '#007bff',
  },
  disabledButton: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  instructions: {
    padding: 16,
    backgroundColor: '#1a1a1a',
  },
  instructionText: {
    color: '#ccc',
    textAlign: 'center',
  },
  rectangleCount: {
    color: '#ccc',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default EditScreen;

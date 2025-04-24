import { useRoute } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text, Dimensions, Alert } from 'react-native';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import * as MediaLibrary from 'expo-media-library';

import { captureRef } from 'react-native-view-shot';

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
  const [isMovingRect, setIsMovingRect] = useState(false);

  const imageRef = useRef(null);
  const viewShotRef = useRef<any>(null);

  // Getting image dimensions
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

  // Request permissions for saving images
  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant media library permissions to save images');
      }
    })();
  }, []);

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

  const startInteraction = (x: number, y: number) => {
    if (!drawMode) return;

    // First check if we're clicking on an existing rectangle
    const index = findSelectedRect(x, y);

    if (index !== null) {
      // We're clicking on an existing rectangle, start moving it
      setSelectedRectIndex(index);
      setIsMovingRect(true);
      setDragOffset({
        x: x - rectangles[index].x,
        y: y - rectangles[index].y,
      });
    } else {
      // We're not clicking on a rectangle, start drawing a new one
      const newRect: Rect = {
        id: Date.now().toString(),
        x: x,
        y: y,
        width: 0,
        height: 0,
      };
      setCurrentRect(newRect);
      setIsMovingRect(false);
    }
  };

  const updateInteraction = (x: number, y: number) => {
    if (!drawMode) return;

    if (isMovingRect && selectedRectIndex !== null) {
      // Update the position of the selected rectangle
      setRectangles((prev) => {
        const newRects = [...prev];
        newRects[selectedRectIndex] = {
          ...newRects[selectedRectIndex],
          x: x - dragOffset.x,
          y: y - dragOffset.y,
        };
        return newRects;
      });
    } else if (currentRect) {
      // Update the size of the rectangle being drawn
      setCurrentRect((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          width: x - prev.x,
          height: y - prev.y,
        };
      });
    }
  };

  const finishInteraction = () => {
    if (!drawMode) return;

    if (isMovingRect) {
      // Finish moving the rectangle
      setIsMovingRect(false);
      setSelectedRectIndex(null);
    } else if (currentRect) {
      // Finish drawing the new rectangle
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
    }
  };

  // Gesture
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart((event) => {
          if (drawMode) {
            runOnJS(startInteraction)(event.x, event.y);
          }
        })
        .onUpdate((event) => {
          if (drawMode) {
            runOnJS(updateInteraction)(event.x, event.y);
          }
        })
        .onEnd(() => {
          if (drawMode) {
            runOnJS(finishInteraction)();
          }
        }),
    [drawMode, startInteraction, updateInteraction, finishInteraction]
  );

  const toggleDrawMode = () => {
    setDrawMode(!drawMode);
    setCurrentRect(null);
    setSelectedRectIndex(null);
    setIsMovingRect(false);
  };

  const handleUndo = () => {
    if (rectangles.length > 0) {
      setRectangles((prev) => prev.slice(0, -1));
    }
  };

  const handleSaveImage = async () => {
    // TODO: Remove this if is required???
    if (rectangles.length === 0) {
      return;
    }

    try {
      const localUri = await captureRef(imageRef, {
        height: imageSize.height,
        quality: 1,
      });

      const results = await MediaLibrary.createAssetAsync(localUri);

      console.log(results);

      /**
       * !NOTE:
       * - How we will be sending the data to backend..???
       * - Do we need another type of file response
       */
      if (localUri) {
        Alert.alert('Success', 'Image saved to your gallery', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('menu/index'),
          },
        ]);
      }
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', 'Something failed trying to save the image...');
    }
  };

  /**
   * Render all rectangles including the current one being drawn
   * TODO:
   * - Avoid allowing users to draw outside the image.
   * - Enable capacity to resize rectangle created?
   */
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
          <Animated.View ref={imageRef} collapsable={false} style={styles.gestureContainer}>
            <Image
              ref={imageRef}
              source={{ uri: imageUri }}
              style={[styles.image, { width: imageSize.width, height: imageSize.height }]}
              resizeMode='contain'
            />

            {/* Drawing rectangles overlay */}
            {renderRectangles()}
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity style={[styles.button, drawMode ? styles.activeButton : null]} onPress={toggleDrawMode}>
          <Text style={styles.buttonText}>{drawMode ? 'Done' : 'Hide PII'}</Text>
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
            ? 'Tap and drag to draw black rectangle or tap on existing rectangle to move it'
            : "Select 'Hide PII' to begin"}
        </Text>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'space-between'
  },
  header: {
    padding: 15,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gestureContainer: {
    position: 'relative',
  },
  image: {
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

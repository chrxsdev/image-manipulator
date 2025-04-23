import { useState, useRef, useMemo } from 'react';
import { View, Image, Button, StyleSheet, Dimensions, Text, Platform, ViewStyle } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SaveFormat } from 'expo-image-manipulator';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import { Gesture, GestureDetector, GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { styles } from '../menu';

type CropState = {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  uri: string | null;
};

const CropEditorScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [history, setHistory] = useState<CropState[]>([]);
  const [redoStack, setRedoStack] = useState<CropState[]>([]);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const cropX = useSharedValue(50);
  const cropY = useSharedValue(100);
  const cropWidth = useSharedValue(200);
  const cropHeight = useSharedValue(200);

  const scale = useSharedValue(1)
  const startScale = useSharedValue(0)

  // Define all gesture handlers at the top level using the new Gesture API
  const topLeftGesture = useMemo(() => {
    return Gesture.Pan()
      .onStart((event) => {
        const startX = cropX.value;
        const startY = cropY.value;
        const startW = cropWidth.value;
        const startH = cropHeight.value;
        return { startX, startY, startW, startH };
      })
      .onUpdate((event, ctx) => {
        cropX.value = withSpring(ctx.startX + event.translationX);
        cropY.value = withSpring(ctx.startY + event.translationY);
        cropWidth.value = withSpring(ctx.startW - event.translationX);
        cropHeight.value = withSpring(ctx.startH - event.translationY);
      });
  }, []);

  const topRightGesture = useMemo(() => {
    return Gesture.Pan()
      .onStart((event) => {
        const startX = cropX.value;
        const startY = cropY.value;
        const startW = cropWidth.value;
        const startH = cropHeight.value;
        return { startX, startY, startW, startH };
      })
      .onUpdate((event, ctx) => {
        cropY.value = withSpring(ctx.startY + event.translationY);
        cropWidth.value = withSpring(ctx.startW + event.translationX);
        cropHeight.value = withSpring(ctx.startH - event.translationY);
      });
  }, []);

  const bottomLeftGesture = useMemo(() => {
    return Gesture.Pan()
      .onStart((event) => {
        const startX = cropX.value;
        const startY = cropY.value;
        const startW = cropWidth.value;
        const startH = cropHeight.value;
        return { startX, startY, startW, startH };
      })
      .onUpdate((event, ctx) => {
        cropX.value = withSpring(ctx.startX + event.translationX);
        cropWidth.value = withSpring(ctx.startW - event.translationX);
        cropHeight.value = withSpring(ctx.startH + event.translationY);
      });
  }, []);

  const bottomRightGesture = useMemo(() => {
    return Gesture.Pan()
      .onStart((event) => {
        const startX = cropX.value;
        const startY = cropY.value;
        const startW = cropWidth.value;
        const startH = cropHeight.value;
        return { startX, startY, startW, startH };
      })
      .onUpdate((event, ctx) => {
        cropWidth.value = withSpring(ctx.startW + event.translationX);
        cropHeight.value = withSpring(ctx.startH + event.translationY);
      });
  }, []);

  const moveRectGesture = useMemo(() => {
    return Gesture.Pan()
      .onStart((event) => {
        const startX = cropX.value;
        const startY = cropY.value;
        return { startX, startY };
      })
      .onUpdate((event, ctx) => {
        cropX.value = withSpring(ctx.startX + event.translationX);
        cropY.value = withSpring(ctx.startY + event.translationY);
      });
  }, []);

  const saveState = () => {
    setHistory((prev) => [
      ...prev,
      {
        cropX: cropX.value,
        cropY: cropY.value,
        cropWidth: cropWidth.value,
        cropHeight: cropHeight.value,
        uri: photoUri,
      },
    ]);
    setRedoStack([]);
  };

  const undo = () => {
    if (history.length > 0) {
      const last = history[history.length - 1];
      setRedoStack((prev) => [
        ...prev,
        {
          cropX: cropX.value,
          cropY: cropY.value,
          cropWidth: cropWidth.value,
          cropHeight: cropHeight.value,
          uri: photoUri,
        },
      ]);
      cropX.value = last.cropX;
      cropY.value = last.cropY;
      cropWidth.value = last.cropWidth;
      cropHeight.value = last.cropHeight;
      setPhotoUri(last.uri);
      setHistory((prev) => prev.slice(0, -1));
    }
  };

  const redo = () => {
    if (redoStack.length > 0) {
      const last = redoStack[redoStack.length - 1];
      saveState();
      cropX.value = last.cropX;
      cropY.value = last.cropY;
      cropWidth.value = last.cropWidth;
      cropHeight.value = last.cropHeight;
      setPhotoUri(last.uri);
      setRedoStack((prev) => prev.slice(0, -1));
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ base64: false });
      if (!photo) return;

      saveState();
      setPhotoUri(photo.uri);
      setImageSize({ width: photo.width, height: photo.height }); // <-- GUARDAR DIMENSIONES ORIGINALES
    }
  };

  const cropImage = async () => {
    if (!photoUri || !imageSize) return;

    saveState();

    // Obtiene dimensiones de la pantalla
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    // Escala de la imagen en pantalla
    const scaleX = imageSize.width / screenWidth;
    const scaleY = imageSize.height / screenHeight;

    const crop = {
      originX: cropX.value * scaleX,
      originY: cropY.value * scaleY,
      width: cropWidth.value * scaleX,
      height: cropHeight.value * scaleY,
    };

    const context = ImageManipulator.ImageManipulator.manipulate(photoUri);
    context.crop(crop);
    const img = await context.renderAsync();
    const result = await img.saveAsync({
      format: SaveFormat.JPEG,
    });

    setPhotoUri(result.uri);
  };

  const saveToGallery = async () => {
    if (photoUri) {
      await MediaLibrary.saveToLibraryAsync(photoUri);
      alert('Image saved');
    } else {
      alert('Not saved');
    }
  };

  const cropStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: cropX.value,
    top: cropY.value,
    width: cropWidth.value,
    height: cropHeight.value,
    borderWidth: 2,
    borderColor: 'white',
    borderStyle: 'dashed',
  }));

  const handleStyle = (x: number, y: number): ViewStyle => ({
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'black',
    left: x,
    top: y,
  });

  const isPermissionPending = !permission;
  const isPermissionDenied = permission && !permission.granted;

  return (
    <>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {isPermissionPending ? (
          <Text>Requesting camera permission...</Text>
        ) : isPermissionDenied ? (
          <View style={styles.container}>
            <Text>Necesitamos acceso a tu cámara</Text>
            <Button onPress={requestPermission} title='Allow permissions' />
          </View>
        ) : photoUri ? (
          <View style={{ flex: 1 }}>
            <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode='contain' />
            <Animated.View style={cropStyle} />

            <GestureDetector gesture={moveRectGesture}>
              <Animated.View style={[cropStyle, { zIndex: 10 }]} />
            </GestureDetector>

            <GestureDetector gesture={topLeftGesture}>
              <Animated.View style={[handleStyle(cropX.value - 10, cropY.value - 10)]} />
            </GestureDetector>

            <GestureDetector gesture={topRightGesture}>
              <Animated.View style={[handleStyle(cropX.value + cropWidth.value - 10, cropY.value - 10)]} />
            </GestureDetector>

            <GestureDetector gesture={bottomLeftGesture}>
              <Animated.View style={[handleStyle(cropX.value - 10, cropY.value + cropHeight.value - 10)]} />
            </GestureDetector>

            <GestureDetector gesture={bottomRightGesture}>
              <Animated.View
                style={[handleStyle(cropX.value + cropWidth.value - 10, cropY.value + cropHeight.value - 10)]}
              />
            </GestureDetector>

            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 }}>
              <Button title='Deshacer' onPress={undo} disabled={history.length === 0} />
              <Button title='Rehacer' onPress={redo} disabled={redoStack.length === 0} />
              <Button title='Recortar' onPress={cropImage} />
              <Button title='Guardar' onPress={saveToGallery} />
            </View>
          </View>
        ) : (
          <CameraView style={{ flex: 1 }} ref={cameraRef} />
        )}
        {!photoUri && <Button title='Take Photo' onPress={takePicture} />}
      </GestureHandlerRootView>
    </>
  );
};

export default CropEditorScreen;
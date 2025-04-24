import { useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Image,
  Button,
  LayoutChangeEvent,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SaveFormat } from 'expo-image-manipulator';
import * as ImageManipulator from 'expo-image-manipulator';
import { useFocusEffect, useNavigation } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Note: Calculated values
 */
const FRAME_WIDTH = screenWidth * 0.8;
const FRAME_HEIGHT = FRAME_WIDTH * 1.58; // Vertical proportion with width

export default function CameraScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });
  const [croppedUri, setCroppedUri] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const navigation = useNavigation<any>();

  // Reseting camera state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // This reset the default values when the focus is the camera again
      setShowPreview(false);
      setCroppedUri(null);
    }, [])
  );

  const onCameraLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCameraLayout({ width, height });
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    const photo = await cameraRef.current.takePictureAsync();
    if (!photo?.width || !photo?.height) return;

    const scaleX = photo.width / cameraLayout.width;
    const scaleY = photo.height / cameraLayout.height;

    const frameLeft = (cameraLayout.width - FRAME_WIDTH) / 2;
    const frameTop = (cameraLayout.height - FRAME_HEIGHT) / 2;

    // Valid integer values
    const cropRegion = {
      originX: Math.round(frameLeft * scaleX),
      originY: Math.round(frameTop * scaleY),
      width: Math.round(FRAME_WIDTH * scaleX),
      height: Math.round(FRAME_HEIGHT * scaleY),
    };

    const context = ImageManipulator.ImageManipulator.manipulate(photo.uri);
    context.crop(cropRegion);
    const img = await context.renderAsync();
    const result = await img.saveAsync({
      format: SaveFormat.JPEG,
    });

    setCroppedUri(result.uri);
    setShowPreview(true);
  };

  const handleNavigateToEdit = () => {
    navigation.navigate('menu/edit', {
      croppedUri,
    });
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setCroppedUri(null);
  };

  if (!permission) return <Text>Requesting camera permission...</Text>;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>Necesitamos acceso a tu cámara</Text>
        <Button onPress={requestPermission} title='Allow permissions' />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing='back' ref={cameraRef} onLayout={onCameraLayout}>
        <View style={styles.overlay}>
          <Text style={styles.instruction}>Try to center the mail piece in the rectangle</Text>
          <View style={styles.frame} />
        </View>
      </CameraView>

      <TouchableOpacity onPress={takePicture} style={styles.captureButton}>
        <Text style={{ color: '#fff' }}>Take Photo</Text>
      </TouchableOpacity>

      <Modal visible={showPreview} transparent animationType='fade'>
        <View style={styles.modalContainer}>
          {croppedUri && (
            <Image
              source={{ uri: croppedUri }}
              style={{
                width: FRAME_WIDTH,
                height: FRAME_HEIGHT,
              }}
              resizeMode='contain'
            />
          )}
          <View style={styles.previewButtonsContainer}>
            <TouchableOpacity onPress={handleClosePreview} style={[styles.previewButton, styles.cancelButton]}>
              <Text style={{ color: '#fff' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNavigateToEdit} style={[styles.previewButton, styles.editButton]}>
              <Text style={{ color: '#fff' }}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    alignItems: 'center',
    transform: [{ translateY: -FRAME_HEIGHT / 2 }],
  },
  instruction: {
    color: '#fff',
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  frame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderWidth: 3,
    borderColor: 'white',
    backgroundColor: 'transparent',
  },
  captureButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 50,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewButtonsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'center',
    width: FRAME_WIDTH,
  },
  previewButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
    marginLeft: 12
  },
  cancelButton: {
    backgroundColor: 'red',
  },
});

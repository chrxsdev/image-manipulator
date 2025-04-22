import { useRef, useState } from 'react';
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
import * as MediaLibrary from 'expo-media-library';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FRAME_WIDTH = screenWidth * 0.80; 
const FRAME_HEIGHT = FRAME_WIDTH * 1.58; // vertical ID proportion (approx: 85.6mm x 54mm flipped)

export default function CameraScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });
  const [croppedUri, setCroppedUri] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

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

    const cropRegion = {
      originX: frameLeft * scaleX,
      originY: frameTop * scaleY,
      width: FRAME_WIDTH * scaleX,
      height: FRAME_HEIGHT * scaleY,
    };

    const cropped = await manipulateAsync(photo.uri, [{ crop: cropRegion }], {
      compress: 1,
      format: SaveFormat.JPEG,
    });

    setCroppedUri(cropped.uri);
    setShowPreview(true);
    await MediaLibrary.saveToLibraryAsync(cropped.uri);
  };

  if (!permission) return <Text>Requesting camera permission...</Text>;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>Necesitamos acceso a tu cámara</Text>
        <Button onPress={requestPermission} title="Dar permiso" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        ref={cameraRef}
        onLayout={onCameraLayout}
      >
        <View style={styles.overlay}>
          <Text style={styles.instruction}>Try to center the mail piece in the rectangle</Text>
          <View style={styles.frame} />
        </View>
      </CameraView>

      <TouchableOpacity onPress={takePicture} style={styles.captureButton}>
        <Text style={{ color: '#fff' }}>Tomar Foto</Text>
      </TouchableOpacity>

      <Modal visible={showPreview} transparent animationType="fade">
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
          <TouchableOpacity onPress={() => setShowPreview(false)} style={styles.closeButton}>
            <Text style={{ color: '#fff' }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderColor: 'cyan',
    backgroundColor: 'transparent',
    borderRadius: 0, // 🔥 Sin bordes redondeados
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
  closeButton: {
    marginTop: 20,
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
  },
});

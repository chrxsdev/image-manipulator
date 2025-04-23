import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  Button,
  PanResponder,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

const { width, height } = Dimensions.get('window');
const FRAME_WIDTH = width * 0.8;
const FRAME_HEIGHT = FRAME_WIDTH * 0.6;

interface RedactBox {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function RedactingScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [editedUri, setEditedUri] = useState<string | null>(null);
  const [redactBoxes, setRedactBoxes] = useState<RedactBox[]>([]);
  const [activeBoxId, setActiveBoxId] = useState<number | null>(null);
  const [counter, setCounter] = useState(0);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      if (!photo) return;
      setPhotoUri(photo.uri);
      setEditedUri(photo.uri);
    }
  };

  const addRedactBox = () => {
    setRedactBoxes([
      ...redactBoxes,
      { id: counter, x: 100, y: 100, width: 150, height: 60 },
    ]);
    setCounter(counter + 1);
  };

  const moveBox = (id: number, dx: number, dy: number) => {
    setRedactBoxes(prev =>
      prev.map(box =>
        box.id === id ? { ...box, x: box.x + dx, y: box.y + dy } : box
      )
    );
  };

  const saveImage = async () => {
    if (!editedUri) return;

    const actions = redactBoxes.map(box => ({
      overlay: {
        color: '#000',
        position: { x: box.x, y: box.y },
        width: box.width,
        height: box.height,
      },
    }));

    const result = await ImageManipulator.manipulateAsync(
      editedUri,
      actions,
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    );

    setEditedUri(result.uri);
    setRedactBoxes([]);
  };

  const renderBoxes = () =>
    redactBoxes.map(box => {
      const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => setActiveBoxId(box.id),
        onPanResponderMove: (_, gesture) => {
          moveBox(box.id, gesture.dx, gesture.dy);
        },
        onPanResponderRelease: () => setActiveBoxId(null),
      });

      return (
        <View
          key={box.id}
          {...panResponder.panHandlers}
          style={[
            styles.redactBox,
            {
              left: box.x,
              top: box.y,
              width: box.width,
              height: box.height,
              borderColor: activeBoxId === box.id ? 'red' : 'transparent',
            },
          ]}
        />
      );
    });

  if (!permission) return <Text>Requesting camera permission...</Text>;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>Necesitamos acceso a tu cámara</Text>
        <Button onPress={requestPermission} title='Allow permissions' />
      </View>
    );
  }

  if (editedUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: editedUri }} style={styles.image} resizeMode='contain' />
        {renderBoxes()}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={addRedactBox}>
            <Text style={styles.buttonText}>+ Redact</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={saveImage}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.frame} />
        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <Text style={styles.buttonText}>Capture</Text>
        </TouchableOpacity>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  frame: {
    position: 'absolute',
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  captureButton: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 10,
  },
  buttonRow: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    gap: 20,
  },
  button: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  buttonText: { color: 'white', fontWeight: 'bold' },
  image: {
    width: width,
    height: height,
    position: 'absolute',
  },
  redactBox: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderWidth: 2,
  },
});

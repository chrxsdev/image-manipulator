import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Button, Alert } from 'react-native';
import { CameraCapturedPicture, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { globalStyles } from '@/styles/global-styles';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CropScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<any>(null);
  const [croppedImage, setCroppedImage] = useState<any>(null);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <Text>Requesting camera permission...</Text>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={globalStyles.title}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title='Grant permission' />
      </View>
    );
  }

  const cropRect = {
    x: screenWidth * 0.1,
    y: screenHeight * 0.3,
    width: screenWidth * 0.8,
    height: 200,
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setCapturedImage(photo);
      cropImage(photo);
    }
  };

  const cropImage = async (photo: CameraCapturedPicture | undefined) => {
    if (!photo) return;

    try {
      // Calculate the aspect ratio difference between preview and actual image
      const previewAspect = screenWidth / screenHeight;
      const imageAspect = photo.width / photo.height;

      let scaleX = photo.width / screenWidth;
      let scaleY = photo.height / screenHeight;

      // If the aspect ratios differ, we need to account for letterboxing
      if (imageAspect > previewAspect) {
        // The image is wider than the preview (letterboxing on top/bottom)
        const effectivePreviewHeight = screenWidth / imageAspect;
        scaleY = photo.height / effectivePreviewHeight;
      } else {
        // The image is taller than the preview (letterboxing on sides)
        const effectivePreviewWidth = screenHeight * imageAspect;
        scaleX = photo.width / effectivePreviewWidth;
      }

      const cropRegion = {
        originX: cropRect.x * scaleX,
        originY: cropRect.y * scaleY,
        width: cropRect.width * scaleX,
        height: cropRect.height * scaleY,
      };

      const manipResult = await ImageManipulator.manipulateAsync(photo.uri, [{ crop: cropRegion }], {
        format: ImageManipulator.SaveFormat.JPEG,
        compress: 1,
      });

      setCroppedImage(manipResult);
    } catch (error) {
      console.error('Error cropping image:', error);
      Alert.alert('Error', 'Failed to crop image. Please try again.');
      setCapturedImage(null);
    }
  };

  return (
    <View style={styles.container}>
      {!capturedImage ? (
        <>
          <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} mode='picture' />
          <View style={[styles.cropBox, cropRect]}>
            <View style={styles.cropBoxBorder} />
          </View>
          <TouchableOpacity onPress={takePicture} style={styles.captureButton}>
            <Text style={styles.buttonText}>Capture</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.resultContainer}>
          {/* Black placeholder for the photo */}
          <View style={styles.blackPlaceholder}>
            {croppedImage ? (
              <Image
                source={{ uri: `${croppedImage.uri}` }}
                style={styles.resultImage}
                onLoad={() => console.log('Image loaded successfully', croppedImage)}
                onError={(error) => console.log('Image loading error:', error.nativeEvent.error)}
              />
            ) : (
              <Text style={{ color: 'white' }}>Processing image...</Text>
            )}
          </View>

          <TouchableOpacity
            onPress={() => {
              setCapturedImage(null);
              setCroppedImage(null);
            }}
            style={styles.retryButton}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  blackPlaceholder: {
    width: screenWidth * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cropBoxBorder: {
    flex: 1,
    borderColor: 'red',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  cropBox: {
    marginVertical: 300,
    marginHorizontal: 40,
    position: 'absolute',
    borderColor: 'white',
    borderWidth: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
  captureButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: { fontWeight: 'bold', color: 'black' },
  resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  previewLabel: { color: '#fff', fontSize: 18, marginBottom: 10 },
  resultImage: {
    width: screenWidth * 0.8,
    height: screenHeight * 0.3,
    resizeMode: 'contain',
    borderWidth: 1,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});
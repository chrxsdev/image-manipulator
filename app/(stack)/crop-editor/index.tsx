import React, { useState } from 'react';
import { View, Image, StyleSheet, Dimensions, TouchableOpacity, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import { useRoute } from '@react-navigation/native';

const screen = Dimensions.get('window');

export default function CropEditorScreen() {
  const { photoUri } = useRoute().params as { photoUri: string };
  const [imageUri, setImageUri] = useState(photoUri);

  // Crop box position and size
  const x = useSharedValue(screen.width * 0.1);
  const y = useSharedValue(screen.height * 0.2);
  const boxWidth = useSharedValue(screen.width * 0.7);
  const boxHeight = useSharedValue(screen.height * 0.4);


  // Gesture to move the box
  const offsetX = useSharedValue(x.value);
  const offsetY = useSharedValue(y.value);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      offsetX.value = x.value;
      offsetY.value = y.value;
    })
    .onUpdate((e) => {
      const nextX = offsetX.value + e.translationX;
      const nextY = offsetY.value + e.translationY;

      const maxX = screen.width - boxWidth.value;
      const maxY = screen.height - boxHeight.value;

      x.value = Math.max(0, Math.min(nextX, maxX));
      y.value = Math.max(0, Math.min(nextY, maxY));
    });

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x.value,
    top: y.value,
    width: boxWidth.value,
    height: boxHeight.value,
    borderWidth: 2,
    borderColor: 'white',
  }));

  const cropImage = async () => {
    const cropData = {
      originX: x.value,
      originY: y.value,
      width: boxWidth.value,
      height: boxHeight.value,
    };

    const result = await ImageManipulator.manipulateAsync(imageUri, [{ crop: cropData }], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    setImageUri(result.uri);

    await MediaLibrary.saveToLibraryAsync(result.uri);
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode='contain' />

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[animatedStyle, styles.cropBox]} />
      </GestureDetector>

      <TouchableOpacity onPress={cropImage} style={styles.cropButton}>
        <Text style={styles.cropText}>Crop</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  image: { width: '100%', height: '100%', position: 'absolute' },
  cropBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cropButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cropText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

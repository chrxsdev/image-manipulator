import { globalStyles } from '@/styles/global-styles';
import { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';

import * as ImagePicker from 'expo-image-picker';

const MenuScreen = () => {
  const [image, setImage] = useState<string | null>(null);

  const takePicture = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <View style={globalStyles.background}>
      <Text style={globalStyles.title}>Image Manipulator</Text>
      <Pressable
        onPress={takePicture}
        style={({ pressed }) => ({
          ...globalStyles.button,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={globalStyles.buttonText}>Open Camera</Text>
      </Pressable>
      <View style={globalStyles.imageContainer}>{image && <Image source={{ uri: image }} style={globalStyles.image} />}</View>
    </View>
  );
};

export default MenuScreen;
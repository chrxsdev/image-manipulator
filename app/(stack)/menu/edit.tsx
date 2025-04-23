import { useRoute } from '@react-navigation/native';
import { View, Text } from 'react-native';

const EditScreen = () => {
  const route = useRoute();
  const { croppedUri } = route.params as { croppedUri: string };

  console.log(croppedUri);

  return (
    <View>
      <Text>EditScreen</Text>
    </View>
  );
};

export default EditScreen;

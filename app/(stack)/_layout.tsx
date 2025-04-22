import { Stack } from 'expo-router';

const StackLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        contentStyle: {
          backgroundColor: 'white',
        },
      }}
    >
      <Stack.Screen
        name='menu/index'
        options={{
          title: 'Menu',
        }}
      />
      <Stack.Screen
        name='crop-editor/index'
        options={{
          title: 'Crop Editor',
        }}
      />
    </Stack>
  );
};

export default StackLayout;

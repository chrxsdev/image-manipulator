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
        name='menu/edit'
        options={{
          title: 'Edit',
        }}
      />
      <Stack.Screen
        name='native/index'
        options={{
          title: 'Native',
        }}
      />
    </Stack>
  );
};

export default StackLayout;

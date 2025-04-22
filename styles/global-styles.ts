import { StyleSheet } from 'react-native';

export const globalStyles = StyleSheet.create({
  background: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },

  button: {
    width: 100,
    backgroundColor: '#000000',
    justifyContent: 'center',
    marginHorizontal: 10,
  },

  title: {
    marginVertical: 20,
    fontSize: 20,
  },

  buttonText: {
    textAlign: 'center',
    padding: 5,
    fontSize: 12,
    color: 'white',
    fontWeight: 300,
  },

  image: {
    width: 200,
    height: 150,
    objectFit: 'cover',
  },

  imageContainer: {
    padding: 20,
    marginVertical: 20,
  },
});

// import { usePush } from '@/hooks/usePush';
import { Ionicons } from '@expo/vector-icons';
import { DefaultTheme } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

const Layout = () => {
  // usePush();
  const router = useRouter();

  return (
    <Stack>
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create-event"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
};
export default Layout;
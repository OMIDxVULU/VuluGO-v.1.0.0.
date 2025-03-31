import { Redirect } from 'expo-router';

export default function TabsLayout() {
  // Redirect to our custom main layout
  return <Redirect href="/(main)" />;
}

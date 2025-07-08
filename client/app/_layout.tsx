import { Stack } from "expo-router";
import "../global.css"
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { NavigationContainer } from "@react-navigation/native";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

if (!publishableKey) {
  throw new Error(
    'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env'
  )
}

export default function RootLayout() {
  return (
    <ClerkProvider 
      tokenCache={tokenCache} 
      publishableKey={publishableKey}
    >
      <Stack screenOptions={{}}>
        <Stack.Screen 
          name="(auth)" 
          options={{
            headerShown: false
          }} 
        />
        <Stack.Screen 
          name="(tabs)" 
          options={{
            headerShown: false
          }} 
        />
      </Stack>
    </ClerkProvider>
  )
}
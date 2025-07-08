import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useEffect } from "react";
import { useUserSync } from "@/hooks/useUserSync";

export default function AuthLayout() {
    const { isSignedIn, isLoaded } = useAuth();
    const { syncUser } = useUserSync();

    useEffect(() => {
        // Sync user when they sign in
        if (isSignedIn && isLoaded) {
            console.log('User signed in, attempting sync...');
            syncUser().then(() => {
                console.log('User sync completed successfully');
            }).catch(error => {
                console.error('Failed to sync user on sign in:', error);
                // Don't block the user from proceeding if sync fails
            });
        }
    }, [isSignedIn, isLoaded]);

    // Wait for auth to load
    if (!isLoaded) {
        return null;
    }

    if (isSignedIn) {
        return <Redirect href="/(tabs)/home" />;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
        </Stack>
    );
}
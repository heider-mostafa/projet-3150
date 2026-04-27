import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TenantTabs } from './TenantTabs';
import { LandlordTabs } from './LandlordTabs';
import { LoginScreen } from '../screens/LoginScreen';
import { RequestDetailScreen } from '../screens/RequestDetailScreen';
import { OnboardingFlow } from '../screens/OnboardingFlow';
import { SecurityPrivacyScreen } from '../screens/SecurityPrivacyScreen';
import { PaymentMethodsScreen } from '../screens/PaymentMethodsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { NotificationCenterScreen } from '../screens/NotificationCenterScreen';
import { LegalAdvisorScreen } from '../screens/LegalAdvisorScreen';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
    const { session, isLoading, persona, isNewUser } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                    animation: 'slide_from_right',
                }}
            >
                {!session ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : isNewUser && persona === 'tenant' ? (
                    <>
                        <Stack.Screen name="Onboarding" component={OnboardingFlow} />
                        <Stack.Screen name="TenantMain" component={TenantTabs} />
                    </>
                ) : (
                    <>
                        {persona === 'landlord' ? (
                            <Stack.Screen name="LandlordMain" component={LandlordTabs} />
                        ) : (
                            <Stack.Screen name="TenantMain" component={TenantTabs} />
                        )}
                        <Stack.Screen name="Onboarding" component={OnboardingFlow} />
                        <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />
                        <Stack.Screen name="SecurityPrivacy" component={SecurityPrivacyScreen} />
                        <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
                        <Stack.Screen name="Notifications" component={NotificationsScreen} />
                        <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
                        <Stack.Screen name="LegalAdvisor" component={LegalAdvisorScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

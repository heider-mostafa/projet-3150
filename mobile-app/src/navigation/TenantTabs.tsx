import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TenantHomeScreen } from '../screens/TenantHomeScreen';
import { ActivityScreen } from '../screens/ActivityScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { NewRequestScreen } from '../screens/NewRequestScreen';
import { FastRequestScreen } from '../screens/FastRequestScreen';
import { LivingGuideDetailScreen } from '../screens/LivingGuideDetailScreen';
import { DigitalKeycardScreen } from '../screens/DigitalKeycardScreen';
import { RentPaymentScreen } from '../screens/tenant/RentPaymentScreen';
import { PaymentHistoryScreen } from '../screens/tenant/PaymentHistoryScreen';
import { PaymentConfirmationScreen } from '../screens/tenant/PaymentConfirmationScreen';
import { colors } from '../theme';
import { Home, ClipboardList, User } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
    const { t } = useLanguage();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    height: 60,
                    paddingBottom: 10,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textTertiary,
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '700',
                    letterSpacing: 0.5,
                },
            }}
        >
            <Tab.Screen
                name="HomeHub"
                component={TenantHomeScreen}
                options={{
                    tabBarLabel: t('tabs.home'),
                    tabBarIcon: ({ color }: { color: string }) => <Home color={color} size={20} />,
                }}
            />
            <Tab.Screen
                name="Activity"
                component={ActivityScreen}
                options={{
                    tabBarLabel: t('tabs.activity'),
                    tabBarIcon: ({ color }: { color: string }) => <ClipboardList color={color} size={20} />,
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarLabel: t('tabs.identity'),
                    tabBarIcon: ({ color }: { color: string }) => <User color={color} size={20} />,
                }}
            />
        </Tab.Navigator>
    );
};

export const TenantTabs = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="FastRequest" component={FastRequestScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="NewRequest" component={NewRequestScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="LivingGuideDetail" component={LivingGuideDetailScreen} />
        <Stack.Screen name="DigitalKeycard" component={DigitalKeycardScreen} />
        <Stack.Screen name="RentPayment" component={RentPaymentScreen} />
        <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
        <Stack.Screen name="PaymentConfirmation" component={PaymentConfirmationScreen} />
    </Stack.Navigator>
);


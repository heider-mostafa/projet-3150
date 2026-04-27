import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ManagerHomeScreen } from '../screens/landlord/ManagerHomeScreen';
import { PortfolioHubScreen } from '../screens/landlord/PortfolioHubScreen';
import { TreasuryTerminalScreen } from '../screens/landlord/TreasuryTerminalScreen';
import { VendorNetworkScreen } from '../screens/landlord/VendorNetworkScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { BuildingDetailScreen } from '../screens/landlord/BuildingDetailScreen';
import { AddBuildingScreen } from '../screens/landlord/AddBuildingScreen';
import { VendorDiscoveryScreen } from '../screens/landlord/VendorDiscoveryScreen';
import { CalendarScreen } from '../screens/landlord/CalendarScreen';
import { DispatchVendorScreen } from '../screens/landlord/DispatchVendorScreen';
import { ContactPickerScreen } from '../screens/landlord/ContactPickerScreen';
import { ProSourcingScreen } from '../screens/ProSourcingScreen';
import { colors } from '../theme';
import { LayoutDashboard, Building2, Wallet, Users, User } from 'lucide-react-native';
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
                    height: 65,
                    paddingBottom: 12,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textTertiary,
                tabBarLabelStyle: {
                    fontSize: 9,
                    fontWeight: '800',
                    letterSpacing: 0.5,
                },
            }}
        >
            <Tab.Screen
                name="ManagerHome"
                component={ManagerHomeScreen}
                options={{
                    tabBarLabel: t('tabs.executive'),
                    tabBarIcon: ({ color }: { color: string }) => <LayoutDashboard color={color} size={20} />,
                }}
            />
            <Tab.Screen
                name="PortfolioHub"
                component={PortfolioHubScreen}
                options={{
                    tabBarLabel: t('tabs.assets'),
                    tabBarIcon: ({ color }: { color: string }) => <Building2 color={color} size={20} />,
                }}
            />
            <Tab.Screen
                name="TreasuryTerminal"
                component={TreasuryTerminalScreen}
                options={{
                    tabBarLabel: t('tabs.treasury'),
                    tabBarIcon: ({ color }: { color: string }) => <Wallet color={color} size={20} />,
                }}
            />
            <Tab.Screen
                name="VendorNetwork"
                component={VendorNetworkScreen}
                options={{
                    tabBarLabel: t('tabs.network'),
                    tabBarIcon: ({ color }: { color: string }) => <Users color={color} size={20} />,
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

export const LandlordTabs = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="ProSourcing" component={ProSourcingScreen} />
        <Stack.Screen name="BuildingDetail" component={BuildingDetailScreen} />
        <Stack.Screen name="AddBuilding" component={AddBuildingScreen} />
        <Stack.Screen name="VendorDiscovery" component={VendorDiscoveryScreen} />
        <Stack.Screen name="Calendar" component={CalendarScreen} />
        <Stack.Screen name="DispatchVendor" component={DispatchVendorScreen} />
        <Stack.Screen name="ContactPicker" component={ContactPickerScreen} />
    </Stack.Navigator>
);

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
    Animated,
    Image,
    Dimensions,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
    Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { GlassCard } from '../components/GlassCard';
import { PersonaToggle } from '../components/PersonaToggle';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

const { width, height } = Dimensions.get('window');

type AuthMode = 'signup' | 'login';

export const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [showOtp, setShowOtp] = useState(false);
    const [authMode, setAuthMode] = useState<AuthMode>('signup');
    const { persona, setPersona } = useAuth();
    const { t } = useLanguage();
    const [activePersona, setActivePersona] = useState<'tenant' | 'landlord'>(persona || 'tenant');

    // Animation values for background cross-fade
    const fadeAnim = useRef(new Animated.Value(activePersona === 'tenant' ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: activePersona === 'tenant' ? 1 : 0,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, [activePersona]);

    // ─── SIGN UP: email + password + OTP verification ───
    const handleSignUp = async () => {
        if (!email || !password) {
            Alert.alert(t('login.errorTitle'), t('login.enterEmailPassword'));
            return;
        }
        if (password.length < 6) {
            Alert.alert(t('login.errorTitle'), t('login.passwordMinLength'));
            return;
        }
        if (!fullName.trim()) {
            Alert.alert(t('login.errorTitle'), t('login.enterFullName'));
            return;
        }

        setLoading(true);
        setPersona(activePersona);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName.trim(),
                        persona: activePersona,
                    },
                },
            });

            if (error) {
                Alert.alert(t('login.signUpError'), error.message);
            } else if (data.user && !data.session) {
                // Email confirmation required — show OTP input
                setShowOtp(true);
                Alert.alert(t('login.verifyEmail'), t('login.checkEmailOtp'));
            }
            // If session exists, auth state change will auto-navigate
        } catch (err: any) {
            Alert.alert(t('login.unexpectedError'), err.message);
        } finally {
            setLoading(false);
        }
    };

    // ─── LOG IN: email + password only ───
    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert(t('login.errorTitle'), t('login.enterEmailPassword'));
            return;
        }

        setLoading(true);
        setPersona(activePersona);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                Alert.alert(t('login.loginError'), error.message);
            }
            // If success, auth state change will auto-navigate
        } catch (err: any) {
            Alert.alert(t('login.unexpectedError'), err.message);
        } finally {
            setLoading(false);
        }
    };

    // ─── VERIFY OTP (after signup) ───
    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 6) {
            Alert.alert(t('login.errorTitle'), t('login.enterOtpCode'));
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'email',
            });

            if (error) {
                Alert.alert(t('login.verificationFailed'), error.message);
            }
        } catch (err: any) {
            Alert.alert(t('login.unexpectedError'), err.message);
        } finally {
            setLoading(false);
        }
    };

    // ─── FORGOT PASSWORD ───
    const handleForgotPassword = async () => {
        if (!email) {
            Alert.alert(t('login.errorTitle'), t('login.enterEmailFirst'));
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) {
                Alert.alert(t('login.errorTitle'), error.message);
            } else {
                Alert.alert(t('login.passwordReset'), t('login.checkEmailReset'));
            }
        } catch (err: any) {
            Alert.alert(t('login.errorTitle'), err.message);
        } finally {
            setLoading(false);
        }
    };

    // ─── OAUTH (Google / Apple) ───
    const handleOAuth = async (provider: 'google' | 'apple') => {
        setLoading(true);
        try {
            const redirectUrl = makeRedirectUri({ scheme: 'homeos' });
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });

            if (error) {
                Alert.alert(t('login.oauthError'), error.message);
                return;
            }

            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
                if (result.type === 'success' && result.url) {
                    // Extract tokens from the redirect URL
                    const url = new URL(result.url);
                    const params = new URLSearchParams(url.hash.substring(1));
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');

                    if (accessToken && refreshToken) {
                        await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                    }
                }
            }
        } catch (err: any) {
            Alert.alert(t('login.oauthError'), err.message);
        } finally {
            setLoading(false);
        }
    };

    const tenantOpacity = fadeAnim;
    const landlordOpacity = fadeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
    });

    // ─── RENDER: OTP verification step ───
    const renderOtpStep = () => (
        <>
            <Text style={styles.cardTitle}>{t('login.verifyCode')}</Text>
            <Text style={styles.cardSubtitle}>
                {t('login.otpSentTo')} {email}
            </Text>

            <Input
                label={t('login.otpLabel')}
                placeholder={t('login.otpPlaceholder')}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.input}
                editable={!loading}
            />

            <Button
                title={loading ? t('login.verifying') : t('login.verifyBtn')}
                onPress={handleVerifyOtp}
                style={styles.button}
                isLoading={loading}
            />

            <TouchableOpacity onPress={() => setShowOtp(false)} style={styles.backButton}>
                <Text style={styles.backButtonText}>{t('login.useDifferentEmail')}</Text>
            </TouchableOpacity>
        </>
    );

    // ─── RENDER: Sign Up form ───
    const renderSignUpForm = () => (
        <>
            <PersonaToggle
                activePersona={activePersona}
                onPersonaChange={setActivePersona}
            />

            <Text style={styles.cardTitle}>{t('login.createAccount')}</Text>
            <Text style={styles.cardSubtitle}>
                {activePersona === 'landlord'
                    ? t('login.landlordSignupDesc')
                    : t('login.tenantSignupDesc')}
            </Text>

            <Input
                label={t('login.fullName')}
                placeholder={t('login.fullNamePlaceholder')}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                style={styles.input}
                editable={!loading}
            />

            <Input
                label={t('login.email')}
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                editable={!loading}
            />

            <Input
                label={t('login.password')}
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                editable={!loading}
            />

            <Button
                title={loading ? t('login.creating') : t('login.createBtn')}
                onPress={handleSignUp}
                style={styles.button}
                isLoading={loading}
            />
        </>
    );

    // ─── RENDER: Log In form ───
    const renderLoginForm = () => (
        <>
            <PersonaToggle
                activePersona={activePersona}
                onPersonaChange={setActivePersona}
            />

            <Text style={styles.cardTitle}>{t('login.secureAccess')}</Text>
            <Text style={styles.cardSubtitle}>
                {activePersona === 'landlord'
                    ? t('login.landlordLoginDesc')
                    : t('login.tenantLoginDesc')}
            </Text>

            <Input
                label={t('login.email')}
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                editable={!loading}
            />

            <Input
                label={t('login.password')}
                placeholder={t('login.enterPassword')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                editable={!loading}
            />

            <Button
                title={loading ? t('login.authenticating') : t('login.authenticateBtn')}
                onPress={handleLogin}
                style={styles.button}
                isLoading={loading}
            />

            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotButton}>
                <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
            </TouchableOpacity>
        </>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Dynamic Sketch Backgrounds */}
            <View style={StyleSheet.absoluteFill}>
                <Animated.Image
                    source={require('../../assets/tenant_bg.png')}
                    style={[styles.bgImage, { opacity: Animated.multiply(tenantOpacity, 0.15) }]}
                    resizeMode="cover"
                />
                <Animated.Image
                    source={require('../../assets/landlord_bg.png')}
                    style={[styles.bgImage, { opacity: Animated.multiply(landlordOpacity, 0.15) }]}
                    resizeMode="cover"
                />
            </View>

            <View style={styles.decorCircle} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <SafeAreaView style={styles.safeArea}>
                        <View style={styles.content}>
                            <View style={styles.header}>
                                <Text style={styles.superTitle}>{t('login.brand')}</Text>
                                <Text style={styles.title}>{t('login.title')}</Text>
                                <Text style={styles.versionTag}>{t('login.version')}</Text>
                            </View>

                            <GlassCard style={styles.loginCard}>
                                {showOtp
                                    ? renderOtpStep()
                                    : authMode === 'signup'
                                        ? renderSignUpForm()
                                        : renderLoginForm()
                                }

                                {/* OAuth Divider & Buttons (hidden during OTP) */}
                                {!showOtp && (
                                    <>
                                        <View style={styles.dividerRow}>
                                            <View style={styles.dividerLine} />
                                            <Text style={styles.dividerText}>{t('login.orContinueWith')}</Text>
                                            <View style={styles.dividerLine} />
                                        </View>

                                        <View style={styles.oauthRow}>
                                            {Platform.OS === 'ios' && (
                                                <TouchableOpacity
                                                    style={[styles.oauthBtn, styles.appleBtn]}
                                                    onPress={() => handleOAuth('apple')}
                                                    disabled={loading}
                                                >
                                                    <Text style={styles.appleBtnText}>{t('login.apple')}</Text>
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity
                                                style={[styles.oauthBtn, styles.googleBtn]}
                                                onPress={() => handleOAuth('google')}
                                                disabled={loading}
                                            >
                                                <Text style={styles.googleBtnText}>{t('login.google')}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </GlassCard>

                            {/* Mode Toggle */}
                            {!showOtp && (
                                <TouchableOpacity
                                    style={styles.modeToggle}
                                    onPress={() => {
                                        setAuthMode(authMode === 'signup' ? 'login' : 'signup');
                                        setPassword('');
                                    }}
                                >
                                    <Text style={styles.modeToggleText}>
                                        {authMode === 'signup'
                                            ? t('login.alreadyHaveAccount')
                                            : t('login.newHere')}
                                        <Text style={styles.modeToggleLink}>
                                            {authMode === 'signup' ? t('login.logIn') : t('login.signUp')}
                                        </Text>
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>
                                    {t('login.footerLine1')}
                                    {'\n'}{t('login.footerLine2')}
                                </Text>
                            </View>
                        </View>
                    </SafeAreaView>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
    },
    bgImage: {
        position: 'absolute',
        width: width * 1.5,
        height: '100%',
        left: -width * 0.25,
        top: 0,
        opacity: 0.1,
    },
    decorCircle: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(15, 76, 58, 0.05)',
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: spacing.l,
        justifyContent: 'space-between',
        minHeight: height * 0.8,
    },
    header: {
        marginTop: spacing.xxl,
    },
    superTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 4,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    title: {
        fontSize: 44,
        fontWeight: '700',
        color: colors.text,
        lineHeight: 44,
    },
    versionTag: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.primary,
        marginTop: spacing.s,
        letterSpacing: 1,
    },
    loginCard: {
        marginTop: spacing.xl,
        paddingBottom: spacing.l,
    },
    cardTitle: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.5,
        color: colors.textTertiary,
        marginBottom: spacing.xs,
    },
    cardSubtitle: {
        fontSize: 14,
        color: colors.text,
        marginBottom: spacing.l,
        lineHeight: 20,
        fontWeight: '500',
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    button: {
        marginTop: spacing.s,
    },
    backButton: {
        marginTop: spacing.m,
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 11,
        color: colors.textTertiary,
        textDecorationLine: 'underline',
    },
    forgotButton: {
        marginTop: spacing.m,
        alignItems: 'center',
    },
    forgotText: {
        fontSize: 11,
        color: colors.primary,
        fontWeight: '600',
    },
    // ─── OAuth ───
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.l,
        marginBottom: spacing.m,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    dividerText: {
        fontSize: 8,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 1.5,
        marginHorizontal: spacing.m,
    },
    oauthRow: {
        flexDirection: 'row',
        gap: spacing.m,
    },
    oauthBtn: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    appleBtn: {
        backgroundColor: '#000000',
        borderColor: '#000000',
    },
    appleBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    googleBtn: {
        backgroundColor: '#FFFFFF',
        borderColor: colors.border,
    },
    googleBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: 0.5,
    },
    // ─── Mode Toggle ───
    modeToggle: {
        marginTop: spacing.l,
        alignItems: 'center',
    },
    modeToggleText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    modeToggleLink: {
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 1,
    },
    footer: {
        paddingVertical: spacing.xl,
    },
    footerText: {
        textAlign: 'center',
        color: colors.textTertiary,
        fontSize: 9,
        lineHeight: 16,
        letterSpacing: 0.5,
        fontWeight: '600',
    },
});

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  Modal,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ScrollableContentContainer from '../components/ScrollableContentContainer';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../services/firestoreService';
import { BiometricSettings } from '../components/auth/BiometricAuthButton';
import SecurityMonitor from '../components/security/SecurityMonitor';
import SecuritySettings from '../components/security/SecuritySettings';

const { height } = Dimensions.get('window');

const AccountScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userProfile, updateUserProfile, isGuest, updateUserEmail, deleteAccount } = useAuth();
  const [activeField, setActiveField] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [fieldType, setFieldType] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [blockedUsers, setBlockedUsers] = useState([
    { id: '1', name: 'John Smith', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
    { id: '2', name: 'Sarah Johnson', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
    { id: '3', name: 'Mike Williams', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' },
  ]);
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingUsername, setIsValidatingUsername] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');

  // Load user data from Firebase
  useEffect(() => {
    if (userProfile && !isGuest) {
      setUsername(userProfile.username || '');
      setDisplayName(userProfile.displayName || '');
      setEmail(userProfile.email || '');
      setPhone(userProfile.phoneNumber || '');
    }
  }, [userProfile, isGuest]);

  // Validate username uniqueness
  const validateUsername = async (newUsername: string): Promise<boolean> => {
    if (!newUsername || newUsername === userProfile?.username) {
      return true; // No change or empty
    }

    setIsValidatingUsername(true);
    try {
      const isTaken = await firestoreService.isUsernameTaken(newUsername);
      if (isTaken) {
        setErrorMessage('Username is already taken');
        return false;
      }
      setErrorMessage('');
      return true;
    } catch (error) {
      setErrorMessage('Failed to validate username');
      return false;
    } finally {
      setIsValidatingUsername(false);
    }
  };

  // Update user profile in Firebase
  const updateProfile = async (field: string, value: string): Promise<boolean> => {
    if (!user?.uid || isGuest) {
      showToastMessage('Please sign in to update your profile');
      return false;
    }

    setIsLoading(true);
    try {
      const updates: any = {};

      switch (field) {
        case 'username':
          if (!(await validateUsername(value))) {
            return false;
          }
          updates.username = value;
          break;
        case 'displayName':
          updates.displayName = value;
          break;
        case 'email':
          // Email changes require password confirmation
          Alert.alert(
            'Change Email',
            'To change your email address, please enter your current password for security.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Continue',
                onPress: () => {
                  Alert.prompt(
                    'Enter Password',
                    'Please enter your current password:',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Change Email',
                        onPress: async (password) => {
                          if (!password) {
                            showToastMessage('Password is required to change email');
                            return;
                          }
                          try {
                            await updateUserEmail(value, password);
                            showToastMessage('Email updated successfully. Please verify your new email address.');
                            setEmail(value);
                          } catch (error: any) {
                            showToastMessage(error.message || 'Failed to update email');
                          }
                        }
                      }
                    ],
                    'secure-text'
                  );
                }
              }
            ]
          );
          return true; // Return true to close the modal
        case 'phoneNumber':
          updates.phoneNumber = value;
          break;
        default:
          return false;
      }

      if (Object.keys(updates).length > 0) {
        await updateUserProfile(updates);
        showToastMessage('Profile updated successfully');
      }
      return true;
    } catch (error: any) {
      showToastMessage(error.message || 'Failed to update profile');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const handleBack = () => {
    router.push('/(main)/profile');
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
              setToastMessage('You have been signed out');
              setShowToast(true);
              setTimeout(() => {
                setShowToast(false);
                router.replace('/auth');
              }, 1000);
            } catch (error) {
              console.error('Error signing out:', error);
              setToastMessage('Error signing out. Please try again.');
              setShowToast(true);
              setTimeout(() => setShowToast(false), 2000);
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account?\n\nThis action cannot be undone and you will lose all your data, messages, and settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setShowDeleteAccountModal(true);
          }
        }
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    if (!deleteAccountPassword.trim()) {
      Alert.alert('Error', 'Please enter your current password to delete your account');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount(deleteAccountPassword);
      setShowDeleteAccountModal(false);
      setToastMessage('Your account has been deleted');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        router.replace('/auth');
      }, 1500);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
      setDeleteAccountPassword('');
    }
  };

  const openEditModal = (field: string, currentValue: string) => {
    setFieldType(field);
    setEditValue(currentValue);
    setErrorMessage('');
    setModalVisible(true);
  };
  
  const closeModal = () => {
    setModalVisible(false);
  };

  const validateField = () => {
    if (fieldType === 'username') {
      if (editValue.length < 3) {
        setErrorMessage('Username must be at least 3 characters');
        return false;
      }
      
      if (!/^[a-zA-Z0-9_]+$/.test(editValue)) {
        setErrorMessage('Please only use numbers, letters, underscores _');
        return false;
      }
    } else if (fieldType === 'email') {
      if (!/\S+@\S+\.\S+/.test(editValue)) {
        setErrorMessage('Please enter a valid email address');
        return false;
      }
    } else if (fieldType === 'phone') {
      if (editValue && !/^\d{10,12}$/.test(editValue.replace(/[^0-9]/g, ''))) {
        setErrorMessage('Please enter a valid phone number');
        return false;
      }
    }
    
    return true;
  };

  const saveChanges = async () => {
    if (!validateField()) {
      return;
    }

    const success = await updateProfile(fieldType, editValue);
    if (success) {
      // Update local state to reflect changes immediately
      if (fieldType === 'username') {
        setUsername(editValue);
      } else if (fieldType === 'displayName') {
        setDisplayName(editValue);
      } else if (fieldType === 'email') {
        setEmail(editValue);
      } else if (fieldType === 'phone') {
        setPhone(editValue);
      }

      closeModal();
    }
  };

  const openPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setShowPasswordModal(true);
  };
  
  const closePasswordModal = () => {
    setShowPasswordModal(false);
  };
  
  const validatePassword = () => {
    if (currentPassword !== 'password123') {
      setPasswordError('Current password is incorrect');
      return false;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return false;
    }
    
    return true;
  };
  
  const changePassword = async () => {
    if (!validatePassword()) {
      return;
    }

    setIsLoading(true);
    try {
      await authService.updatePassword(currentPassword, newPassword);
      showToastMessage('Password updated successfully');
      closePasswordModal();
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const openBlockedUsersModal = () => {
    setShowBlockedUsersModal(true);
  };
  
  const closeBlockedUsersModal = () => {
    setShowBlockedUsersModal(false);
  };

  const unblockUser = (userId: string, userName: string) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${userName}?\n\nThis user will be able to send you messages and see your content normally.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Yes, Unblock',
          style: 'destructive',
          onPress: () => {
            setBlockedUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
            setToastMessage(`${userName} has been unblocked`);
            setShowToast(true);
            setTimeout(() => {
              setShowToast(false);
              if (blockedUsers.length === 1) {
                closeBlockedUsersModal();
              }
            }, 300);
          }
        }
      ]
    );
  };

  const renderAccountInformation = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Account Information</Text>

        <LinearGradient
          colors={['#272931', '#1E1F25']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.sectionCard}
        >
          <TouchableOpacity 
            style={styles.fieldContainer}
            onPress={() => openEditModal('username', username)}
          >
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Username</Text>
              <Text style={styles.fieldValue}>{username}</Text>
            </View>
            <View style={styles.iconContainer}>
              <Feather name="chevron-right" size={20} color="#9BA1A6" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.fieldContainer}
            onPress={() => openEditModal('displayName', displayName)}
          >
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Display Name</Text>
              <Text style={styles.fieldValue}>{displayName}</Text>
            </View>
            <View style={styles.iconContainer}>
              <Feather name="chevron-right" size={20} color="#9BA1A6" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.fieldContainer}
            onPress={() => openEditModal('email', email)}
          >
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{email}</Text>
            </View>
            <View style={styles.iconContainer}>
              <Feather name="chevron-right" size={20} color="#9BA1A6" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.fieldContainer}
            onPress={() => openEditModal('phone', phone)}
          >
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <Text style={[styles.fieldValue, !phone && styles.placeholderText]}>
                {phone || 'Add phone number'}
              </Text>
            </View>
            <View style={styles.iconContainer}>
              <Feather name="chevron-right" size={20} color="#9BA1A6" />
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  };

  const renderSignInSection = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>How you sign into your account</Text>

        <LinearGradient
          colors={['#272931', '#1E1F25']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.sectionCard}
        >
          <TouchableOpacity
            style={styles.fieldContainer}
            onPress={openPasswordModal}
          >
            <View style={styles.fieldContent}>
              <View style={styles.fieldWithIcon}>
                <Feather name="lock" size={16} color="#6E69F4" style={styles.fieldIcon} />
                <Text style={styles.fieldLabel}>Password</Text>
              </View>
              <Text style={styles.fieldValue}>••••••••</Text>
            </View>
            <View style={styles.iconContainer}>
              <Feather name="chevron-right" size={20} color="#9BA1A6" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <BiometricSettings />
        </LinearGradient>
      </View>
    );
  };

  const renderUsersSection = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Users</Text>

        <LinearGradient
          colors={['#272931', '#1E1F25']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.sectionCard}
        >
          <TouchableOpacity 
            style={styles.fieldContainer}
            onPress={openBlockedUsersModal}
          >
            <View style={styles.fieldContent}>
              <View style={styles.fieldWithIcon}>
                <Feather name="user-x" size={16} color="#FF6B3D" style={styles.fieldIcon} />
                <Text style={styles.fieldLabel}>Blocked Users</Text>
              </View>
            </View>
            <View style={styles.fieldRightContainer}>
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{blockedUsers.length}</Text>
              </View>
              <View style={styles.iconContainer}>
                <Feather name="chevron-right" size={20} color="#9BA1A6" />
              </View>
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  };

  const renderShopSection = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Shop</Text>

        <LinearGradient
          colors={['#272931', '#1E1F25']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.sectionCard}
        >
          <TouchableOpacity style={styles.fieldContainer}>
            <View style={styles.fieldContent}>
              <View style={styles.fieldWithIcon}>
                <MaterialCommunityIcons name="restore" size={16} color="#7ADA72" style={styles.fieldIcon} />
                <Text style={styles.fieldLabel}>Restore Purchases</Text>
              </View>
            </View>
            <View style={styles.iconContainer}>
              <Feather name="chevron-right" size={20} color="#9BA1A6" />
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  };

  const renderAccountManagement = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Account Management</Text>

        <LinearGradient
          colors={['#272931', '#1E1F25']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.sectionCard}
        >
          <TouchableOpacity 
            style={styles.logoutContainer}
            onPress={handleLogout}
          >
            <Feather name="log-out" size={16} color="#FF9500" style={styles.logoutIcon} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.deleteAccountContainer}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <ActivityIndicator size="small" color="#FF3B30" style={styles.deleteIcon} />
                <Text style={styles.deleteAccountText}>Deleting Account...</Text>
              </>
            ) : (
              <>
                <Feather name="trash-2" size={16} color="#FF3B30" style={styles.deleteIcon} />
                <Text style={styles.deleteAccountText}>Delete Account</Text>
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  };

  const renderEditModal = () => {
    let placeholder = '';
    let keyboardType: any = 'default';
    let title = '';

    switch (fieldType) {
      case 'username':
        placeholder = 'Enter username';
        title = 'Username';
        break;
      case 'displayName':
        placeholder = 'Enter display name';
        title = 'Display Name';
        break;
      case 'email':
        placeholder = 'Enter email address';
        keyboardType = 'email-address';
        title = 'Email';
        break;
      case 'phone':
        placeholder = 'Enter phone number';
        keyboardType = 'phone-pad';
        title = 'Phone';
        break;
      default:
        placeholder = 'Enter value';
    }

    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalOverlayTouch}
            activeOpacity={1}
            onPress={closeModal}
          />
        </View>
        
        <View style={styles.modalContentWrapper}>
          <LinearGradient
            colors={['#1C1D23', '#15151A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.modalContent}
          >
            <View style={styles.statusSelectorHandle} />
            <Text style={styles.modalTitle}>{title}</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor="#8E8E93"
                value={editValue}
                onChangeText={setEditValue}
                keyboardType={keyboardType}
                autoCapitalize={fieldType === 'username' ? 'none' : 'sentences'}
                autoCorrect={false}
              />
              {editValue ? (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setEditValue('')}
                >
                  <AntDesign name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
            </View>

            {errorMessage ? (
              <Text style={styles.errorMessage}>{errorMessage}</Text>
            ) : fieldType === 'username' ? (
              <Text style={styles.helperText}>
                Please only use numbers, letters, underscores _
              </Text>
            ) : null}

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <LinearGradient
                colors={(!editValue && fieldType !== 'phone') || isLoading ? ['rgba(110, 105, 244, 0.5)', 'rgba(110, 105, 244, 0.5)'] : ['#6E69F4', '#5865F2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={saveChanges}
                  disabled={(!editValue && fieldType !== 'phone') || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    );
  };

  const renderPasswordModal = () => {
    return (
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={closePasswordModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalOverlayTouch}
            activeOpacity={1}
            onPress={closePasswordModal}
          />
        </View>
        
        <View style={styles.modalContentWrapper}>
          <LinearGradient
            colors={['#1C1D23', '#15151A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.modalContent}
          >
            <View style={styles.statusSelectorHandle} />
            <Text style={styles.modalTitle}>Update Password</Text>

            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Current password"
                placeholderTextColor="#8E8E93"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              {currentPassword ? (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setCurrentPassword('')}
                >
                  <AntDesign name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
            </View>
            
            <View style={styles.inputSpacer} />

            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="New password"
                placeholderTextColor="#8E8E93"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              {newPassword ? (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setNewPassword('')}
                >
                  <AntDesign name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
            </View>
            
            <View style={styles.inputSpacer} />

            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor="#8E8E93"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              {confirmPassword ? (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setConfirmPassword('')}
                >
                  <AntDesign name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
            </View>

            {passwordError ? (
              <Text style={styles.errorMessage}>{passwordError}</Text>
            ) : null}

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={closePasswordModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <LinearGradient
                colors={!currentPassword || !newPassword || !confirmPassword ? 
                  ['rgba(110, 105, 244, 0.5)', 'rgba(110, 105, 244, 0.5)'] : 
                  ['#6E69F4', '#5865F2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={changePassword}
                  disabled={!currentPassword || !newPassword || !confirmPassword}
                >
                  <Text style={styles.saveButtonText}>Change Password</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    );
  };

  const renderDeleteAccountModal = () => {
    return (
      <Modal
        visible={showDeleteAccountModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeleteAccountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalOverlayTouch}
            activeOpacity={1}
            onPress={() => setShowDeleteAccountModal(false)}
          />
        </View>

        <View style={styles.modalContentWrapper}>
          <LinearGradient
            colors={['#1C1D23', '#15151A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.modalContent}
          >
            <View style={styles.statusSelectorHandle} />
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalSubtitle}>
              This action cannot be undone. Please enter your password to confirm account deletion.
            </Text>

            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#8E8E93"
                secureTextEntry
                value={deleteAccountPassword}
                onChangeText={setDeleteAccountPassword}
              />
              {deleteAccountPassword ? (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setDeleteAccountPassword('')}
                >
                  <AntDesign name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowDeleteAccountModal(false);
                  setDeleteAccountPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <LinearGradient
                colors={!deleteAccountPassword ?
                  ['rgba(255, 59, 48, 0.5)', 'rgba(255, 59, 48, 0.5)'] :
                  ['#FF3B30', '#FF2D20']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={confirmDeleteAccount}
                  disabled={!deleteAccountPassword || isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Delete Account</Text>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    );
  };

  const renderBlockedUsersModal = () => {
    return (
      <Modal
        visible={showBlockedUsersModal}
        transparent
        animationType="slide"
        onRequestClose={closeBlockedUsersModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalOverlayTouch}
            activeOpacity={1}
            onPress={closeBlockedUsersModal}
          />
        </View>
        
        <View style={styles.modalContentWrapper}>
          <LinearGradient
            colors={['#1C1D23', '#15151A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.modalContent, { maxHeight: height * 0.7 }]}
          >
            <View style={styles.statusSelectorHandle} />
            <Text style={styles.modalTitle}>Blocked Users</Text>
            
            {blockedUsers.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Feather name="users" size={32} color="#9BA1A6" />
                <Text style={styles.emptyStateText}>No blocked users</Text>
              </View>
            ) : (
              <ScrollView style={styles.blockedUsersList}>
                {blockedUsers.map(user => (
                  <View key={user.id} style={styles.blockedUserItem}>
                    <View style={styles.blockedUserInfo}>
                      <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
                      <Text style={styles.userName}>{user.name}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.unblockButton}
                      onPress={() => unblockUser(user.id, user.name)}
                    >
                      <Text style={styles.unblockButtonText}>Unblock</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.cancelButton, { flex: 1 }]}
                onPress={closeBlockedUsersModal}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" />
      
      <View style={{ height: Platform.OS === 'ios' ? Math.max(15, insets.top - 10) : 10 }} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleBack} 
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Profile</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={{ width: 90 }} />
      </View>
      
      <ScrollableContentContainer 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: 5 }
        ]}
      >
        {renderAccountInformation()}
        {renderSignInSection()}
        {renderUsersSection()}
        {renderShopSection()}

        <SecurityMonitor showDetails={true} />
        <SecuritySettings />

        {renderAccountManagement()}
        
        <View style={{ height: 40 }} />
      </ScrollableContentContainer>
      
      {renderEditModal()}
      {renderPasswordModal()}
      {renderDeleteAccountModal()}
      {renderBlockedUsersModal()}
      
      {showToast && (
        <View style={styles.toast}>
          <LinearGradient
            colors={['rgba(255, 107, 61, 0.9)', 'rgba(255, 107, 61, 0.7)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.toastGradient}
          >
            <Text style={styles.toastText}>{toastMessage}</Text>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 12 : 12,
    marginTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingLeft: 4,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 6,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 5,
    marginTop: 3,
  },
  sectionHeader: {
    color: '#A8B3BD',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  fieldContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  fieldContent: {
    flex: 1,
  },
  fieldWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldIcon: {
    marginRight: 12,
  },
  fieldLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  fieldValue: {
    color: '#9BA1A6',
    fontSize: 14,
  },
  placeholderText: {
    color: '#6E69F4',
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 18,
  },
  badgeContainer: {
    backgroundColor: 'rgba(255, 107, 61, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 10,
  },
  badgeText: {
    color: '#FF6B3D',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutContainer: {
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: '#FF9500',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAccountContainer: {
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  deleteIcon: {
    marginRight: 8,
  },
  deleteAccountText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  statusSelectorHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#3E4148',
    borderRadius: 3,
    alignSelf: 'center',
    marginVertical: 12,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlayTouch: {
    flex: 1,
  },
  modalContentWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    paddingTop: 10,
  },
  modalTitle: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 15,
  },
  modalSubtitle: {
    textAlign: 'center',
    color: '#9BA1A6',
    fontSize: 14,
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#292B31',
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 20,
    paddingHorizontal: 15,
    height: 54,
  },
  input: {
    flex: 1,
    height: 54,
    color: '#FFFFFF',
    fontSize: 16,
  },
  clearButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorMessage: {
    color: '#FF3B30',
    fontSize: 14,
    marginHorizontal: 20,
    marginBottom: 15,
  },
  helperText: {
    color: '#9BA1A6',
    fontSize: 14,
    marginHorizontal: 20,
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 10,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#292B31',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButtonGradient: {
    flex: 1,
    borderRadius: 12,
  },
  saveButton: {
    paddingVertical: 15,
    alignItems: 'center',
    width: '100%',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#292B31',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 54,
  },
  inputSpacer: {
    height: 5,
  },
  fieldRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyStateContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginVertical: 20,
  },
  emptyStateText: {
    color: '#9BA1A6',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  blockedUsersList: {
    maxHeight: 300,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  blockedUserItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 12,
  },
  blockedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  unblockButton: {
    backgroundColor: 'rgba(255, 107, 61, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  unblockButtonText: {
    color: '#FF6B3D',
    fontSize: 14,
    fontWeight: '600',
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  toastGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AccountScreen; 
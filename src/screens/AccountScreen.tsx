import React, { useState, useRef } from 'react';
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
  Animated,
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

const { height } = Dimensions.get('window');

const AccountScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeField, setActiveField] = useState<string | null>(null);
  const [username, setUsername] = useState('omidxvulu');
  const [displayName, setDisplayName] = useState('Amin');
  const [email, setEmail] = useState('vulu@gmail.com');
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
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const passwordSlideAnim = useRef(new Animated.Value(height)).current;
  const passwordFadeAnim = useRef(new Animated.Value(0)).current;
  const blockedUsersSlideAnim = useRef(new Animated.Value(height)).current;
  const blockedUsersFadeAnim = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;

  const handleBack = () => {
    // Navigate specifically to the profile page
    router.push('/(main)/profile');
  };

  const handleMenuPress = () => {
    Alert.alert('Menu', 'Menu options will be displayed here');
  };

  const openEditModal = (field: string, currentValue: string) => {
    setFieldType(field);
    setEditValue(currentValue);
    setErrorMessage('');
    setModalVisible(true);
    
    // Start animations
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };
  
  const closeModal = () => {
    // Run closing animations
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Only hide the modal after animations complete
      setModalVisible(false);
    });
  };

  const validateField = () => {
    if (fieldType === 'username') {
      // Validate username
      if (editValue.length < 3) {
        setErrorMessage('Username must be at least 3 characters');
        return false;
      }
      
      if (!/^[a-zA-Z0-9_]+$/.test(editValue)) {
        setErrorMessage('Please only use numbers, letters, underscores _');
        return false;
      }
    } else if (fieldType === 'email') {
      // Simple email validation
      if (!/\S+@\S+\.\S+/.test(editValue)) {
        setErrorMessage('Please enter a valid email address');
        return false;
      }
    } else if (fieldType === 'phone') {
      // Simple phone validation - allow empty value for phone (to delete it)
      if (editValue && !/^\d{10,12}$/.test(editValue.replace(/[^0-9]/g, ''))) {
        setErrorMessage('Please enter a valid phone number');
        return false;
      }
    }
    
    return true;
  };

  const saveChanges = () => {
    if (validateField()) {
      if (fieldType === 'username') {
        setUsername(editValue);
      } else if (fieldType === 'displayName') {
        setDisplayName(editValue);
      } else if (fieldType === 'email') {
        setEmail(editValue);
      } else if (fieldType === 'phone') {
        // Allow saving empty phone value
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
    
    // Start animations
    Animated.parallel([
      Animated.timing(passwordSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(passwordFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };
  
  const closePasswordModal = () => {
    // Run closing animations
    Animated.parallel([
      Animated.timing(passwordSlideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(passwordFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Only hide the modal after animations complete
      setShowPasswordModal(false);
    });
  };
  
  const validatePassword = () => {
    // Check if current password is correct (this is just a mock)
    if (currentPassword !== 'password123') {
      setPasswordError('Current password is incorrect');
      return false;
    }
    
    // Check if new password is strong enough
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return false;
    }
    
    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return false;
    }
    
    return true;
  };
  
  const changePassword = () => {
    if (validatePassword()) {
      // Here you would update the password in your backend
      Alert.alert(
        'Success',
        'Your password has been updated successfully',
        [{ text: 'OK', onPress: closePasswordModal }]
      );
    }
  };

  const openBlockedUsersModal = () => {
    setShowBlockedUsersModal(true);
    
    // Start animations
    Animated.parallel([
      Animated.timing(blockedUsersSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(blockedUsersFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };
  
  const closeBlockedUsersModal = () => {
    // Run closing animations
    Animated.parallel([
      Animated.timing(blockedUsersSlideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(blockedUsersFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowBlockedUsersModal(false);
    });
  };
  
  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    
    // Animate toast in
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowToast(false);
    });
  };

  const unblockUser = (userId: string, userName: string) => {
    // Show confirmation alert before unblocking
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
            // Remove user from blocked list
            setBlockedUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
            
            // Show success message
            showToastMessage(`${userName} has been unblocked`);
            
            setTimeout(() => {
              if (blockedUsers.length === 1) {
                // Close modal if this was the last blocked user
                closeBlockedUsersModal();
              }
            }, 300);
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    // Show a serious confirmation alert for account deletion
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
            // Show second confirmation for extra safety
            Alert.alert(
              'Permanently Delete Account',
              'Please confirm that you want to permanently delete your account. This action is irreversible.',
              [
                {
                  text: 'No, Keep My Account',
                  style: 'cancel'
                },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: () => {
                    // Set loading state
                    setIsDeleting(true);
                    
                    // Simulate API call to delete account
                    setTimeout(() => {
                      // Here you would call your API to delete the account
                      setIsDeleting(false);
                      showToastMessage('Your account has been deleted');
                      
                      // Navigate away after a short delay
                      setTimeout(() => {
                        router.replace('/');
                      }, 1500);
                    }, 2000); // Simulate network delay
                  }
                }
              ]
            );
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
        animationType="none"
        onRequestClose={closeModal}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { opacity: fadeAnim }
          ]}
        >
          <TouchableOpacity 
            style={styles.modalOverlayTouch}
            activeOpacity={1}
            onPress={closeModal}
          />
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.modalContentWrapper,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['#1C1D23', '#15151A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
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
              
              {fieldType === 'phone' && phone ? (
                <TouchableOpacity 
                  style={styles.clearPhoneButton}
                  onPress={() => setEditValue('')}
                >
                  <Text style={styles.clearPhoneButtonText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
              
              <LinearGradient
                colors={!editValue && fieldType !== 'phone' ? ['rgba(110, 105, 244, 0.5)', 'rgba(110, 105, 244, 0.5)'] : ['#6E69F4', '#5865F2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.saveButtonGradient, 
                  fieldType === 'phone' && phone ? { flex: 1 } : { flex: 1 }
                ]}
              >
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={saveChanges}
                  disabled={!editValue && fieldType !== 'phone'}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </LinearGradient>
        </Animated.View>
      </Modal>
    );
  };

  const renderPasswordModal = () => {
    return (
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="none"
        onRequestClose={closePasswordModal}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { opacity: passwordFadeAnim }
          ]}
        >
          <TouchableOpacity 
            style={styles.modalOverlayTouch}
            activeOpacity={1}
            onPress={closePasswordModal}
          />
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.modalContentWrapper,
            {
              transform: [{ translateY: passwordSlideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['#1C1D23', '#15151A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.statusSelectorHandle} />
            <Text style={styles.modalTitle}>Update Password</Text>

            {/* Current Password Input */}
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

            {/* New Password Input */}
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

            {/* Confirm New Password Input */}
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
        </Animated.View>
      </Modal>
    );
  };

  const renderBlockedUsersModal = () => {
    return (
      <Modal
        visible={showBlockedUsersModal}
        transparent
        animationType="none"
        onRequestClose={closeBlockedUsersModal}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { opacity: blockedUsersFadeAnim }
          ]}
        >
          <TouchableOpacity 
            style={styles.modalOverlayTouch}
            activeOpacity={1}
            onPress={closeBlockedUsersModal}
          />
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.modalContentWrapper,
            {
              transform: [{ translateY: blockedUsersSlideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['#1C1D23', '#15151A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.modalContent, { maxHeight: height * 0.7 }]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
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
        </Animated.View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" />
      
      {/* Safe area spacer to handle notch and dynamic island */}
      <View style={{ height: Platform.OS === 'ios' ? Math.max(15, insets.top - 10) : 10 }} />
      
      {/* Header with title */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleBack} 
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Profile</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={{ width: 90 }} /> {/* Empty view for balance */}
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
        {renderAccountManagement()}
        
        {/* Bottom padding for scrolling */}
        <View style={{ height: 40 }} />
      </ScrollableContentContainer>
      
      {renderEditModal()}
      {renderPasswordModal()}
      {renderBlockedUsersModal()}
      
      {/* Toast notification */}
      {showToast && (
        <Animated.View 
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [{ 
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                }) 
              }]
            }
          ]}
        >
          <LinearGradient
            colors={['rgba(255, 107, 61, 0.9)', 'rgba(255, 107, 61, 0.7)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.toastGradient}
          >
            <Text style={styles.toastText}>{toastMessage}</Text>
          </LinearGradient>
        </Animated.View>
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
  clearPhoneButton: {
    flex: 0.8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginLeft: 8,
  },
  clearPhoneButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '500',
  },
  // Add these styles for better password input fields spacing
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
  // Toast styles
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
import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StatusBar,
  Platform,
  Modal,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import BackButton from '../components/BackButton';
import MenuButton from '../components/MenuButton';
import ScrollableContentContainer from '../components/ScrollableContentContainer';

const { height } = Dimensions.get('window');

const AccountScreen = () => {
  const navigation = useNavigation();
  const [activeField, setActiveField] = useState<string | null>(null);
  const [username, setUsername] = useState('omidxvulu');
  const [displayName, setDisplayName] = useState('Amin');
  const [email, setEmail] = useState('vulu@gmail.com');
  const [phone, setPhone] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [fieldType, setFieldType] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleBack = () => {
    navigation.goBack();
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
      // Simple phone validation
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
        setPhone(editValue);
      }
      
      closeModal();
    }
  };

  const renderAccountInformation = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Account Information</Text>

        <TouchableOpacity 
          style={styles.fieldContainer}
          onPress={() => openEditModal('username', username)}
        >
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Username</Text>
            <Text style={styles.fieldValue}>{username}</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#8E8E93" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.fieldContainer}
          onPress={() => openEditModal('displayName', displayName)}
        >
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Display Name</Text>
            <Text style={styles.fieldValue}>{displayName}</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#8E8E93" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.fieldContainer}
          onPress={() => openEditModal('email', email)}
        >
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValue}>{email}</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#8E8E93" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.fieldContainer}
          onPress={() => openEditModal('phone', phone)}
        >
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <Text style={styles.fieldValue}>{phone || 'Add phone number'}</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSignInSection = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>How you sign into your account</Text>

        <TouchableOpacity style={styles.fieldContainer}>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Password</Text>
            <Text style={styles.fieldValue}>••••••••</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderUsersSection = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Users</Text>

        <TouchableOpacity style={styles.fieldContainer}>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Blocked User</Text>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderShopSection = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Shop</Text>

        <TouchableOpacity style={styles.fieldContainer}>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Restore Purchases</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderAccountManagement = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Account Management</Text>

        <TouchableOpacity style={styles.deleteAccountContainer}>
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>
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
          <View 
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <BackButton onPress={closeModal} />
              <Text style={styles.modalTitle}>{title}</Text>
            </View>

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
              
              <TouchableOpacity 
                style={[styles.saveButton, !editValue ? styles.saveButtonDisabled : null]}
                onPress={saveChanges}
                disabled={!editValue}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Top Bar */}
      <View style={styles.topBar}>
        <BackButton onPress={handleBack} label="Profile" />
        <Text style={styles.topBarTitle}>Account</Text>
        <MenuButton onPress={handleMenuPress} color="#6C5CE7" />
      </View>
      
      <ScrollableContentContainer 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1D23',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  topBar: {
    height: Platform.OS === 'ios' ? 91 : 70,
    backgroundColor: '#1C1D23',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 44 : 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 57, 65, 0.5)',
  },
  topBarTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    paddingTop: Platform.OS === 'ios' ? 44 : 10,
  },
  section: {
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: 5,
  },
  sectionHeader: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  fieldContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#272A33',
    borderRadius: 12,
    marginBottom: 10,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  fieldValue: {
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 2,
  },
  badgeContainer: {
    backgroundColor: '#5865F2',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteAccountContainer: {
    padding: 15,
    backgroundColor: '#272A33',
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteAccountText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: '#1C1D23',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    paddingTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 57, 65, 0.5)',
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginRight: 40, // Balance with back button
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#272A33',
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
    color: '#8E8E93',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#5865F2',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(88, 101, 242, 0.5)',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AccountScreen; 
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Keyboard,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AuthColors } from './AuthDesignSystem';
import { Country, COUNTRIES, getDefaultCountry, searchCountries } from '../../data/countries';

interface CountryCodeSelectorProps {
  selectedCountry: Country;
  onCountrySelect: (country: Country) => void;
  disabled?: boolean;
  style?: any;
}

export const CountryCodeSelector: React.FC<CountryCodeSelectorProps> = ({
  selectedCountry,
  onCountrySelect,
  disabled = false,
  style,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);

  // Initialize filtered countries
  useEffect(() => {
    setFilteredCountries(searchCountries(searchQuery));
  }, [searchQuery]);

  const handleCountrySelect = (country: Country) => {
    onCountrySelect(country);
    setIsModalVisible(false);
    setSearchQuery('');
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setSearchQuery('');
    Keyboard.dismiss();
  };

  const renderCountryItem = ({ item }: { item: Country }) => (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={() => handleCountrySelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.countryItemContent}>
        <Text style={styles.countryFlag}>{item.flag}</Text>
        <View style={styles.countryInfo}>
          <Text style={styles.countryName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.countryCode}>{item.dialCode}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const keyExtractor = (item: Country) => item.iso2;

  return (
    <>
      {/* Country Code Selector Button */}
      <TouchableOpacity
        style={[styles.selectorButton, disabled && styles.selectorButtonDisabled, style]}
        onPress={() => !disabled && setIsModalVisible(true)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <View style={styles.selectorContent}>
          <Text style={styles.selectedFlag}>{selectedCountry.flag}</Text>
          <Text style={styles.selectedCode}>{selectedCountry.dialCode}</Text>
          <Feather 
            name="chevron-down" 
            size={16} 
            color={disabled ? AuthColors.mutedText : AuthColors.secondaryText} 
          />
        </View>
      </TouchableOpacity>

      {/* Country Selection Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleModalClose}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleModalClose}
              activeOpacity={0.7}
            >
              <Feather name="x" size={24} color={AuthColors.primaryText} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Country</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Feather name="search" size={20} color={AuthColors.mutedText} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search countries..."
                placeholderTextColor={AuthColors.mutedText}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                  activeOpacity={0.7}
                >
                  <Feather name="x-circle" size={18} color={AuthColors.mutedText} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Countries List */}
          <FlatList
            data={filteredCountries}
            renderItem={renderCountryItem}
            keyExtractor={keyExtractor}
            style={styles.countriesList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
            getItemLayout={(data, index) => ({
              length: 64,
              offset: 64 * index,
              index,
            })}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Selector Button Styles
  selectorButton: {
    backgroundColor: AuthColors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AuthColors.inputBorder,
    paddingHorizontal: 12,
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: 'center',
    minWidth: 100,
  },
  selectorButtonDisabled: {
    opacity: 0.5,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedFlag: {
    fontSize: 18,
    marginRight: 6,
  },
  selectedCode: {
    color: AuthColors.primaryText,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AuthColors.divider,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: AuthColors.primaryText,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },

  // Search Styles
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AuthColors.divider,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AuthColors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AuthColors.inputBorder,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    color: AuthColors.primaryText,
    fontSize: 16,
    marginLeft: 8,
    paddingVertical: 10,
  },
  clearButton: {
    padding: 4,
  },

  // Countries List Styles
  countriesList: {
    flex: 1,
  },
  countryItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AuthColors.divider,
    height: 64,
    justifyContent: 'center',
  },
  countryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
    textAlign: 'center',
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '500',
    color: AuthColors.primaryText,
    marginBottom: 2,
  },
  countryCode: {
    fontSize: 14,
    color: AuthColors.mutedText,
  },
});

// Hook for managing country selection with default
export const useCountrySelection = () => {
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => getDefaultCountry());

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
  };

  return {
    selectedCountry,
    handleCountrySelect,
  };
};

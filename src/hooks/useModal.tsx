import { useState, useCallback } from 'react';

export type ModalButtonType = 'default' | 'cancel' | 'destructive' | 'confirm';

export interface ModalButton {
  text: string;
  type?: ModalButtonType;
  onPress: () => void;
}

export interface ModalConfig {
  title: string;
  message: string;
  buttons: ModalButton[];
  icon?: {
    name: string;
    color?: string;
    background?: string;
  };
  gemInfo?: {
    currentBalance: number;
    cost: number;
  };
}

export const useModal = () => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<ModalConfig | null>(null);

  const showModal = useCallback((modalConfig: ModalConfig) => {
    setConfig(modalConfig);
    setVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setVisible(false);
  }, []);

  // Helper for confirmation modals (Yes/No, OK/Cancel, etc.)
  const showConfirmation = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    icon?: ModalConfig['icon']
  ) => {
    const buttons: ModalButton[] = [
      {
        text: cancelText,
        type: 'cancel',
        onPress: onCancel || (() => {})
      },
      {
        text: confirmText,
        type: 'confirm',
        onPress: onConfirm
      }
    ];

    showModal({
      title,
      message,
      buttons,
      icon
    });
  }, [showModal]);

  // Helper specifically for purchase confirmations
  const showPurchaseConfirmation = useCallback((
    title: string,
    message: string,
    gemCost: number,
    currentGemBalance: number,
    onConfirmPurchase: () => void,
    onCancel?: () => void,
    confirmText = 'Purchase',
    cancelText = 'Cancel'
  ) => {
    const buttons: ModalButton[] = [
      {
        text: cancelText,
        type: 'cancel',
        onPress: onCancel || (() => {})
      },
      {
        text: confirmText,
        type: 'destructive',
        onPress: onConfirmPurchase
      }
    ];

    showModal({
      title,
      message,
      buttons,
      icon: {
        name: 'diamond',
        background: '#B768FB'
      },
      gemInfo: {
        currentBalance: currentGemBalance,
        cost: gemCost
      }
    });
  }, [showModal]);

  // Helper for success messages
  const showSuccess = useCallback((
    title: string,
    message: string,
    onOk?: () => void,
    okText = 'OK'
  ) => {
    const buttons: ModalButton[] = [
      {
        text: okText,
        type: 'confirm',
        onPress: onOk || (() => {})
      }
    ];

    showModal({
      title,
      message,
      buttons,
      icon: {
        name: 'check-circle',
        background: '#4CAF50' // Green for success
      }
    });
  }, [showModal]);

  // Helper for error messages
  const showError = useCallback((
    title: string,
    message: string,
    onOk?: () => void,
    okText = 'OK'
  ) => {
    const buttons: ModalButton[] = [
      {
        text: okText,
        type: 'confirm',
        onPress: onOk || (() => {})
      }
    ];

    showModal({
      title,
      message,
      buttons,
      icon: {
        name: 'error',
        background: '#F23535' // Red for error
      }
    });
  }, [showModal]);

  return {
    visible,
    config,
    showModal,
    hideModal,
    showConfirmation,
    showPurchaseConfirmation,
    showSuccess,
    showError
  };
};

export default useModal; 
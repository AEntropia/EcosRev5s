//src\screens\QRCodeScannerScreen.js
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../contexts/ThemeContext';
import { useFontSettings } from '../contexts/FontContext';
import CustomAlert from '../components/CustomAlert';
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { API_URL, API_BASE_URL } from "@env";

export default function QRCodeScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [scannedData, setScannedData] = useState("");
  const theme = useTheme();
  const { fontSize, fontFamily } = useFontSettings();
  const [token, setToken] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    AsyncStorage.getItem('token').then(setToken);
  }, []);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.permissionText, { color: theme.colors.text.primary, fontSize: fontSize.md, fontFamily }]}>
          Precisamos de permissão para usar a câmera
        </Text>
        <Button
          onPress={requestPermission}
          title="Permitir Câmera"
          color={theme.colors.primary}
        />
      </View>
    );
  }

  const fetchUserPoints = async () => {
    if (!token) return 0;

    try {
      const response = await axios.get(`${API_URL}/usuario/pontos`, {
        headers: { "access-token": token }
      });

      if (response.data && response.data.length > 0) {
        return response.data[0].pontos;
      }
    } catch (error) {
      console.error("Error fetching user points:", error);
    }

    return 0;
  };

  const updateUserPoints = async (pontos, hash) => {
    if (!token) return;

    const currentPoints = await fetchUserPoints();
    const newPoints = currentPoints + pontos;

    await axios.put(
      `${API_URL}/usuario/pontos`,
      { pontos: newPoints },
      { headers: { "access-token": token } }
    );

    await fetch(`${API_BASE_URL}/hist/pontos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        _id: await AsyncStorage.getItem('user'),
        pontos: pontos,
        hash: hash,
      }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro na requisição: ' + response.status);
        }
        return response.json();
      })
      .then(data => {
        console.log('Resposta:', data);
      })
      .catch(error => {
        console.error('Erro:', error);
      });
  };



  const handleBarCodeScanned = async ({ data }) => {
    try {
      const parsedData = JSON.parse(data);
      setScanned(true);
      setScannedData(parsedData); // mantenha como objeto

      console.log(parsedData.hash);
      console.log(parsedData.pontos);

      await updateUserPoints(parsedData.pontos, parsedData.hash);
      setAlertVisible(true);
    } catch (error) {
      console.error("Erro ao processar QR Code:", error);
    }
  };



  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <CameraView
        style={styles.camera}
        facing="back"
        barCodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Text style={[styles.overlayText, { fontSize: fontSize.md, fontFamily, color: theme.colors.text.primary }]}>
            Posicione o QR Code dentro da área
          </Text>
        </View>
      </CameraView>

      <CustomAlert
        visible={alertVisible}
        title="QR Code Escaneado"
        message={`Você recebeu ${scannedData.pontos} pontos!`}
        onClose={() => {
          setAlertVisible(false);
          setScanned(false);
          navigation.navigate('Main', { screen: 'HomeTab' });
        }}
        onConfirm={() => {
          setAlertVisible(false);
          setScanned(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    fontWeight: 'bold',
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: 20,
  },
});
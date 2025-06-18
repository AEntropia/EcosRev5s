import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Gift, Ticket } from "lucide-react-native";
import { useTheme } from "../contexts/ThemeContext";
import { useFontSettings } from "../contexts/FontContext";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomAlert from "../components/CustomAlert";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback } from 'react';
import { API_URL} from "@env";


const BenefitsScreen = () => {
  const [userPoints, setUserPoints] = useState(0);
  const [benefits, setBenefits] = useState([]);
  const [alertVisible, setAlertVisible] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const { fontSize } = useFontSettings();
  const route = useRoute();
  useEffect(() => {
    if (route.params?.refresh) {
      fetchUserPoints();
    }
  }, [route.params?.refresh]);

  const getToken = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      return token;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  };

  const fetchUserPoints = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await axios.get(`${API_URL}/usuario/pontos`, {
        headers: { "access-token": token }
      });

      if (response.data && response.data.length > 0) {
        setUserPoints(response.data[0].pontos);
      }
    } catch (error) {
      console.error("Error fetching user points:", error);
    }
  };

  const fetchBenefits = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await axios.get(`${API_URL}/beneficio`, {
        headers: { "access-token": token }
      });

      // Filter benefits to only show those with quantity > 0
      const availableBenefits = response.data.filter(benefit => benefit.quantidade > 0);
      setBenefits(availableBenefits);
    } catch (error) {
      console.error("Error fetching benefits:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        await fetchUserPoints();
        await fetchBenefits();
      };
      loadData();
    }, [])
  );


  const handleRedeemBenefit = (benefit) => {
    if (userPoints >= benefit.pontos) {
      setSelectedBenefit(benefit);
      setIsError(false);
      setAlertVisible(true);
    } else {
      setSelectedBenefit({
        nome: "Pontos Insuficientes",
        endereco: "Você não tem pontos suficientes para este benefício."
      });
      setIsError(true);
      setAlertVisible(true);
    }
  };

  const confirmRedeem = async () => {
    console.log(selectedBenefit)
    // If it's just an informational alert (error or success), simply close it
    try {
      const response = await axios.post(
        `${API_URL}/hist/transacoes`,
        {
          idUser: await AsyncStorage.getItem('user'),
          points: selectedBenefit.pontos,
          description: selectedBenefit.nome
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Resposta:', response.data);
    } catch (error) {
      console.error('Erro:', error);
    }
    if (isError || (selectedBenefit && selectedBenefit.nome === "Resgate Concluído")) {
      setAlertVisible(false);
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      // 1. Update user points (subtract benefit points)
      const newPoints = userPoints - selectedBenefit.pontos;
      await axios.put(
        `${API_URL}/usuario/pontos`,
        { pontos: newPoints },
        { headers: { "access-token": token } }
      );

      // 2. Update benefit quantity (decrement by 1)
      const newQuantity = selectedBenefit.quantidade - 1;
      await axios.put(
        `${API_URL}/beneficio/resgate`,
        {
          _id: selectedBenefit._id,
          quantidade: newQuantity
        },
        { headers: { "access-token": token } }
      );

      // 3. Update local state
      setUserPoints(newPoints);

      // 4. Refresh benefits list
      await fetchBenefits();

      // 5. Close the current alert
      setAlertVisible(false);

      // 6. Show success message after a short delay
      setTimeout(() => {
        setSelectedBenefit({
          nome: "Resgate Concluído",
          endereco: `Você resgatou: ${selectedBenefit.nome} com sucesso!`
        });
        setIsError(false);
        setAlertVisible(true);
      }, 300);
    } catch (error) {
      console.error("Error redeeming benefit:", error);
      setSelectedBenefit({
        nome: "Erro no Resgate",
        endereco: "Ocorreu um erro ao resgatar o benefício. Tente novamente mais tarde."
      });
      setIsError(true);
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // Texto personalizado para o alerta
  const getAlertMessage = () => {
    if (isError) {
      return selectedBenefit?.endereco;
    }
    if (selectedBenefit?.nome === "Resgate Concluído") {
      return selectedBenefit?.endereco;
    }
    return `Deseja resgatar: ${selectedBenefit?.nome}? Serão utilizados ${selectedBenefit?.pontos} pontos.`;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 10, color: theme.colors.text.primary }}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.headerContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.pointsHeader}>
          <Gift color={theme.colors.primary} size={24} />
          <Text style={[styles.pointsText, { color: theme.colors.text.primary, fontSize: fontSize.lg }]}>Seus Pontos: </Text>
          <Text style={[styles.pointsText, { color: theme.colors.info, fontSize: fontSize.lg }]}>{userPoints}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollViewContent, { marginTop: 10 }]} showsVerticalScrollIndicator={false}>
        {benefits.length > 0 ? (
          benefits.map((benefit) => (
            <TouchableOpacity
              key={benefit._id}
              style={[styles.benefitCard, { backgroundColor: theme.colors.surface }]}
              onPress={() => handleRedeemBenefit(benefit)}
            >
              <View style={styles.benefitDetails}>
                <Text style={[styles.benefitTitle, { color: theme.colors.text.primary, fontSize: fontSize.md }]}>{benefit.nome}</Text>
                <Text style={[styles.benefitDescription, { color: theme.colors.text.secondary, fontSize: fontSize.sm }]}>{benefit.endereco}</Text>
                <View style={styles.pointsContainer}>
                  <Ticket color={theme.colors.info} size={20} />
                  <Text style={[styles.benefitPoints, { color: theme.colors.info, fontWeight: "bold", fontSize: fontSize.sm }]}>{benefit.pontos} pontos</Text>
                </View>
                <Text style={[styles.quantity, { color: theme.colors.text.secondary, fontSize: fontSize.xs }]}>Disponíveis: {benefit.quantidade}</Text>
              </View>
              <TouchableOpacity
                style={[styles.redeemButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => handleRedeemBenefit(benefit)}
              >
                <Text style={[styles.redeemButtonText, { color: theme.colors.text.inverse, fontWeight: "bold", fontSize: fontSize.sm }]}>Resgatar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
              Não há benefícios disponíveis no momento.
            </Text>
          </View>
        )}
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        onConfirm={
          isError || selectedBenefit?.nome === "Resgate Concluído"
            ? () => setAlertVisible(false)
            : confirmRedeem
        }
        title={
          isError || selectedBenefit?.nome === "Resgate Concluído"
            ? selectedBenefit?.nome
            : "Confirmar Resgate"
        }
        message={getAlertMessage()}
        confirmText={
          isError || selectedBenefit?.nome === "Resgate Concluído"
            ? "Ok"
            : "Resgatar"
        }
        cancelText="Cancelar"
        confirmColor={isError ? theme.colors.info : theme.colors.primary}
        showCancelButton={
          !(isError || selectedBenefit?.nome === "Resgate Concluído")
        }
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { paddingVertical: 15, paddingHorizontal: 20 },
  pointsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  pointsText: { marginLeft: 10, fontWeight: "bold" },
  scrollViewContent: { paddingVertical: 20, paddingHorizontal: 15 },
  benefitCard: { borderRadius: 10, marginBottom: 15, flexDirection: "row", alignItems: "center", padding: 15 },
  benefitDetails: { flex: 1 },
  benefitTitle: { fontWeight: "bold" },
  benefitDescription: { marginTop: 5 },
  pointsContainer: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  benefitPoints: { marginLeft: 5, fontWeight: "bold" },
  quantity: { marginTop: 5, fontStyle: "italic" },
  redeemButton: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 5 },
  redeemButtonText: { fontWeight: "bold" },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { textAlign: 'center', fontSize: 16 },
});

export default BenefitsScreen;
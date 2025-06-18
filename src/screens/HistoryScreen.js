//src\screens\HistoryScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, SectionList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useFontSettings } from '../contexts/FontContext';
import { ArrowUp, ArrowDown } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_URL } from "@env";
import axios from 'axios';

// Você precisa definir sua URL base da AP; // Substitua pela sua URL

const groupByMonth = (data) => {
  const grouped = {};

  data.forEach((item) => {
    const dateStr = item.date.split(',')[0]; // Pega apenas a data, sem a hora
    const [day, month, year] = dateStr.split('/');
    const key = `${month}/${year}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });

  return Object.keys(grouped)
    .sort((a, b) => {
      const [monthA, yearA] = a.split('/').map(Number);
      const [monthB, yearB] = b.split('/').map(Number);
      
      if (yearA !== yearB) return yearB - yearA;
      return monthB - monthA;
    })
    .map((key) => ({
      title: key,
      total: grouped[key].reduce((acc, item) => {
        // Para transações, considera como débito (negativo)
        const pointsValue = item.tipo === 'transacao' ? -Math.abs(parseInt(item.points)) : parseInt(item.points);
        return acc + pointsValue;
      }, 0),
      data: grouped[key].sort((a, b) => {
        // Ordenar por data e hora completa (mais recente primeiro)
        const parseDateTime = (dateTimeStr) => {
          const [datePart, timePart] = dateTimeStr.split(', ');
          const [day, month, year] = datePart.split('/');
          const [hours, minutes, seconds] = timePart.split(':');
          return new Date(year, month - 1, day, hours, minutes, seconds);
        };
        
        const dateA = parseDateTime(a.date);
        const dateB = parseDateTime(b.date);
        return dateB - dateA; // Mais recente primeiro
      }),
    }));
};

const HistoryScreen = ({ route }) => {
  const theme = useTheme();
  const { fontSize } = useFontSettings();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Você pode receber o idUser via route params ou context
  const { idUser } = route?.params || { idUser: 'default-user-id' };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Atualiza automaticamente quando a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/hist/${await AsyncStorage.getItem("user")}`);

      if (response.status !== 200) {
        throw new Error('Erro ao buscar histórico');
      }
      const data = await response.data;
      setHistory(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico. Tente novamente.');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const sections = groupByMonth(history);

  const renderItem = ({ item }) => {
    const isTransaction = item.tipo === 'transacao';
    
    // Para transações, os pontos são sempre negativos (débito)
    // Para pontos, mantém o valor original (crédito)
    const pointsValue = isTransaction ? -Math.abs(parseInt(item.points)) : parseInt(item.points);
    const isNegative = pointsValue < 0;

    return (
      <View
        style={[
          styles.transactionCard,
          { backgroundColor: theme.colors.surface }
        ]}
        testID={`transaction-item-${item.id}`}
      >
        <View style={styles.transactionHeader}>
          <Text
            style={[
              styles.benefitName, 
              { 
                color: theme.colors.text.primary, 
                fontSize: fontSize.md 
              }
            ]}
            numberOfLines={2}
            testID={`transaction-benefit-${item.id}`}
          >
            {isTransaction ? item.description : 'Crédito de Pontos'}
          </Text>
          <View style={styles.pointsContainer}>
            {isNegative ? (
              <ArrowDown color={theme.colors.error} size={16} />
            ) : (
              <ArrowUp color={theme.colors.success} size={16} />
            )}
            <Text
              style={[
                styles.points,
                { 
                  color: isNegative ? theme.colors.error : theme.colors.success, 
                  fontSize: fontSize.md 
                }
              ]}
              testID={`transaction-points-${item.id}`}
            >
              {pointsValue > 0 ? '+' : ''}{pointsValue} pts
            </Text>
          </View>
        </View>
        <View style={styles.transactionFooter}>
          <Text
            style={[
              styles.date, 
              { 
                color: theme.colors.text.secondary, 
                fontSize: fontSize.xs 
              }
            ]}
            testID={`transaction-date-${item.id}`}
          >
            {item.date.split(',')[0]} {/* Remove a hora, mostra apenas a data */}
          </Text>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section: { title, total } }) => {
    return (
      <View style={styles.sectionHeaderContainer}>
        <Text style={[
          styles.sectionHeader, 
          { 
            color: theme.colors.text.primary, 
            fontSize: fontSize.md 
          }
        ]}>
          {title}
        </Text>
        <Text
          style={[
            styles.sectionTotal,
            { 
              color: total < 0 ? theme.colors.error : theme.colors.success, 
              fontSize: fontSize.sm 
            }
          ]}
        >
          Total: {total > 0 ? '+' : ''}{total} pts
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[
          styles.loadingText, 
          { 
            color: theme.colors.text.secondary, 
            fontSize: fontSize.sm,
            marginTop: 12
          }
        ]}>
          Carregando histórico...
        </Text>
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[
          styles.emptyText, 
          { 
            color: theme.colors.text.secondary, 
            fontSize: fontSize.md 
          }
        ]}>
          Nenhum histórico encontrado
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.tipo}-${item.id}`}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        testID="transaction-list"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  sectionHeader: {
    fontWeight: 'bold',
  },
  sectionTotal: {
    fontWeight: 'bold',
  },
  transactionCard: {
    padding: 16,
    borderRadius: 0,
    marginBottom: 0,
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  benefitName: {
    fontWeight: '400',
    flex: 1,
    marginRight: 12,
    lineHeight: 20,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  points: {
    fontWeight: '600',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  date: {
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});

export default HistoryScreen;
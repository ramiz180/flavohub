import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>FlavoHub</Text>
      <Text style={styles.tagline}>Fresh Food Delivered Fast</Text>
      <ActivityIndicator color="#F58220" size="large" style={styles.indicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: { fontSize: 28, fontWeight: '800', color: '#F58220' },
  tagline: { fontSize: 14, color: '#687280', marginTop: 8 },
  indicator: { marginTop: 32 },
});

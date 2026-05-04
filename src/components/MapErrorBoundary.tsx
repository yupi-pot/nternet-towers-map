import * as Sentry from '@sentry/react-native';
import React, { ReactNode } from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props extends WithTranslation {
  children: ReactNode;
  onReset: () => void;
}

interface State {
  hasError: boolean;
}

class MapErrorBoundaryInner extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    Sentry.captureException(error);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      return (
        <View style={styles.container}>
          <Text style={styles.title}>{t('errors.somethingWentWrong')}</Text>
          <Text style={styles.subtitle}>{t('errors.mapEncounteredError')}</Text>
          <TouchableOpacity style={styles.btn} onPress={this.handleReset} activeOpacity={0.8}>
            <Text style={styles.btnText}>{t('errors.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export const MapErrorBoundary = withTranslation()(MapErrorBoundaryInner);

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc' },
  title: { fontSize: 17, fontWeight: '700', color: '#1c1c1e' },
  subtitle: { fontSize: 14, color: '#64748b' },
  btn: { marginTop: 4, backgroundColor: '#1c1c1e', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24 },
  btnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

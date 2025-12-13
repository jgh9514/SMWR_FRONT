'use client';

import { Component, ReactNode } from 'react';
import { Box, Button, Card, CardContent, Container, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
                오류가 발생했습니다
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {this.state.error?.message || '예상치 못한 오류가 발생했습니다.'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button variant="contained" onClick={this.handleReset}>
                  다시 시도
                </Button>
                <Button variant="outlined" onClick={() => window.location.reload()}>
                  페이지 새로고침
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Container>
      );
    }

    return this.props.children;
  }
}


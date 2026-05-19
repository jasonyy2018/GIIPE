'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Only log errors that are not from browser extensions
    if (
      error.message &&
      !error.message.includes('chrome-extension://') &&
      !error.message.includes('moz-extension://') &&
      !error.stack?.includes('chrome-extension://') &&
      !error.stack?.includes('moz-extension://')
    ) {
      console.error('Application error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return null; // Or return a fallback UI
    }

    return this.props.children;
  }
}


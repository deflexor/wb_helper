import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type Props = {
  children: ReactNode
  fallbackTitle?: string
}

type State = {
  error: Error | null
}

export class ToolErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ToolErrorBoundary', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <Alert variant="destructive">
          <AlertTitle>
            {this.props.fallbackTitle ?? 'Something went wrong'}
          </AlertTitle>
          <AlertDescription>{this.state.error.message}</AlertDescription>
        </Alert>
      )
    }
    return this.props.children
  }
}

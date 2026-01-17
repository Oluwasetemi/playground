import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PlaygroundHeader } from './PlaygroundHeader'
import * as PlaygroundContext from '../context/PlaygroundContext'

// Mock the context
vi.mock('../context/PlaygroundContext', () => ({
  usePlaygroundContext: vi.fn(),
}))

describe('playgroundHeader', () => {
  const mockContext = {
    status: 'ready' as const,
    toggleLineNumbers: vi.fn(),
    formatCode: vi.fn(),
    resetCode: vi.fn(),
    openInStackBlitz: vi.fn(),
    showLineNumbers: true,
    engine: null,
    files: [],
    previewUrl: null,
    updateFile: vi.fn(),
    openFile: vi.fn(),
    saveSnapshot: vi.fn(),
    consoleMessages: [],
    clearConsole: vi.fn(),
    template: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(PlaygroundContext.usePlaygroundContext).mockReturnValue(mockContext)
  })

  describe('rendering', () => {
    it('should render the title', () => {
      render(<PlaygroundHeader title="My Playground" />)

      expect(screen.getByText('My Playground')).toBeInTheDocument()
    })

    it('should render default title when not provided', () => {
      render(<PlaygroundHeader />)

      expect(screen.getByText('Playground')).toBeInTheDocument()
    })

    it('should render all action buttons', () => {
      render(<PlaygroundHeader />)

      expect(screen.getByTitle('Toggle line numbers')).toBeInTheDocument()
      expect(screen.getByTitle('Format code')).toBeInTheDocument()
      expect(screen.getByTitle('Reset to original')).toBeInTheDocument()
      expect(screen.getByTitle('Open in StackBlitz')).toBeInTheDocument()
    })

    it('should render sidebar toggle when onToggleSidebar is provided', () => {
      const onToggleSidebar = vi.fn()
      render(<PlaygroundHeader onToggleSidebar={onToggleSidebar} />)

      expect(screen.getByTitle('Hide sidebar')).toBeInTheDocument()
    })

    it('should not render sidebar toggle when onToggleSidebar is not provided', () => {
      render(<PlaygroundHeader />)

      expect(screen.queryByTitle('Hide sidebar')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Show sidebar')).not.toBeInTheDocument()
    })
  })

  describe('button states', () => {
    it('should disable buttons when status is not ready', () => {
      vi.mocked(PlaygroundContext.usePlaygroundContext).mockReturnValue({
        ...mockContext,
        status: 'initializing',
      })

      render(<PlaygroundHeader />)

      expect(screen.getByTitle('Toggle line numbers')).toBeDisabled()
      expect(screen.getByTitle('Format code')).toBeDisabled()
      expect(screen.getByTitle('Reset to original')).toBeDisabled()
      expect(screen.getByTitle('Open in StackBlitz')).toBeDisabled()
    })

    it('should enable buttons when status is ready', () => {
      render(<PlaygroundHeader />)

      expect(screen.getByTitle('Toggle line numbers')).not.toBeDisabled()
      expect(screen.getByTitle('Format code')).not.toBeDisabled()
      expect(screen.getByTitle('Reset to original')).not.toBeDisabled()
      expect(screen.getByTitle('Open in StackBlitz')).not.toBeDisabled()
    })

    it('should show active state for line numbers button when enabled', () => {
      render(<PlaygroundHeader />)

      const lineNumbersBtn = screen.getByTitle('Toggle line numbers')
      expect(lineNumbersBtn).toHaveClass('active')
    })

    it('should not show active state for line numbers button when disabled', () => {
      vi.mocked(PlaygroundContext.usePlaygroundContext).mockReturnValue({
        ...mockContext,
        showLineNumbers: false,
      })

      render(<PlaygroundHeader />)

      const lineNumbersBtn = screen.getByTitle('Toggle line numbers')
      expect(lineNumbersBtn).not.toHaveClass('active')
    })
  })

  describe('interactions', () => {
    it('should call toggleLineNumbers when line numbers button is clicked', () => {
      render(<PlaygroundHeader />)

      fireEvent.click(screen.getByTitle('Toggle line numbers'))

      expect(mockContext.toggleLineNumbers).toHaveBeenCalledTimes(1)
    })

    it('should call formatCode when format button is clicked', () => {
      render(<PlaygroundHeader />)

      fireEvent.click(screen.getByTitle('Format code'))

      expect(mockContext.formatCode).toHaveBeenCalledTimes(1)
    })

    it('should call resetCode when reset button is clicked', () => {
      render(<PlaygroundHeader />)

      fireEvent.click(screen.getByTitle('Reset to original'))

      expect(mockContext.resetCode).toHaveBeenCalledTimes(1)
    })

    it('should call openInStackBlitz when StackBlitz button is clicked', () => {
      render(<PlaygroundHeader />)

      fireEvent.click(screen.getByTitle('Open in StackBlitz'))

      expect(mockContext.openInStackBlitz).toHaveBeenCalledTimes(1)
    })

    it('should call onToggleSidebar when sidebar button is clicked', () => {
      const onToggleSidebar = vi.fn()
      render(<PlaygroundHeader onToggleSidebar={onToggleSidebar} showSidebar={true} />)

      fireEvent.click(screen.getByTitle('Hide sidebar'))

      expect(onToggleSidebar).toHaveBeenCalledTimes(1)
    })

    it('should show correct sidebar button title based on showSidebar prop', () => {
      const onToggleSidebar = vi.fn()

      const { rerender } = render(
        <PlaygroundHeader onToggleSidebar={onToggleSidebar} showSidebar={true} />,
      )
      expect(screen.getByTitle('Hide sidebar')).toBeInTheDocument()

      rerender(<PlaygroundHeader onToggleSidebar={onToggleSidebar} showSidebar={false} />)
      expect(screen.getByTitle('Show sidebar')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have aria-labels on all buttons', () => {
      const onToggleSidebar = vi.fn()
      render(<PlaygroundHeader onToggleSidebar={onToggleSidebar} />)

      expect(screen.getByLabelText('Hide sidebar')).toBeInTheDocument()
      expect(screen.getByLabelText('Toggle line numbers')).toBeInTheDocument()
      expect(screen.getByLabelText('Format code')).toBeInTheDocument()
      expect(screen.getByLabelText('Reset to original')).toBeInTheDocument()
      expect(screen.getByLabelText('Open in StackBlitz')).toBeInTheDocument()
    })
  })
})

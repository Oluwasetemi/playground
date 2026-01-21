/**
 * ANSI escape code parser for terminal output rendering
 * Converts ANSI codes to styled HTML spans
 */

// ANSI color codes mapping
const ANSI_COLORS: Record<number, string> = {
  // Standard colors (foreground)
  30: '#1e1e1e', // Black
  31: '#f48771', // Red
  32: '#50fa7b', // Green
  33: '#f1fa8c', // Yellow
  34: '#6272a4', // Blue
  35: '#ff79c6', // Magenta
  36: '#8be9fd', // Cyan
  37: '#f8f8f2', // White
  // Bright colors (foreground)
  90: '#6272a4', // Bright Black (Gray)
  91: '#ff5555', // Bright Red
  92: '#69ff94', // Bright Green
  93: '#ffffa5', // Bright Yellow
  94: '#d6acff', // Bright Blue
  95: '#ff92df', // Bright Magenta
  96: '#a4ffff', // Bright Cyan
  97: '#ffffff', // Bright White
}

// Background colors
const ANSI_BG_COLORS: Record<number, string> = {
  40: '#1e1e1e', // Black
  41: '#f48771', // Red
  42: '#50fa7b', // Green
  43: '#f1fa8c', // Yellow
  44: '#6272a4', // Blue
  45: '#ff79c6', // Magenta
  46: '#8be9fd', // Cyan
  47: '#f8f8f2', // White
  // Bright backgrounds
  100: '#6272a4',
  101: '#ff5555',
  102: '#69ff94',
  103: '#ffffa5',
  104: '#d6acff',
  105: '#ff92df',
  106: '#a4ffff',
  107: '#ffffff',
}

export interface AnsiSpan {
  text: string
  style: {
    color?: string
    backgroundColor?: string
    fontWeight?: string
    fontStyle?: string
    textDecoration?: string
  }
}

interface ParserState {
  color?: string
  backgroundColor?: string
  bold: boolean
  italic: boolean
  underline: boolean
  dim: boolean
}

/**
 * Parse ANSI escape codes and return styled spans
 */
export function parseAnsi(text: string): AnsiSpan[] {
  const spans: AnsiSpan[] = []

  // Match ANSI escape sequences: ESC[ followed by params and ending with a letter
  // Also handle cursor movement and screen clearing codes
  const ansiRegex = /\x1b\[([0-9;]*)([A-Za-z])/g

  const state: ParserState = {
    bold: false,
    italic: false,
    underline: false,
    dim: false,
  }

  let lastIndex = 0
  let match

  while ((match = ansiRegex.exec(text)) !== null) {
    // Add text before this escape sequence
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index)
      if (beforeText) {
        spans.push(createSpan(beforeText, state))
      }
    }

    const params = match[1]
    const command = match[2]

    // Only process SGR (Select Graphic Rendition) commands - 'm'
    if (command === 'm') {
      processAnsiCodes(params, state)
    }
    // Ignore cursor movement (A, B, C, D, H, J, K, etc.) and other control codes

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex)
    if (remainingText) {
      spans.push(createSpan(remainingText, state))
    }
  }

  // If no spans were created, return the original text
  if (spans.length === 0 && text) {
    spans.push({ text, style: {} })
  }

  return spans
}

function createSpan(text: string, state: ParserState): AnsiSpan {
  const style: AnsiSpan['style'] = {}

  if (state.color) {
    style.color = state.dim ? adjustBrightness(state.color, 0.6) : state.color
  }
  if (state.backgroundColor) {
    style.backgroundColor = state.backgroundColor
  }
  if (state.bold) {
    style.fontWeight = 'bold'
  }
  if (state.italic) {
    style.fontStyle = 'italic'
  }
  if (state.underline) {
    style.textDecoration = 'underline'
  }

  return { text, style }
}

function processAnsiCodes(params: string, state: ParserState): void {
  if (!params || params === '0') {
    // Reset all attributes
    state.color = undefined
    state.backgroundColor = undefined
    state.bold = false
    state.italic = false
    state.underline = false
    state.dim = false
    return
  }

  const codes = params.split(';').map(Number)

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i]

    switch (code) {
      case 0: // Reset
        state.color = undefined
        state.backgroundColor = undefined
        state.bold = false
        state.italic = false
        state.underline = false
        state.dim = false
        break
      case 1: // Bold
        state.bold = true
        break
      case 2: // Dim
        state.dim = true
        break
      case 3: // Italic
        state.italic = true
        break
      case 4: // Underline
        state.underline = true
        break
      case 22: // Normal intensity (not bold, not dim)
        state.bold = false
        state.dim = false
        break
      case 23: // Not italic
        state.italic = false
        break
      case 24: // Not underline
        state.underline = false
        break
      case 39: // Default foreground color
        state.color = undefined
        break
      case 49: // Default background color
        state.backgroundColor = undefined
        break
      case 38: // Extended foreground color
        if (codes[i + 1] === 5 && codes[i + 2] !== undefined) {
          // 256 color mode
          state.color = get256Color(codes[i + 2])
          i += 2
        } else if (codes[i + 1] === 2 && codes.length >= i + 5) {
          // RGB mode
          state.color = `rgb(${codes[i + 2]}, ${codes[i + 3]}, ${codes[i + 4]})`
          i += 4
        }
        break
      case 48: // Extended background color
        if (codes[i + 1] === 5 && codes[i + 2] !== undefined) {
          state.backgroundColor = get256Color(codes[i + 2])
          i += 2
        } else if (codes[i + 1] === 2 && codes.length >= i + 5) {
          state.backgroundColor = `rgb(${codes[i + 2]}, ${codes[i + 3]}, ${codes[i + 4]})`
          i += 4
        }
        break
      default:
        // Standard foreground colors (30-37, 90-97)
        if (ANSI_COLORS[code]) {
          state.color = ANSI_COLORS[code]
        }
        // Standard background colors (40-47, 100-107)
        else if (ANSI_BG_COLORS[code]) {
          state.backgroundColor = ANSI_BG_COLORS[code]
        }
    }
  }
}

function get256Color(code: number): string {
  // Standard colors (0-7)
  if (code < 8) {
    return ANSI_COLORS[code + 30] || '#d4d4d4'
  }
  // Bright colors (8-15)
  if (code < 16) {
    return ANSI_COLORS[code - 8 + 90] || '#d4d4d4'
  }
  // 216 colors (16-231): 6x6x6 color cube
  if (code < 232) {
    const n = code - 16
    const r = Math.floor(n / 36)
    const g = Math.floor((n % 36) / 6)
    const b = n % 6
    return `rgb(${r ? r * 40 + 55 : 0}, ${g ? g * 40 + 55 : 0}, ${b ? b * 40 + 55 : 0})`
  }
  // Grayscale (232-255)
  const gray = (code - 232) * 10 + 8
  return `rgb(${gray}, ${gray}, ${gray})`
}

function adjustBrightness(color: string, factor: number): string {
  // Simple brightness adjustment for dim text
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`
  }
  return color
}

/**
 * Strip all ANSI codes from text (simple fallback)
 */
export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
}

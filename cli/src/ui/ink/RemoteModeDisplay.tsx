import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Box, Text, useStdout, useInput } from 'ink'
import { MessageBuffer, type BufferedMessage } from './messageBuffer'

interface RemoteModeDisplayProps {
    messageBuffer: MessageBuffer
    logPath?: string
    onExit?: () => void
    onSwitchToLocal?: () => void
}

export const RemoteModeDisplay: React.FC<RemoteModeDisplayProps> = ({ messageBuffer, logPath, onExit, onSwitchToLocal }) => {
    const [messages, setMessages] = useState<BufferedMessage[]>([])
    const [confirmationMode, setConfirmationMode] = useState<'exit' | 'switch' | null>(null)
    const [actionInProgress, setActionInProgress] = useState<'exiting' | 'switching' | null>(null)
    const confirmationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const { stdout } = useStdout()
    const terminalWidth = stdout.columns || 80
    const terminalHeight = stdout.rows || 24

    useEffect(() => {
        setMessages(messageBuffer.getMessages())
        
        const unsubscribe = messageBuffer.onUpdate((newMessages) => {
            setMessages(newMessages)
        })

        return () => {
            unsubscribe()
            if (confirmationTimeoutRef.current) {
                clearTimeout(confirmationTimeoutRef.current)
            }
        }
    }, [messageBuffer])

    const resetConfirmation = useCallback(() => {
        setConfirmationMode(null)
        if (confirmationTimeoutRef.current) {
            clearTimeout(confirmationTimeoutRef.current)
            confirmationTimeoutRef.current = null
        }
    }, [])

    const setConfirmationWithTimeout = useCallback((mode: 'exit' | 'switch') => {
        setConfirmationMode(mode)
        if (confirmationTimeoutRef.current) {
            clearTimeout(confirmationTimeoutRef.current)
        }
        confirmationTimeoutRef.current = setTimeout(() => {
            resetConfirmation()
        }, 15000) // 15 seconds timeout
    }, [resetConfirmation])

    useInput(useCallback(async (input, key) => {
        // Don't process input if action is in progress
        if (actionInProgress) return
        
        // Handle Ctrl-C
        if (key.ctrl && input === 'c') {
            if (confirmationMode === 'exit') {
                // Second Ctrl-C, exit
                resetConfirmation()
                setActionInProgress('exiting')
                // Small delay to show the status message
                await new Promise(resolve => setTimeout(resolve, 100))
                onExit?.()
            } else {
                // First Ctrl-C, show confirmation
                setConfirmationWithTimeout('exit')
            }
            return
        }

        // Handle double space
        if (input === ' ') {
            if (confirmationMode === 'switch') {
                // Second space, switch to local
                resetConfirmation()
                setActionInProgress('switching')
                // Small delay to show the status message
                await new Promise(resolve => setTimeout(resolve, 100))
                onSwitchToLocal?.()
            } else {
                // First space, show confirmation
                setConfirmationWithTimeout('switch')
            }
            return
        }

        // Any other key cancels confirmation
        if (confirmationMode) {
            resetConfirmation()
        }
    }, [confirmationMode, actionInProgress, onExit, onSwitchToLocal, setConfirmationWithTimeout, resetConfirmation]))

    const getMessageColor = (type: BufferedMessage['type']): string => {
        switch (type) {
            case 'user': return 'magentaBright'
            case 'assistant': return 'cyanBright'
            case 'system': return 'blueBright'
            case 'tool': return 'yellowBright'
            case 'result': return 'greenBright'
            case 'status': return 'gray'
            default: return 'white'
        }
    }

    const formatMessage = (msg: BufferedMessage): string => {
        const lines = msg.content.split('\n')
        const maxLineLength = terminalWidth - 10 // Account for borders and padding
        return lines.map(line => {
            if (line.length <= maxLineLength) return line
            const chunks: string[] = []
            for (let i = 0; i < line.length; i += maxLineLength) {
                chunks.push(line.slice(i, i + maxLineLength))
            }
            return chunks.join('\n')
        }).join('\n')
    }

    // Generate dynamic banner that scales to terminal width
    const generateBanner = (): string[] => {
        // The ASCII art itself (without borders)
        const asciiArt = [
            '  ███████╗███████╗███╗   ██╗███████╗██╗      ██████╗  ',
            '  ╚══███╔╝██╔════╝████╗  ██║██╔════╝██║     ██╔═══██╗ ',
            '    ███╔╝ █████╗  ██╔██╗ ██║█████╗  ██║     ██║   ██║ ',
            '   ███╔╝  ██╔══╝  ██║╚██╗██║██╔══╝  ██║     ██║   ██║ ',
            '  ███████╗███████╗██║ ╚████║██║     ███████╗╚██████╔╝ ',
            '  ╚══════╝╚══════╝╚═╝  ╚═══╝╚═╝     ╚══════╝ ╚═════╝  ',
        ]

        // Minimum width needed for the ASCII art
        const minWidth = 60
        const width = Math.max(terminalWidth, minWidth)

        // Calculate padding to center the ASCII art
        const contentWidth = width - 2 // Account for borders (║ on each side)

        // Build the banner
        const banner: string[] = []

        // Top border
        banner.push('╔' + '═'.repeat(width - 2) + '╗')

        // ASCII art lines with dynamic padding
        for (const line of asciiArt) {
            const trimmedLine = line.trimEnd()
            const paddingNeeded = contentWidth - trimmedLine.length
            const leftPad = Math.floor(paddingNeeded / 2)
            const rightPad = paddingNeeded - leftPad

            banner.push('║' + ' '.repeat(leftPad) + trimmedLine + ' '.repeat(rightPad) + '║')
        }

        // Bottom border
        banner.push('╚' + '═'.repeat(width - 2) + '╝')

        return banner
    }

    const banner = generateBanner()

    return (
        <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
            {/* ASCII Art Banner */}
            <Box flexDirection="column" marginBottom={1}>
                {banner.map((line, i) => (
                    <Text key={i} color="cyan" bold>
                        {line}
                    </Text>
                ))}
            </Box>

            {/* Main content area with logs */}
            <Box
                flexDirection="column"
                width={terminalWidth}
                height={terminalHeight - 14}
                borderStyle="round"
                borderColor="magenta"
                paddingX={1}
                overflow="hidden"
            >
                <Box flexDirection="column" marginBottom={1}>
                    <Text color="magenta" bold>📡 Remote Mode - Live Session</Text>
                    <Text color="magenta" dimColor>{'─'.repeat(Math.min(terminalWidth - 4, 60))}</Text>
                </Box>
                
                <Box flexDirection="column" height={terminalHeight - 10} overflow="hidden">
                    {messages.length === 0 ? (
                        <Text color="gray" dimColor>Waiting for messages...</Text>
                    ) : (
                        // Show only the last messages that fit in the available space
                        messages.slice(-Math.max(1, terminalHeight - 10)).map((msg) => (
                            <Box key={msg.id} flexDirection="column" marginBottom={1}>
                                <Text color={getMessageColor(msg.type)} dimColor>
                                    {formatMessage(msg)}
                                </Text>
                            </Box>
                        ))
                    )}
                </Box>
            </Box>

            {/* Modal overlay at the bottom */}
            <Box
                width={terminalWidth}
                borderStyle="double"
                borderColor={
                    actionInProgress ? "gray" :
                    confirmationMode === 'exit' ? "red" :
                    confirmationMode === 'switch' ? "yellow" :
                    "cyan"
                }
                paddingX={2}
                justifyContent="center"
                alignItems="center"
                flexDirection="column"
            >
                <Box flexDirection="column" alignItems="center">
                    {actionInProgress === 'exiting' ? (
                        <Text color="gray" bold>
                            ⚡ Exiting remote session...
                        </Text>
                    ) : actionInProgress === 'switching' ? (
                        <Text color="cyan" bold>
                            🔄 Switching to local mode...
                        </Text>
                    ) : confirmationMode === 'exit' ? (
                        <Text color="red" bold>
                            ⚠️  Press Ctrl-C again to exit completely
                        </Text>
                    ) : confirmationMode === 'switch' ? (
                        <Text color="yellow" bold>
                            ⏸️  Press SPACE again to switch to local mode
                        </Text>
                    ) : (
                        <>
                            <Text color="cyan" bold>
                                🚀 Press SPACE to switch to local • Ctrl-C to exit
                            </Text>
                        </>
                    )}
                    {process.env.DEBUG && logPath && (
                        <Text color="gray" dimColor>
                            Debug logs: {logPath}
                        </Text>
                    )}
                </Box>
            </Box>
        </Box>
    )
}
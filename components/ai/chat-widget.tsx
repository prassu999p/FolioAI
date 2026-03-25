'use client'

import { useState } from 'react'
import { useChat, Chat } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'
import type { UIMessage } from 'ai'

interface ChatWidgetProps {
  familyId: string | null
  holderId?: string | null
}

/** Extract plain text from a UIMessage (SDK v6 uses parts-based messages) */
function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('')
}

export function ChatWidget({ familyId, holderId }: ChatWidgetProps) {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // SDK v6: Chat instance with TextStreamChatTransport for plain text streaming
  // prepareSendMessagesRequest formats UIMessages for our /api/ai/chat route handler
  const [chat] = useState(() => new Chat<UIMessage>({
    transport: new TextStreamChatTransport({
      api: '/api/ai/chat',
      body: holderId ? { holderId } : undefined,
      prepareSendMessagesRequest: ({ messages, body }) => ({
        body: {
          ...body,
          messages: messages.map(m => ({
            id: m.id,
            role: m.role,
            content: getMessageText(m),
          })),
        },
      }),
    }),
    messages: [{
      id: 'greeting',
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: 'Hello! I can help with tax queries, sector exposure, or sell-impact analysis.' }],
    }],
  }))

  const { messages, sendMessage, status } = useChat({ chat })
  const isLoading = status === 'submitted' || status === 'streaming'

  if (!familyId) return null  // Don't render if no family exists yet

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = inputValue.trim()
    if (!text || isLoading) return
    sendMessage({ text })
    setInputValue('')
  }

  return (
    <>
      {/* Collapsed FAB */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-on-primary rounded-full px-4 py-3 shadow-lg hover:opacity-90 transition-opacity"
          aria-label="Open AI chat"
        >
          <span className="material-symbols-outlined text-xl">auto_awesome</span>
          <span className="text-sm font-semibold">Ask AI</span>
        </button>
      )}

      {/* Expanded chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[450px] max-h-[600px] flex flex-col rounded-3xl shadow-2xl overflow-hidden border border-surface-container-high">
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-on-primary text-xl">auto_awesome</span>
              <span className="font-headline font-bold text-on-primary text-sm">FolioAI Intelligence Hub</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-on-primary opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Close chat"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-container-lowest min-h-0">
            {messages.map((msg) => {
              const text = getMessageText(msg)
              if (!text) return null
              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-on-primary rounded-br-sm'
                        : 'bg-surface-container text-on-surface rounded-bl-sm'
                    }`}
                  >
                    {text}
                  </div>
                </div>
              )
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-surface-container px-3 py-2 rounded-xl rounded-bl-sm">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm animate-spin">progress_activity</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2 p-3 bg-surface-container-lowest border-t border-surface-container-high flex-shrink-0">
            <input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Ask about your portfolio..."
              className="flex-1 px-3 py-2 rounded-xl text-sm bg-surface-container border border-surface-container-high text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-secondary"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-primary text-on-primary rounded-xl px-3 py-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
              aria-label="Send message"
            >
              <span className="material-symbols-outlined text-xl">send</span>
            </button>
          </form>
        </div>
      )}
    </>
  )
}

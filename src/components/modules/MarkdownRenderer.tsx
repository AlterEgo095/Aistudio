'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Button } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'

interface Props {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div
      className={
        'prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-pre:my-3 prose-code:before:content-none prose-code:after:content-none ' +
        (className ?? '')
      }
    >
      <ReactMarkdown
        components={{
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            const inline = !match && !String(children).includes('\n')
            if (inline) {
              return (
                <code
                  className="rounded bg-muted px-1.5 py-0.5 text-[0.85em] font-mono"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            const codeText = String(children).replace(/\n$/, '')
            return (
              <div className="relative my-3 overflow-hidden rounded-lg border border-border bg-[#282c34]">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-xs text-white/60">
                  <span>{match ? match[1] : 'code'}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-white/70 hover:bg-white/10 hover:text-white"
                    onClick={() => handleCopy(codeText)}
                  >
                    {copied === codeText ? (
                      <>
                        <Check className="h-3 w-3" /> Copié
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copier
                      </>
                    )}
                  </Button>
                </div>
                <SyntaxHighlighter
                  language={match ? match[1] : 'text'}
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    background: 'transparent',
                    fontSize: '0.85rem',
                    padding: '0.75rem 1rem',
                  }}
                  codeTagProps={{ style: { fontFamily: 'var(--font-mono, monospace)' } }}
                >
                  {codeText}
                </SyntaxHighlighter>
              </div>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

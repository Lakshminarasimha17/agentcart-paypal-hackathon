import React, { useState, useEffect, useRef } from 'react'

export default function ChatBar({ message, setMessage, onSubmit, loading, chips }) {
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setSpeechSupported(true)
    }
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop()
      }
      onSubmit(message)
    }
  }

  const handleChipClick = (chip) => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setMessage(chip)
    onSubmit(chip)
  }

  const toggleVoiceSearch = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) return

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsListening(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition

      recognition.lang = 'en-US'
      recognition.continuous = false
      recognition.interimResults = true

      let transcriptAccumulator = ''

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event) => {
        let currentTranscript = ''
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript
        }
        transcriptAccumulator = currentTranscript
        setMessage(currentTranscript)
      }

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
        const finalQuery = transcriptAccumulator.trim()
        if (finalQuery) {
          onSubmit(finalQuery)
        }
      }

      recognition.start()
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      setIsListening(false)
    }
  }

  return (
    <div className="chat-bar">
      <div className="input-card">
        <div className="input-row">
          <div className="search-icon-wrapper">
            <svg
              className="search-input-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            className="chat-input"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AgentCart anything, e.g. 'Find 4K monitors under $300'..."
            disabled={loading}
          />

          {/* Voice Search Microphone Button (beside Search button) */}
          {speechSupported && (
            <button
              type="button"
              className={`mic-btn ${isListening ? 'listening' : ''}`}
              onClick={toggleVoiceSearch}
              disabled={loading}
              title={isListening ? 'Listening... click to stop' : 'Voice Search'}
              aria-label="Voice Search"
            >
              {isListening ? (
                <>
                  <span className="pulse-indicator"></span>
                  <span className="mic-listening-label">Listening...</span>
                </>
              ) : (
                <svg
                  className="mic-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
          )}

          <button
            className="send-btn"
            onClick={() => onSubmit(message)}
            disabled={loading || !message.trim()}
          >
            {loading ? (
              <span className="btn-spinner"></span>
            ) : (
              <span>Search</span>
            )}
          </button>
        </div>
      </div>

      <div className="chips-container">
        <span className="chips-label">Popular Searches:</span>
        <div className="chips">
          {chips.map((chip) => (
            <button
              key={chip}
              className="chip"
              onClick={() => handleChipClick(chip)}
              disabled={loading}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="loading-card">
          <div className="loading-spinner"></div>
          <div className="loading-text">
            <strong>AgentCart is shopping for you...</strong>
            <span>Searching real-time inventory and analyzing best matches</span>
          </div>
        </div>
      )}
    </div>
  )
}

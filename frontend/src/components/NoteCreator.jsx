import { useState, useRef, useEffect, useCallback } from 'react'
import { apiClient } from '../services/api'



function htmlToBody(html = '') {
  const parser = new DOMParser()
  const document = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  function nodeToText(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || ''
    }
    if (node.nodeName === 'BR') {
      return '\n'
    }
    if (node.nodeName === 'IMG' || node.nodeName === 'AUDIO') {
      return node.dataset.placeholder ? node.dataset.placeholder : ''
    }
    if (node.classList && node.classList.contains('voice-transcript')) {
      return ''
    }
    const children = Array.from(node.childNodes).map(nodeToText).join('')
    if (['DIV', 'P', 'LI', 'BLOCKQUOTE', 'PRE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.nodeName)) {
      return `${children}\n`
    }
    return children
  }
  const text = nodeToText(document.body)
  return text.replace(/\n{2,}/g, '\n').trim()
}

export default function NoteCreator({ onSave }) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingError, setRecordingError] = useState('')
  const [recordingMode, setRecordingMode] = useState(null)
  const recordingModeRef = useRef(null)

  const containerRef = useRef(null)
  const editorRef = useRef(null)
  const pendingFilesRef = useRef({})
  const savedRangeRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)

  // Expand Note Creator
  function expand() {
    setExpanded(true)
  }

  const submitNoteRef = useRef(submitNote)
  useEffect(() => {
    submitNoteRef.current = submitNote
  })

  // Handle click outside to save and collapse
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        expanded
      ) {
        // Automatically save if there is content
        submitNoteRef.current()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [expanded])

  // Track cursor position for injecting media
  useEffect(() => {
    function handleSelectionChange() {
      const sel = window.getSelection()
      if (sel.rangeCount > 0 && editorRef.current) {
        const range = sel.getRangeAt(0)
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          savedRangeRef.current = range.cloneRange()
        }
      }
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [])

  function insertHtmlAtCursor(editor, html) {
    editor.focus()
    const selection = window.getSelection()
    let range

    if (savedRangeRef.current) {
      range = savedRangeRef.current.cloneRange()
    } else if (selection.rangeCount > 0) {
      const currentRange = selection.getRangeAt(0)
      if (editor.contains(currentRange.commonAncestorContainer)) {
        range = currentRange.cloneRange()
      }
    }

    if (!range) {
      range = document.createRange()
      range.selectNodeContents(editor)
      range.collapse(false) // Position at the end
    }

    selection.removeAllRanges()
    selection.addRange(range)

    // Delete selected text if any
    range.deleteContents()

    const fragment = range.createContextualFragment(html)
    const lastNode = fragment.lastChild
    range.insertNode(fragment)

    if (lastNode) {
      range.setStartAfter(lastNode)
      range.collapse(true)
    }

    selection.removeAllRanges()
    selection.addRange(range)

    // Save the range right after insertion so subsequent media inserts sequentially
    savedRangeRef.current = range.cloneRange()
  }

  // Image Upload handler
  async function handleImageUpload(e) {
    const fileList = e.target.files
    const files = Array.from(fileList || [])
    if (files.length === 0 || !editorRef.current) return
    setError('')
    setUploading(true)
    try {
      for (const file of files) {
        const dataId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        pendingFilesRef.current[dataId] = file
        const blobUrl = URL.createObjectURL(file)
        const imgHtml = `<img class="note-body-image editor-image pending-image" contenteditable="false" data-pending-id="${dataId}" src="${blobUrl}" style="width:300px; max-width:100%; vertical-align:middle; margin:4px;" />`
        insertHtmlAtCursor(editorRef.current, imgHtml)
      }
    } catch (err) {
      setError('Failed to upload image: ' + err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }



  // Create note on close
  async function submitNote() {
    setError('')
    const trimmedTitle = title.trim()
    const html = editorRef.current?.innerHTML || ''
    const bodyText = htmlToBody(html)

    // Reset editor immediately to prevent multiple triggers
    setTitle('')
    if (editorRef.current) {
      editorRef.current.innerHTML = ''
    }
    setExpanded(false)

    // If nothing entered, just close without saving
    if (!trimmedTitle && !bodyText) {
      pendingFilesRef.current = {}
      return
    }

    if (bodyText.length > 1000) {
      setError('Body must be less than 1000 characters')
      // Restore states to let them fix it
      setTitle(trimmedTitle)
      setExpanded(true)
      if (editorRef.current) editorRef.current.innerHTML = html
      return
    }

    setUploading(true)
    try {
      const pendingImgs = Array.from(new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html').querySelectorAll('.pending-image'))
      const pendingAudios = Array.from(new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html').querySelectorAll('.pending-audio'))

      // Create note
      const createRes = await apiClient.createNote(trimmedTitle || 'Untitled Note', bodyText || ' ')
      const noteId = createRes.note?.note_id || createRes.note?.id

      if (!noteId) throw new Error('Failed to create note')

      // If media uploads exist
      if (pendingImgs.length > 0 || pendingAudios.length > 0) {
        // We need a helper editor DOM element to replace image/voice sources with actual uploaded ones
        const parser = new DOMParser()
        const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
        const dom = doc.querySelector('div')

        for (const img of Array.from(dom.querySelectorAll('.pending-image'))) {
          const dataId = img.getAttribute('data-pending-id')
          if (!dataId) continue
          const file = pendingFilesRef.current[dataId]
          if (!file) continue

          const uploadRes = await apiClient.uploadImage(noteId, file)
          let ph = uploadRes.placeholder
          const picUrl = uploadRes.image?.picture_url
          if (ph && picUrl) {
            img.src = picUrl
            img.setAttribute('data-placeholder', ph)
            img.classList.remove('pending-image')
            img.removeAttribute('data-pending-id')
          }
          delete pendingFilesRef.current[dataId]
        }

        for (const audio of Array.from(dom.querySelectorAll('.pending-audio'))) {
          const dataId = audio.getAttribute('data-pending-id')
          if (!dataId) continue
          const audioBlob = pendingFilesRef.current[dataId]
          if (!audioBlob) continue

          const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
          const uploadRes = await apiClient.uploadVoice(noteId, file)
          if (uploadRes.placeholder) {
            audio.setAttribute('data-placeholder', uploadRes.placeholder)
          }
          audio.classList.remove('pending-audio')
          audio.removeAttribute('data-pending-id')
          delete pendingFilesRef.current[dataId]
        }

        const finalBody = htmlToBody(dom.innerHTML)
        await apiClient.updateNote(noteId, { note_body: finalBody })
      }

      // Refresh list
      if (typeof onSave === 'function') {
        onSave()
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to save note')
    } finally {
      setUploading(false)
      pendingFilesRef.current = {}
    }
  }

  // Recording functions
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !isRecording) return

    setIsRecording(false)
    setRecordingError('')

    return new Promise((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          audioChunksRef.current = []
          
          const mode = recordingModeRef.current
          recordingModeRef.current = null
          setRecordingMode(null)

          if (audioBlob.size > 0 && editorRef.current) {
            if (mode === 'stt') {
              try {
                setUploading(true)
                const res = await apiClient.transcribeAudio(audioBlob)
                if (res.text) {
                  insertHtmlAtCursor(editorRef.current, ` ${res.text} `)
                }
              } catch (err) {
                setRecordingError('Failed to transcribe audio: ' + err.message)
              } finally {
                setUploading(false)
              }
            } else {
              const pendingId = `pending-voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
              pendingFilesRef.current[pendingId] = audioBlob
              const blobUrl = URL.createObjectURL(audioBlob)
              const audioHtml = `<audio class="note-body-audio editor-audio pending-audio" controls data-pending-id="${pendingId}" src="${blobUrl}" style="width:100%; max-width:400px; margin:8px 0;"></audio>`
              insertHtmlAtCursor(editorRef.current, audioHtml)
            }
          }
          resolve()
        }
        mediaRecorderRef.current.stop()
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
        mediaRecorderRef.current = null
      }
      
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    })
  }, [isRecording])

  const startRecording = useCallback(async (mode = 'voice') => {
    if (isRecording) return

    try {
      setRecordingError('')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      
      audioChunksRef.current = []
      mediaRecorderRef.current = mediaRecorder
      recordingModeRef.current = mode
      setRecordingMode(mode)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(100)
      setIsRecording(true)

      // Auto-stop after 60 seconds
      recordingTimerRef.current = setTimeout(() => {
        stopRecording()
      }, 60000)
    } catch (err) {
      setRecordingError('Failed to start recording: ' + err.message)
      recordingModeRef.current = null
      setRecordingMode(null)
    }
  }, [isRecording, stopRecording])

  const toggleRecording = useCallback((mode) => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording(mode)
    }
  }, [isRecording, startRecording, stopRecording])

  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording()
      }
    }
  }, [isRecording, stopRecording])

  return (
    <div className="note-creator" ref={containerRef}>
      {!expanded ? (
        <div className="note-creator-collapsed" onClick={expand}>
          <div className="note-creator-collapsed-text">Take a note...</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <label className="card-icon-btn" title="Add Image" onClick={(e) => { e.stopPropagation(); expand(); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </label>
            <button className="card-icon-btn" type="button" title="Record Voice" onClick={(e) => { e.stopPropagation(); expand(); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="note-creator-expanded">
          {error && <div className="modal-error">{error}</div>}
          <input
            className="note-creator-title"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="note-creator-editor-wrapper">
            <div
              ref={editorRef}
              className="note-creator-editor ce-editor"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Take a note..."
            />
          </div>

          <div className="note-creator-toolbar">
            <div className="note-creator-actions">
              <label className="card-icon-btn" title="Add Image">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                  multiple
                />
              </label>

              {recordingError && <div className="modal-error" style={{ fontSize: '12px', marginBottom: '8px' }}>{recordingError}</div>}

              {/* Speech to Text Button */}
              <button
                type="button"
                className={`card-icon-btn ${isRecording && recordingMode === 'stt' ? 'recording' : ''}`}
                onClick={() => toggleRecording('stt')}
                disabled={uploading || (isRecording && recordingMode !== 'stt')}
                title={isRecording && recordingMode === 'stt' ? "Stop Recording (Speech to Text)" : "Speech to Text"}
                style={{ color: isRecording && recordingMode === 'stt' ? '#ef4444' : 'inherit' }}
              >
                {isRecording && recordingMode === 'stt' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                )}
              </button>

              {/* SVG Voice Recording Button */}
              <button
                type="button"
                className={`card-icon-btn ${isRecording && recordingMode === 'voice' ? 'recording' : ''}`}
                onClick={() => toggleRecording('voice')}
                disabled={uploading || (isRecording && recordingMode !== 'voice')}
                title={isRecording && recordingMode === 'voice' ? 'Stop Recording (Voice Note)' : 'Record Voice'}
                style={{ color: isRecording && recordingMode === 'voice' ? '#ef4444' : 'inherit' }}
              >
                {isRecording && recordingMode === 'voice' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 10v4M6 6v12M9 3v18M12 7v10M15 5v14M18 8v8M21 10v4" />
                  </svg>
                )}
              </button>
            </div>

            <button className="note-creator-btn-close" type="button" onClick={submitNote}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

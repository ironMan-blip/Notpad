export default function NoteDisplay({ note, onDelete, onSelect, onPin, className = '' }) {
  if (!note) return null

  function renderBodyPreview(body = '') {
    if (!body) return ''

    const cleanBody = body
      .replace(/\[IMG:[^\]]*\]/g, '')
      .replace(/\[AUD:[^\]]*\]/g, '')
      .replaceAll('[', '')
      .replaceAll(']', '')
      .trim()

    const maxLength = 100
    if (cleanBody.length > maxLength) {
      return cleanBody.substring(0, maxLength) + '...'
    }
    return cleanBody
  }

  const images = Array.isArray(note.mediaImages) ? note.mediaImages : []
  const voices = Array.isArray(note.mediaVoices) ? note.mediaVoices : []
  const hasImages = images.length > 0
  const hasVoices = voices.length > 0

  return (
    <div
      className={["note", typeof onSelect === 'function' && 'note-clickable', className].filter(Boolean).join(' ')}
      onClick={typeof onSelect === 'function' ? onSelect : undefined}
      role={typeof onSelect === 'function' ? 'button' : undefined}
      tabIndex={typeof onSelect === 'function' ? 0 : undefined}
      onKeyDown={typeof onSelect === 'function' ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      } : undefined}
    >
      {/* Note Text Content */}
      <div className="note-body">
        {note.note_title && (
          <strong className="note-title">{note.note_title}</strong>
        )}
        <p className="note-text">
          {renderBodyPreview(note.note_body || '') || (hasImages || hasVoices ? '' : 'Empty note')}
        </p>
      </div>

      {/* 5. Keep-style Action Icons (shown on hover) */}
      <div className="note-actions">
        <div className="note-actions-left" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`card-icon-btn ${note.is_pinned ? 'pinned' : ''}`}
            title={note.is_pinned ? "Unpin note" : "Pin note"}
            onClick={(e) => {
              e.stopPropagation()
              if (typeof onPin === 'function') {
                onPin()
              }
            }}
            style={{ border: 'none', background: 'none', padding: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={note.is_pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10V8a2 2 0 0 0-2-2h-1.5c-1.1 0-2-.9-2-2V3a1 1 0 0 0-1-1H9.5a1 1 0 0 0-1 1v1c0 1.1-.9 2-2 2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 1.7 2H6.5c1.1 0 2 .9 2 2v1c0 .6.4 1 1 1h5c.6 0 1-.4 1-1v-1c0-1.1.9-2 2-2h1.8a2 2 0 0 0 1.7-2z" />
              <line x1="12" y1="17" x2="12" y2="22" />
            </svg>
          </button>
          {voices.length > 0 && (
            <div className="card-icon-btn" title="Has Voice Note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              </svg>
            </div>
          )}
        </div>
        <div className="note-actions-right" onClick={(e) => e.stopPropagation()}>
          {typeof onDelete === 'function' && (
            <button
              type="button"
              className="card-icon-btn"
              onClick={onDelete}
              title="Delete note"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

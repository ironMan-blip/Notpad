const API_KEY = 'pUokR5fyjA866Phf32jq';
const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');

export const apiClient = {
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...options.headers,
    };

    let response;
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
      response = await fetch(url, {
        credentials: 'include',
        ...options,
        headers,
      });
    } catch (networkError) {
      const error = new Error(`Network error: ${networkError.message}`);
      error.status = 0;
      error.isNetworkError = true;
      throw error;
    }

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.detail || 'API Error');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  },

  // Auth
  register(email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ user_mail: email, password }),
    });
  },

  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ user_mail: email, password }),
    });
  },

  logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  },

  // Notes
  getNotes(skip = 0, limit = 12, query = '') {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    if (query?.trim()) {
      params.set('query', query.trim());
    }
    return this.request(`/notes?${params.toString()}`, {
      method: 'GET',
    });
  },

  async createNote(title, body, imageFiles = []) {
    if (imageFiles && imageFiles.length > 0) {
      const formData = new FormData();
      formData.append('note_title', title);
      formData.append('note_body', body);
      formData.append('bg_color', '#FFFFFF');
      formData.append('is_pinned', 'false');

      imageFiles.forEach(imageFile => formData.append('images', imageFile.file));

      const response = await fetch(`${API_BASE_URL}/notes/with-images`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-API-Key': API_KEY,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data.detail || 'API Error');
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    }

    return this.request('/notes', {
      method: 'POST',
      body: JSON.stringify({
        note_title: title,
        note_body: body,
        bg_color: '#FFFFFF',
        is_pinned: false,
      }),
    });
  },

  updateNote(noteId, updates) {
    const body = {};
    if (typeof updates.note_title === 'string') body.note_title = updates.note_title;
    if (typeof updates.note_body === 'string') body.note_body = updates.note_body;
    if (updates.bg_color) body.bg_color = updates.bg_color;
    if (typeof updates.is_pinned === 'boolean') body.is_pinned = updates.is_pinned;

    return this.request(`/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  deleteNote(noteId) {
    return this.request(`/notes/${noteId}`, {
      method: 'DELETE',
    });
  },

  // Groups
  getGroups() {
    return this.request('/groups', {
      method: 'GET',
    });
  },

  createGroup(name, description = '') {
    return this.request('/groups', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  },

  updateGroup(groupId, updates) {
    const body = {};
    if (typeof updates.name === 'string') body.name = updates.name;
    if (typeof updates.description === 'string') body.description = updates.description;

    return this.request(`/groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  deleteGroup(groupId) {
    return this.request(`/groups/${groupId}`, {
      method: 'DELETE',
    });
  },

  addNoteToGroup(groupId, noteId) {
    return this.request(`/groups/${groupId}/notes/${noteId}`, {
      method: 'POST',
    });
  },

  removeNoteFromGroup(groupId, noteId) {
    return this.request(`/groups/${groupId}/notes/${noteId}`, {
      method: 'DELETE',
    });
  },

  async uploadFile(noteId, file, fileType) {
    // 1. Request presigned upload URL from backend
    const presignedResponse = await fetch(`${API_BASE_URL}/notes/${noteId}/presigned`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
      }),
    });

    if (!presignedResponse.ok) {
      const errorData = await presignedResponse.json();
      throw new Error(errorData.detail || 'Failed to generate upload credentials.');
    }

    const presigned = await presignedResponse.json();

    // 2. Upload file directly to UploadThing storage provider
    const formData = new FormData();
    formData.append('file', file);

    const uploadResponse = await fetch(presigned.url, {
      method: 'PUT',
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to storage provider.');
    }

    // 3. Register the upload with the backend to associate it with the note
    const registerEndpoint = fileType === 'image' ? `/notes/${noteId}/images/register` : `/notes/${noteId}/voices/register`;
    const registerResponse = await fetch(`${API_BASE_URL}${registerEndpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        url: presigned.cdnUrl,
        file_name: file.name,
        file_size: file.size,
      }),
    });

    const data = await registerResponse.json();

    if (!registerResponse.ok) {
      const error = new Error(data.detail || 'Registration failed');
      error.status = registerResponse.status;
      error.data = data;
      throw error;
    }

    return data;
  },

  uploadImage(noteId, file) {
    return this.uploadFile(noteId, file, 'image');
  },

  uploadVoice(noteId, file) {
    return this.uploadFile(noteId, file, 'voice');
  },

  getNoteImages(noteId) {
    return this.request(`/notes/${noteId}/images`, {
      method: 'GET',
    });
  },

  deleteImage(noteId, imageId) {
    return this.request(`/notes/${noteId}/images/${imageId}`, {
      method: 'DELETE',
    });
  },

  getNoteVoices(noteId) {
    return this.request(`/notes/${noteId}/voices`, {
      method: 'GET',
    });
  },

  // AI
  summarizeNote(noteId) {
    return this.request('/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ note_id: noteId }),
    });
  },

  rewriteNote(noteId, theme) {
    return this.request('/ai/rewrite', {
      method: 'POST',
      body: JSON.stringify({ note_id: noteId, theme }),
    });
  },

  getRewriteThemes() {
    return this.request('/ai/themes', {
      method: 'GET',
    });
  },

  summarizeAndApply(noteId) {
    return this.request('/ai/summarize-and-apply', {
      method: 'POST',
      body: JSON.stringify({ note_id: noteId }),
    });
  },

  rewriteAndApply(noteId, theme) {
    return this.request('/ai/rewrite-and-apply', {
      method: 'POST',
      body: JSON.stringify({ note_id: noteId, theme }),
    });
  },

  async transcribeAudio(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob, `recording_${Date.now()}.webm`);

    const response = await fetch(`${API_BASE_URL}/ai/transcribe`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-API-Key': API_KEY,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.detail || 'Transcription failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  },
};

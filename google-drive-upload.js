// Google Drive Upload Handler
class GoogleDriveUploader {
  constructor() {
    this.DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
    this.SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';
    this.tokenClient = null;
    this.gapi = null;
    this.files = [];
    this.folderId = null;
    this.userEmail = null;
    this.userName = null;
    
    this.initializeGapi();
  }

  async initializeGapi() {
    try {
      // Check if credentials are configured
      const clientId = this.getClientId();
      const apiKey = this.getApiKey();
      
      if (!clientId || clientId === 'YOUR_CLIENT_ID_HERE' || !apiKey || apiKey === 'YOUR_API_KEY_HERE') {
        console.warn('Google Drive API credentials not configured');
        // showConfigError will be called by getClientId if not configured
        return;
      }

      // Load gapi client
      await new Promise((resolve, reject) => {
        if (typeof gapi === 'undefined') {
          reject(new Error('Google API library not loaded'));
          return;
        }
        gapi.load('client', { callback: resolve, onerror: reject });
      });

      // Initialize gapi client
      await gapi.client.init({
        apiKey: apiKey,
        discoveryDocs: this.DISCOVERY_DOCS,
      });
      this.gapi = gapi;
      
      // Initialize Google Identity Services
      if (typeof google === 'undefined' || !google.accounts) {
        throw new Error('Google Identity Services library not loaded');
      }
      
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: this.SCOPES,
        callback: (response) => {
          if (response.error) {
            console.error('Authentication error:', response.error);
            this.showError('Authentication failed. Please try again.');
            return;
          }
          this.gapi.client.setToken(response);
          this.onAuthSuccess();
        },
      });

      // Check if already authenticated
      const token = this.gapi.client.getToken();
      if (token) {
        this.onAuthSuccess();
      }
    } catch (error) {
      console.error('Error initializing Google API:', error);
      // Only show error if DOM is ready
      if (document.getElementById('authSection')) {
        this.showConfigError();
      }
    }
  }

  getApiKey() {
    // Get API key from config file
    const apiKey = window.GOOGLE_API_KEY || '';
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      console.error('Google API Key not configured. Please set it in google-drive-config.js');
    }
    return apiKey;
  }

  getClientId() {
    // Get Client ID from config file
    const clientId = window.GOOGLE_CLIENT_ID || '';
    if (!clientId || clientId === 'YOUR_CLIENT_ID_HERE') {
      console.error('Google Client ID not configured. Please set it in google-drive-config.js');
      this.showConfigError();
    }
    return clientId;
  }

  showConfigError() {
    const authSection = document.getElementById('authSection');
    if (authSection && !authSection.querySelector('.config-error')) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'config-error card';
      errorDiv.style.cssText = 'background: rgba(239,68,68,0.1); border-color: #ef4444; margin-top: 1rem; padding: 1rem;';
      errorDiv.innerHTML = `
        <strong style="color: #ef4444;">⚠️ Configuration Required</strong>
        <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">
          Google Drive API credentials are not configured. Please follow the instructions in 
          <code style="background: var(--bg); padding: 0.2rem 0.4rem; border-radius: 4px;">google-drive-config.js</code> 
          to set up your API key and Client ID.
        </p>
        <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: var(--muted);">
          You need to create a Google Cloud project, enable Google Drive API, and create OAuth 2.0 credentials.
        </p>
      `;
      authSection.appendChild(errorDiv);
    }
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'card';
    errorDiv.style.cssText = 'background: rgba(239,68,68,0.1); border-color: #ef4444; margin-top: 1rem; padding: 1rem;';
    errorDiv.textContent = message;
    document.getElementById('uploadSection').appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
  }

  showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'card';
    successDiv.style.cssText = 'background: rgba(34,197,94,0.1); border-color: var(--accent-2); margin-top: 1rem; padding: 1rem;';
    successDiv.textContent = message;
    document.getElementById('uploadSection').appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
  }

  async authenticate() {
    if (!this.tokenClient) {
      this.showError('Google API not initialized. Please check your configuration.');
      return;
    }

    // Check if user is already authenticated
    const token = this.gapi.client.getToken();
    if (token) {
      this.onAuthSuccess();
      return;
    }

    // Request access token
    this.tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  async onAuthSuccess() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
    // Ensure folder ID is set from config before setting up handlers
    if (!this.folderId && window.GOOGLE_DRIVE_DEFAULT_FOLDER_ID) {
      this.folderId = window.GOOGLE_DRIVE_DEFAULT_FOLDER_ID;
      console.log('Set default folder ID:', this.folderId);
    }
    // Fetch user info for audit trail
    await this.fetchUserInfo();
    this.setupFileHandlers();
  }

  async fetchUserInfo() {
    try {
      // Use Google UserInfo API to get user email and name
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${this.gapi.client.getToken().access_token}`
        }
      });
      
      if (response.ok) {
        const userInfo = await response.json();
        this.userEmail = userInfo.email || userInfo.id || 'Unknown';
        this.userName = userInfo.name || userInfo.email || 'Unknown';
        console.log('User authenticated:', this.userEmail);
      }
    } catch (error) {
      console.warn('Could not fetch user info:', error);
      // Fallback: try to extract from token if possible
      this.userEmail = 'Unknown';
      this.userName = 'Unknown';
    }
  }

  logout() {
    const token = this.gapi.client.getToken();
    if (token) {
      google.accounts.oauth2.revoke(token.access_token);
      this.gapi.client.setToken('');
    }
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('uploadSection').style.display = 'none';
    this.files = [];
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('fileInput').value = '';
  }

  setupFileHandlers() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const folderIdInput = document.getElementById('folderIdInput');

    // File input change
    fileInput.addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      this.handleFiles(e.dataTransfer.files);
    });

    // Click to select - but prevent double-triggering when clicking the label/button
    uploadArea.addEventListener('click', (e) => {
      // Don't trigger if clicking directly on the label or button
      if (e.target.tagName === 'LABEL' || e.target.closest('label') || e.target.tagName === 'INPUT') {
        return; // Let the label's default behavior handle it
      }
      fileInput.click();
    });

    // Folder ID change (if folder input exists)
    if (folderIdInput) {
      folderIdInput.addEventListener('input', (e) => {
        this.folderId = e.target.value.trim() || window.GOOGLE_DRIVE_DEFAULT_FOLDER_ID || null;
      });
      
      // Set default folder ID if configured
      if (window.GOOGLE_DRIVE_DEFAULT_FOLDER_ID) {
        folderIdInput.value = window.GOOGLE_DRIVE_DEFAULT_FOLDER_ID;
        this.folderId = window.GOOGLE_DRIVE_DEFAULT_FOLDER_ID;
      }
    } else {
      // For standalone page without folder input, use default folder ID from config
      this.folderId = window.GOOGLE_DRIVE_DEFAULT_FOLDER_ID || null;
    }

    // Upload button
    document.getElementById('uploadBtn').addEventListener('click', () => {
      this.uploadAllFiles();
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
      this.logout();
    });
  }

  handleFiles(fileList) {
    Array.from(fileList).forEach(file => {
      if (!this.files.find(f => f.file.name === file.name && f.file.size === file.size)) {
        this.files.push({
          file: file,
          status: 'pending',
          progress: 0,
          driveFileId: null
        });
      }
    });
    this.renderFileList();
    this.updateUploadButton();
  }

  renderFileList() {
    const fileList = document.getElementById('fileList');
    if (this.files.length === 0) {
      fileList.innerHTML = '';
      return;
    }

    fileList.innerHTML = this.files.map((item, index) => {
      const file = item.file;
      const size = this.formatFileSize(file.size);
      const icon = this.getFileIcon(file.type);
      
      let statusHtml = '';
      if (item.status === 'pending') {
        statusHtml = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn ghost" onclick="driveUploader.removeFile(${index})" style="padding: .4rem .6rem; font-size: .85rem;">Remove</button>
          </div>
        `;
      } else if (item.status === 'uploading') {
        statusHtml = `
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="upload-progress">
              <div class="upload-progress-bar" style="width: ${item.progress}%"></div>
            </div>
            <span class="upload-status uploading">${item.progress}%</span>
          </div>
        `;
      } else if (item.status === 'success') {
        statusHtml = `
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="upload-status success">✓ Uploaded</span>
            <a href="https://drive.google.com/file/d/${item.driveFileId}/view" target="_blank" class="btn ghost" style="padding: .4rem .6rem; font-size: .85rem;">Open</a>
          </div>
        `;
      } else if (item.status === 'error') {
        statusHtml = `
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="upload-status error">✗ Failed</span>
            <button class="btn ghost" onclick="driveUploader.retryUpload(${index})" style="padding: .4rem .6rem; font-size: .85rem;">Retry</button>
          </div>
        `;
      }
      
      return `
        <div class="file-item" data-index="${index}">
          <div class="file-info">
            <div class="file-icon">${icon}</div>
            <div class="file-details">
              <div class="file-name">${file.name}</div>
              <div class="file-size">${size}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            ${statusHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  removeFile(index) {
    this.files.splice(index, 1);
    this.renderFileList();
    this.updateUploadButton();
  }

  retryUpload(index) {
    this.files[index].status = 'pending';
    this.files[index].progress = 0;
    this.files[index].error = null;
    this.renderFileList();
    this.updateUploadButton();
    if (this.files.every(f => f.status !== 'uploading')) {
      this.uploadAllFiles();
    }
  }

  updateUploadButton() {
    const uploadBtn = document.getElementById('uploadBtn');
    const hasPendingFiles = this.files.some(f => f.status === 'pending');
    uploadBtn.disabled = !hasPendingFiles;
  }

  async uploadAllFiles() {
    const pendingFiles = this.files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    for (const item of pendingFiles) {
      await this.uploadFile(item);
    }
  }

  async uploadFile(item) {
    item.status = 'uploading';
    item.progress = 0;
    this.renderFileList();

    try {
      const file = item.file;
      const metadata = {
        name: file.name,
      };

      // Add parent folder if specified - ensure folderId is set
      if (!this.folderId && window.GOOGLE_DRIVE_DEFAULT_FOLDER_ID) {
        this.folderId = window.GOOGLE_DRIVE_DEFAULT_FOLDER_ID;
      }
      
      if (this.folderId) {
        metadata.parents = [this.folderId];
        console.log('Uploading to folder:', this.folderId);
      } else {
        console.log('No folder ID set, uploading to Drive root');
      }

      // Add uploader information to file description for audit trail
      const uploadTimestamp = new Date().toISOString();
      const uploadDate = new Date(uploadTimestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      
      // Format: "Uploaded by: Name (email@example.com) on Date Time"
      // Or if name is same as email: "Uploaded by: email@example.com on Date Time"
      let uploaderInfo;
      if (this.userName && this.userName !== this.userEmail) {
        uploaderInfo = `Uploaded by: ${this.userName} (${this.userEmail || 'Unknown'}) on ${uploadDate}`;
      } else {
        uploaderInfo = `Uploaded by: ${this.userEmail || 'Unknown'} on ${uploadDate}`;
      }
      metadata.description = uploaderInfo;
      
      // Also add as custom property for easy querying
      metadata.properties = {
        'uploader_email': this.userEmail || 'Unknown',
        'uploader_name': this.userName || 'Unknown',
        'upload_timestamp': uploadTimestamp
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      // Use resumable upload for files larger than 5MB
      if (file.size > 5 * 1024 * 1024) {
        await this.resumableUpload(form, item, metadata);
      } else {
        await this.simpleUpload(form, item);
      }

      item.status = 'success';
      item.progress = 100;
      this.renderFileList();
      this.updateUploadButton();
      this.showSuccess(`Successfully uploaded ${file.name}`);
    } catch (error) {
      console.error('Upload error:', error);
      item.status = 'error';
      item.error = error.message;
      this.renderFileList();
      
      // Provide better error messages for common issues
      let errorMessage = error.message;
      if (error.message && error.message.includes('File not found')) {
        errorMessage = 'Folder access denied. The folder may not be shared with your Google account. Please contact the folder owner.';
      } else if (error.message && error.message.includes('403')) {
        errorMessage = 'Permission denied. You may not have access to upload to this folder.';
      } else if (error.message && error.message.includes('404')) {
        errorMessage = 'Folder not found. The target folder may not exist or may not be accessible.';
      }
      
      this.showError(`Failed to upload ${item.file.name}: ${errorMessage}`);
    }
  }

  async simpleUpload(form, item) {
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.gapi.client.getToken().access_token}`,
      },
      body: form,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    const result = await response.json();
    item.driveFileId = result.id;
  }

  async resumableUpload(form, item, metadata) {
    // Step 1: Initiate resumable upload session
    const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.gapi.client.getToken().access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!initResponse.ok) {
      const error = await initResponse.json();
      throw new Error(error.error?.message || 'Failed to initiate upload');
    }

    const uploadUrl = initResponse.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('No upload URL received');
    }

    // Step 2: Upload file in chunks with progress tracking
    const file = item.file;
    const chunkSize = 256 * 1024; // 256KB chunks
    let uploaded = 0;

    while (uploaded < file.size) {
      const chunk = file.slice(uploaded, uploaded + chunkSize);
      const start = uploaded;
      const end = Math.min(uploaded + chunkSize - 1, file.size - 1);

      const chunkResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Range': `bytes ${start}-${end}/${file.size}`,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: chunk,
      });

      if (chunkResponse.status === 308) {
        // Incomplete upload, continue
        uploaded += chunkSize;
        item.progress = Math.round((uploaded / file.size) * 100);
        this.renderFileList();
      } else if (chunkResponse.ok) {
        // Upload complete
        const result = await chunkResponse.json();
        item.driveFileId = result.id;
        item.progress = 100;
        this.renderFileList();
        break;
      } else {
        const error = await chunkResponse.json();
        throw new Error(error.error?.message || 'Chunk upload failed');
      }
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
    if (mimeType.includes('code') || mimeType.includes('text')) return '📃';
    return '📎';
  }
}

// Initialize on page load
let driveUploader;
document.addEventListener('DOMContentLoaded', async () => {
  driveUploader = new GoogleDriveUploader();
  
  // Wait a bit for the uploader to initialize
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Set up auth button
  const authBtn = document.getElementById('authBtn');
  if (authBtn) {
    authBtn.addEventListener('click', () => {
      if (!driveUploader.tokenClient) {
        driveUploader.showConfigError();
        return;
      }
      driveUploader.authenticate();
    });
  }
});

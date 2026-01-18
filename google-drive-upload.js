// Google Drive Upload Handler
class GoogleDriveUploader {
  constructor() {
    this.DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
    // Using 'drive' scope instead of 'drive.file' to enable ownership transfer
    // drive.file scope doesn't allow transferring file ownership to folder owner
    this.SCOPES = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email';
    this.tokenClient = null;
    this.gapi = null;
    this.files = [];
    this.folderId = null;
    this.userEmail = null;
    this.userName = null;
    this.deviceInfo = null;
    
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
        callback: async (response) => {
          if (response.error) {
            // If user interaction required
            if (response.error === 'popup_closed_by_user' || response.error === 'access_denied') {
              console.log('User cancelled authentication');
              return;
            }
            // For other errors during explicit auth
            if (response.error !== 'popup_blocked') {
              console.error('Authentication error:', response.error);
              this.showError('Authentication failed. Please try again.');
            }
            return;
          }
          // Success - token received
          this.gapi.client.setToken(response);
          await this.onAuthSuccess();
        },
      });
      
      // Check for existing token silently (without calling requestAccessToken)
      // This avoids triggering any prompts on page load
      setTimeout(async () => {
        const existingToken = this.gapi.client.getToken();
        if (existingToken && existingToken.access_token) {
          // Token exists, verify it's still valid
          try {
            const testResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: {
                'Authorization': `Bearer ${existingToken.access_token}`
              }
            });
            
            if (testResponse.ok) {
              // Token is valid, restore session silently
              console.log('Restored session from existing token');
              await this.onAuthSuccess();
            } else {
              // Token invalid, clear it (but don't show auth button - let user click when ready)
              this.gapi.client.setToken('');
            }
          } catch (error) {
            console.log('Token validation failed:', error);
            this.gapi.client.setToken('');
          }
        }
      }, 500);
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
    if (token && token.access_token) {
      // Verify token is still valid
      try {
        const testResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${token.access_token}`
          }
        });
        
        if (testResponse.ok) {
          // Token is valid
          await this.onAuthSuccess();
          return;
        }
      } catch (error) {
        console.log('Token validation failed, requesting new token');
        // Token invalid, clear it and request new one
        this.gapi.client.setToken('');
      }
    }

    // Request access token with consent prompt (explicit user action)
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
    
    // Collect device and browser information
    await this.collectDeviceInfo();
  }

  async collectDeviceInfo() {
    try {
      // Parse user agent for browser and device info
      const userAgent = navigator.userAgent;
      const browserInfo = this.parseUserAgent(userAgent);
      
      // Get screen information
      const screenInfo = {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio || 1
      };
      
      // Get timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
      
      // Get language
      const language = navigator.language || navigator.userLanguage || 'Unknown';
      
      // Get IP address and location (using ipify.org and ipapi.co - no permission required)
      let ipAddress = 'Unknown';
      let location = 'Unknown';
      
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          ipAddress = ipData.ip || 'Unknown';
          
          // Get location from IP (using ipapi.co - free tier, no permission required)
          try {
            const locResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`);
            if (locResponse.ok) {
              const locData = await locResponse.json();
              location = `${locData.city || ''}, ${locData.region || ''}, ${locData.country_name || ''}`.replace(/^,\s*|,\s*$/g, '').trim() || 'Unknown';
            }
          } catch (locError) {
            console.warn('Could not fetch IP-based location:', locError);
          }
        }
      } catch (ipError) {
        console.warn('Could not fetch IP address:', ipError);
      }
      
      this.deviceInfo = {
        browser: browserInfo.browser,
        browserVersion: browserInfo.version,
        os: browserInfo.os,
        deviceType: browserInfo.deviceType,
        userAgent: userAgent,
        screen: `${screenInfo.width}x${screenInfo.height}`,
        pixelRatio: screenInfo.pixelRatio,
        timezone: timezone,
        language: language,
        ipAddress: ipAddress,
        location: location,
        platform: navigator.platform || 'Unknown'
      };
      
      console.log('Device info collected:', this.deviceInfo);
    } catch (error) {
      console.warn('Could not collect device info:', error);
      this.deviceInfo = {
        browser: 'Unknown',
        os: 'Unknown',
        userAgent: navigator.userAgent || 'Unknown'
      };
    }
  }

  parseUserAgent(userAgent) {
    let browser = 'Unknown';
    let version = 'Unknown';
    let os = 'Unknown';
    let deviceType = 'Desktop';
    
    // Parse browser
    if (userAgent.includes('Firefox/')) {
      browser = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
      browser = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
      browser = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Edg/')) {
      browser = 'Edge';
      const match = userAgent.match(/Edg\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    }
    
    // Parse OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS X') || userAgent.includes('Macintosh')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    
    // Detect device type
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      deviceType = 'Mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      deviceType = 'Tablet';
    }
    
    return { browser, version, os, deviceType };
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
      } else if (item.status === 'skipped') {
        statusHtml = `
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="upload-status" style="color: var(--muted);">⊘ Already exists</span>
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
    console.log(`Starting upload of ${pendingFiles.length} pending files`);
    if (pendingFiles.length === 0) return;

    for (const item of pendingFiles) {
      console.log(`Uploading file: ${item.file.name}`);
      await this.uploadFile(item);
      console.log(`Completed upload of: ${item.file.name}, status: ${item.status}`);
    }
    console.log(`Finished uploading all ${pendingFiles.length} files`);
  }

  async checkFileExists(fileName, fileSize, uploaderEmail) {
    try {
      // Build query to search for files with same name, size, and uploader
      let query = `name='${fileName.replace(/'/g, "\\'")}' and trashed=false`;
      
      // Add folder constraint if folder ID is set
      if (this.folderId) {
        query += ` and '${this.folderId}' in parents`;
      }
      
      // Search for files with matching name and folder
      const response = await this.gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name, size, properties)',
        pageSize: 100
      });
      
      if (response.result.files && response.result.files.length > 0) {
        // Check each file for matching size and uploader email
        for (const existingFile of response.result.files) {
          // Check if size matches (check both native size and custom property)
          const existingSize = existingFile.size || existingFile.properties?.file_size;
          const sizeMatches = existingSize && String(existingSize) === String(fileSize);
          
          // Check if uploader email matches
          const existingUploader = existingFile.properties?.uploader_email;
          const uploaderMatches = existingUploader && existingUploader === uploaderEmail;
          
          if (sizeMatches && uploaderMatches) {
            return existingFile; // Duplicate found
          }
        }
      }
      return null; // No duplicate found
    } catch (error) {
      console.warn('Error checking for duplicate file:', error);
      // If check fails, allow upload to proceed (don't block on check errors)
      return null;
    }
  }

  async uploadFile(item) {
    item.status = 'uploading';
    item.progress = 0;
    this.renderFileList();

    try {
      const file = item.file;
      
      // Check for duplicate file before uploading
      const duplicateFile = await this.checkFileExists(file.name, file.size, this.userEmail);
      if (duplicateFile) {
        item.status = 'skipped';
        item.progress = 100;
        item.error = 'File already exists';
        this.renderFileList();
        this.updateUploadButton();
        this.showSuccess(`Skipped ${file.name}: File already exists (uploaded by ${this.userEmail})`);
        console.log(`Skipped duplicate file: ${file.name}`);
        return;
      }
      
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

      // Add comprehensive uploader information to file description for audit trail
      const uploadTimestamp = new Date().toISOString();
      const uploadDate = new Date(uploadTimestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      
      // Get device info or parse fresh if not collected
      let deviceInfo = this.deviceInfo;
      if (!deviceInfo) {
        // Fallback: parse user agent directly if deviceInfo not collected yet
        const browserInfo = this.parseUserAgent(navigator.userAgent);
        deviceInfo = {
          browser: browserInfo.browser,
          browserVersion: browserInfo.version,
          os: browserInfo.os,
          deviceType: browserInfo.deviceType,
          platform: navigator.platform || 'Unknown'
        };
      }
      
      // Format: "Uploaded by: Name (email@example.com) on Date Time"
      // Or if name is same as email: "Uploaded by: email@example.com on Date Time"
      let uploaderInfo;
      if (this.userName && this.userName !== this.userEmail) {
        uploaderInfo = `Uploaded by: ${this.userName} (${this.userEmail || 'Unknown'}) on ${uploadDate}`;
      } else {
        uploaderInfo = `Uploaded by: ${this.userEmail || 'Unknown'} on ${uploadDate}`;
      }
      
      // Add device and network information (always include browser/OS if detected)
      const deviceParts = [];
      
      // Browser (should always be detectable)
      if (deviceInfo.browser && deviceInfo.browser !== 'Unknown') {
        const browserStr = deviceInfo.browser + (deviceInfo.browserVersion && deviceInfo.browserVersion !== 'Unknown' ? ' ' + deviceInfo.browserVersion : '');
        deviceParts.push(`Browser: ${browserStr}`);
      }
      
      // OS (should always be detectable)
      if (deviceInfo.os && deviceInfo.os !== 'Unknown') {
        deviceParts.push(`OS: ${deviceInfo.os}`);
      }
      
      // Device type
      if (deviceInfo.deviceType && deviceInfo.deviceType !== 'Unknown') {
        deviceParts.push(`Device: ${deviceInfo.deviceType}`);
      }
      
      // Platform
      if (deviceInfo.platform && deviceInfo.platform !== 'Unknown') {
        deviceParts.push(`Platform: ${deviceInfo.platform}`);
      }
      
      // IP and location (may not be available immediately)
      if (deviceInfo.ipAddress && deviceInfo.ipAddress !== 'Unknown') {
        deviceParts.push(`IP: ${deviceInfo.ipAddress}`);
      }
      if (deviceInfo.location && deviceInfo.location !== 'Unknown') {
        deviceParts.push(`Location: ${deviceInfo.location}`);
      }
      
      const deviceDetails = deviceParts.length > 0 ? deviceParts.join(' | ') : null;
      metadata.description = uploaderInfo + (deviceDetails ? `\n\n${deviceDetails}` : '');
      
      console.log('Device info used:', deviceInfo);
      console.log('File description:', metadata.description);
      
      // Add comprehensive audit trail as custom properties
      metadata.properties = {
        'uploader_email': this.userEmail || 'Unknown',
        'uploader_name': this.userName || 'Unknown',
        'upload_timestamp': uploadTimestamp,
        'file_size': String(file.size), // Store file size for duplicate detection
        'upload_ip': deviceInfo.ipAddress || 'Unknown',
        'upload_location': deviceInfo.location || 'Unknown',
        'upload_browser': deviceInfo.browser || 'Unknown',
        'upload_browser_version': deviceInfo.browserVersion || 'Unknown',
        'upload_os': deviceInfo.os || 'Unknown',
        'upload_device_type': deviceInfo.deviceType || 'Unknown',
        'upload_screen': deviceInfo.screen || 'Unknown',
        'upload_timezone': deviceInfo.timezone || 'Unknown',
        'upload_language': deviceInfo.language || 'Unknown',
        'upload_platform': deviceInfo.platform || 'Unknown'
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
    
    // Transfer ownership to folder owner to avoid consuming uploader's Drive space
    await this.transferFileOwnership(result.id);
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
        
        // Transfer ownership to folder owner to avoid consuming uploader's Drive space
        await this.transferFileOwnership(result.id);
        break;
      } else {
        const error = await chunkResponse.json();
        throw new Error(error.error?.message || 'Chunk upload failed');
      }
    }
  }

  async transferFileOwnership(fileId) {
    try {
      // Get folder owner email from folder metadata
      if (!this.folderId) {
        console.log('No folder ID, cannot transfer ownership');
        return;
      }
      
      const folderResponse = await this.gapi.client.drive.files.get({
        fileId: this.folderId,
        fields: 'owners(emailAddress)'
      });
      
      if (folderResponse.result.owners && folderResponse.result.owners.length > 0) {
        const folderOwnerEmail = folderResponse.result.owners[0].emailAddress;
        
        // Transfer ownership to folder owner
        try {
          // Get current file permissions
          const currentPermissions = await this.gapi.client.drive.permissions.list({
            fileId: fileId,
            fields: 'permissions(id, role, type, emailAddress)'
          });
          
          // Check if folder owner already has a permission entry
          const existingPermission = currentPermissions.result.permissions?.find(
            p => p.emailAddress === folderOwnerEmail && (p.role === 'writer' || p.role === 'owner')
          );
          
          if (existingPermission) {
            // Folder owner already has access, transfer ownership directly
            await this.gapi.client.drive.permissions.update({
              fileId: fileId,
              permissionId: existingPermission.id,
              transferOwnership: true,
              requestBody: {
                role: 'owner'
              }
            });
            console.log('File ownership transferred to:', folderOwnerEmail);
          } else {
            // Folder owner doesn't have explicit permission, grant access first then transfer
            const newPermission = await this.gapi.client.drive.permissions.create({
              fileId: fileId,
              requestBody: {
                role: 'writer',
                type: 'user',
                emailAddress: folderOwnerEmail
              }
            });
            
            // Now transfer ownership
            await this.gapi.client.drive.permissions.update({
              fileId: fileId,
              permissionId: newPermission.result.id,
              transferOwnership: true,
              requestBody: {
                role: 'owner'
              }
            });
            console.log('File ownership transferred to:', folderOwnerEmail);
          }
          return;
        } catch (transferError) {
          console.error('Ownership transfer failed:', transferError);
          console.error('Error details:', JSON.stringify(transferError, null, 2));
          throw transferError; // Re-throw to be caught by outer catch
        }
        
        console.warn('Both ownership transfer methods failed. File owned by uploader.');
        console.warn('Note: To enable ownership transfer, you may need to use drive scope instead of drive.file scope.');
      } else {
        console.warn('Could not get folder owner email for ownership transfer');
      }
    } catch (error) {
      // Ownership transfer failed - this is expected with drive.file scope
      console.warn('Could not transfer file ownership:', error.message);
      console.warn('File is owned by uploader. To fix this:');
      console.warn('1. Use drive scope instead of drive.file (requires more permissions)');
      console.warn('2. Or manually transfer ownership after upload');
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

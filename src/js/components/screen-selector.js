/**
 * Screen Selector Component
 * 
 * Provides UI for selecting screens and applications for sharing
 */

const ScreenSelector = {
  // Track selected source
  selectedSource: null,
  
  // Available sources
  sources: [],
  
  // Quality settings
  qualitySettings: {
    '720p': { width: 1280, height: 720, frameRate: 30 },
    '1080p': { width: 1920, height: 1080, frameRate: 30 },
    '4K': { width: 3840, height: 2160, frameRate: 30 },
    'gaming': { width: 1920, height: 1080, frameRate: 60 }
  },
  
  /**
   * Show the screen sharing selection dialog
   * @returns {Promise<Object>} Selected source details or null if canceled
   */
  showSelectionDialog: function() {
    return new Promise(async (resolve) => {
      try {
        // Get available sources
        this.sources = await window.media.getScreenSources();
        
        // Create dialog element
        const dialog = document.createElement('div');
        dialog.className = 'screen-share-dialog';
        
        // Prepare screens and windows lists
        const screens = this.sources.filter(source => source.type === 'screen');
        const windows = this.sources.filter(source => source.type === 'window');
        
        dialog.innerHTML = `
          <div class="screen-share-container">
            <div class="screen-share-header">
              <h2>Share Your Screen</h2>
            </div>
            <div class="screen-share-content">
              <div class="screen-share-tabs">
                <div class="screen-share-tab active" data-tab="screens">Entire Screen</div>
                <div class="screen-share-tab" data-tab="windows">Application Window</div>
              </div>
              <div class="source-grid" id="screens-grid">
                ${screens.map(screen => this._renderSourceItem(screen)).join('')}
              </div>
              <div class="source-grid" id="windows-grid" style="display: none;">
                ${windows.map(window => this._renderSourceItem(window)).join('')}
              </div>
            </div>
            <div class="screen-share-footer">
              <div class="audio-capture-option">
                <input type="checkbox" id="capture-audio">
                <label for="capture-audio">Share audio</label>
              </div>
              <div class="screen-share-actions">
                <select class="quality-selector" id="quality-selector">
                  <option value="720p">720p (Low)</option>
                  <option value="1080p" selected>1080p (Recommended)</option>
                  <option value="4K">4K (High)</option>
                  <option value="gaming">Gaming (60 fps)</option>
                </select>
                <button class="cancel-btn" id="cancel-share">Cancel</button>
                <button class="share-btn" id="confirm-share" disabled>Share</button>
              </div>
            </div>
          </div>
        `;
        
        // Add to document
        document.body.appendChild(dialog);

        // Set up event listeners
        this._setupEventListeners(dialog, resolve);
      } catch (error) {
        console.error('Error in showSelectionDialog:', error);
        resolve(null);
      }
    });
  },

  /**
   * Render a source item
   * @param {Object} source
   * @returns {string} HTML string
   * @private
   */
  _renderSourceItem: function(source) {
    // Create appropriate icon based on source type
    const iconHtml = source.appIcon 
      ? `<div class="source-icon"><img src="${source.appIcon}" alt=""></div>` 
      : source.type === 'screen' 
        ? '<div class="source-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg></div>' 
        : '<div class="source-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect></svg></div>';
    
    return `
      <div class="source-item" data-source-id="${source.id}">
        <div class="source-thumbnail">
          <img src="${source.thumbnail}" alt="${source.name}">
          ${iconHtml}
        </div>
        <div class="source-info">
          <div class="source-name">${source.name}</div>
        </div>
      </div>
    `;
  },

  /**
   * Set up event listeners for dialog
   * @param {Element} dialog Dialog element
   * @param {Function} resolve Promise resolve function
   * @private
   */
  _setupEventListeners: function(dialog, resolve) {
    // Tab switching
    const tabs = dialog.querySelectorAll('.screen-share-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show appropriate grid
        const tabName = tab.dataset.tab;
        const screensGrid = dialog.querySelector('#screens-grid');
        const windowsGrid = dialog.querySelector('#windows-grid');
        
        if (tabName === 'screens') {
          screensGrid.style.display = '';
          windowsGrid.style.display = 'none';
        } else {
          screensGrid.style.display = 'none';
          windowsGrid.style.display = '';
        }
      });
    });
    
    // Source selection
    const sourceItems = dialog.querySelectorAll('.source-item');
    sourceItems.forEach(item => {
      item.addEventListener('click', () => {
        // Update selection
        sourceItems.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        
        // Store selected source
        const sourceId = item.dataset.sourceId;
        this.selectedSource = this.sources.find(s => s.id === sourceId);
        
        // Enable share button
        const shareBtn = dialog.querySelector('#confirm-share');
        shareBtn.disabled = false;
      });
    });
    
    // Cancel button
    const cancelBtn = dialog.querySelector('#cancel-share');
    cancelBtn.addEventListener('click', () => {
      dialog.remove();
      resolve(null);
    });
    
    // Share button
    const shareBtn = dialog.querySelector('#confirm-share');
    shareBtn.addEventListener('click', () => {
      if (!this.selectedSource) return;
      
      // Get options
      const captureAudio = dialog.querySelector('#capture-audio').checked;
      const qualityKey = dialog.querySelector('#quality-selector').value;
      const qualityOptions = this.qualitySettings[qualityKey] || this.qualitySettings['1080p'];
      
      // Prepare result
      const result = {
        sourceId: this.selectedSource.id,
        sourceName: this.selectedSource.name,
        sourceType: this.selectedSource.type,
        options: {
          captureAudio,
          ...qualityOptions
        }
      };
      
      dialog.remove();
      resolve(result);
    });
    
    // Close on Escape key
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        dialog.remove();
        document.removeEventListener('keydown', escHandler);
        resolve(null);
      }
    });
  },

  /**
   * Show permission guidance if needed
   */
  showPermissionGuidance: function() {
    const platform = navigator.platform;
    let guidance = '';
    
    if (platform.includes('Mac')) {
      guidance = `
        <p>macOS requires explicit permission for screen recording.</p>
        <p>You'll need to allow FoxDen in System Preferences > Security & Privacy > Privacy > Screen Recording.</p>
        <p>You may need to restart the application after granting permission.</p>
      `;
    } else if (platform.includes('Win')) {
      guidance = `
        <p>You'll be asked to select which screen or application window you want to share.</p>
        <p>Some applications with enhanced security may appear as black screens.</p>
      `;
    } else if (platform.includes('Linux')) {
      guidance = `
        <p>Depending on your desktop environment, you may need to grant additional permissions.</p>
        <p>X11: Screen sharing should work normally.</p>
        <p>Wayland: Some limitations may apply depending on your distribution.</p>
      `;
    }
    
    // Check if Utils is available
    if (typeof Utils !== 'undefined' && Utils.showModal) {
      Utils.showModal({
        title: 'Screen Sharing Permission',
        content: guidance,
        buttons: [
          { text: 'Cancel', type: 'secondary' },
          { text: 'Continue', type: 'primary' }
        ]
      });
    } else {
      // Fallback if Utils is not available
      alert("Screen Sharing Permission Required: " + guidance.replace(/<[^>]*>/g, ''));
    }
  }
};

// Export for use in other modules
window.ScreenSelector = ScreenSelector;
console.log("Screen Selector module loaded successfully");

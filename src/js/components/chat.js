/**
 * FoxDen Chat Management
 * 
 * Handles all functionality related to text messaging
 */

const ChatManager = {
    // Track initialization state
    initialized: false,
    
    // Store temporary message drafts
    messageDrafts: {},
    
    // Track typing indicator state
    typingTimeout: null,
    usersTyping: {},
    
    /**
     * Initialize the chat manager
     */
    init: function() {
      if (this.initialized) return;
      
      // Cache DOM elements
      this.messagesContainer = document.getElementById('messages-container');
      this.messageInput = document.getElementById('message-input');
      this.textContainer = document.getElementById('text-container');
      this.uploadButton = document.getElementById('upload-button');
      this.emojiButton = document.getElementById('emoji-button');
      this.emojiModal = document.getElementById('emoji-modal');
      
      // Create typing indicator element with persistent animation dots
      this.typingIndicator = document.createElement('div');
      this.typingIndicator.className = 'typing-indicator';
      this.typingIndicator.style.display = 'none'; // Hide initially
      
      // Create the structure with separate text and animation elements
      this.typingIndicator.innerHTML = `
        <span class="typing-text"></span>
        <span class="typing-animation">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </span>
      `;
      
      // Cache the text element for easy updates
      this.typingText = this.typingIndicator.querySelector('.typing-text');
      
      // Insert before the chat input container
      const chatInputArea = this.textContainer.querySelector('.chat-input-area');
      const chatInputContainer = this.textContainer.querySelector('.chat-input-container');
      chatInputArea.insertBefore(this.typingIndicator, chatInputContainer);
      
      // Set up event listeners
      this._setupEventListeners();
      
      // Subscribe to state changes
      AppState.subscribe('activeChannel', (channelId) => this._handleActiveChannelChange(channelId));
      AppState.subscribe('messages', () => this.renderMessages());
      
      this.initialized = true;
    },
    
    /**
     * Set up event listeners for chat-related elements
     * @private
     */
    _setupEventListeners: function() {
      // Handle message input events
      this.messageInput.addEventListener('keydown', (e) => {
        // Send message on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
        
        // Save draft on input
        this._saveDraft();
        
        // Send typing indicator
        this._sendTypingIndicator();
      });
      
      // Add blur event listener to clear typing when clicking away
      this.messageInput.addEventListener('blur', () => {
        const currentUser = AppState.get('currentUser');
        delete this.usersTyping[currentUser.id];
        this._updateTypingIndicator();
      });
      
      // Handle message context menu
      this.messagesContainer.addEventListener('contextmenu', (e) => {
        const messageElement = e.target.closest('.message');
        if (messageElement) {
          e.preventDefault();
          
          const messageId = messageElement.dataset.messageId;
          if (messageId) {
            this._showMessageContextMenu(e, messageId);
          }
        }
      });
      
      // Handle file upload
      this.uploadButton.addEventListener('click', () => {
        this._handleFileUpload();
      });
      
      // Handle emoji picker
      this.emojiButton.addEventListener('click', (e) => {
        this._toggleEmojiPicker(e);
      });
      
      // Close emoji picker when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#emoji-modal') && !e.target.closest('#emoji-button')) {
          this.emojiModal.classList.remove('active');
        }
      });
      
      // Populate emoji grid
      this._populateEmojiGrid();
      
      // Handle emoji selection
      const emojiGrid = this.emojiModal.querySelector('.emoji-grid');
      emojiGrid.addEventListener('click', (e) => {
        const emoji = e.target.closest('.emoji');
        if (emoji) {
          this._insertEmoji(emoji.textContent);
          this.emojiModal.classList.remove('active');
        }
      });
      
      // Handle emoji category selection
      const emojiCategories = this.emojiModal.querySelectorAll('.emoji-category');
      emojiCategories.forEach((category, index) => {
        category.addEventListener('click', () => {
          // Update active category
          emojiCategories.forEach(c => c.classList.remove('active'));
          category.classList.add('active');
          
          // Show emojis for this category
          this._showEmojiCategory(index);
        });
      });
      
      // Handle emoji search
      const emojiSearch = this.emojiModal.querySelector('.emoji-search');
      emojiSearch.addEventListener('input', (e) => {
        this._searchEmojis(e.target.value);
      });
      
      // Handle message reactions
      this.messagesContainer.addEventListener('click', (e) => {
        const reaction = e.target.closest('.reaction');
        if (reaction) {
          const messageId = reaction.closest('.message').dataset.messageId;
          const emoji = reaction.querySelector('.reaction-emoji').textContent;
          this._toggleReaction(messageId, emoji);
        }
      });
      
      // Handle scrolling to load more messages
      this.messagesContainer.addEventListener('scroll', () => {
        // If scrolled to top, load older messages
        if (this.messagesContainer.scrollTop === 0) {
          this._loadOlderMessages();
        }
      });
      
      // Handle click on new messages indicator
      const newMessagesIndicator = document.createElement('div');
      newMessagesIndicator.className = 'new-messages-indicator';
      newMessagesIndicator.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
        New Messages
      `;
      this.textContainer.appendChild(newMessagesIndicator);
      
      newMessagesIndicator.addEventListener('click', () => {
        this.scrollToBottom();
        newMessagesIndicator.classList.remove('visible');
      });
      
      // Store for later use
      this.newMessagesIndicator = newMessagesIndicator;
      
      // Handle attachment preview close
      this.messagesContainer.addEventListener('click', (e) => {
        const closeButton = e.target.closest('.attachment-close');
        if (closeButton) {
          const attachment = closeButton.closest('.attachment-preview');
          attachment.remove();
        }
      });

      // Handle message action buttons (react, edit, delete)
      this.messagesContainer.addEventListener('click', (e) => {
        const actionButton = e.target.closest('.message-action');
        if (actionButton) {
          const messageElement = actionButton.closest('.message');
          if (messageElement) {
            const messageId = messageElement.dataset.messageId;
            const action = actionButton.dataset.action;
            
            if (messageId && action) {
              this._handleMessageAction(action, messageId, e);
            }
          }
        }
      });
    },
    
    /**
     * Render messages for the active channel
     */
    renderMessages: function() {
      const channelId = AppState.get('activeChannel');
      if (!channelId) {
        this.messagesContainer.innerHTML = '';
        return;
      }
      
      const channel = AppState.getActiveChannel();
      if (!channel || channel.type !== 'text') {
        return;
      }
      
      const messages = AppState.getMessagesForChannel(channelId);
      
      // Clear existing messages
      this.messagesContainer.innerHTML = '';
      
      // Check if there are any messages
      if (!messages || messages.length === 0) {
        this.messagesContainer.innerHTML = `
          <div class="messages-start">
            <div class="channel-icon">#</div>
            <h3>Welcome to #${channel.name}!</h3>
            <p>This is the start of the #${channel.name} channel.</p>
          </div>
        `;
        return;
      }
      
      // Group messages by day
      const messagesByDay = this._groupMessagesByDay(messages);
      
      // Render messages for each day
      Object.entries(messagesByDay).forEach(([day, dayMessages]) => {
        // Add date divider
        const dateDivider = document.createElement('div');
        dateDivider.className = 'messages-date-divider';
        dateDivider.textContent = day;
        this.messagesContainer.appendChild(dateDivider);
        
        // Add messages for this day
        let lastAuthor = null;
        let lastTimestamp = null;
        
        dayMessages.forEach(message => {
          // Check if this message should be grouped with the previous one
          const shouldGroup = this._shouldGroupMessages(message, lastAuthor, lastTimestamp);
          
          // Create message element
          const messageElement = this._createMessageElement(message, shouldGroup);
          this.messagesContainer.appendChild(messageElement);
          
          // Update last author and timestamp
          lastAuthor = message.userId;
          lastTimestamp = message.timestamp;
        });
      });
      
      // Scroll to bottom after rendering
      this.scrollToBottom();
      
      // Load message draft if exists
      this._loadDraft();
      
      // Focus message input
      this.messageInput.focus();
    },
    
    /**
     * Group messages by day
     * @param {Array} messages - The messages to group
     * @returns {Object} Messages grouped by day
     * @private
     */
    _groupMessagesByDay: function(messages) {
      const groups = {};
      
      messages.forEach(message => {
        const date = new Date(message.timestamp);
        const day = Utils.formatDate(date);
        
        if (!groups[day]) {
          groups[day] = [];
        }
        
        groups[day].push(message);
      });
      
      return groups;
    },
    
    /**
     * Determine if a message should be grouped with the previous one
     * @param {Object} message - The current message
     * @param {string} lastAuthor - The previous message author ID
     * @param {string} lastTimestamp - The previous message timestamp
     * @returns {boolean} Whether the message should be grouped
     * @private
     */
    _shouldGroupMessages: function(message, lastAuthor, lastTimestamp) {
      // Don't group system messages
      if (message.type === 'system') {
        return false;
      }
      
      // Don't group if no previous message
      if (!lastAuthor || !lastTimestamp) {
        return false;
      }
      
      // Don't group if different author
      if (message.userId !== lastAuthor) {
        return false;
      }
      
      // Don't group if messages are more than 5 minutes apart
      const currentTimestamp = new Date(message.timestamp);
      const previousTimestamp = new Date(lastTimestamp);
      const timeDiff = currentTimestamp - previousTimestamp;
      if (timeDiff > 5 * 60 * 1000) {
        return false;
      }
      
      return true;
    },
    
    /**
     * Create a message element
     * @param {Object} message - The message data
     * @param {boolean} isGrouped - Whether the message is grouped with the previous one
     * @returns {HTMLElement} The message element
     * @private
     */
    _createMessageElement: function(message, isGrouped) {
      const messageElement = document.createElement('div');
      messageElement.className = `message ${message.type || ''} ${isGrouped ? 'grouped' : ''}`;
      messageElement.dataset.messageId = message.id;
      
      // System messages have a simplified format
      if (message.type === 'system') {
        messageElement.textContent = message.content;
        return messageElement;
      }
      
      // Format timestamp
      const timestamp = Utils.formatMessageTime(message.timestamp);
      
      // Format content with markdown, mentions, etc.
      const formattedContent = Utils.parseMessageText(message.content);
      
      // Get members for mention handling
      const members = AppState.getMembersForDen(AppState.get('activeDen')) || [];
      
      // Generate avatar initials
      const avatarInitials = message.avatar || Utils.getInitials(message.username);
      
      // Create message HTML
      messageElement.innerHTML = `
        <div class="message-timestamp">${timestamp}</div>
        <div class="avatar" style="background-color: ${Utils.getRandomAvatarColor()}">
          ${avatarInitials}
        </div>
        <div class="message-content">
          <div class="message-header">
            <div class="username">${message.username}</div>
            <div class="timestamp">${timestamp}</div>
          </div>
          <div class="message-text">${formattedContent}</div>
          ${message.attachment ? this._renderAttachment(message.attachment) : ''}
          ${message.reactions ? this._renderReactions(message.reactions) : ''}
        </div>
        <div class="message-actions">
          <div class="message-action" data-action="react">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
              <line x1="9" y1="9" x2="9.01" y2="9"></line>
              <line x1="15" y1="9" x2="15.01" y2="9"></line>
            </svg>
          </div>
          <div class="message-action" data-action="edit">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </div>
          <div class="message-action" data-action="delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </div>
        </div>
      `;
      
      return messageElement;
    },
    
    /**
     * Render an attachment for a message
     * @param {Object} attachment - The attachment data
     * @returns {string} HTML for the attachment
     * @private
     */
    _renderAttachment: function(attachment) {
      if (!attachment) return '';
      
      // Handle different attachment types
      if (attachment.type.startsWith('image/')) {
        return `
          <div class="attachment">
            <img class="image-attachment" src="${attachment.url}" alt="${attachment.name}" onclick="window.open('${attachment.url}', '_blank')">
          </div>
        `;
      } else {
        // Generic file attachment
        return `
          <div class="file-attachment">
            <div class="file-icon">📄</div>
            <div class="file-info">
              <div class="file-name">${attachment.name}</div>
              <div class="file-size">${Utils.formatFileSize(attachment.size)}</div>
            </div>
            <div class="file-actions">
              <div class="file-action" onclick="window.open('${attachment.url}', '_blank')">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </div>
            </div>
          </div>
        `;
      }
    },
    
    /**
     * Render reactions for a message
     * @param {Object} reactions - The reactions data (emoji -> [userIds])
     * @returns {string} HTML for the reactions
     * @private
     */
    _renderReactions: function(reactions) {
      if (!reactions || Object.keys(reactions).length === 0) return '';
      
      const currentUser = AppState.get('currentUser');
      let reactionsHtml = '';
      
      Object.entries(reactions).forEach(([emoji, userIds]) => {
        const count = userIds.length;
        const userReacted = userIds.includes(currentUser.id);
        
        reactionsHtml += `
          <div class="reaction ${userReacted ? 'active' : ''}" data-emoji="${emoji}">
            <span class="reaction-emoji">${emoji}</span>
            <span class="reaction-count">${count}</span>
          </div>
        `;
      });
      
      return `<div class="reactions">${reactionsHtml}</div>`;
    },
    
    /**
     * Handle changes to the active channel
     * @param {string} channelId - The new active channel ID
     * @private
     */
    _handleActiveChannelChange: function(channelId) {
      if (!channelId) return;
      
      const channel = AppState.getActiveChannel();
      
      // Show/hide appropriate container based on channel type
      if (channel && channel.type === 'text') {
        // Save draft of previous channel
        this._saveDraft();
        
        // Show text container
        this.textContainer.classList.add('active');
        document.getElementById('voice-container').classList.remove('active');
        
        // Reset input
        this.messageInput.value = '';
        
        // Update message input placeholder
        this.messageInput.placeholder = `Message #${channel.name}`;
        
        // Render messages for this channel
        this.renderMessages();
      }
    },
    
    /**
     * Send a message in the active channel
     */
    sendMessage: function() {
      const channelId = AppState.get('activeChannel');
      if (!channelId) return;
      
      const channel = AppState.getActiveChannel();
      if (!channel || channel.type !== 'text') return;
      
      const content = this.messageInput.value.trim();
      if (!content) return;
      
      // Generate a unique ID for the message
      const messageId = `msg-${Utils.generateId()}`;
      
      // Get the current user
      const currentUser = AppState.get('currentUser');
      
      // Create the message object
      const message = {
        id: messageId,
        channelId: channelId,
        userId: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
        content: content,
        timestamp: new Date().toISOString(),
        edited: false
      };
      
      // Check for attachments
      const attachmentPreview = this.textContainer.querySelector('.attachment-preview');
      if (attachmentPreview) {
        message.attachment = {
          type: attachmentPreview.dataset.type,
          name: attachmentPreview.dataset.name,
          size: parseInt(attachmentPreview.dataset.size, 10),
          url: attachmentPreview.dataset.url
        };
        
        // Remove attachment preview
        attachmentPreview.remove();
      }
      
      // Add message to state
      AppState.addMessage(channelId, message);
      
      // Clear input
      this.messageInput.value = '';
      
      // Clear draft
      delete this.messageDrafts[channelId];
      
      // Scroll to bottom
      this.scrollToBottom();
      
      // Clear typing indicator when message is sent
      clearTimeout(this.typingTimeout);
      delete this.usersTyping[currentUser.id];
      this._updateTypingIndicator();
    },
    
    /**
     * Scroll the messages container to the bottom
     */
    scrollToBottom: function() {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    },
    
    /**
     * Save the current message draft
     * @private
     */
    _saveDraft: function() {
      const channelId = AppState.get('activeChannel');
      if (!channelId) return;
      
      const content = this.messageInput.value.trim();
      
      if (content) {
        this.messageDrafts[channelId] = content;
      } else {
        delete this.messageDrafts[channelId];
      }
    },
    
    /**
     * Load the draft for the active channel
     * @private
     */
    _loadDraft: function() {
      const channelId = AppState.get('activeChannel');
      if (!channelId) return;
      
      const draft = this.messageDrafts[channelId];
      if (draft) {
        this.messageInput.value = draft;
        
        // Position cursor at the end
        this.messageInput.selectionStart = this.messageInput.selectionEnd = this.messageInput.value.length;
      } else {
        this.messageInput.value = '';
      }
    },
    
    /**
     * Handle file upload
     * @private
     */
    _handleFileUpload: function() {
      // In a real app, this would open a file dialog
      // For this demo, we'll simulate file upload
      
      // Check if we already have an attachment preview
      if (this.textContainer.querySelector('.attachment-preview')) {
        Utils.showToast('You can only upload one file at a time', 'error');
        return;
      }
      
      // Create a mock file upload interface
      const fileTypes = [
        { name: 'Image (JPEG)', type: 'image/jpeg', ext: 'jpg' },
        { name: 'Image (PNG)', type: 'image/png', ext: 'png' },
        { name: 'Document (PDF)', type: 'application/pdf', ext: 'pdf' },
        { name: 'Text file', type: 'text/plain', ext: 'txt' }
      ];
      
      const mockUploadHtml = `
        <div class="modal active" id="mock-upload-modal">
          <div class="modal-backdrop"></div>
          <div class="modal-container">
            <div class="modal-header">
              <h3>Simulated File Upload</h3>
              <button class="modal-close">✕</button>
            </div>
            <div class="modal-content">
              <div class="modal-section">
                <p>Select a file type to simulate uploading:</p>
                <div class="file-types-list">
                  ${fileTypes.map(fileType => `
                    <div class="file-type-option" data-type="${fileType.type}" data-ext="${fileType.ext}">
                      <div class="file-type-icon">
                        ${fileType.type.startsWith('image/') ? '🖼️' : '📄'}
                      </div>
                      <div class="file-type-name">${fileType.name}</div>
                    </div>
                  `).join('')}
                </div>
                <div class="input-group">
                  <label for="mock-file-name">File name:</label>
                  <input type="text" id="mock-file-name" placeholder="Enter a file name">
                </div>
              </div>
              <div class="modal-actions">
                <button class="modal-button secondary" id="cancel-upload">Cancel</button>
                <button class="modal-button primary" id="confirm-upload">Upload</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Add to body
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = mockUploadHtml;
      document.body.appendChild(modalContainer.firstChild);
      
      const mockUploadModal = document.getElementById('mock-upload-modal');
      
      // Set up event listeners
      mockUploadModal.querySelector('.modal-close').addEventListener('click', () => {
        mockUploadModal.remove();
      });
      
      document.getElementById('cancel-upload').addEventListener('click', () => {
        mockUploadModal.remove();
      });
      
      // Handle file type selection
      let selectedType = null;
      const fileTypeOptions = mockUploadModal.querySelectorAll('.file-type-option');
      
      fileTypeOptions.forEach(option => {
        option.addEventListener('click', () => {
          fileTypeOptions.forEach(opt => opt.classList.remove('selected'));
          option.classList.add('selected');
          selectedType = {
            type: option.dataset.type,
            ext: option.dataset.ext
          };
        });
      });
      
      // Handle confirm upload
      document.getElementById('confirm-upload').addEventListener('click', () => {
        const fileName = document.getElementById('mock-file-name').value.trim() || 'file';
        
        if (!selectedType) {
          Utils.showToast('Please select a file type', 'error');
          return;
        }
        
        // Create mock attachment preview
        const fullFileName = `${fileName}.${selectedType.ext}`;
        const fileSize = Math.floor(Math.random() * 10000000); // Random size up to 10MB
        
        let previewHtml;
        
        if (selectedType.type.startsWith('image/')) {
          // For images, use a placeholder image
          const imageUrl = 'https://via.placeholder.com/400x300';
          previewHtml = `
            <div class="attachment-preview" data-type="${selectedType.type}" data-name="${fullFileName}" data-size="${fileSize}" data-url="${imageUrl}">
              <div class="attachment-header">
                <span>Attachment</span>
                <button class="attachment-close">✕</button>
              </div>
              <div class="attachment-content">
                <img src="${imageUrl}" alt="${fullFileName}" class="attachment-image">
              </div>
              <div class="attachment-footer">
                <div class="attachment-name">${fullFileName}</div>
                <div class="attachment-size">${Utils.formatFileSize(fileSize)}</div>
              </div>
            </div>
          `;
        } else {
          // For other files, show icon
          previewHtml = `
            <div class="attachment-preview" data-type="${selectedType.type}" data-name="${fullFileName}" data-size="${fileSize}" data-url="#">
              <div class="attachment-header">
                <span>Attachment</span>
                <button class="attachment-close">✕</button>
              </div>
              <div class="attachment-content file">
                <div class="attachment-file-icon">
                  ${selectedType.type === 'application/pdf' ? '📕' : '📄'}
                </div>
              </div>
              <div class="attachment-footer">
                <div class="attachment-name">${fullFileName}</div>
                <div class="attachment-size">${Utils.formatFileSize(fileSize)}</div>
              </div>
            </div>
          `;
        }
        
        // Add preview to chat input area
        const previewContainer = document.createElement('div');
        previewContainer.innerHTML = previewHtml;
        this.textContainer.querySelector('.chat-input-area').insertBefore(
          previewContainer.firstChild,
          this.textContainer.querySelector('.chat-input-container')
        );
        
        // Close modal
        mockUploadModal.remove();
        
        // Focus message input
        this.messageInput.focus();
      });
    },
    
    /**
     * Toggle the emoji picker
     * @param {Event} event - The click event
     * @private
     */
    _toggleEmojiPicker: function(event) {
      // Get the chat input container
      const inputContainer = this.textContainer.querySelector('.chat-input-container');
      const inputContainerRect = inputContainer.getBoundingClientRect();
      
      // Toggle active state
      const isOpening = !this.emojiModal.classList.contains('active');
      
      if (isOpening) {
        // Make it visible but not displayed yet for measurement
        this.emojiModal.style.opacity = '0';
        this.emojiModal.classList.add('active');
        
        // Get dimensions after it's in the DOM
        const modalRect = this.emojiModal.getBoundingClientRect();
        
        // Calculate position - align to top right of chat input
        let topPosition = inputContainerRect.top - modalRect.height;
        let leftPosition = inputContainerRect.right - modalRect.width;
        
        // Ensure it stays within the viewport
        topPosition = Math.max(10, topPosition); // At least 10px from the top
        leftPosition = Math.min(window.innerWidth - modalRect.width - 10, leftPosition);
        
        // Position at top right of input container
        this.emojiModal.style.top = topPosition -90 + 'px';
        this.emojiModal.style.left = leftPosition + 'px';
        
        // Now make it visible
        this.emojiModal.style.opacity = '1';
        
        // Focus search
        this.emojiModal.querySelector('.emoji-search').focus();
      } else {
        // Just close it
        this.emojiModal.classList.remove('active');
      }
    },
    
    /**
     * Populate the emoji grid
     * @private
     */
    _populateEmojiPicker: function() {
      // Common emoji categories
      this.emojiCategories = [
        // Smileys & People
        ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡', '😠', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😇', '🥳', '🥴', '🥺', '🤠', '🤡', '🤥', '🤫', '🤭', '🧐', '🤓'],
        
        // Animals & Nature
        ['🦊', '🐱', '🐶', '🐭', '🐹', '🐰', '🦝', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷', '🕸', '🦂', '🦀', '🦞', '🦐', '🦑', '🐙', '🦕', '🦖', '🦎', '🐍', '🐢', '🦓', '🦍', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🦙', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🐈', '🐓', '🦃', '🕊'],
        
        // Food & Drink
        ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🌽', '🥕', '🥔', '🍠', '🥐', '🍞', '🥖', '🥨', '🥯', '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🍰', '🧁', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🍵', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🍾'],
        
        // Activities
        ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '⛳', '🏹', '🎣', '🥊', '🥋', '🎽', '⛸', '🥌', '🛷', '🛹', '🎿', '⛷', '🏂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🎲', '🧩', '♟', '🎯', '🎳', '🎮', '🎰'],
        
        // Travel & Places
        ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩', '💺', '🛰', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥', '🛳', '⛴', '🚢', '⚓', '⛽', '🚧', '🚦', '🚥', '🚏', '🗺', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟', '🎡', '🎢', '🎠', '⛲', '⛱', '🏖', '🏝', '🏜', '🌋', '⛰', '🏔', '🗻', '🏕', '⛺', '🏠', '🏡', '🏘', '🏚', '🏗', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛', '⛪', '🕌', '🕍', '🕋', '⛩', '🛤', '🛣', '🗾', '🎑', '🏞', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙', '🌃', '🌌', '🌉', '🌁'],
        
        // Objects
        ['💡', '🔦', '🕯', '🧯', '🛢', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🔧', '🔨', '⚒', '🛠', '⛏', '🔩', '⚙️', '🔫', '💣', '🧨', '🔪', '🗡', '⚔️', '🛡', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳', '💊', '💉', '🧬', '🦠', '🧫', '🧪', '🌡', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🧽', '🧴', '🛎', '🔑', '🗝', '🚪', '🛋', '🛏', '🛌', '🧸', '🖼', '🛍', '🛒', '🎁', '🎈', '🎏', '🎀', '🎊', '🎉', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒', '🗓', '📆', '📅', '🗑', '📇', '🗃', '🗳', '🗄', '📋', '📁', '📂', '🗂', '🗞', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊', '🖋', '✒️', '🖌', '🖍', '📝'],
        
        // Symbols
        ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
      ];
      
      // Store all emojis for search
      this.allEmojis = this.emojiCategories.flat();
      
      // Show first category by default
      this._showEmojiCategory(0);
    },
    
    /**
     * Populate the emoji grid with emojis
     * @private
     */
    _populateEmojiGrid: function() {
      // Initialize emoji data
      this._populateEmojiPicker();
      
      // Add emoji categories
      const emojiCategories = this.emojiModal.querySelectorAll('.emoji-category');
      emojiCategories[0].classList.add('active');
    },
    
    /**
     * Show emojis for a specific category
     * @param {number} categoryIndex - The category index
     * @private
     */
    _showEmojiCategory: function(categoryIndex) {
      const emojiGrid = this.emojiModal.querySelector('.emoji-grid');
      emojiGrid.innerHTML = '';
      
      const emojis = this.emojiCategories[categoryIndex] || [];
      
      emojis.forEach(emoji => {
        const emojiElement = document.createElement('div');
        emojiElement.className = 'emoji';
        emojiElement.textContent = emoji;
        emojiGrid.appendChild(emojiElement);
      });
    },
    
    /**
     * Search emojis
     * @param {string} query - The search query
     * @private
     */
    _searchEmojis: function(query) {
      if (!query.trim()) {
        // Show active category if no search query
        const activeCategory = this.emojiModal.querySelector('.emoji-category.active');
        const categoryIndex = Array.from(activeCategory.parentNode.children).indexOf(activeCategory);
        this._showEmojiCategory(categoryIndex);
        return;
      }
      
      const emojiGrid = this.emojiModal.querySelector('.emoji-grid');
      emojiGrid.innerHTML = '';
      
      // Simple search - would be more sophisticated in a real app
      const matches = this.allEmojis.filter(emoji => emoji.includes(query));
      
      if (matches.length === 0) {
        emojiGrid.innerHTML = '<div class="emoji-no-results">No results found</div>';
        return;
      }
      
      matches.forEach(emoji => {
        const emojiElement = document.createElement('div');
        emojiElement.className = 'emoji';
        emojiElement.textContent = emoji;
        emojiGrid.appendChild(emojiElement);
      });
    },
    
    /**
     * Insert an emoji at the cursor position in the message input
     * @param {string} emoji - The emoji to insert
     * @private
     */
    _insertEmoji: function(emoji) {
      const input = this.messageInput;
      const startPos = input.selectionStart;
      const endPos = input.selectionEnd;
      const before = input.value.substring(0, startPos);
      const after = input.value.substring(endPos);
      
      input.value = before + emoji + after;
      
      // Position cursor after the inserted emoji
      const newCursorPos = startPos + emoji.length;
      input.selectionStart = input.selectionEnd = newCursorPos;
      
      // Focus input
      input.focus();
    },
    
    /**
     * Send typing indicator
     * @private
     */
    _sendTypingIndicator: function() {
      const currentUser = AppState.get('currentUser');
      
      // Set user as typing
      this.usersTyping[currentUser.id] = {
        id: currentUser.id,
        username: currentUser.username,
        timestamp: Date.now()
      };
      
      this._updateTypingIndicator();
      
      // Clear typing indicator after 3 seconds of inactivity
      clearTimeout(this.typingTimeout);
      this.typingTimeout = setTimeout(() => {
        delete this.usersTyping[currentUser.id];
        this._updateTypingIndicator();
      }, 3000);
    },
    
    /**
     * Update the typing indicator display
     * @private
     */
    _updateTypingIndicator: function() {
      const users = Object.values(this.usersTyping);
      
      if (users.length === 0) {
        // Hide the indicator when no one is typing
        this.typingIndicator.style.display = 'none';
        return;
      }
      
      // Create the appropriate text based on who's typing
      let text = '';
      if (users.length === 1) {
        text = `${users[0].username} is typing`;
      } else if (users.length === 2) {
        text = `${users[0].username} and ${users[1].username} are typing`;
      } else {
        text = 'Several people are typing';
      }
      
      // Only update the text content, not the entire HTML
      // This preserves the animation flow
      this.typingText.textContent = text;
      
      // Make the indicator visible
      this.typingIndicator.style.display = 'flex';
    },
    
    /**
     * Show the message context menu
     * @param {Event} event - The context menu event
     * @param {string} messageId - The message ID
     * @private
     */
    _showMessageContextMenu: function(event, messageId) {
      const channelId = AppState.get('activeChannel');
      if (!channelId) return;
      
      const messages = AppState.getMessagesForChannel(channelId);
      const message = messages.find(msg => msg.id === messageId);
      
      if (!message) return;
      
      const currentUser = AppState.get('currentUser');
      const isOwnMessage = message.userId === currentUser.id;
      
      const menuItems = [
        {
          label: 'Add Reaction',
          icon: '😊',
          onClick: () => this._showReactionPicker(messageId)
        },
        {
          label: 'Reply',
          icon: '↩️',
          onClick: () => this._handleReplyToMessage(messageId)
        },
        {
          label: 'Copy Text',
          icon: '📋',
          onClick: () => this._handleCopyMessageText(messageId)
        }
      ];
      
      // Add edit/delete options if own message
      if (isOwnMessage) {
        menuItems.push({ divider: true });
        
        menuItems.push({
          label: 'Edit Message',
          icon: '✏️',
          onClick: () => this._handleEditMessage(messageId)
        });
        
        menuItems.push({
          label: 'Delete Message',
          icon: '🗑️',
          danger: true,
          onClick: () => this._handleDeleteMessage(messageId)
        });
      }
      
      Utils.showContextMenu(menuItems, event.clientX, event.clientY);
    },
    
    /**
     * Show the reaction picker for a message
     * @param {string} messageId - The message ID
     * @private
     */
    _showReactionPicker: function(messageId) {
      // Create emoji picker specifically for reactions
      const reactionPicker = document.createElement('div');
      reactionPicker.className = 'reaction-picker';
      
      // Common reactions
      const commonReactions = ['👍', '👎', '❤️', '🦊', '🎉', '😂', '😢', '😡', '🤔', '👀'];
      
      reactionPicker.innerHTML = `
        <div class="reaction-picker-header">
          <span>Add Reaction</span>
          <button class="reaction-picker-close">✕</button>
        </div>
        <div class="reaction-picker-common">
          ${commonReactions.map(emoji => `
            <div class="reaction-emoji" data-emoji="${emoji}">${emoji}</div>
          `).join('')}
        </div>
      `;
      
      // Find message element
      const messageElement = this.messagesContainer.querySelector(`.message[data-message-id="${messageId}"]`);
      if (!messageElement) return;
      
      // Position picker near the message
      const rect = messageElement.getBoundingClientRect();
      
      reactionPicker.style.position = 'absolute';
      reactionPicker.style.top = `${rect.top}px`;
      reactionPicker.style.left = `${rect.left + rect.width / 2}px`;
      reactionPicker.style.transform = 'translateX(-50%)';
      reactionPicker.style.zIndex = '1000';
      
      document.body.appendChild(reactionPicker);
      
      // Handle close button
      reactionPicker.querySelector('.reaction-picker-close').addEventListener('click', () => {
        reactionPicker.remove();
      });
      
      // Handle emoji selection
      reactionPicker.querySelectorAll('.reaction-emoji').forEach(emoji => {
        emoji.addEventListener('click', () => {
          this._toggleReaction(messageId, emoji.dataset.emoji);
          reactionPicker.remove();
        });
      });
      
      // Close when clicking outside
      document.addEventListener('click', function closePicker(e) {
        if (!reactionPicker.contains(e.target)) {
          reactionPicker.remove();
          document.removeEventListener('click', closePicker);
        }
      });
    },
    
    /**
     * Toggle a reaction on a message
     * @param {string} messageId - The message ID
     * @param {string} emoji - The emoji reaction
     * @private
     */
    _toggleReaction: function(messageId, emoji) {
      const channelId = AppState.get('activeChannel');
      if (!channelId) return;
      
      const messages = AppState.getMessagesForChannel(channelId);
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      
      if (messageIndex === -1) return;
      
      const message = messages[messageIndex];
      const currentUser = AppState.get('currentUser');
      
      // Initialize reactions if needed
      if (!message.reactions) {
        message.reactions = {};
      }
      
      // Initialize users for this emoji if needed
      if (!message.reactions[emoji]) {
        message.reactions[emoji] = [];
      }
      
      // Check if user already reacted with this emoji
      const userIndex = message.reactions[emoji].indexOf(currentUser.id);
      
      if (userIndex === -1) {
        // Add reaction
        message.reactions[emoji].push(currentUser.id);
      } else {
        // Remove reaction
        message.reactions[emoji].splice(userIndex, 1);
        
        // Remove emoji entry if no users
        if (message.reactions[emoji].length === 0) {
          delete message.reactions[emoji];
        }
        
        // Remove reactions object if empty
        if (Object.keys(message.reactions).length === 0) {
          delete message.reactions;
        }
      }
      
      // Update message in state
      const updatedMessages = [...messages];
      updatedMessages[messageIndex] = message;
      
      const allMessages = { ...AppState.get('messages') };
      allMessages[channelId] = updatedMessages;
      
      AppState.set('messages', allMessages);
      
      // Update message element
      const messageElement = this.messagesContainer.querySelector(`.message[data-message-id="${messageId}"]`);
      if (messageElement) {
        const reactionsContainer = messageElement.querySelector('.reactions');
        
        if (message.reactions) {
          // Add or update reactions
          if (reactionsContainer) {
            reactionsContainer.innerHTML = '';
          } else {
            const newReactionsContainer = document.createElement('div');
            newReactionsContainer.className = 'reactions';
            messageElement.querySelector('.message-content').appendChild(newReactionsContainer);
          }
          
          const container = reactionsContainer || messageElement.querySelector('.reactions');
          
          Object.entries(message.reactions).forEach(([emoji, userIds]) => {
            const reactionElement = document.createElement('div');
            reactionElement.className = `reaction ${userIds.includes(currentUser.id) ? 'active' : ''}`;
            reactionElement.dataset.emoji = emoji;
            
            reactionElement.innerHTML = `
              <span class="reaction-emoji">${emoji}</span>
              <span class="reaction-count">${userIds.length}</span>
            `;
            
            container.appendChild(reactionElement);
          });
        } else if (reactionsContainer) {
          // Remove reactions container if no reactions
          reactionsContainer.remove();
        }
      }
    },
    
    /**
     * Handle replying to a message
     * @param {string} messageId - The message ID
     * @private
     */
    _handleReplyToMessage: function(messageId) {
      const channelId = AppState.get('activeChannel');
      if (!channelId) return;
      
      const messages = AppState.getMessagesForChannel(channelId);
      const message = messages.find(msg => msg.id === messageId);
      
      if (!message) return;
      
      // Focus input and add reply prefix
      this.messageInput.focus();
      
      // Add reply formatting
      const replyPrefix = `> ${message.content.split('\n').join('\n> ')}\n\n`;
      this.messageInput.value = replyPrefix + this.messageInput.value;
      
      // Position cursor at the end
      this.messageInput.selectionStart = this.messageInput.selectionEnd = this.messageInput.value.length;
    },
    
    /**
     * Handle copying message text
     * @param {string} messageId - The message ID
     * @private
     */
    _handleCopyMessageText: function(messageId) {
      const channelId = AppState.get('activeChannel');
      if (!channelId) return;
      
      const messages = AppState.getMessagesForChannel(channelId);
      const message = messages.find(msg => msg.id === messageId);
      
      if (!message) return;
      
      // Copy to clipboard
      navigator.clipboard.writeText(message.content)
        .then(() => {
          Utils.showToast('Message copied to clipboard', 'success');
        })
        .catch(() => {
          Utils.showToast('Failed to copy message', 'error');
        });
    },
    
    /**
     * Handle editing a message
     * @param {string} messageId - The message ID
     * @private
     */
    _handleEditMessage: function(messageId) {
      const channelId = AppState.get('activeChannel');
      if (!channelId) return;
      
      const messages = AppState.getMessagesForChannel(channelId);
      const message = messages.find(msg => msg.id === messageId);
      
      if (!message) return;
      
      // Find message element
      const messageElement = this.messagesContainer.querySelector(`.message[data-message-id="${messageId}"]`);
      if (!messageElement) return;
      
      // Create edit form
      const messageContent = messageElement.querySelector('.message-text');
      const originalContent = message.content;
      
      const editForm = document.createElement('div');
      editForm.className = 'message-edit-form';
      editForm.innerHTML = `
        <textarea class="message-edit-input">${originalContent}</textarea>
        <div class="message-edit-actions">
          <div class="message-edit-tip">Press Enter to save, Escape to cancel</div>
          <button class="message-edit-cancel">Cancel</button>
          <button class="message-edit-save">Save</button>
        </div>
      `;
      
      // Replace message content with edit form
      messageContent.replaceWith(editForm);
      
      // Focus input and select all text
      const editInput = editForm.querySelector('.message-edit-input');
      editInput.focus();
      editInput.setSelectionRange(0, editInput.value.length);
      
      // Handle cancel button
      editForm.querySelector('.message-edit-cancel').addEventListener('click', () => {
        // Restore original content
        editForm.replaceWith(messageContent);
      });
      
      // Handle save button
      editForm.querySelector('.message-edit-save').addEventListener('click', () => {
        const newContent = editInput.value.trim();
        
        if (!newContent) {
          Utils.showToast('Message cannot be empty', 'error');
          return;
        }
        
        // Update message in state
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        const updatedMessage = { ...message, content: newContent, edited: true };
        
        const updatedMessages = [...messages];
        updatedMessages[messageIndex] = updatedMessage;
        
        const allMessages = { ...AppState.get('messages') };
        allMessages[channelId] = updatedMessages;
        
        AppState.set('messages', allMessages);
        
        // Update message content
        messageContent.innerHTML = Utils.parseMessageText(newContent);
        
        // Add edited indicator to timestamp
        const timestamp = messageElement.querySelector('.timestamp');
        if (!timestamp.textContent.includes('(edited)')) {
          timestamp.textContent += ' (edited)';
        }
        
        // Restore message content
        editForm.replaceWith(messageContent);
      });
      
      // Handle keyboard shortcuts
      editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          // Save on Enter
          e.preventDefault();
          editForm.querySelector('.message-edit-save').click();
        } else if (e.key === 'Escape') {
          // Cancel on Escape
          e.preventDefault();
          editForm.querySelector('.message-edit-cancel').click();
        }
      });
    },
    
    /**
     * Handle deleting a message
     * @param {string} messageId - The message ID
     * @private
     */
    _handleDeleteMessage: function(messageId) {
      const channelId = AppState.get('activeChannel');
      if (!channelId) return;
      
      const messages = AppState.getMessagesForChannel(channelId);
      const message = messages.find(msg => msg.id === messageId);
      
      if (!message) return;
      
      // Ask for confirmation
      if (confirm('Are you sure you want to delete this message?')) {
        // Remove message from state
        const updatedMessages = messages.filter(msg => msg.id !== messageId);
        
        const allMessages = { ...AppState.get('messages') };
        allMessages[channelId] = updatedMessages;
        
        AppState.set('messages', allMessages);
        
        // Remove message element
        const messageElement = this.messagesContainer.querySelector(`.message[data-message-id="${messageId}"]`);
        if (messageElement) {
          messageElement.remove();
        }
        
        Utils.showToast('Message deleted', 'success');
        
        // Ensure the input is in an interactive state
        this.messageInput.disabled = false;
        this.messageInput.readOnly = false;
      }
    },
    
    /**
     * Load older messages
     * @private
     */
    _loadOlderMessages: function() {
      // In a real app, this would fetch older messages from the server
      // For this demo, we'll just show a toast
      Utils.showToast('No older messages available', 'info');
    },

    /**
     * Render a single message
     * @param {Object} message - Message data
     * @param {boolean} isGrouped - Whether this message is part of a group from the same user
     * @returns {HTMLElement} The message element
     * @private
     */
    _renderMessage: function(message, isGrouped = false) {
      const messageElement = document.createElement('div');
      messageElement.className = `message ${message.type || ''}`;
      messageElement.dataset.messageId = message.id;
      
      // Add grouped class if this message is part of a group
      if (isGrouped) {
        messageElement.classList.add('grouped');
      }
      
      // Rest of the message rendering code remains unchanged
      // ...existing code...
    },
    
    /**
     * Add a message to the chat
     * @param {Object} message - The message data
     * @private
     */
    _addMessage: function(message) {
      // Get the previous message to check if this should be grouped
      let isGrouped = false;
      const prevMessage = this.messagesContainer.lastChild;
      
      if (prevMessage && prevMessage.dataset.userId === message.userId) {
        // Check if the time between messages is less than 5 minutes (300000ms)
        const prevTime = new Date(prevMessage.dataset.timestamp).getTime();
        const currentTime = new Date(message.timestamp).getTime();
        
        if (currentTime - prevTime < 300000) {
          isGrouped = true;
        }
      }
      
      const messageElement = this._renderMessage(message, isGrouped);
      
      // Add user ID and timestamp as data attributes to make grouping easier
      messageElement.dataset.userId = message.userId;
      messageElement.dataset.timestamp = message.timestamp;
      
      // Add to messages container
      this.messagesContainer.appendChild(messageElement);
      
      // Scroll to bottom after adding a message
      this._scrollToBottom();
    },

    /**
     * Handle message action button clicks
     * @param {string} action - The action type (react, edit, delete)
     * @param {string} messageId - The message ID
     * @param {Event} event - The click event
     * @private
     */
    _handleMessageAction: function(action, messageId, event) {
      const channelId = AppState.get('activeChannel');
      if (!channelId) return;
      
      const messages = AppState.getMessagesForChannel(channelId);
      const message = messages.find(msg => msg.id === messageId);
      
      if (!message) return;
      
      const currentUser = AppState.get('currentUser');
      
      switch (action) {
        case 'react':
          this._showReactionPicker(messageId);
          break;
          
        case 'edit':
          // Only allow editing own messages
          if (message.userId === currentUser.id) {
            this._handleEditMessage(messageId);
          } else {
            Utils.showToast("You can only edit your own messages", "error");
          }
          break;
          
        case 'delete':
          // Only allow deleting own messages
          if (message.userId === currentUser.id) {
            this._handleDeleteMessage(messageId);
          } else {
            Utils.showToast("You can only delete your own messages", "error");
          }
          break;
          
        default:
          console.warn(`Unknown message action: ${action}`);
      }
    }
  };
  
  // Export for use in other modules
  window.ChatManager = ChatManager;
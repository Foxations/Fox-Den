/**
 * FoxDen Chat Management
 * 
 * Handles all functionality related to text messaging
 */

// Ensure ChatManager is accessible everywhere as early as possible
(function(global) {
  // Create ChatManager in global scope right away
  global.ChatManager = {
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
      console.log("ChatManager init called");
      if (this.initialized) return;
      
      // Cache DOM elements
      this.messagesContainer = document.getElementById('messages-container');
      this.textContainer = document.getElementById('text-container');
      this.uploadButton = document.getElementById('upload-button');
      this.emojiButton = document.getElementById('emoji-button');
      
      // NEW: Directly create the emoji modal in the correct place, rather than finding it
      // This ensures it doesn't exist anywhere else in the DOM
      this._createEmojiModal();
      
      // Set up the input system - MAJOR CHANGE: Replace textarea with contenteditable div
      this._setupChatInput();
      
      // Create typing indicator element with persistent animation dots
      this._setupTypingIndicator();
      
      // Set up basic event listeners (ones that don't depend on emoji data)
      this._setupBasicEventListeners();
      
      // Subscribe to state changes
      AppState.subscribe('activeChannel', (channelId) => this._handleActiveChannelChange(channelId));
      AppState.subscribe('messages', () => this.renderMessages());
      
      // Load emoji data first, then set up emoji-related event listeners
      this._loadEmojiData()
        .then(() => {
          // After emojis are loaded, set up emoji-related event listeners
          this._setupEmojiEventListeners();
          // Populate the emoji grid with data
          this._populateEmojiGrid();
        })
        .catch(error => {
          console.error('Failed to load emoji data:', error);
          Utils.showToast('Failed to load emoji data', 'error');
        });
      
      this.initialized = true;
    },

    /**
     * Create the emoji modal directly in the messages container
     * @private
     */
    _createEmojiModal: function() {
      // Remove any existing emoji modals from DOM
      const existingModal = document.getElementById('emoji-modal');
      if (existingModal) {
        existingModal.remove();
      }
      
      // Ensure messages container has proper positioning context
      this.messagesContainer.style.position = 'relative';
      this.messagesContainer.style.overflow = 'auto';
      
      // Create a new emoji modal
      const emojiModal = document.createElement('div');
      emojiModal.id = 'emoji-modal';
      emojiModal.className = 'emoji-modal';
      
      // Set basic inline styles to ensure correct positioning at bottom right of messages container
      emojiModal.style.position = 'absolute';
      emojiModal.style.bottom = '10px'; // Small offset from bottom
      emojiModal.style.right = '10px'; // Small offset from right
      emojiModal.style.zIndex = '100';
      emojiModal.style.maxHeight = '320px';
      emojiModal.style.width = '345px'; // Updated width as requested
      emojiModal.style.overflow = 'auto';
      emojiModal.style.borderRadius = '8px';
      emojiModal.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
      emojiModal.style.backgroundColor = '#2f3136';
      emojiModal.style.border = '1px solid #202225';
      emojiModal.style.display = 'none'; // Hidden by default
      
      // Create emoji modal structure
      emojiModal.innerHTML = `
        <div class="emoji-search-container" style="padding: 8px; border-bottom: 1px solid #40444b;">
          <input type="text" class="emoji-search" placeholder="Search for emoji..." style="width: 100%; padding: 6px; border-radius: 4px; background: #40444b; border: none; color: #dcddde;">
        </div>
        <div class="emoji-categories-container" style="position: relative; overflow: hidden; border-bottom: 1px solid #40444b;">
          <div class="emoji-categories" style="display: flex; flex-wrap: nowrap; padding: 0; overflow-x: auto; white-space: nowrap; scrollbar-width: none; -webkit-overflow-scrolling: touch; -ms-overflow-style: none;">
            <div class="emoji-category parent-category" style="padding: 4px; cursor: pointer; margin: 0; flex-shrink: 0;">🦊</div>
            <div class="emoji-subcategory" style="padding: 4px; cursor: pointer; margin: 0; display: none; flex-shrink: 0;">😀</div>
            <div class="emoji-subcategory" style="padding: 4px; cursor: pointer; margin: 0; display: none; flex-shrink: 0;">🐶</div>
            <div class="emoji-subcategory" style="padding: 4px; cursor: pointer; margin: 0; display: none; flex-shrink: 0;">🍕</div>
            <div class="emoji-subcategory" style="padding: 4px; cursor: pointer; margin: 0; display: none; flex-shrink: 0;">🚗</div>
            <div class="emoji-subcategory" style="padding: 4px; cursor: pointer; margin: 0; display: none; flex-shrink: 0;">⚽</div>
            <div class="emoji-subcategory" style="padding: 4px; cursor: pointer; margin: 0; display: none; flex-shrink: 0;">💡</div>
            <div class="emoji-subcategory" style="padding: 4px; cursor: pointer; margin: 0; display: none; flex-shrink: 0;">🏳️‍🌈</div>
            <div class="emoji-subcategory" style="padding: 4px; cursor: pointer; margin: 0; display: none; flex-shrink: 0;">🔣</div>
          </div>
          <div class="emoji-categories-scroll-hint" style="position: absolute; right: 0; top: 0; bottom: 0; width: 20px; background: linear-gradient(to right, transparent, #2f3136); pointer-events: none; opacity: 0.8; display: none;"></div>
        </div>
        <div class="emoji-grid" style="display: grid; grid-template-columns: repeat(6, 1fr); padding: 8px; gap: 4px; max-height: 200px; overflow-y: auto;">
          <div class="emoji-placeholder" style="grid-column: span 6; text-align: center; color: #dcddde; padding: 20px 0;">Select a category to see emojis</div>
        </div>
      `;
      
      // Add directly to the messages container
      this.messagesContainer.appendChild(emojiModal);
      
      // Store reference
      this.emojiModal = emojiModal;
    },
    
    /**
     * Set up the chat input system using contenteditable div (Discord-like)
     * @private
     */
    _setupChatInput: function() {
      // Find the chat input container
      const inputContainer = this.textContainer.querySelector('.chat-input-container');
      
      // Check if we need to replace an existing textarea
      const existingInput = document.getElementById('message-input');
      if (existingInput) {
        // Save the existing value if any
        const existingValue = existingInput.value || '';
        
        // Remove the existing textarea
        existingInput.remove();
        
        // Create a new contenteditable div
        const chatInput = document.createElement('div');
        chatInput.id = 'message-input';
        chatInput.className = 'chat-input';
        chatInput.contentEditable = true;
        chatInput.role = 'textbox';
        chatInput.spellcheck = true;
        chatInput.setAttribute('data-placeholder', 'Message #general');
        
        // Add accessibility attributes
        chatInput.setAttribute('aria-label', 'Message input');
        chatInput.setAttribute('aria-multiline', 'true');
        
        // Insert at the correct position in the container
        inputContainer.insertBefore(chatInput, inputContainer.querySelector('.emoji-button'));
        
        // Set any existing value
        if (existingValue) {
          chatInput.textContent = existingValue;
        }
      } else {
        // The element doesn't exist yet, likely modifying the HTML directly
        console.warn('Could not find existing message input - please update the HTML template');
      }
      
      // Store reference to the input
      this.messageInput = document.getElementById('message-input');
      
      // Set up debug events for input
      this._setupDebugListeners();
      
      // Add core event listeners for the input
      this._setupInputEventListeners();
    },
    
    /**
     * Set up the typing indicator
     * @private
     */
    _setupTypingIndicator: function() {
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
    },
    
    /**
     * Set up debug event listeners for input focus issues
     * @private
     */
    _setupDebugListeners: function() {
      if (this.messageInput) {
        this.messageInput.addEventListener('focus', (e) => {
          console.log('[DEBUG] Input FOCUSED at:', new Date().toISOString());
          console.log('[DEBUG] Input state:', {
            isContentEditable: this.messageInput.isContentEditable,
            textContent: this.messageInput.textContent,
            innerHTML: this.messageInput.innerHTML,
            active: document.activeElement === this.messageInput
          });
        });
        
        this.messageInput.addEventListener('blur', () => {
          console.log('[DEBUG] Input BLURRED at:', new Date().toISOString());
        });
        
        this.messageInput.addEventListener('keydown', (e) => {
          console.log('[DEBUG] Keydown in input:', e.key, 'at:', new Date().toISOString());
        });
        
        this.messageInput.addEventListener('input', (e) => {
          console.log('[DEBUG] Input event fired. New value:', this.messageInput.textContent);
        });
      }
      
      // Monitor all focus changes in document
      document.addEventListener('focusin', (e) => {
        console.log('[DEBUG] Focus changed to:', e.target.tagName, 
                    e.target.id ? `#${e.target.id}` : '',
                    'at:', new Date().toISOString());
      });
    },
    
    /**
     * Set up core event listeners for the input
     * @private
     */
    _setupInputEventListeners: function() {
      // Handle input enter key (send message)
      this.messageInput.addEventListener('keydown', (e) => {
        // Send message on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
      
      // Handle input changes (for drafts and typing indicator)
      this.messageInput.addEventListener('input', () => {
        // Save draft on input
        this._saveDraft();
        
        // Send typing indicator
        this._sendTypingIndicator();
      });
      
      // Make the input show its placeholder when empty
      this.messageInput.addEventListener('blur', () => {
        if (!this.messageInput.textContent.trim()) {
          this.messageInput.classList.add('empty');
        }
        
        // Clear typing indicator
        const currentUser = AppState.get('currentUser');
        delete this.usersTyping[currentUser.id];
        this._updateTypingIndicator();
      });
      
      // Remove placeholder when focused
      this.messageInput.addEventListener('focus', () => {
        this.messageInput.classList.remove('empty');
        
        // Set cursor at end if no selection
        if (window.getSelection().isCollapsed) {
          this._placeCursorAtEnd(this.messageInput);
        }
      });
      
      // Initialize with empty class if no text
      if (!this.messageInput.textContent.trim()) {
        this.messageInput.classList.add('empty');
      }
      
      // Paste handling to remove formatting
      this.messageInput.addEventListener('paste', (e) => {
        e.preventDefault();
        
        // Get text only
        const text = e.clipboardData.getData('text/plain');
        
        // Insert at cursor position
        document.execCommand('insertText', false, text);
      });
    },
    
    /**
     * Place cursor at the end of contenteditable div
     * @param {HTMLElement} el - The element to place cursor in
     * @private
     */
    _placeCursorAtEnd: function(el) {
      const range = document.createRange();
      const selection = window.getSelection();
      
      // If the element has child nodes, set cursor after the last child
      if (el.lastChild) {
        range.setStartAfter(el.lastChild);
        range.setEndAfter(el.lastChild);
      } else {
        // If empty, set cursor at beginning of element
        range.setStart(el, 0);
        range.setEnd(el, 0);
      }
      
      selection.removeAllRanges();
      selection.addRange(range);
    },
    
    /**
     * Set up basic event listeners (non-emoji related)
     * @private
     */
    _setupBasicEventListeners: function() {
      // Make sure the messages container is properly set up for positioning
      this.messagesContainer.style.position = 'relative';
      this.messagesContainer.style.overflow = 'auto';

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
      
      // Handle emoji picker toggle
      this.emojiButton.addEventListener('click', (e) => {
        this._toggleEmojiPicker(e);
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
     * Set up emoji-related event listeners (after data is loaded)
     * @private
     */
    _setupEmojiEventListeners: function() {
      // Handle emoji selection
      const emojiGrid = this.emojiModal.querySelector('.emoji-grid');
      emojiGrid.addEventListener('click', (e) => {
        const emoji = e.target.closest('.emoji');
        if (emoji) {
          this._insertEmoji(emoji.textContent);
          this.emojiModal.style.display = 'none';
        }
      });
      
      // Handle emoji category selection - first level shows all subcategories
      const parentCategory = this.emojiModal.querySelector('.emoji-category.parent-category');
      const emojiCategories = this.emojiModal.querySelector('.emoji-categories');
      const scrollHint = this.emojiModal.querySelector('.emoji-categories-scroll-hint');
      const subcategories = this.emojiModal.querySelectorAll('.emoji-subcategory');
      
      // Add horizontal scrolling with mouse wheel for emoji categories
      emojiCategories.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault(); // Prevent vertical scrolling
          emojiCategories.scrollLeft += e.deltaY; // Scroll horizontally instead
        }
      });
      
      // Show/hide scroll hint based on scrollability
      const updateScrollHint = () => {
        // Show hint only if categories are horizontally scrollable (content wider than container)
        if (emojiCategories.scrollWidth > emojiCategories.clientWidth) {
          scrollHint.style.display = 'block';
          
          // Hide hint if scrolled to the end
          if (emojiCategories.scrollLeft + emojiCategories.clientWidth >= emojiCategories.scrollWidth - 5) {
            scrollHint.style.opacity = '0';
          } else {
            scrollHint.style.opacity = '0.8';
          }
        } else {
          scrollHint.style.display = 'none';
        }
      };
      
      // Update scroll hint on scroll
      emojiCategories.addEventListener('scroll', updateScrollHint);
      
      // Update scroll hint when categories expand/collapse
      const checkScrollability = () => {
        setTimeout(updateScrollHint, 10); // Small delay to allow layout to update
      };
      
      parentCategory.addEventListener('click', () => {
        // Toggle between showing parent category only and showing all subcategories
        const isExpanded = emojiCategories.classList.toggle('expanded');
        
        // Apply 8px padding when expanded, otherwise reset to 0
        emojiCategories.style.padding = isExpanded ? '8px' : '0';
        
        // Show/hide subcategories
        subcategories.forEach((subcat, index) => {
          subcat.style.display = isExpanded ? 'flex' : 'none';
          
          // If expanding, update subcategory icons from emoji data
          if (isExpanded && this.emojiData && this.emojiData.categories && this.emojiData.categories[index]) {
            subcat.textContent = this.emojiData.categories[index].icon;
          }
        });
        
        if (isExpanded) {
          // Clear emoji grid when expanded but don't select a subcategory by default
          const emojiGrid = this.emojiModal.querySelector('.emoji-grid');
          emojiGrid.innerHTML = '<div class="emoji-placeholder" style="grid-column: span 6; text-align: center; color: #dcddde; padding: 20px 0;">Select a category to see emojis</div>';
        } else {
          // Also clear emoji grid when collapsed
          const emojiGrid = this.emojiModal.querySelector('.emoji-grid');
          emojiGrid.innerHTML = '<div class="emoji-placeholder" style="grid-column: span 6; text-align: center; color: #dcddde; padding: 20px 0;">Select a category to see emojis</div>';
        }
        
        // Check if scrolling indicators should be displayed
        checkScrollability();
      });
      
      // Handle subcategory clicks
      subcategories.forEach((subcat, index) => {
        subcat.addEventListener('click', () => {
          // Update active subcategory
          subcategories.forEach(sc => sc.classList.remove('active'));
          subcat.classList.add('active');
          
          // Show emojis for this category
          this._showEmojiCategory(index);
        });
      });
      
      // Handle emoji search
      const emojiSearch = this.emojiModal.querySelector('.emoji-search');
      emojiSearch.addEventListener('input', (e) => {
        this._searchEmojis(e.target.value);
      });
      
      // Initialize scroll hint status when modal is shown
      this.emojiButton.addEventListener('click', checkScrollability);
      
      // Check scrollability on window resize too
      window.addEventListener('resize', () => {
        if (this.emojiModal.style.display === 'block') {
          checkScrollability();
        }
      });
    },
    
    /**
     * Show all emojis from all categories
     * @private
     */
    _showAllEmojis: function() {
      if (!this.emojiData || !this.emojiData.categories) {
        console.error('Emoji data not loaded yet');
        return;
      }
      
      // Clear the emoji grid but don't populate it
      const emojiGrid = this.emojiModal.querySelector('.emoji-grid');
      emojiGrid.innerHTML = '<div class="emoji-placeholder" style="grid-column: span 6; text-align: center; color: #dcddde; padding: 20px 0;">Select a category to see emojis</div>';
    },

    /**
     * Populate the emoji grid
     * @private
     */
    _populateEmojiGrid: function() {
      // First ensure emoji data is loaded
      if (!this.emojiData || !this.emojiData.categories) {
        console.warn('Emoji data not loaded yet');
        return;
      }
      
      // Don't modify the parent category icon - it's now an image element
      // Instead, just show all emojis initially
      this._showAllEmojis();
    },

    /**
     * Render messages for the active channel
     */
    renderMessages: function() {
      // Skip rendering if we're currently deleting a message
      if (this.isDeleting) {
        console.log('[DEBUG] Skipping renderMessages because isDeleting is true');
        return;
      }
      
      console.log('[DEBUG] Beginning renderMessages');
      
      // Save the active element before rendering
      const activeElement = document.activeElement;
      const wasInputFocused = activeElement === this.messageInput;
      const selection = window.getSelection();
      const range = wasInputFocused && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
      
      console.log('[DEBUG] Before rendering:', { 
        wasInputFocused, 
        activeElement: activeElement.tagName + (activeElement.id ? `#${activeElement.id}` : '')
      });
      
      const channelId = AppState.get('activeChannel');
      if (!channelId) {
        this.messagesContainer.innerHTML = '';
        return;
      }
      
      const channel = AppState.getActiveChannel();
      if (!channel || channel.type !== 'text') {
        return;
      }
      
      // Get the array of all messages for this channel
      const messages = AppState.getMessagesForChannel(channelId);
      
      // Clear existing messages
      this.messagesContainer.innerHTML = '';
      
      // Check if there are any messages in the array
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
      
      // Render all messages in the array, grouped by day for visual organization
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
      
      // Restore focus if input was focused before
      if (wasInputFocused && this.messageInput) {
        console.log('[DEBUG] Restoring focus after rendering');
        setTimeout(() => {
          console.log('[DEBUG] In setTimeout for focus restoration');
          
          // Focus the input element
          this.messageInput.focus();
          console.log('[DEBUG] focus() called, active element is now:', 
                     document.activeElement.tagName + (document.activeElement.id ? `#${document.activeElement.id}` : ''));
          
          // If we had a text selection, try to restore it
          if (range) {
            try {
              selection.removeAllRanges();
              selection.addRange(range);
              console.log('[DEBUG] Restored text selection');
            } catch (e) {
              console.error('[DEBUG] Could not restore selection:', e);
              // Fallback: put cursor at end
              this._placeCursorAtEnd(this.messageInput);
            }
          } else {
            // Place cursor at the end
            this._placeCursorAtEnd(this.messageInput);
          }
        }, 0);
      }
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
      
      // Check if the current user can delete this message
      const currentUser = AppState.get('currentUser');
      const denId = AppState.get('activeDen');
      const currentMember = members.find(m => m.id === currentUser.id);
      
      // Get roles and permissions for this member
      const memberRolesIds = currentMember?.roles || [];
      const roles = AppState.getRolesForDen(denId) || [];
      const memberRoles = roles.filter(role => memberRolesIds.includes(role.id));
      
      // Check for specific permissions
      const hasManageMessagesPermission = memberRoles.some(role => 
        role.permissions && role.permissions.includes('manageMessages')
      );
      
      const canDelete = message.userId === currentUser.id || // Own message
                      currentMember?.isOwner || // Den owner
                      hasManageMessagesPermission; // Has manage messages permission
      
      // Check if the current user can edit this message (only message owner)
      const canEdit = message.userId === currentUser.id;
      
      // Create message HTML with conditional delete button
      messageElement.innerHTML = `
        <div class="message-timestamp">${timestamp}</div>
        <div class="avatar" style="background-color: ${Utils.getRandomAvatarColor()}">
          ${avatarInitials}
        </div>
        <div class="message-content">
          <div class="message-header">
            <div class="username">${message.username}</div>
            <div class="timestamp">${message.edited ? `${timestamp} (edited)` : timestamp}</div>
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
          ${canEdit ? `
          <div class="message-action" data-action="edit">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </div>
          ` : ''}
          ${canDelete ? `
          <div class="message-action" data-action="delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </div>
          ` : ''}
        </div>
      `;
      
      // Add hover effect to message content
      const messageContent = messageElement.querySelector('.message-content');
      messageContent.addEventListener('mouseenter', function() {
        this.style.backgroundColor = '#303030';
        this.style.transition = 'background-color 0.2s ease';
        this.style.borderRadius = '8px';
      });
      
      messageContent.addEventListener('mouseleave', function() {
        this.style.backgroundColor = '';
        // Keep transition for smooth effect when leaving
      });
      
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
        this.messageInput.textContent = '';
        this.messageInput.classList.add('empty');
        
        // Update message input placeholder
        this.messageInput.setAttribute('data-placeholder', `Message #${channel.name}`);
        
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
      
      const content = this.messageInput.textContent.trim();
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
      this.messageInput.textContent = '';
      this.messageInput.classList.add('empty');
      
      // Clear draft
      delete this.messageDrafts[channelId];
      
      // Scroll to bottom
      this.scrollToBottom();
      
      // Clear typing indicator when message is sent
      clearTimeout(this.typingTimeout);
      delete this.usersTyping[currentUser.id];
      this._updateTypingIndicator();
      
      // Make sure input stays focused
      this.messageInput.focus();
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
      
      const content = this.messageInput.textContent.trim();
      
      if (content) {
        this.messageDrafts[channelId] = content;
        this.messageInput.classList.remove('empty');
      } else {
        delete this.messageDrafts[channelId];
        this.messageInput.classList.add('empty');
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
        this.messageInput.textContent = draft;
        this.messageInput.classList.remove('empty');
      } else {
        this.messageInput.textContent = '';
        this.messageInput.classList.add('empty');
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
      // Prevent event bubbling
      event.preventDefault();
      event.stopPropagation();
      
      // Check if modal is already visible
      const isVisible = this.emojiModal.style.display === 'block';
      
      // Clear any existing event listeners to avoid memory leaks
      if (this.emojiModal._clickHandler) {
        document.removeEventListener('click', this.emojiModal._clickHandler);
        this.emojiModal._clickHandler = null;
      }
      
      if (isVisible) {
        this.emojiModal.style.display = 'none';
        return;
      }
      
      // Make sure the emoji modal is still in the messages container
      if (this.emojiModal.parentElement !== this.messagesContainer) {
        // If not in messages container, re-add it
        this.messagesContainer.appendChild(this.emojiModal);
      }
      
      // Position and show the emoji modal
      this.emojiModal.style.position = 'absolute';
      this.emojiModal.style.bottom = '10px';
      this.emojiModal.style.right = '10px';
      this.emojiModal.style.display = 'block';
      
      // Reset the search and categories
      const searchInput = this.emojiModal.querySelector('.emoji-search');
      searchInput.value = '';
      
      const emojiCategories = this.emojiModal.querySelector('.emoji-categories');
      const subcategories = this.emojiModal.querySelectorAll('.emoji-subcategory');
      emojiCategories.classList.remove('expanded');
      
      subcategories.forEach(subcat => {
        subcat.style.display = 'none';
      });
      
      const emojiGrid = this.emojiModal.querySelector('.emoji-grid');
      emojiGrid.innerHTML = '<div class="emoji-placeholder" style="grid-column: span 6; text-align: center; color: #dcddde; padding: 20px 0;">Select a category to see emojis</div>';
      
      // Check if the scroll hint should be shown
      const scrollHint = this.emojiModal.querySelector('.emoji-categories-scroll-hint');
      const updateScrollHint = () => {
        if (emojiCategories.scrollWidth > emojiCategories.clientWidth) {
          scrollHint.style.display = 'block';
          scrollHint.style.opacity = '0.8';
        } else {
          scrollHint.style.display = 'none';
        }
      };
      setTimeout(updateScrollHint, 10);
      
      // Focus search after a short delay
      setTimeout(() => {
        searchInput.focus();
      }, 100);
      
      // Set up a click handler for closing the modal
      const clickHandler = (e) => {
        if (!this.emojiModal.contains(e.target) && 
            e.target !== this.emojiButton && 
            !this.emojiButton.contains(e.target)) {
          this.emojiModal.style.display = 'none';
          document.removeEventListener('click', clickHandler);
        }
      };
      
      // Add the click handler after a short delay to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('click', clickHandler);
        this.emojiModal._clickHandler = clickHandler;
      }, 10);
    },
    
    /**
     * Load emoji data from JSON file
     * @returns {Promise} Promise that resolves when emoji data is loaded
     * @private
     */
    _loadEmojiData: function() {
      return new Promise((resolve, reject) => {
        fetch('./js/data/emojis.json')
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            this.emojiData = data;
            
            // Extract all emojis for search functionality
            this.allEmojis = [];
            data.categories.forEach(category => {
              this.allEmojis = this.allEmojis.concat(category.emojis);
            });
            
            resolve();
          })
          .catch(reject);
      });
    },

    /**
     * Show emojis for a specific category
     * @param {number} categoryIndex - The category index
     * @private
     */
    _showEmojiCategory: function(categoryIndex) {
      if (!this.emojiData || !this.emojiData.categories) {
        console.error('Emoji data not loaded yet');
        return;
      }
  
      const emojiGrid = this.emojiModal.querySelector('.emoji-grid');
      emojiGrid.innerHTML = '';
      
      const category = this.emojiData.categories[categoryIndex];
      if (!category || !category.emojis) return;
      
      category.emojis.forEach(emoji => {
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
      if (!this.emojiData || !this.allEmojis) {
        console.error('Emoji data not loaded yet');
        return;
      }
      
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
      // Focus input
      this.messageInput.focus();
      
      // Insert at cursor position
      document.execCommand('insertText', false, emoji);
      
      // Mark as not empty
      this.messageInput.classList.remove('empty');
      
      // Save draft
      this._saveDraft();
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
      
      // Add edit option if own message
      if (isOwnMessage) {
        menuItems.push({ divider: true });
        
        menuItems.push({
          label: 'Edit Message',
          icon: '✏️',
          onClick: () => this._handleEditMessage(messageId)
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
      
      // Use common reactions from the emoji data
      const commonReactions = this.emojiData?.commonReactions || ['👍', '👎', '❤️', '🦊', '😂'];
      
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
      this.messageInput.textContent = replyPrefix + this.messageInput.textContent;
      
      // Position cursor at the end
      this.messageInput.selectionStart = this.messageInput.selectionEnd = this.messageInput.textContent.length;
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
      const denId = AppState.get('activeDen');
      const members = AppState.getMembersForDen(denId) || [];
      const currentMember = members.find(m => m.id === currentUser.id);
      
      // Get roles and permissions for this member
      const memberRolesIds = currentMember?.roles || [];
      const roles = AppState.getRolesForDen(denId) || [];
      const memberRoles = roles.filter(role => memberRolesIds.includes(role.id));
      
      // Check for specific permissions
      const hasManageMessagesPermission = memberRoles.some(role => 
        role.permissions && role.permissions.includes('manageMessages')
      );
      
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
          // Check if user has permission to delete the message
          const canDelete = message.userId === currentUser.id || // Own message
                          currentMember?.isOwner || // Den owner
                          hasManageMessagesPermission; // Has manage messages permission
          
          if (canDelete) {
            this._handleDeleteMessage(messageId);
          } else {
            Utils.showToast("You don't have permission to delete this message", "error");
          }
          break;
          
        default:
          console.warn(`Unknown message action: ${action}`);
      }
    },

    /**
     * Handle deleting a message
     * @param {string} messageId - The message ID to delete
     * @private
     */
    _handleDeleteMessage: function(messageId) {
      const channelId = AppState.get('activeChannel');
      if (!channelId) return;
      
      const messages = AppState.getMessagesForChannel(channelId);
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      
      if (messageIndex === -1) return;
      
      // Remove message from state
      const updatedMessages = [...messages];
      updatedMessages.splice(messageIndex, 1);
      
      const allMessages = { ...AppState.get('messages') };
      allMessages[channelId] = updatedMessages;
      
      AppState.set('messages', allMessages);
      
      // Remove message element from DOM
      const messageElement = this.messagesContainer.querySelector(`.message[data-message-id="${messageId}"]`);
      if (messageElement) {
        messageElement.remove();
      }
      
      Utils.showToast("Message deleted", "success");
    }
  };
  
  // Double ensure ChatManager is globally accessible
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.ChatManager;
  }
  
  // Log that ChatManager has been defined
  console.log("ChatManager defined globally");
  
})(typeof window !== 'undefined' ? window : this);
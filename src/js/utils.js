/**
 * FoxDen Utility Functions
 * 
 * This file contains utility functions used across the application
 */

const Utils = {
    /**
     * Generate a unique ID
     * @returns {string} A unique ID
     */
    generateId: function() {
      // Use the Electron bridge if available, otherwise generate a simple ID
      if (window.electron && window.electron.generateId) {
        return window.electron.generateId();
      }
      
      return Math.random().toString(36).substring(2, 15) + 
             Math.random().toString(36).substring(2, 15);
    },
    
    /**
     * Format a date to a human-readable string
     * @param {Date|string|number} date - The date to format
     * @param {boolean} includeTime - Whether to include the time
     * @returns {string} Formatted date string
     */
    formatDate: function(date, includeTime = false) {
      const dateObj = new Date(date);
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const isToday = dateObj.toDateString() === now.toDateString();
      const isYesterday = dateObj.toDateString() === yesterday.toDateString();
      
      let formattedDate;
      
      if (isToday) {
        formattedDate = 'Today';
      } else if (isYesterday) {
        formattedDate = 'Yesterday';
      } else {
        formattedDate = dateObj.toLocaleDateString(undefined, { 
          month: 'short', 
          day: 'numeric', 
          year: dateObj.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
        });
      }
      
      if (includeTime) {
        const formattedTime = dateObj.toLocaleTimeString(undefined, { 
          hour: '2-digit', 
          minute: '2-digit'
        });
        formattedDate += ' at ' + formattedTime;
      }
      
      return formattedDate;
    },
    
    /**
     * Format a message timestamp
     * @param {Date|string|number} timestamp - The timestamp to format
     * @returns {string} Formatted timestamp string
     */
    formatMessageTime: function(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit'
      });
    },
    
    /**
     * Truncate a string to a specified length
     * @param {string} str - The string to truncate
     * @param {number} length - The maximum length
     * @returns {string} Truncated string
     */
    truncate: function(str, length) {
      if (str.length <= length) return str;
      return str.substring(0, length) + '...';
    },
    
    /**
     * Generate initials from a name
     * @param {string} name - The name to generate initials from
     * @returns {string} Initials (up to 2 characters)
     */
    getInitials: function(name) {
      if (!name) return '?';
      
      const words = name.trim().split(/\s+/);
      
      if (words.length === 1) {
        return words[0].charAt(0).toUpperCase();
      }
      
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    },
    
    /**
     * Calculate file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize: function(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    },
    
    /**
     * Debounce a function to prevent multiple rapid calls
     * @param {Function} func - The function to debounce
     * @param {number} wait - The debounce delay in milliseconds
     * @returns {Function} Debounced function
     */
    debounce: function(func, wait) {
      let timeout;
      
      return function(...args) {
        const context = this;
        clearTimeout(timeout);
        
        timeout = setTimeout(() => {
          func.apply(context, args);
        }, wait);
      };
    },
    
    /**
     * Escape HTML to prevent XSS attacks
     * @param {string} html - The string to escape
     * @returns {string} Escaped string
     */
    escapeHtml: function(html) {
      const div = document.createElement('div');
      div.textContent = html;
      return div.innerHTML;
    },
    
    /**
     * Parse emojis, mentions, and formatting in text
     * @param {string} text - The text to parse
     * @param {Array} users - Array of users for mention lookup
     * @returns {string} HTML-formatted text
     */
    parseMessageText: function(text, users = []) {
      if (!text) return '';
      
      // Escape HTML
      let parsed = this.escapeHtml(text);
      
      // Handle code blocks
      parsed = parsed.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<div class="code-block">${code}</div>`;
      });
      
      // Handle inline code
      parsed = parsed.replace(/`([^`]+)`/g, (match, code) => {
        return `<span class="inline-code">${code}</span>`;
      });
      
      // Handle blockquotes
      parsed = parsed.replace(/^>\s(.+)$/gm, (match, quote) => {
        return `<div class="blockquote">${quote}</div>`;
      });
      
      // Handle user mentions (@username)
      parsed = parsed.replace(/@(\w+)/g, (match, username) => {
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (user) {
          return `<span class="mention" data-user-id="${user.id}">@${username}</span>`;
        }
        return match;
      });
      
      // Handle channel mentions (#channel)
      parsed = parsed.replace(/#(\w+)/g, (match, channelName) => {
        return `<span class="mention" data-channel="${channelName}">#${channelName}</span>`;
      });
      
      // Handle URLs
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      parsed = parsed.replace(urlRegex, url => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
      });
      
      // Convert newlines to <br>
      parsed = parsed.replace(/\n/g, '<br>');
      
      return parsed;
    },
    
    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - The type of toast (success, error, warning, info)
     * @param {number} duration - How long to show the toast in ms
     */
    showToast: function(message, type = 'info', duration = 3000) {
      const toastContainer = document.getElementById('toast-container');
      
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      
      let iconSymbol = '📢';
      if (type === 'success') iconSymbol = '✅';
      if (type === 'error') iconSymbol = '❌';
      if (type === 'warning') iconSymbol = '⚠️';
      
      toast.innerHTML = `
        <div class="toast-icon">${iconSymbol}</div>
        <div class="toast-content">
          <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
          <div class="toast-message">${message}</div>
        </div>
        <div class="toast-close">✕</div>
      `;
      
      toastContainer.appendChild(toast);
      
      toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
      });
      
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    },
    
    /**
     * Create a context menu at the specified position
     * @param {Array} items - Menu items
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    showContextMenu: function(items, x, y) {
      // Remove any existing context menus
      const existingMenu = document.querySelector('.context-menu');
      if (existingMenu) existingMenu.remove();
      
      // Create the menu
      const menu = document.createElement('div');
      menu.className = 'context-menu';
      
      // Add items
      for (const item of items) {
        if (item.divider) {
          const divider = document.createElement('div');
          divider.className = 'context-menu-divider';
          menu.appendChild(divider);
        } else {
          const menuItem = document.createElement('div');
          menuItem.className = `context-menu-item ${item.danger ? 'danger' : ''}`;
          
          let icon = '';
          if (item.icon) {
            icon = `<span class="context-menu-icon">${item.icon}</span>`;
          }
          
          menuItem.innerHTML = `${icon}${item.label}`;
          
          if (item.onClick) {
            menuItem.addEventListener('click', (e) => {
              e.stopPropagation();
              item.onClick();
              menu.remove();
            });
          }
          
          menu.appendChild(menuItem);
        }
      }
      
      // Add to document
      document.body.appendChild(menu);
      
      // Position the menu
      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.offsetHeight;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // Adjust position if menu would go off screen
      if (x + menuWidth > windowWidth) {
        x = windowWidth - menuWidth;
      }
      
      if (y + menuHeight > windowHeight) {
        y = windowHeight - menuHeight;
      }
      
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';
      
      // Close menu when clicking outside
      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      };
      
      // Wait a tick before adding the event listener to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
      }, 0);
      
      return menu;
    },
    
    /**
     * Animate a DOM element
     * @param {HTMLElement} element - The element to animate
     * @param {string} keyframes - CSS keyframes
     * @param {number} duration - Animation duration in ms
     * @returns {Animation} The animation object
     */
    animate: function(element, keyframes, duration) {
      return element.animate(keyframes, {
        duration: duration,
        easing: 'ease-in-out',
        fill: 'forwards'
      });
    },
    
    /**
     * Get a random color for user avatars
     * @returns {string} A CSS color string
     */
    getRandomAvatarColor: function() {
      const colors = [
        '#ff7518', // FoxDen orange
        '#ff4f4f', // Red
        '#4fafff', // Blue
        '#4fff4f', // Green
        '#d14fff', // Purple
        '#ff4fa6', // Pink
        '#ffd700', // Gold
        '#00c3ff', // Cyan
      ];
      
      return colors[Math.floor(Math.random() * colors.length)];
    }
  };
  
  // Export utilities for use in other modules
  window.Utils = Utils;
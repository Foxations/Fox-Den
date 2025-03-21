/**
 * Render current user information
 * @private
 */
_renderCurrentUser: function() {
  const user = AppState.get('currentUser');
  if (!user) return;
  
  // Update user initials
  if (this.userInitials) {
    this.userInitials.textContent = user.avatar || Utils.getInitials(user.username);
  }
  
  // Update status indicator
  if (this.userStatusIndicator) {
    this.userStatusIndicator.className = `user-status ${user.status}`;
  }
  
  // Update username and status text in the user controls
  const usernameElement = document.querySelector('.user-controls .username');
  if (usernameElement) {
    usernameElement.textContent = user.username;
  }
  
  const statusTextElement = document.querySelector('.user-controls .status-text');
  if (statusTextElement) {
    statusTextElement.textContent = this.getStatusName(user.status);
  }
}, 
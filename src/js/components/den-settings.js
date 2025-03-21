/**
 * FoxDen Den Settings Management
 * 
 * Handles all functionality related to den settings
 */

const DenSettingsManager = {
  // Track initialization state
  initialized: false,
  
  // Currently active settings category
  activeCategory: 'overview',
  
  /**
   * Initialize the den settings manager
   */
  init: function() {
    if (this.initialized) return;
    
    // Cache DOM elements
    this.settingsPanel = document.getElementById('den-settings-panel');
    this.settingsContentContainer = this.settingsPanel.querySelector('.den-settings-content-container');
    this.settingsSidebar = document.getElementById('den-settings-sidebar');
    this.settingsContent = document.getElementById('den-settings-content');
    
    // Set up event listeners
    this._setupEventListeners();
    
    this.initialized = true;
  },
  
  /**
   * Set up event listeners for den settings-related elements
   * @private
   */
  _setupEventListeners: function() {
    // Handle close settings button click
    const closeButton = document.getElementById('close-den-settings');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.hideSettings();
      });
    } else {
      console.warn('Den settings close button not found');
    }
    
    // Listen for ESC key to close settings
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.settingsPanel.classList.contains('active')) {
        this.hideSettings();
      }
    });
    
    // Handle settings category clicks
    if (this.settingsSidebar) {
      this.settingsSidebar.addEventListener('click', (e) => {
        const category = e.target.closest('.settings-category');
        if (category) {
          this.showSettings(category.dataset.category);
        }
      });
    } else {
      console.warn('Den settings sidebar not found');
    }
  },
  
  /**
   * Show the den settings panel
   * @param {string} [category] - The settings category to show
   */
  showSettings: function(category = 'overview') {
    // Ensure the manager is initialized
    if (!this.initialized) {
      this.init();
    }
    
    this.activeCategory = category;
    
    // Update active category in sidebar
    this._updateActiveCategorySidebar(category);
    
    // Load content for the active category
    this._loadCategoryContent(category);
    
    // Show settings panel with proper animation
    requestAnimationFrame(() => {
      this.settingsPanel.classList.add('active');
    });
  },
  
  /**
   * Hide the den settings panel
   */
  hideSettings: function() {
    this.settingsPanel.classList.remove('active');
  },
  
  /**
   * Update the active category in the sidebar
   * @private
   */
  _updateActiveCategorySidebar: function(category) {
    const categories = this.settingsSidebar.querySelectorAll('.settings-category');
    
    categories.forEach(cat => {
      cat.classList.toggle('active', cat.dataset.category === category);
    });
  },
  
  /**
   * Load content for a settings category
   * @param {string} category - The category to load
   * @private
   */
  _loadCategoryContent: function(category) {
    // Clear existing content
    this.settingsContent.innerHTML = '';
    
    // Load category content
    switch (category) {
      case 'overview':
        this._loadOverviewSettings();
        break;
      case 'roles':
        this._loadRolesSettings();
        break;
      case 'emoji':
        this._loadEmojiSettings();
        break;
      case 'invitation-codes':
        this._loadInvitationCodesSettings();
        break;
      case 'moderation':
        this._loadModerationSettings();
        break;
      case 'members':
        this._loadMembersSettings();
        break;
      default:
        this._loadOverviewSettings();
    }
  },
  
  /**
   * Load overview settings content
   * @private
   */
  _loadOverviewSettings: function() {
    const den = AppState.getActiveDen();
    if (!den) return;
    
    const overviewHtml = `
      <div class="settings-section">
        <h3>Overview</h3>
        
        <div class="settings-group">
          <h4>Den Icon</h4>
          <div class="icon-selector">
            <div class="den-icon-preview">${den.icon || 'FD'}</div>
            <button class="change-button" id="upload-den-icon">Upload Icon</button>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Den Name</h4>
          <input type="text" id="den-name" value="${den.name || ''}" placeholder="Enter a den name" />
        </div>
        
        <div class="settings-group">
          <h4>Description</h4>
          <textarea id="den-description" placeholder="Enter a description for your den">${den.description || ''}</textarea>
        </div>
        
        <div class="settings-actions">
          <button class="change-button" id="save-overview-settings">Save Changes</button>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = overviewHtml;
    
    // Set up event listeners
    document.getElementById('upload-den-icon').addEventListener('click', () => {
      Utils.showToast('Upload icon functionality would open here', 'info');
    });
    
    document.getElementById('save-overview-settings').addEventListener('click', () => {
      const name = document.getElementById('den-name').value;
      const description = document.getElementById('den-description').value;
      
      // Update den in state
      const denId = AppState.get('activeDen');
      const dens = AppState.get('dens');
      const updatedDens = dens.map(d => {
        if (d.id === denId) {
          return { ...d, name, description };
        }
        return d;
      });
      
      AppState.set('dens', updatedDens);
      Utils.showToast('Overview settings updated successfully', 'success');
    });
  },

  /**
   * Load roles settings content
   * @private
   */
  _loadRolesSettings: function() {
    const denId = AppState.get('activeDen');
    if (!denId) return;
    
    // Roles should be stored per den
    const den = AppState.getActiveDen();
    if (!den) return;
    
    // Check if user has permission to manage roles
    const currentUser = AppState.get('currentUser');
    const members = AppState.getMembersForDen(denId) || [];
    const currentMember = members.find(m => m.id === currentUser.id);
    
    // Owner can always manage roles
    let canManageRoles = currentMember?.isOwner || false;
    
    if (!canManageRoles) {
      // Get roles and permissions for this member
      const memberRolesIds = currentMember?.roles || [];
      const roles = AppState.getRolesForDen(denId) || [];
      const memberRoles = roles.filter(role => memberRolesIds.includes(role.id));
      
      // Check for manage roles permission
      canManageRoles = memberRoles.some(r => 
        r.permissions && r.permissions.includes('manageRoles')
      );
    }
    
    const rolesHtml = `
      <div class="settings-section">
        <h3>Roles</h3>
        <p class="settings-description">Roles are used to assign permissions to members in your den. Members with roles can perform actions based on the permissions you grant to each role.</p>
        <div class="roles-list">
          ${roles.length > 0 ? roles.map(role => `
            <div class="role-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin-bottom: 5px; background-color: var(--bg-tertiary); border-radius: 4px;">
              <div class="role-info">
                <span class="role-name" style="font-weight: bold; ${role.color ? `color: ${role.color};` : ''}">${role.name}</span>
                <span class="role-members" style="font-size: 0.8em; margin-left: 10px; color: var(--text-muted);">${this._countMembersWithRole(denId, role.id)} members</span>
              </div>
              ${canManageRoles ? `
              <div class="role-actions">
                <button class="change-button edit-role" data-role-id="${role.id}">Edit</button>
                ${role.id !== 'admin' && role.id !== 'moderator' ? `<button class="change-button delete-role" data-role-id="${role.id}" style="margin-left: 5px; background-color: var(--danger);">Delete</button>` : ''}
              </div>
              ` : ''}
            </div>
          `).join('') : '<p class="no-roles-message" style="color: var(--text-muted);">No custom roles yet. Create your first role to get started!</p>'}
        </div>
        ${canManageRoles ? `
        <div class="settings-actions">
          <button class="change-button" id="add-role">Create Role</button>
        </div>
        ` : ''}
      </div>
    `;
    
    this.settingsContent.innerHTML = rolesHtml;
    
    // Set up event listeners if user can manage roles
    if (canManageRoles) {
      document.getElementById('add-role').addEventListener('click', () => {
        this._showRoleModal();
      });
      
      document.querySelectorAll('.edit-role').forEach(button => {
        button.addEventListener('click', () => {
          const roleId = button.dataset.roleId;
          const role = roles.find(r => r.id === roleId);
          if (role) {
            this._showRoleModal(role);
          }
        });
      });
      
      document.querySelectorAll('.delete-role').forEach(button => {
        button.addEventListener('click', () => {
          const roleId = button.dataset.roleId;
          
          // Confirm before deleting
          if (confirm('Are you sure you want to delete this role? Members with this role will lose the permissions associated with it.')) {
            const updatedRoles = roles.filter(r => r.id !== roleId);
            
            // Update roles for this den
            AppState.setRolesForDen(denId, updatedRoles);
            
            // Remove this role from any members who have it
            this._removeRoleFromMembers(denId, roleId);
            
            // Reload roles settings
            this._loadRolesSettings();
            
            Utils.showToast('Role deleted successfully', 'success');
          }
        });
      });
    }
  },

  /**
   * Count the number of members with a particular role
   * @param {string} denId - The den ID
   * @param {string} roleId - The role ID
   * @returns {number} - The number of members with this role
   * @private
   */
  _countMembersWithRole: function(denId, roleId) {
    const members = AppState.getMembersForDen(denId) || [];
    return members.filter(member => member.roles && member.roles.includes(roleId)).length;
  },

  /**
   * Remove a role from all members who have it
   * @param {string} denId - The den ID
   * @param {string} roleId - The role ID to remove
   * @private
   */
  _removeRoleFromMembers: function(denId, roleId) {
    const members = AppState.getMembersForDen(denId) || [];
    
    const updatedMembers = members.map(member => {
      if (member.roles && member.roles.includes(roleId)) {
        return {
          ...member,
          roles: member.roles.filter(r => r !== roleId)
        };
      }
      return member;
    });
    
    // Update members in state
    AppState.set('members', { ...AppState.get('members'), [denId]: updatedMembers });
  },

  /**
   * Show the role creation/editing modal
   * @param {Object} [role] - The role to edit (if editing)
   * @private
   */
  _showRoleModal: function(role) {
    const denId = AppState.get('activeDen');
    if (!denId) return;
    
    // Check if user has permission to manage roles
    const currentUser = AppState.get('currentUser');
    const members = AppState.getMembersForDen(denId) || [];
    const currentMember = members.find(m => m.id === currentUser.id);
    
    // Owner can always manage roles
    if (!currentMember?.isOwner) {
      // Get roles and permissions for this member
      const memberRolesIds = currentMember?.roles || [];
      const roles = AppState.getRolesForDen(denId) || [];
      const memberRoles = roles.filter(role => memberRolesIds.includes(role.id));
      
      // Check for manage roles permission
      const hasManageRolesPermission = memberRoles.some(r => 
        r.permissions && r.permissions.includes('manageRoles')
      );
      
      if (!hasManageRolesPermission) {
        Utils.showToast("You don't have permission to manage roles", "error");
        return;
      }
    }
    
    const isEditing = !!role;
    const modalTitle = isEditing ? 'Edit Role' : 'Create Role';
    
    // Define available permissions
    const permissions = [
      { id: 'manageChannels', name: 'Manage Channels', description: 'Create, edit, and delete channels' },
      { id: 'manageRoles', name: 'Manage Roles', description: 'Create, edit, and delete roles with equal or lower permissions' },
      { id: 'kickMembers', name: 'Kick Members', description: 'Remove members from the den' },
      { id: 'banMembers', name: 'Ban Members', description: 'Ban members from the den' },
      { id: 'manageMessages', name: 'Manage Messages', description: 'Delete or edit any message in the den' },
      { id: 'mentionEveryone', name: 'Mention Everyone', description: 'Mention all members at once' },
      { id: 'uploadFiles', name: 'Upload Files', description: 'Upload files in text channels' }
    ];
    
    // Create the modal HTML
    const modalHtml = `
      <div class="modal active" id="role-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-container">
          <div class="modal-header">
            <h3>${modalTitle}</h3>
            <button class="modal-close" id="close-role-modal">✕</button>
          </div>
          <div class="modal-content">
            <div class="role-form">
              <div class="form-group">
                <label for="role-name">Role Name</label>
                <input type="text" id="role-name" value="${role ? role.name : ''}" placeholder="Enter role name" />
              </div>
              
              <div class="form-group">
                <label for="role-color">Role Color</label>
                <input type="color" id="role-color" value="${role && role.color ? role.color : '#7289da'}" />
              </div>
              
              <div class="form-group">
                <label>Permissions</label>
                <div class="permissions-list">
                  ${permissions.map(perm => `
                    <div class="permission-item">
                      <div class="permission-info">
                        <div class="permission-name">${perm.name}</div>
                        <div class="permission-description">${perm.description}</div>
                      </div>
                      <div class="toggle-switch">
                        <input type="checkbox" id="perm-${perm.id}" class="toggle-input" 
                          ${role && role.permissions && role.permissions.includes(perm.id) ? 'checked' : ''} />
                        <label for="perm-${perm.id}" class="toggle-slider"></label>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="modal-button secondary" id="cancel-role">Cancel</button>
            <button class="modal-button primary" id="save-role">Save Role</button>
          </div>
        </div>
      </div>
    `;
    
    // Add to DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstChild);
    
    // Set up event listeners
    document.getElementById('close-role-modal').addEventListener('click', () => {
      document.getElementById('role-modal').remove();
    });
    
    document.getElementById('cancel-role').addEventListener('click', () => {
      document.getElementById('role-modal').remove();
    });
    
    document.getElementById('save-role').addEventListener('click', () => {
      const roleName = document.getElementById('role-name').value.trim();
      const roleColor = document.getElementById('role-color').value;
      
      if (!roleName) {
        Utils.showToast('Please enter a role name', 'error');
        return;
      }
      
      // Gather selected permissions
      const selectedPermissions = [];
      permissions.forEach(perm => {
        const checkbox = document.getElementById(`perm-${perm.id}`);
        if (checkbox && checkbox.checked) {
          selectedPermissions.push(perm.id);
        }
      });
      
      // Get current roles for the den
      const roles = AppState.getRolesForDen(denId) || [];
      
      if (isEditing) {
        // Update existing role
        const updatedRoles = roles.map(r => {
          if (r.id === role.id) {
            return {
              ...r,
              name: roleName,
              color: roleColor,
              permissions: selectedPermissions,
              updatedAt: new Date().toISOString()
            };
          }
          return r;
        });
        
        // Update roles in state
        AppState.setRolesForDen(denId, updatedRoles);
        
        Utils.showToast(`Role "${roleName}" updated successfully`, 'success');
      } else {
        // Create new role
        const newRole = {
          id: `role-${Date.now()}`,
          name: roleName,
          color: roleColor,
          permissions: selectedPermissions,
          createdAt: new Date().toISOString()
        };
        
        // Add to roles array
        const updatedRoles = [...roles, newRole];
        
        // Update roles in state
        AppState.setRolesForDen(denId, updatedRoles);
        
        Utils.showToast(`Role "${roleName}" created successfully`, 'success');
      }
      
      // Close modal
      document.getElementById('role-modal').remove();
      
      // Reload roles settings
      this._loadRolesSettings();
    });
  },

  /**
   * Load emoji settings content
   * @private
   */
  _loadEmojiSettings: function() {
    const emojis = AppState.get('emojis') || [];
    
    const emojiHtml = `
      <div class="settings-section">
        <h3>Emoji</h3>
        <div class="emoji-list">
          ${emojis.map(emoji => `
            <div class="emoji-item">
              <span class="emoji-icon">${emoji.icon}</span>
              <span class="emoji-name">${emoji.name}</span>
              <button class="change-button delete-emoji" data-emoji-id="${emoji.id}">Delete</button>
            </div>
          `).join('')}
        </div>
        <div class="settings-actions">
          <button class="change-button" id="add-emoji">Add Emoji</button>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = emojiHtml;
    
    // Set up event listeners
    document.getElementById('add-emoji').addEventListener('click', () => {
      Utils.showToast('Add emoji functionality would open here', 'info');
    });
    
    document.querySelectorAll('.delete-emoji').forEach(button => {
      button.addEventListener('click', () => {
        const emojiId = button.dataset.emojiId;
        const updatedEmojis = emojis.filter(e => e.id !== emojiId);
        AppState.set('emojis', updatedEmojis);
        this._loadEmojiSettings();
        Utils.showToast('Emoji deleted successfully', 'success');
      });
    });
  },

  /**
   * Load invitation codes settings content
   * @private
   */
  _loadInvitationCodesSettings: function() {
    const invites = AppState.get('invites') || [];
    
    const invitationHtml = `
      <div class="settings-section">
        <h3>Invitation Codes</h3>
        <div class="invitation-list">
          ${invites.map(invite => `
            <div class="invite-item">
              <span class="invite-code">${invite.code}</span>
              <button class="change-button delete-invite" data-invite-id="${invite.id}">Delete</button>
            </div>
          `).join('')}
        </div>
        <div class="settings-actions">
          <button class="change-button" id="create-invite">Create Invite</button>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = invitationHtml;
    
    // Set up event listeners
    document.getElementById('create-invite').addEventListener('click', () => {
      const newInvite = {
        id: `invite-${Date.now()}`,
        code: Math.random().toString(36).substring(2, 8).toUpperCase()
      };
      AppState.set('invites', [...invites, newInvite]);
      this._loadInvitationCodesSettings();
      Utils.showToast('Invitation code created successfully', 'success');
    });
    
    document.querySelectorAll('.delete-invite').forEach(button => {
      button.addEventListener('click', () => {
        const inviteId = button.dataset.inviteId;
        const updatedInvites = invites.filter(i => i.id !== inviteId);
        AppState.set('invites', updatedInvites);
        this._loadInvitationCodesSettings();
        Utils.showToast('Invitation code deleted successfully', 'success');
      });
    });
  },

  /**
   * Load moderation settings content
   * @private
   */
  _loadModerationSettings: function() {
    const moderationHtml = `
      <div class="settings-section">
        <h3>Moderation</h3>
        <div class="settings-group">
          <h4>Auto-Moderation</h4>
          <div class="toggle-switch">
            <input type="checkbox" id="auto-moderation" class="toggle-input" ${AppState.get('autoModeration') ? 'checked' : ''}>
            <label for="auto-moderation" class="toggle-slider"></label>
          </div>
        </div>
        <div class="settings-group">
          <h4>Ban Words</h4>
          <textarea id="banned-words" placeholder="Enter banned words, separated by commas">${AppState.get('bannedWords') || ''}</textarea>
        </div>
        <div class="settings-actions">
          <button class="change-button" id="save-moderation-settings">Save Changes</button>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = moderationHtml;
    
    // Set up event listeners
    document.getElementById('save-moderation-settings').addEventListener('click', () => {
      const autoModeration = document.getElementById('auto-moderation').checked;
      const bannedWords = document.getElementById('banned-words').value;
      AppState.set('autoModeration', autoModeration);
      AppState.set('bannedWords', bannedWords);
      Utils.showToast('Moderation settings updated successfully', 'success');
    });
  },

  /**
   * Load members settings content
   * @private
   */
  _loadMembersSettings: function() {
    const denId = AppState.get('activeDen');
    if (!denId) return;
    
    const members = AppState.getMembersForDen(denId) || [];
    const roles = AppState.getRolesForDen(denId) || [];
    
    // Check if user has permission to kick members or manage roles
    const currentUser = AppState.get('currentUser');
    const currentMember = members.find(m => m.id === currentUser.id);
    
    // Owner can always manage members
    let canKickMembers = currentMember?.isOwner || false;
    let canManageRoles = currentMember?.isOwner || false;
    
    if (!canKickMembers || !canManageRoles) {
      // Get roles and permissions for this member
      const memberRolesIds = currentMember?.roles || [];
      const memberRoles = roles.filter(role => memberRolesIds.includes(role.id));
      
      // Check for permissions
      if (!canKickMembers) {
        canKickMembers = memberRoles.some(r => 
          r.permissions && r.permissions.includes('kickMembers')
        );
      }
      
      if (!canManageRoles) {
        canManageRoles = memberRoles.some(r => 
          r.permissions && r.permissions.includes('manageRoles')
        );
      }
    }
    
    const membersHtml = `
      <div class="settings-section">
        <h3>Members</h3>
        <p class="settings-description">Manage members and their roles in your den.</p>
        
        <div class="members-list">
          ${members.map(member => `
            <div class="member-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin-bottom: 5px; background-color: var(--bg-tertiary); border-radius: 4px;">
              <div class="member-info">
                <span class="member-name">${member.username}</span>
                <div class="member-roles" style="font-size: 0.8em; margin-top: 3px;">
                  ${member.isOwner ? '<span class="role-badge owner" style="background-color: #f1c40f; color: black; border-radius: 3px; padding: 2px 5px; margin-right: 5px;">Owner</span>' : ''}
                  ${member.roles && member.roles.length > 0 ? member.roles.map(roleId => {
                    const role = roles.find(r => r.id === roleId);
                    return role ? `<span class="role-badge" style="background-color: ${role.color || '#7289da'}; border-radius: 3px; padding: 2px 5px; margin-right: 5px;">${role.name}</span>` : '';
                  }).join('') : ''}
                </div>
              </div>
              <div class="member-actions">
                ${!member.isOwner && currentUser.id !== member.id ? `
                  ${canManageRoles ? `<button class="change-button manage-roles" data-member-id="${member.id}">Manage Roles</button>` : ''}
                  ${canKickMembers ? `<button class="change-button remove-member" data-member-id="${member.id}" style="margin-left: 5px; background-color: var(--danger);">Remove</button>` : ''}
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = membersHtml;
    
    // Set up event listeners
    if (canManageRoles) {
      document.querySelectorAll('.manage-roles').forEach(button => {
        button.addEventListener('click', () => {
          const memberId = button.dataset.memberId;
          const member = members.find(m => m.id === memberId);
          if (member) {
            this._showManageRolesModal(member);
          }
        });
      });
    }
    
    if (canKickMembers) {
      document.querySelectorAll('.remove-member').forEach(button => {
        button.addEventListener('click', () => {
          const memberId = button.dataset.memberId;
          const member = members.find(m => m.id === memberId);
          
          if (member) {
            // Confirm before removing
            if (confirm(`Are you sure you want to remove ${member.username} from this den?`)) {
              // Remove member from the den
              const updatedMembers = members.filter(m => m.id !== memberId);
              
              // Update members in state
              AppState.set('members', { ...AppState.get('members'), [denId]: updatedMembers });
              
              // Reload members settings
              this._loadMembersSettings();
              
              Utils.showToast(`${member.username} removed from the den`, 'success');
            }
          }
        });
      });
    }
  },

  /**
   * Show the manage roles modal for a member
   * @param {Object} member - The member to manage roles for
   * @private
   */
  _showManageRolesModal: function(member) {
    const denId = AppState.get('activeDen');
    if (!denId) return;
    
    // Check if user has permission to manage roles
    const currentUser = AppState.get('currentUser');
    const members = AppState.getMembersForDen(denId) || [];
    const currentMember = members.find(m => m.id === currentUser.id);
    
    // Owner can always manage roles
    let canManageRoles = currentMember?.isOwner || false;
    
    if (!canManageRoles) {
      // Get roles and permissions for this member
      const memberRolesIds = currentMember?.roles || [];
      const roles = AppState.getRolesForDen(denId) || [];
      const memberRoles = roles.filter(role => memberRolesIds.includes(role.id));
      
      // Check for manage roles permission
      canManageRoles = memberRoles.some(r => 
        r.permissions && r.permissions.includes('manageRoles')
      );
      
      if (!canManageRoles) {
        Utils.showToast("You don't have permission to manage roles", "error");
        return;
      }
    }
    
    const roles = AppState.getRolesForDen(denId) || [];
    
    // Create the modal HTML
    const modalHtml = `
      <div class="modal active" id="manage-roles-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-container">
          <div class="modal-header">
            <h3>Manage Roles for ${member.username}</h3>
            <button class="modal-close" id="close-manage-roles-modal">✕</button>
          </div>
          <div class="modal-content">
            <div class="roles-form">
              <p>Select the roles to assign to this member:</p>
              <div class="roles-list">
                ${roles.map(role => `
                  <div class="role-option" style="display: flex; justify-content: space-between; align-items: center; padding: 8px; margin-bottom: 4px; background-color: var(--bg-tertiary); border-radius: 4px;">
                    <span class="role-name" style="${role.color ? `color: ${role.color};` : ''}">${role.name}</span>
                    <div class="toggle-switch">
                      <input type="checkbox" id="role-${role.id}" class="toggle-input" 
                        ${member.roles && member.roles.includes(role.id) ? 'checked' : ''} />
                      <label for="role-${role.id}" class="toggle-slider"></label>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="modal-button secondary" id="cancel-manage-roles">Cancel</button>
            <button class="modal-button primary" id="save-member-roles">Save Roles</button>
          </div>
        </div>
      </div>
    `;
    
    // Add to DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstChild);
    
    // Set up event listeners
    document.getElementById('close-manage-roles-modal').addEventListener('click', () => {
      document.getElementById('manage-roles-modal').remove();
    });
    
    document.getElementById('cancel-manage-roles').addEventListener('click', () => {
      document.getElementById('manage-roles-modal').remove();
    });
    
    document.getElementById('save-member-roles').addEventListener('click', () => {
      // Gather selected roles
      const selectedRoles = [];
      roles.forEach(role => {
        const checkbox = document.getElementById(`role-${role.id}`);
        if (checkbox && checkbox.checked) {
          selectedRoles.push(role.id);
        }
      });
      
      // Get members for this den
      const members = AppState.getMembersForDen(denId) || [];
      
      // Update member's roles
      const updatedMembers = members.map(m => {
        if (m.id === member.id) {
          return {
            ...m,
            roles: selectedRoles
          };
        }
        return m;
      });
      
      // Update members in state
      AppState.set('members', { ...AppState.get('members'), [denId]: updatedMembers });
      
      // Close modal
      document.getElementById('manage-roles-modal').remove();
      
      // Reload members settings
      this._loadMembersSettings();
      
      Utils.showToast(`Roles updated for ${member.username}`, 'success');
    });
  }
};

// Export for use in other modules
window.DenSettingsManager = DenSettingsManager;

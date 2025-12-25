// ============================================
// SUPABASE CONFIGURATION
// ============================================
// Supabase project credentials
// Get these from: https://app.supabase.com -> Your Project -> Settings -> API
const SUPABASE_URL = 'https://mgwbvuwqhqjpoabuafbx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nd2J2dXdxaHFqcG9hYnVhZmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2Mjg0MjgsImV4cCI6MjA4MjIwNDQyOH0.XSyFzYvnmiHyN4Vl7nflw4LSr-rTjABXbVl-WNsh5K4';

// Initialize Supabase client
// This creates a client that we'll use to interact with our database
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// GLOBAL STATE
// ============================================
let editingMemberId = null; // Track which member we're editing (null = adding new)

// ============================================
// DOM ELEMENTS (will be initialized in DOMContentLoaded)
// ============================================
let memberForm;
let membersTableBody;
let messageDiv;
let loadingDiv;
let formTitle;
let submitBtn;
let cancelBtn;

// Form input fields
let formFields;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Show success or error message to user
 * @param {string} text - Message text
 * @param {string} type - 'success' or 'error'
 */
function showMessage(text, type = 'success') {
    if (!messageDiv) {
        console.error('Message div not initialized:', text);
        alert(text); // Fallback to alert if DOM not ready
        return;
    }
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (messageDiv) {
            messageDiv.style.display = 'none';
        }
    }, 5000);
}

/**
 * Format date for display (YYYY-MM-DD -> DD/MM/YYYY)
 * @param {string} dateString - Date string from database
 * @returns {string} Formatted date or '-' if empty
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

/**
 * Reset form to empty state
 */
function resetForm() {
    if (memberForm) memberForm.reset();
    editingMemberId = null;
    if (formTitle) formTitle.textContent = 'Add New Member';
    if (submitBtn) submitBtn.textContent = 'Add Member';
    if (cancelBtn) cancelBtn.style.display = 'none';
}

/**
 * Populate form with member data for editing
 * @param {Object} member - Member object from database
 */
function populateForm(member) {
    if (!formFields) {
        console.error('Form fields not initialized!');
        return;
    }

    if (formFields.full_name) formFields.full_name.value = member.full_name || '';
    if (formFields.age) formFields.age.value = member.age || '';
    if (formFields.gender) formFields.gender.value = member.gender || '';
    if (formFields.phone_number) formFields.phone_number.value = member.phone_number || '';
    if (formFields.email) formFields.email.value = member.email || '';
    if (formFields.membership_type) formFields.membership_type.value = member.membership_type || '';
    if (formFields.membership_start_date) formFields.membership_start_date.value = member.membership_start_date || '';
    if (formFields.membership_end_date) formFields.membership_end_date.value = member.membership_end_date || '';
    if (formFields.training_level) formFields.training_level.value = member.training_level || '';
    if (formFields.status) formFields.status.value = member.status || 'Active';

    // Update UI for edit mode
    editingMemberId = member.id;
    if (formTitle) formTitle.textContent = 'Edit Member';
    if (submitBtn) submitBtn.textContent = 'Update Member';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';

    // Scroll to form
    const formSection = document.querySelector('.form-section');
    if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ============================================
// CRUD OPERATIONS - CREATE
// ============================================

/**
 * CREATE: Add a new member to the database
 * @param {Object} memberData - Member data object
 */
async function createMember(memberData) {
    try {
        console.log('Attempting to create member with data:', memberData);
        
        // Use Supabase .insert() method to add a new row
        // .insert() accepts an array of objects (even though we're only adding one)
        const { data, error } = await supabaseClient
            .from('member')  // Table name in Supabase
            .insert([memberData])  // Insert data as array
            .select();  // Return the inserted data

        if (error) {
            console.error('Supabase insert error:', error);
            throw error;
        }

        console.log('Member created successfully:', data);
        showMessage('Member added successfully!', 'success');
        resetForm();
        await fetchMembers(); // Refresh the table
        return data[0];

    } catch (error) {
        console.error('Error creating member:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        showMessage(`Error adding member: ${errorMessage}`, 'error');
        throw error;
    }
}

// ============================================
// CRUD OPERATIONS - READ
// ============================================

/**
 * READ: Fetch all members from the database
 */
async function fetchMembers() {
    try {
        if (loadingDiv) loadingDiv.style.display = 'block';

        console.log('Fetching members from Supabase...');
        
        // Use Supabase .select() to get all rows
        // .order() sorts by created_at in descending order (newest first)
        const { data, error } = await supabaseClient
            .from('member')  // Table name
            .select('*')  // Select all columns
            .order('created_at', { ascending: false });  // Order by creation date

        if (error) {
            console.error('Supabase fetch error:', error);
            throw error;
        }

        console.log('Fetched members:', data?.length || 0, 'members');
        displayMembers(data || []);
        if (loadingDiv) loadingDiv.style.display = 'none';

    } catch (error) {
        console.error('Error fetching members:', error);
        showMessage(`Error loading members: ${error.message}`, 'error');
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (membersTableBody) {
            membersTableBody.innerHTML = `
                <tr>
                    <td colspan="11" class="empty-state">
                        <p>Error loading members. Please check your Supabase connection.</p>
                        <p style="font-size: 12px; margin-top: 10px;">Error: ${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Display members in the table
 * @param {Array} members - Array of member objects
 */
function displayMembers(members) {
    if (!membersTableBody) {
        console.error('Members table body not initialized!');
        return;
    }

    console.log('Displaying', members.length, 'members');

    if (members.length === 0) {
        membersTableBody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-state">
                    <p>No members found. Add your first member to get started!</p>
                </td>
            </tr>
        `;
        return;
    }

    // Create table rows for each member
    membersTableBody.innerHTML = members.map(member => `
        <tr>
            <td>${escapeHtml(member.full_name)}</td>
            <td>${member.age || '-'}</td>
            <td>${escapeHtml(member.gender || '-')}</td>
            <td>${escapeHtml(member.phone_number || '-')}</td>
            <td>${escapeHtml(member.email)}</td>
            <td>${escapeHtml(member.membership_type || '-')}</td>
            <td>${escapeHtml(member.training_level || '-')}</td>
            <td>
                <span class="status-badge ${(member.status || 'Active').toLowerCase()}">
                    ${escapeHtml(member.status || 'Active')}
                </span>
            </td>
            <td>${formatDate(member.membership_start_date)}</td>
            <td>${formatDate(member.membership_end_date)}</td>
            <td class="action-buttons">
                <button class="btn btn-edit" onclick="handleEdit('${member.id}')">
                    Edit
                </button>
                <button class="btn btn-delete" onclick="handleDelete('${member.id}', '${escapeHtml(member.full_name)}')">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// CRUD OPERATIONS - UPDATE
// ============================================

/**
 * UPDATE: Update an existing member in the database
 * @param {string} id - Member ID (UUID)
 * @param {Object} memberData - Updated member data
 */
async function updateMember(id, memberData) {
    try {
        // Use Supabase .update() to modify existing row
        // .eq() filters by ID (id = memberId)
        // .select() returns the updated data
        const { data, error } = await supabaseClient
            .from('member')  // Table name
            .update(memberData)  // Update with new data
            .eq('id', id)  // Where id equals the member's id
            .select();  // Return updated row

        if (error) {
            throw error;
        }

        showMessage('Member updated successfully!', 'success');
        resetForm();
        await fetchMembers(); // Refresh the table
        return data[0];

    } catch (error) {
        console.error('Error updating member:', error);
        showMessage(`Error updating member: ${error.message}`, 'error');
        throw error;
    }
}

// ============================================
// CRUD OPERATIONS - DELETE
// ============================================

/**
 * DELETE: Remove a member from the database
 * @param {string} id - Member ID (UUID)
 * @param {string} name - Member name (for confirmation message)
 */
async function deleteMember(id, name) {
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
        return;
    }

    try {
        // Use Supabase .delete() to remove a row
        // .eq() filters by ID
        const { error } = await supabaseClient
            .from('member')  // Table name
            .delete()  // Delete operation
            .eq('id', id);  // Where id equals the member's id

        if (error) {
            throw error;
        }

        showMessage(`${name} has been deleted successfully.`, 'success');
        await fetchMembers(); // Refresh the table

    } catch (error) {
        console.error('Error deleting member:', error);
        showMessage(`Error deleting member: ${error.message}`, 'error');
    }
}

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handle form submission (both Add and Update)
 */
function setupFormHandler() {
    if (!memberForm) {
        console.error('Form element not found!');
        return;
    }

    memberForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent page refresh

        console.log('Form submitted, gathering data...');

        // Helper function to safely get and trim value
        const getValue = (field) => {
            if (!field || !field.value) return null;
            const trimmed = field.value.trim();
            return trimmed === '' ? null : trimmed;
        };

        // Gather form data
        const memberData = {
            full_name: getValue(formFields.full_name),
            age: formFields.age.value ? parseInt(formFields.age.value) : null,
            gender: getValue(formFields.gender),
            phone_number: getValue(formFields.phone_number),
            email: getValue(formFields.email),
            membership_type: getValue(formFields.membership_type),
            membership_start_date: getValue(formFields.membership_start_date),
            membership_end_date: getValue(formFields.membership_end_date),
            training_level: getValue(formFields.training_level),
            status: formFields.status.value || 'Active'
        };

        console.log('Member data to insert:', memberData);

        // Validate required fields
        if (!memberData.full_name || !memberData.email) {
            showMessage('Please fill in required fields (Full Name and Email)', 'error');
            return;
        }

        try {
            if (editingMemberId) {
                // UPDATE: If we're editing, update the existing member
                console.log('Updating member:', editingMemberId);
                await updateMember(editingMemberId, memberData);
            } else {
                // CREATE: If we're not editing, create a new member
                console.log('Creating new member...');
                await createMember(memberData);
            }
        } catch (error) {
            // Error is already handled in createMember/updateMember
            console.error('Form submission error:', error);
        }
    });
}

/**
 * Handle cancel button click (exit edit mode)
 */
function setupCancelHandler() {
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            resetForm();
            showMessage('Edit cancelled.', 'success');
        });
    }
}

/**
 * Handle edit button click
 * @param {string} id - Member ID to edit
 */
async function handleEdit(id) {
    try {
        // First, fetch the member data
        const { data, error } = await supabaseClient
            .from('member')
            .select('*')
            .eq('id', id)
            .single();  // .single() returns one row instead of an array

        if (error) {
            throw error;
        }

        if (data) {
            populateForm(data);
        }

    } catch (error) {
        console.error('Error fetching member for edit:', error);
        showMessage(`Error loading member: ${error.message}`, 'error');
    }
}

/**
 * Handle delete button click
 * @param {string} id - Member ID to delete
 * @param {string} name - Member name for confirmation
 */
function handleDelete(id, name) {
    deleteMember(id, name);
}

// ============================================
// INITIALIZATION
// ============================================

// Load members when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    
    // Initialize DOM elements
    memberForm = document.getElementById('member-form');
    membersTableBody = document.getElementById('members-tbody');
    messageDiv = document.getElementById('message');
    loadingDiv = document.getElementById('loading');
    formTitle = document.getElementById('form-title');
    submitBtn = document.getElementById('submit-btn');
    cancelBtn = document.getElementById('cancel-btn');

    // Initialize form fields
    formFields = {
        full_name: document.getElementById('full_name'),
        age: document.getElementById('age'),
        gender: document.getElementById('gender'),
        phone_number: document.getElementById('phone_number'),
        email: document.getElementById('email'),
        membership_type: document.getElementById('membership_type'),
        membership_start_date: document.getElementById('membership_start_date'),
        membership_end_date: document.getElementById('membership_end_date'),
        training_level: document.getElementById('training_level'),
        status: document.getElementById('status')
    };

    // Verify all critical elements exist
    if (!memberForm || !membersTableBody || !messageDiv) {
        console.error('Critical DOM elements not found!', {
            memberForm: !!memberForm,
            membersTableBody: !!membersTableBody,
            messageDiv: !!messageDiv
        });
        return;
    }

    console.log('DOM elements initialized successfully');

    // Setup event handlers
    setupFormHandler();
    setupCancelHandler();

    // Check if Supabase credentials are configured
    if (SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        showMessage('⚠️ Please configure your Supabase credentials in app.js before using the app.', 'error');
    } else {
        console.log('Supabase credentials configured, fetching members...');
        fetchMembers();
    }
});

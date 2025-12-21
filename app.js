// Main application logic for member management

let allMembers = [];
let filteredMembers = [];

// Load members when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadMembers();
    setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) {
        searchInput.addEventListener('input', filterMembers);
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', filterMembers);
    }
}

// Load all members from database
async function loadMembers() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const tableBody = document.getElementById('membersTableBody');
    const statsDiv = document.getElementById('stats');

    try {
        loadingDiv.style.display = 'block';
        errorDiv.style.display = 'none';

        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allMembers = data || [];
        filteredMembers = [...allMembers];

        loadingDiv.style.display = 'none';

        if (allMembers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px;">
                        <p style="color: #666; font-size: 16px;">No members found. Add your first member to get started!</p>
                    </td>
                </tr>
            `;
        } else {
            displayMembers(filteredMembers);
            updateStats();
            statsDiv.style.display = 'grid';
        }

    } catch (error) {
        console.error('Error loading members:', error);
        loadingDiv.style.display = 'none';
        errorDiv.textContent = `Error loading members: ${error.message}`;
        errorDiv.style.display = 'block';
    }
}

// Display members in table
function displayMembers(members) {
    const tableBody = document.getElementById('membersTableBody');

    if (members.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <p style="color: #666; font-size: 16px;">No members match your search criteria.</p>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = members.map(member => `
        <tr>
            <td>${escapeHtml(member.first_name)} ${escapeHtml(member.last_name)}</td>
            <td>${escapeHtml(member.email)}</td>
            <td>${member.phone ? escapeHtml(member.phone) : '-'}</td>
            <td>${escapeHtml(member.membership_type)}</td>
            <td><span class="status-badge status-${member.membership_status}">${escapeHtml(member.membership_status)}</span></td>
            <td>${formatDate(member.join_date)}</td>
            <td>${member.expiry_date ? formatDate(member.expiry_date) : '-'}</td>
            <td class="action-buttons">
                <button onclick="editMember('${member.id}')" class="btn-icon" title="Edit">✏️</button>
                <button onclick="deleteMember('${member.id}', '${escapeHtml(member.first_name)} ${escapeHtml(member.last_name)}')" class="btn-icon" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// Filter members based on search and status
function filterMembers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    filteredMembers = allMembers.filter(member => {
        const matchesSearch =
            member.first_name.toLowerCase().includes(searchTerm) ||
            member.last_name.toLowerCase().includes(searchTerm) ||
            member.email.toLowerCase().includes(searchTerm) ||
            (member.phone && member.phone.includes(searchTerm));

        const matchesStatus = !statusFilter || member.membership_status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    displayMembers(filteredMembers);
}

// Update statistics
function updateStats() {
    const totalMembers = allMembers.length;
    const activeMembers = allMembers.filter(m => m.membership_status === 'active').length;
    const expiredMembers = allMembers.filter(m => m.membership_status === 'expired').length;

    document.getElementById('totalMembers').textContent = totalMembers;
    document.getElementById('activeMembers').textContent = activeMembers;
    document.getElementById('expiredMembers').textContent = expiredMembers;
}

// Edit member
function editMember(id) {
    window.location.href = `edit-member.html?id=${id}`;
}

// Delete member
async function deleteMember(id, name) {
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
        return;
    }

    try {
        const { error } = await supabase
            .from('members')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Reload members
        await loadMembers();

        // Show success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success';
        successDiv.textContent = `${name} has been deleted successfully.`;
        successDiv.style.display = 'block';
        document.querySelector('.container').insertBefore(successDiv, document.querySelector('.actions'));

        setTimeout(() => {
            successDiv.remove();
        }, 3000);

    } catch (error) {
        console.error('Error deleting member:', error);
        alert(`Error deleting member: ${error.message}`);
    }
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Escape HTML to prevent XSS
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
// Global variables
let allBusinesses = [];
let filteredBusinesses = [];

// DOM Elements
const searchForm = document.getElementById('searchForm');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const errorText = document.getElementById('errorText');
const controls = document.getElementById('controls');
const results = document.getElementById('results');
const businessList = document.getElementById('businessList');
const sortBy = document.getElementById('sortBy');
const filterRating = document.getElementById('filterRating');
const searchFilter = document.getElementById('searchFilter');
const resultsCount = document.getElementById('resultsCount');
const detailModal = document.getElementById('detailModal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.querySelector('.close-modal');

// Event Listeners
searchForm.addEventListener('submit', handleSearch);
sortBy.addEventListener('change', applySortAndFilter);
filterRating.addEventListener('change', applySortAndFilter);
searchFilter.addEventListener('input', applySortAndFilter);
closeModal.addEventListener('click', () => detailModal.classList.add('hidden'));
detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
        detailModal.classList.add('hidden');
    }
});

// Handle search form submission
async function handleSearch(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
        query: document.getElementById('query').value.trim(),
        location: document.getElementById('location').value.trim(),
        limit: parseInt(document.getElementById('limit').value),
        language: document.getElementById('language').value
    };
    
    // Show loading, hide others
    loading.classList.remove('hidden');
    error.classList.add('hidden');
    controls.classList.add('hidden');
    results.classList.add('hidden');
    
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            allBusinesses = data.data;
            filteredBusinesses = [...allBusinesses];
            displayResults();
            
            // Show controls and results
            controls.classList.remove('hidden');
            results.classList.remove('hidden');
        } else {
            showError(data.message || 'Failed to fetch businesses');
        }
        
    } catch (err) {
        showError('Network error. Please check your connection and try again.');
        console.error('Search error:', err);
    } finally {
        loading.classList.add('hidden');
    }
}

// Display search results
function displayResults() {
    businessList.innerHTML = '';
    resultsCount.textContent = filteredBusinesses.length;
    
    if (filteredBusinesses.length === 0) {
        businessList.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: white; border-radius: 12px;">
                <i class="fas fa-search" style="font-size: 3rem; color: #9ca3af; margin-bottom: 1rem;"></i>
                <p style="color: #6b7280; font-size: 1.2rem;">No businesses found matching your criteria</p>
            </div>
        `;
        return;
    }
    
    filteredBusinesses.forEach(business => {
        const card = createBusinessCard(business);
        businessList.appendChild(card);
    });
}

// Create business card element
function createBusinessCard(business) {
    const card = document.createElement('div');
    card.className = 'business-card';
    
    const rating = business.rating || 0;
    const reviewCount = business.review_count || 0;
    const stars = generateStars(rating);
    const type = business.type || 'Business';
    const address = business.full_address || business.address || 'Address not available';
    const phone = business.phone_number || 'Not available';
    const website = business.website || '';
    const isOpen = business.is_open !== undefined ? business.is_open : null;
    
    card.innerHTML = `
        <div class="business-header">
            <h3 class="business-name">${escapeHtml(business.name || 'Unknown Business')}</h3>
            <div class="business-rating">
                <span class="stars">${stars}</span>
                <span class="rating-value">${rating.toFixed(1)}</span>
                <span class="review-count">(${reviewCount} reviews)</span>
            </div>
            <span class="business-type">${escapeHtml(type)}</span>
        </div>
        
        <div class="business-body">
            <div class="business-info">
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${escapeHtml(address)}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-phone"></i>
                    <span>${escapeHtml(phone)}</span>
                </div>
                ${website ? `
                <div class="info-item">
                    <i class="fas fa-globe"></i>
                    <a href="${escapeHtml(website)}" target="_blank" rel="noopener">${escapeHtml(website)}</a>
                </div>
                ` : ''}
            </div>
        </div>
        
        <div class="business-footer">
            <button class="btn-details" onclick="showBusinessDetails('${business.business_id}')">
                <i class="fas fa-info-circle"></i> View Details
            </button>
            ${isOpen !== null ? `
            <span class="status-badge ${isOpen ? 'status-open' : 'status-closed'}">
                ${isOpen ? 'Open Now' : 'Closed'}
            </span>
            ` : ''}
        </div>
    `;
    
    return card;
}

// Generate star rating HTML
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

// Apply sorting and filtering
function applySortAndFilter() {
    let businesses = [...allBusinesses];
    
    // Apply rating filter
    const minRating = parseFloat(filterRating.value);
    if (minRating > 0) {
        businesses = businesses.filter(b => (b.rating || 0) >= minRating);
    }
    
    // Apply search filter
    const searchTerm = searchFilter.value.toLowerCase().trim();
    if (searchTerm) {
        businesses = businesses.filter(b => {
            const name = (b.name || '').toLowerCase();
            const address = (b.full_address || b.address || '').toLowerCase();
            const type = (b.type || '').toLowerCase();
            return name.includes(searchTerm) || address.includes(searchTerm) || type.includes(searchTerm);
        });
    }
    
    // Apply sorting
    const sortOption = sortBy.value;
    businesses.sort((a, b) => {
        switch (sortOption) {
            case 'rating':
                return (b.rating || 0) - (a.rating || 0);
            case 'reviews':
                return (b.review_count || 0) - (a.review_count || 0);
            case 'name':
                return (a.name || '').localeCompare(b.name || '');
            default:
                return 0;
        }
    });
    
    filteredBusinesses = businesses;
    displayResults();
}

// Show business details in modal
async function showBusinessDetails(businessId) {
    detailModal.classList.remove('hidden');
    modalBody.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading details...</p>
        </div>
    `;
    
    try {
        const response = await fetch('/api/business-details', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ business_id: businessId })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            displayBusinessDetails(data.data);
        } else {
            modalBody.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load business details</p>
                </div>
            `;
        }
    } catch (err) {
        modalBody.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Network error. Please try again.</p>
            </div>
        `;
        console.error('Details error:', err);
    }
}

// Display detailed business information
function displayBusinessDetails(business) {
    const rating = business.rating || 0;
    const stars = generateStars(rating);
    
    let detailsHTML = `
        <div class="detail-section">
            <h2>${escapeHtml(business.name || 'Business Details')}</h2>
            <div class="business-rating">
                <span class="stars">${stars}</span>
                <span class="rating-value">${rating.toFixed(1)}</span>
                <span class="review-count">(${business.review_count || 0} reviews)</span>
            </div>
        </div>
    `;
    
    // Contact Information
    detailsHTML += `
        <div class="detail-section">
            <h3><i class="fas fa-address-book"></i> Contact Information</h3>
            <div class="detail-grid">
                ${business.phone_number ? `
                <div class="detail-item">
                    <i class="fas fa-phone"></i>
                    <div>
                        <strong>Phone</strong>
                        <p>${escapeHtml(business.phone_number)}</p>
                    </div>
                </div>
                ` : ''}
                ${business.website ? `
                <div class="detail-item">
                    <i class="fas fa-globe"></i>
                    <div>
                        <strong>Website</strong>
                        <p><a href="${escapeHtml(business.website)}" target="_blank">${escapeHtml(business.website)}</a></p>
                    </div>
                </div>
                ` : ''}
                ${business.email ? `
                <div class="detail-item">
                    <i class="fas fa-envelope"></i>
                    <div>
                        <strong>Email</strong>
                        <p>${escapeHtml(business.email)}</p>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // Location
    detailsHTML += `
        <div class="detail-section">
            <h3><i class="fas fa-map-marker-alt"></i> Location</h3>
            <div class="detail-item">
                <i class="fas fa-location-arrow"></i>
                <div>
                    <p>${escapeHtml(business.full_address || business.address || 'Address not available')}</p>
                </div>
            </div>
        </div>
    `;
    
    // Opening Hours
    if (business.working_hours) {
        detailsHTML += `
            <div class="detail-section">
                <h3><i class="fas fa-clock"></i> Opening Hours</h3>
                <div class="detail-grid">
        `;
        
        for (const [day, hours] of Object.entries(business.working_hours)) {
            detailsHTML += `
                <div class="detail-item">
                    <i class="fas fa-calendar-day"></i>
                    <div>
                        <strong>${day}</strong>
                        <p>${hours || 'Closed'}</p>
                    </div>
                </div>
            `;
        }
        
        detailsHTML += `
                </div>
            </div>
        `;
    }
    
    // Additional Info
    if (business.description || business.type) {
        detailsHTML += `
            <div class="detail-section">
                <h3><i class="fas fa-info-circle"></i> About</h3>
                ${business.type ? `<p><strong>Type:</strong> ${escapeHtml(business.type)}</p>` : ''}
                ${business.description ? `<p>${escapeHtml(business.description)}</p>` : ''}
            </div>
        `;
    }
    
    modalBody.innerHTML = detailsHTML;
}

// Show error message
function showError(message) {
    errorText.textContent = message;
    error.classList.remove('hidden');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make showBusinessDetails global
window.showBusinessDetails = showBusinessDetails;
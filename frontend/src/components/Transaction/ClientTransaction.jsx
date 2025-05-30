import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import './ClientTransaction.css';
const baseUrl = import.meta.env.VITE_API_URL;
// Enhanced Spinner Component
const Spinner = ({ size = 'medium', text = 'Loading...', fullPage = false }) => {
  const spinnerStyles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: fullPage ? '60px 20px' : '40px 20px',
      backgroundColor: fullPage ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
      borderRadius: fullPage ? '16px' : '0',
      ...(fullPage && {
        minHeight: '400px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(5px)',
      })
    },
    spinner: {
      width: size === 'small' ? '24px' : size === 'large' ? '56px' : '40px',
      height: size === 'small' ? '24px' : size === 'large' ? '56px' : '40px',
      border: `${size === 'small' ? '3px' : '4px'} solid #f3f4f6`,
      borderTop: `${size === 'small' ? '3px' : '4px'} solid #3b82f6`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '16px',
    },
    text: {
      color: '#6b7280',
      fontSize: size === 'small' ? '14px' : size === 'large' ? '18px' : '16px',
      fontWeight: '600',
      textAlign: 'center',
    }
  };

  return (
    <div style={spinnerStyles.container}>
      <div style={spinnerStyles.spinner}></div>
      <span style={spinnerStyles.text}>{text}</span>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

// Transaction Card Component for better mobile view
const TransactionCard = ({ transaction }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount / 100);
  };

  const getPaymentTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'initial':
        return { bg: '#dcfce7', text: '#15803d', badge: '#22c55e' };
      case 'remaining':
        return { bg: '#fef3c7', text: '#d97706', badge: '#f59e0b' };
      default:
        return { bg: '#f1f5f9', text: '#475569', badge: '#64748b' };
    }
  };

  const typeColors = getPaymentTypeColor(transaction.payment_type);

  return (
    <div className="transaction-card">
      <div className="transaction-header">
        <div className="transaction-job">
          <span className="job-icon">💼</span>
          <div>
            <h4>{transaction.job_application?.job_title || 'Unknown Job'}</h4>
            <p className="professional-name">
              👤 {transaction.job_application?.professional_name || 'Unknown Professional'}
            </p>
          </div>
        </div>
        <div 
          className="payment-type-badge"
          style={{ backgroundColor: typeColors.badge }}
        >
          {transaction.payment_type === 'initial' ? '🟢' : '🔴'} {transaction.payment_type}
        </div>
      </div>
      
      <div className="transaction-details">
        <div className="detail-row">
          <span className="detail-label">💰 Amount:</span>
          <span className="detail-value amount">
            {formatCurrency(transaction.amount)}
          </span>
        </div>
        
        <div className="detail-row">
          <span className="detail-label">🆔 Order ID:</span>
          <span className="detail-value order-id">
            {transaction.razorpay_order_id}
          </span>
        </div>
        
        {transaction.created_at && (
          <div className="detail-row">
            <span className="detail-label">📅 Date:</span>
            <span className="detail-value">
              {new Date(transaction.created_at).toLocaleDateString('en-IN')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Search and Filter Component
const SearchAndFilter = ({ searchQuery, onSearchChange, filterType, onFilterChange, totalTransactions, filteredCount }) => {
  return (
    <div className="search-filter-container">
      <div className="search-section">
        <div className="search-input-wrapper">
          
          <input
            type="text"
            placeholder="Search by job title, professional name, or order ID..."
            value={searchQuery}
            onChange={onSearchChange}
            className="search-input"
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => onSearchChange({ target: { value: '' } })}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      <div className="filter-section"   >
        <select 
          value={filterType} 
          onChange={onFilterChange}
          className="filter-select"
          
        >
          <option style={{ color: 'black' }} value="all">All Types</option>
          <option style={{ color: 'black' }} value="initial">Initial Payments</option>
          <option style={{ color: 'black' }} value="remaining">Final Payments</option>
        </select>
      </div>

      <div className="stats-section">
        <div className="stat-item">
          <span className="stat-icon">📊</span>
          <div className="stat-content">
            <span className="stat-value">{totalTransactions}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>
        
        {(searchQuery || filterType !== 'all') && (
          <div className="stat-item filtered">
            <span className="stat-icon">🎯</span>
            <div className="stat-content">
              <span className="stat-value">{filteredCount}</span>
              <span className="stat-label">Found</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Pagination Component
const PaginationControls = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
  const pageCount = Math.ceil(totalItems / itemsPerPage);
  
  if (pageCount <= 1) return null;

  const getVisiblePages = () => {
    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(pageCount, currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="pagination-enhanced">
      <div className="pagination-info">
        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} transactions
      </div>
      
      <div className="pagination-controls">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="page-btn"
          title="Previous page"
        >
          ← Previous
        </button>
        
        {getVisiblePages().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`page-btn ${currentPage === page ? 'active' : ''}`}
          >
            {page}
          </button>
        ))}
        
        <button
          disabled={currentPage === pageCount}
          onClick={() => onPageChange(currentPage + 1)}
          className="page-btn"
          title="Next page"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

// Statistics Summary Component
const TransactionStats = ({ transactions }) => {
  const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const initialPayments = transactions.filter(t => t.payment_type === 'initial').length;
  const finalPayments = transactions.filter(t => t.payment_type === 'remaining').length;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount / 100);
  };

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">💰</div>
        <div className="stat-info">
          <div className="stat-value">{formatCurrency(totalAmount)}</div>
          <div className="stat-label">Total Spent</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">📊</div>
        <div className="stat-info">
          <div className="stat-value">{transactions.length}</div>
          <div className="stat-label">Total Transactions</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">🟢</div>
        <div className="stat-info">
          <div className="stat-value">{initialPayments}</div>
          <div className="stat-label">Initial Payments</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">🔴</div>
        <div className="stat-info">
          <div className="stat-value">{finalPayments}</div>
          <div className="stat-label">Final Payments</div>
        </div>
      </div>
    </div>
  );
};

function ClientTransactions() {
  const { user } = useContext(AuthContext) || { user: null };
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const itemsPerPage = 7;

  useEffect(() => {
    if (!user || user.role !== 'client') {
      navigate('/login');
      return;
    }

    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${baseUrl}/api/client/transactions/`, {
          withCredentials: true,
        });
        const transactionsData = response.data.transactions || [];
        setTransactions(transactionsData);
        setFilteredTransactions(transactionsData);
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user, navigate]);

  // Filter and search logic
  useEffect(() => {
    let filtered = transactions;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((transaction) => {
        const jobTitle = transaction.job_application?.job_title?.toLowerCase() || '';
        const professionalName = transaction.job_application?.professional_name?.toLowerCase() || '';
        const orderId = transaction.razorpay_order_id?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        
        return jobTitle.includes(query) || 
               professionalName.includes(query) || 
               orderId.includes(query);
      });
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(transaction => transaction.payment_type === filterType);
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  }, [searchQuery, filterType, transactions]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterChange = (e) => {
    setFilterType(e.target.value);
  };

  const paginate = (items, page) => {
    const startIndex = (page - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="transactions-container">
        <Spinner size="large" text="Loading your transaction history..." fullPage={true} />
      </div>
    );
  }

  return (
    <div className="transactions-container">
      {/* Header */}
      <div className="transactions-header">
        <h2>
          <span className="header-icon">💳</span>
          Transaction History
        </h2>
        <p className="header-subtitle">
          View and manage all your payment transactions
        </p>
      </div>

      {transactions.length > 0 && (
        <>
          {/* Statistics */}
          <TransactionStats transactions={transactions} />

          {/* Search and Filter */}
          <SearchAndFilter
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            filterType={filterType}
            onFilterChange={handleFilterChange}
            totalTransactions={transactions.length}
            filteredCount={filteredTransactions.length}
            
          />

          {/* View Mode Toggle */}
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              📋 Table View
            </button>
            <button
              className={`toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              🃏 Card View
            </button>
          </div>
        </>
      )}

      {/* Content */}
      {filteredTransactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            {searchQuery || filterType !== 'all' ? '🔍' : '📄'}
          </div>
          <h3>
            {searchQuery || filterType !== 'all' ? 'No transactions found' : 'No transactions yet'}
          </h3>
          <p>
            {searchQuery || filterType !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Your transaction history will appear here once you make payments'
            }
          </p>
          {(searchQuery || filterType !== 'all') && (
            <button 
              className="clear-filters-btn"
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
            /* Table View */
            <div className="table-container">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Professional</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Order ID</th>
                  </tr>
                </thead>
                <tbody>
                  {paginate(filteredTransactions, currentPage).map((transaction) => (
                    <tr key={transaction.razorpay_order_id}>
                      <td>
                        <div className="job-cell">
                          <span className="job-icon">💼</span>
                          {transaction.job_application?.job_title || 'Unknown Job'}
                        </div>
                      </td>
                      <td>
                        <div className="professional-cell">
                          <span className="professional-icon">👤</span>
                          {transaction.job_application?.professional_name || 'Unknown Professional'}
                        </div>
                      </td>
                      <td>
                        <span className="amount-cell">
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td>
                        <span className={`type-badge ${transaction.payment_type}`}>
                          {transaction.payment_type === 'initial' ? '🟢' : '🔴'} {transaction.payment_type}
                        </span>
                      </td>
                      <td>
                        <span className="order-id-cell">
                          {transaction.razorpay_order_id}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Card View */
            <div className="cards-container">
              {paginate(filteredTransactions, currentPage).map((transaction) => (
                <TransactionCard key={transaction.razorpay_order_id} transaction={transaction} />
              ))}
            </div>
          )}

          {/* Pagination */}
          <PaginationControls
            currentPage={currentPage}
            totalItems={filteredTransactions.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* Back Button */}
      <div className="back-button-container">
        <button 
          onClick={() => navigate('/client-dashboard')}
          className="back-button"
        >
          <span className="back-icon">←</span>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default ClientTransactions;
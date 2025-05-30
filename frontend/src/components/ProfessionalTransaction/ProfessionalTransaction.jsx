import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import './ProfessionalTransaction.css';
const baseUrl = import.meta.env.VITE_API_URL;
function ProfessionalTransactions() {
  const { user } = useContext(AuthContext) || { user: null };
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  const itemsPerPage = 7; // Number of transactions per page

  useEffect(() => {
    if (!user || user.role !== 'professional') {
      navigate('/login');
      return;
    }

    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${baseUrl}/api/professional/transactions/`, {
          withCredentials: true,
        });
        const fetchedTransactions = response.data.transactions || [];
        setTransactions(fetchedTransactions);
        setFilteredTransactions(fetchedTransactions);
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user, navigate]);

  // Handle search functionality
  useEffect(() => {
    handleSearch();
  }, [searchTerm, searchCategory, transactions]);

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredTransactions(transactions);
      setCurrentPage(1);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = transactions.filter(transaction => {
      const jobTitle = (transaction.job_application?.job_title || 'Unknown Job').toLowerCase();
      const clientName = (transaction.job_application?.client_name || 'Unknown Client').toLowerCase();
      const paymentType = (transaction.payment_type || 'N/A').toLowerCase();
      const amount = formatCurrency(transaction.amount / 100).toLowerCase();

      if (searchCategory === 'all') {
        return jobTitle.includes(term) || 
               clientName.includes(term) || 
               paymentType.includes(term) ||
               amount.includes(term);
      } else if (searchCategory === 'job') {
        return jobTitle.includes(term);
      } else if (searchCategory === 'client') {
        return clientName.includes(term);
      } else if (searchCategory === 'payment') {
        return paymentType.includes(term);
      } else if (searchCategory === 'amount') {
        return amount.includes(term);
      }
      return false;
    });

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  };

  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchCategoryChange = (e) => {
    setSearchCategory(e.target.value);
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Get payment type styling
  const getPaymentTypeClass = (paymentType) => {
    if (!paymentType) return '';
    const type = paymentType.toLowerCase();
    if (type.includes('advance')) return 'payment-type-advance';
    if (type.includes('final') || type.includes('remaining')) return 'payment-type-final';
    return '';
  };

  // Enhanced Loading Spinner Component
  const LoadingSpinner = () => (
    <div className="spinner-container">
      <div className="loading-spinner"></div>
      <p>Loading your transaction history...</p>
    </div>
  );

  // Paginate transactions
  const paginate = (items, page) => {
    const startIndex = (page - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  // Get total number of pages
  const getPageCount = (items) => Math.ceil(items.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Pagination Controls Component
  const PaginationControls = ({ totalItems }) => {
    const pageCount = getPageCount(totalItems);
    const pages = [];

    for (let i = 1; i <= pageCount; i++) {
      pages.push(i);
    }

    if (pageCount <= 1) return null;

    return (
      <div className="pagination">
        <button
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
          className="page-btn"
        >
          Previous
        </button>
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`page-btn ${currentPage === page ? 'active' : ''}`}
          >
            {page}
          </button>
        ))}
        <button
          disabled={currentPage === pageCount || pageCount === 0}
          onClick={() => handlePageChange(currentPage + 1)}
          className="page-btn"
        >
          Next
        </button>
      </div>
    );
  };

  // Transaction Card Component for Mobile
  const TransactionCard = ({ transaction }) => (
    <div className="transaction-card">
      <h4>{transaction.job_application?.job_title || 'Unknown Job'}</h4>
      <div className="card-details">
        <div className="detail-item">
          <span className="detail-label">Client</span>
          <span className="detail-value">{transaction.job_application?.client_name || 'Unknown Client'}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Amount</span>
          <span className="detail-value amount">{formatCurrency(transaction.amount / 100)}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Payment Type</span>
          <span className={`detail-value ${getPaymentTypeClass(transaction.payment_type)}`}>
            {transaction.payment_type || 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="transactions-container">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="transactions-container">
      <h2>Transaction History</h2>
      
      {/* Search functionality */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={handleSearchInputChange}
          className="search-input"
        />
        
        <select 
          value={searchCategory} 
          onChange={handleSearchCategoryChange}
          className="search-category"
        >
          <option value="all">All Fields</option>
          <option value="job">Job Title</option>
          <option value="client">Client Name</option>
          <option value="amount">Amount</option>
          <option value="payment">Payment Type</option>
        </select>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="no-results">
          {searchTerm ? 'No transactions found matching your search criteria.' : 'No transactions found.'}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <table className="transactions-table">
            <thead>
              <tr>
                <th style={{color:'black'}}>Job Title</th>
                <th style={{color:'black'}}>Client</th>
                <th style={{color:'black'}}>Amount</th>
                <th style={{color:'black'}}>Type</th>
              </tr>
            </thead>
            <tbody>
              {paginate(filteredTransactions, currentPage).map((transaction) => (
                <tr key={transaction.razorpay_order_id}>
                  <td>{transaction.job_application?.job_title || 'Unknown Job'}</td>
                  <td>{transaction.job_application?.client_name || 'Unknown Client'}</td>
                  <td>{formatCurrency(transaction.amount / 100)}</td>
                  <td>
                    <span className={getPaymentTypeClass(transaction.payment_type)}>
                      {transaction.payment_type || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="transaction-cards">
            {paginate(filteredTransactions, currentPage).map((transaction) => (
              <TransactionCard 
                key={transaction.razorpay_order_id} 
                transaction={transaction} 
              />
            ))}
          </div>

          <div className="results-info">
            Showing {Math.min(filteredTransactions.length, itemsPerPage)} of {filteredTransactions.length} transactions
            {searchTerm && ` (filtered from ${transactions.length} total)`}
          </div>
          
          <PaginationControls totalItems={filteredTransactions} />
        </>
      )}
    </div>
  );
}

export default ProfessionalTransactions;
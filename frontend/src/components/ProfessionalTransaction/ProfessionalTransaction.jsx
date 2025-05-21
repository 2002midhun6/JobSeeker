import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import './ProfessionalTransaction.css';

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
        const response = await axios.get('http://localhost:8000/api/professional/transactions/', {
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
      const amount = ((transaction.amount / 100).toFixed(2) || '0.00').toString();

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

  if (loading) {
    return <div className="spinner-container"><p>Loading transactions...</p></div>;
  }

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
        <p className="no-results">No transactions found matching your search criteria.</p>
      ) : (
        <>
          <table className="transactions-table">
            <thead>
              <tr>
                <th style={{color:'black'}}>Job Title</th>
                <th style={{color:'black'}}>Client</th>
                <th style={{color:'black'}}>Amount (INR)</th>
                <th style={{color:'black'}}>Type</th>
              </tr>
            </thead>
            <tbody>
              {paginate(filteredTransactions, currentPage).map((transaction) => (
                <tr key={transaction.razorpay_order_id}>
                  <td>{transaction.job_application?.job_title || 'Unknown Job'}</td>
                  <td>{transaction.job_application?.client_name || 'Unknown Client'}</td>
                  <td>{(transaction.amount / 100).toFixed(2) || '0.00'}</td>
                  <td>{transaction.payment_type || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="results-info">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </div>
          <PaginationControls totalItems={filteredTransactions} />
        </>
      )}
    </div>
  );
}

export default ProfessionalTransactions;
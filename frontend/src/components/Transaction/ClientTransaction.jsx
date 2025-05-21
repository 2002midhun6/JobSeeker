import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import './ClientTransaction.css';

function ClientTransactions() {
  const { user } = useContext(AuthContext) || { user: null };
  const navigate = useNavigate();
  const [transactions, setTransactions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7; // Number of transactions per page

  useEffect(() => {
    if (!user || user.role !== 'client') {
      navigate('/login');
      return;
    }

    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:8000/api/client/transactions/', {
          withCredentials: true,
        });
        setTransactions(response.data.transactions || []);
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user, navigate]);

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
          disabled={currentPage === pageCount}
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
      {transactions.length === 0 ? (
        <p>No transactions found.</p>
      ) : (
        <>
          <table className="transactions-table">
            <thead>
              <tr style={{color:'black'}}>
                <th style={{color:'black'}}>Job Title</th>
                <th style={{color:'black'}}>Professional</th>
                <th style={{color:'black'}}>Amount (INR)</th>
                <th style={{color:'black'}}>Type</th>
              </tr>
            </thead>
            <tbody>
              {paginate(transactions, currentPage).map((transaction) => (
                <tr key={transaction.razorpay_order_id}>
                  <td>{transaction.job_application?.job_title || 'Unknown Job'}</td>
                  <td>{transaction.job_application?.professional_name || 'Unknown Professional'}</td>
                  <td>{(transaction.amount / 100).toFixed(2) || '0.00'}</td>
                  <td>{transaction.payment_type || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls totalItems={transactions} />
        </>
      )}
    </div>
  );
}

export default ClientTransactions;
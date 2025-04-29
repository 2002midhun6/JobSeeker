import React from 'react'

import ClientPendingPayment from '../components/ClientPending/ClientPaymentPending'
import ClinetHeaderComp from '../components/ClientDashboard/ClientDashboardHeader'
function ClientPendingPayments() {
  return (
    <div>
      <ClinetHeaderComp/>
        <ClientPendingPayment/>
      
        
    </div>
  )
}

export default ClientPendingPayments
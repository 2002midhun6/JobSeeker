import React from 'react'
import ClientTransactions from '../components/Transaction/ClientTransaction'

import ClinetHeaderComp from '../components/ClientDashboard/ClientDashboardHeader'
function  ClientHistory() {
  return (
    <div>
        <ClinetHeaderComp />
        < ClientTransactions />
      
        
    </div>
  )
}

export default ClientHistory
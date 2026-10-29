import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// StrictMode is intentionally omitted: its double-mount in development would
// run the join/leave presence effects twice and churn the room participants.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.Fragment>
    <App />
  </React.Fragment>,
);

import { createRoot } from 'react-dom/client'
import ErrorBoundary from "./components/ErrorBoundary"
import './index.css'
import App from './App.jsx'
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Toaster position="top-right" />
    <App />
  </ErrorBoundary>
)

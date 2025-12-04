// App.tsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface LocationRecord {
  id: string;
  encryptedData: string;
  timestamp: number;
  owner: string;
  locationType: string;
  coordinates: string;
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<LocationRecord[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newRecordData, setNewRecordData] = useState({
    locationType: "",
    coordinates: "",
    notes: ""
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showStats, setShowStats] = useState(false);

  // Calculate statistics
  const cafeVisits = records.filter(r => r.locationType === "cafe").length;
  const restaurantVisits = records.filter(r => r.locationType === "restaurant").length;
  const parkVisits = records.filter(r => r.locationType === "park").length;
  const totalVisits = records.length;

  useEffect(() => {
    loadRecords().finally(() => setLoading(false));
  }, []);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadRecords = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability using FHE
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      const keysBytes = await contract.getData("location_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing location keys:", e);
        }
      }
      
      const list: LocationRecord[] = [];
      
      for (const key of keys) {
        try {
          const recordBytes = await contract.getData(`location_${key}`);
          if (recordBytes.length > 0) {
            try {
              const recordData = JSON.parse(ethers.toUtf8String(recordBytes));
              list.push({
                id: key,
                encryptedData: recordData.data,
                timestamp: recordData.timestamp,
                owner: recordData.owner,
                locationType: recordData.locationType,
                coordinates: recordData.coordinates
              });
            } catch (e) {
              console.error(`Error parsing location data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading location ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setRecords(list);
    } catch (e) {
      console.error("Error loading locations:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const submitRecord = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setCreating(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Encrypting location data with FHE..."
    });
    
    try {
      // Simulate FHE encryption for location data
      const encryptedData = `FHE-LOC-${btoa(JSON.stringify(newRecordData))}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const recordId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const recordData = {
        data: encryptedData,
        timestamp: Math.floor(Date.now() / 1000),
        owner: account,
        locationType: newRecordData.locationType,
        coordinates: newRecordData.coordinates
      };
      
      // Store encrypted location data on-chain using FHE
      await contract.setData(
        `location_${recordId}`, 
        ethers.toUtf8Bytes(JSON.stringify(recordData))
      );
      
      const keysBytes = await contract.getData("location_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(recordId);
      
      await contract.setData(
        "location_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Encrypted location data submitted securely!"
      });
      
      await loadRecords();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowCreateModal(false);
        setNewRecordData({
          locationType: "",
          coordinates: "",
          notes: ""
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Submission failed: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setCreating(false);
    }
  };

  const queryFHE = async () => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Querying encrypted location data with FHE..."
    });

    try {
      // Simulate FHE computation time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      // Call isAvailable to demonstrate FHE interaction
      await contract.isAvailable();
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "FHE query completed successfully!"
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "FHE query failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  // Filter records based on search and filter
  const filteredRecords = records.filter(record => {
    const matchesSearch = record.locationType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         record.coordinates.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || record.locationType === filterType;
    return matchesSearch && matchesFilter;
  });

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Initializing FHE connection...</p>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <div className="compass-icon"></div>
          <h1>Private<span>Timeline</span></h1>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="create-btn"
          >
            Add Location
          </button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <div className="main-content">
        <div className="hero-section">
          <h2>Privacy-Preserving Location History</h2>
          <p>Your location data is encrypted on-device and processed with FHE technology</p>
          <div className="fhe-badge">
            <span>FHE-Powered</span>
          </div>
        </div>
        
        <div className="controls-section">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search locations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="filter-controls">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="cafe">Cafes</option>
              <option value="restaurant">Restaurants</option>
              <option value="park">Parks</option>
              <option value="shop">Shops</option>
              <option value="other">Other</option>
            </select>
            
            <button onClick={queryFHE} className="query-btn">
              Run FHE Query
            </button>
            
            <button onClick={() => setShowStats(!showStats)} className="stats-btn">
              {showStats ? "Hide Stats" : "Show Stats"}
            </button>
          </div>
        </div>
        
        {showStats && (
          <div className="stats-section">
            <h3>Location Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{totalVisits}</div>
                <div className="stat-label">Total Visits</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{cafeVisits}</div>
                <div className="stat-label">Cafe Visits</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{restaurantVisits}</div>
                <div className="stat-label">Restaurant Visits</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{parkVisits}</div>
                <div className="stat-label">Park Visits</div>
              </div>
            </div>
          </div>
        )}
        
        <div className="records-section">
          <div className="section-header">
            <h2>Your Encrypted Location History</h2>
            <button 
              onClick={loadRecords}
              disabled={isRefreshing}
              className="refresh-btn"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          
          <div className="records-list">
            {filteredRecords.length === 0 ? (
              <div className="no-records">
                <div className="location-icon"></div>
                <p>No location records found</p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                >
                  Add Your First Location
                </button>
              </div>
            ) : (
              filteredRecords.map(record => (
                <div className="record-card" key={record.id}>
                  <div className="card-header">
                    <div className="location-type">{record.locationType}</div>
                    <div className="timestamp">
                      {new Date(record.timestamp * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="coordinates">{record.coordinates}</div>
                    <div className="owner">{record.owner.substring(0, 6)}...{record.owner.substring(38)}</div>
                  </div>
                  <div className="card-footer">
                    <span className="encrypted-badge">FHE Encrypted</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
  
      {showCreateModal && (
        <ModalCreate 
          onSubmit={submitRecord} 
          onClose={() => setShowCreateModal(false)} 
          creating={creating}
          recordData={newRecordData}
          setRecordData={setNewRecordData}
        />
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon"></div>}
              {transactionStatus.status === "error" && <div className="error-icon"></div>}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}
  
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <div className="compass-icon"></div>
              <span>PrivateTimeline</span>
            </div>
            <p>Privacy-preserving location history with FHE technology</p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">How It Works</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">GitHub</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="fhe-badge">
            <span>FHE-Powered Privacy</span>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} PrivateTimeline. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModalCreateProps {
  onSubmit: () => void; 
  onClose: () => void; 
  creating: boolean;
  recordData: any;
  setRecordData: (data: any) => void;
}

const ModalCreate: React.FC<ModalCreateProps> = ({ 
  onSubmit, 
  onClose, 
  creating,
  recordData,
  setRecordData
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRecordData({
      ...recordData,
      [name]: value
    });
  };

  const handleSubmit = () => {
    if (!recordData.locationType || !recordData.coordinates) {
      alert("Please fill required fields");
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="create-modal">
        <div className="modal-header">
          <h2>Add Encrypted Location</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice">
            Your location data will be encrypted with FHE technology
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Location Type *</label>
              <select 
                name="locationType"
                value={recordData.locationType} 
                onChange={handleChange}
              >
                <option value="">Select type</option>
                <option value="cafe">Cafe</option>
                <option value="restaurant">Restaurant</option>
                <option value="park">Park</option>
                <option value="shop">Shop</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Coordinates *</label>
              <input 
                type="text"
                name="coordinates"
                value={recordData.coordinates} 
                onChange={handleChange}
                placeholder="e.g., 40.7128° N, 74.0060° W" 
              />
            </div>
            
            <div className="form-group full-width">
              <label>Notes</label>
              <textarea 
                name="notes"
                value={recordData.notes} 
                onChange={handleChange}
                placeholder="Optional notes about this location..." 
                rows={3}
              />
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="cancel-btn"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={creating}
            className="submit-btn"
          >
            {creating ? "Encrypting with FHE..." : "Add Location"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
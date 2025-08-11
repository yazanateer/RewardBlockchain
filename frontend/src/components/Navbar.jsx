import { useState, useEffect } from 'react';
import Web3 from 'web3';
import { Link } from 'react-router-dom';

import { contractAddress, contractABI } from '../contractConfig';

export default function Navbar() {
  const [account, setAccount] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [web3, setWeb3] = useState(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const web3Instance = new Web3(window.ethereum);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        setWeb3(web3Instance);
        
        // Check if connected account is owner
        await checkOwner(web3Instance, accounts[0]);
      } catch (error) {
        console.error('User rejected request', error);
      }
    } else {
      alert('MetaMask not detected!');
    }
  };

  const checkOwner = async (web3Instance, userAccount) => {
    try {
      const contract = new web3Instance.eth.Contract(contractABI, contractAddress);
      const ownerAddress = await contract.methods.owner().call();
      setIsOwner(userAccount.toLowerCase() === ownerAddress.toLowerCase());
    } catch (error) {
      console.error('Error checking owner:', error);
      setIsOwner(false);
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          if (web3) {
            checkOwner(web3, accounts[0]);
          }
        } else {
          setAccount(null);
          setIsOwner(false);
        }
      });
    }
  }, [web3]);

  return (
    <nav className="bg-[linear-gradient(to_right,#0f0c29,#302b63,#24243e)] 
                    text-white 
                    shadow-lg 
                    font-sans 
                    border-b 
                    border-blue-500/30 
                    shadow-[0_0_15px_rgba(83,109,254,0.2)]">
      <div className="w-full max-w-screen-xl mx-auto flex justify-between items-center px-6 py-4">
        {/* Logo */}
        <Link to="/" className="text-3xl font-extrabold text-[var(--color-primary)]">
          RewardChain
        </Link>

        {/* Links */}
        <div className="flex items-center space-x-8 text-white font-bold">
          <Link to="/courses" className="hover:text-[var(--color-primary)] transition">
            Courses
          </Link>
          <Link to="/dashboard" className="hover:text-[var(--color-primary)] transition">
            Dashboard
          </Link>
          
          {/* Only show Admin link if user is owner */}
          {isOwner && (
            <Link to="/admin-panel" className="hover:text-[var(--color-primary)] transition">
              Admin
            </Link>
          )}

          {/* Wallet Button */}
          {account ? (
            <div className="flex items-center space-x-2">
              {isOwner && (
                <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-sm">
                  Owner
                </span>
              )}
              <span className="bg-[rgba(255,255,255,0.1)] border border-white px-3 py-2 rounded-lg shadow-md">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="text-white px-6 py-2 rounded-xl border border-blue-500 
                         bg-[rgba(59,130,246,0.1)] 
                         backdrop-blur-md
                         hover:bg-[rgba(59,130,246,0.2)]
                         hover:shadow-[0_0_15px_#3b82f6]
                         transition duration-300 font-bold"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
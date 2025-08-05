import { useState } from 'react';
import Web3 from 'web3';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [account, setAccount] = useState(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const web3 = new Web3(window.ethereum);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
      } catch (error) {
        console.error('User rejected request', error);
      }
    } else {
      alert('MetaMask not detected!');
    }
  };

  return (
<nav className="bg-[linear-gradient(to_right,#0f0c29,#302b63,#24243e)] 
                text-white 
                shadow-lg 
                font-sans 
                border-b 
                border-blue-500/30 
                shadow-[0_0_15px_rgba(83,109,254,0.2)]">      <div className="w-full max-w-screen-xl mx-auto flex justify-between items-center px-6 py-4">
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
          <Link to="/admin-panel" className="hover:text-[var(--color-primary)] transition">
            Admin
          </Link>

          {/* Wallet Button */}
          {account ? (
            <span className="bg-[rgba(255,255,255,0.1)] border border-white px-3 py-2 rounded-lg shadow-md">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
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

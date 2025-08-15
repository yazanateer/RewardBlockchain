import { useState, useEffect, useRef } from 'react';
import Web3 from 'web3';
import { Link } from 'react-router-dom';

import {
  contractAddress,
  contractABI,
  tokenAddress,
  tokenABI,
} from '../contractConfig';

export default function Navbar() {
  const [account, setAccount] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [web3, setWeb3] = useState(null);

  // token meta + balance
  const [tokenSymbol, setTokenSymbol] = useState('EDU');
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [loadingBal, setLoadingBal] = useState(false);

  // refs for event subscriptions cleanup
  const rewardSubRef = useRef(null);
  const blockSubRef = useRef(null);

  const formatUnits = (valueStr, decimals) => {
    try {
      const v = BigInt(valueStr || '0');
      const d = BigInt(decimals || 0);
      if (d === 0n) return v.toString();
      const base = 10n ** d;
      const whole = v / base;
      const frac = v % base;
      let fracStr = frac.toString().padStart(Number(d), '0');
      fracStr = fracStr.replace(/0+$/, '').slice(0, 4);
      return fracStr ? `${whole}.${fracStr}` : whole.toString();
    } catch {
      return '0';
    }
  };

  const getTokenContract = (web3Instance) => {
    if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return null;
    try {
      return new web3Instance.eth.Contract(tokenABI, tokenAddress);
    } catch {
      return null;
    }
  };

  const getManagerContract = (web3Instance) =>
    new web3Instance.eth.Contract(contractABI, contractAddress);

  const refreshTokenMeta = async (web3Instance) => {
    try {
      const tk = getTokenContract(web3Instance);
      if (!tk) return;
      const [sym, dec] = await Promise.all([
        tk.methods.symbol().call().catch(() => 'EDU'),
        tk.methods.decimals().call().catch(() => '18'),
      ]);
      setTokenSymbol(sym);
      setTokenDecimals(Number(dec));
    } catch (e) {
      console.warn('token meta read failed', e);
    }
  };

  const refreshBalance = async (web3Instance, acct) => {
    if (!acct) return setTokenBalance('0');
    try {
      setLoadingBal(true);
      const tk = getTokenContract(web3Instance);
      if (!tk) return setTokenBalance('0');
      const raw = await tk.methods.balanceOf(acct).call();
      setTokenBalance(formatUnits(raw, tokenDecimals));
    } catch (e) {
      console.warn('balance read failed', e);
      setTokenBalance('0');
    } finally {
      setLoadingBal(false);
    }
  };

  const checkOwner = async (web3Instance, userAccount) => {
    try {
      const contract = getManagerContract(web3Instance);
      const ownerAddress = await contract.methods.owner().call();
      setIsOwner(userAccount?.toLowerCase() === ownerAddress.toLowerCase());
    } catch (error) {
      console.error('Error checking owner:', error);
      setIsOwner(false);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('MetaMask not detected!');
      return;
    }
    try {
      const web3Instance = new Web3(window.ethereum);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const acct = accounts[0];
      setWeb3(web3Instance);
      setAccount(acct);

      await checkOwner(web3Instance, acct);
      await refreshTokenMeta(web3Instance);
      await refreshBalance(web3Instance, acct);

      try {
        const mgr = getManagerContract(web3Instance);
        rewardSubRef.current = mgr.events.RewardPaid({ filter: { user: acct } })
          .on('data', () => refreshBalance(web3Instance, acct))
          .on('error', console.warn);
      } catch (e) {
        console.warn('RewardPaid subscription failed', e);
      }

      try {
        blockSubRef.current = web3Instance.eth.subscribe('newBlockHeaders', () =>
          refreshBalance(web3Instance, acct)
        );
      } catch {}
    } catch (error) {
      console.error('User rejected request', error);
    }
  };

  // handle account/network changes
  useEffect(() => {
    if (!window.ethereum) return;

    const onAccountsChanged = async (accounts) => {
      const acct = accounts[0];
      setAccount(acct || null);
      if (!acct) {
        setIsOwner(false);
        setTokenBalance('0');
        try { rewardSubRef.current?.unsubscribe(); } catch {}
        try { blockSubRef.current?.unsubscribe(); } catch {}
        rewardSubRef.current = null;
        blockSubRef.current = null;
        return;
      }
      if (web3) {
        await checkOwner(web3, acct);
        await refreshTokenMeta(web3);
        await refreshBalance(web3, acct);

        try { rewardSubRef.current?.unsubscribe(); } catch {}
        try {
          const mgr = getManagerContract(web3);
          rewardSubRef.current = mgr.events.RewardPaid({ filter: { user: acct } })
            .on('data', () => refreshBalance(web3, acct))
            .on('error', console.warn);
        } catch (e) {
          console.warn('RewardPaid re-subscribe failed', e);
        }
      }
    };

    const onChainChanged = () => {
      // simple approach: reload to ensure contracts point to the right network
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', onAccountsChanged);
    window.ethereum.on('chainChanged', onChainChanged);
    return () => {
      try { window.ethereum.removeListener('accountsChanged', onAccountsChanged); } catch {}
      try { window.ethereum.removeListener('chainChanged', onChainChanged); } catch {}
      try { rewardSubRef.current?.unsubscribe(); } catch {}
      try { blockSubRef.current?.unsubscribe(); } catch {}
    };
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
        <div className="flex items-center space-x-6 text-white font-bold">
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
          {/* EDU balance badge (when wallet connected) */}
          {account && (
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-1 rounded-lg border border-emerald-400/40 bg-emerald-400/10">
                {loadingBal ? 'EDU: …' : `EDU: ${tokenBalance}`}
              </span>
            </div>
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

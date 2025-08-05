import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [account, setAccount] = useState(null);

  const nfts = [
    { id: 1, course: "Blockchain Basics", minted: "2025-08-01", tokenId: 101 },
    { id: 2, course: "Smart Contracts", minted: "2025-08-03", tokenId: 102 },
  ];

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_requestAccounts' })
        .then(accounts => setAccount(accounts[0]));
    }
  }, []);

  return (
    <div className="min-h-screen text-white px-6 py-12">
      <h2 className="text-4xl font-extrabold mb-10 text-center">My Dashboard</h2>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
        <div className="border border-blue-500/30 rounded-2xl p-6 backdrop-blur-md bg-[rgba(255,255,255,0.05)] shadow-[0_0_20px_rgba(83,109,254,0.3)] text-center">
          <h3 className="text-lg text-gray-300">Total Courses Enrolled</h3>
          <p className="text-3xl font-bold mt-2">{nfts.length}</p>
        </div>
        <div className="border border-green-500/30 rounded-2xl p-6 backdrop-blur-md bg-[rgba(255,255,255,0.05)] shadow-[0_0_20px_rgba(34,197,94,0.3)] text-center">
          <h3 className="text-lg text-gray-300">Certificates Earned</h3>
          <p className="text-3xl font-bold mt-2">{nfts.length}</p>
        </div>
      </div>

      {/* NFT Gallery */}
      <h3 className="text-2xl font-semibold mb-6 text-center">Your Certificates</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {nfts.map((nft) => (
          <div 
            key={nft.id} 
            className="border border-blue-500/30 rounded-2xl p-6 backdrop-blur-md 
                       bg-[rgba(255,255,255,0.05)] 
                       shadow-[0_0_20px_rgba(83,109,254,0.3)] 
                       flex flex-col items-center"
          >
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl mb-4 shadow-lg"></div>
            <h4 className="text-xl font-bold">{nft.course}</h4>
            <p className="text-sm text-gray-400 mt-1">Token ID: {nft.tokenId}</p>
            <p className="text-sm text-gray-400">Minted: {nft.minted}</p>
          </div>
        ))}
      </div>

      {/* Connected Wallet */}
      {account && (
        <p className="text-center mt-12 text-sm text-gray-400">
          Connected Wallet: <span className="text-blue-400">{account}</span>
        </p>
      )}
    </div>
  );
}

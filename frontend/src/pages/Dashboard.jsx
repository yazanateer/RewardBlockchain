import { useEffect, useMemo, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  contractAddress,
  contractABI,
  certificateAddress,
  certificateABI,
} from '../contractConfig';

// small helpers
const decodeBase64 = (b64) => {
  try {
    if (typeof window !== 'undefined' && window.atob) return window.atob(b64);
    return Buffer.from(b64, 'base64').toString('utf-8');
  } catch {
    return '';
  }
};

const fmtDate = (unix) => {
  if (!unix) return '';
  const d = new Date(Number(unix) * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${hh}:${mm} UTC`;
};

export default function Dashboard() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [certs, setCerts] = useState([]); // [{courseId, tokenId, courseTitle, image, mintedAt}]

  const hasEth = useMemo(() => typeof window !== 'undefined' && !!window.ethereum, []);

  const connect = useCallback(async () => {
    if (!hasEth) return alert('MetaMask is required');
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    setAccount(accounts?.[0] ?? null);
  }, [hasEth]);

  // Re-load when account changes
  useEffect(() => {
    if (!hasEth) return;
    const handler = (accs) => setAccount(accs?.[0] ?? null);
    window.ethereum.on?.('accountsChanged', handler);
    return () => window.ethereum.removeListener?.('accountsChanged', handler);
  }, [hasEth]);

  // Initial connect (optional auto-connect)
  useEffect(() => {
    if (!hasEth) return;
    (async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accs = await provider.listAccounts();
        if (accs?.length) setAccount(accs[0].address);
      } catch {}
    })();
  }, [hasEth]);

  const load = useCallback(async () => {
    if (!hasEth || !account) return;
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const mgr = new ethers.Contract(contractAddress, contractABI, signer);

      // Registered courses count
      const regIds = await mgr.getMyRegisteredCourses();
      setRegisteredCount(Number(regIds.length ?? 0));

      // Completed course IDs
      const completedIds = await mgr.getMyCompletedCourses();
      const ids = Array.from(completedIds).map((b) => Number(b));

      if (!ids.length) {
        setCerts([]);
        return;
      }

      // For each completed course:
      // - get tokenId via certificateTokenId(account, courseId)
      // - get course to show title (optional; meta also has name)
      // - read tokenURI from NFT and parse JSON to get image + minted date (attributes)
      const nft = certificateAddress
        ? new ethers.Contract(certificateAddress, certificateABI, provider)
        : null;

      const items = await Promise.all(
        ids.map(async (courseId) => {
          const [courseTuple, tokenIdBI] = await Promise.all([
            mgr.getCourse(ethers.toBigInt(courseId)),
            mgr.certificateTokenId(account, ethers.toBigInt(courseId)),
          ]);

          const tokenId = tokenIdBI ? Number(tokenIdBI) : 0;
          if (!tokenId || !nft) {
            return {
              courseId,
              tokenId: 0,
              courseTitle: courseTuple?.[1] ?? `Course #${courseId}`,
              image: null,
              mintedAt: null,
            };
          }

          let image = null;
          let mintedAt = null;

          const uri = await nft.tokenURI(tokenId);
          if (uri?.startsWith('data:application/json;base64,')) {
            const base64 = uri.split(',')[1];
            const jsonStr = decodeBase64(base64);
            const meta = JSON.parse(jsonStr);
            image = meta?.image ?? null;

            // attributes include: Completed At (display_type=date, value is unix)
            const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
            const found = attrs.find((a) => a?.trait_type === 'Completed At');
            mintedAt = found?.value ?? null;
          }

          return {
            courseId,
            tokenId,
            courseTitle: courseTuple?.[1] ?? `Course #${courseId}`,
            image,
            mintedAt,
          };
        })
      );

      // keep only items with a token (i.e., cert actually minted)
      setCerts(items.filter((x) => x.tokenId > 0));
    } catch (e) {
      console.error(e);
      alert(e.shortMessage || e.message);
    } finally {
      setLoading(false);
    }
  }, [hasEth, account]);

  useEffect(() => {
    load();
  }, [load]);

  // Optional live refresh: listen for CertificateMinted and refresh if it's for this account
  useEffect(() => {
    if (!hasEth || !account) return;
    let mgr;
    (async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        mgr = new ethers.Contract(contractAddress, contractABI, provider);
        mgr.on('CertificateMinted', (user, courseId, tokenId) => {
          if (user?.toLowerCase() === account.toLowerCase()) {
            load();
          }
        });
      } catch {}
    })();
    return () => {
      try { mgr?.removeAllListeners?.('CertificateMinted'); } catch {}
    };
  }, [hasEth, account, load]);

  if (!hasEth) {
    return (
      <div className="min-h-screen text-white px-6 py-12">
        <h2 className="text-4xl font-extrabold mb-6 text-center">My Dashboard</h2>
        <p className="text-center text-gray-300">Please install MetaMask to view your certificates.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white px-6 py-12">
      <h2 className="text-4xl font-extrabold mb-10 text-center">My Dashboard</h2>

      {/* Connect / Account */}
      {!account ? (
        <div className="flex justify-center mb-8">
          <button
            onClick={connect}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <p className="text-center mb-8 text-sm text-gray-400">
          Connected Wallet: <span className="text-blue-400">{account}</span>
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
        <div className="border border-blue-500/30 rounded-2xl p-6 backdrop-blur-md bg-[rgba(255,255,255,0.05)] shadow-[0_0_20px_rgba(83,109,254,0.3)] text-center">
          <h3 className="text-lg text-gray-300">Total Courses Enrolled</h3>
          <p className="text-3xl font-bold mt-2">{registeredCount}</p>
        </div>
        <div className="border border-green-500/30 rounded-2xl p-6 backdrop-blur-md bg-[rgba(255,255,255,0.05)] shadow-[0_0_20px_rgba(34,197,94,0.3)] text-center">
          <h3 className="text-lg text-gray-300">Certificates Earned</h3>
          <p className="text-3xl font-bold mt-2">{certs.length}</p>
        </div>
      </div>

      {/* Loader */}
      {loading && (
        <p className="text-center text-gray-400 mb-8">Loading your certificates…</p>
      )}

      {/* NFT Gallery */}
      <h3 className="text-2xl font-semibold mb-6 text-center">Your Certificates</h3>
      {(!certs.length && !loading) && (
        <p className="text-center text-gray-400 mb-10">No certificates yet. Finish your course milestones to mint one!</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {certs.map((nft) => (
          <div
            key={`${nft.courseId}-${nft.tokenId}`}
            className="border border-blue-500/30 rounded-2xl p-6 backdrop-blur-md bg-[rgba(255,255,255,0.05)] shadow-[0_0_20px_rgba(83,109,254,0.3)] flex flex-col items-center"
          >
            {/* Render the on-chain SVG if available */}
            {nft.image?.startsWith('data:image/svg+xml;base64,') ? (
              <img
                src={nft.image}
                alt="Certificate"
                className="w-full h-auto rounded-xl mb-4 shadow-lg border border-white/10"
              />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl mb-4 shadow-lg" />
            )}

            <h4 className="text-xl font-bold text-center">{nft.courseTitle}</h4>
            <p className="text-sm text-gray-400 mt-1">Token ID: {nft.tokenId}</p>
            <p className="text-sm text-gray-400">
              Minted: {fmtDate(nft.mintedAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

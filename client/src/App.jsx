import { useEffect, useState, useRef } from "react";
import { Toast } from "primereact/toast";
import { Dialog } from "primereact/dialog";
import { ProgressSpinner } from "primereact/progressspinner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";
import { ethers } from "ethers";

// Import PrimeReact components with new theme
import "primereact/resources/themes/lara-dark-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

function App() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [votingInProgress, setVotingInProgress] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("success");
  const toast = useRef(null);

  const apiUrl = "http://localhost:3001";

  useEffect(() => {
    fetchProposals();
    checkIfWalletIsConnected();
  }, []);

  useEffect(() => {
    if (account) {
      checkVoterStatus();
    }
  }, [account]);

  const fetchProposals = async () => {
    try {
      const response = await axios.get(`${apiUrl}/proposals`);
      setProposals(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      setLoading(false);
      showToast("error", "Error", "Failed to fetch proposals");
    }
  };

  const checkIfWalletIsConnected = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      }
    } catch (error) {
      console.error("Error checking wallet connection:", error);
    }
  };

  const checkVoterStatus = async () => {
    try {
      const response = await axios.get(`${apiUrl}/hasVoted/${account}`);
      setHasVoted(response.data.hasVoted);
    } catch (error) {
      console.error("Error checking voter status:", error);
    }
  };

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(accounts[0]);
        showToast("success", "Connected", "Wallet connected successfully");
      } else {
        showToast("error", "Wallet Not Found", "Please install MetaMask");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      showToast("error", "Connection Failed", "Failed to connect wallet");
    }
  };

  const vote = async (proposalId) => {
    if (!account) {
      showToast("warn", "Not Connected", "Please connect your wallet first");
      return;
    }

    if (hasVoted) {
      showToast("warn", "Already Voted", "You have already cast your vote");
      return;
    }

    try {
      setVotingInProgress(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const response = await axios.post(`${apiUrl}/vote`, {
        proposalId: proposalId,
        fromAddress: account,
      });

      const tx = await signer.sendTransaction({
        to: response.data.to,
        data: response.data.data,
        gasLimit: response.data.gas,
      });

      setModalType("success");
      setModalMessage(
        "Your vote is being processed. Please wait for confirmation."
      );
      setShowModal(true);

      await tx.wait();
      setHasVoted(true);
      await fetchProposals();

      setModalType("success");
      setModalMessage("Your vote has been successfully recorded!");
      setShowModal(true);
    } catch (error) {
      console.error("Error voting:", error);

      if (error.code === 4001) {
        setModalType("error");
        setModalMessage("Transaction was rejected by user.");
      } else if (error.message.includes("already voted")) {
        setModalType("error");
        setModalMessage("You have already voted on this proposal.");
        setHasVoted(true);
      } else {
        setModalType("error");
        setModalMessage("An error occurred while processing your vote.");
      }
      setShowModal(true);
    } finally {
      setVotingInProgress(false);
    }
  };

  const downloadCSV = () => {
    if (!proposals.length) return;

    const csvContent = [
      ["Proposal Name", "Vote Count"],
      ...proposals.map((p) => [p.name, p.voteCount]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "voting_results.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("success", "Download Complete", "CSV file has been downloaded");
  };

  const showToast = (severity, summary, detail) => {
    toast.current.show({ severity, summary, detail, life: 3000 });
  };

  const getTotalVotes = () => {
    return proposals.reduce(
      (sum, proposal) => sum + parseInt(proposal.voteCount),
      0
    );
  };

  const getChartData = () => {
    return proposals.map((p) => ({
      name: p.name,
      votes: parseInt(p.voteCount),
    }));
  };

  const getRandomColor = (index) => {
    const colors = [
      "#6366F1",
      "#8B5CF6",
      "#EC4899",
      "#10B981",
      "#F59E0B",
      "#3B82F6",
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <Toast ref={toast} />

      <header className="bg-gray-800 border-b border-indigo-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                Blockchain Voting System
              </h1>
            </div>
            <div>
              {account ? (
                <div className="flex items-center space-x-3 bg-gray-700 p-2 rounded-lg border border-indigo-500">
                  <span className="font-mono text-sm">
                    {`${account.substring(0, 6)}...${account.substring(
                      account.length - 4
                    )}`}
                  </span>
                  <div
                    className={`py-1 px-3 rounded-full text-xs font-medium ${
                      hasVoted ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  >
                    {hasVoted ? "Voted" : "Not Voted"}
                  </div>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors duration-200"
                >
                  <i className="pi pi-wallet"></i>
                  <span>Connect Wallet</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <ProgressSpinner style={{ width: "50px", height: "50px" }} />
            <p className="mt-4 text-indigo-300">Loading proposals...</p>
          </div>
        ) : (
          <>
            <section className="mb-12">
              <div className="bg-gray-800 rounded-xl overflow-hidden shadow-xl border border-gray-700">
                <div className="p-6 border-b border-gray-700">
                  <h2 className="text-xl font-semibold text-indigo-300">
                    Voting Results
                  </h2>
                </div>
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row justify-end gap-4 mb-6">
                    <button
                      onClick={downloadCSV}
                      disabled={!proposals.length}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className="pi pi-download"></i>
                      <span>Download CSV</span>
                    </button>
                    <button
                      onClick={fetchProposals}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                    >
                      <i className="pi pi-refresh"></i>
                      <span>Refresh</span>
                    </button>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4 mb-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={getChartData()}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#D1D5DB" />
                        <YAxis stroke="#D1D5DB" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1F2937",
                            borderColor: "#4B5563",
                            borderRadius: "0.5rem",
                          }}
                          itemStyle={{ color: "#F3F4F6" }}
                          labelStyle={{ color: "#D1D5DB" }}
                        />
                        <Legend wrapperStyle={{ color: "#D1D5DB" }} />
                        <Bar
                          dataKey="votes"
                          name="Votes"
                          fill="#6366F1"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-right font-semibold text-lg text-indigo-300">
                    Total Votes: {getTotalVotes()}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-center mb-8 text-indigo-300">
                Cast Your Vote
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {proposals.map((proposal, index) => (
                  <div
                    key={index}
                    className="bg-gray-800 rounded-xl overflow-hidden shadow-xl border border-gray-700 hover:border-indigo-500 transition-colors duration-200 hover:shadow-indigo-900/20 hover:shadow-2xl"
                  >
                    <div className="p-6 border-b border-gray-700">
                      <h3 className="text-lg font-semibold text-indigo-300 truncate">
                        {proposal.name}
                      </h3>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                        <span className="text-gray-300">Votes:</span>
                        <span className="text-xl font-bold text-indigo-300">
                          {proposal.voteCount}
                        </span>
                      </div>
                      <button
                        onClick={() => vote(index)}
                        disabled={!account || hasVoted || votingInProgress}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="pi pi-check"></i>
                        <span>Vote</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="bg-gray-800 border-t border-gray-700 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-400">
            © 2025 Blockchain Voting System. All rights reserved.
          </p>
        </div>
      </footer>

      <Dialog
        visible={showModal}
        onHide={() => setShowModal(false)}
        header={modalType === "success" ? "Success" : "Error"}
        className={`${
          modalType === "success" ? "border-green-500" : "border-red-500"
        }`}
        breakpoints={{ "960px": "80vw", "640px": "90vw" }}
        style={{ width: "450px" }}
      >
        <div className="flex flex-col items-center p-4">
          <i
            className={`pi ${
              modalType === "success"
                ? "pi-check-circle text-green-500"
                : "pi-times-circle text-red-500"
            } text-5xl mb-4`}
          ></i>
          <p className="text-center">{modalMessage}</p>
        </div>
      </Dialog>
    </div>
  );
}

export default App;

require("dotenv").config();
const express = require("express");
const { Web3 } = require("web3");
const cors = require("cors");

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const app = express();
const web3 = new Web3(process.env.SEPOLIA_RPC_URL);
const contractABI = require("./abis/Voting.json");
const contractAddress = process.env.CONTRACT_ADDRESS;

app.use(cors());
app.use(express.json());

app.get("/proposals", async (req, res) => {
  try {
    const contract = new web3.eth.Contract(contractABI, contractAddress);
    const proposals = await contract.methods.getProposals().call();

    const formattedProposals = proposals.map((prop) => ({
      name: prop.name,
      voteCount: prop.voteCount.toString(),
    }));

    res.json(formattedProposals);
  } catch (error) {
    console.error("Error fetching proposals:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/vote", async (req, res) => {
  const { proposalId, fromAddress } = req.body;
  try {
    const contract = new web3.eth.Contract(contractABI, contractAddress);
    const tx = contract.methods.vote(proposalId);

    let gas;
    try {
      gas = await tx.estimateGas({ from: fromAddress });
    } catch (gasError) {
      console.error("Gas estimation failed:", gasError);
      gas = "300000";
    }

    const data = tx.encodeABI();

    res.json({
      to: contractAddress,
      data: data,
      gas: gas.toString(),
    });
  } catch (error) {
    console.error("Error preparing vote transaction:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/hasVoted/:address", async (req, res) => {
  const address = req.params.address;
  try {
    const contract = new web3.eth.Contract(contractABI, contractAddress);
    const hasVoted = await contract.methods.voters(address).call();
    res.json({ hasVoted });
  } catch (error) {
    console.error("Error checking voter status:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/votingStats", async (req, res) => {
  try {
    const contract = new web3.eth.Contract(contractABI, contractAddress);
    const proposals = await contract.methods.getProposals().call();

    const totalVotes = proposals.reduce(
      (sum, prop) => sum + parseInt(prop.voteCount),
      0
    );
    const highestVote = Math.max(
      ...proposals.map((p) => parseInt(p.voteCount))
    );
    const leadingProposal = proposals.find(
      (p) => parseInt(p.voteCount) === highestVote
    );

    res.json({
      totalVotes,
      highestVote,
      leadingProposal: leadingProposal ? leadingProposal.name : null,
    });
  } catch (error) {
    console.error("Error fetching voting stats:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
